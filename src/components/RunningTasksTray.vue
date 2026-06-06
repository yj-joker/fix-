<script setup>
import { computed, ref, onBeforeUnmount } from 'vue'
import { notifyStore } from '@/stores/notifyStore'

const jobs = computed(() => Object.values(notifyStore.state.jobs).filter(j => j.status === 'running'))

// 每秒自增的响应式时钟，驱动「已运行 X 秒」重新计算
const now = ref(Date.now())
const ticker = setInterval(() => { now.value = Date.now() }, 1000)
onBeforeUnmount(() => clearInterval(ticker))

function elapsed(ts) {
  const s = Math.max(0, Math.floor((now.value - ts) / 1000))
  if (s < 60) return s + ' 秒'
  return Math.floor(s / 60) + ' 分 ' + (s % 60) + ' 秒'
}
</script>

<template>
  <transition name="tray">
    <div v-if="jobs.length" class="tasks-tray">
      <div class="tray-head">
        <span class="spin" />
        <span class="tray-title">后台任务进行中</span>
        <span class="tray-count">{{ jobs.length }}</span>
      </div>
      <ul class="tray-list">
        <li v-for="job in jobs" :key="job.key" class="tray-item">
          <span class="dot-spin" />
          <div class="ti-main">
            <div class="ti-title">{{ job.title }}</div>
            <div class="ti-sub">已运行 {{ elapsed(job.startedAt) }} · 完成后将自动提示</div>
          </div>
          <button class="ti-x" title="从列表移除（不影响后台执行）" @click="notifyStore.dismiss(job.key)">✕</button>
        </li>
      </ul>
    </div>
  </transition>
</template>

<style scoped>
.tasks-tray {
  position: fixed;
  right: 20px;
  bottom: 20px;
  width: 300px;
  background: #fff;
  border: 1px solid #e6eaf1;
  border-radius: 12px;
  box-shadow: 0 12px 36px rgba(51, 65, 85, 0.16);
  z-index: 3000;
  overflow: hidden;
  font-family: 'Public Sans', 'Inter', -apple-system, 'Microsoft YaHei', sans-serif;
}
.tray-head {
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 11px 14px;
  background: linear-gradient(180deg, #f5f8ff, #fff);
  border-bottom: 1px solid #eef2fb;
}
.tray-title { font-size: 13px; font-weight: 700; color: #334155; flex: 1; }
.tray-count {
  font-size: 12px; font-weight: 700; color: #3b82f6;
  background: rgba(59, 130, 246, 0.12); border-radius: 10px; padding: 1px 8px;
}
.spin {
  width: 14px; height: 14px; border-radius: 50%;
  border: 2px solid rgba(59, 130, 246, 0.25); border-top-color: #3b82f6;
  animation: spin 0.8s linear infinite;
}
.tray-list { list-style: none; margin: 0; padding: 6px; max-height: 280px; overflow-y: auto; }
.tray-item {
  display: flex; align-items: center; gap: 10px;
  padding: 9px 8px; border-radius: 8px; transition: background 0.15s;
}
.tray-item:hover { background: #f7faff; }
.dot-spin {
  width: 16px; height: 16px; flex-shrink: 0; border-radius: 50%;
  border: 2px solid rgba(245, 158, 11, 0.25); border-top-color: #f59e0b;
  animation: spin 0.9s linear infinite;
}
.ti-main { flex: 1; min-width: 0; }
.ti-title { font-size: 13px; font-weight: 600; color: #334155; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.ti-sub { font-size: 11px; color: #94a3b8; margin-top: 2px; }
.ti-x {
  border: none; background: none; color: #cbd5e1; cursor: pointer; font-size: 13px;
  width: 22px; height: 22px; border-radius: 6px; flex-shrink: 0;
}
.ti-x:hover { background: #f1f5f9; color: #64748b; }

@keyframes spin { to { transform: rotate(360deg); } }
.tray-enter-active, .tray-leave-active { transition: all 0.25s ease; }
.tray-enter-from, .tray-leave-to { opacity: 0; transform: translateY(16px); }
</style>
