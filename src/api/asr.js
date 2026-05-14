/**
 * ASR 语音识别 API
 * POST /api/asr/transcribe
 */

export async function uploadAudio(file, filename) {
  const formData = new FormData()
  formData.append('file', file, filename)

  const response = await fetch('/api/asr/transcribe', {
    method: 'POST',
    body: formData,
  })

  if (!response.ok) {
    const err = await response.json().catch(() => ({ detail: '上传失败' }))
    throw new Error(err.detail || '上传失败')
  }

  return response.json()
}

/**
 * @typedef {Object} ASRResponse
 * @property {boolean} success
 * @property {string} message
 * @property {number} code
 * @property {string} language
 * @property {number} language_probability
 * @property {number} duration
 * @property {string} text
 * @property {Array<{start: number, end: number, text: string}>} segments
 */