// 检修任务 / 步骤 状态枚举 → 中文文案 + 主题语义色（矿石白 + 克制蓝）。
// 统一在此映射，避免散落硬编码。

/** 任务状态：CREATED → GENERATING → GENERATED → EXECUTING → CLOSED，异常分支 GENERATE_FAILED */
export const TASK_STATUS = {
  CREATED:         { label: '待生成',  color: '#64748b', bg: '#f1f5f9' },
  GENERATING:      { label: '生成中',  color: '#3b82f6', bg: '#eaf2ff', spin: true },
  GENERATED:       { label: '待执行',  color: '#3b82f6', bg: '#eaf2ff' },
  EXECUTING:       { label: '执行中',  color: '#3b82f6', bg: '#eaf2ff' },
  CLOSED:          { label: '已完成',  color: '#16a34a', bg: '#f0fdf4' },
  GENERATE_FAILED: { label: '生成失败', color: '#dc2626', bg: '#fef2f2' },
}
export const taskStatus = (s) => TASK_STATUS[s] || { label: s || '未知', color: '#64748b', bg: '#f1f5f9' }

/** 步骤状态：PENDING → SUBMITTED →(AI_PASSED | AI_REJECTED)→ COMPLETED，可 SKIPPED */
export const STEP_STATUS = {
  PENDING:     { label: '待执行',   color: '#64748b', bg: '#f1f5f9' },
  SUBMITTED:   { label: 'AI验证中', color: '#3b82f6', bg: '#eaf2ff', spin: true },
  AI_PASSED:   { label: 'AI通过',   color: '#16a34a', bg: '#f0fdf4' },
  AI_REJECTED: { label: 'AI未通过', color: '#f59e0b', bg: '#fff7ed' },
  COMPLETED:   { label: '已完成',   color: '#16a34a', bg: '#f0fdf4' },
  SKIPPED:     { label: '已跳过',   color: '#94a3b8', bg: '#f1f5f9' },
}
export const stepStatus = (s) => STEP_STATUS[s] || { label: s || '未知', color: '#64748b', bg: '#f1f5f9' }
/** 步骤是否处于「已了结」（绿/灰，不可再执行） */
export const stepDone = (s) => ['AI_PASSED', 'COMPLETED', 'SKIPPED'].includes(s)
/** 步骤是否可由工人执行/重做 */
export const stepActionable = (s) => ['PENDING', 'AI_REJECTED'].includes(s)

/** 紧急等级：0 低 / 1 普通 / 2 紧急 */
export const URGENCY = [
  { value: 0, label: '低',   color: '#16a34a', bg: '#f0fdf4' },
  { value: 1, label: '普通', color: '#3b82f6', bg: '#eaf2ff' },
  { value: 2, label: '紧急', color: '#dc2626', bg: '#fef2f2' },
]
export const urgency = (v) => URGENCY.find((u) => u.value === v) || URGENCY[1]

/** 检修等级 */
export const MAINTENANCE_LEVEL = [
  { value: 'ROUTINE', label: '日常保养' },
  { value: 'MINOR',   label: '小修' },
  { value: 'MAJOR',   label: '大修' },
]
export const levelLabel = (v) => (MAINTENANCE_LEVEL.find((l) => l.value === v) || {}).label || v || '—'
