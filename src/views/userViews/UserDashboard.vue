<script setup>
import { ref, computed } from 'vue'
import { Search, ArrowRight } from '@element-plus/icons-vue'
import HomeBanner from '@/components/HomeBanner.vue'
import bannerDiagnosis from '@/assets/banners/user-carousel-diagnosis.png'
import bannerTaskSteps from '@/assets/banners/user-carousel-task-steps.png'
import bannerStepVerify from '@/assets/banners/user-carousel-step-verify.png'
import bannerKnowledgeGraph from '@/assets/banners/user-carousel-knowledge-graph.png'
import bannerCaseRecord from '@/assets/banners/user-carousel-case-record.png'

const userName = computed(() => {
  try {
    const userInfo = JSON.parse(localStorage.getItem('userInfo') || '{}')
    return userInfo.name || '用户'
  } catch {
    return '用户'
  }
})

const bannerItems = [
  { src: bannerDiagnosis, title: '智能故障诊断', href: '' },
  { src: bannerTaskSteps, title: 'AI 生成检修步骤', href: '' },
  { src: bannerStepVerify, title: '步骤执行与 AI 验证', href: '' },
  { src: bannerKnowledgeGraph, title: '知识图谱与手册检索', href: '' },
  { src: bannerCaseRecord, title: '案例经验沉淀', href: '' },
]

const stats = []

const recentSearches = [
  { keyword: '发动机维护', time: '10分钟前', results: 15 },
  { keyword: '电气故障诊断', time: '1小时前', results: 8 },
  { keyword: '液压系统保养', time: '2小时前', results: 23 },
]

const quickActions = [
  { title: '智能检索', desc: '搜索设备型号、故障描述', path: '/user/search', icon: Search },
]
</script>

<template>
  <div class="user-dashboard">
    <!-- Welcome -->
    <div class="welcome-section">
      <h1 class="welcome-title">欢迎回来，<span class="highlight">{{ userName }}</span></h1>
      <p class="welcome-desc">您可以在这里进行设备检修知识检索、任务处理和知识图谱查询</p>
    </div>

    <!-- Banner Carousel -->
    <HomeBanner :items="bannerItems" :autoplay="true" :interval="4000" />

    <!-- Content Grid -->
    <div class="content-grid">
      <!-- Recent Searches -->
      <div class="card">
        <div class="card-header">
          <h3 class="card-title">最近检索</h3>
          <span class="card-subtitle">您的检索历史记录</span>
        </div>
        <div class="search-list">
          <div v-for="item in recentSearches" :key="item.keyword" class="search-item">
            <div class="search-info">
              <span class="search-keyword">{{ item.keyword }}</span>
              <span class="search-meta">{{ item.results }} 条结果 · {{ item.time }}</span>
            </div>
            <router-link to="/user/search" class="search-btn">
              <el-icon><ArrowRight /></el-icon>
            </router-link>
          </div>
        </div>
      </div>

      <!-- Quick Actions -->
      <div class="card">
        <div class="card-header">
          <h3 class="card-title">快捷操作</h3>
          <span class="card-subtitle">常用功能入口</span>
        </div>
        <div class="action-grid">
          <router-link
            v-for="action in quickActions"
            :key="action.path"
            :to="action.path"
            class="action-item"
          >
            <div class="action-icon" :style="{ color: action.icon === Search ? '#334155' : '#22c55e' }">
              <el-icon><component :is="action.icon" /></el-icon>
            </div>
            <span class="action-title">{{ action.title }}</span>
            <span class="action-desc">{{ action.desc }}</span>
          </router-link>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.user-dashboard {
  max-width: 1200px;
  margin: 0 auto;
}

.welcome-section {
  margin-bottom: 32px;
}
.welcome-title {
  font-size: 1.8rem;
  font-weight: 700;
  color: var(--plaza-text);
  margin-bottom: 8px;
}
.highlight {
  color: var(--plaza-accent);
}
.welcome-desc {
  color: var(--plaza-text-muted);
  font-size: 15px;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 20px;
  margin-bottom: 28px;
}
.stat-card {
  background: var(--plaza-bg-card);
  border: 1px solid var(--plaza-border);
  border-radius: 14px;
  padding: 20px;
  display: flex;
  align-items: center;
  gap: 16px;
}
.stat-icon {
  width: 50px;
  height: 50px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
}
.stat-value {
  font-size: 1.6rem;
  font-weight: 700;
  color: var(--plaza-text);
}
.stat-label {
  font-size: 13px;
  color: var(--plaza-text-muted);
}

.content-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
}
.card {
  background: var(--plaza-bg-card);
  border: 1px solid var(--plaza-border);
  border-radius: 14px;
  padding: 24px;
}
.card-header {
  margin-bottom: 20px;
}
.card-title {
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--plaza-text);
  margin-bottom: 4px;
}
.card-subtitle {
  font-size: 13px;
  color: var(--plaza-text-muted);
}

.search-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.search-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: var(--plaza-bg);
  border-radius: 10px;
}
.search-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.search-keyword {
  font-size: 14px;
  font-weight: 500;
  color: var(--plaza-text);
}
.search-meta {
  font-size: 12px;
  color: var(--plaza-text-muted);
}
.search-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 8px;
  background: var(--plaza-accent-soft);
  color: var(--plaza-accent);
  text-decoration: none;
  transition: transform 0.2s ease;
}
.search-btn:hover {
  transform: translateX(4px);
}

.action-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}
.action-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 20px 16px;
  background: var(--plaza-bg);
  border-radius: 12px;
  text-decoration: none;
  transition: all 0.2s ease;
  text-align: center;
}
.action-item:hover {
  background: var(--plaza-accent-soft);
}
.action-icon {
  font-size: 28px;
}
.action-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--plaza-text);
}
.action-desc {
  font-size: 12px;
  color: var(--plaza-text-muted);
}

@media (max-width: 1100px) {
  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }
  .content-grid {
    grid-template-columns: 1fr;
  }
}
@media (max-width: 600px) {
  .stats-grid {
    grid-template-columns: 1fr;
  }
}
</style>
