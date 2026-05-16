<script setup>
import { ref, nextTick, onMounted } from 'vue'
import { ChatDotRound, Upload, Delete, Clock, Folder, Picture, Microphone, Close, Document } from '@element-plus/icons-vue'
import AIBottomInput from '@/components/AIBottomInput.vue'
import { chat } from '@/api/ai'

const isTyping = ref(false)
const showHistory = ref(false)

// 当前会话ID
const currentSessionId = ref(Date.now().toString())

// 对话历史列表
const sessions = ref([])

// 当前消息列表
const messages = ref([])

// 从 localStorage 加载历史会话
function loadSessions() {
  try {
    const stored = localStorage.getItem('user-ai-sessions')
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
    localStorage.setItem('user-ai-sessions', JSON.stringify(sessions.value))
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
  saveCurrentSession()
  // 用户消息发出后立即滚动到底部
  await nextTick()
  scrollToBottom()

  // 调用后端AI对话接口
  try {
    const response = await fetch('/api/weixiu/ai/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sessionId: currentSessionId.value,
        userMessage: text.trim(),
        images: files.filter(f => f.type === 'image').map(f => f.url)
      })
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }

    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let aiContent = ''

    const aiMessage = {
      id: Date.now() + 1,
      role: 'assistant',
      content: '',
      timestamp: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
    }
    messages.value.push(aiMessage)

    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      const chunk = decoder.decode(value, { stream: true })
      aiContent += chunk
      aiMessage.content = aiContent
      await nextTick()
      scrollToBottom()
    }
  } catch (error) {
    console.error('AI chat error:', error)
    const aiMessage = {
      id: Date.now() + 1,
      role: 'assistant',
      content: '抱歉，发生了错误，请稍后再试。',
      timestamp: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
    }
    messages.value.push(aiMessage)
  }

  isTyping.value = false
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
    content: '您好！我是AI助手，可以帮助您进行知识库检索、案例分析和作业指引等操作。有什么可以帮助您的吗？',
    timestamp: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
  }]
  showHistory.value = false
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
  if (container) {
    container.scrollTop = container.scrollHeight
  }
}

// 初始化
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
    <div class="messages-container">
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
          <div class="message-text" v-html="msg.content.replace(/\n/g, '<br>')"></div>
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

    <!-- Input -->
    <AIBottomInput @send="handleBottomInputSend" />
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

/* History Sidebar */
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

/* Header */
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

/* Messages */
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
  max-width: 100%;
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
  border-bottom-right-radius: 4px;
}

.ai-message .message-text {
  background: var(--plaza-bg-card);
  color: var(--plaza-text);
  border-bottom-left-radius: 4px;
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

/* Input Area */
.chat-input-area {
  padding: 16px 20px 24px;
  background: var(--plaza-bg);
  flex-shrink: 0;
}

/* Action buttons row - left aligned */
.input-actions-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  max-width: 900px;
  margin-left: auto;
  margin-right: auto;
}

.input-actions-left {
  display: flex;
  gap: 8px;
}

.input-actions-right {
  display: flex;
  gap: 8px;
}

/* Icon + Text buttons */
.action-btn-text {
  display: flex;
  align-items: center;
  gap: 6px;
  color: var(--plaza-text);
  font-weight: 600;
  font-size: 14px;
  padding: 8px 14px;
  border-radius: 8px;
  transition: all 0.2s ease;
}

.action-btn-text:hover {
  background: var(--plaza-accent-soft);
  color: var(--plaza-accent);
}

.action-btn-text .el-icon {
  font-size: 18px;
}

/* Icon only buttons */
.icon-only-btn {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  color: var(--plaza-text-muted);
  transition: all 0.2s ease;
}

.icon-only-btn:hover {
  color: var(--plaza-accent);
  background: var(--plaza-accent-soft);
}

.icon-only-btn .el-icon {
  font-size: 18px;
}

.icon-only-btn.voice-active {
  color: #f56c6c;
  background: rgba(245, 108, 108, 0.1);
}

.icon-only-btn.voice-active:hover {
  color: #f56c6c;
  background: rgba(245, 108, 108, 0.15);
}

.icon-only-btn.el-button--primary {
  background: var(--plaza-accent) !important;
  border-color: var(--plaza-accent) !important;
  color: #fff !important;
}

.icon-only-btn.el-button--primary:hover:not(:disabled) {
  background: var(--plaza-accent-hover) !important;
  border-color: var(--plaza-accent-hover) !important;
}

/* Input card */
.input-card {
  background: #fff;
  border: 1px solid var(--plaza-border);
  border-radius: 16px;
  padding: 12px 16px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
  max-width: 900px;
  margin: 0 auto;
}

.main-input :deep(.el-textarea__inner) {
  border: none;
  padding: 0;
  font-size: 15px;
  line-height: 1.5;
  resize: none;
  background: transparent;
}

.main-input :deep(.el-textarea__inner:focus) {
  border: none;
  box-shadow: none;
}

/* Uploaded Images */
.uploaded-images-preview {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin-top: 12px;
  max-width: 900px;
  margin-left: auto;
  margin-right: auto;
}

.uploaded-image-item {
  position: relative;
  width: 64px;
  height: 64px;
  border-radius: 8px;
  overflow: hidden;
  border: 2px solid var(--plaza-border);
}

.uploaded-image-item img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.uploaded-image-item .remove-btn {
  position: absolute;
  top: 2px;
  right: 2px;
  width: 20px;
  height: 20px;
  background: rgba(0, 0, 0, 0.6);
  border-radius: 50%;
  color: #fff;
  font-size: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  opacity: 0;
  transition: opacity 0.2s;
}

.uploaded-image-item:hover .remove-btn {
  opacity: 1;
}

/* Uploaded Documents */
.uploaded-documents-preview {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin-top: 12px;
  max-width: 900px;
  margin-left: auto;
  margin-right: auto;
}

.uploaded-document-item {
  position: relative;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: #f5f5f5;
  border-radius: 8px;
  border: 1px solid var(--plaza-border);
}

.uploaded-document-item .doc-icon {
  font-size: 20px;
  color: var(--plaza-accent);
}

.uploaded-document-item .doc-name {
  font-size: 13px;
  color: var(--plaza-text);
  max-width: 120px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.uploaded-document-item .remove-btn {
  width: 20px;
  height: 20px;
  background: rgba(0, 0, 0, 0.6);
  border-radius: 50%;
  color: #fff;
  font-size: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  opacity: 0;
  transition: opacity 0.2s;
}

.uploaded-document-item:hover .remove-btn {
  opacity: 1;
}

/* Recording Indicator */
.recording-indicator {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin-top: 12px;
  color: #f56c6c;
  font-weight: 600;
  font-size: 14px;
}

.recording-dot {
  width: 8px;
  height: 8px;
  background: #f56c6c;
  border-radius: 50%;
  animation: pulse-recording 1s infinite;
}

@keyframes pulse-recording {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.5; transform: scale(0.8); }
}

/* Input Hint */
.input-hint {
  font-size: 12px;
  color: var(--plaza-text-muted);
  margin-top: 8px;
  text-align: center;
}

/* Uploaded Images Preview */
.uploaded-images-preview {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 12px;
  padding: 0 4px;
}

.uploaded-image-item {
  position: relative;
  width: 64px;
  height: 64px;
  border-radius: 8px;
  overflow: hidden;
  border: 2px solid var(--plaza-border);
}

.uploaded-image-item img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.uploaded-image-item .remove-btn {
  position: absolute;
  top: 2px;
  right: 2px;
  width: 20px;
  height: 20px;
  background: rgba(0, 0, 0, 0.6);
  border-radius: 50%;
  color: #fff;
  font-size: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  opacity: 0;
  transition: opacity 0.2s;
}

.uploaded-image-item:hover .remove-btn {
  opacity: 1;
}

/* Message Images */
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

/* Input Action Buttons */
.input-action-btn {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  color: var(--plaza-text-muted);
  flex-shrink: 0;
}

.input-action-btn:hover {
  color: var(--plaza-accent);
  background: var(--plaza-accent-soft);
}

.voice-btn.voice-active {
  color: #fff;
  background: #f56c6c;
}

.voice-btn.voice-active:hover {
  background: #f78989;
}

/* Recording Hint */
.recording-hint {
  color: #f56c6c;
  font-weight: 500;
  animation: pulse 1.5s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}
</style>