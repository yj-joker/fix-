<script setup>
import { ref } from 'vue'
import { DocumentChecked, ArrowRight, Check } from '@element-plus/icons-vue'

const guides = ref([
  {
    id: 1,
    title: '发动机日常维护',
    category: '发动机维修',
    steps: 8,
    duration: '45分钟',
    level: '基础',
    updatedTime: '2024-01-15',
  },
  {
    id: 2,
    title: '电气系统故障诊断',
    category: '电气故障',
    steps: 12,
    duration: '90分钟',
    level: '进阶',
    updatedTime: '2024-01-14',
  },
  {
    id: 3,
    title: '液压系统保养',
    category: '液压系统',
    steps: 6,
    duration: '30分钟',
    level: '基础',
    updatedTime: '2024-01-12',
  },
  {
    id: 4,
    title: '精密仪器校准',
    category: '设备保养',
    steps: 15,
    duration: '120分钟',
    level: '高级',
    updatedTime: '2024-01-10',
  },
])

const selectedGuide = ref(null)

function selectGuide(guide) {
  selectedGuide.value = guide
}
</script>

<template>
  <div class="user-guide">
    <!-- Page Header -->
    <div class="page-header">
      <h2 class="page-title">作业指引</h2>
      <p class="page-desc">标准化操作流程与步骤指引，降低操作失误率</p>
    </div>

    <!-- Guide List -->
    <div class="guide-content">
      <div class="guide-list">
        <div
          v-for="guide in guides"
          :key="guide.id"
          class="guide-card"
          :class="{ active: selectedGuide?.id === guide.id }"
          @click="selectGuide(guide)"
        >
          <div class="guide-icon">
            <el-icon><DocumentChecked /></el-icon>
          </div>
          <div class="guide-info">
            <h4 class="guide-title">{{ guide.title }}</h4>
            <span class="guide-category">{{ guide.category }}</span>
          </div>
          <el-icon class="guide-arrow"><ArrowRight /></el-icon>
        </div>
      </div>

      <!-- Guide Detail -->
      <div v-if="selectedGuide" class="guide-detail">
        <div class="detail-header">
          <div>
            <h3 class="detail-title">{{ selectedGuide.title }}</h3>
            <div class="detail-meta">
              <span class="meta-tag">{{ selectedGuide.category }}</span>
              <span class="meta-tag level">{{ selectedGuide.level }}</span>
              <span class="meta-item">更新于 {{ selectedGuide.updatedTime }}</span>
            </div>
          </div>
          <div class="detail-stats">
            <span class="stat">
              <el-icon><DocumentChecked /></el-icon>
              {{ selectedGuide.steps }} 步骤
            </span>
            <span class="stat">{{ selectedGuide.duration }}</span>
          </div>
        </div>

        <div class="detail-steps">
          <div class="step-item" v-for="i in selectedGuide.steps" :key="i">
            <div class="step-num">{{ i }}</div>
            <div class="step-content">
              <h5 class="step-title">步骤 {{ i }}：{{ getStepTitle(selectedGuide, i) }}</h5>
              <p class="step-desc">{{ getStepDesc(selectedGuide, i) }}</p>
            </div>
            <div class="step-status">
              <el-icon class="check-icon"><Check /></el-icon>
            </div>
          </div>
        </div>
      </div>

      <!-- Empty State -->
      <div v-else class="guide-empty">
        <div class="empty-icon">
          <el-icon><DocumentChecked /></el-icon>
        </div>
        <p class="empty-text">请选择左侧作业指引开始查看</p>
      </div>
    </div>
  </div>
</template>

<script>
function getStepTitle(guide, step) {
  const titles = {
    1: ['准备工作', '安全检查', '外观检查', '运行测试', '参数调整', '清洁保养', '记录归档', '完成交接', '启动前检查', '运行监测', '停机操作', '数据记录'],
    2: ['故障现象确认', '历史数据查询', '初步检查', '电气测试', '绝缘检测', '接线检查', '故障定位', '原因分析', '维修方案', '实施维修', '功能测试', '归档完成'],
    3: ['油液检查', '管路检查', '压力测试', '滤芯更换', '系统排气', '性能验证', '泄漏检查', '记录填写', '交接确认'],
    4: ['环境检查', '设备预热', '标准件准备', '校准参数', '基准校准', '线性校准', '重复性测试', '误差记录', '补偿调整', '最终验证', '数据存档', '签认记录', '清理现场', '设备复位', '归档完成'],
  }
  const key = guide.id === 1 ? 1 : guide.id === 2 ? 2 : guide.id === 3 ? 3 : 4
  return titles[key][step - 1] || '标准步骤'
}

function getStepDesc(guide, step) {
  const descs = {
    1: ['检查工具完整性和个人防护装备', '确认设备断电并悬挂警示牌', '检查外观无明显损伤和漏油', '启动设备观察运行状态', '根据手册调整参数至标准值', '清洁设备表面和散热部件', '填写维护记录表', '通知相关人员验收交接'],
    2: ['详细记录故障现象和报警信息', '查阅设备历史维修记录', '目视检查有无明显异常', '使用万用表测量关键点位', '测量电机绝缘电阻值', '检查所有接线端子紧固', '定位故障点并标记', '分析故障根本原因', '制定维修方案并审批', '按方案实施维修作业', '维修后进行功能测试', '整理维修记录归档'],
    3: ['检查液压油油位和颜色', '检查各管路连接是否牢靠', '测试系统压力是否正常', '更换规定型号的滤芯', '排除系统内残余空气', '验证液压系统工作正常', '检查各密封点有无泄漏', '填写液压系统点检卡'],
    4: ['确认校准环境温度湿度符合要求', '设备通电预热30分钟', '准备标准计量器具并校准', '输入标准参数进行基准校准', '多点校准确保线性度', '重复测量验证稳定性', '记录各项误差数据', '根据误差进行系统补偿', '再次验证确保精度达标', '填写校准报告', '相关人员签字确认', '清理校准现场', '设备恢复备用状态', '所有记录归档保存'],
  }
  const key = guide.id === 1 ? 1 : guide.id === 2 ? 2 : guide.id === 3 ? 3 : 4
  return descs[key][step - 1] || '按照标准流程执行'
}
</script>

<style scoped>
.user-guide {
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

.guide-content {
  display: grid;
  grid-template-columns: 320px 1fr;
  gap: 24px;
  min-height: 500px;
}

.guide-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.guide-card {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 16px;
  background: var(--plaza-bg-card);
  border: 1px solid var(--plaza-border);
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
}
.guide-card:hover,
.guide-card.active {
  border-color: var(--plaza-accent);
  background: var(--plaza-accent-soft);
}
.guide-icon {
  width: 44px;
  height: 44px;
  background: var(--plaza-accent-soft);
  color: var(--plaza-accent);
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
  flex-shrink: 0;
}
.guide-info {
  flex: 1;
}
.guide-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--plaza-text);
  margin-bottom: 4px;
}
.guide-category {
  font-size: 12px;
  color: var(--plaza-text-muted);
}
.guide-arrow {
  color: var(--plaza-text-muted);
  transition: transform 0.2s ease;
}
.guide-card:hover .guide-arrow {
  transform: translateX(4px);
}

.guide-detail {
  background: var(--plaza-bg-card);
  border: 1px solid var(--plaza-border);
  border-radius: 14px;
  padding: 24px;
}
.detail-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 24px;
  padding-bottom: 20px;
  border-bottom: 1px solid var(--plaza-border);
}
.detail-title {
  font-size: 1.2rem;
  font-weight: 700;
  color: var(--plaza-text);
  margin-bottom: 10px;
}
.detail-meta {
  display: flex;
  align-items: center;
  gap: 8px;
}
.meta-tag {
  padding: 3px 10px;
  background: var(--plaza-accent-soft);
  color: var(--plaza-accent);
  border-radius: 8px;
  font-size: 12px;
}
.meta-tag.level {
  background: rgba(59, 130, 246, 0.1);
  color: #3B82F6;
}
.meta-item {
  font-size: 12px;
  color: var(--plaza-text-muted);
}
.detail-stats {
  display: flex;
  align-items: center;
  gap: 16px;
}
.stat {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 13px;
  color: var(--plaza-text-muted);
}

.detail-steps {
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.step-item {
  display: flex;
  align-items: flex-start;
  gap: 14px;
}
.step-num {
  width: 32px;
  height: 32px;
  background: var(--plaza-accent);
  color: #fff;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: 600;
  flex-shrink: 0;
}
.step-content {
  flex: 1;
}
.step-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--plaza-text);
  margin-bottom: 4px;
}
.step-desc {
  font-size: 13px;
  color: var(--plaza-text-muted);
  line-height: 1.5;
}
.step-status {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.check-icon {
  color: var(--app-success);
  font-size: 18px;
}

.guide-empty {
  background: var(--plaza-bg-card);
  border: 1px solid var(--plaza-border);
  border-radius: 14px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
}
.empty-icon {
  font-size: 48px;
  color: var(--plaza-text-muted);
}
.empty-text {
  font-size: 14px;
  color: var(--plaza-text-muted);
}

@media (max-width: 900px) {
  .guide-content {
    grid-template-columns: 1fr;
  }
}
</style>