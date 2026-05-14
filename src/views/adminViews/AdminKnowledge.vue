<script setup>
import { ref } from 'vue'
import { Search, Check, Close, View, Edit, Delete } from '@element-plus/icons-vue'

const searchQuery = ref('')
const activeTab = ref('pending')

const tabs = [
  { key: 'pending', label: '待审核', count: 12 },
  { key: 'approved', label: '已通过', count: 89 },
  { key: 'rejected', label: '已驳回', count: 5 },
]

const knowledgeList = ref([
  { id: 1, title: '发动机日常维护标准流程', category: '发动机维修', author: '张工程师', createTime: '2024-01-15', status: 'pending' },
  { id: 2, title: '电气系统故障诊断方法', category: '电气故障', author: '李技术员', createTime: '2024-01-14', status: 'pending' },
  { id: 3, title: '液压系统保养注意事项', category: '液压系统', author: '王工程师', createTime: '2024-01-13', status: 'approved' },
  { id: 4, title: '设备定期检修作业指引', category: '设备保养', author: '赵管理员', createTime: '2024-01-12', status: 'approved' },
  { id: 5, title: '常见故障代码解析', category: '故障诊断', author: '孙工程师', createTime: '2024-01-11', status: 'rejected' },
  { id: 6, title: '精密仪器校准操作规程', category: '设备保养', author: '周技术员', createTime: '2024-01-10', status: 'pending' },
])

const filteredList = () => {
  let list = knowledgeList.value
  if (activeTab.value !== 'all') {
    list = list.filter(item => item.status === activeTab.value)
  }
  if (searchQuery.value) {
    list = list.filter(item =>
      item.title.includes(searchQuery.value) ||
      item.category.includes(searchQuery.value) ||
      item.author.includes(searchQuery.value)
    )
  }
  return list
}

function approveItem(item) {
  item.status = 'approved'
}

function rejectItem(item) {
  item.status = 'rejected'
}
</script>

<template>
  <div class="admin-knowledge">
    <!-- Page Header -->
    <div class="page-header">
      <div class="page-title-area">
        <h2 class="page-title">知识库管理</h2>
        <p class="page-desc">审核与维护设备检修知识库内容</p>
      </div>
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
        <span class="tab-count">{{ tab.count }}</span>
      </button>
    </div>

    <!-- Search Bar -->
    <div class="search-bar">
      <el-input
        v-model="searchQuery"
        placeholder="搜索标题、分类或作者..."
        class="search-input"
        clearable
      >
        <template #prefix>
          <el-icon><Search /></el-icon>
        </template>
      </el-input>
    </div>

    <!-- Knowledge List -->
    <div class="knowledge-list">
      <div v-for="item in filteredList()" :key="item.id" class="knowledge-card">
        <div class="card-main">
          <div class="card-header">
            <h3 class="card-title">{{ item.title }}</h3>
            <span class="category-tag">{{ item.category }}</span>
          </div>
          <div class="card-meta">
            <span class="meta-item">作者：{{ item.author }}</span>
            <span class="meta-item">创建时间：{{ item.createTime }}</span>
          </div>
        </div>
        <div class="card-actions">
          <template v-if="item.status === 'pending'">
            <el-button size="small" type="primary" @click="approveItem(item)">
              <el-icon><Check /></el-icon>
              通过
            </el-button>
            <el-button size="small" type="danger" @click="rejectItem(item)">
              <el-icon><Close /></el-icon>
              驳回
            </el-button>
          </template>
          <template v-else>
            <span class="status-label" :class="item.status">
              {{ item.status === 'approved' ? '已通过' : '已驳回' }}
            </span>
          </template>
          <el-button size="small" text>
            <el-icon><View /></el-icon>
            查看
          </el-button>
          <el-button size="small" text>
            <el-icon><Edit /></el-icon>
            编辑
          </el-button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.admin-knowledge {
  max-width: 1200px;
  margin: 0 auto;
}

.page-header {
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
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 18px;
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
  font-weight: 600;
}
.tab-count {
  background: var(--plaza-bg);
  padding: 2px 8px;
  border-radius: 10px;
  font-size: 12px;
}
.tab-btn.active .tab-count {
  background: rgba(249, 115, 22, 0.2);
}

.search-bar {
  margin-bottom: 20px;
}
.search-input {
  max-width: 400px;
}

.knowledge-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.knowledge-card {
  background: var(--plaza-bg-card);
  border: 1px solid var(--plaza-border);
  border-radius: 14px;
  padding: 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  transition: border-color 0.2s ease;
}
.knowledge-card:hover {
  border-color: var(--plaza-accent);
}
.card-main {
  flex: 1;
}
.card-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 8px;
}
.card-title {
  font-size: 1rem;
  font-weight: 600;
  color: var(--plaza-text);
}
.category-tag {
  padding: 4px 10px;
  background: var(--plaza-accent-soft);
  color: var(--plaza-accent);
  border-radius: 8px;
  font-size: 12px;
  font-weight: 500;
}
.card-meta {
  display: flex;
  gap: 20px;
}
.meta-item {
  font-size: 13px;
  color: var(--plaza-text-muted);
}
.card-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}
.status-label {
  padding: 4px 12px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 500;
}
.status-label.approved {
  background: rgba(34, 197, 94, 0.1);
  color: var(--app-success);
}
.status-label.rejected {
  background: rgba(239, 68, 68, 0.1);
  color: var(--el-color-danger);
}

@media (max-width: 768px) {
  .knowledge-card {
    flex-direction: column;
    align-items: flex-start;
    gap: 16px;
  }
  .card-actions {
    width: 100%;
    flex-wrap: wrap;
  }
}
</style>