<template>
  <div class="profile-page">
    <div class="page-header">
      <h2>个人信息</h2>
      <p class="subtitle">管理您的账户信息和设置</p>
    </div>

    <div class="profile-content" v-loading="loading">
      <!-- 用户信息卡片 -->
      <div class="profile-card">
        <div class="profile-header">
          <div class="avatar-wrapper">
            <div class="avatar">{{ userInfo.name ? userInfo.name[0] : 'U' }}</div>
            <div class="avatar-info">
              <h3>{{ userInfo.name || '未设置' }}</h3>
              <span class="user-type">{{ getTypeText(userInfo.type) }}</span>
            </div>
          </div>
        </div>

        <div class="profile-body">
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
              <span class="type-badge">{{ getTypeText(userInfo.type) }}</span>
            </div>
            <div class="info-item">
              <label>状态</label>
              <span class="status-badge" :class="getStatusClass(userInfo.status)">
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
              <span>{{ formatDate(userInfo.hireDate) }}</span>
            </div>
            <div class="info-item full-width">
              <label>最后登录</label>
              <span>{{ formatDate(userInfo.lastLoginTime) }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 编辑个人信息卡片 -->
      <div class="edit-card">
        <h4>编辑个人信息</h4>
        <el-form :model="form" :rules="rules" ref="formRef" label-width="80px">
          <el-form-item label="邮箱" prop="email">
            <el-input v-model="form.email" placeholder="请输入邮箱" />
          </el-form-item>
          <el-form-item>
            <el-button type="primary" @click="handleUpdate" :loading="submitting">
              保存修改
            </el-button>
          </el-form-item>
        </el-form>
      </div>

      <!-- 修改密码卡片 -->
      <div class="password-card">
        <h4>修改密码</h4>
        <el-form :model="passwordForm" :rules="passwordRules" ref="passwordFormRef" label-width="100px">
          <el-form-item label="当前密码" prop="oldPassword">
            <el-input v-model="passwordForm.oldPassword" type="password" placeholder="请输入当前密码" show-password />
          </el-form-item>
          <el-form-item label="新密码" prop="newPassword">
            <el-input v-model="passwordForm.newPassword" type="password" placeholder="请输入新密码" show-password />
          </el-form-item>
          <el-form-item label="确认密码" prop="confirmPassword">
            <el-input v-model="passwordForm.confirmPassword" type="password" placeholder="请再次输入新密码" show-password />
          </el-form-item>
          <el-form-item>
            <el-button type="primary" @click="handlePasswordChange" :loading="passwordSubmitting">
              修改密码
            </el-button>
          </el-form-item>
        </el-form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { getUserById, updateUser } from '@/api/user'

const loading = ref(false)
const submitting = ref(false)
const passwordSubmitting = ref(false)
const formRef = ref(null)
const passwordFormRef = ref(null)

const userInfo = ref({})

const form = reactive({
  email: ''
})

const passwordForm = reactive({
  oldPassword: '',
  newPassword: '',
  confirmPassword: ''
})

const validateConfirm = (rule, value, callback) => {
  if (value !== passwordForm.newPassword) {
    callback(new Error('两次输入的密码不一致'))
  } else {
    callback()
  }
}

const rules = {
  email: [
    { type: 'email', message: '请输入正确的邮箱格式', trigger: 'blur' }
  ]
}

const passwordRules = {
  oldPassword: [
    { required: true, message: '请输入当前密码', trigger: 'blur' }
  ],
  newPassword: [
    { required: true, message: '请输入新密码', trigger: 'blur' },
    { min: 6, message: '密码长度不能少于6位', trigger: 'blur' }
  ],
  confirmPassword: [
    { required: true, message: '请再次输入新密码', trigger: 'blur' },
    { validator: validateConfirm, trigger: 'blur' }
  ]
}

const getTypeText = (type) => {
  const typeMap = { 0: '员工', 1: '管理员' }
  return typeMap[type] ?? '未知'
}

const getGenderText = (gender) => {
  const map = { 0: '男', 1: '女' }
  return map[gender] ?? '-'
}

const getStatusText = (status) => {
  const code = Number(status)
  if (Number.isNaN(code)) return '-'
  return code === 1 ? '已激活' : '未激活'
}

const getStatusClass = (status) => {
  return Number(status) === 1 ? 'active' : 'inactive'
}
const formatDate = (date) => {
  if (!date) return '-'
  const d = new Date(date)
  if (isNaN(d.getTime())) return '-'
  return d.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const fetchUserInfo = async () => {
  loading.value = true
  try {
    const userData = JSON.parse(localStorage.getItem('userInfo') || '{}')
    if (userData.id) {
      const res = await getUserById(userData.id)
      if (res.code === '200' || res.code === 200) {
        userInfo.value = res.data || {}
        form.email = userInfo.value.email || ''
        localStorage.setItem('userInfo', JSON.stringify({
          ...userData,
          ...userInfo.value,
        }))
      }
    }
  } catch (error) {
    console.error('获取用户信息失败:', error)
  } finally {
    loading.value = false
  }
}

const handleUpdate = async () => {
  const valid = await formRef.value.validate().catch(() => false)
  if (!valid) return

  submitting.value = true
  try {
    const userData = JSON.parse(localStorage.getItem('userInfo') || '{}')
    const res = await updateUser({
      id: userData.id,
      name: userInfo.value.name,
      number: userInfo.value.number,
      phone: userInfo.value.phone,
      email: form.email?.trim() || null
    })
    if (res.code === '200' || res.code === 200) {
      ElMessage.success('修改成功')
      fetchUserInfo()
    } else {
      ElMessage.error(res.message || '修改失败')
    }
  } catch (error) {
    ElMessage.error('修改失败')
  } finally {
    submitting.value = false
  }
}

const handlePasswordChange = async () => {
  const valid = await passwordFormRef.value.validate().catch(() => false)
  if (!valid) return

  passwordSubmitting.value = true
  try {
    // TODO: 后端暂无修改密码接口，需要后端配合
    ElMessage.info('修改密码功能需要后端支持')
    passwordForm.oldPassword = ''
    passwordForm.newPassword = ''
    passwordForm.confirmPassword = ''
  } catch (error) {
    ElMessage.error('修改密码失败')
  } finally {
    passwordSubmitting.value = false
  }
}

onMounted(() => {
  fetchUserInfo()
})
</script>

<style scoped>
.profile-page {
  max-width: 800px;
  margin: 0 auto;
}

.page-header {
  margin-bottom: 32px;
}

.page-header h2 {
  font-size: 28px;
  font-weight: 600;
  color: var(--plaza-text);
  margin-bottom: 8px;
}

.subtitle {
  color: var(--plaza-text-muted);
  font-size: 14px;
}

.profile-content {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.profile-card,
.edit-card,
.password-card {
  background: var(--plaza-bg-card);
  border-radius: 12px;
  border: 1px solid var(--plaza-border);
  padding: 24px;
}

.profile-header {
  padding-bottom: 20px;
  border-bottom: 1px solid var(--plaza-border);
  margin-bottom: 20px;
}

.avatar-wrapper {
  display: flex;
  align-items: center;
  gap: 16px;
}

.avatar {
  width: 72px;
  height: 72px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--plaza-accent), var(--plaza-accent-soft));
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28px;
  font-weight: 600;
}

.avatar-info h3 {
  font-size: 22px;
  font-weight: 600;
  color: var(--plaza-text);
  margin-bottom: 6px;
}

.user-type {
  display: inline-block;
  padding: 4px 12px;
  background: var(--plaza-accent-soft);
  color: var(--plaza-accent);
  border-radius: 20px;
  font-size: 13px;
  font-weight: 500;
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 20px;
}

.info-item {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.info-item label {
  font-size: 13px;
  color: var(--plaza-text-muted);
  font-weight: 500;
}

.info-item span {
  font-size: 15px;
  color: var(--plaza-text);
}

.type-badge {
  display: inline-flex;
  align-items: center;
  padding: 4px 10px;
  background: var(--plaza-accent-soft);
  color: var(--plaza-accent);
  border-radius: 6px;
  font-size: 13px;
  width: fit-content;
}

.status-badge {
  display: inline-flex;
  align-items: center;
  padding: 4px 10px;
  border-radius: 6px;
  font-size: 13px;
  width: fit-content;
}

.status-badge.active {
  background: #f0fdf4;
  color: #52c41a;
}

.status-badge.inactive {
  background: #fff2f0;
  color: #ff4d4f;
}

.edit-card h4,
.password-card h4 {
  font-size: 16px;
  font-weight: 600;
  color: var(--plaza-text);
  margin-bottom: 20px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--plaza-border);
}

@media (max-width: 600px) {
  .info-grid {
    grid-template-columns: 1fr;
  }
}
</style>
