<template>
  <div class="login-page">
    <div class="login-card">
      <div class="login-tabs">
        <button
          type="button"
          class="login-tab"
          :class="{ active: mode === 'login' }"
          @click="mode = 'login'"
        >
          登录
        </button>
        <button
          type="button"
          class="login-tab"
          :class="{ active: mode === 'register' }"
          @click="mode = 'register'"
        >
          注册
        </button>
      </div>
      <form v-if="mode === 'login'" class="login-form" @submit.prevent="handleLogin">
        <div class="login-field">
          <label>账号</label>
          <input v-model="form.account" type="text" placeholder="手机号或邮箱" required />
        </div>
        <div class="login-field">
          <label>密码</label>
          <input v-model="form.password" type="password" placeholder="请输入密码" required />
        </div>
        <button type="submit" class="login-submit">登录</button>
      </form>
      <form v-else class="login-form" @submit.prevent="handleRegister">
        <div class="login-field">
          <label>账号</label>
          <input v-model="form.account" type="text" placeholder="手机号或邮箱" required />
        </div>
        <div class="login-field">
          <label>密码</label>
          <input v-model="form.password" type="password" placeholder="请设置密码" required />
        </div>
        <div class="login-field">
          <label>确认密码</label>
          <input v-model="form.confirmPassword" type="password" placeholder="请再次输入密码" required />
        </div>
        <p v-if="form.password && form.confirmPassword && form.password !== form.confirmPassword" class="login-error">两次密码不一致</p>
        <button type="submit" class="login-submit" :disabled="form.password !== form.confirmPassword">注册</button>
      </form>
      <p class="login-footer">
        <router-link to="/">返回首页</router-link>
      </p>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { useUserStore } from '../stores/user'

const router = useRouter()
const userStore = useUserStore()
const mode = ref('login')
const form = reactive({
  account: '',
  password: '',
  confirmPassword: ''
})

function handleLogin() {
  userStore.login(form.account.trim() || 'user_' + Date.now())
  ElMessage.success('登录成功')
  router.replace('/')
}

function handleRegister() {
  if (form.password !== form.confirmPassword) return
  userStore.login(form.account.trim() || 'user_' + Date.now())
  ElMessage.success('注册成功，已自动登录')
  router.replace('/')
}
</script>

<style scoped>
.login-page {
  width: 100%;
  min-height: 100vh;
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #ecf5ff 0%, #f0f9ff 100%);
  padding: 20px;
  box-sizing: border-box;
}
.login-card {
  width: 100%;
  max-width: 400px;
  background: #fff;
  border-radius: 16px;
  box-shadow: 0 8px 32px rgba(64, 158, 255, 0.15);
  padding: 32px;
  flex-shrink: 0;
}
.login-tabs {
  display: flex;
  gap: 0;
  margin-bottom: 24px;
  border-bottom: 1px solid #ebeef5;
}
.login-tab {
  flex: 1;
  padding: 10px 16px;
  border: none;
  background: none;
  font-size: 15px;
  color: #909399;
  cursor: pointer;
  border-bottom: 2px solid transparent;
  margin-bottom: -1px;
  transition: color 0.2s, border-color 0.2s;
}
.login-tab.active {
  color: #409eff;
  border-bottom-color: #409eff;
  font-weight: 500;
}
.login-form {
  display: flex;
  flex-direction: column;
  gap: 18px;
}
.login-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.login-field label {
  font-size: 13px;
  color: #606266;
}
.login-field input {
  padding: 12px 14px;
  border: 1px solid #dcdfe6;
  border-radius: 8px;
  font-size: 14px;
  transition: border-color 0.2s;
}
.login-field input:focus {
  outline: none;
  border-color: #409eff;
}
.login-error {
  margin: -8px 0 0;
  font-size: 12px;
  color: #f56c6c;
}
.login-submit {
  margin-top: 8px;
  padding: 12px;
  border: none;
  border-radius: 10px;
  background: #409eff;
  color: #fff;
  font-size: 15px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s;
}
.login-submit:hover:not(:disabled) {
  background: #66b1ff;
}
.login-submit:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
.login-footer {
  margin: 24px 0 0;
  text-align: center;
  font-size: 14px;
}
.login-footer a {
  color: #409eff;
  text-decoration: none;
}
.login-footer a:hover {
  text-decoration: underline;
}
</style>
