<script setup>
import { ref, reactive, computed, onMounted, watch, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Refresh, ArrowDown, ArrowUp, DocumentAdd, Share, CloseBold, Plus, Delete } from '@element-plus/icons-vue'
import { getTaskList, promoteToProcedure, promoteToGraph, skipPromotion } from '../api/task'

const router = useRouter()

/* ---------- 图谱沉淀：可编辑模型（按 task.id 缓存） ---------- */
const editModels = reactive({})
const SEVERITY_OPTIONS = ['一般', '严重', '紧急']

function buildEditModel(task) {
  const raw = formatGraphExtraction(task.graphExtraction) || {}
  return reactive({
    deviceName: raw.deviceName || (raw.deviceNames && raw.deviceNames[0]) || task.deviceName || '',
    procedureId: typeof raw.procedureId === 'number' ? raw.procedureId : null,
    components: (raw.components || []).map((c) => ({ name: c.name || '', specification: c.specification || '' })),
    faults: (raw.faults || []).map((f) => ({ name: f.name || '', severity: f.severity || '一般', relatedComponent: f.relatedComponent || '' })),
    solutions: (raw.solutions || []).map((s) => ({ title: s.title || '', summary: s.summary || '', relatedFault: s.relatedFault || '' })),
  })
}

function ensureModel(task) {
  if (!editModels[task.id]) editModels[task.id] = buildEditModel(task)
  return editModels[task.id]
}

function componentNames(task) {
  return (editModels[task.id]?.components || []).map((c) => c.name).filter(Boolean)
}
function faultNames(task) {
  return (editModels[task.id]?.faults || []).map((f) => f.name).filter(Boolean)
}

function addComponent(task) { ensureModel(task).components.push({ name: '', specification: '' }) }
function removeComponent(task, i) { ensureModel(task).components.splice(i, 1) }
function addFault(task) { ensureModel(task).faults.push({ name: '', severity: '一般', relatedComponent: '' }) }
function removeFault(task, i) { ensureModel(task).faults.splice(i, 1) }
function addSolution(task) { ensureModel(task).solutions.push({ title: '', summary: '', relatedFault: '' }) }
function removeSolution(task, i) { ensureModel(task).solutions.splice(i, 1) }

/* ---------- Props ---------- */
const props = defineProps({
  jumpToId: { type: [String, Number], default: null },
})

/* ---------- 状态 ---------- */
const tasks = ref([])
const loading = ref(false)
const expandedCards = ref(new Set())
const busyCards = ref(new Set())

const stats = reactive({ total: 0, pendingProcedure: 0, pendingGraph: 0, pendingBoth: 0 })

/* ---------- 方法 ---------- */

async function loadTasks() {
  loading.value = true
  try {
    const res = await getTaskList({
      status: 'CLOSED',
      promotedProcedure: 'PENDING',
      promotedGraph: 'PENDING',
      page: 1,
      size: 50,
    })
    if (res.code === '200' || res.code === 200) {
      const all = res.data?.records || res.data?.list || []
      // 前端过滤：至少一个 PENDING
      tasks.value = (all || []).filter(
        (t) => t.promotedProcedure === 'PENDING' || t.promotedGraph === 'PENDING'
      )
      stats.total = tasks.value.length
      stats.pendingProcedure = tasks.value.filter((t) => t.promotedProcedure === 'PENDING').length
      stats.pendingGraph = tasks.value.filter((t) => t.promotedGraph === 'PENDING').length
      stats.pendingBoth = tasks.value.filter(
        (t) => t.promotedProcedure === 'PENDING' && t.promotedGraph === 'PENDING'
      ).length
    }
  } catch (e) {
    ElMessage.error('加载待沉淀任务失败：' + (e.message || '请求异常'))
  } finally {
    loading.value = false
  }
}

function toggleExpand(task) {
  const taskId = typeof task === 'object' ? task.id : task
  const s = new Set(expandedCards.value)
  if (s.has(taskId)) s.delete(taskId)
  else {
    s.add(taskId)
    if (typeof task === 'object') ensureModel(task) // 展开即初始化可编辑模型
  }
  expandedCards.value = s
}

function isExpanded(taskId) {
  return expandedCards.value.has(taskId)
}

function isBusy(taskId) {
  return busyCards.value.has(taskId)
}

async function handlePromoteProcedure(task) {
  busyCards.value.add(task.id)
  try {
    const res = await promoteToProcedure(task.id)
    const procedureId = res.data
    task.promotedProcedure = 'PROMOTED'
    task.procedureName = task.procedureName || `规程#${procedureId}`
    refreshStats()
    // 沉淀后是 DRAFT 草稿，复用「标准规程管理」编辑后发布
    try {
      await ElMessageBox.confirm(
        `已生成草稿规程（ID: ${procedureId}）。是否前往「标准规程管理」查看并编辑后发布？`,
        '沉淀成功',
        { confirmButtonText: '去编辑', cancelButtonText: '稍后', type: 'success' }
      )
      router.push({ name: 'AdminProcedures', query: { edit: procedureId } })
    } catch {
      /* 用户选择稍后，留在当前页 */
    }
  } catch (e) {
    ElMessage.error('沉淀规程失败：' + (e.message || ''))
  } finally {
    busyCards.value.delete(task.id)
  }
}

async function handlePromoteGraph(task) {
  const model = ensureModel(task)
  // 组装管理员编辑后的 graphData（按 name 关联，与后端 promoteToGraph 契约一致）
  const graphData = {
    deviceName: (model.deviceName || task.deviceName || '').trim(),
    components: model.components.filter((c) => c.name && c.name.trim())
      .map((c) => ({ name: c.name.trim(), specification: (c.specification || '').trim() })),
    faults: model.faults.filter((f) => f.name && f.name.trim())
      .map((f) => ({ name: f.name.trim(), severity: f.severity || '一般', relatedComponent: (f.relatedComponent || '').trim() })),
    solutions: model.solutions.filter((s) => s.title && s.title.trim())
      .map((s) => ({ title: s.title.trim(), summary: (s.summary || '').trim(), relatedFault: (s.relatedFault || '').trim() })),
  }
  if (model.procedureId != null) graphData.procedureId = model.procedureId

  if (!graphData.deviceName) {
    ElMessage.warning('请填写设备名称')
    return
  }
  if (!graphData.components.length && !graphData.faults.length && !graphData.solutions.length) {
    ElMessage.warning('请至少保留一个部件 / 故障 / 方案')
    return
  }

  busyCards.value.add(task.id)
  try {
    await promoteToGraph(task.id, graphData)
    task.promotedGraph = 'PROMOTED'
    ElMessage.success('已沉淀到知识图谱')
    refreshStats()
  } catch (e) {
    ElMessage.error('沉淀图谱失败：' + (e.message || ''))
  } finally {
    busyCards.value.delete(task.id)
  }
}

async function handleSkip(task, type) {
  const typeLabel = type === 'procedure' ? '规程沉淀' : type === 'graph' ? '图谱沉淀' : '全部沉淀'
  try {
    await ElMessageBox.confirm(
      `确认跳过「${task.taskNumber}」的${typeLabel}？跳过后该任务不再出现在待审核列表中。`,
      '跳过沉淀确认',
      {
        confirmButtonText: '确认跳过',
        cancelButtonText: '取消',
        type: 'warning',
        confirmButtonClass: 'skip-confirm-btn',
      }
    )
  } catch {
    return
  }
  busyCards.value.add(task.id)
  try {
    await skipPromotion(task.id, type)
    if (type === 'both' || type === 'procedure') task.promotedProcedure = 'SKIPPED'
    if (type === 'both' || type === 'graph') task.promotedGraph = 'SKIPPED'
    ElMessage.success('已跳过')
    // 如果两项都已处理（非PENDING），从列表移除
    if (task.promotedProcedure !== 'PENDING' && task.promotedGraph !== 'PENDING') {
      tasks.value = tasks.value.filter((t) => t.id !== task.id)
    }
    refreshStats()
  } catch (e) {
    ElMessage.error('操作失败：' + (e.message || ''))
  } finally {
    busyCards.value.delete(task.id)
  }
}

function refreshStats() {
  stats.total = tasks.value.length
  stats.pendingProcedure = tasks.value.filter((t) => t.promotedProcedure === 'PENDING').length
  stats.pendingGraph = tasks.value.filter((t) => t.promotedGraph === 'PENDING').length
  stats.pendingBoth = tasks.value.filter(
    (t) => t.promotedProcedure === 'PENDING' && t.promotedGraph === 'PENDING'
  ).length
  if (stats.total === 0) tasks.value = []
}

/* ---------- 格式化 ---------- */

function formatDate(dateStr) {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleDateString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatGraphExtraction(extraction) {
  if (!extraction) return null
  if (typeof extraction === 'string') {
    try {
      return JSON.parse(extraction)
    } catch {
      return { raw: extraction }
    }
  }
  return extraction
}

function extractionSummary(extraction) {
  const obj = formatGraphExtraction(extraction)
  if (!obj) return null
  const parts = []
  if (obj.components?.length) parts.push(`${obj.components.length} 个部件`)
  if (obj.faults?.length) parts.push(`${obj.faults.length} 个故障`)
  if (obj.solutions?.length) parts.push(`${obj.solutions.length} 个方案`)
  if (obj.deviceNames?.length) parts.push(`${obj.deviceNames.length} 个设备`)
  return parts.length ? parts.join(' · ') : '有待确认线索'
}

const urgencyLabels = { 0: '低', 1: '普通', 2: '紧急' }
const urgencyStyles = {
  0: { bg: '#f0fdf4', color: '#16a34a', border: '#bbf7d0' },
  1: { bg: '#eff6ff', color: '#3b82f6', border: '#bfdbfe' },
  2: { bg: '#fef2f2', color: '#ef4444', border: '#fecaca' },
}

const levelLabels = { ROUTINE: '日常保养', MINOR: '小修', MAJOR: '大修' }

/* ---------- 组合卡片的可操作维度 ---------- */
function cardActions(task) {
  const acts = []
  if (task.promotedProcedure === 'PENDING') {
    acts.push({ key: 'procedure', label: '沉淀为规程', icon: '', fn: () => handlePromoteProcedure(task) })
  }
  if (task.promotedGraph === 'PENDING') {
    acts.push({ key: 'graph', label: '沉淀到图谱', icon: '', fn: () => handlePromoteGraph(task) })
  }
  if (task.promotedProcedure === 'PENDING' && task.promotedGraph === 'PENDING') {
    acts.push({ key: 'both', label: '全部跳过', icon: '', fn: () => handleSkip(task, 'both'), danger: true })
  } else if (task.promotedProcedure === 'PENDING') {
    acts.push({ key: 'procedure-skip', label: '跳过规程', icon: '', fn: () => handleSkip(task, 'procedure'), danger: true })
  } else if (task.promotedGraph === 'PENDING') {
    acts.push({ key: 'graph-skip', label: '跳过图谱', icon: '', fn: () => handleSkip(task, 'graph'), danger: true })
  }
  return acts
}

onMounted(loadTasks)

/* ---------- 跳转定位 ---------- */
watch(
  () => props.jumpToId,
  async (id) => {
    if (id == null) return
    // 等待任务列表加载完成（如果尚未加载）
    await nextTick()
    const found = tasks.value.find((t) => t.id == id)
    if (!found) {
      // 任务不在当前待沉淀列表中，可能已处理或不在 CLOSED+PENDING 范围
      ElMessage.info('该任务不在待沉淀列表中（可能已处理或不需沉淀）')
      return
    }
    // 展开卡片
    const s = new Set(expandedCards.value)
    s.add(id)
    expandedCards.value = s
    await nextTick()
    // 滚动到对应卡片
    const el = document.querySelector(`[data-task-id="${id}"]`)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      el.classList.add('card-flash')
      setTimeout(() => el.classList.remove('card-flash'), 2000)
    }
  }
)
</script>

<template>
  <div class="drp-root">
    <!-- ====== 头部统计概览 ====== -->
    <header class="drp-head">
      <div class="drp-title-row">
        <div class="drp-title">
          <span class="drp-title-led" />
          <h2 class="drp-title-text">沉淀审核</h2>
          <span class="drp-title-sub">DISTILLATION · REVIEW</span>
        </div>
        <button class="drp-refresh" :disabled="loading" @click="loadTasks">
          <el-icon :class="{ spinning: loading }"><Refresh /></el-icon>
          {{ loading ? '加载中…' : '刷新' }}
        </button>
      </div>

      <div class="drp-stats">
        <div class="stat-card">
          <span class="stat-num">{{ stats.total }}</span>
          <span class="stat-label">待审核任务</span>
        </div>
        <div class="stat-card sc-procedure">
          <span class="stat-num">{{ stats.pendingProcedure }}</span>
          <span class="stat-label">待沉淀规程</span>
        </div>
        <div class="stat-card sc-graph">
          <span class="stat-num">{{ stats.pendingGraph }}</span>
          <span class="stat-label">待沉淀图谱</span>
        </div>
        <div class="stat-card sc-both">
          <span class="stat-num">{{ stats.pendingBoth }}</span>
          <span class="stat-label">两端待定</span>
        </div>
      </div>
    </header>

    <!-- ====== 加载态 ====== -->
    <div v-if="loading && tasks.length === 0" class="drp-body">
      <div class="drp-loading">
        <div class="lds-ring" />
        <p>正在拉取待沉淀任务…</p>
      </div>
    </div>

    <!-- ====== 空状态 ====== -->
    <div v-else-if="!loading && tasks.length === 0" class="drp-body">
      <div class="drp-empty">
        <div class="empty-icon-wrap">
          <svg class="empty-svg" viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="40" cy="40" r="36" stroke="currentColor" stroke-width="1.5" stroke-dasharray="6 4" opacity="0.4"/>
            <path d="M32 44l5 5 11-11" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" opacity="0.5"/>
          </svg>
        </div>
        <h3>暂无待审核的沉淀项</h3>
        <p>所有已完成任务的 AI 提取线索均已处理。<br/>新任务关闭后将自动出现在此列表中。</p>
      </div>
    </div>

    <!-- ====== 任务卡片列表 ====== -->
    <div v-else class="drp-body">
      <div class="drp-cards">
        <div
          v-for="task in tasks"
          :key="task.id"
          :data-task-id="task.id"
          class="task-card"
          :class="{
            'card-expanded': isExpanded(task.id),
            'card-busy': isBusy(task.id),
          }"
        >
          <!-- 卡片头部 -->
          <div class="card-header" @click="toggleExpand(task)">
            <div class="card-header-left">
              <span class="task-num">{{ task.taskNumber }}</span>
              <span
                class="urgency-tag"
                :style="{
                  background: (urgencyStyles[task.urgencyLevel] || urgencyStyles[1]).bg,
                  color: (urgencyStyles[task.urgencyLevel] || urgencyStyles[1]).color,
                  borderColor: (urgencyStyles[task.urgencyLevel] || urgencyStyles[1]).border,
                }"
              >
                {{ urgencyLabels[task.urgencyLevel] || '普通' }}
              </span>
              <span v-if="task.maintenanceLevel" class="level-tag">
                {{ levelLabels[task.maintenanceLevel] || task.maintenanceLevel }}
              </span>
            </div>
            <div class="card-header-right">
              <!-- 规程沉淀状态 -->
              <span
                class="promo-badge"
                :class="{
                  'pb-pending': task.promotedProcedure === 'PENDING',
                  'pb-done': task.promotedProcedure === 'PROMOTED',
                  'pb-skip': task.promotedProcedure === 'SKIPPED',
                }"
              >
                {{ task.promotedProcedure === 'PENDING' ? '待沉淀规程' : task.promotedProcedure === 'PROMOTED' ? '已沉淀规程' : '已跳过规程' }}
              </span>
              <!-- 图谱沉淀状态 -->
              <span
                class="promo-badge"
                :class="{
                  'pb-pending': task.promotedGraph === 'PENDING',
                  'pb-done': task.promotedGraph === 'PROMOTED',
                  'pb-skip': task.promotedGraph === 'SKIPPED',
                }"
              >
                {{ task.promotedGraph === 'PENDING' ? '待沉淀图谱' : task.promotedGraph === 'PROMOTED' ? '已沉淀图谱' : '已跳过图谱' }}
              </span>
              <button class="expand-toggle">
                <el-icon><component :is="isExpanded(task.id) ? ArrowUp : ArrowDown" /></el-icon>
              </button>
            </div>
          </div>

          <!-- 卡片核心信息 -->
          <div class="card-core">
            <div class="core-field">
              <span class="field-label">设备</span>
              <span class="field-value">{{ task.deviceName || '-' }}</span>
            </div>
            <div class="core-field">
              <span class="field-label">故障描述</span>
              <span class="field-value fault-desc">{{ task.faultDescription || '-' }}</span>
            </div>
            <div class="core-field">
              <span class="field-label">创建时间</span>
              <span class="field-value mono">{{ formatDate(task.createdAt) }}</span>
            </div>
            <div v-if="task.procedureName" class="core-field">
              <span class="field-label">关联规程</span>
              <span class="field-value mono" style="color: var(--plaza-accent)">{{ task.procedureName }}</span>
            </div>
          </div>

          <!-- AI 提取线索（可展开 + 可编辑） -->
          <transition name="expand">
            <div v-if="isExpanded(task.id) && editModels[task.id]" class="card-extraction">
              <div class="ext-head">
                <span class="ext-led" />
                <span class="ext-title">图谱线索（可编辑）</span>
                <span class="ext-summary" v-if="extractionSummary(task.graphExtraction)">
                  AI 原始：{{ extractionSummary(task.graphExtraction) }}
                </span>
              </div>

              <div class="ext-edit">
                <!-- 设备 -->
                <div class="ee-row">
                  <label class="ee-label">设备名称</label>
                  <el-input v-model="editModels[task.id].deviceName" size="small" placeholder="设备名称（必填）" />
                </div>

                <!-- 部件 -->
                <div class="ee-section">
                  <div class="ee-sec-head">
                    <span class="ee-sec-title">部件 Components</span>
                    <button class="ee-add" @click.stop="addComponent(task)"><el-icon><Plus /></el-icon>添加部件</button>
                  </div>
                  <div v-for="(c, i) in editModels[task.id].components" :key="'c'+i" class="ee-item">
                    <el-input v-model="c.name" size="small" placeholder="部件名称" class="ee-grow" />
                    <el-input v-model="c.specification" size="small" placeholder="规格（可选）" class="ee-grow" />
                    <button class="ee-del" @click.stop="removeComponent(task, i)"><el-icon><Delete /></el-icon></button>
                  </div>
                  <p v-if="!editModels[task.id].components.length" class="ee-empty">暂无部件</p>
                </div>

                <!-- 故障 -->
                <div class="ee-section">
                  <div class="ee-sec-head">
                    <span class="ee-sec-title">故障 Faults</span>
                    <button class="ee-add" @click.stop="addFault(task)"><el-icon><Plus /></el-icon>添加故障</button>
                  </div>
                  <div v-for="(f, i) in editModels[task.id].faults" :key="'f'+i" class="ee-item">
                    <el-input v-model="f.name" size="small" placeholder="故障名称" class="ee-grow" />
                    <el-select v-model="f.severity" size="small" placeholder="严重度" style="width:92px" filterable allow-create>
                      <el-option v-for="s in SEVERITY_OPTIONS" :key="s" :label="s" :value="s" />
                    </el-select>
                    <el-select v-model="f.relatedComponent" size="small" placeholder="关联部件" style="width:130px" clearable filterable>
                      <el-option v-for="n in componentNames(task)" :key="n" :label="n" :value="n" />
                    </el-select>
                    <button class="ee-del" @click.stop="removeFault(task, i)"><el-icon><Delete /></el-icon></button>
                  </div>
                  <p v-if="!editModels[task.id].faults.length" class="ee-empty">暂无故障</p>
                </div>

                <!-- 方案 -->
                <div class="ee-section">
                  <div class="ee-sec-head">
                    <span class="ee-sec-title">方案 Solutions</span>
                    <button class="ee-add" @click.stop="addSolution(task)"><el-icon><Plus /></el-icon>添加方案</button>
                  </div>
                  <div v-for="(s, i) in editModels[task.id].solutions" :key="'s'+i" class="ee-item ee-item-col">
                    <div class="ee-item">
                      <el-input v-model="s.title" size="small" placeholder="方案标题" class="ee-grow" />
                      <el-select v-model="s.relatedFault" size="small" placeholder="关联故障" style="width:130px" clearable filterable>
                        <el-option v-for="n in faultNames(task)" :key="n" :label="n" :value="n" />
                      </el-select>
                      <button class="ee-del" @click.stop="removeSolution(task, i)"><el-icon><Delete /></el-icon></button>
                    </div>
                    <el-input v-model="s.summary" size="small" type="textarea" :rows="2" placeholder="方案摘要（可选）" />
                  </div>
                  <p v-if="!editModels[task.id].solutions.length" class="ee-empty">暂无方案</p>
                </div>
              </div>

              <p class="ext-hint">可在上方直接增删改 AI 提取的线索，确认后点击「沉淀到图谱」将<b>编辑后的内容</b>写入知识图谱。</p>
            </div>
          </transition>

          <!-- 操作按钮 -->
          <div class="card-actions">
            <button
              v-for="act in cardActions(task)"
              :key="act.key"
              class="act-btn"
              :class="{ 'act-danger': act.danger }"
              :disabled="isBusy(task.id)"
              @click.stop="act.fn()"
            >
              <span class="act-icon">{{ act.icon }}</span>
              <span class="act-label">{{ act.label }}</span>
            </button>
          </div>

          <!-- 加载遮罩 -->
          <div v-if="isBusy(task.id)" class="card-overlay">
            <div class="mini-spinner" />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* ============================================================
   DistillationReviewPanel — 工程控制台 · 沉淀审核面板
   色调：项目「矿石白 + 克制蓝」融入「信号琥珀」强调
   ============================================================ */
.drp-root {
  --drp-card-bg: #fff;
  --drp-line: var(--plaza-border);
  --drp-mut: var(--plaza-text-muted);
  --drp-shadow: var(--plaza-shadow-organic);
  --drp-shadow-lg: var(--plaza-shadow-organic-hover);
  position: relative;
  width: 100%;
  height: 100%;
  min-height: 480px;
  display: flex;
  flex-direction: column;
  background:
    radial-gradient(680px 380px at 85% -6%, rgba(59, 130, 246, 0.04), transparent 60%),
    radial-gradient(560px 340px at 10% 105%, rgba(255, 166, 43, 0.05), transparent 60%),
    var(--plaza-bg);
  color: var(--plaza-text);
  font-family: 'Public Sans', 'Inter', -apple-system, BlinkMacSystemFont, 'PingFang SC', 'Microsoft YaHei', sans-serif;
  border-radius: var(--plaza-radius-lg);
  overflow-y: auto;
}

/* ====== 头部 ====== */
.drp-head {
  padding: 20px 24px 16px;
  border-bottom: 1px solid var(--drp-line);
  background: rgba(255, 255, 255, 0.7);
  backdrop-filter: blur(4px);
  position: sticky;
  top: 0;
  z-index: 2;
}
.drp-title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}
.drp-title {
  display: flex;
  align-items: center;
  gap: 10px;
}
.drp-title-led {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--signal, #ffa62b);
  box-shadow: 0 0 0 3px var(--signal-soft, rgba(255, 166, 43, 0.14));
  animation: drp-pulse 2.4s ease-in-out infinite;
}
@keyframes drp-pulse {
  50% { opacity: 0.4; }
}
.drp-title-text {
  font-size: 18px;
  font-weight: 700;
  color: var(--plaza-heading);
  letter-spacing: 0.3px;
  margin: 0;
}
.drp-title-sub {
  font-family: var(--font-mono);
  font-size: 10px;
  color: #94a3b8;
  letter-spacing: 2px;
}
.drp-refresh {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 7px 16px;
  border: 1px solid var(--drp-line);
  border-radius: 8px;
  background: #fff;
  color: var(--plaza-text-muted);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.18s ease;
}
.drp-refresh:hover {
  border-color: var(--plaza-accent);
  color: var(--plaza-accent);
  background: var(--plaza-info-soft);
}
.drp-refresh:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
.spinning {
  animation: spin 1s linear infinite;
}
@keyframes spin {
  to { transform: rotate(360deg); }
}

/* 统计卡片行 */
.drp-stats {
  display: flex;
  gap: 14px;
}
.stat-card {
  flex: 1;
  background: #fff;
  border: 1px solid var(--drp-line);
  border-radius: 10px;
  padding: 12px 16px;
  display: flex;
  flex-direction: column;
  gap: 2px;
  box-shadow: var(--drp-shadow);
}
.stat-num {
  font-family: var(--font-mono);
  font-size: 26px;
  font-weight: 700;
  color: var(--plaza-heading);
  line-height: 1.1;
}
.stat-label {
  font-size: 12px;
  font-weight: 600;
  color: var(--drp-mut);
  letter-spacing: 0.3px;
}
.sc-procedure .stat-num { color: var(--plaza-accent); }
.sc-graph .stat-num { color: #8b5cf6; }
.sc-both .stat-num { color: var(--signal, #ffa62b); }

/* ====== Body ====== */
.drp-body {
  flex: 1;
  padding: 18px 24px 24px;
  min-height: 0;
}

/* 加载态 */
.drp-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  padding: 80px 0;
}
.lds-ring {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  border: 3px solid rgba(59, 130, 246, 0.14);
  border-top-color: var(--plaza-accent);
  animation: spin 0.9s linear infinite;
}
.drp-loading p {
  color: var(--drp-mut);
  font-size: 14px;
}

/* 空状态 */
.drp-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 14px;
  padding: 80px 0;
  text-align: center;
}
.empty-icon-wrap {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background: #fff;
  border: 1.5px dashed var(--drp-line);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--plaza-text-muted);
}
.empty-svg {
  width: 48px;
  height: 48px;
}
.drp-empty h3 {
  font-size: 1rem;
  font-weight: 700;
  color: var(--plaza-heading);
  margin: 0;
}
.drp-empty p {
  font-size: 13px;
  color: var(--drp-mut);
  line-height: 1.7;
  margin: 0;
}

/* ====== 任务卡片 ====== */
.drp-cards {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.task-card {
  background: var(--drp-card-bg);
  border: 1px solid var(--drp-line);
  border-radius: 12px;
  box-shadow: var(--drp-shadow);
  transition: border-color 0.2s ease, box-shadow 0.25s ease;
  position: relative;
  overflow: hidden;
}
.task-card::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 3px;
  border-radius: 0 3px 3px 0;
  background: var(--signal, #ffa62b);
  opacity: 0;
  transition: opacity 0.25s ease;
}
.task-card:hover {
  border-color: #c8cfe0;
  box-shadow: var(--drp-shadow-lg);
}
.task-card.card-expanded::before {
  opacity: 1;
}
.task-card.card-busy {
  pointer-events: none;
  opacity: 0.7;
}

/* 卡片头部 */
.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 18px;
  cursor: pointer;
  user-select: none;
}
.card-header-left {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}
.task-num {
  font-family: var(--font-mono);
  font-size: 13px;
  font-weight: 700;
  color: var(--plaza-heading);
  letter-spacing: 0.3px;
}
.urgency-tag {
  font-size: 11px;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 20px;
  border: 1px solid;
  white-space: nowrap;
}
.level-tag {
  font-size: 11px;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 20px;
  background: #f5f3ff;
  color: #7c3aed;
  border: 1px solid #ddd6fe;
  white-space: nowrap;
}
.card-header-right {
  display: flex;
  align-items: center;
  gap: 8px;
}
.promo-badge {
  font-size: 11px;
  font-weight: 600;
  padding: 3px 10px;
  border-radius: 20px;
  border: 1px solid;
  white-space: nowrap;
  letter-spacing: 0.2px;
}
.pb-pending {
  background: #fff7ed;
  color: #d97706;
  border-color: #fcd9a6;
}
.pb-done {
  background: var(--plaza-success-soft);
  color: var(--plaza-success);
  border-color: #bbf7d0;
}
.pb-skip {
  background: #f8f8f8;
  color: #94a3b8;
  border-color: #e2e8f0;
}
.expand-toggle {
  width: 28px;
  height: 28px;
  border-radius: 6px;
  border: 1px solid var(--drp-line);
  background: #f8f9fc;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: var(--drp-mut);
  transition: all 0.15s ease;
  flex-shrink: 0;
}
.expand-toggle:hover {
  border-color: var(--plaza-accent);
  color: var(--plaza-accent);
}

/* 核心信息 */
.card-core {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 8px 20px;
  padding: 0 18px 14px;
}
.core-field {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.field-label {
  font-size: 11px;
  font-weight: 600;
  color: var(--drp-mut);
  text-transform: uppercase;
  letter-spacing: 0.4px;
}
.field-value {
  font-size: 14px;
  color: var(--plaza-text);
  font-weight: 500;
}
.field-value.mono {
  font-family: var(--font-mono);
  font-size: 12px;
}
.fault-desc {
  max-width: 320px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* 展开的 AI 线索 */
.card-extraction {
  margin: 0 18px 14px;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  overflow: hidden;
  background: #fafbfd;
}
.ext-head {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  background: #f7f9fc;
  border-bottom: 1px solid #eef1f6;
}
.ext-led {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #8b5cf6;
  box-shadow: 0 0 0 2px rgba(139, 92, 246, 0.16);
}
.ext-title {
  font-size: 12px;
  font-weight: 700;
  color: var(--plaza-heading);
  letter-spacing: 0.3px;
}
.ext-summary {
  font-size: 11px;
  color: #8b5cf6;
  font-weight: 500;
  margin-left: auto;
}
.ext-body {
  padding: 12px 14px;
  max-height: 240px;
  overflow-y: auto;
}
.ext-json {
  font-family: var(--font-mono);
  font-size: 11.5px;
  line-height: 1.7;
  color: var(--plaza-text);
  white-space: pre-wrap;
  word-break: break-all;
  margin: 0;
  background: transparent;
}
.ext-hint {
  padding: 8px 14px;
  margin: 0;
  font-size: 11px;
  color: var(--drp-mut);
  border-top: 1px solid #eef1f6;
  background: #fff;
}

/* 可编辑表单 */
.ext-edit {
  padding: 12px 14px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.ee-row {
  display: flex;
  align-items: center;
  gap: 10px;
}
.ee-label {
  font-size: 12px;
  font-weight: 600;
  color: var(--drp-mut);
  min-width: 64px;
}
.ee-section {
  border: 1px solid #eef1f6;
  border-radius: 8px;
  padding: 10px 12px;
  background: #fff;
}
.ee-sec-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}
.ee-sec-title {
  font-size: 12px;
  font-weight: 700;
  color: var(--plaza-heading);
  letter-spacing: 0.3px;
}
.ee-add {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  font-weight: 600;
  color: var(--plaza-accent);
  background: var(--plaza-info-soft);
  border: 1px solid transparent;
  border-radius: 6px;
  padding: 3px 10px;
  cursor: pointer;
  transition: all 0.15s ease;
}
.ee-add:hover {
  border-color: var(--plaza-accent);
}
.ee-item {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}
.ee-item:last-child { margin-bottom: 0; }
.ee-item-col {
  flex-direction: column;
  align-items: stretch;
  gap: 6px;
  padding: 8px;
  border: 1px dashed #e2e8f0;
  border-radius: 8px;
}
.ee-grow { flex: 1; min-width: 0; }
.ee-del {
  width: 28px;
  height: 28px;
  flex-shrink: 0;
  border-radius: 6px;
  border: 1px solid var(--drp-line);
  background: #fff;
  color: #94a3b8;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.15s ease;
}
.ee-del:hover {
  border-color: var(--plaza-danger);
  color: var(--plaza-danger);
  background: var(--plaza-danger-soft);
}
.ee-empty {
  font-size: 12px;
  color: #b8c0cc;
  margin: 2px 0 0;
}

/* 展开过渡 */
.expand-enter-active,
.expand-leave-active {
  transition: all 0.28s cubic-bezier(0.22, 1, 0.36, 1);
}
.expand-enter-from,
.expand-leave-to {
  opacity: 0;
  max-height: 0;
  margin-bottom: 0;
}
.expand-enter-to,
.expand-leave-from {
  opacity: 1;
  max-height: 600px;
}

/* 操作按钮 */
.card-actions {
  display: flex;
  gap: 8px;
  padding: 0 18px 14px;
}
.act-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 9px 0;
  border-radius: 8px;
  border: 1px solid;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
  letter-spacing: 0.2px;
  background: #fff;
  color: var(--plaza-text);
  border-color: var(--drp-line);
}
.act-btn:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}
.act-btn:nth-child(1):hover:not(:disabled) {
  background: var(--plaza-info-soft);
  border-color: var(--plaza-accent);
  color: var(--plaza-accent);
}
.act-btn:nth-child(2):hover:not(:disabled) {
  background: #f5f3ff;
  border-color: #8b5cf6;
  color: #7c3aed;
}
.act-btn.act-danger {
  flex: 0 0 auto;
  min-width: 80px;
  background: #fafafa;
  color: var(--drp-mut);
}
.act-btn.act-danger:hover:not(:disabled) {
  background: var(--plaza-danger-soft);
  border-color: var(--plaza-danger);
  color: var(--plaza-danger);
}
.act-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.act-icon {
  font-size: 15px;
}
.act-label {
  font-size: 13px;
}

/* 卡片操作遮罩 */
.card-overlay {
  position: absolute;
  inset: 0;
  background: rgba(255, 255, 255, 0.55);
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 12px;
}
.mini-spinner {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  border: 2.5px solid rgba(59, 130, 246, 0.16);
  border-top-color: var(--plaza-accent);
  animation: spin 0.8s linear infinite;
}

/* 跳转闪烁动画 */
.card-flash {
  animation: drp-flash 0.6s ease-in-out 2;
}
@keyframes drp-flash {
  0%, 100% { box-shadow: var(--drp-shadow); border-color: var(--drp-line); }
  50% { box-shadow: 0 0 0 4px var(--signal-soft, rgba(255,166,43,.3)), 0 4px 20px rgba(255,166,43,.2); border-color: var(--signal, #ffa62b); }
}

/* ====== 响应式 ====== */
@media (max-width: 768px) {
  .drp-stats {
    flex-wrap: wrap;
    gap: 8px;
  }
  .stat-card {
    flex: 1 1 calc(50% - 4px);
    min-width: 100px;
  }
  .card-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }
  .card-header-right {
    flex-wrap: wrap;
  }
  .card-core {
    grid-template-columns: 1fr;
  }
  .card-actions {
    flex-direction: column;
  }
  .act-btn.act-danger {
    min-width: unset;
  }
}
</style>
