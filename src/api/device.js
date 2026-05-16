import { request } from './request'

/**
 * 获取设备概览
 * @param {string} id - 设备ID
 */
export function getDevice(id) {
  return request({
    url: `/weixiu/device/${id}`,
    method: 'GET'
  })
}

/**
 * 新增设备
 * @param {object} deviceDTO
 */
export function saveDevice(deviceDTO) {
  return request({
    url: '/weixiu/device/save',
    method: 'POST',
    data: deviceDTO
  })
}

/**
 * 更新设备
 * @param {object} deviceDTO
 */
export function updateDevice(deviceDTO) {
  return request({
    url: '/weixiu/device/update',
    method: 'PUT',
    data: deviceDTO
  })
}

/**
 * 删除设备
 * @param {string} id
 */
export function deleteDevice(id) {
  return request({
    url: `/weixiu/device/${id}`,
    method: 'DELETE'
  })
}

/**
 * 分页查询部件
 * @param {object} query - { pageNum, pageSize, deviceId }
 */
export function getComponents(query) {
  return request({
    url: '/weixiu/device/components',
    method: 'GET',
    data: query
  })
}