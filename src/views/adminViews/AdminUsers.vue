<script setup>
import { ref } from 'vue'
import { Search, Plus, Edit, Delete, Check, Close } from '@element-plus/icons-vue'

const searchQuery = ref('')

const users = ref([
  { id: 1, username: 'admin', name: '管理员', email: 'admin@example.com', role: '管理员', status: 'active', createTime: '2024-01-01' },
  { id: 2, username: 'zhangsan', name: '张工程师', email: 'zhangsan@example.com', role: '普通用户', status: 'active', createTime: '2024-01-05' },
  { id: 3, username: 'lisi', name: '李技术员', email: 'lisi@example.com', role: '普通用户', status: 'active', createTime: '2024-01-08' },
  { id: 4, username: 'wangwu', name: '王管理员', email: 'wangwu@example.com', role: '管理员', status: 'inactive', createTime: '2024-01-10' },
  { id: 5, username: 'zhaoliu', name: '赵工程师', email: 'zhaoliu@example.com', role: '普通用户', status: 'active', createTime: '2024-01-12' },
])

const filteredUsers = () => {
  if (!searchQuery.value) return users.value
  return users.value.filter(u =>
    u.username.includes(searchQuery.value) ||
    u.name.includes(searchQuery.value) ||
    u.email.includes(searchQuery.value)
  )
}

function toggleStatus(user) {
  user.status = user.status === 'active' ? 'inactive' : 'active'
}

function deleteUser(user) {
  const index = users.value.indexOf(user)
  if (index > -1) {
    users.value.splice(index, 1)
  }
}
</script>

<template>
  <div class="admin-users">
    <!-- Page Header -->
    <div class="page-header">
      <div class="page-title-area">
        <h2 class="page-title">用户管理</h2>
        <p class="page-desc">管理系统用户，查看用户列表与权限状态</p>
      </div>
      <el-button type="primary">
        <el-icon><Plus /></el-icon>
        添加用户
      </el-button>
    </div>

    <!-- Search Bar -->
    <div class="search-bar">
      <el-input
        v-model="searchQuery"
        placeholder="搜索用户名、姓名或邮箱..."
        class="search-input"
        clearable
      >
        <template #prefix>
          <el-icon><Search /></el-icon>
        </template>
      </el-input>
    </div>

    <!-- Users Table -->
    <div class="users-table">
      <el-table :data="filteredUsers()" style="width: 100%" :header-cell-style="{ background: 'var(--plaza-bg)', color: 'var(--plaza-text)' }">
        <el-table-column prop="username" label="用户名" width="150" />
        <el-table-column prop="name" label="姓名" width="150" />
        <el-table-column prop="email" label="邮箱" min-width="200" />
        <el-table-column prop="role" label="角色" width="120">
          <template #default="{ row }">
            <span class="role-tag" :class="row.role">{{ row.role }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="100">
          <template #default="{ row }">
            <span class="status-tag" :class="row.status">
              {{ row.status === 'active' ? '启用' : '禁用' }}
            </span>
          </template>
        </el-table-column>
        <el-table-column prop="createTime" label="创建时间" width="120" />
        <el-table-column label="操作" width="160" fixed="right">
          <template #default="{ row }">
            <div class="action-btns">
              <el-button size="small" text type="primary">
                <el-icon><Edit /></el-icon>
              </el-button>
              <el-button size="small" text type="danger" @click="deleteUser(row)">
                <el-icon><Delete /></el-icon>
              </el-button>
              <el-button size="small" text @click="toggleStatus(row)">
                <el-icon v-if="row.status === 'active'"><Close /></el-icon>
                <el-icon v-else><Check /></el-icon>
              </el-button>
            </div>
          </template>
        </el-table-column>
      </el-table>
    </div>
  </div>
</template>

<style scoped>
.admin-users {
  max-width: 1200px;
  margin: 0 auto;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
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

.search-bar {
  margin-bottom: 20px;
}
.search-input {
  max-width: 400px;
}

.users-table {
  background: var(--plaza-bg-card);
  border: 1px solid var(--plaza-border);
  border-radius: 14px;
  padding: 20px;
}

.role-tag {
  display: inline-block;
  padding: 4px 10px;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 500;
}
.role-tag.管理员 {
  background: var(--plaza-accent-soft);
  color: var(--plaza-accent);
}
.role-tag.普通用户 {
  background: rgba(34, 197, 94, 0.1);
  color: var(--app-success);
}

.status-tag {
  display: inline-block;
  padding: 4px 10px;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 500;
}
.status-tag.active {
  background: rgba(34, 197, 94, 0.1);
  color: var(--app-success);
}
.status-tag.inactive {
  background: rgba(239, 68, 68, 0.1);
  color: var(--el-color-danger);
}

.action-btns {
  display: flex;
  gap: 4px;
}
</style>