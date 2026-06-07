<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import RunningTasksTray from '@/components/RunningTasksTray.vue'
import { notifyStore } from '@/stores/notifyStore'
import {
  House,
  User,
  Document,
  Setting,
  SwitchButton,
  Search,
  ChatDotRound,
  Share,
  List,
  Collection,
} from '@element-plus/icons-vue'

const router = useRouter()
const route = useRoute()

// 登录后建立 WebSocket 通知连接 + 恢复后台任务对账
onMounted(() => notifyStore.init())

const isCollapsed = ref(true)
const headerSearchQuery = ref('')

// 顶栏技术时钟（仅装饰，不影响功能）
const clock = ref('')
let clockTimer = null
function tick() {
  const d = new Date()
  const p = (n) => String(n).padStart(2, '0')
  clock.value = `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`
}
onMounted(() => { tick(); clockTimer = setInterval(tick, 1000) })
onUnmounted(() => clockTimer && clearInterval(clockTimer))

const userAvatar = computed(() => {
  try {
    const userInfo = JSON.parse(localStorage.getItem('userInfo') || '{}')
    return userInfo.name ? userInfo.name[0] : 'A'
  } catch {
    return 'A'
  }
})

const menuItems = [
  { path: '/admin/dashboard', name: '首页概览', icon: House },
  { path: '/admin/users', name: '用户管理', icon: User },
  { path: '/admin/knowledge', name: '知识库管理', icon: Document },
  { path: '/admin/graph', name: '知识图谱', icon: Share },
  { path: '/admin/tasks', name: '任务管理', icon: List },
  { path: '/admin/procedures', name: '标准规程', icon: Collection },
  { path: '/admin/ai-chat', name: 'AI 对话', icon: ChatDotRound },
  { path: '/admin/settings', name: '系统设置', icon: Setting },
]

const currentSection = computed(
  () => menuItems.find((m) => route.path === m.path || route.path.startsWith(m.path + '/'))?.name || '管理后台'
)

function goToHome() {
  router.push('/admin/dashboard')
}

function goToLogin() {
  notifyStore.stop() // 断开 WS，避免登出后无限重连握手失败
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
  <div class="shell">
    <!-- ===== Sidebar：工程控制台 ===== -->
    <aside
      class="rail"
      :class="{ collapsed: isCollapsed }"
      @mouseenter="isCollapsed = false"
      @mouseleave="isCollapsed = true"
    >
      <!-- 品牌 -->
      <div class="brand" @click="goToHome">
        <div class="brand-mark">
          <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L4 17v3h3l5.3-5.3a4 4 0 0 0 5.4-5.4l-2.5 2.5-2-2 2.5-2.5z" />
          </svg>
        </div>
        <div class="brand-meta">
          <span class="brand-name">检修系统</span>
          <span class="brand-sub">MAINTENANCE&nbsp;OS</span>
        </div>
      </div>

      <div class="rail-tag">
        <span class="rail-tag-dot" />
        <span class="rail-tag-text">控制台 · ADMIN</span>
      </div>

      <!-- 导航 -->
      <nav class="nav">
        <router-link
          v-for="(item, i) in menuItems"
          :key="item.path"
          :to="item.path"
          class="nav-item"
          :class="{ active: isActive(item.path) }"
        >
          <span class="nav-bar" />
          <span class="nav-idx">{{ String(i + 1).padStart(2, '0') }}</span>
          <el-icon class="nav-icon"><component :is="item.icon" /></el-icon>
          <span class="nav-text">{{ item.name }}</span>
        </router-link>
      </nav>

      <!-- 底部用户 -->
      <div class="rail-foot">
        <div class="foot-user">
          <div class="foot-avatar">{{ userAvatar }}</div>
          <div class="foot-meta">
            <span class="foot-name">admin</span>
            <span class="foot-role">系统管理员</span>
          </div>
        </div>
        <button class="foot-logout" title="退出登录" @click="goToLogin">
          <el-icon><SwitchButton /></el-icon>
          <span class="foot-logout-text">退出</span>
        </button>
      </div>
    </aside>

    <!-- ===== Main ===== -->
    <div class="main" :class="{ expanded: !isCollapsed }">
      <!-- 顶栏 -->
      <header class="topbar">
        <div class="loc">
          <span class="loc-root">管理后台</span>
          <span class="loc-sep">/</span>
          <span class="loc-cur">{{ currentSection }}</span>
        </div>
        <div class="top-right">
          <div class="status-pill">
            <span class="status-dot" />
            <span class="status-text">系统在线</span>
            <span class="status-clock">{{ clock }}</span>
          </div>
          <el-dropdown @command="handleDropdown" trigger="click">
            <div class="avatar">{{ userAvatar }}</div>
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

      <!-- 内容 -->
      <main class="content">
        <router-view v-slot="{ Component }">
          <keep-alive include="AdminAIChat">
            <component :is="Component" />
          </keep-alive>
        </router-view>
      </main>

      <RunningTasksTray />
    </div>
  </div>
</template>

<style scoped>
.shell {
  display: flex;
  height: 100vh;
  overflow: hidden;
  background: var(--plaza-bg);
}

/* ===================== Sidebar ===================== */
.rail {
  width: 256px;
  flex-shrink: 0;
  position: fixed;
  inset: 0 auto 0 0;
  z-index: 101;
  display: flex;
  flex-direction: column;
  background:
    linear-gradient(180deg, var(--shell-ink-soft), var(--shell-ink));
  color: var(--shell-ink-text);
  border-right: 1px solid #0c0e12;
  box-shadow: 1px 0 0 var(--shell-ink-line), 8px 0 28px rgba(8, 10, 14, 0.18);
  transition: width 0.34s cubic-bezier(0.22, 1, 0.36, 1);
  overflow: hidden;
}
/* 蓝图网格纹理 */
.rail::before {
  content: '';
  position: absolute;
  inset: 0;
  pointer-events: none;
  background-image:
    linear-gradient(var(--shell-ink-line) 1px, transparent 1px),
    linear-gradient(90deg, var(--shell-ink-line) 1px, transparent 1px);
  background-size: 22px 22px;
  -webkit-mask-image: linear-gradient(180deg, rgba(0, 0, 0, 0.5), transparent 60%);
  mask-image: linear-gradient(180deg, rgba(0, 0, 0, 0.5), transparent 60%);
  opacity: 0.6;
}
.rail.collapsed {
  width: 76px;
}

/* 品牌 */
.brand {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 22px 18px 16px;
  cursor: pointer;
  position: relative;
  z-index: 1;
}
.brand-mark {
  width: 40px;
  height: 40px;
  flex-shrink: 0;
  border-radius: 11px;
  display: grid;
  place-items: center;
  color: #1b1205;
  background: linear-gradient(150deg, var(--signal), var(--signal-strong));
  box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.12) inset, 0 6px 18px rgba(255, 138, 0, 0.32);
}
.brand-meta {
  display: flex;
  flex-direction: column;
  gap: 2px;
  white-space: nowrap;
  overflow: hidden;
}
.brand-name {
  font-family: var(--font-display);
  font-weight: 700;
  font-size: 19px;
  letter-spacing: 0.2px;
  color: #fff;
}
.brand-sub {
  font-family: var(--font-mono);
  font-size: 9.5px;
  font-weight: 600;
  letter-spacing: 1.5px;
  color: var(--signal);
}

.rail-tag {
  display: flex;
  align-items: center;
  gap: 7px;
  margin: 0 18px 10px;
  padding: 7px 11px;
  border: 1px solid var(--shell-ink-line);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.02);
  position: relative;
  z-index: 1;
}
.rail-tag-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  flex-shrink: 0;
  background: var(--signal);
  box-shadow: 0 0 0 3px var(--signal-soft);
}
.rail-tag-text {
  font-family: var(--font-mono);
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 1px;
  color: var(--shell-ink-text-dim);
  white-space: nowrap;
}

/* 导航 */
.nav {
  flex: 1;
  padding: 8px 14px;
  display: flex;
  flex-direction: column;
  gap: 3px;
  position: relative;
  z-index: 1;
  overflow-y: auto;
}
.nav-item {
  position: relative;
  display: flex;
  align-items: center;
  gap: 13px;
  height: 46px;
  padding: 0 12px;
  border-radius: 10px;
  color: var(--shell-ink-text);
  text-decoration: none;
  transition: background 0.18s ease, color 0.18s ease;
  white-space: nowrap;
}
.nav-bar {
  position: absolute;
  left: 0;
  top: 50%;
  height: 0;
  width: 3px;
  border-radius: 0 3px 3px 0;
  background: var(--signal);
  transform: translateY(-50%);
  transition: height 0.22s cubic-bezier(0.22, 1, 0.36, 1);
}
.nav-idx {
  font-family: var(--font-mono);
  font-size: 11px;
  font-weight: 600;
  color: var(--shell-ink-text-dim);
  width: 18px;
  flex-shrink: 0;
  transition: color 0.18s ease;
}
.nav-icon {
  font-size: 19px;
  flex-shrink: 0;
  width: 24px;
  display: grid;
  place-items: center;
  transition: color 0.18s ease, transform 0.18s ease;
}
.nav-text {
  font-size: 14.5px;
  font-weight: 500;
  letter-spacing: 0.2px;
}
.nav-item:hover {
  background: rgba(255, 255, 255, 0.045);
  color: #fff;
}
.nav-item:hover .nav-icon {
  color: var(--signal);
}
.nav-item.active {
  background:
    linear-gradient(90deg, var(--signal-soft), rgba(255, 166, 43, 0.02));
  color: #fff;
}
.nav-item.active .nav-bar {
  height: 22px;
}
.nav-item.active .nav-idx,
.nav-item.active .nav-icon {
  color: var(--signal);
}

/* 底部 */
.rail-foot {
  padding: 12px 14px 16px;
  border-top: 1px solid var(--shell-ink-line);
  display: flex;
  align-items: center;
  gap: 8px;
  position: relative;
  z-index: 1;
}
.foot-user {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
  flex: 1;
}
.foot-avatar {
  width: 34px;
  height: 34px;
  flex-shrink: 0;
  border-radius: 9px;
  display: grid;
  place-items: center;
  font-weight: 700;
  font-size: 14px;
  color: #1b1205;
  background: linear-gradient(150deg, var(--signal), var(--signal-strong));
}
.foot-meta {
  display: flex;
  flex-direction: column;
  min-width: 0;
  white-space: nowrap;
}
.foot-name {
  font-size: 13px;
  font-weight: 600;
  color: #fff;
}
.foot-role {
  font-size: 11px;
  color: var(--shell-ink-text-dim);
}
.foot-logout {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 5px;
  height: 32px;
  padding: 0 10px;
  border: 1px solid var(--shell-ink-line);
  border-radius: 8px;
  background: transparent;
  color: var(--shell-ink-text-dim);
  font-size: 12.5px;
  cursor: pointer;
  transition: all 0.18s ease;
}
.foot-logout:hover {
  color: var(--signal);
  border-color: var(--signal-line);
  background: var(--signal-soft);
}

/* —— 折叠态：仅图标 —— */
.rail.collapsed .brand-meta,
.rail.collapsed .rail-tag-text,
.rail.collapsed .nav-idx,
.rail.collapsed .nav-text,
.rail.collapsed .foot-meta,
.rail.collapsed .foot-logout-text {
  opacity: 0;
  width: 0;
  overflow: hidden;
}
.rail.collapsed .brand,
.rail.collapsed .rail-tag,
.rail.collapsed .nav-item,
.rail.collapsed .rail-foot {
  justify-content: center;
  gap: 0;
}
.rail.collapsed .rail-tag {
  padding: 7px;
}
.rail.collapsed .nav-item {
  padding: 0;
}
.rail.collapsed .foot-logout {
  padding: 0;
  width: 32px;
  justify-content: center;
}

/* ===================== Main ===================== */
.main {
  flex: 1;
  margin-left: 76px;
  transition: margin-left 0.34s cubic-bezier(0.22, 1, 0.36, 1);
  display: flex;
  flex-direction: column;
  height: 100vh;
  overflow: hidden;
}
.main.expanded {
  margin-left: 256px;
}

/* 顶栏 */
.topbar {
  height: 64px;
  flex-shrink: 0;
  background: rgba(255, 255, 255, 0.82);
  backdrop-filter: saturate(1.4) blur(10px);
  border-bottom: 1px solid var(--plaza-border);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 26px;
  position: sticky;
  top: 0;
  z-index: 50;
}
.loc {
  display: flex;
  align-items: baseline;
  gap: 9px;
}
.loc-root {
  font-family: var(--font-mono);
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.4px;
  color: var(--plaza-text-muted);
}
.loc-sep {
  color: var(--plaza-border-strong);
  font-size: 14px;
}
.loc-cur {
  font-family: var(--font-display);
  font-size: 19px;
  font-weight: 700;
  color: var(--plaza-heading);
  letter-spacing: 0.2px;
}
.top-right {
  display: flex;
  align-items: center;
  gap: 16px;
}
.status-pill {
  display: flex;
  align-items: center;
  gap: 8px;
  height: 32px;
  padding: 0 12px;
  border: 1px solid var(--plaza-border);
  border-radius: 999px;
  background: var(--plaza-bg-card);
}
.status-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--plaza-success);
  box-shadow: 0 0 0 3px rgba(22, 163, 74, 0.16);
  animation: pulse 2.4s ease-in-out infinite;
}
@keyframes pulse {
  0%, 100% { box-shadow: 0 0 0 3px rgba(22, 163, 74, 0.16); }
  50% { box-shadow: 0 0 0 5px rgba(22, 163, 74, 0.05); }
}
.status-text {
  font-size: 12.5px;
  font-weight: 600;
  color: var(--plaza-text);
}
.status-clock {
  font-family: var(--font-mono);
  font-size: 12px;
  font-weight: 600;
  color: var(--plaza-text-muted);
  padding-left: 8px;
  border-left: 1px solid var(--plaza-border);
}
.avatar {
  width: 38px;
  height: 38px;
  border-radius: 11px;
  display: grid;
  place-items: center;
  font-size: 15px;
  font-weight: 700;
  cursor: pointer;
  user-select: none;
  color: #1b1205;
  background: linear-gradient(150deg, var(--signal), var(--signal-strong));
  box-shadow: 0 4px 14px rgba(255, 138, 0, 0.28);
  transition: transform 0.18s ease;
}
.avatar:hover {
  transform: translateY(-1px);
}

/* 内容 */
.content {
  flex: 1;
  padding: 30px 26px;
  overflow-y: auto;
  position: relative;
}

@media (max-width: 900px) {
  .rail { width: 76px; }
  .rail .brand-meta,
  .rail .rail-tag-text,
  .rail .nav-idx,
  .rail .nav-text,
  .rail .foot-meta,
  .rail .foot-logout-text { opacity: 0; width: 0; overflow: hidden; }
  .rail .brand, .rail .rail-tag, .rail .nav-item, .rail .rail-foot { justify-content: center; gap: 0; }
  .rail .nav-item { padding: 0; }
  .main { margin-left: 76px; }
  .status-pill { display: none; }
}
</style>
