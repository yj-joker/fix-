// 全局通知 / 后台任务状态（模块级单例响应式 store）。
// 设计：
//  - WebSocket 推送只负责「弹 Toast」+「触发一次对账」；
//  - 任务是否完成以「状态查询接口」为准（兼容漏推，且绕开 documentId/manualId 不一致）；
//  - 进行中的任务持久化到 localStorage，刷新/重连后仍能对账，避免「死转圈」。
import { reactive } from 'vue'
import { ElNotification } from 'element-plus'
import { connectNotify, disconnectNotify } from '@/utils/notifySocket'
import { request } from '@/api/request'

const LS_KEY = 'wx_running_jobs'

const state = reactive({
  connected: false,
  jobs: {},          // key -> { key, kind, refId, title, status, startedAt }
  notifications: [], // 最近的推送历史（可喂给 AdminNotify 页）
})

// 推送类型 -> 终态语义
const TYPE_META = {
  KNOWLEDGE_IMPORTED:      { ok: true },
  KNOWLEDGE_IMPORT_FAILED: { ok: false },
  TASK_GENERATED:          { ok: true },
  TASK_GENERATE_FAILED:    { ok: false },
  STEP_VERIFIED:           { ok: true },
}

let started = false
let timer = null

function persist() { try { localStorage.setItem(LS_KEY, JSON.stringify(state.jobs)) } catch (e) {} }
function loadJobs() {
  try { Object.assign(state.jobs, JSON.parse(localStorage.getItem(LS_KEY) || '{}')) } catch (e) {}
}
function hasRunning() { return Object.values(state.jobs).some(j => j.status === 'running') }

function startTimer() {
  if (timer) return
  timer = setInterval(() => { hasRunning() ? reconcileAll() : stopTimer() }, 15000)
}
function stopTimer() { if (timer) { clearInterval(timer); timer = null } }

function handleMessage(msg) {
  state.notifications.unshift(msg)
  if (state.notifications.length > 50) state.notifications.pop()

  const meta = TYPE_META[msg.type] || {}
  ElNotification({
    title: msg.title || '通知',
    message: msg.body || '',
    type: meta.ok === false ? 'error' : (meta.ok === true ? 'success' : 'info'),
    duration: meta.ok === false ? 0 : 4500, // 失败常驻，需手动关闭
    position: 'bottom-right',
  })
  // 1) 直接按消息携带的 id 命中并清理对应任务（task/step 等即时完成场景）
  resolveByMessage(msg)
  // 2) 再做一次状态对账，兜底漏推 / id 不一致（如知识导入用 manualId 对 parseStatus）
  reconcileAll()
}

// 推送的 data 里若含某个进行中任务的 refId，则直接判定该任务完成
function resolveByMessage(msg) {
  const ids = Object.values(msg?.data || {}).map(String)
  if (!ids.length) return
  for (const job of Object.values(state.jobs)) {
    if (job.status === 'running' && ids.includes(String(job.refId))) {
      delete state.jobs[job.key]
      persist()
    }
  }
}

async function checkStatus(job) {
  if (job.kind === 'knowledge') {
    const res = await request({ url: `/weixiu/maintenance-manual/${job.refId}`, method: 'GET' })
    const ps = res?.data?.parseStatus
    if (ps === 'ready') return 'success'
    if (ps === 'failed') return 'failed'
    return 'running'
  }
  if (job.kind === 'task') {
    const res = await request({ url: `/weixiu/task/${job.refId}`, method: 'GET' })
    const st = res?.data?.status
    // 占位：非「生成中/待生成」即视为完成；接入任务模块时按真实枚举调整
    if (st && !['GENERATING', 'PENDING', 'generating', 'pending'].includes(st)) return 'success'
    return 'running'
  }
  return 'running'
}

async function reconcileAll() {
  const running = Object.values(state.jobs).filter(j => j.status === 'running')
  for (const job of running) {
    try {
      const r = await checkStatus(job)
      if (r === 'success' || r === 'failed') { delete state.jobs[job.key]; persist() }
    } catch (e) { /* 网络抖动忽略，下次再对账 */ }
  }
  if (!hasRunning()) stopTimer()
}

export const notifyStore = {
  state,

  /** 登录后调用：连接 WebSocket + 恢复未完成任务并对账 */
  init() {
    if (started) return
    started = true
    loadJobs()
    connectNotify({
      onMessage: handleMessage,
      onConnect: () => { state.connected = true; reconcileAll() },
      onDisconnect: () => { state.connected = false },
    })
    if (hasRunning()) startTimer()
    reconcileAll()
  },

  /** 退出登录时调用 */
  stop() { started = false; disconnectNotify(); stopTimer() },

  /** 通用：登记一个后台任务（触发会产生 WS 通知的接口后调用） */
  trackJob({ key, kind, refId, title }) {
    state.jobs[key] = { key, kind, refId: String(refId), title, status: 'running', startedAt: Date.now() }
    persist()
    startTimer()
  },

  /** 便捷：登记一个「知识导入」任务（按 manualId 对账 parseStatus） */
  trackKnowledgeImport(manualId, title) {
    this.trackJob({ key: 'kn:' + manualId, kind: 'knowledge', refId: manualId, title: title || '知识导入' })
  },

  /** 手动从托盘移除 */
  dismiss(key) { delete state.jobs[key]; persist() },

  reconcile: reconcileAll,
}
