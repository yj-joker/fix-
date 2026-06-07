// 检修步骤助手 · 任务级对话 store
// 关键：流式输出在「模块作用域」里跑，不绑定组件生命周期。
// 这样切换页面 / 面板卸载时，fetch 仍在后台把 token 写进 reactive 状态，
// 回到任务详情页重新挂载时直接读 store，输出不中断（与 AI 对话页一致）。
import { reactive } from 'vue'
import { taskChatStream, getTaskChatHistory } from '@/api/maintenanceTask'

// taskId -> { messages:[{role,content,images}], streaming:bool, focusedStepId, loaded:bool }
const tasks = reactive({})
// taskId -> AbortController（非响应式）
const controllers = {}

function ensure(taskId) {
  const key = String(taskId)
  if (!tasks[key]) {
    tasks[key] = { messages: [], streaming: false, focusedStepId: null, loaded: false }
  }
  return tasks[key]
}

export const taskAssistantStore = {
  /** 取某任务的响应式状态（模板里直接用） */
  get(taskId) {
    return ensure(taskId)
  },

  /** 设置当前聚焦步骤（点步骤卡「问AI」或下拉切换时调用） */
  setFocus(taskId, stepId) {
    ensure(taskId).focusedStepId = stepId
  },

  /** 进面板时拉历史（仅一次；正在流式时不覆盖） */
  async loadHistory(taskId) {
    const s = ensure(taskId)
    if (s.loaded || s.streaming) return
    try {
      const res = await getTaskChatHistory(taskId)
      const list = (res && res.data) || []
      s.messages = list.map((m) => ({
        role: m.role,
        content: m.content || '',
        images: m.images || [],
      }))
      s.loaded = true
    } catch (e) {
      // 历史拉取失败不阻塞使用
    }
  },

  /** 发送一条消息并流式接收（在模块作用域运行，切页不中断） */
  async send(taskId, { message, images = [] }) {
    const s = ensure(taskId)
    const text = (message || '').trim()
    if (s.streaming || !text) return

    s.messages.push({ role: 'user', content: text, images })
    const ai = reactive({ role: 'assistant', content: '', images: [] })
    s.messages.push(ai)
    s.streaming = true

    const controller = new AbortController()
    controllers[taskId] = controller
    try {
      const resp = await taskChatStream(
        taskId,
        { message: text, images, focusedStepId: s.focusedStepId },
        controller.signal,
      )
      if (!resp.ok) throw new Error('HTTP ' + resp.status)
      const reader = resp.body.getReader()
      const decoder = new TextDecoder()
      let buf = ''
      while (true) {
        let done, value
        try {
          ;({ done, value } = await reader.read())
        } catch (e) {
          if (controller.signal.aborted) break
          throw e
        }
        if (done) break
        buf += decoder.decode(value, { stream: true })
        let idx
        while ((idx = buf.indexOf('\n\n')) !== -1) {
          const evt = buf.slice(0, idx)
          buf = buf.slice(idx + 2)
          const dataStr = evt
            .split('\n')
            .filter((l) => l.startsWith('data:'))
            .map((l) => l.slice(5).trim())
            .join('')
          if (!dataStr) continue
          try {
            const obj = JSON.parse(dataStr)
            if (obj.event === 'token') ai.content += obj.data?.content || ''
            else if (obj.event === 'error') ai.content += `\n[出错] ${obj.data?.message || ''}`
          } catch {
            /* 非 JSON 行忽略 */
          }
        }
      }
      if (!ai.content) ai.content = '(无回复)'
    } catch (err) {
      if (err.name !== 'AbortError' && !ai.content) {
        ai.content = '抱歉，助手出错了，请稍后再试。'
      }
    } finally {
      s.streaming = false
      delete controllers[taskId]
    }
  },

  /** 停止生成（中断当前流，已输出的内容保留） */
  stop(taskId) {
    const c = controllers[taskId]
    if (c) c.abort()
  },

  /** 当前任务是否正在流式输出 */
  isStreaming(taskId) {
    return ensure(taskId).streaming
  },
}
