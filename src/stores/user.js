// stores/user.js
import { defineStore } from 'pinia'
import { ref } from 'vue'
import Cookies from 'js-cookie'

export const useUserStore = defineStore('user', () => {
  // 用户基础信息
  const userInfo = ref({
    id: '',
    university: '', // 所属高校
    isAuthenticated: false, // 是否完成学生认证
    preferences: { // 用户偏好设置
      budget: [10, 50], // 预算区间
      taste: [], // 口味偏好
      taboos: [] // 饮食忌口
    }
  })

  const STORAGE_KEY = 'userInfo'

  // 每次刷新页面都视为新会话：默认未登录，不恢复 Cookie/localStorage
  const initUser = () => {
    userInfo.value = {
      id: '',
      university: '',
      isAuthenticated: false,
      preferences: { budget: [10, 50], taste: [], taboos: [] }
    }
    Cookies.remove(STORAGE_KEY)
    if (typeof localStorage !== 'undefined') localStorage.removeItem(STORAGE_KEY)
  }

  const persistUser = () => {
    const raw = JSON.stringify(userInfo.value)
    Cookies.set(STORAGE_KEY, raw, { expires: 30 })
    if (typeof localStorage !== 'undefined') localStorage.setItem(STORAGE_KEY, raw)
  }

  const clearUserStorage = () => {
    Cookies.remove(STORAGE_KEY)
    if (typeof localStorage !== 'undefined') localStorage.removeItem(STORAGE_KEY)
  }

  // 登录（账号密码或手机号，登录后为普通会员）
  const login = (identifier) => {
    userInfo.value = {
      ...userInfo.value,
      id: identifier || 'user_' + Date.now(),
      university: userInfo.value.university || '',
      isAuthenticated: userInfo.value.isAuthenticated || false
    }
    persistUser()
  }

  // 学生认证（认证后为已认证状态）
  const authenticate = (university, studentId) => {
    // 实际项目需对接学校认证接口
    userInfo.value = {
      ...userInfo.value,
      id: studentId || userInfo.value.id,
      university,
      isAuthenticated: true
    }
    persistUser()
  }

  // 更新用户偏好
  const updatePreferences = (preferences) => {
    userInfo.value.preferences = {
      ...userInfo.value.preferences,
      ...preferences
    }
    persistUser()
  }

  // 退出登录
  const logout = () => {
    userInfo.value = {
      id: '',
      university: '',
      isAuthenticated: false,
      preferences: { budget: [10, 50], taste: [], taboos: [] }
    }
    clearUserStorage()
  }

  return { userInfo, initUser, login, authenticate, updatePreferences, logout }
})