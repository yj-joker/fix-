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
          ref="textInput"
          v-model="inputValue"
          type="text"
          class="text-input"
          placeholder="向小v提问..."
          @keyup.enter="handleSend"
        />
        <button
          class="icon-btn voice-btn"
          :class="{ 'recording': isRecording }"
          :disabled="isFlushingPending && !isRecording"
          @click="toggleRecording"
        >
          <svg v-if="!isRecording" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/>
            <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
            <line x1="12" x2="12" y1="19" y2="22"/>
          </svg>
          <svg v-else xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="6" y="6" width="12" height="12" rx="2"/>
          </svg>
        </button>
        <!-- 生成中：显示「停止」；否则显示「发送」 -->
        <button
          v-if="generating"
          class="icon-btn stop-btn"
          title="停止生成"
          @click="$emit('stop')"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <rect x="6" y="6" width="12" height="12" rx="2"/>
          </svg>
        </button>
        <button
          v-else
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
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onUnmounted } from 'vue'
import { uploadAudio } from '@/api/asr'
import { uploadImage } from '@/api/user'

const props = defineProps({
  // 父级是否正在生成回答（用于把「发送」切换成「停止」）
  generating: { type: Boolean, default: false }
})
const emit = defineEmits(['send', 'stop'])

const inputValue = ref('')
const isThinking = ref(false)
const uploadedFiles = ref([])
const textInput = ref(null)

// Recording state
const isRecording = ref(false)
const isFlushingPending = ref(false) // 正在流式输出 pendingText，按钮禁用
let mediaRecorder = null
let audioStream = null
let currentChunks = []
let sendInterval = null
let typeInterval = null // 打字机效果定时器
let pendingText = '' // 上一轮识别结果，等待流式输出
let isFirstChunk = true // 第一个3秒标记

const canSend = computed(() => inputValue.value.trim().length > 0 || uploadedFiles.value.length > 0)

const toggleThinking = () => {
  isThinking.value = !isThinking.value
}

const toggleRecording = () => {
  if (!canToggleRecording.value) return
  if (!isRecording.value) {
    startRecording()
  } else {
    stopRecording()
  }
}

const canToggleRecording = computed(() => {
  // 录音中 或 流式输出中 都可切换（流式输出时按停止会触发 flush）
  return !isFlushingPending.value || isRecording.value
})

// 流式打字效果：将 pendingText 逐字输出到 inputValue
const flushPending = () => {
  if (!pendingText) return
  isFlushingPending.value = true
  isRecording.value = false // 按钮状态切换

  let index = 0
  typeInterval = setInterval(() => {
    if (index < pendingText.length) {
      inputValue.value += pendingText[index]
      index++
    } else {
      clearInterval(typeInterval)
      typeInterval = null
      pendingText = ''
      isFlushingPending.value = false
      // 恢复录音按钮可点击
    }
  }, 50)
}

const startNewMediaRecorder = () => {
  const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
    ? 'audio/webm;codecs=opus'
    : 'audio/webm'
  mediaRecorder = new MediaRecorder(audioStream, { mimeType })
  currentChunks = []

  mediaRecorder.ondataavailable = (event) => {
    if (event.data && event.data.size > 0) {
      currentChunks.push(event.data)
    }
  }

  mediaRecorder.onstop = () => {
    // stop() 触发最终 dataavailable（包含完整 WebM 头部），随后触发 onstop
    // 此时 currentChunks 已包含当前段的完整数据

    if (currentChunks.length > 0) {
      const chunksToSend = currentChunks
      currentChunks = []
      const blob = new Blob(chunksToSend, { type: 'audio/webm' })
      const file = new File([blob], `chunk_${Date.now()}.webm`, { type: 'audio/webm' })

      uploadAudio(file, file.name).then(result => {
        if (result.text) {
          if (isFirstChunk) {
            // 第一个3s：不输出，存入pending，等下一个3s再输出
            pendingText = result.text
            isFirstChunk = false
            // 如果还在录音，重启 MediaRecorder 继续录下一个3s
            if (isRecording.value && audioStream) {
              startNewMediaRecorder()
            }
          } else {
            // 非第一个3s：先把上一轮pending流式输出，把本轮结果存入pending
            const prevText = pendingText
            pendingText = result.text

            // 流式打字效果
            isFlushingPending.value = true
            let index = 0
            typeInterval = setInterval(() => {
              if (index < prevText.length) {
                inputValue.value += prevText[index]
                index++
              } else {
                clearInterval(typeInterval)
                typeInterval = null
                isFlushingPending.value = false
                // flush完成后，如果还在录音，重启 MediaRecorder 继续录下一个3s
                if (isRecording.value && audioStream) {
                  startNewMediaRecorder()
                }
              }
            }, 50)
          }
        }
      }).catch(e => {
        console.error('ASR chunk failed:', e)
        if (isFirstChunk) {
          isFirstChunk = false
        }
      })
    } else {
      // 没有音频数据（停止录音时最后一个chunk可能为空）
      if (isRecording.value && audioStream) {
        startNewMediaRecorder()
      }
    }
  }

  mediaRecorder.start()
}

const startRecording = async () => {
  try {
    audioStream = await navigator.mediaDevices.getUserMedia({ audio: true })
    startNewMediaRecorder()
    isRecording.value = true
    textInput.value?.focus()
    sendInterval = setInterval(() => {
      // 每 3 秒停止当前 MediaRecorder，触发 onstop 发送完整 WebM 分段
      if (mediaRecorder && mediaRecorder.state === 'recording') {
        mediaRecorder.stop()
      }
    }, 3000)
  } catch (err) {
    console.error('Failed to start recording:', err)
  }
}

const stopRecording = () => {
  if (sendInterval) {
    clearInterval(sendInterval)
    sendInterval = null
  }
  // 先标记停止，onstop 中不会再重启 MediaRecorder
  isRecording.value = false
  if (mediaRecorder && mediaRecorder.state !== 'inactive') {
    mediaRecorder.stop()
  }
  if (audioStream) {
    audioStream.getTracks().forEach(track => track.stop())
    audioStream = null
  }
  // 如果有剩余pendingText，停止后立即流式输出
  if (pendingText && !isFlushingPending.value) {
    flushPending()
  }
}

const handleSend = () => {
  if (canSend.value) {
    emit('send', {
      text: inputValue.value,
      files: uploadedFiles.value
    })
    inputValue.value = ''
    uploadedFiles.value = []
  }
}

const handleImageUpload = async (event) => {
  const files = event.target.files
  if (!files.length) return
  for (let i = 0; i < files.length; i++) {
    const file = files[i]
    if (file.type.startsWith('image/')) {
      // 先显示本地预览（占位）
      const localId = Date.now() + i
      const localUrl = URL.createObjectURL(file)
      const item = {
        id: localId,
        name: file.name,
        type: 'image',
        url: localUrl,
        status: 'uploading'
      }
      uploadedFiles.value.push(item)

      // 上传到 MinIO
      try {
        const res = await uploadImage(file)
        // 假设 res.data 或 res.url 是返回的 MinIO URL
        const minioUrl = res.data || res.url || res
        // 找到本地项并更新为真实 URL
        const target = uploadedFiles.value.find(f => f.id === localId)
        if (target) {
          target.url = minioUrl
          target.status = 'success'
        }
      } catch (e) {
        console.error('图片上传失败:', e)
        const target = uploadedFiles.value.find(f => f.id === localId)
        if (target) target.status = 'error'
      }
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
  if (sendInterval) {
    clearInterval(sendInterval)
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

.stop-btn {
  background: #ef4444;
  color: #fff;
  box-shadow: 0 6px 16px -4px rgba(239, 68, 68, 0.5);
}

.stop-btn:hover {
  background: #dc2626;
  transform: scale(0.95);
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
</style>