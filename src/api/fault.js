import { request } from './request'

/**
 * 获取故障详情
 * @param {string} id - 故障ID
 */
export function getFault(id) {
  return request({
    url: `/weixiu/fault/${id}`,
    method: 'GET'
  })
}

/**
 * 新增故障
 * @param {object} faultDTO
 */
export function saveFault(faultDTO) {
  return request({
    url: '/weixiu/fault/save',
    method: 'POST',
    data: faultDTO
  })
}

/**
 * 更新故障
 * @param {object} faultDTO
 */
export function updateFault(faultDTO) {
  return request({
    url: '/weixiu/fault/update',
    method: 'PUT',
    data: faultDTO
  })
}

/**
 * 删除故障
 * @param {string} id
 */
export function deleteFault(id) {
  return request({
    url: `/weixiu/fault/${id}`,
    method: 'DELETE'
  })
}

/**
 * 分页查询故障解决方案
 * @param {object} query - { pageNum, pageSize, faultId }
 */
export function getSolutions(query) {
  return request({
    url: '/weixiu/fault/solutions',
    method: 'GET',
    data: query
  })
}