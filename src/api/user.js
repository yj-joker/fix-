import { request } from './request'

/**
 * 用户登录
 * @param {string} username
 * @param {string} password
 */
export function login(username, password) {
  return request({
    url: '/weixiu/user/login',
    method: 'POST',
    data: { username, password }
  })
}

/**
 * 发送邮箱验证码
 * @param {string} email
 * @param {number} mode - 0: 修改密码, 1: 绑定邮箱
 */
export function sendEmail(email, mode) {
  return request({
    url: '/weixiu/user/sendEmail',
    method: 'POST',
    params: { email, mode }
  })
}

/**
 * 验证邮箱验证码
 * @param {string} code
 * @param {number} mode
 * @param {string} emailOrPassword
 */
export function verifyEmail(code, mode, emailOrPassword) {
  return request({
    url: '/weixiu/user/verifyEmail',
    method: 'POST',
    params: { code, mode, emailOrPassword }
  })
}

/**
 * 根据用户ID查询用户信息
 * @param {number} id
 */
export function getUserById(id) {
  return request({
    url: '/weixiu/user/getUserById',
    method: 'POST',
    params: { id }
  })
}

/**
 * 分页查询用户列表
 * @param {object} query - { pageNum, pageSize, username, type }
 */
export function getUserList(query) {
  return request({
    url: '/weixiu/user/list',
    method: 'POST',
    data: query
  })
}

/**
 * 修改用户信息
 * @param {object} userDTO
 */
export function updateUser(userDTO) {
  return request({
    url: '/weixiu/user/updateUser',
    method: 'PUT',
    data: userDTO
  })
}

/**
 * 批量删除用户
 * @param {number[]} ids
 */
export function deleteUsers(ids) {
  return request({
    url: '/weixiu/user/deleteByIds',
    method: 'DELETE',
    data: ids
  })
}

/**
 * 上传图片
 * @param {File} file
 */
export function uploadImage(file) {
  const formData = new FormData()
  formData.append('file', file)
  return request({
    url: '/weixiu/user/uploadByMinIO',
    method: 'POST',
    params: { bucket: 'PUBLIC' },
    data: formData,
    throwOnError: true
  })
}
