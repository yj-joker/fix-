<script setup>
import { ref, onMounted, computed } from 'vue'
import { Search, Edit, Delete } from '@element-plus/icons-vue'
import { getUserList, updateUser, deleteUsers } from '@/api/user'
import { ElMessage, ElMessageBox } from 'element-plus'

const loading = ref(false)
const allUsers = ref([])
const searchQuery = ref('')

// 分页
const currentPage = ref(1)
const pageSize = ref(15)

const paginatedUsers = computed(() => {
  const filtered = filterUsers()
  const start = (currentPage.value - 1) * pageSize.value
  return filtered.slice(start, start + pageSize.value)
})

const totalCount = computed(() => filterUsers().length)

function filterUsers() {
  if (!searchQuery.value) return allUsers.value
  const q = searchQuery.value.toLowerCase()
  return allUsers.value.filter(u =>
    (u.name && u.name.toLowerCase().includes(q)) ||
    (u.number && u.number.toLowerCase().includes(q))
  )
}

async function loadUsers() {
  loading.value = true
  try {
    const all = []
    let page = 1
    const size = 1000
    while (true) {
      const res = await getUserList({ page, size })
      const records = res.data || []
      all.push(...records)
      if (records.length < size) break
      page++
    }
    allUsers.value = all
  } catch (e) {
    ElMessage.error('加载用户列表失败')
  } finally {
    loading.value = false
  }
}

function handleSearch() {
  currentPage.value = 1
}

function handlePageChange(page) {
  currentPage.value = page
}

const editDialogVisible = ref(false)
const editForm = ref({ id: null, name: '', number: '', phone: '' })
const editLoading = ref(false)

function openEdit(row) {
  editForm.value = { id: row.id, name: row.name, number: row.number, phone: row.phone }
  editDialogVisible.value = true
}

async function handleEdit() {
  editLoading.value = true
  try {
    await updateUser(editForm.value)
    ElMessage.success('修改成功')
    editDialogVisible.value = false
    loadUsers()
  } catch (e) {
    ElMessage.error('修改失败')
  } finally {
    editLoading.value = false
  }
}

async function handleDelete(row) {
  await ElMessageBox.confirm(`确定删除用户「${row.name}」吗？`, '提示', { type: 'warning' })
  await deleteUsers([row.id])
  ElMessage.success('删除成功')
  loadUsers()
}

function statusText(status) { return status === 1 ? '启用' : '禁用' }
function statusClass(status) { return status === 1 ? 'active' : 'inactive' }
function typeText(type) { return type === 1 ? '管理员' : '普通用户' }
function typeClass(type) { return type === 1 ? '管理员' : '普通用户' }
function genderText(gender) { return gender === 0 ? '男' : '女' }

onMounted(() => { loadUsers() })
</script>

<template>
  <div class="admin-users">
    <!-- Page Header -->
    <div class="page-header">
      <div class="page-title-area">
        <h2 class="page-title">用户管理</h2>
        <p class="page-desc">管理系统用户，查看用户列表与权限状态</p>
      </div>
    </div>

    <!-- Search Bar -->
    <div class="search-bar">
      <el-input
        v-model="searchQuery"
        placeholder="搜索姓名或工号..."
        class="search-input"
        clearable
        @clear="handleSearch"
        @keyup.enter="handleSearch"
      >
        <template #prefix>
          <el-icon><Search /></el-icon>
        </template>
      </el-input>
      <el-button type="primary" @click="handleSearch">搜索</el-button>
    </div>

    <!-- Users Table -->
    <div class="users-table">
      <el-table :data="paginatedUsers" v-loading="loading" style="width: 100%" :header-cell-style="{ background: 'var(--plaza-bg)', color: 'var(--plaza-text)' }">
        <el-table-column prop="username" label="用户名" width="150" />
        <el-table-column prop="name" label="姓名" width="120" />
        <el-table-column prop="number" label="工号" width="120" />
        <el-table-column prop="gender" label="性别" width="80">
          <template #default="{ row }">{{ genderText(row.gender) }}</template>
        </el-table-column>
        <el-table-column prop="phone" label="手机号" width="150" />
        <el-table-column prop="type" label="角色" width="100">
          <template #default="{ row }">
            <span class="role-tag" :class="typeClass(row.type)">{{ typeText(row.type) }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="100">
          <template #default="{ row }">
            <span class="status-tag" :class="statusClass(row.status)">{{ statusText(row.status) }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="hireDate" label="入职日期" width="120">
          <template #default="{ row }">{{ row.hireDate ? row.hireDate.split('T')[0] : '-' }}</template>
        </el-table-column>
        <el-table-column label="操作" width="120" fixed="right">
          <template #default="{ row }">
            <div class="action-btns">
              <el-button size="small" text type="primary" @click="openEdit(row)">
                <el-icon><Edit /></el-icon>
              </el-button>
              <el-button size="small" text type="danger" @click="handleDelete(row)">
                <el-icon><Delete /></el-icon>
              </el-button>
            </div>
          </template>
        </el-table-column>
      </el-table>
      <div class="pagination-wrap">
        <el-pagination
          background
          layout="prev, pager, next"
          :page-size="pageSize"
          :total="totalCount"
          :current-page="currentPage"
          @current-change="handlePageChange"
        />
      </div>
    </div>

    <!-- Edit Dialog -->
    <el-dialog v-model="editDialogVisible" title="编辑用户" width="400px">
      <el-form :model="editForm" label-width="80px">
        <el-form-item label="姓名">
          <el-input v-model="editForm.name" />
        </el-form-item>
        <el-form-item label="工号">
          <el-input v-model="editForm.number" />
        </el-form-item>
        <el-form-item label="手机号">
          <el-input v-model="editForm.phone" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="editDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="editLoading" @click="handleEdit">确定</el-button>
      </template>
    </el-dialog>
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
  display: flex;
  gap: 12px;
}
.search-input {
  max-width: 300px;
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

.pagination-wrap {
  display: flex;
  justify-content: flex-end;
  margin-top: 16px;
}
</style>
