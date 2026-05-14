<script setup>
import { ref } from 'vue'
import { Search, Plus, Edit, Delete, Check, Close } from '@element-plus/icons-vue'

const searchQuery = ref('')
const activeTab = ref('all')

const tabs = [
  { key: 'all', label: '全部' },
  { key: 'pending', label: '待审核' },
  { key: 'approved', label: '已通过' },
  { key: 'rejected', label: '已驳回' },
]

const cases = ref([
  { id: 1, title: '发动机维护案例', category: '发动机维修', author: '张工程师', createTime: '2024-01-15', status: 'approved' },
  { id: 2, title: '电气故障诊断校正', category: '电气故障', author: '李技术员', createTime: '2024-01-14', status: 'pending' },
  { id: 3, title: '液压系统检修流程', category: '液压系统', author: '王工程师', createTime: '2024-01-12', status: 'approved' },
  { id: 4, title: '设备保养标准作业', category: '设备保养', author: '赵工程师', createTime: '2024-01-10', status: 'rejected' },
  { id: 5, title: '精密仪器校准记录', category: '设备保养', author: '孙技术员', createTime: '2024-01-08', status: 'pending' },
])

const filteredCases = () => {
  let list = cases.value
  if (activeTab.value !== 'all') {
    list = list.filter(c => c.status === activeTab.value)
  }
  if (searchQuery.value) {
    list = list.filter(c =>
      c.title.includes(searchQuery.value) ||
      c.category.includes(searchQuery.value)
    )
  }
  return list
}

function deleteCase(caseItem) {
  const index = cases.value.indexOf(caseItem)
  if (index > -1) {
    cases.value.splice(index, 1)
  }
}
</script>

<template>
  <div class="user-cases">
    <!-- Page Header -->
    <div class="page-header">
      <div class="page-title-area">
        <h2 class="page-title">我的案例</h2>
        <p class="page-desc">查看已提交的检修案例及其审核状态</p>
      </div>
      <el-button type="primary">
        <el-icon><Plus /></el-icon>
        提交新案例
      </el-button>
    </div>

    <!-- Tabs & Search -->
    <div class="filter-bar">
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
      <el-input
        v-model="searchQuery"
        placeholder="搜索案例..."
        class="search-input"
        clearable
      >
        <template #prefix>
          <el-icon><Search /></el-icon>
        </template>
      </el-input>
    </div>

    <!-- Cases List -->
    <div class="cases-list">
      <div v-for="caseItem in filteredCases()" :key="caseItem.id" class="case-card">
        <div class="case-main">
          <div class="case-header">
            <h3 class="case-title">{{ caseItem.title }}</h3>
            <span class="status-tag" :class="caseItem.status">
              {{ caseItem.status === 'approved' ? '已通过' : caseItem.status === 'pending' ? '待审核' : '已驳回' }}
            </span>
          </div>
          <div class="case-meta">
            <span class="meta-item">{{ caseItem.category }}</span>
            <span class="meta-item">提交人：{{ caseItem.author }}</span>
            <span class="meta-item">{{ caseItem.createTime }}</span>
          </div>
        </div>
        <div class="case-actions">
          <el-button size="small" text>
            <el-icon><Edit /></el-icon>
            编辑
          </el-button>
          <el-button size="small" text type="danger" @click="deleteCase(caseItem)">
            <el-icon><Delete /></el-icon>
          </el-button>
        </div>
      </div>

      <div v-if="filteredCases().length === 0" class="empty-state">
        <p>暂无案例记录</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.user-cases {
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

.filter-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  gap: 16px;
}
.tabs-bar {
  display: flex;
  gap: 6px;
}
.tab-btn {
  padding: 8px 16px;
  background: var(--plaza-bg-card);
  border: 1px solid var(--plaza-border);
  border-radius: 8px;
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
.search-input {
  width: 240px;
}

.cases-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.case-card {
  background: var(--plaza-bg-card);
  border: 1px solid var(--plaza-border);
  border-radius: 14px;
  padding: 18px 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  transition: border-color 0.2s ease;
}
.case-card:hover {
  border-color: var(--plaza-accent);
}
.case-main {
  flex: 1;
}
.case-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 8px;
}
.case-title {
  font-size: 1rem;
  font-weight: 600;
  color: var(--plaza-text);
}
.status-tag {
  padding: 3px 10px;
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
.case-meta {
  display: flex;
  gap: 16px;
}
.meta-item {
  font-size: 13px;
  color: var(--plaza-text-muted);
}
.case-actions {
  display: flex;
  gap: 4px;
}

.empty-state {
  text-align: center;
  padding: 60px 20px;
  color: var(--plaza-text-muted);
  font-size: 14px;
}

@media (max-width: 600px) {
  .filter-bar {
    flex-direction: column;
    align-items: flex-start;
  }
  .search-input {
    width: 100%;
  }
  .case-card {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }
}
</style>