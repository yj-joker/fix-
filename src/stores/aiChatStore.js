import { reactive } from 'vue'
import { aiChatStream } from '@/api/aiChat'
import { flushSseEvents, readSseEvents } from '@/utils/sse'

const MAX_SESSIONS = 20

const states = reactive({})
const controllers = {}

function nowTime() {
  return new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
}

function createWelcomeMessage(content) {
  return {
    id: `${Date.now()}-welcome`,
    role: 'assistant',
    content,
    images: [],
    evidenceImages: [],
    timestamp: nowTime(),
    status: 'done',
  }
}

function createSession(welcomeMessage) {
  return {
    id: Date.now().toString(),
    title: '新对话',
    updatedAt: Date.now(),
    messages: [createWelcomeMessage(welcomeMessage)],
  }
}

function safeParse(value, fallback) {
  try {
    return JSON.parse(value)
  } catch {
    return fallback
  }
}

function ensure(storageKey, welcomeMessage) {
  if (!states[storageKey]) {
    states[storageKey] = {
      storageKey,
      welcomeMessage,
      sessions: [],
      currentSessionId: '',
      streaming: false,
      loading: false,
      loaded: false,
    }
  }
  return states[storageKey]
}

function currentSession(state) {
  return state.sessions.find((session) => session.id === state.currentSessionId)
}

function persist(state) {
  const data = state.sessions.slice(0, MAX_SESSIONS)
  state.sessions = data
  localStorage.setItem(state.storageKey, JSON.stringify(data))
}

function touchSession(state, session) {
  session.updatedAt = Date.now()
  const firstUser = session.messages.find((message) => message.role === 'user')
  session.title = firstUser?.content?.slice(0, 32) || '新对话'
  state.sessions = [session, ...state.sessions.filter((item) => item.id !== session.id)]
  persist(state)
}

function normalizeImages(files) {
  return (files || [])
    .filter((file) => file.type === 'image' && file.status !== 'error')
    .map((file) => file.url)
    .filter((url) => url && !url.startsWith('blob:') && !url.startsWith('data:'))
}

export const aiChatStore = {
  get(storageKey, welcomeMessage) {
    return ensure(storageKey, welcomeMessage)
  },

  load(storageKey, welcomeMessage) {
    const state = ensure(storageKey, welcomeMessage)
    if (state.loaded) return state

    state.loading = true
    const stored = safeParse(localStorage.getItem(storageKey) || '[]', [])
    state.sessions = Array.isArray(stored) && stored.length ? stored : [createSession(welcomeMessage)]
    state.currentSessionId = state.sessions[0].id
    state.loaded = true
    state.loading = false
    persist(state)
    return state
  },

  newSession(storageKey) {
    const state = ensure(storageKey)
    const session = createSession(state.welcomeMessage)
    state.sessions = [session, ...state.sessions]
    state.currentSessionId = session.id
    persist(state)
  },

  selectSession(storageKey, sessionId) {
    const state = ensure(storageKey)
    if (state.sessions.some((session) => session.id === sessionId)) {
      state.currentSessionId = sessionId
    }
  },

  deleteSession(storageKey, sessionId) {
    const state = ensure(storageKey)
    state.sessions = state.sessions.filter((session) => session.id !== sessionId)
    if (!state.sessions.length) state.sessions.push(createSession(state.welcomeMessage))
    if (state.currentSessionId === sessionId) state.currentSessionId = state.sessions[0].id
    persist(state)
  },

  clearCurrent(storageKey) {
    const state = ensure(storageKey)
    const session = currentSession(state)
    if (!session) return
    session.messages = [createWelcomeMessage(state.welcomeMessage)]
    touchSession(state, session)
  },

  async send(storageKey, { text, files = [], thinking = false }) {
    const state = ensure(storageKey)
    const session = currentSession(state)
    const content = (text || '').trim()
    if (!session || state.streaming || (!content && !files.length)) return

    const visibleImages = (files || []).filter((file) => file.type === 'image').map((file) => file.url).filter(Boolean)
    const requestImages = normalizeImages(files)
    session.messages.push({
      id: `${Date.now()}-user`,
      role: 'user',
      content,
      images: visibleImages,
      evidenceImages: [],
      timestamp: nowTime(),
      status: 'done',
    })

    const assistant = reactive({
      id: `${Date.now()}-assistant`,
      role: 'assistant',
      content: '',
      images: [],
      evidenceImages: [],
      timestamp: nowTime(),
      status: 'streaming',
    })
    session.messages.push(assistant)
    state.streaming = true
    touchSession(state, session)

    const controller = new AbortController()
    controllers[storageKey] = controller
    let fullContent = ''
    let typeTimer = null

    const startTypewriter = () => {
      if (typeTimer) return
      typeTimer = setInterval(() => {
        if (assistant.content.length < fullContent.length) {
          assistant.content = fullContent.slice(0, assistant.content.length + 2)
        }
        if (assistant.content.length >= fullContent.length && typeTimer) {
          clearInterval(typeTimer)
          typeTimer = null
        }
      }, 24)
    }

    const waitForTypewriter = () => new Promise((resolve) => {
      const check = setInterval(() => {
        if (assistant.content.length >= fullContent.length) {
          clearInterval(check)
          resolve()
        }
      }, 24)
    })

    try {
      const response = await aiChatStream({
        sessionId: session.backendSessionId || session.id,
        message: content,
        images: requestImages,
        thinking,
      }, controller.signal)

      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      if (!response.body) throw new Error('响应体为空')

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      const handleEvent = (event) => {
        const data = event?.data || {}

        if (event.event === 'token') {
          fullContent += data.content || ''
          startTypewriter()
          return
        }

        if (event.event === 'done') {
          assistant.evidenceImages = Array.isArray(data.evidenceImages) ? data.evidenceImages : []
          return
        }

        if (event.event === 'session_id') {
          if (data.session_id) {
            session.backendSessionId = data.session_id
          }
          return
        }

        if (event.event === 'error') {
          const message = data.message || '生成失败'
          fullContent += fullContent ? `\n\n[错误] ${message}` : `[错误] ${message}`
          assistant.status = 'error'
          startTypewriter()
        }
      }

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        buffer = readSseEvents(buffer, handleEvent)
      }
      flushSseEvents(buffer, handleEvent)

      if (!fullContent.trim() && !assistant.evidenceImages.length) fullContent = '(空响应)'
      startTypewriter()
      await waitForTypewriter()
      assistant.content = fullContent
      if (assistant.status !== 'error') assistant.status = 'done'
    } catch (error) {
      if (error.name === 'AbortError') {
        if (typeTimer) {
          clearInterval(typeTimer)
          typeTimer = null
        }
        assistant.content = fullContent || assistant.content
        assistant.status = 'stopped'
        if (!assistant.content.trim()) assistant.content = '已停止生成。'
      } else {
        if (typeTimer) {
          clearInterval(typeTimer)
          typeTimer = null
        }
        assistant.status = 'error'
        assistant.content = fullContent || assistant.content
        assistant.content = assistant.content
          ? `${assistant.content}\n\n抱歉，发生了错误，请稍后再试。`
          : '抱歉，发生了错误，请稍后再试。'
      }
    } finally {
      if (typeTimer) clearInterval(typeTimer)
      state.streaming = false
      delete controllers[storageKey]
      touchSession(state, session)
    }
  },

  stop(storageKey) {
    const controller = controllers[storageKey]
    if (controller) controller.abort()
  },
}
