import { request } from './request'

/**
 * 获取部件详情
 * @param {string} id - 部件ID
 */
export function getComponent(id) {
  return request({
    url: `/weixiu/component/${id}`,
    method: 'GET'
  })
}

/**
 * 新增部件
 * @param {object} componentDTO
 */
export function saveComponent(componentDTO) {
  return request({
    url: '/weixiu/component/save',
    method: 'POST',
    data: componentDTO
  })
}

/**
 * 更新部件
 * @param {object} componentDTO
 */
export function updateComponent(componentDTO) {
  return request({
    url: '/weixiu/component/update',
    method: 'PUT',
    data: componentDTO
  })
}

/**
 * 删除部件
 * @param {string} id
 */
export function deleteComponent(id) {
  return request({
    url: `/weixiu/component/${id}`,
    method: 'DELETE'
  })
}

/**
 * 查询部件的故障
 * @param {object} query - { pageNum, pageSize, componentId }
 */
export function getComponentFaults(query) {
  return request({
    url: '/weixiu/component/faults',
    method: 'GET',
    data: query
  })
}

/**
 * 根据嵌入向量查询部件
 * @param {string} description
 * @param {number} limit
 * @param {number} minScore
 */
export function getComponentByEmbedding(description, limit = 10, minScore = 0.5) {
  return request({
    url: '/weixiu/component/getComponentByEmbedding',
    method: 'GET',
    params: { description, limit, minScore }
  })
}