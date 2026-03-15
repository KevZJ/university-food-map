import { createRouter, createWebHistory } from 'vue-router'
import MapView from '../components/SimpleMapView.vue'
import Auth from '../components/Auth.vue'
import Login from '../components/Login.vue'
import ShopDetail from '../components/ShopDetail.vue'

// 路由规则
const routes = [
  {
    path: '/',
    name: 'Map',
    component: MapView,
    meta: { title: '大学城美食地图 - 首页' }
  },
  {
    path: '/login',
    name: 'Login',
    component: Login,
    meta: { title: '登录 / 注册' }
  },
  {
    path: '/auth',
    name: 'Auth',
    component: Auth,
    meta: { title: '学生身份认证' }
  },
  {
    path: '/shop/:id',
    name: 'ShopDetail',
    component: ShopDetail,
    meta: { title: '商家详情' }
  },
  // 404页面
  {
    path: '/:pathMatch(.*)*',
    redirect: '/'
  }
]

// 创建路由实例
const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes
})

// 路由守卫：修改页面标题
router.beforeEach((to, from, next) => {
  if (to.meta.title) {
    document.title = to.meta.title
  }
  next()
})

export default router