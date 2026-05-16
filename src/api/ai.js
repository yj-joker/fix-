import { request } from './request'

/**
 * AI对话
 * @param {object} chatRequest - { sessionId, deviceId, userMessage, images }
 */
export function chat(chatRequest) {
  return request({
    url: '/weixiu/ai/chat',
    method: 'POST',
    data: chatRequest
  })
}

/**
 * 语音转文本
 * @param {File} file - 音频文件
 * @param {string} filename
 */
export function transcribe(file, filename) {
  const formData = new FormData()
  formData.append('file', file, filename)
  return request({
    url: '/weixiu/ai/transcribe',
    method: 'POST',
    data: formData,
    headers: { 'Content-Type': 'multipart/form-data' }
  })
}