export function readSseChunk(buffer, onData) {
  let rest = buffer
  let boundary

  while ((boundary = rest.indexOf('\n\n')) !== -1) {
    const eventText = rest.slice(0, boundary)
    rest = rest.slice(boundary + 2)
    emitEventData(eventText, onData)
  }

  return rest
}

export function flushSseBuffer(buffer, onData) {
  if (buffer) emitEventData(buffer, onData)
}

function emitEventData(eventText, onData) {
  const payload = eventText
    .split('\n')
    .filter((line) => line.startsWith('data:'))
    .map((line) => line.slice(5).trimStart())
    .join('\n')

  if (!payload || payload === '[DONE]') return
  onData(normalizeSsePayload(payload))
}

function normalizeSsePayload(payload) {
  try {
    const json = JSON.parse(payload)
    if (json.event === 'token') return json.data?.content || ''
    if (json.event === 'error') return `\n[出错] ${json.data?.message || '生成失败'}`
    if (typeof json.content === 'string') return json.content
    if (typeof json.message === 'string') return json.message
    return ''
  } catch {
    return payload
  }
}
