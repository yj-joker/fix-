import { request } from './request'

export const draftFromTask = (taskId) =>
  request({ url: `/weixiu/case-record/draft-from-task/${taskId}`, method: 'POST', throwOnError: true })

export const submitCase = (data) =>
  request({ url: '/weixiu/case-record/submit', method: 'POST', data, throwOnError: true })

export const getPendingCases = (page = 1, size = 10) =>
  request({ url: '/weixiu/case-record/pending', method: 'GET', params: { page, size } })

export const approveCase = (id, data) =>
  request({ url: `/weixiu/case-record/${id}/approve`, method: 'POST', data, throwOnError: true })

export const rejectCase = (id, comment) =>
  request({ url: `/weixiu/case-record/${id}/reject`, method: 'POST', params: { comment }, throwOnError: true })

export const getMyCases = (page = 1, size = 10) =>
  request({ url: '/weixiu/case-record/mine', method: 'GET', params: { page, size } })

// Legacy wrappers kept for older admin/business pages.
export const saveCaseRecord = (caseRecordDTO) =>
  request({ url: '/weixiu/case-record/save', method: 'POST', data: caseRecordDTO })

export const updateCaseRecord = (caseRecordDTO) =>
  request({ url: '/weixiu/case-record/update', method: 'PUT', data: caseRecordDTO })

export const deleteCaseRecord = (id) =>
  request({ url: `/weixiu/case-record/${id}`, method: 'DELETE' })
