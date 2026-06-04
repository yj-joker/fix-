<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import RunningTasksTray from '@/components/RunningTasksTray.vue'
import { notifyStore } from '@/stores/notifyStore'
import {
  House,
  User,
  Document,
  Setting,
  ArrowLeft,
  ArrowDown,
  Check,
  Search,
  ChatDotRound,
  Share,
} from '@element-plus/icons-vue'

const router = useRouter()
const route = useRoute()

// 登录后建立 WebSocket 通知连接 + 恢复后台任务对账
onMounted(() => notifyStore.init())

const isCollapsed = ref(true)
const headerSearchQuery = ref('')

const userAvatar = computed(() => {
  try {
    const userInfo = JSON.parse(localStorage.getItem('userInfo') || '{}')
    return userInfo.name ? userInfo.name[0] : 'U'
  } catch {
    return 'U'
  }
})

const menuItems = [
  { path: '/admin/dashboard', name: '首页概览', icon: House },
  { path: '/admin/users', name: '用户管理', icon: User },
  { path: '/admin/knowledge', name: '知识库管理', icon: Document },
  { path: '/admin/graph', name: '知识图谱', icon: Share },
  { path: '/admin/ai-chat', name: 'AI 对话', icon: ChatDotRound },
  { path: '/admin/settings', name: '系统设置', icon: Setting },
]

function goToHome() {
  router.push('/admin/dashboard')
}

function goToLogin() {
  notifyStore.stop()                       // 断开 WS，避免登出后无限重连握手失败
  localStorage.removeItem('userInfo')
  router.push('/login')
}

function isActive(path) {
  return route.path === path
}

function handleHeaderSearch() {
  if (headerSearchQuery.value.trim()) {
    router.push({ path: '/admin/knowledge', query: { q: headerSearchQuery.value } })
  }
}


function handleDropdown(command) {
  if (command === 'logout') {
    goToLogin()
  } else if (command === 'profile') {
    // TODO: 个人信息页
  } else if (command === 'my-info') {
    // TODO: 我的信息页
  }
}
</script>

<template>
  <div class="admin-layout">
    <!-- Sidebar -->
    <aside
      class="admin-sidebar"
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
        <span class="admin-badge" v-show="!isCollapsed">管理员</span>
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
          <span>admin</span>
        </div>
        <el-button text size="small" @click="goToLogin" v-show="!isCollapsed">
          <el-icon><ArrowLeft /></el-icon>
          退出
        </el-button>
      </div>
    </aside>

    <!-- Main Content -->
    <div class="admin-main" :class="{ expanded: !isCollapsed }">
      <!-- Top Header -->
      <header class="admin-header">
        <div class="header-left">
          <el-breadcrumb separator="/">
            <el-breadcrumb-item :to="{ path: '/admin' }">管理后台</el-breadcrumb-item>
            <el-breadcrumb-item v-if="route.path !== '/admin'">
              {{ menuItems.find(m => m.path === route.path)?.name || '' }}
            </el-breadcrumb-item>
          </el-breadcrumb>
        </div>
        <div class="header-right">
          <el-dropdown @command="handleDropdown">
            <div class="user-avatar">{{ userAvatar }}</div>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="profile">个人信息</el-dropdown-item>
                <el-dropdown-item command="my-info">我的信息</el-dropdown-item>
                <el-dropdown-item command="logout" divided>退出</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </header>

      <!-- Page Content -->
      <main class="admin-content">
        <!-- 缓存 AI 对话页：切到别的页面时流式输出不中断 -->
        <router-view v-slot="{ Component }">
          <keep-alive include="AdminAIChat">
            <component :is="Component" />
          </keep-alive>
        </router-view>
      </main>
      <!-- 后台任务进行中托盘（全局固定定位） -->
      <RunningTasksTray />
    </div>
  </div>
</template>

<style scoped>
.admin-layout {
  display: flex;
  height: 100vh;
  overflow: hidden;
  background: var(--plaza-bg);
}

/* Sidebar */
.admin-sidebar {
  width: 240px;
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
.admin-sidebar.collapsed {
  width: 72px;
}

.sidebar-header {
  padding: 20px 16px;
  border-bottom: 1px solid var(--plaza-border);
  display: flex;
  flex-direction: column;
  gap: 8px;
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
.admin-badge {
  background: var(--plaza-accent-soft);
  color: var(--plaza-accent);
  font-size: 11px;
  font-weight: 600;
  padding: 4px 10px;
  border-radius: 10px;
  width: fit-content;
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

/* Main Content */
.admin-main {
  flex: 1;
  margin-left: 72px;
  transition: margin-left 0.3s ease;
  display: flex;
  flex-direction: column;
  height: 100vh;
  overflow: hidden;
}

.admin-main.expanded {
  margin-left: 240px;
}

/* Header */
.admin-header {
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
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 6px;
  transition: background 0.2s;
}
.header-user:hover {
  background: var(--plaza-accent-soft);
}
.dropdown-arrow {
  font-size: 12px;
  color: var(--plaza-text-muted);
}

.user-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: var(--plaza-accent);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  user-select: none;
}

/* Content */
.admin-content {
  flex: 1;
  padding: 32px 24px;
  overflow-y: auto;
  position: relative;
}

/* Responsive */
@media (max-width: 900px) {
  .admin-sidebar {
    width: 72px;
  }
  .sidebar-logo .logo-text,
  .admin-badge,
  .nav-text,
  .sidebar-footer .user-info,
  .sidebar-footer .el-button span {
    display: none;
  }
  .admin-main {
    margin-left: 72px;
  }
}
</style>