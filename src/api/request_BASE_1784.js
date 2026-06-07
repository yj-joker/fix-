const baseURL = '/api'

/**
 * 统一请求封装
 * @param {object} options
 */
export async function request(options) {
  const { url, method = 'GET', data, params, headers = {}, throwOnError = false } = options

  let fullUrl = baseURL + url
  if (params) {
    const searchParams = new URLSearchParams()
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        searchParams.append(key, value)
      }
    })
    const queryString = searchParams.toString()
    if (queryString) {
      fullUrl += '?' + queryString
    }
  }

  const config = {
    method,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
  }

  if (data && method !== 'GET') {
    if (data instanceof FormData) {
      config.body = data
      delete config.headers['Content-Type']
    } else {
      config.body = JSON.stringify(data)
    }
  }

  const response = await fetch(fullUrl, config)

  const contentType = response.headers.get('content-type')
  if (contentType && contentType.includes('application/json')) {
    let text = await response.text()
    // 修复：大于 MAX_SAFE_INTEGER 的数字在解析前转为字符串，避免 JavaScript 精度丢失
    // JavaScript 的 JSON.parse 会把超过 MAX_SAFE_INTEGER 的数字自动截断，reviver 无法恢复
    // 因此在解析前用正则把大数（16位以上）转换成字符串
    text = text.replace(/(\d{16,})/g, '"$1"')
    const json = JSON.parse(text, (key, value) => {
      if (typeof value === 'number' && Math.abs(value) > Number.MAX_SAFE_INTEGER) {
        return String(value)
      }
      return value
    })
    if (throwOnError && json.code !== '200') {
      throw new Error(json.message || json.msg || '请求失败')
    }
    return json
  }

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`)
  }

  return response
}

export default request