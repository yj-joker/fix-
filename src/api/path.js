import { request } from './request'

/**
 * 分页获取诊断路径
 * @param {object} params - { keyword, componentDescription, faultDescription, page, size }
 */
export function getDiagnosisPaths(params) {
  return request({
    url: '/weixiu/path/page',
    method: 'GET',
    params
  })
}