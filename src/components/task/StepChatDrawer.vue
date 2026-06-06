<script setup>
import { ref, nextTick, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { stepChatStream } from '@/api/maintenanceTask'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  taskId: { required: true },
  step: { type: Object, default: () => ({}) },
})
const emit = defineEmits(['update:modelValue'])

const messages = ref([])     // { role, content }
const input = ref('')
const sending = ref(false)
const bodyRef = ref(null)
let controller = null

watch(() => props.modelValue, (open) => {
  if (open && messages.value.length === 0) {
    messages.value = [{ role: 'assistant', content: `关于「${props.step?.title || '本步骤'}」有什么疑问？可以问我操作要点、安全注意或异常处理。` }]
  }
})

function scrollDown() {
  nextTick(() => { const el = bodyRef.value; if (el) el.scrollTop = el.scrollHeight })
}

async function send() {
  const text = input.value.trim()
  if (!text || sending.value) return
  input.value = ''
  messages.value.push({ role: 'user', content: text })
  const ai = { role: 'assistant', content: '' }
  messages.value.push(ai)
  sending.value = true
  scrollDown()
  controller = new AbortController()
  try {
    const resp = await stepChatStream(props.taskId, props.step.id, text, [], controller.signal)
    if (!resp.ok) throw new Error('HTTP ' + resp.status)
    const reader = resp.body.getReader()
    const decoder = new TextDecoder()
    let buf = ''
    while (true) {
      let done, value
      try { ({ done, value } = await reader.read()) } catch (e) { if (controller.signal.aborted) break; throw e }
      if (done) break
      buf += decoder.decode(value, { stream: true })
      let idx
      while ((idx = buf.indexOf('\n\n')) !== -1) {
        const evt = buf.slice(0, idx); buf = buf.slice(idx + 2)
        const dataStr = evt.split('\n').filter((l) => l.startsWith('data:')).map((l) => l.slice(5).trim()).join('')
        if (!dataStr) continue
        try {
          const obj = JSON.parse(dataStr)
          if (obj.event === 'token') {
            ai.content += obj.data?.content || ''
            scrollDown()
          } else if (obj.event === 'error') {
            ai.content += `\n[出错] ${obj.data?.message || ''}`
          }
        } catch { /* 非 JSON 行忽略 */ }
      }
    }
    if (!ai.content) ai.content = '(无回复)'
  } catch (err) {
    if (err.name !== 'AbortError') ai.content = '抱歉，答疑出错了，请稍后再试。'
  } finally {
    sending.value = false
    controller = null
    scrollDown()
  }
}

function stop() { if (controller) controller.abort() }
function close() { stop(); emit('update:modelValue', false) }
</script>

<template>
  <el-drawer :model-value="modelValue" title="步骤答疑" direction="rtl" size="420px" append-to-body
             @update:model-value="emit('update:modelValue', $event)" @close="stop">
    <div class="chat">
      <div ref="bodyRef" class="chat-body">
        <div v-for="(m, i) in messages" :key="i" class="row" :class="m.role">
          <div class="bubble" v-html="(m.content || '').replace(/\n/g, '<br>')" />
        </div>
      </div>
      <div class="chat-input">
        <el-input v-model="input" type="textarea" :rows="2" resize="none" placeholder="输入你的问题…"
                  @keyup.enter.exact.prevent="send" />
        <button v-if="!sending" class="send" :disabled="!input.trim()" @click="send">发送</button>
        <button v-else class="send stop" @click="stop">停止</button>
      </div>
    </div>
  </el-drawer>
</template>

<style scoped>
.chat { display: flex; flex-direction: column; height: 100%; }
.chat-body { flex: 1; overflow-y: auto; display: flex; flex-direction: column; gap: 12px; padding: 4px 2px; }
.row { display: flex; }
.row.user { justify-content: flex-end; }
.bubble { max-width: 84%; padding: 9px 13px; border-radius: 12px; font-size: 14px; line-height: 1.6; word-break: break-word; }
.row.assistant .bubble { background: #f1f5f9; color: #334155; border-bottom-left-radius: 4px; }
.row.user .bubble { background: #3b82f6; color: #fff; border-bottom-right-radius: 4px; }
.chat-input { display: flex; gap: 8px; align-items: flex-end; padding-top: 10px; border-top: 1px solid #eef2fb; }
.send { flex-shrink: 0; padding: 0 16px; height: 56px; border: none; border-radius: 8px; background: #3b82f6; color: #fff;
  font-weight: 600; font-size: 13px; cursor: pointer; }
.send:disabled { opacity: .5; cursor: not-allowed; }
.send.stop { background: #ef4444; }
</style>
