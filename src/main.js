import { createApp } from 'vue'
import './style.css'
import App from './App.vue'
// 导入ElementPlus及全部图标/组件
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import * as ElementPlusIconsVue from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { createPinia } from 'pinia'
import { useUserStore } from './stores/user'
import router from './router'

// 初始化应用
const app = createApp(App)
app.use(ElementPlus)
app.use(createPinia())
app.use(router)

// 全局注册ElementPlus图标
for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
  app.component(key, component)
}
// 全局挂载ElMessage（解决跨文件使用）
app.config.globalProperties.$message = ElMessage
app.config.globalProperties.$confirm = ElMessageBox.confirm

// 异步初始化用户（加错误处理）
async function initApp() {
  try {
    const userStore = useUserStore()
    userStore.initUser()
  } catch (error) {
    console.error('用户初始化失败:', error)
    ElMessage.error('初始化失败，请刷新重试')
  }
  app.mount('#app')
}

initApp()