<script setup>
import { computed } from 'vue'
import { ChatDotRound, CopyDocument } from '@element-plus/icons-vue'

const props = defineProps({
  message: { type: Object, required: true },
  userInitial: { type: String, default: 'U' },
})

const isUser = computed(() => props.message.role === 'user')
const evidenceImages = computed(() =>
  (props.message.evidenceImages || []).filter((item) => item?.imageUrl),
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

      <div class="message-bubble">
        <div v-if="message.images && message.images.length" class="image-list">
          <img v-for="(image, index) in message.images" :key="index" :src="image" alt="上传图片" />
        </div>
        <p v-if="message.content" class="message-text">{{ message.content }}</p>
        <div v-if="!isUser && evidenceImages.length" class="evidence-list">
          <figure v-for="(item, index) in evidenceImages" :key="`${item.imageUrl}-${index}`" class="evidence-item">
            <img :src="item.imageUrl" :alt="item.caption || item.sectionTitle || '证据图片'" />
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

.image-list img {
  width: 112px;
  height: 80px;
  object-fit: cover;
  border-radius: 6px;
  border: 1px solid rgba(148, 163, 184, 0.24);
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

.evidence-item img {
  display: block;
  width: 100%;
  aspect-ratio: 4 / 3;
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
