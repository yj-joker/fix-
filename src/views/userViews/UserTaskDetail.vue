<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { getTaskDetail, startTask, retryGenerate } from '@/api/maintenanceTask'
import { notifyStore } from '@/stores/notifyStore'
import { taskAssistantStore } from '@/stores/taskAssistantStore'
import { taskStatus, urgency, levelLabel, stepActionable } from '@/constants/taskStatus'
import TaskStepCard from '@/components/task/TaskStepCard.vue'
import TaskAssistantPanel from '@/components/task/TaskAssistantPanel.vue'

const route = useRoute()
const router = useRouter()
const taskId = route.params.id

const task = ref(null)
const loading = ref(false)
const acting = ref(false)
const panelRef = ref(null)

const steps = computed(() => (task.value?.steps || []).slice().sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0)))
// 当前应执行的步骤 = 第一个「待执行 / 未通过」的步骤
const activeStepId = computed(() => {
  const s = steps.value.find((x) => stepActionable(x.status))
  return s ? s.id : null
})
const st = computed(() => taskStatus(task.value?.status))
// 有步骤可看（可用助手）的状态
const showWork = computed(() => ['EXECUTING', 'CLOSED'].includes(task.value?.status))

async function load() {
  loading.value = true
  try {
    const res = await getTaskDetail(taskId)
    task.value = res?.data || null
  } catch (err) { ElMessage.error('加载失败：' + (err.message || '')) }
  finally { loading.value = false }
}

async function onStart() {
  acting.value = true
  try { await startTask(taskId); ElMessage.success('已开始执行'); await load() }
  catch (err) { ElMessage.error('操作失败：' + (err.message || '')) }
  finally { acting.value = false }
}

async function onRetry() {
  acting.value = true
  try {
    await retryGenerate(taskId)
    notifyStore.trackJob({ key: 'task:' + taskId, kind: 'task', refId: taskId, title: '重新生成检修步骤' })
    ElMessage.success('已重新触发生成')
    await load()
  } catch (err) { ElMessage.error('操作失败：' + (err.message || '')) }
  finally { acting.value = false }
}

// 点步骤卡「答疑」→ 助手聚焦到该步并聚焦输入框（同一条对话，不再弹抽屉）
function onChat(step) {
  taskAssistantStore.setFocus(taskId, step.id)
  panelRef.value?.focusInput?.()
}

// 收到 WS 通知（步骤验证 / 生成完成）后刷新
watch(() => notifyStore.state.notifications.length, () => load())

onMounted(load)
</script>

<template>
  <div class="detail" :class="{ wide: showWork }" v-loading="loading">
    <button class="back" @click="router.push('/user/tasks')">‹ 返回任务列表</button>

    <template v-if="task">
      <!-- 任务头 -->
      <div class="t-head">
        <div class="t-main">
          <span class="t-no">{{ task.taskNumber || ('#' + task.id) }}</span>
          <span class="t-badge" :style="{ color: st.color, background: st.bg }">
            <span v-if="st.spin" class="dot-spin" />{{ st.label }}
          </span>
        </div>
        <h2 class="t-device">
          <span class="u-tag" :style="{ color: urgency(task.urgencyLevel).color, background: urgency(task.urgencyLevel).bg }">{{ urgency(task.urgencyLevel).label }}</span>
          {{ task.deviceName || '未指定设备' }}
        </h2>
        <p class="t-fault">{{ task.faultDescription }}</p>
        <div class="t-meta">
          <span>检修等级：{{ levelLabel(task.maintenanceLevel) }}</span>
          <span v-if="task.procedureName">规程：{{ task.procedureName }}</span>
          <span>{{ (task.createdAt || '').replace('T',' ').slice(0,16) }}</span>
        </div>
        <div v-if="(task.reportImages||[]).length" class="t-imgs">
          <img v-for="(u,i) in task.reportImages" :key="i" :src="u" alt="" />
        </div>
      </div>

      <!-- 生成中 -->
      <div v-if="task.status === 'GENERATING'" class="state-box">
        <div class="ring" /> 正在生成检修步骤，请稍候…（完成后会自动刷新并提示）
      </div>

      <!-- 生成失败 -->
      <div v-else-if="task.status === 'GENERATE_FAILED'" class="state-box fail">
        步骤生成失败。
        <button class="act ok" :disabled="acting" @click="onRetry">重新生成</button>
      </div>

      <!-- 待执行 -->
      <div v-else-if="task.status === 'GENERATED'" class="state-box">
        已生成 {{ task.stepCount || steps.length }} 个步骤，准备就绪。
        <button class="act ok" :disabled="acting" @click="onStart">开始执行</button>
      </div>

      <!-- 执行中 / 已完成：步骤列表 + 常驻助手 -->
      <template v-else>
        <div v-if="task.status === 'CLOSED'" class="state-box done">✓ 该检修任务已全部完成</div>
        <div class="work">
          <div class="col-steps">
            <div class="steps">
              <TaskStepCard v-for="s in steps" :key="s.id" :step="s" :task-id="taskId"
                            :executing="task.status === 'EXECUTING'" :active="s.id === activeStepId"
                            @submitted="load" @chat="onChat" />
            </div>
          </div>
          <aside class="col-assistant">
            <TaskAssistantPanel ref="panelRef" :task-id="taskId" :steps="steps" :active-step-id="activeStepId" />
          </aside>
        </div>
      </template>
    </template>
  </div>
</template>

<style scoped>
.detail { max-width: 860px; margin: 0 auto; min-height: 300px; }
.detail.wide { max-width: 1240px; }
.back { background: none; border: none; color: #3b82f6; font-size: 14px; cursor: pointer; padding: 0; margin-bottom: 14px; }
.back:hover { text-decoration: underline; }
.t-head { background: #fff; border: 1px solid #e6eaf1; border-radius: 12px; padding: 18px 20px; box-shadow: 0 2px 12px rgba(51,65,85,.05); }
.t-main { display: flex; align-items: center; gap: 12px; }
.t-no { font-family: 'JetBrains Mono', monospace; font-size: 13px; color: #64748b; }
.t-badge { font-size: 12px; font-weight: 600; padding: 2px 10px; border-radius: 20px; display: inline-flex; align-items: center; gap: 5px; }
.dot-spin { width: 9px; height: 9px; border-radius: 50%; border: 2px solid rgba(59,130,246,.3); border-top-color: #3b82f6; animation: spin .8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
.t-device { display: flex; align-items: center; gap: 10px; font-size: 20px; font-weight: 700; color: #334155; margin: 12px 0 8px; }
.u-tag { font-size: 12px; font-weight: 700; padding: 2px 9px; border-radius: 6px; }
.t-fault { font-size: 14px; color: #475569; line-height: 1.7; margin: 0 0 10px; }
.t-meta { display: flex; gap: 16px; flex-wrap: wrap; font-size: 12px; color: #94a3b8; }
.t-imgs { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 12px; }
.t-imgs img { width: 84px; height: 84px; object-fit: cover; border-radius: 8px; border: 1px solid #e6eaf1; }
.state-box { display: flex; align-items: center; gap: 12px; background: #fff; border: 1px solid #e6eaf1; border-radius: 12px;
  padding: 18px 20px; margin-top: 16px; font-size: 14px; color: #475569; }
.state-box.fail { border-color: #fecaca; background: #fef2f2; color: #b91c1c; }
.state-box.done { border-color: #bbf7d0; background: #f0fdf4; color: #16a34a; font-weight: 600; }
.ring { width: 22px; height: 22px; border-radius: 50%; border: 3px solid rgba(59,130,246,.2); border-top-color: #3b82f6; animation: spin 1s linear infinite; }
.act { padding: 8px 18px; border-radius: 8px; font-weight: 600; font-size: 13px; cursor: pointer; border: 1px solid; margin-left: auto; }
.act.ok { background: #3b82f6; color: #fff; border-color: #3b82f6; }
.act.ok:hover { background: #2563eb; }
.act:disabled { opacity: .6; cursor: not-allowed; }

/* 两栏：步骤 + 常驻助手 */
.work { display: flex; gap: 16px; align-items: flex-start; margin-top: 16px; }
.col-steps { flex: 1; min-width: 0; }
.steps { display: flex; flex-direction: column; gap: 14px; }
.col-assistant { width: 384px; flex-shrink: 0; position: sticky; top: 8px; height: calc(100vh - 120px); }

@media (max-width: 980px) {
  .work { flex-direction: column; }
  .col-assistant { width: 100%; position: static; height: 520px; }
}
</style>
