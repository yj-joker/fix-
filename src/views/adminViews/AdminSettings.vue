<script setup>
import { ref } from 'vue'
import { Check } from '@element-plus/icons-vue'

const settings = ref({
  systemName: '设备检修知识检索系统',
  systemDesc: '基于多模态大模型技术的智能设备检修平台',
  maxUploadSize: 50,
  allowRegister: false,
  auditRequired: true,
  maintenanceMode: false,
  notificationEmail: 'admin@example.com',
})

const saving = ref(false)
const saveSuccess = ref(false)

async function saveSettings() {
  saving.value = true
  saveSuccess.value = false
  // 模拟保存
  await new Promise(resolve => setTimeout(resolve, 800))
  saving.value = false
  saveSuccess.value = true
  setTimeout(() => { saveSuccess.value = false }, 2000)
}
</script>

<template>
  <div class="admin-settings">
    <!-- Page Header -->
    <div class="page-header">
      <div class="page-title-area">
        <h2 class="page-title">系统设置</h2>
        <p class="page-desc">配置系统参数与功能选项</p>
      </div>
      <el-button
        type="primary"
        :loading="saving"
        :class="{ 'is-success': saveSuccess }"
        @click="saveSettings"
      >
        <template v-if="saveSuccess">
          <el-icon><Check /></el-icon>
          保存成功
        </template>
        <template v-else>
          保存设置
        </template>
      </el-button>
    </div>

    <!-- Settings Sections -->
    <div class="settings-sections">
      <!-- Basic Settings -->
      <div class="settings-section">
        <h3 class="section-title">基本设置</h3>
        <div class="settings-group">
          <div class="setting-item">
            <div class="setting-info">
              <label class="setting-label">系统名称</label>
              <p class="setting-desc">显示在页面标题和导航栏中的系统名称</p>
            </div>
            <el-input v-model="settings.systemName" class="setting-input" />
          </div>
          <div class="setting-item">
            <div class="setting-info">
              <label class="setting-label">系统描述</label>
              <p class="setting-desc">系统的简短描述，用于首页展示</p>
            </div>
            <el-input v-model="settings.systemDesc" class="setting-input" type="textarea" :rows="2" />
          </div>
          <div class="setting-item">
            <div class="setting-info">
              <label class="setting-label">通知邮箱</label>
              <p class="setting-desc">接收系统通知的管理员邮箱</p>
            </div>
            <el-input v-model="settings.notificationEmail" class="setting-input" />
          </div>
        </div>
      </div>

      <!-- Upload Settings -->
      <div class="settings-section">
        <h3 class="section-title">上传设置</h3>
        <div class="settings-group">
          <div class="setting-item">
            <div class="setting-info">
              <label class="setting-label">最大上传大小 (MB)</label>
              <p class="setting-desc">单次上传文件的最大大小限制</p>
            </div>
            <el-input-number v-model="settings.maxUploadSize" :min="1" :max="200" class="setting-input" />
          </div>
        </div>
      </div>

      <!-- Security Settings -->
      <div class="settings-section">
        <h3 class="section-title">安全设置</h3>
        <div class="settings-group">
          <div class="setting-item">
            <div class="setting-info">
              <label class="setting-label">允许新用户注册</label>
              <p class="setting-desc">是否允许普通用户自行注册账号</p>
            </div>
            <el-switch v-model="settings.allowRegister" />
          </div>
          <div class="setting-item">
            <div class="setting-info">
              <label class="setting-label">注册需审核</label>
              <p class="setting-desc">新注册用户需要管理员审核后才能使用</p>
            </div>
            <el-switch v-model="settings.auditRequired" />
          </div>
        </div>
      </div>

      <!-- System Settings -->
      <div class="settings-section">
        <h3 class="section-title">系统状态</h3>
        <div class="settings-group">
          <div class="setting-item">
            <div class="setting-info">
              <label class="setting-label">维护模式</label>
              <p class="setting-desc">开启后，普通用户将无法访问系统</p>
            </div>
            <el-switch v-model="settings.maintenanceMode" />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.admin-settings {
  max-width: 800px;
  margin: 0 auto;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 32px;
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

.settings-sections {
  display: flex;
  flex-direction: column;
  gap: 32px;
}
.settings-section {
  background: var(--plaza-bg-card);
  border: 1px solid var(--plaza-border);
  border-radius: 14px;
  padding: 24px;
}
.section-title {
  font-size: 1rem;
  font-weight: 600;
  color: var(--plaza-text);
  margin-bottom: 20px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--plaza-border);
}

.settings-group {
  display: flex;
  flex-direction: column;
  gap: 20px;
}
.setting-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 24px;
}
.setting-info {
  flex: 1;
}
.setting-label {
  display: block;
  font-size: 14px;
  font-weight: 500;
  color: var(--plaza-text);
  margin-bottom: 4px;
}
.setting-desc {
  font-size: 13px;
  color: var(--plaza-text-muted);
}
.setting-input {
  width: 300px;
}

.is-success {
  background: var(--app-success) !important;
  border-color: var(--app-success) !important;
}

@media (max-width: 700px) {
  .setting-item {
    flex-direction: column;
    align-items: flex-start;
  }
  .setting-input {
    width: 100%;
  }
}
</style>