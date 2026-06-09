import { reactive } from 'vue'
import { taskChatStream, getTaskChatHistory } from '@/api/maintenanceTask'
import { flushSseEvents, readSseEvents } from '@/utils/sse'

const tasks = reactive({})
const controllers = {}

function ensure(taskId) {
  const key = String(taskId)
  if (!tasks[key]) {
    tasks[key] = { messages: [], streaming: false, focusedStepId: null, loaded: false }
  }
  return tasks[key]
}

function normalizeHistoryMessage(message) {
  return {
    role: message.role,
    content: message.content || '',
    images: message.images || [],
    evidenceImages: message.evidenceImages || [],
  }
}

function applyStreamEvent(message, event) {
  const data = event?.data || {}

  if (event.event === 'token') {
    message.content += data.content || ''
  } else if (event.event === 'done') {
    message.evidenceImages = Array.isArray(data.evidenceImages) ? data.evidenceImages : []
  } else if (event.event === 'error') {
    message.content += `\n[错误] ${data.message || '生成失败'}`
  }
}

export const taskAssistantStore = {
  get(taskId) {
    return ensure(taskId)
  },

  setFocus(taskId, stepId) {
    ensure(taskId).focusedStepId = stepId
  },

  async loadHistory(taskId) {
    const state = ensure(taskId)
    if (state.loaded || state.streaming) return

    try {
      const res = await getTaskChatHistory(taskId)
      const list = (res && res.data) || []
      state.messages = list.map(normalizeHistoryMessage)
      state.loaded = true
    } catch {
      // History is optional; a failed load should not block the assistant.
    }
  },

  async send(taskId, { message, images = [] }) {
    const state = ensure(taskId)
    const text = (message || '').trim() || (images.length ? '请分析我上传的图片。' : '')
    if (state.streaming || !text) return

    state.messages.push({ role: 'user', content: text, images, evidenceImages: [] })
    const assistant = reactive({ role: 'assistant', content: '', images: [], evidenceImages: [] })
    state.messages.push(assistant)
    state.streaming = true

    const controller = new AbortController()
    controllers[taskId] = controller

    try {
      const response = await taskChatStream(
        taskId,
        { message: text, images, focusedStepId: state.focusedStepId },
        controller.signal,
      )
      if (!response.ok) throw new Error('HTTP ' + response.status)
      if (!response.body) throw new Error('Empty response body')

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        let done
        let value
        try {
          ;({ done, value } = await reader.read())
        } catch (error) {
          if (controller.signal.aborted) break
          throw error
        }
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        buffer = readSseEvents(buffer, (event) => applyStreamEvent(assistant, event))
      }

      flushSseEvents(buffer, (event) => applyStreamEvent(assistant, event))
      if (!assistant.content && !assistant.evidenceImages.length) assistant.content = '(无回复)'
    } catch (error) {
      if (error.name !== 'AbortError' && !assistant.content) {
        assistant.content = '抱歉，助手出错了，请稍后再试。'
      }
    } finally {
      state.streaming = false
      delete controllers[taskId]
    }
  },

  stop(taskId) {
    const controller = controllers[taskId]
    if (controller) controller.abort()
  },

  isStreaming(taskId) {
    return ensure(taskId).streaming
  },
}
