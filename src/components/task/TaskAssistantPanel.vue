<script setup>
import { ref, computed, watch, nextTick, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { uploadImage } from '@/api/user'
import { taskAssistantStore } from '@/stores/taskAssistantStore'

const props = defineProps({
  taskId: { required: true },
  steps: { type: Array, default: () => [] },
  activeStepId: { default: null },
})

const s = computed(() => taskAssistantStore.get(props.taskId))
const input = ref('')
const pendingImages = ref([])
const uploading = ref(false)
const bodyRef = ref(null)
const inputRef = ref(null)

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
      const url = res?.data || res?.url
      if (url) pendingImages.value.push(url)
    }
  } catch (err) {
    ElMessage.error('图片上传失败：' + (err.message || ''))
  } finally {
    uploading.value = false
  }
}
function removePending(i) {
  pendingImages.value.splice(i, 1)
}

async function send() {
  const text = input.value.trim()
  if (!text || s.value.streaming) return
  const images = pendingImages.value.slice()
  input.value = ''
  pendingImages.value = []
  await taskAssistantStore.send(props.taskId, { message: text, images })
}
function stop() {
  taskAssistantStore.stop(props.taskId)
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
      <div class="a-title"><span class="a-bot">🤖</span> 检修助手</div>
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
        <p>👋 我已经知道这条任务和你正在做的步骤。</p>
        <p class="a-empty-sub">遇到卡壳、拿不准、或步骤里没写到的情况，随时问我——当前聚焦：<b>{{ focusedTitle }}</b></p>
      </div>
      <div v-for="(m, i) in s.messages" :key="i" class="row" :class="m.role">
        <div class="bubble">
          <div v-if="(m.images || []).length" class="b-imgs">
            <img v-for="(u, k) in m.images" :key="k" :src="u" alt="" />
          </div>
          <div class="b-text" v-html="renderText(m.content)" />
          <div v-if="m.role === 'assistant' && (m.evidenceImages || []).length" class="b-evidence">
            <figure v-for="(item, k) in m.evidenceImages" :key="`${item.imageUrl}-${k}`">
              <img v-if="item.imageUrl" :src="item.imageUrl" :alt="item.caption || item.sectionTitle || '证据图片'" />
              <figcaption v-if="item.caption || item.sectionTitle || item.page">
                <span>{{ item.caption || item.sectionTitle }}</span>
                <small v-if="item.page">P{{ item.page }}</small>
              </figcaption>
            </figure>
          </div>
        </div>
      </div>
    </div>

    <div class="a-input">
      <div v-if="pendingImages.length" class="pending">
        <div v-for="(u, i) in pendingImages" :key="i" class="p-item">
          <img :src="u" alt="" /><button class="p-x" @click="removePending(i)">✕</button>
        </div>
      </div>
      <div class="a-row">
        <label class="attach" :class="{ busy: uploading }" title="附照片">
          <input type="file" accept="image/*" multiple hidden @change="onPickFiles" />
          <span v-if="uploading">…</span><span v-else>📎</span>
        </label>
        <textarea
          ref="inputRef"
          v-model="input"
          rows="2"
          placeholder="问问当前这一步怎么做、遇到的故障怎么处理…"
          @keydown.enter.exact.prevent="send"
        />
        <button v-if="!s.streaming" class="send" :disabled="!input.trim()" @click="send">发送</button>
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
  padding: 12px 14px;
  border-bottom: 1px solid #eef2fb;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
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
  gap: 6px;
  min-width: 0;
}
.a-focus-lbl {
  font-size: 11px;
  color: #94a3b8;
}
.a-focus-sel {
  max-width: 160px;
  font-size: 12px;
  color: #3b82f6;
  font-weight: 600;
  border: 1px solid #cbdbf5;
  border-radius: 6px;
  padding: 3px 6px;
  background: #f5f9ff;
  cursor: pointer;
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
.row {
  display: flex;
}
.row.user {
  justify-content: flex-end;
}
.bubble {
  max-width: 86%;
  padding: 9px 13px;
  border-radius: 12px;
  font-size: 14px;
  line-height: 1.65;
  word-break: break-word;
}
.row.assistant .bubble {
  background: #f1f5f9;
  color: #334155;
  border-bottom-left-radius: 4px;
}
.row.user .bubble {
  background: #3b82f6;
  color: #fff;
  border-bottom-right-radius: 4px;
}
.b-imgs {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
  margin-bottom: 6px;
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
  margin-top: 8px;
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
  align-items: flex-end;
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
}
.attach:hover {
  background: #eaf2ff;
}
.a-row textarea {
  flex: 1;
  resize: none;
  border: 1px solid #cbdbf5;
  border-radius: 8px;
  padding: 8px 10px;
  font-size: 14px;
  font-family: inherit;
  outline: none;
  line-height: 1.5;
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
