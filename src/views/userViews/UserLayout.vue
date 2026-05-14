<script setup>
import { ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import {
  House,
  Search,
  DocumentChecked,
  EditPen,
  Connection,
  User,
  ArrowLeft,
  ArrowRight,
  ChatDotRound,
} from '@element-plus/icons-vue'

const router = useRouter()
const route = useRoute()

const isCollapsed = ref(true)
const headerSearchQuery = ref('')

const menuItems = [
  { path: '/user/dashboard', name: '首页概览', icon: House },
  { path: '/user/search', name: '智能检索', icon: Search },
  { path: '/user/guide', name: '作业指引', icon: DocumentChecked },
  { path: '/user/cases', name: '我的案例', icon: EditPen },
  { path: '/user/ai-chat', name: 'AI 对话', icon: ChatDotRound },
  { path: '/user/correction', name: '结果校正', icon: Connection },
]

function goToHome() {
  router.push('/user/dashboard')
}

function goToLogin() {
  router.push('/login')
}

function isActive(path) {
  return route.path === path
}

function handleHeaderSearch() {
  if (headerSearchQuery.value.trim()) {
    router.push({ path: '/user/search', query: { q: headerSearchQuery.value } })
  }
}
</script>

<template>
  <div class="user-layout">
    <!-- Sidebar -->
    <aside
      class="user-sidebar"
      :class="{ collapsed: isCollapsed }"
      @mouseenter="isCollapsed = false"
      @mouseleave="isCollapsed = true"
    >
      <div class="sidebar-header">
        <div class="sidebar-logo">
          <div class="brand-logo">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
              <path d="M22.7 19l-9.1-9.1c.9-2.3.4-5-1.5-6.9-2-2-5-2.4-7.4-1.3L9 6 6 9 1.6 4.7C.4 7.1.9 10.1 2.9 12.1c1.9 1.9 4.6 2.4 6.9 1.5l9.1 9.1c.4.4 1 .4 1.4 0l2.3-2.3c.5-.4.5-1.1.1-1.4z"/>
            </svg>
          </div>
          <span class="logo-text" v-show="!isCollapsed">检修系统</span>
        </div>
      </div>

      <nav class="sidebar-nav">
        <router-link
          v-for="item in menuItems"
          :key="item.path"
          :to="item.path"
          class="nav-item"
          :class="{ active: isActive(item.path) }"
        >
          <el-icon class="nav-icon"><component :is="item.icon" /></el-icon>
          <span class="nav-text" v-show="!isCollapsed">{{ item.name }}</span>
        </router-link>
      </nav>

      <div class="sidebar-footer">
        <div class="user-info" v-show="!isCollapsed">
          <el-icon><User /></el-icon>
          <span>user</span>
        </div>
        <el-button text size="small" @click="goToLogin" v-show="!isCollapsed">
          <el-icon><ArrowLeft /></el-icon>
          退出
        </el-button>
      </div>
    </aside>

    <!-- Main Content -->
    <div class="user-main" :class="{ expanded: !isCollapsed }">
      <!-- Top Header -->
      <header class="user-header">
        <div class="header-left">
          <el-breadcrumb separator="/">
            <el-breadcrumb-item :to="{ path: '/user' }">用户中心</el-breadcrumb-item>
            <el-breadcrumb-item v-if="route.path !== '/user'">
              {{ menuItems.find(m => m.path === route.path)?.name || '' }}
            </el-breadcrumb-item>
          </el-breadcrumb>
        </div>
        <div class="header-right">
          <div class="header-search">
            <el-input
              v-model="headerSearchQuery"
              placeholder="搜索..."
              size="small"
              class="header-search-input"
              @keyup.enter="handleHeaderSearch"
            >
              <template #prefix>
                <el-icon><Search /></el-icon>
              </template>
            </el-input>
          </div>
          <span class="header-user">
            <el-icon><User /></el-icon>
            user
          </span>
        </div>
      </header>

      <!-- Page Content -->
      <main class="user-content">
        <router-view />
      </main>
    </div>
  </div>
</template>

<style scoped>
.user-layout {
  display: flex;
  height: 100vh;
  overflow: hidden;
  background: var(--plaza-bg);
}

.user-sidebar {
  width: 220px;
  background: var(--plaza-bg-card);
  border-right: 1px solid var(--plaza-border);
  display: flex;
  flex-direction: column;
  transition: width 0.3s ease;
  position: fixed;
  top: 0;
  left: 0;
  bottom: 0;
  z-index: 101;
}

.user-sidebar.collapsed {
  width: 72px;
}

.sidebar-header {
  padding: 20px 16px;
  border-bottom: 1px solid var(--plaza-border);
}
.sidebar-logo {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 700;
  font-size: 18px;
  cursor: pointer;
}
.logo-icon {
  background: var(--plaza-accent);
  color: #fff;
  padding: 6px 10px;
  border-radius: 6px;
  font-size: 14px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}
.logo-text {
  color: var(--plaza-text);
  white-space: nowrap;
}

.brand-logo {
  position: relative;
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--plaza-accent);
  border-radius: 50%;
  flex-shrink: 0;
}

.brand-logo::before {
  content: '';
  position: absolute;
  width: 100%;
  height: 100%;
  border: 3px solid rgba(255, 255, 255, 0.3);
  border-radius: 50%;
  animation: pulse-ring 2s ease-in-out infinite;
}

.brand-logo svg {
  color: #fff;
  width: 18px;
  height: 18px;
  filter: drop-shadow(0 0 4px rgba(255, 215, 0, 0.8));
}

@keyframes pulse-ring {
  0%, 100% {
    transform: scale(1);
    opacity: 1;
  }
  50% {
    transform: scale(1.3);
    opacity: 0;
  }
}

.sidebar-nav {
  flex: 1;
  padding: 16px 12px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.nav-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  border-radius: 10px;
  color: var(--plaza-text-muted);
  text-decoration: none;
  transition: all 0.2s ease;
  font-size: 15px;
}
.nav-item:hover {
  background: var(--plaza-accent-soft);
  color: var(--plaza-accent);
}
.nav-item.active {
  background: var(--plaza-accent-soft);
  color: var(--plaza-accent);
  font-weight: 600;
}
.nav-icon {
  font-size: 20px;
  flex-shrink: 0;
}
.nav-text {
  white-space: nowrap;
}

.sidebar-footer {
  padding: 16px;
  border-top: 1px solid var(--plaza-border);
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.user-info {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  color: var(--plaza-text);
  padding: 0 4px;
}

.user-main {
  flex: 1;
  transition: margin-left 0.3s ease;
  display: flex;
  flex-direction: column;
  height: 100vh;
  overflow: hidden;
  margin-left: 72px;
}

.user-main.expanded {
  margin-left: 220px;
}

.user-header {
  height: 60px;
  background: var(--plaza-bg-card);
  border-bottom: 1px solid var(--plaza-border);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px;
  position: sticky;
  top: 0;
  z-index: 50;
  width: 100%;
  box-sizing: border-box;
}
.header-left {
  display: flex;
  align-items: center;
  gap: 16px;
}
.header-right {
  display: flex;
  align-items: center;
  gap: 16px;
}
.header-search {
  width: 200px;
}
.header-search-input {
  width: 100%;
}
.header-search-input :deep(.el-input__wrapper) {
  border-radius: 8px;
}
.header-user {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  color: var(--plaza-text);
}

.user-content {
  flex: 1;
  padding: 32px 24px;
  overflow: hidden;
  position: relative;
}

@media (max-width: 900px) {
  .user-sidebar {
    width: 72px;
  }
  .logo-text,
  .nav-text,
  .sidebar-footer .user-info,
  .sidebar-footer .el-button span {
    display: none;
  }
  .user-main {
    margin-left: 72px;
  }
  .user-main.expanded {
    margin-left: 220px;
  }
  .user-header {
    width: 100%;
  }
}
</style>