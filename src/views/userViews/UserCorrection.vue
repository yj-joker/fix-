<script setup>
import { ref } from 'vue'
import { Check, Close, Edit, Send } from '@element-plus/icons-vue'

const corrections = ref([
  { id: 1, title: '发电机维护流程补充', original: '每半年维护一次', corrected: '每季度维护一次', status: 'approved', submitTime: '2024-01-15', reviewTime: '2024-01-15' },
  { id: 2, title: '电气故障代码解析修正', original: 'P0300: 点火系统故障', corrected: 'P0300: 检测到失火', status: 'pending', submitTime: '2024-01-14', reviewTime: '-' },
  { id: 3, title: '液压压力参数校准', original: '正常工作压力: 250bar', corrected: '正常工作压力: 200-250bar', status: 'approved', submitTime: '2024-01-13', reviewTime: '2024-01-13' },
  { id: 4, title: '保养周期标准调整', original: '首保: 2000小时', corrected: '首保: 1000小时', status: 'rejected', submitTime: '2024-01-10', reviewTime: '2024-01-11' },
])

const activeTab = ref('all')

const tabs = [
  { key: 'all', label: '全部' },
  { key: 'pending', label: '待审核' },
  { key: 'approved', label: '已通过' },
  { key: 'rejected', label: '已驳回' },
]

const filteredCorrections = () => {
  if (activeTab.value === 'all') return corrections.value
  return corrections.value.filter(c => c.status === activeTab.value)
}

function deleteCorrection(id) {
  const index = corrections.value.findIndex(c => c.id === id)
  if (index > -1) corrections.value.splice(index, 1)
}
</script>

<template>
  <div class="user-correction">
    <!-- Page Header -->
    <div class="page-header">
      <div class="page-title-area">
        <h2 class="page-title">结果校正</h2>
        <p class="page-desc">对系统输出结果进行人工标注与校正</p>
      </div>
      <el-button type="primary">
        <el-icon><Edit /></el-icon>
        提交校正
      </el-button>
    </div>

    <!-- Tabs -->
    <div class="tabs-bar">
      <button
        v-for="tab in tabs"
        :key="tab.key"
        class="tab-btn"
        :class="{ active: activeTab === tab.key }"
        @click="activeTab = tab.key"
      >
        {{ tab.label }}
      </button>
    </div>

    <!-- Corrections List -->
    <div class="corrections-list">
      <div v-for="item in filteredCorrections()" :key="item.id" class="correction-card">
        <div class="correction-header">
          <h3 class="correction-title">{{ item.title }}</h3>
          <span class="status-tag" :class="item.status">
            {{ item.status === 'approved' ? '已通过' : item.status === 'pending' ? '待审核' : '已驳回' }}
          </span>
        </div>

        <div class="correction-content">
          <div class="correction-item original">
            <span class="item-label">原内容</span>
            <p class="item-text">{{ item.original }}</p>
          </div>
          <div class="correction-arrow">
            <el-icon><Edit /></el-icon>
          </div>
          <div class="correction-item corrected">
            <span class="item-label">校正后</span>
            <p class="item-text">{{ item.corrected }}</p>
          </div>
        </div>

        <div class="correction-footer">
          <div class="footer-meta">
            <span>提交时间：{{ item.submitTime }}</span>
            <span>审核时间：{{ item.reviewTime }}</span>
          </div>
          <div class="footer-actions">
            <el-button size="small" text>
              <el-icon><Edit /></el-icon>
              编辑
            </el-button>
            <el-button size="small" text type="danger" @click="deleteCorrection(item.id)">
              <el-icon><Delete /></el-icon>
            </el-button>
          </div>
        </div>
      </div>

      <div v-if="filteredCorrections().length === 0" class="empty-state">
        <p>暂无校正记录</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.user-correction {
  max-width: 900px;
  margin: 0 auto;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 24px;
}
.page-title {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--plaza-text);
  margin-bottom: 4px;
}
.page-desc {
  font-size: 14px;
  color: var(--plaza-text-muted);
}

.tabs-bar {
  display: flex;
  gap: 8px;
  margin-bottom: 20px;
}
.tab-btn {
  padding: 8px 18px;
  background: var(--plaza-bg-card);
  border: 1px solid var(--plaza-border);
  border-radius: 10px;
  font-size: 14px;
  color: var(--plaza-text-muted);
  cursor: pointer;
  transition: all 0.2s ease;
}
.tab-btn:hover {
  border-color: var(--plaza-accent);
  color: var(--plaza-accent);
}
.tab-btn.active {
  background: var(--plaza-accent-soft);
  border-color: var(--plaza-accent);
  color: var(--plaza-accent);
  font-weight: 500;
}

.corrections-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.correction-card {
  background: var(--plaza-bg-card);
  border: 1px solid var(--plaza-border);
  border-radius: 14px;
  padding: 20px;
  transition: border-color 0.2s ease;
}
.correction-card:hover {
  border-color: var(--plaza-accent);
}
.correction-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}
.correction-title {
  font-size: 1rem;
  font-weight: 600;
  color: var(--plaza-text);
}
.status-tag {
  padding: 4px 12px;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 500;
}
.status-tag.approved {
  background: rgba(34, 197, 94, 0.1);
  color: var(--app-success);
}
.status-tag.pending {
  background: var(--plaza-accent-soft);
  color: var(--plaza-accent);
}
.status-tag.rejected {
  background: rgba(239, 68, 68, 0.1);
  color: var(--el-color-danger);
}

.correction-content {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 16px;
  padding: 16px;
  background: var(--plaza-bg);
  border-radius: 10px;
}
.correction-item {
  flex: 1;
}
.item-label {
  display: block;
  font-size: 12px;
  font-weight: 600;
  color: var(--plaza-text-muted);
  margin-bottom: 6px;
  text-transform: uppercase;
}
.item-text {
  font-size: 14px;
  color: var(--plaza-text);
  line-height: 1.5;
}
.correction-item.corrected .item-text {
  color: var(--plaza-accent);
  font-weight: 500;
}
.correction-arrow {
  color: var(--plaza-text-muted);
  font-size: 20px;
  flex-shrink: 0;
}

.correction-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.footer-meta {
  display: flex;
  gap: 20px;
  font-size: 13px;
  color: var(--plaza-text-muted);
}
.footer-actions {
  display: flex;
  gap: 4px;
}

.empty-state {
  text-align: center;
  padding: 60px 20px;
  color: var(--plaza-text-muted);
  font-size: 14px;
}

@media (max-width: 700px) {
  .correction-content {
    flex-direction: column;
  }
  .correction-arrow {
    transform: rotate(90deg);
  }
  .footer-meta {
    flex-direction: column;
    gap: 6px;
  }
}
</style>