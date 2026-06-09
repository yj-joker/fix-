<script setup>
import { ref, computed } from 'vue'
import {
  ChatDotRound,
  Connection,
  Search,
  Tickets,
  User,
  ArrowRight,
} from '@element-plus/icons-vue'
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
  {
    title: '智能检索',
    desc: '按设备、故障现象或图片查找方案',
    path: '/user/search',
    icon: Search,
    tone: 'blue',
  },
  {
    title: '检修任务',
    desc: '创建任务并跟进 AI 生成步骤',
    path: '/user/tasks',
    icon: Tickets,
    tone: 'green',
  },
  {
    title: '知识图谱',
    desc: '查看设备、故障、方案关系',
    path: '/user/graph',
    icon: Connection,
    tone: 'cyan',
  },
  {
    title: 'AI 对话',
    desc: '咨询排障思路和执行建议',
    path: '/user/ai-chat',
    icon: ChatDotRound,
    tone: 'amber',
  },
  {
    title: '个人中心',
    desc: '查看账号资料和邮箱状态',
    path: '/user/profile',
    icon: User,
    tone: 'slate',
  },
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
            <div class="action-icon" :class="action.tone">
              <el-icon><component :is="action.icon" /></el-icon>
            </div>
            <span class="action-copy">
              <span class="action-title">{{ action.title }}</span>
              <span class="action-desc">{{ action.desc }}</span>
            </span>
            <el-icon class="action-arrow"><ArrowRight /></el-icon>
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
  grid-template-columns: 1fr;
  gap: 10px;
}
.action-item {
  min-height: 74px;
  display: grid;
  grid-template-columns: 44px minmax(0, 1fr) 24px;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  background: var(--plaza-bg);
  border: 1px solid transparent;
  border-radius: 10px;
  text-decoration: none;
  transition: background 0.2s ease, border-color 0.2s ease, transform 0.2s ease;
}
.action-item:hover {
  background: var(--plaza-accent-soft);
  border-color: var(--plaza-border-strong);
  transform: translateY(-1px);
}
.action-icon {
  width: 44px;
  height: 44px;
  border-radius: 10px;
  display: grid;
  place-items: center;
  font-size: 22px;
  background: var(--plaza-bg-card);
}
.action-icon.blue {
  color: var(--plaza-accent);
  background: var(--plaza-info-soft);
}
.action-icon.green {
  color: var(--plaza-success);
  background: var(--plaza-success-soft);
}
.action-icon.cyan {
  color: #0891b2;
  background: #ecfeff;
}
.action-icon.amber {
  color: var(--plaza-warning);
  background: var(--plaza-warning-soft);
}
.action-icon.slate {
  color: #475569;
  background: #f1f5f9;
}
.action-copy {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.action-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--plaza-text);
}
.action-desc {
  font-size: 12px;
  color: var(--plaza-text-muted);
  line-height: 1.4;
}
.action-arrow {
  color: var(--plaza-text-muted);
  transition: transform 0.2s ease, color 0.2s ease;
}
.action-item:hover .action-arrow {
  color: var(--plaza-accent);
  transform: translateX(3px);
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
