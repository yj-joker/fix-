import { request } from './request'

// 检修任务接口（基址 /weixiu/task）。普通用户调用时后端按 userType 自动只返回本人任务。
// 注意：/promote、/promote-to-graph、/skip-promotion 是 @RequireAdmin，用户端不调用。
const BASE = '/weixiu/task'

/** 创建检修任务（触发异步生成步骤，返回 MaintenanceTaskVO） */
export function createTask(data) {
  return request({ url: BASE, method: 'POST', data, throwOnError: true })
}

/** 重新生成步骤（GENERATE_FAILED → GENERATING） */
export function retryGenerate(taskId) {
  return request({ url: `${BASE}/${taskId}/retry`, method: 'POST', throwOnError: true })
}

/** 开始执行（GENERATED → EXECUTING） */
export function startTask(taskId) {
  return request({ url: `${BASE}/${taskId}/start`, method: 'POST', throwOnError: true })
}

/** 提交/执行某步骤（触发异步 AI 验证），data: { images, note, checkpointConfirmed } */
export function executeStep(taskId, stepId, data) {
  return request({ url: `${BASE}/${taskId}/steps/${stepId}/execute`, method: 'POST', data, throwOnError: true })
}

/** 强制完成步骤（AI 未通过但工人确认无误） */
export function forceCompleteStep(taskId, stepId, reason = '') {
  return request({ url: `${BASE}/${taskId}/steps/${stepId}/force-complete`, method: 'POST', data: { reason }, throwOnError: true })
}

/** 任务详情（含步骤列表） */
export function getTaskDetail(taskId) {
  return request({ url: `${BASE}/${taskId}`, method: 'GET' })
}

/** 任务列表（分页，1 基页码） */
export function listTasks({ page = 1, size = 12, status, deviceName } = {}) {
  return request({ url: BASE, method: 'GET', params: { page, size, status, deviceName } })
}

/** 步骤列表 */
export function listSteps(taskId) {
  return request({ url: `${BASE}/${taskId}/steps`, method: 'GET' })
}

/**
 * 步骤 AI 答疑（SSE 流式）。后端原样转发 Python 事件流，
 * 故返回的是原始事件 JSON（{event,data}），调用方用 getReader 解析。
 * 经 vite 代理 /api → 8080，自动带 session cookie。
 * @returns {Promise<Response>}
 */
export function stepChatStream(taskId, stepId, message, images = [], signal) {
  return fetch(`/api/weixiu/task/${taskId}/steps/${stepId}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    signal,
    body: JSON.stringify({ message, images }),
  })
}
