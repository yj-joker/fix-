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
    // 在 JSON.parse 之前将超过安全范围的整数加引号转为字符串，
    // 从根本上避免 IEEE-754 双精度浮点数解析时的精度丢失。
    // reviver 方案无效：原生解析器在调用 reviver 前已将数字解析为 JS number，精度已丢失。
    text = text.replace(/:(\s*)(-?\d{15,})(\s*[,}\]])/g, ':$1"$2"$3')
    const json = JSON.parse(text)
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