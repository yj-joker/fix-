import { request } from './request'

/**
 * 获取案例记录详情
 * @param {string} id - 案例记录ID
 */
export function getCaseRecord(id) {
  return request({
    url: `/weixiu/case-record/${id}`,
    method: 'GET'
  })
}

/**
 * 新增案例记录
 * @param {object} caseRecordDTO
 */
export function saveCaseRecord(caseRecordDTO) {
  return request({
    url: '/weixiu/case-record/save',
    method: 'POST',
    data: caseRecordDTO
  })
}

/**
 * 更新案例记录
 * @param {object} caseRecordDTO
 */
export function updateCaseRecord(caseRecordDTO) {
  return request({
    url: '/weixiu/case-record/update',
    method: 'PUT',
    data: caseRecordDTO
  })
}

/**
 * 删除案例记录
 * @param {string} id
 */
export function deleteCaseRecord(id) {
  return request({
    url: `/weixiu/case-record/${id}`,
    method: 'DELETE'
  })
}