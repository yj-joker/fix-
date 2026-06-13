<script setup>
import { computed, ref } from 'vue'
import { ArrowDown, ArrowUp, ChatDotRound, CopyDocument } from '@element-plus/icons-vue'

const props = defineProps({
  message: { type: Object, required: true },
  userInitial: { type: String, default: 'U' },
})

const isUser = computed(() => props.message.role === 'user')
const timelineOpen = ref(false)
const messageImageUrls = computed(() =>
  (props.message.images || []).filter((image) => typeof image === 'string' && image),
)
const evidenceImages = computed(() =>
  (props.message.evidenceImages || []).filter((item) => item?.imageUrl),
)
const evidenceImageUrls = computed(() =>
  evidenceImages.value.map((item) => item.imageUrl).filter(Boolean),
)
const agentSteps = computed(() =>
  Array.isArray(props.message.agentSteps) ? props.message.agentSteps : [],
)
const agentProgress = computed(() => props.message.agentProgress || { text: '', running: false })
const showAgentProgress = computed(() =>
  !isUser.value && (agentSteps.value.length > 0 || props.message.status === 'streaming'),
)
const agentProgressText = computed(() =>
  agentProgress.value.text || (props.message.status === 'streaming' ? '\u6b63\u5728\u5904\u7406...' : ''),
)

async function copyMessage() {
  const text = props.message.content || ''
  if (!text) return
  try {
    await navigator.clipboard.writeText(text)
  } catch {
    const input = document.createElement('textarea')
    input.value = text
    document.body.appendChild(input)
    input.select()
    document.execCommand('copy')
    document.body.removeChild(input)
  }
}
</script>

<template>
  <article class="chat-message" :class="{ user: isUser, assistant: !isUser }">
    <div class="message-avatar" :class="{ user: isUser }">
      <span v-if="isUser">{{ userInitial }}</span>
      <el-icon v-else><ChatDotRound /></el-icon>
    </div>

    <div class="message-main">
      <div class="message-meta">
        <span>{{ isUser ? '我' : '检修 AI 助手' }}</span>
        <span>{{ message.timestamp }}</span>
        <span v-if="message.status === 'streaming'" class="status">生成中</span>
        <span v-if="message.status === 'stopped'" class="status warn">已停止</span>
        <span v-if="message.status === 'error'" class="status danger">异常</span>
      </div>

      <div v-if="isUser && messageImageUrls.length" class="image-list user-image-list">
        <el-image
          v-for="(image, index) in messageImageUrls"
          :key="`${image}-${index}`"
          class="chat-image"
          :src="image"
          :preview-src-list="messageImageUrls"
          :initial-index="index"
          fit="cover"
          preview-teleported
          hide-on-click-modal
          alt="上传图片"
        />
      </div>

      <div v-if="message.content || !isUser" class="message-bubble">
        <p v-if="message.content" class="message-text">{{ message.content }}</p>
        <div v-if="!isUser && evidenceImages.length" class="evidence-list">
          <figure v-for="(item, index) in evidenceImages" :key="`${item.imageUrl}-${index}`" class="evidence-item">
            <el-image
              class="evidence-image"
              :src="item.imageUrl"
              :preview-src-list="evidenceImageUrls"
              :initial-index="index"
              fit="cover"
              preview-teleported
              hide-on-click-modal
              :alt="item.caption || item.sectionTitle || '证据图片'"
            />
            <figcaption v-if="item.caption || item.sectionTitle || item.page">
              <span v-if="item.caption">{{ item.caption }}</span>
              <span v-else-if="item.sectionTitle">{{ item.sectionTitle }}</span>
              <small v-if="item.page">P{{ item.page }}</small>
            </figcaption>
          </figure>
        </div>
        <div v-if="message.status === 'streaming' && !message.content" class="thinking">
          <span />
          <span />
          <span />
        </div>
      </div>

      <div
        v-if="showAgentProgress"
        class="agent-progress"
        :class="{ running: agentProgress.running }"
      >
        <button type="button" class="agent-progress-row" aria-label="agent progress" @click="timelineOpen = !timelineOpen">
          <span class="agent-progress-text">{{ agentProgressText }}</span>
          <el-icon class="agent-progress-toggle">
            <ArrowUp v-if="timelineOpen" />
            <ArrowDown v-else />
          </el-icon>
        </button>

        <div v-if="timelineOpen && agentSteps.length" class="agent-timeline">
          <div
            v-for="step in agentSteps"
            :key="step.id"
            class="agent-step"
            :class="`is-${step.status || 'done'}`"
          >
            <span class="agent-step-dot" />
            <div class="agent-step-body">
              <div class="agent-step-title">{{ step.title }}</div>
              <div v-if="step.detail" class="agent-step-detail">{{ step.detail }}</div>
            </div>
          </div>
        </div>
      </div>

      <div v-if="!isUser && message.content" class="message-actions">
        <button type="button" title="复制回复" @click="copyMessage">
          <el-icon><CopyDocument /></el-icon>
          <span>复制</span>
        </button>
      </div>
    </div>
  </article>
</template>

<style scoped>
.chat-message {
  display: flex;
  gap: 10px;
  max-width: min(820px, 88%);
}

.chat-message.user {
  align-self: flex-end;
  flex-direction: row-reverse;
}

.message-avatar {
  width: 32px;
  height: 32px;
  flex: 0 0 32px;
  border-radius: 8px;
  display: grid;
  place-items: center;
  background: #172033;
  color: #f8fafc;
  box-shadow: var(--plaza-shadow-organic);
  font-weight: 700;
}

.message-avatar.user {
  background: var(--plaza-accent);
}

.message-main {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.chat-message.user .message-main {
  align-items: flex-end;
}

.message-meta {
  display: flex;
  align-items: center;
  gap: 7px;
  color: var(--plaza-text-muted);
  font-size: 11.5px;
}

.status {
  color: var(--plaza-accent);
  font-weight: 600;
}

.status.warn {
  color: var(--plaza-warning);
}

.status.danger {
  color: var(--plaza-danger);
}

.message-bubble {
  padding: 10px 12px;
  border: 1px solid var(--plaza-border);
  border-radius: 8px;
  background: var(--plaza-bg-card);
  color: var(--plaza-text);
  box-shadow: var(--plaza-shadow-organic);
}

.chat-message.user .message-bubble {
  border-color: transparent;
  background: var(--plaza-accent);
  color: #fff;
}

.message-text {
  white-space: pre-wrap;
  word-break: break-word;
  line-height: 1.65;
  font-size: 14px;
}

.image-list {
  display: flex;
  flex-wrap: wrap;
  gap: 7px;
  margin-bottom: 7px;
}

.user-image-list {
  justify-content: flex-end;
  margin-bottom: 0;
}

.chat-image {
  width: 224px;
  height: 160px;
  max-width: min(224px, calc(100vw - 120px));
  border-radius: 6px;
  overflow: hidden;
  cursor: zoom-in;
  flex: 0 0 auto;
}

.chat-image :deep(.el-image__inner) {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.evidence-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(136px, 1fr));
  gap: 8px;
  margin-top: 10px;
}

.evidence-item {
  margin: 0;
  overflow: hidden;
  border: 1px solid rgba(148, 163, 184, 0.24);
  border-radius: 8px;
  background: rgba(248, 250, 252, 0.72);
}

.evidence-image {
  display: block;
  width: 100%;
  aspect-ratio: 4 / 3;
  cursor: zoom-in;
}

.evidence-image :deep(.el-image__inner) {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.evidence-item figcaption {
  display: flex;
  justify-content: space-between;
  gap: 6px;
  padding: 6px 7px;
  color: var(--plaza-text-muted);
  font-size: 11.5px;
  line-height: 1.35;
}

.evidence-item figcaption span {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.evidence-item figcaption small {
  flex-shrink: 0;
  color: var(--plaza-accent);
  font-weight: 700;
}

.agent-progress {
  width: 100%;
  max-width: 100%;
  color: #64748b;
  font-size: 12px;
}

.agent-progress-row {
  position: relative;
  width: 100%;
  min-height: 22px;
  padding: 2px 0;
  border: 0;
  background: transparent;
  color: inherit;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  text-align: left;
  cursor: pointer;
  overflow: hidden;
}

.agent-progress.running .agent-progress-row::after {
  content: '';
  position: absolute;
  inset: 0 auto 0 -42%;
  width: 42%;
  pointer-events: none;
  background: linear-gradient(90deg, transparent, rgba(148, 163, 184, 0.22), transparent);
  animation: agent-sweep 1.5s linear infinite;
}

.agent-progress-text {
  position: relative;
  z-index: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.agent-progress-toggle {
  position: relative;
  z-index: 1;
  flex: 0 0 auto;
  color: #94a3b8;
  font-size: 13px;
}

.agent-timeline {
  margin-top: 5px;
  padding: 2px 0 2px 12px;
  border-left: 1px solid rgba(148, 163, 184, 0.35);
}

.agent-step {
  position: relative;
  display: grid;
  grid-template-columns: 9px minmax(0, 1fr);
  gap: 7px;
  padding: 3px 0 7px;
}

.agent-step-dot {
  width: 7px;
  height: 7px;
  margin-top: 5px;
  margin-left: -16px;
  border-radius: 999px;
  background: #94a3b8;
  box-shadow: 0 0 0 3px #fff;
}

.agent-step.is-running .agent-step-dot {
  background: var(--plaza-accent);
}

.agent-step.is-warn .agent-step-dot {
  background: var(--plaza-warning);
}

.agent-step.is-error .agent-step-dot {
  background: var(--plaza-danger);
}

.agent-step-body {
  min-width: 0;
}

.agent-step-title {
  color: #475569;
  font-size: 12px;
  font-weight: 650;
  line-height: 1.45;
}

.agent-step-detail {
  margin-top: 1px;
  color: #94a3b8;
  font-size: 11.5px;
  line-height: 1.45;
  word-break: break-word;
}

@keyframes agent-sweep {
  0% { transform: translateX(0); }
  100% { transform: translateX(340%); }
}

.message-actions {
  display: flex;
  gap: 6px;
}

.message-actions button {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  border: 0;
  background: transparent;
  color: var(--plaza-text-muted);
  font-size: 11.5px;
  cursor: pointer;
  padding: 2px 4px;
}

.message-actions button:hover {
  color: var(--plaza-accent);
}

.thinking {
  display: flex;
  gap: 4px;
  align-items: center;
  justify-content: center;
  min-width: 52px;
  height: 24px;
}

.thinking span {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--plaza-text-muted);
  animation: pulse 1.1s infinite;
}

.thinking span:nth-child(2) {
  animation-delay: 0.16s;
}

.thinking span:nth-child(3) {
  animation-delay: 0.32s;
}

@keyframes pulse {
  0%, 80%, 100% { opacity: 0.35; transform: translateY(0); }
  40% { opacity: 1; transform: translateY(-3px); }
}
</style>
