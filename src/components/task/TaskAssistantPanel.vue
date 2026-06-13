<script setup>
import { ref, computed, watch, nextTick, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { ArrowDown, ArrowUp, ChatDotRound } from '@element-plus/icons-vue'
import { uploadImage } from '@/api/user'
import { taskAssistantStore } from '@/stores/taskAssistantStore'
import { extractUploadedImageUrl } from '@/utils/upload'

const props = defineProps({
  taskId: { required: true },
  steps: { type: Array, default: () => [] },
  activeStepId: { default: null },
})

const s = computed(() => taskAssistantStore.get(props.taskId))
const input = ref('')
const pendingImages = ref([])
const uploading = ref(false)
const pendingSend = ref(false)
const bodyRef = ref(null)
const inputRef = ref(null)
const openTimelines = ref({})

const sortedSteps = computed(() =>
  props.steps.slice().sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0)),
)
const focusedTitle = computed(() => {
  const st = sortedSteps.value.find((x) => x.id === s.value.focusedStepId)
  return st ? `第${st.sortOrder}步 · ${st.title}` : '整个任务'
})

// 聚焦步骤默认跟随「正在执行」的步骤；用户手动切换后停止自动跟随
function syncFocus(now, old) {
  const st = s.value
  if (st.focusedStepId == null || st.focusedStepId === old) st.focusedStepId = now
}
watch(() => props.activeStepId, (n, o) => syncFocus(n, o))
onMounted(() => {
  if (s.value.focusedStepId == null) s.value.focusedStepId = props.activeStepId
  taskAssistantStore.loadHistory(props.taskId)
  scrollDown()
})

watch(() => s.value.messages.length, scrollDown)
watch(
  () => (s.value.messages[s.value.messages.length - 1] || {}).content,
  scrollDown,
)

function scrollDown() {
  nextTick(() => {
    const el = bodyRef.value
    if (el) el.scrollTop = el.scrollHeight
  })
}

function renderText(t) {
  return String(t || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\n/g, '<br>')
}

async function onPickFiles(e) {
  const files = Array.from(e.target.files || [])
  e.target.value = ''
  if (!files.length) return
  uploading.value = true
  try {
    for (const f of files) {
      const res = await uploadImage(f)
      const url = extractUploadedImageUrl(res)
      if (url) pendingImages.value.push(url)
    }
  } catch (err) {
    ElMessage.error('图片上传失败：' + (err.message || ''))
  } finally {
    uploading.value = false
    if (pendingSend.value) {
      pendingSend.value = false
      if (input.value.trim() || pendingImages.value.length) {
        await send()
      } else {
        ElMessage.error('图片上传失败，未发送给 AI')
      }
    }
  }
}
function removePending(i) {
  pendingImages.value.splice(i, 1)
}

async function send() {
  const text = input.value.trim()
  if (s.value.streaming) return
  if (uploading.value) {
    pendingSend.value = true
    ElMessage.info('图片上传中，完成后将自动发送')
    return
  }
  if (!text && !pendingImages.value.length) return
  const images = pendingImages.value.slice()
  input.value = ''
  pendingImages.value = []
  await taskAssistantStore.send(props.taskId, { message: text, images })
}
function stop() {
  taskAssistantStore.stop(props.taskId)
}

function isUser(message) {
  return message?.role === 'user'
}

function agentSteps(message) {
  return Array.isArray(message?.agentSteps) ? message.agentSteps : []
}

function agentProgress(message) {
  return message?.agentProgress || { text: '', running: false }
}

function showAgentProgress(message) {
  return !isUser(message) && (agentSteps(message).length > 0 || message?.status === 'streaming')
}

function agentProgressText(message) {
  return agentProgress(message).text || (message?.status === 'streaming' ? '正在处理...' : '')
}

function timelineKey(message, index) {
  return message?.id || `${message?.role || 'message'}-${index}`
}

function toggleTimeline(message, index) {
  const key = timelineKey(message, index)
  openTimelines.value = { ...openTimelines.value, [key]: !openTimelines.value[key] }
}

function isTimelineOpen(message, index) {
  return Boolean(openTimelines.value[timelineKey(message, index)])
}

// 供父组件（点步骤卡「问AI」）聚焦输入框
function focusInput() {
  nextTick(() => inputRef.value?.focus?.())
}
defineExpose({ focusInput })
</script>

<template>
  <div class="assistant">
    <div class="a-head">
      <div class="a-title"><span class="a-bot">AI</span> 检修助手</div>
      <div class="a-focus">
        <span class="a-focus-lbl">聚焦</span>
        <select v-model="s.focusedStepId" class="a-focus-sel">
          <option :value="null">整个任务</option>
          <option v-for="st in sortedSteps" :key="st.id" :value="st.id">
            第{{ st.sortOrder }}步 · {{ st.title }}
          </option>
        </select>
      </div>
    </div>

    <div ref="bodyRef" class="a-body">
      <div v-if="!s.messages.length" class="a-empty">
        <p>我已经知道这条任务和你正在做的步骤。</p>
        <p class="a-empty-sub">遇到卡壳、拿不准、或步骤里没写到的情况，随时问我——当前聚焦：<b>{{ focusedTitle }}</b></p>
      </div>
      <article v-for="(m, i) in s.messages" :key="timelineKey(m, i)" class="message" :class="{ user: isUser(m) }">
        <div class="avatar" :class="{ user: isUser(m) }">
          <span v-if="isUser(m)">我</span>
          <el-icon v-else><ChatDotRound /></el-icon>
        </div>

        <div class="message-main">
          <div class="message-meta">
            <span>{{ isUser(m) ? '我' : '检修 AI 助手' }}</span>
            <span v-if="m.timestamp">{{ m.timestamp }}</span>
            <span v-if="m.status === 'streaming'" class="status">生成中</span>
            <span v-if="m.status === 'stopped'" class="status warn">已停止</span>
            <span v-if="m.status === 'error'" class="status danger">异常</span>
          </div>

          <div v-if="(m.images || []).length" class="b-imgs">
            <img v-for="(u, k) in m.images" :key="k" :src="u" alt="" />
          </div>

          <div class="bubble">
            <div v-if="m.content" class="b-text" v-html="renderText(m.content)" />
            <div v-if="m.status === 'streaming' && !m.content" class="thinking">
              <span />
              <span />
              <span />
            </div>
          </div>

          <div v-if="m.role === 'assistant' && (m.evidenceImages || []).length" class="b-evidence">
            <figure v-for="(item, k) in m.evidenceImages" :key="`${item.imageUrl}-${k}`">
              <img v-if="item.imageUrl" :src="item.imageUrl" :alt="item.caption || item.sectionTitle || '证据图片'" />
              <figcaption v-if="item.caption || item.sectionTitle || item.page">
                <span>{{ item.caption || item.sectionTitle }}</span>
                <small v-if="item.page">P{{ item.page }}</small>
              </figcaption>
            </figure>
          </div>

          <div v-if="showAgentProgress(m)" class="agent-progress" :class="{ running: agentProgress(m).running }">
            <button type="button" class="agent-progress-row" @click="toggleTimeline(m, i)">
              <span class="agent-progress-text">{{ agentProgressText(m) }}</span>
              <el-icon class="agent-progress-toggle">
                <ArrowUp v-if="isTimelineOpen(m, i)" />
                <ArrowDown v-else />
              </el-icon>
            </button>

            <div v-if="isTimelineOpen(m, i) && agentSteps(m).length" class="agent-timeline">
              <div
                v-for="step in agentSteps(m)"
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
        </div>
      </article>
    </div>

    <div class="a-input">
      <div v-if="pendingImages.length" class="pending">
        <div v-for="(u, i) in pendingImages" :key="i" class="p-item">
          <img :src="u" alt="" /><button class="p-x" @click="removePending(i)">移除</button>
        </div>
      </div>
      <div class="a-row">
        <label class="attach" :class="{ busy: uploading }" title="附照片">
          <input type="file" accept="image/*" multiple hidden @change="onPickFiles" />
          <span v-if="uploading" class="attach-loading">上传中</span>
          <svg v-else class="attach-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" aria-hidden="true">
            <path fill="currentColor" d="M160 160v704h704V160zm-32-64h768a32 32 0 0 1 32 32v768a32 32 0 0 1-32 32H128a32 32 0 0 1-32-32V128a32 32 0 0 1 32-32"></path>
            <path fill="currentColor" d="M384 288q64 0 64 64t-64 64-64-64 64-64M185.408 876.992l-50.816-38.912L350.72 556.032a96 96 0 0 1 134.592-17.856l1.856 1.472 122.88 99.136a32 32 0 0 0 44.992-4.864l216-269.888 49.92 39.936-215.808 269.824-.256.32a96 96 0 0 1-135.04 14.464l-122.88-99.072-.64-.512a32 32 0 0 0-44.8 5.952z"></path>
          </svg>
        </label>
        <textarea
          ref="inputRef"
          v-model="input"
          rows="2"
          placeholder="询问当前步骤"
          @keydown.enter.exact.prevent="send"
        />
        <button v-if="!s.streaming" class="send" :disabled="!uploading && !input.trim() && !pendingImages.length" @click="send">
          {{ pendingSend ? '待发送' : '发送' }}
        </button>
        <button v-else class="send stop" @click="stop">停止</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.assistant {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: #fff;
  border: 1px solid #cbdbf5;
  border-radius: 12px;
  box-shadow: 0 2px 12px rgba(51, 65, 85, 0.05);
  overflow: hidden;
}
.a-head {
  flex-shrink: 0;
  min-height: 64px;
  padding: 14px 16px;
  border-bottom: 1px solid #eef2fb;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  background: linear-gradient(180deg, #f7faff, #fff);
}
.a-title {
  font-weight: 700;
  font-size: 15px;
  color: #334155;
  display: flex;
  align-items: center;
  gap: 6px;
}
.a-bot {
  font-size: 16px;
}
.a-focus {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}
.a-focus-lbl {
  font-size: 11px;
  color: #94a3b8;
}
.a-focus-sel {
  max-width: 160px;
  min-height: 34px;
  font-size: 12px;
  color: #3b82f6;
  font-weight: 600;
  border: 1px solid #cbdbf5;
  border-radius: 6px;
  padding: 6px 28px 6px 8px;
  line-height: 20px;
  background: #f5f9ff;
  cursor: pointer;
}
.a-focus-sel option {
  min-height: 32px;
  padding: 7px 8px;
  line-height: 32px;
  color: #334155;
  font-weight: 500;
}
.a-body {
  flex: 1;
  /* 关键：flex 子项默认 min-height:auto，会被内容撑高而不收缩，
     导致 overflow-y 失效、长回答溢出被 .assistant 的 overflow:hidden 裁掉。
     置 0 后才能在父容器固定高度内真正滚动。 */
  min-height: 0;
  overflow-y: auto;
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.a-empty {
  color: #64748b;
  font-size: 13px;
  text-align: center;
  margin: auto 0;
  line-height: 1.7;
}
.a-empty-sub {
  font-size: 12.5px;
  color: #94a3b8;
  margin-top: 4px;
}
.a-empty b {
  color: #3b82f6;
}
.message {
  width: 100%;
  min-width: 0;
  display: flex;
  gap: 9px;
}
.message.user {
  flex-direction: row-reverse;
}
.avatar {
  width: 30px;
  height: 30px;
  flex: 0 0 30px;
  border-radius: 8px;
  display: grid;
  place-items: center;
  background: #172033;
  color: #f8fafc;
  font-size: 12px;
  font-weight: 700;
}
.avatar.user {
  background: #3b82f6;
}
.message-main {
  min-width: 0;
  width: min(100%, 620px);
  display: flex;
  flex-direction: column;
  gap: 5px;
}
.message.user .message-main {
  width: auto;
  max-width: min(84%, 520px);
  align-items: flex-end;
}
.message-meta {
  display: flex;
  align-items: center;
  gap: 7px;
  color: #94a3b8;
  font-size: 11.5px;
}
.status {
  color: #3b82f6;
  font-weight: 600;
}
.status.warn {
  color: #f59e0b;
}
.status.danger {
  color: #ef4444;
}
.bubble {
  width: 100%;
  min-width: 0;
  padding: 10px 12px;
  border: 1px solid #dbe7f8;
  border-radius: 8px;
  background: #f8fafc;
  color: #334155;
  box-shadow: 0 1px 8px rgba(51, 65, 85, 0.05);
  font-size: 14px;
  line-height: 1.65;
  word-break: break-word;
  overflow-wrap: anywhere;
}
.message.user .bubble {
  width: fit-content;
  max-width: 100%;
  border-color: transparent;
  background: #3b82f6;
  color: #fff;
}
.b-text {
  display: block;
}
.b-imgs {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
  margin-bottom: 2px;
}
.b-imgs img {
  width: 64px;
  height: 64px;
  object-fit: cover;
  border-radius: 6px;
}
.b-evidence {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(112px, 1fr));
  gap: 6px;
  margin-top: 3px;
}
.b-evidence figure {
  margin: 0;
  overflow: hidden;
  border: 1px solid #dbe7f8;
  border-radius: 7px;
  background: #fff;
}
.b-evidence img {
  display: block;
  width: 100%;
  aspect-ratio: 4 / 3;
  object-fit: cover;
}
.b-evidence figcaption {
  display: flex;
  justify-content: space-between;
  gap: 5px;
  padding: 5px 6px;
  color: #64748b;
  font-size: 11px;
  line-height: 1.35;
}
.b-evidence figcaption span {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.b-evidence figcaption small {
  flex-shrink: 0;
  color: #3b82f6;
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
  min-height: 24px;
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
  background: #3b82f6;
}
.agent-step.is-warn .agent-step-dot {
  background: #f59e0b;
}
.agent-step.is-error .agent-step-dot {
  background: #ef4444;
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
  background: #94a3b8;
  animation: pulse 1.1s infinite;
}
.thinking span:nth-child(2) {
  animation-delay: 0.16s;
}
.thinking span:nth-child(3) {
  animation-delay: 0.32s;
}
@keyframes agent-sweep {
  0% { transform: translateX(0); }
  100% { transform: translateX(340%); }
}
@keyframes pulse {
  0%, 80%, 100% { opacity: 0.35; transform: translateY(0); }
  40% { opacity: 1; transform: translateY(-3px); }
}
.a-input {
  flex-shrink: 0;
  border-top: 1px solid #eef2fb;
  padding: 10px 12px;
}
.pending {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 8px;
}
.p-item {
  position: relative;
  width: 48px;
  height: 48px;
  border-radius: 6px;
  overflow: hidden;
  border: 1px solid #cbdbf5;
}
.p-item img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.p-x {
  position: absolute;
  top: 1px;
  right: 1px;
  width: 16px;
  height: 16px;
  border: none;
  border-radius: 50%;
  background: rgba(15, 23, 42, 0.6);
  color: #fff;
  font-size: 10px;
  cursor: pointer;
  line-height: 1;
}
.a-row {
  display: flex;
  gap: 8px;
  align-items: center;
}
.attach {
  flex-shrink: 0;
  width: 38px;
  height: 38px;
  border: 1px solid #cbdbf5;
  border-radius: 8px;
  display: grid;
  place-items: center;
  cursor: pointer;
  font-size: 16px;
  background: #f8faff;
  color: #3b82f6;
}
.attach:hover {
  background: #eaf2ff;
}
.attach-icon {
  width: 20px;
  height: 20px;
}
.attach-loading {
  font-size: 11px;
  font-weight: 600;
  color: #64748b;
}
.a-row textarea {
  flex: 1;
  height: 38px;
  min-height: 38px;
  resize: none;
  border: 1px solid #cbdbf5;
  border-radius: 8px;
  padding: 8px 10px;
  font-size: 14px;
  font-family: inherit;
  outline: none;
  line-height: 20px;
  overflow-y: auto;
}
.a-row textarea:focus {
  border-color: #3b82f6;
}
.send {
  flex-shrink: 0;
  padding: 0 16px;
  height: 38px;
  border: none;
  border-radius: 8px;
  background: #3b82f6;
  color: #fff;
  font-weight: 600;
  font-size: 13px;
  cursor: pointer;
}
.send:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.send.stop {
  background: #ef4444;
}
</style>
