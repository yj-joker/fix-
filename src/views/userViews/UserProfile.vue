<template>
  <section class="user-profile-page" v-loading="loading">
    <header class="profile-hero">
      <div class="identity">
        <div class="avatar">{{ userInitial }}</div>
        <div class="identity-copy">
          <h2>{{ userInfo.name || '未设置姓名' }}</h2>
          <div class="identity-meta">
            <span>{{ getTypeText(userInfo.type) }}</span>
            <span class="dot" />
            <span>{{ userInfo.number || '暂无工号' }}</span>
          </div>
        </div>
      </div>
      <span class="status-badge" :class="getStatusClass(userInfo.status)">
        {{ getStatusText(userInfo.status) }}
      </span>
    </header>

    <div class="profile-grid">
      <section class="panel info-panel">
        <div class="panel-head">
          <h3>账号信息</h3>
          <p>当前登录账号的基础资料与联系方式</p>
        </div>

        <div class="info-grid">
          <div class="info-item">
            <label>姓名</label>
            <span>{{ userInfo.name || '-' }}</span>
          </div>
          <div class="info-item">
            <label>工号</label>
            <span>{{ userInfo.number || '-' }}</span>
          </div>
          <div class="info-item">
            <label>性别</label>
            <span>{{ getGenderText(userInfo.gender) }}</span>
          </div>
          <div class="info-item">
            <label>用户类型</label>
            <span>{{ getTypeText(userInfo.type) }}</span>
          </div>
          <div class="info-item">
            <label>状态</label>
            <span class="inline-status" :class="getStatusClass(userInfo.status)">
              {{ getStatusText(userInfo.status) }}
            </span>
          </div>
          <div class="info-item">
            <label>手机号</label>
            <span>{{ userInfo.phone || '-' }}</span>
          </div>
          <div class="info-item">
            <label>邮箱</label>
            <span>{{ userInfo.email || '-' }}</span>
          </div>
          <div class="info-item">
            <label>入职日期</label>
            <span>{{ formatDate(userInfo.hireDate, false) }}</span>
          </div>
          <div class="info-item wide">
            <label>最后登录时间</label>
            <span>{{ formatDate(userInfo.lastLoginTime) }}</span>
          </div>
        </div>
      </section>

      <section class="panel edit-panel">
        <div class="panel-head">
          <h3>用户信息更改</h3>
          <p>维护当前账号的手机号和邮箱信息</p>
        </div>

        <el-form ref="formRef" :model="form" :rules="rules" label-position="top">
          <el-form-item label="手机号" prop="phone">
            <el-input v-model="form.phone" placeholder="请输入手机号" clearable />
          </el-form-item>
          <el-form-item label="邮箱" prop="email">
            <el-input v-model="form.email" placeholder="请输入邮箱" clearable />
          </el-form-item>
          <el-button type="primary" :loading="submitting" @click="handleUpdate">
            保存修改
          </el-button>
        </el-form>
      </section>
    </div>
  </section>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { getUserById, updateUser } from '@/api/user'

const loading = ref(false)
const submitting = ref(false)
const formRef = ref(null)
const userInfo = ref({})

const form = reactive({
  phone: '',
  email: '',
})

const rules = {
  phone: [
    {
      pattern: /^1[3-9]\d{9}$/,
      message: '请输入正确的手机号',
      trigger: 'blur',
    },
  ],
  email: [
    { type: 'email', message: '请输入正确的邮箱格式', trigger: 'blur' },
  ],
}

const userInitial = computed(() => userInfo.value.name?.[0] || 'U')

function getCurrentUser() {
  try {
    return JSON.parse(localStorage.getItem('userInfo') || '{}')
  } catch {
    return {}
  }
}

function syncLocalUser(nextUser) {
  const current = getCurrentUser()
  localStorage.setItem('userInfo', JSON.stringify({ ...current, ...nextUser }))
}

function getTypeText(type) {
  const map = { 0: '普通用户', 1: '管理员' }
  return map[Number(type)] || '未知'
}

function getGenderText(gender) {
  const map = { 0: '男', 1: '女' }
  return map[Number(gender)] || '-'
}

function getStatusText(status) {
  const code = Number(status)
  if (Number.isNaN(code)) return '-'
  return code === 1 ? '已激活' : '未激活'
}

function getStatusClass(status) {
  return Number(status) === 1 ? 'active' : 'inactive'
}

function formatDate(value, withTime = true) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {}),
  })
}

async function fetchUserInfo() {
  const current = getCurrentUser()
  if (!current.id) {
    ElMessage.warning('未找到当前用户信息，请重新登录')
    return
  }

  loading.value = true
  try {
    const res = await getUserById(current.id)
    if (res.code === '200' || res.code === 200) {
      userInfo.value = res.data || {}
      form.phone = userInfo.value.phone || ''
      form.email = userInfo.value.email || ''
      syncLocalUser(userInfo.value)
    } else {
      ElMessage.error(res.message || '获取个人信息失败')
    }
  } catch (error) {
    ElMessage.error('获取个人信息失败')
  } finally {
    loading.value = false
  }
}

async function handleUpdate() {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return

  submitting.value = true
  try {
    const current = getCurrentUser()
    const payload = {
      id: current.id,
      name: userInfo.value.name,
      number: userInfo.value.number,
      phone: form.phone?.trim() || null,
      email: form.email?.trim() || null,
    }
    const res = await updateUser(payload)
    if (res.code === '200' || res.code === 200) {
      ElMessage.success('保存成功')
      await fetchUserInfo()
    } else {
      ElMessage.error(res.message || '保存失败')
    }
  } catch (error) {
    ElMessage.error('保存失败')
  } finally {
    submitting.value = false
  }
}

onMounted(fetchUserInfo)
</script>

<style scoped>
.user-profile-page {
  max-width: 1080px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.profile-hero,
.panel {
  border: 1px solid var(--plaza-border);
  border-radius: 12px;
  background: var(--plaza-bg-card);
  box-shadow: var(--plaza-shadow-organic);
}

.profile-hero {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 22px;
}

.identity {
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 14px;
}

.avatar {
  width: 62px;
  height: 62px;
  flex: 0 0 62px;
  border-radius: 14px;
  display: grid;
  place-items: center;
  color: #fff;
  background: linear-gradient(135deg, var(--plaza-accent), var(--plaza-accent-hover));
  font-size: 24px;
  font-weight: 800;
}

.identity-copy {
  min-width: 0;
}

.identity-copy h2 {
  color: var(--plaza-heading);
  font-size: 22px;
  font-weight: 800;
  line-height: 1.25;
}

.identity-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 6px;
  color: var(--plaza-text-muted);
  font-size: 13px;
}

.dot {
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: var(--plaza-border-strong);
}

.status-badge,
.inline-status {
  width: fit-content;
  display: inline-flex;
  align-items: center;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 700;
}

.status-badge {
  padding: 7px 12px;
}

.inline-status {
  padding: 4px 9px;
}

.active {
  color: var(--plaza-success);
  background: var(--plaza-success-soft);
}

.inactive {
  color: var(--plaza-danger);
  background: var(--plaza-danger-soft);
}

.profile-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 340px;
  gap: 18px;
  align-items: start;
}

.panel {
  padding: 20px;
}

.panel-head {
  margin-bottom: 18px;
}

.panel-head h3 {
  color: var(--plaza-heading);
  font-size: 17px;
  font-weight: 800;
}

.panel-head p {
  margin-top: 4px;
  color: var(--plaza-text-muted);
  font-size: 13px;
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}

.info-item {
  min-width: 0;
  padding: 12px;
  border: 1px solid var(--plaza-border);
  border-radius: 10px;
  background: var(--plaza-bg-input);
}

.info-item.wide {
  grid-column: 1 / -1;
}

.info-item label {
  display: block;
  margin-bottom: 6px;
  color: var(--plaza-text-muted);
  font-size: 12px;
  font-weight: 600;
}

.info-item span {
  color: var(--plaza-text);
  font-size: 14px;
  font-weight: 600;
  overflow-wrap: anywhere;
}

.edit-panel :deep(.el-form-item__label) {
  color: var(--plaza-text);
  font-weight: 700;
}

@media (max-width: 900px) {
  .profile-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 620px) {
  .profile-hero {
    align-items: flex-start;
    flex-direction: column;
  }

  .info-grid {
    grid-template-columns: 1fr;
  }
}
</style>
