<template>
  <div class="ai-bottom-input">
    <div class="input-container">
      <!-- Top action tags row -->
      <div class="action-tags-row">
        <!-- Hidden file inputs -->
        <input
          type="file"
          ref="imageInput"
          accept="image/*"
          multiple
          style="display: none"
          @change="handleImageUpload"
        />
        <input
          type="file"
          ref="docInput"
          accept=".pdf,.doc,.docx,.xls,.xlsx,.txt"
          multiple
          style="display: none"
          @change="handleDocUpload"
        />

        <!-- Think button -->
        <button class="action-tag" :class="{ 'active': isThinking }" @click="toggleThinking">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="tag-icon">
            <path d="M12 2v4"/>
            <path d="m6.8 15-3.5 2"/>
            <path d="m20.7 17-3.5-2"/>
            <path d="M6.8 9 3.3 7"/>
            <path d="m20.7 7-3.5 2"/>
            <path d="m9 22 3-8 3 8"/>
            <path d="M8 22h8"/>
            <circle cx="12" cy="12" r="2"/>
            <path d="M12 2a4 4 0 0 0-4 4c0 1.5.8 2.8 2 3.4"/>
            <path d="M12 2a4 4 0 0 1 4 4c0 1.5-.8 2.8-2 3.4"/>
          </svg>
          思考
        </button>

        <!-- Upload image button -->
        <button class="action-tag" @click="$refs.imageInput.click()">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="tag-icon">
            <rect width="18" height="18" x="3" y="3" rx="2" ry="2"/>
            <circle cx="9" cy="9" r="2"/>
            <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/>
          </svg>
          上传图片
        </button>

        <!-- Upload doc button -->
        <button class="action-tag" @click="$refs.docInput.click()">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="tag-icon">
            <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/>
            <path d="M14 2v4a2 2 0 0 0 2 2h4"/>
          </svg>
          上传文档
        </button>
      </div>

      <!-- Input row -->
      <div class="input-row">
        <input
          v-model="inputValue"
          type="text"
          class="text-input"
          placeholder="向小v提问..."
          @keyup.enter="handleSend"
        />
        <button
          class="icon-btn voice-btn"
          :class="{ 'recording': recordStatus === 'recording', 'stopped': recordStatus === 'stopped' }"
          @click="toggleRecording"
          :disabled="recordStatus === 'processing'"
        >
          <svg v-if="recordStatus !== 'recording'" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/>
            <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
            <line x1="12" x2="12" y1="19" y2="22"/>
          </svg>
          <svg v-else xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="6" y="6" width="12" height="12" rx="2"/>
          </svg>
        </button>
        <button
          class="icon-btn send-btn"
          :class="{ 'enabled': canSend }"
          :disabled="!canSend"
          @click="handleSend"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="m5 12 14-7-7 14v-7H5Z"/>
          </svg>
        </button>
      </div>

      <!-- Upload preview -->
      <div v-if="uploadedFiles.length > 0" class="upload-preview">
        <div v-for="file in uploadedFiles" :key="file.id" class="upload-item">
          <img v-if="file.type === 'image'" :src="file.url" :alt="file.name" />
          <div v-else class="doc-preview">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/>
              <path d="M14 2v4a2 2 0 0 0 2 2h4"/>
            </svg>
            <span>{{ file.name }}</span>
          </div>
          <button class="remove-btn" @click="removeFile(file.id)">×</button>
        </div>
      </div>

      <!-- Recording status bar -->
      <div v-if="recordStatus !== 'idle'" class="record-status-bar">
        <div class="record-status-info">
          <span class="status-badge" :class="recordStatus">{{ statusText }}</span>
          <span v-if="recordStatus === 'recording' || recordStatus === 'stopped'" class="record-timer">{{ formatTime(recordDuration) }}</span>
        </div>

        <!-- Audio preview -->
        <div v-if="audioUrl && recordStatus !== 'processing'" class="audio-preview">
          <audio :src="audioUrl" controls></audio>
        </div>

        <!-- Processing spinner -->
        <div v-if="recordStatus === 'processing'" class="processing-indicator">
          <span class="spinner"></span>
          正在识别...
        </div>

        <!-- ASR Result -->
        <div v-if="asrResult && recordStatus === 'done'" class="asr-result">
          <div class="result-header">
            <span class="result-title">识别结果</span>
            <el-button size="small" @click="copyResult" :icon="CopyDocument">复制</el-button>
          </div>
          <div class="result-meta">
            <span>语言: {{ asrResult.language }}</span>
            <span>置信度: {{ (asrResult.language_probability * 100).toFixed(1) }}%</span>
            <span>时长: {{ asrResult.duration.toFixed(1) }}s</span>
          </div>
          <div class="result-text">{{ asrResult.text }}</div>
          <div v-if="asrResult.segments && asrResult.segments.length > 0" class="result-segments">
            <div v-for="(seg, idx) in asrResult.segments" :key="idx" class="segment-item">
              <span class="segment-time">[{{ formatTime(seg.start) }} - {{ formatTime(seg.end) }}]</span>
              <span class="segment-text">{{ seg.text }}</span>
            </div>
          </div>
        </div>

        <!-- Error -->
        <div v-if="recordStatus === 'error'" class="record-error">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" x2="12" y1="8" y2="12"/>
            <line x1="12" x2="12.01" y1="16" y2="16"/>
          </svg>
          {{ recordError }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, defineEmits, onUnmounted } from 'vue'
import { CopyDocument } from '@element-plus/icons-vue'
import { uploadAudio } from '@/api/asr'
import { ElMessage } from 'element-plus'

const emit = defineEmits(['send'])

const inputValue = ref('')
const isThinking = ref(false)
const uploadedFiles = ref([])

// Recording state
const recordStatus = ref('idle') // idle | recording | stopped | processing | done | error
const recordDuration = ref(0)
const audioUrl = ref('')
const audioFile = ref(null)
const asrResult = ref(null)
const recordError = ref('')

let mediaRecorder = null
let audioStream = null
let audioChunks = []
let timerInterval = null
let recordStartTime = null

const statusText = computed(() => {
  const map = {
    idle: '',
    recording: '录音中',
    stopped: '已停止',
    processing: '识别中',
    done: '识别完成',
    error: '识别失败'
  }
  return map[recordStatus.value] || ''
})

const canSend = computed(() => inputValue.value.trim().length > 0 || uploadedFiles.value.length > 0)

const toggleThinking = () => {
  isThinking.value = !isThinking.value
}

const toggleRecording = () => {
  if (recordStatus.value === 'idle') {
    startRecording()
  } else if (recordStatus.value === 'recording') {
    stopRecording()
  }
}

const startRecording = async () => {
  try {
    audioStream = await navigator.mediaDevices.getUserMedia({ audio: true })

    // Determine supported MIME type
    const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
      ? 'audio/webm;codecs=opus'
      : 'audio/webm'

    mediaRecorder = new MediaRecorder(audioStream, { mimeType })

    audioChunks = []
    mediaRecorder.ondataavailable = (event) => {
      if (event.data && event.data.size > 0) {
        audioChunks.push(event.data)
      }
    }

    mediaRecorder.onstop = async () => {
      const blob = new Blob(audioChunks, { type: mimeType })
      const timestamp = Date.now()
      audioFile.value = new File([blob], `recording_${timestamp}.webm`, { type: mimeType })
      audioUrl.value = URL.createObjectURL(blob)

      recordStatus.value = 'stopped'
      clearInterval(timerInterval)
  }

    mediaRecorder.start(100) // collect data every 100ms
    recordStatus.value = 'recording'
    recordStartTime = Date.now()
    recordDuration.value = 0

    timerInterval = setInterval(() => {
      recordDuration.value = Math.floor((Date.now() - recordStartTime) / 1000)
    }, 1000)

  } catch (err) {
    console.error('Failed to start recording:', err)
    recordError.value = err.message || '无法访问麦克风'
    recordStatus.value = 'error'
  }
}

const stopRecording = () => {
  if (mediaRecorder && mediaRecorder.state !== 'inactive') {
    mediaRecorder.stop()
  }
  if (audioStream) {
    audioStream.getTracks().forEach(track => track.stop())
    audioStream = null
  }
  if (timerInterval) {
    clearInterval(timerInterval)
    timerInterval = null
  }
}

const processRecording = async () => {
  if (!audioFile.value) return

  recordStatus.value = 'processing'

  try {
    const result = await uploadAudio(audioFile.value, audioFile.value.name)
    asrResult.value = result
    inputValue.value = result.text
    recordStatus.value = 'done'
  } catch (err) {
    console.error('ASR error:', err)
    recordError.value = err.message || '识别失败'
    recordStatus.value = 'error'
  }
}

const copyResult = () => {
  if (!asrResult.value) return
  const text = asrResult.value.segments
    ? asrResult.value.segments.map(s => s.text).join('')
    : asrResult.value.text
  navigator.clipboard.writeText(text).then(() => {
    ElMessage.success('已复制到剪贴板')
  }).catch(() => {
    ElMessage.error('复制失败')
  })
}

const formatTime = (seconds) => {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

// Watch for stopped status to auto process
import { watch } from 'vue'
watch(recordStatus, (newVal) => {
  if (newVal === 'stopped') {
    processRecording()
  }
})

const handleSend = () => {
  if (canSend.value) {
    emit('send', {
      text: inputValue.value,
      files: uploadedFiles.value
    })
    inputValue.value = ''
    uploadedFiles.value = []
    // Reset recording state after sending
    resetRecordingState()
  }
}

const resetRecordingState = () => {
  recordStatus.value = 'idle'
  recordDuration.value = 0
  asrResult.value = null
  recordError.value = ''
  if (audioUrl.value) {
    URL.revokeObjectURL(audioUrl.value)
    audioUrl.value = ''
  }
  audioFile.value = null
}

const handleImageUpload = (event) => {
  const files = event.target.files
  if (!files.length) return

  for (let i = 0; i < files.length; i++) {
    const file = files[i]
    if (file.type.startsWith('image/')) {
      const reader = new FileReader()
      reader.onload = (e) => {
        uploadedFiles.value.push({
          id: Date.now() + i,
          name: file.name,
          type: 'image',
          url: e.target.result
        })
      }
      reader.readAsDataURL(file)
    }
  }
  event.target.value = ''
}

const handleDocUpload = (event) => {
  const files = event.target.files
  if (!files.length) return

  for (let i = 0; i < files.length; i++) {
    const file = files[i]
    const reader = new FileReader()
    reader.onload = (e) => {
      uploadedFiles.value.push({
        id: Date.now() + i,
        name: file.name,
        type: 'doc',
        url: e.target.result
      })
    }
    reader.readAsDataURL(file)
  }
  event.target.value = ''
}

const removeFile = (id) => {
  uploadedFiles.value = uploadedFiles.value.filter(f => f.id !== id)
}

onUnmounted(() => {
  if (audioStream) {
    audioStream.getTracks().forEach(track => track.stop())
  }
  if (audioUrl.value) {
    URL.revokeObjectURL(audioUrl.value)
  }
  if (timerInterval) {
    clearInterval(timerInterval)
  }
})
</script>

<style scoped>
.ai-bottom-input {
  position: relative;
  bottom: auto;
  left: auto;
  transform: none;
  width: 100%;
  max-width: 100%;
  padding: 0;
}

.input-container {
  background: rgba(255, 255, 255, 0.98);
  backdrop-filter: blur(12px);
  border-radius: 1.25rem;
  border: 1px solid #e5e7eb;
  box-shadow: 0 20px 60px -15px rgba(0, 0, 0, 0.1), 0 8px 20px -8px rgba(0, 0, 0, 0.06);
  padding: 1rem;
}

.action-tags-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 1rem;
  overflow-x: auto;
  padding-bottom: 0.25rem;
}

.action-tag {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.625rem 1.125rem;
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 9999px;
  font-size: 0.9375rem;
  font-weight: 600;
  color: #4b5563;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
}

.action-tag:hover {
  background: #f3f4f6;
  border-color: #d1d5db;
}

.action-tag.active {
  background: #8b5cf6;
  border-color: #8b5cf6;
  color: #fff;
  box-shadow: 0 4px 12px -2px rgba(139, 92, 246, 0.4);
}

.action-tag.active .tag-icon {
  stroke: #fff;
}

.tag-icon {
  flex-shrink: 0;
  stroke: #6b7280;
  transition: stroke 0.2s;
}

.input-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.text-input {
  flex: 1;
  padding: 1.125rem 1.5rem;
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 1rem;
  font-size: 1.0625rem;
  color: #1f2937;
  outline: none;
  transition: all 0.2s;
}

.text-input::placeholder {
  color: #9ca3af;
}

.text-input:focus {
  background: #fff;
  border-color: #8b5cf6;
  box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.1);
}

.icon-btn {
  width: 3.25rem;
  height: 3.25rem;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 9999px;
  border: none;
  cursor: pointer;
  transition: all 0.2s;
  flex-shrink: 0;
}

.voice-btn {
  background: #f3f4f6;
  color: #6b7280;
}

.voice-btn:hover {
  background: #e5e7eb;
}

.voice-btn.recording {
  background: #fef2f2;
  color: #ef4444;
  box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.15);
}

.voice-btn.stopped {
  background: #ecfdf5;
  color: #10b981;
}

.send-btn {
  background: #e5e7eb;
  color: #9ca3af;
}

.send-btn.enabled {
  background: #8b5cf6;
  color: #fff;
  box-shadow: 0 6px 16px -4px rgba(139, 92, 246, 0.5);
}

.send-btn.enabled:hover {
  background: #7c3aed;
  transform: scale(0.95);
}

.send-btn:disabled {
  cursor: not-allowed;
}

.upload-preview {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid #f3f4f6;
}

.upload-item {
  position: relative;
  width: 4rem;
  height: 4rem;
  border-radius: 0.5rem;
  overflow: hidden;
  border: 1px solid #e5e7eb;
}

.upload-item img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.upload-item .doc-preview {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: #f9fafb;
  color: #6b7280;
  font-size: 0.625rem;
  gap: 0.25rem;
  padding: 0.25rem;
}

.upload-item .doc-preview span {
  text-align: center;
  word-break: break-word;
  line-height: 1.1;
}

.upload-item .remove-btn {
  position: absolute;
  top: 0.125rem;
  right: 0.125rem;
  width: 1.25rem;
  height: 1.25rem;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.6);
  color: #fff;
  border: none;
  cursor: pointer;
  font-size: 0.875rem;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.2s;
}

.upload-item:hover .remove-btn {
  opacity: 1;
}

/* Recording status bar */
.record-status-bar {
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid #f3f4f6;
}

.record-status-info {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 0.75rem;
}

.status-badge {
  display: inline-flex;
  align-items: center;
  padding: 0.25rem 0.75rem;
  border-radius: 9999px;
  font-size: 0.75rem;
  font-weight: 600;
}

.status-badge.recording {
  background: #fef2f2;
  color: #ef4444;
}

.status-badge.stopped {
  background: #ecfdf5;
  color: #10b981;
}

.status-badge.processing {
  background: #eff6ff;
  color: #3b82f6;
}

.status-badge.done {
  background: #f0fdf4;
  color: #22c55e;
}

.status-badge.error {
  background: #fef2f2;
  color: #ef4444;
}

.record-timer {
  font-size: 0.875rem;
  font-weight: 600;
  color: #6b7280;
  font-variant-numeric: tabular-nums;
}

.audio-preview {
  margin-bottom: 0.75rem;
}

.audio-preview audio {
  width: 100%;
  height: 2rem;
  border-radius: 0.5rem;
}

.processing-indicator {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: #3b82f6;
  font-size: 0.875rem;
  font-weight: 500;
}

.spinner {
  width: 1rem;
  height: 1rem;
  border: 2px solid #3b82f6;
  border-top-color: transparent;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.asr-result {
  background: #f9fafb;
  border-radius: 0.75rem;
  padding: 1rem;
}

.result-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
}

.result-title {
  font-weight: 600;
  color: #1f2937;
  font-size: 0.875rem;
}

.result-meta {
  display: flex;
  gap: 1rem;
  font-size: 0.75rem;
  color: #6b7280;
  margin-bottom: 0.75rem;
}

.result-text {
  font-size: 0.9375rem;
  color: #1f2937;
  line-height: 1.6;
  margin-bottom: 0.75rem;
}

.result-segments {
  border-top: 1px solid #e5e7eb;
  padding-top: 0.75rem;
}

.segment-item {
  display: flex;
  gap: 0.5rem;
  font-size: 0.8125rem;
  color: #4b5563;
  margin-bottom: 0.375rem;
}

.segment-time {
  color: #9ca3af;
  font-variant-numeric: tabular-nums;
  flex-shrink: 0;
}

.segment-text {
  color: #374151;
}

.record-error {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: #ef4444;
  font-size: 0.875rem;
  font-weight: 500;
}
</style>