import { createRouter, createWebHistory } from 'vue-router'

const routes = [
  {
    path: '/',
    name: 'Home',
    component: () => import('../views/homeviews/Home.vue')
  },
  {
    path: '/login',
    name: 'Login',
    component: () => import('../views/homeviews/Login.vue')
  },
  {
    path: '/knowledge',
    name: 'Knowledge',
    component: () => import('../views/Knowledge.vue')
  },
  {
    path: '/operation',
    name: 'Operation',
    component: () => import('../views/Operation.vue')
  },
  {
    path: '/cases',
    name: 'Cases',
    component: () => import('../views/Cases.vue')
  },
  {
    path: '/profile',
    name: 'Profile',
    component: () => import('../views/Profile.vue')
  },
  {
    path: '/forgot-password',
    name: 'ForgotPassword',
    component: () => import('../views/homeviews/ForgotPassword.vue')
  },
  {
    path: '/admin',
    name: 'Admin',
    component: () => import('../views/adminViews/AdminLayout.vue'),
    redirect: '/admin/dashboard',
    children: [
      {
        path: 'dashboard',
        name: 'AdminDashboard',
        component: () => import('../views/adminViews/AdminDashboard.vue')
      },
      {
        path: 'users',
        name: 'AdminUsers',
        component: () => import('../views/adminViews/AdminUsers.vue')
      },
      {
        path: 'knowledge',
        name: 'AdminKnowledge',
        component: () => import('../views/adminViews/AdminKnowledge.vue')
      },
      {
        path: 'graph',
        name: 'AdminKnowledgeGraph',
        component: () => import('../views/adminViews/AdminKnowledgeGraph.vue')
      },
      {
        path: 'ai-chat',
        name: 'AdminAIChat',
        component: () => import('../views/adminViews/AdminAIChat.vue')
      },
      {
        path: 'business',
        name: 'AdminBusiness',
        component: () => import('../views/adminViews/BusinessManage.vue')
      },
      {
        path: 'settings',
        name: 'AdminSettings',
        component: () => import('../views/adminViews/AdminSettings.vue')
      },
      {
        path: 'profile',
        name: 'AdminProfile',
        component: () => import('../views/adminViews/AdminProfile.vue')
      },
      {
        path: 'notify',
        name: 'AdminNotify',
        component: () => import('../views/adminViews/AdminNotify.vue')
      }
    ]
  },
  {
    path: '/user',
    name: 'User',
    component: () => import('../views/userViews/UserLayout.vue'),
    redirect: '/user/dashboard',
    children: [
      {
        path: 'dashboard',
        name: 'UserDashboard',
        component: () => import('../views/userViews/UserDashboard.vue')
      },
      {
        path: 'search',
        name: 'UserSearch',
        component: () => import('../views/userViews/UserSearch.vue')
      },
      {
        path: 'guide',
        name: 'UserGuide',
        component: () => import('../views/userViews/UserGuide.vue')
      },
      {
        path: 'graph',
        name: 'UserKnowledgeGraph',
        component: () => import('../views/userViews/UserKnowledgeGraph.vue')
      },
      {
        path: 'ai-chat',
        name: 'UserAIChat',
        component: () => import('../views/userViews/UserAIChat.vue')
      },
      {
        path: 'search-result',
        name: 'UserSearchResult',
        component: () => import('../views/userViews/UserSearchResult.vue')
      },
      {
        path: 'tasks',
        name: 'UserTasks',
        component: () => import('../views/userViews/UserTasks.vue')
      },
      {
        path: 'tasks/:id',
        name: 'UserTaskDetail',
        component: () => import('../views/userViews/UserTaskDetail.vue')
      }
    ]
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

// 全局登录守卫：/admin 与 /user 下的页面需登录，未登录直接跳登录页，
// 从根上避免「未登录就挂载布局 → 触发 WebSocket 握手鉴权失败」。
router.beforeEach((to, from, next) => {
  const isAuthed = !!localStorage.getItem('userInfo')
  const needsAuth = to.path.startsWith('/admin') || to.path.startsWith('/user')
  if (needsAuth && !isAuthed) {
    next({ path: '/login', query: { redirect: to.fullPath } })
  } else {
    next()
  }
})

export default router