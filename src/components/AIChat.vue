<script setup>
import { ref, nextTick, onMounted } from 'vue'
import { ChatDotRound, Delete, Clock, Folder } from '@element-plus/icons-vue'
import AIBottomInput from '@/components/AIBottomInput.vue'

const props = defineProps({
  storageKey: {
    type: String,
    default: 'ai-sessions'
  },
  welcomeMessage: {
    type: String,
    default: '您好！我是AI助手，可以帮助您进行知识库检索、案例分析和作业指引等操作。有什么可以帮助您的吗？'
  }
})

const isTyping = ref(false)
const isGenerating = ref(false)   // 整个生成过程（用于显示「停止」按钮）
const abortController = ref(null) // 当前流式请求的中断器（保留，停止时不再主动 abort）
const skipAnimation = ref(false)  // 点「停止」后跳过打字机，直接把剩余内容一次性展示出来
function stopGeneration() {
  // 不中断后端连接（避免半截 SSE 触发后端异常）：仅跳过逐字动画，立即显示全部已生成内容
  skipAnimation.value = true
  isGenerating.value = false
}
const showHistory = ref(false)
const userScrolledUp = ref(false)
const userHasScrolledUp = ref(false)

// 当前会话ID
const currentSessionId = ref(Date.now().toString())

// 对话历史列表
const sessions = ref([])

// 当前消息列表
const messages = ref([])

// 从 localStorage 加载历史会话
function loadSessions() {
  try {
    const stored = localStorage.getItem(props.storageKey)
    if (stored) {
      sessions.value = JSON.parse(stored)
    }
  } catch (e) {
    console.warn('Failed to load sessions:', e)
  }
}

// 保存会话到 localStorage
function saveSessions() {
  try {
    localStorage.setItem(props.storageKey, JSON.stringify(sessions.value))
  } catch (e) {
    console.warn('Failed to save sessions:', e)
  }
}

// 加载指定会话
function loadSession(sessionId) {
  const session = sessions.value.find(s => s.id === sessionId)
  if (session) {
    messages.value = session.messages
    currentSessionId.value = sessionId
    showHistory.value = false
    userHasScrolledUp.value = false
    nextTick(() => scrollToBottom())
  }
}

// 保存当前会话
function saveCurrentSession() {
  const existing = sessions.value.find(s => s.id === currentSessionId.value)
  const sessionData = {
    id: currentSessionId.value,
    messages: messages.value,
    title: messages.value.length > 1
      ? messages.value[1]?.content?.substring(0, 30) || '新对话'
      : '新对话',
    updatedAt: Date.now()
  }

  if (existing) {
    Object.assign(existing, sessionData)
  } else {
    sessions.value.unshift(sessionData)
  }
  saveSessions()
}

// 处理 AIBottomInput 发送的消息
async function handleBottomInputSend(payload) {
  const { text, files } = payload
  if (!text.trim() && files.length === 0) return

  const userMessage = {
    id: Date.now(),
    role: 'user',
    content: text.trim(),
    images: files.filter(f => f.type === 'image').map(f => f.url),
    timestamp: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
  }
  messages.value.push(userMessage)
  isTyping.value = true
  isGenerating.value = true
  skipAnimation.value = false
  const controller = new AbortController()
  abortController.value = controller
  saveCurrentSession()
  await nextTick()
  scrollToBottom()

  try {
    const response = await fetch('/api/weixiu/ai/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      signal: controller.signal,
      body: JSON.stringify({
        session_id: currentSessionId.value,
        message: text.trim(),
        images: files.filter(f => f.type === 'image').map(f => f.url).filter(url => url && !url.startsWith('blob:') && !url.startsWith('data:'))
      })
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }

    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let aiContent = ''
    let displayContent = ''
    let jsonBuffer = ''
    let streamStarted = false

    const aiMessage = {
      id: Date.now() + 1,
      role: 'assistant',
      content: '',
      timestamp: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
    }

    // 打字机定时器：每 30ms 将 displayContent 逐字追赶 aiContent
    const typewriterTimer = setInterval(() => {
      // 点了「停止」→ 跳过逐字效果，把已收到的内容一次性全部显示
      if (skipAnimation.value) {
        if (displayContent.length !== aiContent.length) {
          displayContent = aiContent
          const msgIndex = messages.value.length - 1
          if (msgIndex >= 0) {
            messages.value[msgIndex].content = displayContent.replace(/\n/g, '<br>')
          }
          scrollToBottom()
        }
        return
      }
      if (displayContent.length < aiContent.length) {
        displayContent = aiContent.substring(0, displayContent.length + 2)
        const msgIndex = messages.value.length - 1
        if (msgIndex >= 0) {
          messages.value[msgIndex].content = displayContent.replace(/\n/g, '<br>')
        }
        scrollToBottom()
      }
    }, 30)

    const stopTypewriter = () => {
      clearInterval(typewriterTimer)
      // 确保最终内容完整
      if (streamStarted) {
        const msgIndex = messages.value.length - 1
        if (msgIndex >= 0) {
          messages.value[msgIndex].content = aiContent.replace(/\n/g, '<br>')
        }
      }
    }

    while (true) {
        let done, value
        try {
          ({ done, value } = await reader.read())
        } catch (e) {
          // 用户点击「停止」→ abort 会让 read() 抛出，平滑跳出循环，保留已输出内容
          if (controller.signal.aborted) break
          throw e
        }
        if (done) break
        const chunk = decoder.decode(value, { stream: true })
        jsonBuffer += chunk

        // 逐个处理 SSE 事件，事件间加延迟形成分段输出
        let boundaryIdx
        while ((boundaryIdx = jsonBuffer.indexOf('\n\n')) !== -1) {
          const event = jsonBuffer.slice(0, boundaryIdx)
          jsonBuffer = jsonBuffer.slice(boundaryIdx + 2)

          const lines = event.split('\n')
          const dataLines = lines
            .filter(l => l.startsWith('data:'))
            .map(l => l.slice(5))
          if (dataLines.length > 0) {
            aiContent += dataLines.join('\n')
          }

          if (!streamStarted && aiContent.trim()) {
            messages.value.push(aiMessage)
            isTyping.value = false
            streamStarted = true
          }

          scrollToBottom()
          // 不再人为延迟读取：让前端展示进度贴近 Java 实际接收进度，
          // 这样"停止"时后端保存的 partial 与用户所见基本一致（节流已移到 Python 端）
        }
      }

      // 处理流结束后 jsonBuffer 中剩余的数据
      if (jsonBuffer) {
        const lines = jsonBuffer.split('\n')
        const dataLines = lines
          .filter(l => l.startsWith('data:'))
          .map(l => l.slice(5))
        if (dataLines.length > 0) {
          aiContent += dataLines.join('\n')
        }

        if (!streamStarted && aiContent.trim()) {
          messages.value.push(aiMessage)
          isTyping.value = false
          streamStarted = true
        }
      }

      if (!streamStarted) {
        aiMessage.content = '(空响应)'
        messages.value.push(aiMessage)
        isTyping.value = false
      }

      // 等待打字机效果完成（displayContent 追上 aiContent）
      await new Promise(resolve => {
        const check = setInterval(() => {
          if (displayContent.length >= aiContent.length) {
            clearInterval(check)
            resolve()
          }
        }, 30)
      })
      stopTypewriter()
    } catch (error) {
      // 在流真正开始前就被中断（abort 期间 fetch 直接抛 AbortError）
      if (error.name === 'AbortError') {
        isTyping.value = false
        isGenerating.value = false
        abortController.value = null
        saveCurrentSession()
        return
      }
      stopTypewriter()
      console.error('AI chat error:', error)
      const errorContent = '抱歉，发生了错误，请稍后再试。'

      if (streamStarted) {
        const msgIndex = messages.value.length - 1
        if (msgIndex >= 0 && messages.value[msgIndex].role === 'assistant') {
          messages.value[msgIndex].content =
            (aiContent || messages.value[msgIndex].content) +
            '<br><br>' + errorContent
        }
      } else {
        messages.value.push({
          id: Date.now() + 1,
          role: 'assistant',
          content: errorContent,
          timestamp: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
        })
        isTyping.value = false
      }
    }

  isTyping.value = false
  isGenerating.value = false
  abortController.value = null
  saveCurrentSession()
  await nextTick()
  scrollToBottom()
}

// 创建新会话
function createNewSession() {
  currentSessionId.value = Date.now().toString()
  messages.value = [{
    id: Date.now(),
    role: 'assistant',
    content: props.welcomeMessage,
    timestamp: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
  }]
  showHistory.value = false
  userHasScrolledUp.value = false
}

// 删除会话
function deleteSession(sessionId, event) {
  event.stopPropagation()
  sessions.value = sessions.value.filter(s => s.id !== sessionId)
  saveSessions()
  if (currentSessionId.value === sessionId) {
    createNewSession()
  }
}

// 格式化时间显示
function formatTime(timestamp) {
  const date = new Date(timestamp)
  const now = new Date()
  const diff = now - date

  if (diff < 60000) return '刚刚'
  if (diff < 3600000) return `${Math.floor(diff / 60000)} 分钟前`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)} 小时前`
  if (diff < 604800000) return `${Math.floor(diff / 86400000)} 天前`
  return date.toLocaleDateString('zh-CN')
}

function clearChat() {
  createNewSession()
}

function scrollToBottom() {
  const container = document.querySelector('.messages-container')
  if (container && !userHasScrolledUp.value) {
    container.scrollTop = container.scrollHeight
  }
}

function handleScroll(e) {
  const container = e.target
  const isAtBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 50
  userScrolledUp.value = !isAtBottom
  if (userScrolledUp.value) {
    userHasScrolledUp.value = true
  }
}

function scrollToLatest() {
  userScrolledUp.value = false
  userHasScrolledUp.value = false
  nextTick(() => scrollToBottom())
}

onMounted(() => {
  loadSessions()
  if (sessions.value.length > 0) {
    const lastSession = sessions.value[0]
    messages.value = lastSession.messages
    currentSessionId.value = lastSession.id
  } else {
    createNewSession()
  }
})
</script>

<template>
  <div class="ai-chat-page">
    <!-- History Sidebar -->
    <div class="history-sidebar" :class="{ 'show': showHistory }">
      <div class="history-header">
        <span class="history-title">
          <el-icon><Clock /></el-icon>
          历史记录
        </span>
        <el-button text @click="createNewSession" class="new-chat-btn">
          <el-icon><Folder /></el-icon>
          新对话
        </el-button>
      </div>
      <div class="history-list">
        <div
          v-for="session in sessions"
          :key="session.id"
          class="history-item"
          :class="{ 'active': session.id === currentSessionId }"
          @click="loadSession(session.id)"
        >
          <div class="history-item-content">
            <div class="history-item-title">{{ session.title }}</div>
            <div class="history-item-time">{{ formatTime(session.updatedAt) }}</div>
          </div>
          <el-button
            text
            size="small"
            class="delete-btn"
            @click="deleteSession(session.id, $event)"
          >
            <el-icon><Delete /></el-icon>
          </el-button>
        </div>
        <div v-if="sessions.length === 0" class="history-empty">
          暂无历史记录
        </div>
      </div>
    </div>

    <!-- Header -->
    <div class="chat-header">
      <div class="header-content">
        <div class="header-left">
          <div class="header-title">
            <el-icon class="title-icon"><ChatDotRound /></el-icon>
            <span>AI 智能助手</span>
          </div>
        </div>
        <div class="header-actions">
          <el-button text @click="showHistory = !showHistory" title="历史记录">
            <el-icon><Clock /></el-icon>
          </el-button>
          <el-button text @click="clearChat" title="清空对话">
            <el-icon><Delete /></el-icon>
          </el-button>
        </div>
      </div>
    </div>

    <!-- Messages -->
    <div class="messages-container" @scroll="handleScroll">
      <div
        v-for="msg in messages"
        :key="msg.id"
        class="message-item"
        :class="{ 'user-message': msg.role === 'user', 'ai-message': msg.role === 'assistant' }"
      >
        <div class="message-avatar">
          <div v-if="msg.role === 'user'" class="avatar user-avatar">U</div>
          <div v-else class="avatar ai-avatar">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
              <path d="M22.7 19l-9.1-9.1c.9-2.3.4-5-1.5-6.9-2-2-5-2.4-7.4-1.3L9 6 6 9 1.6 4.7C.4 7.1.9 10.1 2.9 12.1c1.9 1.9 4.6 2.4 6.9 1.5l9.1 9.1c.4.4 1 .4 1.4 0l2.3-2.3c.5-.4.5-1.1.1-1.4z"/>
            </svg>
          </div>
        </div>
        <div class="message-content">
          <div v-if="msg.images && msg.images.length > 0" class="message-images">
            <div v-for="(img, idx) in msg.images" :key="idx" class="message-image-item">
              <img :src="img" alt="上传图片" />
            </div>
          </div>
          <div v-if="msg.content && msg.content.trim()" class="message-text" v-html="msg.content.replace(/\n/g, '<br>')"></div>
          <div class="message-time">{{ msg.timestamp }}</div>
        </div>
      </div>

      <!-- Typing indicator -->
      <div v-if="isTyping" class="message-item ai-message">
        <div class="message-avatar">
          <div class="avatar ai-avatar">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
              <path d="M22.7 19l-9.1-9.1c.9-2.3.4-5-1.5-6.9-2-2-5-2.4-7.4-1.3L9 6 6 9 1.6 4.7C.4 7.1.9 10.1 2.9 12.1c1.9 1.9 4.6 2.4 6.9 1.5l9.1 9.1c.4.4 1 .4 1.4 0l2.3-2.3c.5-.4.5-1.1.1-1.4z"/>
            </svg>
          </div>
        </div>
        <div class="message-content">
          <div class="typing-indicator">
            <span></span>
            <span></span>
            <span></span>
          </div>
        </div>
      </div>
    </div>

    <!-- Scroll to bottom button -->
    <transition name="fade">
      <div v-if="userScrolledUp" class="scroll-to-bottom" @click="scrollToLatest">
        <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
          <path d="M16.59 8.59L12 13.17 7.41 8.59 6 10l6 6 6-6z"/>
        </svg>
        <span>回到最新</span>
      </div>
    </transition>

    <!-- Input -->
    <AIBottomInput :generating="isGenerating" @send="handleBottomInputSend" @stop="stopGeneration" />
  </div>
</template>

<style scoped>
.ai-chat-page {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  background: var(--plaza-bg);
  position: relative;
  overflow: hidden;
}

.history-sidebar {
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 280px;
  background: var(--plaza-bg-card);
  border-right: 1px solid var(--plaza-border);
  z-index: 100;
  transform: translateX(-100%);
  transition: transform 0.3s ease;
  display: flex;
  flex-direction: column;
  padding: 0 16px;
  box-sizing: border-box;
}

.history-sidebar.show {
  transform: translateX(0);
}

.history-header {
  padding: 16px;
  border-bottom: 1px solid var(--plaza-border);
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.history-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 15px;
  font-weight: 600;
  color: var(--plaza-text);
}

.new-chat-btn {
  font-size: 13px;
}

.history-list {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
}

.history-item {
  display: flex;
  align-items: center;
  padding: 12px;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.2s;
  margin-bottom: 4px;
}

.history-item:hover {
  background: var(--plaza-accent-soft);
}

.history-item.active {
  background: var(--plaza-accent-soft);
}

.history-item-content {
  flex: 1;
  min-width: 0;
}

.history-item-title {
  font-size: 14px;
  color: var(--plaza-text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.history-item-time {
  font-size: 12px;
  color: var(--plaza-text-muted);
  margin-top: 4px;
}

.delete-btn {
  opacity: 0;
  transition: opacity 0.2s;
  color: var(--plaza-text-muted);
}

.history-item:hover .delete-btn {
  opacity: 1;
}

.delete-btn:hover {
  color: #f56c6c;
}

.history-empty {
  text-align: center;
  color: var(--plaza-text-muted);
  font-size: 14px;
  padding: 40px 0;
}

.chat-header {
  padding: 0 24px 16px;
  background: var(--plaza-bg-card);
  border-bottom: 1px solid var(--plaza-border);
  flex-shrink: 0;
  box-sizing: border-box;
  display: flex;
  align-items: flex-start;
  width: 100%;
}

.header-content {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0;
  box-sizing: border-box;
  min-height: 40px;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.header-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 18px;
  font-weight: 600;
  color: var(--plaza-text);
}

.title-icon {
  color: var(--plaza-accent);
  font-size: 22px;
}

.header-actions {
  display: flex;
  gap: 8px;
}

.messages-container {
  flex: 1;
  overflow-y: auto;
  padding: 16px 24px 32px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.message-item {
  display: flex;
  gap: 12px;
  max-width: 80%;
}

.message-item.user-message {
  flex-direction: row-reverse;
  align-self: flex-end;
}

.message-item.ai-message {
  align-self: flex-start;
}

.message-avatar {
  flex-shrink: 0;
}

.avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: 600;
}

.user-avatar {
  background: var(--plaza-accent);
  color: #fff;
}

.ai-avatar {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: #fff;
}

.message-content {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
}

.user-message .message-content {
  align-items: flex-end;
}

.message-text {
  padding: 12px 16px;
  border-radius: 12px;
  line-height: 1.6;
  font-size: 15px;
  white-space: pre-wrap;
  word-break: break-word;
}

.user-message .message-text {
  background: var(--plaza-accent);
  color: #fff;
}

.ai-message .message-text {
  background: var(--plaza-bg-card);
  color: var(--plaza-text);
}

.message-time {
  font-size: 11px;
  color: var(--plaza-text-muted);
  margin-top: 4px;
  padding: 0 4px;
}

.user-message .message-time {
  text-align: right;
}

.typing-indicator {
  display: flex;
  gap: 4px;
  padding: 12px 16px;
  background: var(--plaza-bg-card);
  border-radius: 12px;
  border-bottom-left-radius: 4px;
  width: fit-content;
}

.typing-indicator span {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--plaza-text-muted);
  animation: typing 1.4s infinite;
}

.typing-indicator span:nth-child(2) {
  animation-delay: 0.2s;
}

.typing-indicator span:nth-child(3) {
  animation-delay: 0.4s;
}

@keyframes typing {
  0%, 60%, 100% {
    opacity: 0.3;
    transform: scale(0.8);
  }
  30% {
    opacity: 1;
    transform: scale(1);
  }
}

.message-images {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 8px;
}

.message-image-item {
  max-width: 200px;
  border-radius: 8px;
  overflow: hidden;
}

.message-image-item img {
  width: 100%;
  height: auto;
  display: block;
}

.scroll-to-bottom {
  position: absolute;
  bottom: 80px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 8px 16px;
  background: var(--plaza-bg-card);
  border: 1px solid var(--plaza-border);
  border-radius: 20px;
  cursor: pointer;
  font-size: 13px;
  color: var(--plaza-text);
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.15);
  z-index: 10;
}

.scroll-to-bottom:hover {
  background: var(--plaza-accent-soft);
}

.scroll-to-bottom svg {
  transform: rotate(180deg);
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>