<script setup>
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import {
  ChatDotRound,
  Delete,
  FolderOpened,
  Plus,
  Refresh,
} from '@element-plus/icons-vue'
import AIBottomInput from '@/components/AIBottomInput.vue'
import ChatMessage from '@/components/ai/ChatMessage.vue'
import SessionSidebar from '@/components/ai/SessionSidebar.vue'
import { aiChatStore } from '@/stores/aiChatStore'

const props = defineProps({
  storageKey: {
    type: String,
    default: 'ai-sessions',
  },
  welcomeMessage: {
    type: String,
    default: '您好！我是 AI 助手，可以帮助您进行知识库检索、案例分析和作业指引等操作。有什么可以帮助您的吗？',
  },
})

const route = useRoute()
const state = aiChatStore.get(props.storageKey, props.welcomeMessage)
const showHistory = ref(false)
const bodyRef = ref(null)
const userScrolledUp = ref(false)

const userInitial = computed(() => {
  const fallback = route.path.startsWith('/admin') ? 'A' : 'U'
  try {
    const userInfo = JSON.parse(localStorage.getItem('userInfo') || '{}')
    return userInfo.name ? userInfo.name[0] : fallback
  } catch {
    return fallback
  }
})

const currentSession = computed(() =>
  state.sessions.find((session) => session.id === state.currentSessionId),
)

const messages = computed(() => currentSession.value?.messages || [])

const quickPrompts = [
  '设备运行时出现异常振动，应该优先排查哪些部位？',
  '根据故障现象帮我检索相关维修案例。',
  '请把当前问题整理成检修步骤和注意事项。',
  '某部件反复过热，可能原因和验证方法是什么？',
]

function scrollToBottom(force = false) {
  nextTick(() => {
    const el = bodyRef.value
    if (!el) return
    if (force || !userScrolledUp.value) {
      el.scrollTop = el.scrollHeight
      userScrolledUp.value = false
    }
  })
}

function handleScroll() {
  const el = bodyRef.value
  if (!el) return
  userScrolledUp.value = el.scrollHeight - el.scrollTop - el.clientHeight > 80
}

function handleNewSession() {
  aiChatStore.newSession(props.storageKey)
  showHistory.value = false
  scrollToBottom(true)
}

function handleSelectSession(sessionId) {
  aiChatStore.selectSession(props.storageKey, sessionId)
  showHistory.value = false
  scrollToBottom(true)
}

function handleDeleteSession(sessionId) {
  aiChatStore.deleteSession(props.storageKey, sessionId)
  scrollToBottom(true)
}

function handleClear() {
  aiChatStore.clearCurrent(props.storageKey)
  scrollToBottom(true)
}

function handleSend(payload) {
  aiChatStore.send(props.storageKey, payload)
  scrollToBottom(true)
}

function handleStop() {
  aiChatStore.stop(props.storageKey)
}

function sendQuickPrompt(prompt) {
  handleSend({ text: prompt, files: [], thinking: false })
}

watch(
  () => messages.value.map((message) => `${message.id}:${message.content}:${message.status}`).join('|'),
  () => scrollToBottom(),
)

onMounted(() => {
  aiChatStore.load(props.storageKey, props.welcomeMessage)
  scrollToBottom(true)
})
</script>

<template>
  <section class="ai-chat-page">
    <SessionSidebar
      :open="showHistory"
      :sessions="state.sessions"
      :current-session-id="state.currentSessionId"
      @new="handleNewSession"
      @select="handleSelectSession"
      @delete="handleDeleteSession"
    />

    <header class="chat-header">
      <div class="title-block">
        <div class="title-mark">
          <el-icon><ChatDotRound /></el-icon>
        </div>
        <div>
          <h1>AI 智能助手</h1>
          <p>面向设备检修的知识检索、故障分析与作业建议</p>
        </div>
      </div>

      <div class="header-actions">
        <button type="button" title="历史记录" @click="showHistory = !showHistory">
          <el-icon><FolderOpened /></el-icon>
        </button>
        <button type="button" title="新对话" @click="handleNewSession">
          <el-icon><Plus /></el-icon>
        </button>
        <button type="button" title="清空当前对话" @click="handleClear">
          <el-icon><Delete /></el-icon>
        </button>
      </div>
    </header>

    <main ref="bodyRef" class="messages-container" @scroll="handleScroll">
      <div v-if="messages.length <= 1" class="empty-state">
        <div class="empty-mark">
          <el-icon><ChatDotRound /></el-icon>
        </div>
        <h2>今天要解决什么检修问题？</h2>
        <p>可以描述设备、故障现象、现场图片或已执行步骤，我会尽量把建议拆成可执行的排查路径。</p>
        <div class="prompt-grid">
          <button
            v-for="prompt in quickPrompts"
            :key="prompt"
            type="button"
            :disabled="state.streaming"
            @click="sendQuickPrompt(prompt)"
          >
            {{ prompt }}
          </button>
        </div>
      </div>

      <ChatMessage
        v-for="message in messages"
        :key="message.id"
        :message="message"
        :user-initial="userInitial"
      />
    </main>

    <transition name="fade">
      <button v-if="userScrolledUp" type="button" class="latest-btn" @click="scrollToBottom(true)">
        <el-icon><Refresh /></el-icon>
        <span>回到最新</span>
      </button>
    </transition>

    <AIBottomInput
      :generating="state.streaming"
      @send="handleSend"
      @stop="handleStop"
    />
  </section>
</template>

<style scoped>
.ai-chat-page {
  position: relative;
  width: 100%;
  height: 100%;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  padding-top: 40px;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.72), rgba(246, 248, 251, 0.96)),
    var(--plaza-bg);
}

.chat-header {
  flex-shrink: 0;
  display: grid;
  grid-template-columns: minmax(280px, 1fr) auto;
  align-items: center;
  gap: 18px;
  padding: 18px 24px;
  border-bottom: 1px solid var(--plaza-border);
  background: rgba(255, 255, 255, 0.9);
}

.title-block {
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 12px;
}

.title-mark {
  width: 42px;
  height: 42px;
  flex: 0 0 42px;
  border-radius: 10px;
  display: grid;
  place-items: center;
  background: #172033;
  color: #fff;
  box-shadow: var(--plaza-shadow-organic);
}

h1 {
  color: var(--plaza-heading);
  font-size: 18px;
  font-weight: 800;
  line-height: 1.2;
}

.title-block p {
  margin-top: 3px;
  color: var(--plaza-text-muted);
  font-size: 13px;
}

.header-actions {
  display: flex;
  gap: 8px;
}

.header-actions button {
  width: 34px;
  height: 34px;
  border: 1px solid var(--plaza-border);
  border-radius: 8px;
  display: grid;
  place-items: center;
  background: var(--plaza-bg-card);
  color: var(--plaza-text-muted);
  cursor: pointer;
}

.header-actions button:hover {
  border-color: var(--plaza-accent);
  color: var(--plaza-accent);
  background: var(--plaza-accent-soft);
}

.messages-container {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 18px;
  overflow-y: auto;
  padding: 22px 24px 32px;
}

.empty-state {
  width: min(780px, 100%);
  margin: 38px auto 12px;
  padding: 24px;
  border: 1px solid var(--plaza-border);
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.82);
  box-shadow: var(--plaza-shadow-organic);
}

.empty-mark {
  width: 44px;
  height: 44px;
  border-radius: 10px;
  display: grid;
  place-items: center;
  background: var(--plaza-accent-soft);
  color: var(--plaza-accent);
  margin-bottom: 12px;
}

.empty-state h2 {
  color: var(--plaza-heading);
  font-size: 20px;
  font-weight: 800;
}

.empty-state p {
  max-width: 620px;
  margin-top: 8px;
  color: var(--plaza-text-muted);
  line-height: 1.7;
}

.prompt-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
  margin-top: 18px;
}

.prompt-grid button {
  min-height: 48px;
  padding: 10px 12px;
  border: 1px solid var(--plaza-border);
  border-radius: 8px;
  background: var(--plaza-bg-card);
  color: var(--plaza-text);
  text-align: left;
  line-height: 1.5;
  cursor: pointer;
}

.prompt-grid button:hover {
  border-color: var(--plaza-accent);
  color: var(--plaza-accent);
  background: var(--plaza-accent-soft);
}

.prompt-grid button:disabled {
  cursor: not-allowed;
  opacity: 0.55;
}

.latest-btn {
  position: absolute;
  left: 50%;
  bottom: 118px;
  z-index: 10;
  transform: translateX(-50%);
  height: 34px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 0 12px;
  border: 1px solid var(--plaza-border);
  border-radius: 8px;
  background: var(--plaza-bg-card);
  color: var(--plaza-text);
  box-shadow: var(--plaza-shadow-organic-hover);
  cursor: pointer;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.16s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

@media (max-width: 860px) {
  .chat-header {
    grid-template-columns: 1fr auto;
  }

  .prompt-grid {
    grid-template-columns: 1fr;
  }
}
</style>
