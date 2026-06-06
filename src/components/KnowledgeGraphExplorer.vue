<script setup>
import { ref, reactive, shallowRef, onMounted, onBeforeUnmount, computed } from 'vue'
import { Graph } from '@antv/g6'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  searchDevices, getDeviceComponents, getComponentFaults, getFaultSolutions,
  searchDiagnosisPaths, listUnverified, approveSolution, rejectNode,
} from '../api/graph'

const props = defineProps({
  // false = 管理端（可审核/拒绝）；true = 普通用户端（只读）
  readonly: { type: Boolean, default: true },
})

/* ---------- 节点类型视觉编码（浅色，与项目「矿石白+克制蓝」统一） ---------- */
const TYPE = {
  device:    { label: '设备', fill: '#e8f1ff', stroke: '#3b82f6', size: 48 },
  component: { label: '部件', fill: '#e9faf1', stroke: '#22c55e', size: 34 },
  fault:     { label: '故障', fill: '#fff1e6', stroke: '#f97316', size: 31 },
  solution:  { label: '方案', fill: '#f1ecff', stroke: '#8b5cf6', size: 27 },
}
const SEVERITY = { 轻微: '#eab308', 一般: '#f59e0b', 严重: '#f97316', 致命: '#ef4444' }
const REL = { OWNS: '拥有', CAUSES: '引发', HAS_SOLUTION: '方案' }
const LABEL_FONT = "'JetBrains Mono','IBM Plex Mono',ui-monospace,monospace"

/* ---------- 内部状态 ---------- */
const containerRef = ref(null)
const graph = shallowRef(null)
const nodeMap = new Map()   // key -> { id, data:{...} }
const edgeSet = new Set()   // edgeKey
const expanded = new Set()  // 已展开的节点 key
const ui = reactive({
  deviceKw: '', diagKw: '', loading: false,
  selected: null, showDetail: false, busyNode: '',
  showUnverified: false,
})
const stats = reactive({ nodes: 0, edges: 0 })

const key = (type, id) => `${type}:${id}`

/* ---------- 图数据写入 ---------- */
function nodeStyle() {
  return {
    size: (d) => d.data.size,
    fill: (d) => d.data.fill,
    stroke: (d) => d.data.unverified ? '#f59e0b' : d.data.stroke,
    lineWidth: (d) => d.data.unverified ? 2.4 : 1.6,
    lineDash: (d) => d.data.unverified ? [5, 4] : 0,
    shadowColor: 'rgba(51,65,85,0.16)',
    shadowBlur: 8,
    shadowOffsetY: 2,
    labelText: (d) => d.data.label,
    labelFill: '#334155',
    labelFontSize: 11,
    labelFontFamily: LABEL_FONT,
    labelPlacement: 'bottom',
    labelOffsetY: 4,
    labelBackground: true,
    labelBackgroundFill: 'rgba(255,255,255,0.92)',
    labelBackgroundRadius: 4,
    labelBackgroundLineWidth: 1,
    labelBackgroundStroke: '#e6eaf1',
    labelPadding: [2, 6],
  }
}

function buildGraph() {
  graph.value = new Graph({
    container: containerRef.value,
    autoResize: true,
    background: 'transparent',
    data: { nodes: [], edges: [] },
    node: {
      style: nodeStyle(),
      state: {
        active:   { lineWidth: 2.6, halo: true, haloStroke: '#3b82f6', haloOpacity: 0.14 },
        selected: { lineWidth: 3, halo: true, haloStroke: '#3b82f6', haloOpacity: 0.2 },
      },
    },
    edge: {
      style: {
        stroke: 'rgba(51,65,85,0.24)',
        lineWidth: 1.1,
        endArrow: true,
        endArrowType: 'vee',
        endArrowSize: 7,
        labelText: (d) => d.data.relLabel || '',
        labelFill: '#64748b',
        labelFontSize: 9,
        labelFontFamily: LABEL_FONT,
        labelBackground: true,
        labelBackgroundFill: 'rgba(255,255,255,0.9)',
        labelBackgroundRadius: 2,
      },
      state: { active: { stroke: '#3b82f6', lineWidth: 2 } },
    },
    layout: {
      type: 'd3-force',
      link: { distance: 120, strength: 0.5 },
      collide: { radius: 42 },
      manyBody: { strength: -180 },
    },
    behaviors: [
      'zoom-canvas', 'drag-canvas', 'drag-element',
      { type: 'hover-activate', degree: 1 },
      { type: 'click-select', enable: true },
    ],
  })

  graph.value.on('node:click', (e) => {
    const id = e.target?.id
    if (!id) return
    const n = nodeMap.get(id)
    if (n) { ui.selected = n.data; ui.showDetail = true; expandNode(n) }
  })
  graph.value.render()
}

let renderTimer = null
function syncGraph(refit = false) {
  stats.nodes = nodeMap.size
  stats.edges = edgeSet.size
  const nodes = [...nodeMap.values()]
  const edges = [...edgeSet].map((k) => {
    const [source, target, rel] = k.split('|')
    return { id: k, source, target, data: { relLabel: REL[rel] || '' } }
  })
  graph.value.setData({ nodes, edges })
  clearTimeout(renderTimer)
  renderTimer = setTimeout(async () => {
    await graph.value.render()
    if (refit) graph.value.fitView()
  }, 30)
}

function addNode(type, id, label, raw = {}, extra = {}) {
  if (!id) return null
  const k = key(type, id)
  if (nodeMap.has(k)) {
    if (extra.unverified) nodeMap.get(k).data.unverified = true
    return k
  }
  const conf = TYPE[type]
  const stroke = type === 'fault' && SEVERITY[raw.severity] ? SEVERITY[raw.severity] : conf.stroke
  nodeMap.set(k, {
    id: k,
    data: {
      type, rawId: id, label: (label || conf.label).slice(0, 16),
      fullLabel: label || conf.label,
      fill: conf.fill, stroke, size: conf.size,
      unverified: !!extra.unverified, raw,
    },
  })
  return k
}

function addEdge(sourceKey, targetKey, rel) {
  if (!sourceKey || !targetKey) return
  edgeSet.add(`${sourceKey}|${targetKey}|${rel}`)
}

/* ---------- 列表归一化（兼容 List / PageResult） ---------- */
function rows(res) {
  const d = res?.data
  if (Array.isArray(d)) return d
  if (d && Array.isArray(d.records)) return d.records
  return []
}

/* ---------- 展开逻辑 ---------- */
async function expandNode(n) {
  const k = n.id
  if (expanded.has(k) || ui.busyNode) return
  const { type, rawId } = n.data
  if (type === 'solution') return
  ui.busyNode = k
  try {
    if (type === 'device') {
      const list = rows(await getDeviceComponents(rawId))
      list.forEach((c) => { const ck = addNode('component', c.id, c.name, c); addEdge(k, ck, 'OWNS') })
      flash(list.length, '部件')
    } else if (type === 'component') {
      const list = rows(await getComponentFaults(rawId))
      list.forEach((f) => { const fk = addNode('fault', f.id, f.name, f); addEdge(k, fk, 'CAUSES') })
      flash(list.length, '故障')
    } else if (type === 'fault') {
      const list = rows(await getFaultSolutions(rawId))
      list.forEach((s) => {
        const sk = addNode('solution', s.id, s.title, s, { unverified: s.verified === false })
        addEdge(k, sk, 'HAS_SOLUTION')
      })
      flash(list.length, '方案')
    }
    expanded.add(k)
    syncGraph()
  } catch (err) {
    ElMessage.error('展开失败：' + (err.message || '请求异常'))
  } finally {
    ui.busyNode = ''
  }
}
function flash(n, label) {
  if (n === 0) ElMessage.info(`未发现关联${label}`)
}

/* ---------- 顶部操作 ---------- */
async function onSearchDevices() {
  ui.loading = true
  try {
    const list = rows(await searchDevices(ui.deviceKw.trim(), 30))
    if (!list.length) { ElMessage.info('未搜索到设备'); return }
    list.forEach((d) => addNode('device', d.id, d.name, d))
    syncGraph(true)
  } catch (err) {
    ElMessage.error('设备搜索失败：' + (err.message || ''))
  } finally { ui.loading = false }
}

async function onDiagnose() {
  const kw = ui.diagKw.trim()
  if (!kw) { ElMessage.info('请输入故障/部件描述'); return }
  ui.loading = true
  try {
    const res = await searchDiagnosisPaths({ faultDescription: kw, componentDescription: kw })
    const recs = rows(res)
    if (!recs.length) { ElMessage.info('未召回诊断路径'); return }
    recs.forEach((r) => {
      let prev = null
      if (r.deviceId) prev = addNode('device', r.deviceId, r.deviceName, { name: r.deviceName })
      if (r.componentId) {
        const ck = addNode('component', r.componentId, r.componentName, { name: r.componentName, imageUrls: r.componentImageUrls })
        if (prev) addEdge(prev, ck, 'OWNS'); prev = ck
      }
      let fk = null
      if (r.faultId) {
        fk = addNode('fault', r.faultId, r.faultName, { name: r.faultName, severity: r.faultSeverity, imageUrls: r.faultImageUrls })
        if (prev) addEdge(prev, fk, 'CAUSES')
      }
      ;(r.solutions || []).forEach((s) => {
        const sk = addNode('solution', s.id, s.title, { title: s.title, estimatedTime: s.estimatedTime, verified: s.verified }, { unverified: s.verified === false })
        if (fk) addEdge(fk, sk, 'HAS_SOLUTION')
      })
    })
    syncGraph(true)
    ElMessage.success(`召回 ${recs.length} 条诊断路径`)
  } catch (err) {
    ElMessage.error('诊断搜索失败：' + (err.message || ''))
  } finally { ui.loading = false }
}

async function onLoadUnverified() {
  ui.loading = true
  try {
    const list = rows(await listUnverified(80))
    if (!list.length) { ElMessage.info('暂无未验证方案'); return }
    list.forEach((it) => {
      const sk = addNode('solution', it.id, it.title, { title: it.title, description: it.description, verified: false, sourceManualIds: it.sourceManualIds }, { unverified: true })
      if (it.faultName) {
        const fk = addNode('fault', 'uv-' + it.faultName, it.faultName, { name: it.faultName }, {})
        addEdge(fk, sk, 'HAS_SOLUTION')
      }
    })
    ui.showUnverified = true
    syncGraph(true)
    ElMessage.success(`加载 ${list.length} 个未验证方案`)
  } catch (err) {
    ElMessage.error('加载失败：' + (err.message || ''))
  } finally { ui.loading = false }
}

function fitView() { graph.value?.fitView() }
function relayout() { graph.value?.layout() }
function clearAll() {
  nodeMap.clear(); edgeSet.clear(); expanded.clear()
  ui.selected = null; ui.showDetail = false; ui.showUnverified = false
  syncGraph()
}

/* ---------- 审核（admin only） ---------- */
async function doApprove() {
  const d = ui.selected; if (!d) return
  ui.busyNode = d.id || 'approve'
  try {
    await approveSolution(d.rawId)
    d.unverified = false
    const n = nodeMap.get(key('solution', d.rawId)); if (n) n.data.unverified = false
    syncGraph()
    ElMessage.success('已通过，升级为已验证方案')
  } catch (err) { ElMessage.error('通过失败：' + (err.message || '')) }
  finally { ui.busyNode = '' }
}
async function doReject() {
  const d = ui.selected; if (!d) return
  try {
    await ElMessageBox.confirm(`确认拒绝并删除方案「${d.fullLabel}」？此操作不可撤销。`, '审核拒绝', { type: 'warning' })
  } catch { return }
  try {
    await rejectNode('Solution', d.rawId)
    const k = key('solution', d.rawId)
    nodeMap.delete(k); expanded.delete(k)
    for (const e of [...edgeSet]) if (e.includes(k)) edgeSet.delete(e)
    ui.showDetail = false; ui.selected = null
    syncGraph()
    ElMessage.success('已拒绝并移除')
  } catch (err) { ElMessage.error('拒绝失败：' + (err.message || '')) }
}

const detailRows = computed(() => {
  const d = ui.selected; if (!d) return []
  const r = d.raw || {}
  const map = {
    device: [['编码', r.code], ['型号', r.model], ['位置', r.location], ['制造商', r.manufacturer]],
    component: [['编号', r.partNumber], ['规格', r.specification], ['供应商', r.supplier], ['寿命', r.lifecycle]],
    fault: [['等级', r.severity], ['类别', r.category], ['编码', r.code], ['描述', r.description]],
    solution: [['预计耗时', r.estimatedTime ? r.estimatedTime + ' 分钟' : null], ['难度', r.difficulty], ['工具', r.toolsRequired], ['描述', r.description || r.summary]],
  }
  return (map[d.type] || []).filter(([, v]) => v != null && v !== '')
})

onMounted(buildGraph)
onBeforeUnmount(() => { clearTimeout(renderTimer); graph.value?.destroy() })
</script>

<template>
  <div class="kg-root" :class="{ 'is-readonly': readonly }">
    <!-- 顶部标题栏 -->
    <header class="kg-head">
      <div class="kg-title">
        <span class="led" /><span class="t-main">知识图谱</span><span class="t-sub">KNOWLEDGE&nbsp;GRAPH</span>
        <span class="t-mode" :class="readonly ? 'm-ro' : 'm-rw'">{{ readonly ? '只读浏览' : '管理 · 可审核' }}</span>
      </div>
      <div class="kg-readout">
        <span>节点 <b>{{ stats.nodes }}</b></span><i />
        <span>关系 <b>{{ stats.edges }}</b></span>
      </div>
    </header>

    <div class="kg-body">
      <!-- 左侧控制台 -->
      <aside class="kg-console">
        <div class="panel">
          <div class="panel-h">设备入口</div>
          <el-input v-model="ui.deviceKw" placeholder="设备名 / 编码 / 型号（空=全部）" size="small"
                    @keyup.enter="onSearchDevices" clearable />
          <button class="hud-btn" :disabled="ui.loading" @click="onSearchDevices">检索设备 ▸</button>
        </div>

        <div class="panel">
          <div class="panel-h">诊断路径</div>
          <el-input v-model="ui.diagKw" type="textarea" :rows="2" placeholder="描述故障现象 / 部件，召回链路子图"
                    @keyup.enter.exact.prevent="onDiagnose" />
          <button class="hud-btn b-amber" :disabled="ui.loading" @click="onDiagnose">语义召回 ▸</button>
        </div>

        <div class="panel" v-if="!readonly">
          <div class="panel-h">审核队列</div>
          <button class="hud-btn b-warn" :disabled="ui.loading" @click="onLoadUnverified">加载未验证方案 ⚠</button>
        </div>

        <div class="panel ops">
          <button class="mini" @click="fitView">适配</button>
          <button class="mini" @click="relayout">重排</button>
          <button class="mini danger" @click="clearAll">清空</button>
        </div>

        <div class="legend">
          <div class="lg-h">图例</div>
          <div v-for="(v,k) in TYPE" :key="k" class="lg-row">
            <span class="dot" :style="{ background: v.fill, borderColor: v.stroke }" />{{ v.label }}
          </div>
          <div class="lg-row"><span class="dot dot-uv" />未验证（待审核）</div>
        </div>
      </aside>

      <!-- 画布 -->
      <main class="kg-canvas-wrap">
        <div class="grid-overlay" />
        <div ref="containerRef" class="kg-canvas" />
        <div v-if="!stats.nodes" class="kg-empty">
          <div class="empty-ring" />
          <p>从左侧 <b>检索设备</b> 或 <b>语义召回</b> 开始探索<br/><span>点击节点可逐层展开关联</span></p>
        </div>
        <div v-if="ui.loading" class="kg-scan" />
      </main>

      <!-- 右侧详情抽屉 -->
      <transition name="slide">
        <aside v-if="ui.showDetail && ui.selected" class="kg-detail">
          <span class="corner tl" /><span class="corner br" />
          <div class="d-head">
            <span class="d-type" :style="{ color: ui.selected.stroke }">{{ TYPE[ui.selected.type]?.label }}</span>
            <button class="d-close" @click="ui.showDetail=false">✕</button>
          </div>
          <h3 class="d-name">{{ ui.selected.fullLabel }}</h3>
          <span v-if="ui.selected.unverified" class="badge-uv">⚠ 未验证 · 手册自动抽取</span>

          <dl class="d-attrs">
            <template v-for="(row,i) in detailRows" :key="i">
              <dt>{{ row[0] }}</dt><dd>{{ row[1] }}</dd>
            </template>
            <p v-if="!detailRows.length" class="d-empty">无更多属性</p>
          </dl>

          <div v-if="(ui.selected.raw?.imageUrls||[]).length" class="d-imgs">
            <img v-for="(u,i) in ui.selected.raw.imageUrls" :key="i" :src="u" alt="" />
          </div>

          <div v-if="!readonly && ui.selected.type==='solution' && ui.selected.unverified" class="d-actions">
            <button class="act ok" :disabled="!!ui.busyNode" @click="doApprove">✓ 审核通过</button>
            <button class="act no" @click="doReject">✕ 拒绝删除</button>
          </div>
          <p v-if="ui.selected.type!=='solution'" class="d-hint">点击节点可展开下一层关联 ▸</p>
        </aside>
      </transition>
    </div>
  </div>
</template>

<style scoped>
.kg-root{
  --bg:#f6f8fb; --card:#FFFFFF; --line:#e6eaf1; --line-soft:#E3ECFA;
  --primary:#3b82f6; --slate:#334155; --mut:#64748B; --amber:#f59e0b;
  --shadow:0 2px 12px rgba(51,65,85,.06),0 1px 3px rgba(51,65,85,.03);
  --shadow-lg:0 8px 30px rgba(51,65,85,.1);
  position:absolute; inset:0; display:flex; flex-direction:column;
  background:
    radial-gradient(900px 500px at 78% -8%, rgba(59,130,246,.06), transparent 60%),
    radial-gradient(700px 460px at 6% 112%, rgba(139,92,246,.05), transparent 60%),
    var(--bg);
  color:var(--slate);
  font-family:'Public Sans','Inter',-apple-system,BlinkMacSystemFont,'PingFang SC','Microsoft YaHei',sans-serif;
  overflow:hidden;
}
.mono{font-family:'JetBrains Mono','IBM Plex Mono',ui-monospace,monospace}

/* 标题栏 */
.kg-head{display:flex;align-items:center;justify-content:space-between;padding:13px 22px;
  border-bottom:1px solid var(--line); background:rgba(255,255,255,.85); backdrop-filter:blur(6px)}
.kg-title{display:flex;align-items:center;gap:10px}
.led{width:8px;height:8px;border-radius:50%;background:var(--primary);box-shadow:0 0 0 3px rgba(59,130,246,.16);animation:pulse 2.4s infinite}
@keyframes pulse{50%{opacity:.45}}
.t-main{font-size:18px;font-weight:700;letter-spacing:.5px;color:var(--slate)}
.t-sub{font-family:'JetBrains Mono','IBM Plex Mono',monospace;font-size:10px;color:#94a3b8;letter-spacing:2px}
.t-mode{margin-left:8px;font-size:11px;font-weight:600;padding:2px 10px;border-radius:20px;border:1px solid}
.m-ro{color:var(--primary);border-color:rgba(59,130,246,.35);background:rgba(59,130,246,.08)}
.m-rw{color:#d97706;border-color:rgba(245,158,11,.4);background:rgba(245,158,11,.1)}
.kg-readout{display:flex;align-items:center;gap:14px;font-family:'JetBrains Mono','IBM Plex Mono',monospace;font-size:12px;color:var(--mut)}
.kg-readout b{color:var(--primary);font-size:14px;font-weight:700}
.kg-readout i{width:1px;height:14px;background:var(--line)}

.kg-body{flex:1;display:flex;min-height:0;position:relative}

/* 左控制台 */
.kg-console{width:248px;flex-shrink:0;padding:16px;display:flex;flex-direction:column;gap:13px;
  border-right:1px solid var(--line); background:rgba(255,255,255,.5); overflow-y:auto}
.panel{background:var(--card);border:1px solid var(--line);border-radius:10px;padding:13px;display:flex;flex-direction:column;gap:9px;box-shadow:var(--shadow)}
.panel-h{font-size:12px;font-weight:700;color:var(--slate);letter-spacing:.5px}
.panel-h::before{content:'';display:inline-block;width:3px;height:12px;background:var(--primary);border-radius:2px;margin-right:7px;vertical-align:-1px}
.ops{flex-direction:row;gap:8px}
.hud-btn{background:var(--primary);color:#fff;border:1px solid var(--primary);border-radius:8px;padding:9px;font-weight:600;font-size:13px;letter-spacing:.5px;cursor:pointer;transition:.18s;box-shadow:0 2px 8px rgba(59,130,246,.25)}
.hud-btn:hover{background:#2563eb;box-shadow:0 4px 14px rgba(59,130,246,.32)}
.hud-btn:disabled{opacity:.5;cursor:not-allowed;box-shadow:none}
.b-amber{background:#fff;color:#d97706;border-color:#fcd9a6;box-shadow:none} .b-amber:hover{background:#fff7ed}
.b-warn{background:#fff;color:#d97706;border-color:#fcd9a6;box-shadow:none} .b-warn:hover{background:#fff7ed}
.mini{flex:1;background:#fff;color:var(--slate);border:1px solid var(--line);border-radius:8px;padding:8px;font-weight:600;font-size:12px;cursor:pointer;transition:.15s}
.mini:hover{border-color:var(--primary);color:var(--primary);background:#f5f9ff}
.mini.danger:hover{border-color:#ef4444;color:#ef4444;background:#fef2f2}
.legend{margin-top:auto;background:var(--card);border:1px solid var(--line);border-radius:10px;padding:13px;box-shadow:var(--shadow)}
.lg-h{font-size:12px;font-weight:700;color:var(--mut);margin-bottom:9px}
.lg-row{display:flex;align-items:center;gap:9px;font-size:13px;padding:3px 0;color:var(--slate)}
.dot{width:13px;height:13px;border-radius:50%;border:2px solid}
.dot-uv{background:#fff7ed;border:2px dashed var(--amber)}

/* 画布 */
.kg-canvas-wrap{flex:1;position:relative;min-width:0;background:
  linear-gradient(180deg,rgba(255,255,255,.4),rgba(248,249,255,.2))}
.grid-overlay{position:absolute;inset:0;pointer-events:none;opacity:.7;
  background-image:linear-gradient(rgba(59,130,246,.05) 1px,transparent 1px),linear-gradient(90deg,rgba(59,130,246,.05) 1px,transparent 1px);
  background-size:40px 40px;mask-image:radial-gradient(circle at 50% 45%,#000 60%,transparent 100%)}
.kg-canvas{position:absolute;inset:0}
.kg-empty{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:18px;pointer-events:none;text-align:center}
.kg-empty p{color:var(--mut);font-size:15px;line-height:1.9} .kg-empty b{color:var(--primary);font-weight:700} .kg-empty span{font-size:12px;color:#94a3b8}
.empty-ring{width:64px;height:64px;border-radius:50%;border:3px solid rgba(59,130,246,.18);border-top-color:var(--primary);animation:spin 2.6s linear infinite}
@keyframes spin{to{transform:rotate(360deg)}}
.kg-scan{position:absolute;left:0;right:0;top:0;height:2px;background:linear-gradient(90deg,transparent,var(--primary),transparent);animation:scan 1.4s linear infinite;pointer-events:none}
@keyframes scan{0%{top:0;opacity:0}10%{opacity:1}100%{top:100%;opacity:0}}

/* 详情抽屉 */
.kg-detail{position:absolute;right:0;top:0;bottom:0;width:300px;padding:18px;
  background:var(--card);border-left:1px solid var(--line);box-shadow:var(--shadow-lg);overflow-y:auto}
.corner{position:absolute;width:13px;height:13px;border:2px solid var(--primary);opacity:.5}
.corner.tl{top:9px;left:9px;border-right:0;border-bottom:0} .corner.br{bottom:9px;right:9px;border-left:0;border-top:0}
.d-head{display:flex;justify-content:space-between;align-items:center}
.d-type{font-size:12px;font-weight:700;letter-spacing:.5px}
.d-close{background:#f5f7fb;border:1px solid var(--line);color:var(--mut);border-radius:6px;width:24px;height:24px;cursor:pointer;line-height:1}
.d-close:hover{color:var(--slate);border-color:var(--primary)}
.d-name{font-size:18px;font-weight:700;margin:10px 0 8px;color:var(--slate)}
.badge-uv{display:inline-block;font-size:11px;color:#d97706;background:#fff7ed;border:1px solid #fcd9a6;padding:3px 9px;border-radius:6px;margin-bottom:8px}
.d-attrs{margin:14px 0;display:grid;grid-template-columns:62px 1fr;gap:8px 10px}
.d-attrs dt{color:var(--mut);font-size:12px}
.d-attrs dd{margin:0;color:var(--slate);font-size:13px;word-break:break-all}
.d-empty{color:var(--mut);font-size:13px;grid-column:1/3}
.d-imgs{display:flex;flex-wrap:wrap;gap:6px;margin:10px 0}
.d-imgs img{width:72px;height:72px;object-fit:cover;border-radius:6px;border:1px solid var(--line)}
.d-actions{display:flex;gap:8px;margin-top:16px}
.act{flex:1;padding:9px;border-radius:8px;font-weight:700;font-size:13px;cursor:pointer;border:1px solid;transition:.15s}
.act.ok{background:#f0fdf4;color:#16a34a;border-color:#bbf7d0} .act.ok:hover{background:#dcfce7}
.act.no{background:#fef2f2;color:#dc2626;border-color:#fecaca} .act.no:hover{background:#fee2e2}
.act:disabled{opacity:.5;cursor:not-allowed}
.d-hint{margin-top:14px;font-size:12px;color:var(--mut)}

.slide-enter-active,.slide-leave-active{transition:transform .28s ease,opacity .28s}
.slide-enter-from,.slide-leave-to{transform:translateX(40px);opacity:0}
</style>
