<script setup>
import { ref, reactive, watch, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { listTasks } from '@/api/maintenanceTask'
import { notifyStore } from '@/stores/notifyStore'
import { taskStatus, TASK_STATUS, urgency } from '@/constants/taskStatus'
import TaskCreateDialog from '@/components/task/TaskCreateDialog.vue'

const router = useRouter()
const loading = ref(false)
const tasks = ref([])
const total = ref(0)
const showCreate = ref(false)
const query = reactive({ page: 1, size: 12, status: '', deviceName: '' })

async function load() {
  loading.value = true
  try {
    const res = await listTasks({ ...query, status: query.status || undefined, deviceName: query.deviceName || undefined })
    const d = res?.data || {}
    tasks.value = d.records || []
    total.value = Number(d.total || 0)
  } catch (err) { ElMessage.error('加载任务失败：' + (err.message || '')) }
  finally { loading.value = false }
}

function resetSearch() { query.page = 1; load() }
function open(t) { router.push(`/user/tasks/${t.id}`) }
function onCreated(taskId) { load(); if (taskId) router.push(`/user/tasks/${taskId}`) }

// 收到 WS 通知（生成完成等）后自动刷新列表
watch(() => notifyStore.state.notifications.length, () => load())

onMounted(load)
</script>

<template>
  <div class="tasks">
    <div class="head">
      <div class="title"><span class="led" />检修任务</div>
      <button class="new" @click="showCreate = true">＋ 新建任务</button>
    </div>

    <div class="filters">
      <el-select v-model="query.status" clearable placeholder="全部状态" size="default" style="width:150px" @change="resetSearch">
        <el-option v-for="(v,k) in TASK_STATUS" :key="k" :label="v.label" :value="k" />
      </el-select>
      <el-input v-model="query.deviceName" clearable placeholder="按设备名搜索" style="width:200px"
                @keyup.enter="resetSearch" @clear="resetSearch" />
      <button class="search" @click="resetSearch">搜索</button>
    </div>

    <div v-loading="loading" class="list">
      <div v-for="t in tasks" :key="t.id" class="card" @click="open(t)">
        <div class="c-top">
          <span class="c-no">{{ t.taskNumber || ('#' + t.id) }}</span>
          <span class="c-badge" :style="{ color: taskStatus(t.status).color, background: taskStatus(t.status).bg }">
            <span v-if="taskStatus(t.status).spin" class="dot-spin" />{{ taskStatus(t.status).label }}
          </span>
        </div>
        <div class="c-device">
          <span class="u-tag" :style="{ color: urgency(t.urgencyLevel).color, background: urgency(t.urgencyLevel).bg }">{{ urgency(t.urgencyLevel).label }}</span>
          {{ t.deviceName || '未指定设备' }}
        </div>
        <div class="c-fault">{{ t.faultDescription }}</div>
        <div class="c-foot">
          <span>{{ t.stepCount || 0 }} 步</span>
          <span>{{ (t.createdAt || '').replace('T', ' ').slice(0, 16) }}</span>
        </div>
      </div>
      <div v-if="!loading && !tasks.length" class="empty">暂无检修任务，点右上角「新建任务」开始</div>
    </div>

    <div v-if="total > query.size" class="pager">
      <el-pagination layout="prev, pager, next" :total="total" :page-size="query.size"
                     :current-page="query.page" @current-change="(p) => { query.page = p; load() }" background />
    </div>

    <TaskCreateDialog v-model="showCreate" @created="onCreated" />
  </div>
</template>

<style scoped>
.tasks { max-width: 1100px; margin: 0 auto; }
.head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 18px; }
.title { display: flex; align-items: center; gap: 10px; font-size: 20px; font-weight: 700; color: #334155; }
.led { width: 8px; height: 8px; border-radius: 50%; background: #3b82f6; box-shadow: 0 0 0 3px rgba(59,130,246,.16); }
.new { background: #3b82f6; color: #fff; border: none; border-radius: 8px; padding: 9px 18px; font-weight: 600; font-size: 14px; cursor: pointer; box-shadow: 0 2px 8px rgba(59,130,246,.25); }
.new:hover { background: #2563eb; }
.filters { display: flex; gap: 10px; margin-bottom: 18px; }
.search { background: #fff; border: 1px solid #e6eaf1; color: #334155; border-radius: 8px; padding: 0 16px; font-weight: 600; font-size: 13px; cursor: pointer; }
.search:hover { border-color: #3b82f6; color: #3b82f6; }
.list { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 14px; min-height: 200px; }
.card { background: #fff; border: 1px solid #e6eaf1; border-radius: 12px; padding: 15px 16px; cursor: pointer; transition: .15s; box-shadow: 0 2px 12px rgba(51,65,85,.05); }
.card:hover { border-color: #3b82f6; box-shadow: 0 6px 22px rgba(59,130,246,.14); transform: translateY(-1px); }
.c-top { display: flex; align-items: center; justify-content: space-between; }
.c-no { font-family: 'JetBrains Mono', monospace; font-size: 13px; color: #64748b; }
.c-badge { font-size: 12px; font-weight: 600; padding: 2px 10px; border-radius: 20px; display: inline-flex; align-items: center; gap: 5px; }
.dot-spin { width: 9px; height: 9px; border-radius: 50%; border: 2px solid rgba(59,130,246,.3); border-top-color: #3b82f6; animation: spin .8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
.c-device { display: flex; align-items: center; gap: 8px; margin: 10px 0 6px; font-size: 15px; font-weight: 600; color: #334155; }
.u-tag { font-size: 11px; font-weight: 700; padding: 1px 8px; border-radius: 6px; }
.c-fault { font-size: 13px; color: #64748b; line-height: 1.6; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; min-height: 42px; }
.c-foot { display: flex; justify-content: space-between; margin-top: 10px; font-size: 12px; color: #94a3b8; }
.empty { grid-column: 1 / -1; text-align: center; color: #94a3b8; padding: 60px 0; }
.pager { display: flex; justify-content: center; margin-top: 22px; }
</style>
