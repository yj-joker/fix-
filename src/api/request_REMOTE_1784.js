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
    // 修复：大于 MAX_SAFE_INTEGER 的「大整数」在解析前转为字符串，避免 JavaScript 精度丢失
    // JavaScript 的 JSON.parse 会把超过 MAX_SAFE_INTEGER 的数字自动截断，reviver 无法恢复
    // 注意：必须只匹配「整数 token」——用前后断言排除小数 / 科学计数，
    //       否则会把长小数（如向量、余弦分数 0.873429102938...）的尾巴也加上引号，
    //       导致 JSON.parse 抛 "Unterminated fractional number"
    text = text.replace(/(?<![\d.])(\d{16,})(?![\d.eE])/g, '"$1"')
    const json = JSON.parse(text, (key, value) => {
      if (typeof value === 'number' && Math.abs(value) > Number.MAX_SAFE_INTEGER) {
        return String(value)
      }
      return value
    })
    // 会话失效（后端 SessionInterceptor 返回 401）：清登录态并跳登录页。
    // 登录页自身的请求不处理，避免回环。
    if (json && String(json.code) === '401' && location.pathname !== '/login') {
      try { localStorage.removeItem('userInfo') } catch (e) {}
      location.href = '/login'
    }
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