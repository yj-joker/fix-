import { request } from './request'

// ============ 浏览 / 展开（双端共用，只读） ============

/** 搜索设备（空 keyword 返回全部，上限 50），作为图谱入口 */
export function searchDevices(keyword = '', limit = 30) {
  return request({ url: '/weixiu/device/search', method: 'GET', params: { keyword, limit } })
}

/** 设备概览（含部件数 / 故障数） */
export function getDeviceOverview(id) {
  return request({ url: `/weixiu/device/${id}`, method: 'GET' })
}

/** 设备 → 部件（OWNS） */
export function getDeviceComponents(deviceId, componentName) {
  return request({ url: '/weixiu/device/components', method: 'POST', data: { deviceId, componentName } })
}

/** 部件 → 故障（CAUSES） */
export function getComponentFaults(componentId, faultName) {
  return request({ url: '/weixiu/component/faults', method: 'POST', data: { componentId, faultName } })
}

/** 故障 → 解决方案（HAS_SOLUTION） */
export function getFaultSolutions(faultId, solutionTitle) {
  return request({ url: '/weixiu/fault/solutions', method: 'POST', data: { faultId, solutionTitle } })
}

/** 诊断路径搜索：按故障/部件描述召回完整链路子图 */
export function searchDiagnosisPaths(payload) {
  return request({
    url: '/weixiu/path/search',
    method: 'POST',
    data: { page: 0, size: 12, minScore: 0.5, ...payload },
  })
}

/** 单实体详情 */
export function getEntity(type, id) {
  return request({ url: `/weixiu/${type}/${id}`, method: 'GET' })
}

// ============ 审核（仅 admin 端调用） ============

/** 未验证的自动抽取方案队列 */
export function listUnverified(limit = 80) {
  return request({ url: '/weixiu/graph/unverified', method: 'GET', params: { limit } })
}

/** 审核通过：方案 verified=true */
export function approveSolution(solutionId) {
  return request({ url: `/weixiu/graph/approve/${solutionId}`, method: 'POST', throwOnError: true })
}

/** 审核拒绝：删除该自动抽取节点 */
export function rejectNode(label, nodeId) {
  return request({ url: '/weixiu/graph/reject', method: 'DELETE', params: { label, nodeId }, throwOnError: true })
}
