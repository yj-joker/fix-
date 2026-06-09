<script setup>
import { ref, computed } from 'vue'
import {
  ArrowRight,
  Check,
  User,
  Document,
  Warning,
  List,
  Collection,
  ChatDotRound,
  Setting,
} from '@element-plus/icons-vue'

const stats = [
  { label: '用户总数', value: '128', icon: User, color: '#F97316' },
  { label: '知识条目', value: '1,256', icon: Document, color: '#22c55e' },
  { label: '待审核案例', value: '89', icon: Warning, color: '#F59E0B' },
  { label: '系统可用性', value: '99.8%', icon: Check, color: '#3B82F6' },
]

const recentActivities = [
  { user: '张工程师', action: '提交了检修案例', time: '5分钟前', status: 'pending' },
  { user: '李管理员', action: '审核通过了知识条目', time: '15分钟前', status: 'approved' },
  { user: '王技术员', action: '更新了作业指引', time: '30分钟前', status: 'approved' },
  { user: '赵工程师', action: '提交了设备保养案例', time: '1小时前', status: 'pending' },
]

const quickActions = [
  {
    title: '任务管理',
    desc: '查看检修任务、审核执行过程与沉淀案例',
    path: '/admin/tasks',
    icon: List,
    tone: 'orange',
  },
  {
    title: '知识中心',
    desc: '维护知识条目、作业步骤和知识图谱',
    path: '/admin/knowledge-center',
    icon: Collection,
    tone: 'green',
  },
  {
    title: 'AI 助手',
    desc: '进入管理端 AI 对话，辅助排障和内容整理',
    path: '/admin/ai-chat',
    icon: ChatDotRound,
    tone: 'cyan',
  },
  {
    title: '系统管理',
    desc: '维护用户、通知、个人资料和平台配置',
    path: '/admin/system',
    icon: Setting,
    tone: 'slate',
  },
]

// 检修分类点击量数据
const categoryClicksRaw = [
  { name: '发动机维修', clicks: 1250 },
  { name: '电气故障', clicks: 980 },
  { name: '设备保养', clicks: 756 },
  { name: '液压系统', clicks: 420 },
  { name: '传动系统', clicks: 312 },
  { name: '安全检查', clicks: 285 },
  { name: '冷却系统', clicks: 198 },
]

// 饼图数据：前6名 + 其他
const top6 = categoryClicksRaw.slice(0, 6)
const othersClicks = categoryClicksRaw.slice(6).reduce((sum, item) => sum + item.clicks, 0)

const chartColors = ['#F97316', '#3B82F6', '#22c55e', '#8B5CF6', '#EF4444', '#F59E0B']

const pieData = computed(() => {
  const items = [
    ...top6.map((item, i) => ({ name: item.name, clicks: item.clicks, color: chartColors[i] })),
    { name: '其他', clicks: othersClicks, color: '#6B7280' },
  ]
  const total = items.reduce((sum, item) => sum + item.clicks, 0)
  let currentAngle = 0
  return items.map((item, i) => {
    const angle = (item.clicks / total) * 360
    const startAngle = currentAngle
    currentAngle += angle
    return {
      ...item,
      angle,
      startAngle,
      percent: ((item.clicks / total) * 100).toFixed(1),
    }
  })
})

// 生成SVG扇形路径
function describeArc(cx, cy, r, startAngle, endAngle) {
  const start = polarToCartesian(cx, cy, r, endAngle)
  const end = polarToCartesian(cx, cy, r, startAngle)
  const largeArcFlag = endAngle - startAngle <= 180 ? 0 : 1
  return [
    'M', cx, cy,
    'L', start.x, start.y,
    'A', r, r, 0, largeArcFlag, 0, end.x, end.y,
    'Z'
  ].join(' ')
}

function polarToCartesian(cx, cy, r, angle) {
  const rad = (angle - 90) * Math.PI / 180
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) }
}

// 计算扇形中心点坐标（用于放置标签）
function getSliceLabelPosition(item) {
  const cx = 130, cy = 130, r = 75
  const midAngle = (item.startAngle + item.angle / 2 - 90) * Math.PI / 180
  return {
    x: cx + r * Math.cos(midAngle),
    y: cy + r * Math.sin(midAngle),
  }
}

const piePaths = computed(() => {
  return pieData.value.map(item => ({
    path: describeArc(130, 130, 115, item.startAngle, item.startAngle + item.angle),
    color: item.color,
    name: item.name,
    clicks: item.clicks,
    percent: item.percent,
    labelPos: getSliceLabelPosition(item),
  }))
})

const hoveredSlice = ref(null)
</script>

<template>
  <div class="admin-dashboard">
    <!-- Welcome Section -->
    <div class="welcome-section">
      <h1 class="welcome-title">欢迎回来，<span class="highlight">管理员</span></h1>
      <p class="welcome-desc">这是管理后台的概览页面，您可以查看系统整体运行状态</p>
    </div>

    <!-- Pie Chart Section - Hero Card -->
    <div class="card pie-hero-card">
      <div class="pie-hero-header">
        <div>
          <h3 class="card-title">检修分类点击量分析</h3>
          <span class="card-subtitle">帮助识别重点培训方向，数据驱动决策</span>
        </div>
      </div>
      <div class="pie-hero-body">
        <div class="pie-chart">
          <svg viewBox="0 0 260 260" class="pie-svg">
            <path
              v-for="(slice, i) in piePaths"
              :key="i"
              :d="slice.path"
              :fill="slice.color"
              class="pie-slice"
              :class="{ 'pie-slice-hovered': hoveredSlice === i }"
              @mouseenter="hoveredSlice = i"
              @mouseleave="hoveredSlice = null"
            />
            <!-- Percentage labels -->
            <text
              v-for="(slice, i) in piePaths"
              :key="'label-' + i"
              :x="slice.labelPos.x"
              :y="slice.labelPos.y"
              class="pie-label"
              :class="{ 'pie-label-hovered': hoveredSlice === i }"
              text-anchor="middle"
              dominant-baseline="middle"
              @mouseenter="hoveredSlice = i"
              @mouseleave="hoveredSlice = null"
            >
              {{ slice.percent }}%
            </text>
          </svg>
          <!-- Center label hidden -->
        </div>
        <div class="pie-legend">
          <div
            v-for="(item, i) in pieData"
            :key="i"
            class="legend-item"
            :class="{ 'legend-hovered': hoveredSlice === i }"
            @mouseenter="hoveredSlice = i"
            @mouseleave="hoveredSlice = null"
          >
            <span class="legend-color-bar" :style="{ background: item.color }"></span>
            <div class="legend-info">
              <span class="legend-name">{{ item.name }}</span>
              <div class="legend-stats">
                <span class="legend-clicks">{{ item.clicks.toLocaleString() }}</span>
                <span class="legend-unit">次点击</span>
                <span class="legend-percent">{{ item.percent }}%</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Stats Cards -->
    <div class="stats-grid">
      <div v-for="stat in stats" :key="stat.label" class="stat-card">
        <div class="stat-icon" :style="{ background: stat.color + '15', color: stat.color }">
          <el-icon><component :is="stat.icon" /></el-icon>
        </div>
        <div class="stat-info">
          <div class="stat-value">{{ stat.value }}</div>
          <div class="stat-label">{{ stat.label }}</div>
        </div>
      </div>
    </div>

    <!-- Main Content Grid -->
    <div class="content-grid">
      <!-- Recent Activities -->
      <div class="card activities-card">
        <div class="card-header">
          <h3 class="card-title">最近动态</h3>
          <span class="card-subtitle">平台用户的最新操作记录</span>
        </div>
        <div class="activity-list">
          <div v-for="(item, index) in recentActivities" :key="index" class="activity-item">
            <div class="activity-dot" :class="item.status"></div>
            <div class="activity-info">
              <span class="activity-user">{{ item.user }}</span>
              <span class="activity-action">{{ item.action }}</span>
            </div>
            <span class="activity-time">{{ item.time }}</span>
          </div>
        </div>
      </div>

      <!-- Quick Actions -->
      <div class="card quick-actions-card">
        <div class="card-header">
          <h3 class="card-title">快捷操作</h3>
          <span class="card-subtitle">常用的管理功能入口</span>
        </div>
        <div class="action-list">
          <router-link
            v-for="action in quickActions"
            :key="action.path"
            :to="action.path"
            class="action-item"
          >
            <div class="action-icon" :class="action.tone">
              <el-icon><component :is="action.icon" /></el-icon>
            </div>
            <div class="action-info">
              <span class="action-title">{{ action.title }}</span>
              <span class="action-desc">{{ action.desc }}</span>
            </div>
            <el-icon class="action-arrow"><ArrowRight /></el-icon>
          </router-link>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.admin-dashboard {
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
  grid-template-columns: 1.2fr 1fr;
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

.activity-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.activity-item {
  display: flex;
  align-items: center;
  gap: 12px;
}
.activity-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}
.activity-dot.approved {
  background: var(--app-success);
}
.activity-dot.pending {
  background: var(--plaza-accent);
}
.activity-info {
  flex: 1;
  display: flex;
  gap: 6px;
  font-size: 14px;
}
.activity-user {
  color: var(--plaza-text);
  font-weight: 500;
}
.activity-action {
  color: var(--plaza-text-muted);
}
.activity-time {
  font-size: 13px;
  color: var(--plaza-text-muted);
}

.action-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.action-item {
  min-height: 76px;
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
.action-icon.orange {
  color: var(--plaza-accent);
  background: var(--plaza-accent-soft);
}
.action-icon.green {
  color: var(--plaza-success);
  background: var(--plaza-success-soft);
}
.action-icon.blue {
  color: #2563eb;
  background: #eff6ff;
}
.action-icon.cyan {
  color: #0891b2;
  background: #ecfeff;
}
.action-icon.slate {
  color: #475569;
  background: #f1f5f9;
}
.action-info {
  min-width: 0;
}
.action-title {
  display: block;
  font-size: 14px;
  font-weight: 600;
  color: var(--plaza-text);
  margin-bottom: 2px;
}
.action-desc {
  display: block;
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

/* Pie Hero Card */
.pie-hero-card {
  margin-bottom: 28px;
}
.pie-hero-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 16px;
}
.pie-hero-body {
  display: flex;
  align-items: center;
  gap: 32px;
}
.pie-chart {
  position: relative;
  flex-shrink: 0;
}
.pie-svg {
  width: 280px;
  height: 280px;
}
.pie-slice {
  stroke: #fff;
  stroke-width: 2;
  transition: opacity 0.2s ease, transform 0.2s ease;
  transform-origin: center;
  cursor: pointer;
}
.pie-slice:hover,
.pie-slice-hovered {
  opacity: 0.85;
  transform: scale(1.03);
}
.pie-label {
  font-size: 12px;
  font-weight: 700;
  fill: #fff;
  pointer-events: none;
  text-shadow: 0 1px 2px rgba(0,0,0,0.3);
  transition: font-size 0.2s ease;
}
.pie-label-hovered {
  font-size: 14px;
}
.pie-legend {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.legend-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  border-radius: 8px;
  border: 1px solid transparent;
  transition: all 0.2s ease;
  cursor: pointer;
}
.legend-item:hover,
.legend-hovered {
  background: var(--plaza-accent-soft);
  border-color: var(--plaza-accent);
}
.legend-color-bar {
  width: 4px;
  height: 32px;
  border-radius: 2px;
  flex-shrink: 0;
}
.legend-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.legend-name {
  font-size: 13px;
  font-weight: 600;
  color: var(--plaza-text);
}
.legend-stats {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
}
.legend-clicks {
  font-weight: 700;
  color: var(--plaza-text);
}
.legend-unit {
  color: var(--plaza-text-muted);
}
.legend-percent {
  color: var(--plaza-accent);
  font-weight: 600;
  margin-left: auto;
  padding-right: 4px;
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
