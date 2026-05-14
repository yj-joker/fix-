<script setup>
import { ref } from 'vue'
import { Search, ArrowRight, Picture, Camera } from '@element-plus/icons-vue'

const searchQuery = ref('')
const searchType = ref('text')

const hotSearches = ['发动机维修', '电气故障', '设备保养', '液压系统']

const recentSearches = ref([
  { keyword: '发动机维护', time: '2024-01-15', results: 15 },
  { keyword: '电气故障诊断', time: '2024-01-14', results: 8 },
])

const searchResults = ref([
  { title: '发动机日常维护标准流程', category: '发动机维修', content: '包含启动前检查、运行中监测、停机后保养等完整流程...' },
  { title: '发动机故障代码解析', category: '故障诊断', content: '针对常见故障代码P0300、P0420等的诊断与处理方法...' },
  { title: '发动机大修作业指引', category: '发动机维修', content: '发动机解体、检修、组装的标准作业流程与质量控制点...' },
])

function doSearch() {
  // 模拟搜索
  if (searchQuery.value.trim()) {
    recentSearches.value.unshift({
      keyword: searchQuery.value,
      time: new Date().toLocaleDateString(),
      results: Math.floor(Math.random() * 20) + 5
    })
  }
}

function useHotSearch(keyword) {
  searchQuery.value = keyword
  doSearch()
}
</script>

<template>
  <div class="user-search">
    <!-- Page Header -->
    <div class="page-header">
      <h2 class="page-title">智能检索</h2>
      <p class="page-desc">输入设备型号、故障描述或上传图片，智能匹配检修方案</p>
    </div>

    <!-- Search Box -->
    <div class="search-box">
      <div class="search-type-tabs">
        <button
          class="type-tab"
          :class="{ active: searchType === 'text' }"
          @click="searchType = 'text'"
        >
          <el-icon><Search /></el-icon>
          文本检索
        </button>
        <button
          class="type-tab"
          :class="{ active: searchType === 'image' }"
          @click="searchType = 'image'"
        >
          <el-icon><Picture /></el-icon>
          图片检索
        </button>
      </div>

      <div class="search-input-area">
        <el-input
          v-model="searchQuery"
          placeholder="输入设备型号、故障描述..."
          size="large"
          class="search-input"
          @keyup.enter="doSearch"
        >
          <template #prefix>
            <el-icon><Search /></el-icon>
          </template>
        </el-input>
        <el-button type="primary" size="large" class="search-btn" @click="doSearch">
          搜索
          <el-icon class="btn-icon"><ArrowRight /></el-icon>
        </el-button>
      </div>

      <div class="hot-searches">
        <span class="hot-label">热门搜索：</span>
        <span
          v-for="keyword in hotSearches"
          :key="keyword"
          class="hot-tag"
          @click="useHotSearch(keyword)"
        >
          {{ keyword }}
        </span>
      </div>
    </div>

    <!-- Results -->
    <div v-if="searchResults.length" class="search-results">
      <h3 class="results-title">搜索结果</h3>
      <div class="results-list">
        <div v-for="result in searchResults" :key="result.title" class="result-card">
          <div class="result-header">
            <h4 class="result-title">{{ result.title }}</h4>
            <span class="result-category">{{ result.category }}</span>
          </div>
          <p class="result-content">{{ result.content }}</p>
          <div class="result-footer">
            <span class="result-action">查看详情</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Recent -->
    <div v-if="recentSearches.length && !searchResults.length" class="recent-section">
      <h3 class="section-title">最近检索</h3>
      <div class="recent-list">
        <div v-for="item in recentSearches" :key="item.keyword" class="recent-item">
          <div class="recent-info">
            <span class="recent-keyword">{{ item.keyword }}</span>
            <span class="recent-meta">{{ item.results }} 条结果 · {{ item.time }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.user-search {
  max-width: 900px;
  margin: 0 auto;
}

.page-header {
  margin: 0 0 28px 0;
  padding: 0;
  /* 确保盒子贴顶，无额外边距 */
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

.search-box {
  background: var(--plaza-bg-card);
  border: 1px solid var(--plaza-border);
  border-radius: 16px;
  padding: 24px;
  margin-bottom: 28px;
}

.search-type-tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
}
.type-tab {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  background: var(--plaza-bg);
  border: 1px solid var(--plaza-border);
  border-radius: 8px;
  font-size: 14px;
  color: var(--plaza-text-muted);
  cursor: pointer;
  transition: all 0.2s ease;
}
.type-tab.active {
  background: var(--plaza-accent-soft);
  border-color: var(--plaza-accent);
  color: var(--plaza-accent);
  font-weight: 500;
}

.search-input-area {
  display: flex;
  gap: 12px;
  margin-bottom: 16px;
}
.search-input {
  flex: 1;
}
.search-btn {
  background: var(--plaza-accent) !important;
  border: none !important;
  padding: 12px 24px !important;
  border-radius: 10px !important;
  font-weight: 600;
}
.btn-icon {
  margin-left: 6px;
}

.hot-searches {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}
.hot-label {
  font-size: 13px;
  color: var(--plaza-text-muted);
}
.hot-tag {
  padding: 4px 12px;
  background: var(--plaza-bg);
  border: 1px solid var(--plaza-border);
  border-radius: 16px;
  font-size: 13px;
  color: var(--plaza-text-muted);
  cursor: pointer;
  transition: all 0.2s ease;
}
.hot-tag:hover {
  border-color: var(--plaza-accent);
  color: var(--plaza-accent);
}

.results-title,
.section-title {
  font-size: 1rem;
  font-weight: 600;
  color: var(--plaza-text);
  margin-bottom: 16px;
}

.results-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.result-card {
  background: var(--plaza-bg-card);
  border: 1px solid var(--plaza-border);
  border-radius: 14px;
  padding: 20px;
  transition: border-color 0.2s ease;
}
.result-card:hover {
  border-color: var(--plaza-accent);
}
.result-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 10px;
}
.result-title {
  font-size: 1rem;
  font-weight: 600;
  color: var(--plaza-text);
}
.result-category {
  padding: 3px 10px;
  background: var(--plaza-accent-soft);
  color: var(--plaza-accent);
  border-radius: 8px;
  font-size: 12px;
}
.result-content {
  font-size: 14px;
  color: var(--plaza-text-muted);
  line-height: 1.6;
  margin-bottom: 12px;
}
.result-footer {
  display: flex;
  justify-content: flex-end;
}
.result-action {
  font-size: 13px;
  color: var(--plaza-accent);
  cursor: pointer;
}

.recent-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.recent-item {
  display: flex;
  align-items: center;
  padding: 14px 16px;
  background: var(--plaza-bg-card);
  border: 1px solid var(--plaza-border);
  border-radius: 12px;
}
.recent-keyword {
  display: block;
  font-size: 14px;
  font-weight: 500;
  color: var(--plaza-text);
  margin-bottom: 3px;
}
.recent-meta {
  display: block;
  font-size: 12px;
  color: var(--plaza-text-muted);
}
</style>