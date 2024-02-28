import { createRouter, createWebHistory, RouteRecordRaw } from 'vue-router'
import { useIcpClientStore } from '@/store/IcpClient'
import MainLayout from '@/layouts/MainLayout.vue'
import AdminLockerLayout from '@/layouts/lockers/AdminLayout.vue'
import UserLockerLayout from '@/layouts/lockers/UserLayout.vue'
import LoginView from '@/views/LoginView.vue'
import NotFoundView from '@/views/NotFoundView.vue'

// NOTE: Avoid using dynamic imports (e.g., `component: async () => await import('@/views/Example.vue')`) in this application.
// The local development setup with the Internet Computer canister expects either a `canisterId` parameter in request URLs
// or a "Referer: http://127.0.0.1:4943/?canisterId=<VITE_APP_LOCKERS_FRONTEND_CANISTER_ID>" header for asset requests.
const routes: RouteRecordRaw[] = [
  {
    path: '/',
    component: MainLayout,
    redirect: () => {
      const icpClient = useIcpClientStore()
      if (icpClient.userRole === 'admin') {
        return 'admin'
      }
      if (icpClient.userRole === 'user') {
        return 'user'
      }
      return 'login'
    },
    children: [
      { path: 'admin', component: AdminLockerLayout },
      { path: 'user', component: UserLockerLayout }
    ],
    beforeEnter: (to) => {
      const icpClient = useIcpClientStore()
      if (!icpClient.isAuthenticated) {
        return 'login'
      }
      if (
        (to.path.includes('user') && icpClient.userRole === 'admin') ||
        (to.path.includes('admin') && icpClient.userRole === 'user')
      ) {
        return 'not-found'
      }
    }
  },
  {
    path: '/login',
    component: LoginView
  },
  {
    path: '/:catchAll(.*)*',
    // redirect: '/', // TODO: maybe permanently redirect to index?
    component: NotFoundView
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router
