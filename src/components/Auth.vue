<template>
    <div class="auth-container">
      <el-card class="auth-card">
        <h2>学生身份认证</h2>
        <el-form :model="authForm" :rules="authRules" ref="authFormRef" label-width="80px">
          <el-form-item label="所属高校" prop="university">
            <el-select v-model="authForm.university" placeholder="请选择你的学校">
              <el-option 
                v-for="uni in universities" 
                :key="uni.name" 
                :label="uni.name" 
                :value="uni.name"
              ></el-option>
            </el-select>
          </el-form-item>
          <el-form-item label="学号" prop="studentId">
            <el-input v-model="authForm.studentId" placeholder="请输入你的学号"></el-input>
          </el-form-item>
          <el-form-item label="姓名" prop="name">
            <el-input v-model="authForm.name" placeholder="请输入你的姓名"></el-input>
          </el-form-item>
          <el-form-item label="校园卡照片" prop="studentCard">
            <el-upload
              class="upload-demo"
              action="#"
              :auto-upload="false"
              :on-change="handleCardUpload"
              accept="image/*"
            >
              <el-button type="primary">点击上传</el-button>
            </el-upload>
          </el-form-item>
          <el-form-item>
            <el-button type="primary" @click="submitAuth">提交认证</el-button>
            <el-button @click="cancel">取消</el-button>
          </el-form-item>
        </el-form>
      </el-card>
    </div>
  </template>
  
  <script setup>
  import { ref } from 'vue'
  import { useUserStore } from '../stores/user'
  import { useRouter } from 'vue-router'
  
  // 初始化变量
  const authFormRef = ref(null)
  const router = useRouter()
  const userStore = useUserStore()
  
  // 认证表单
  const authForm = ref({
    university: '',
    studentId: '',
    name: '',
    studentCard: ''
  })
  
  // 高校列表
  const universities = ref(JSON.parse(import.meta.env.VITE_UNIVERSITIES))
  
  // 表单校验规则
  const authRules = ref({
    university: [{ required: true, message: '请选择所属高校', trigger: 'change' }],
    studentId: [{ required: true, message: '请输入学号', trigger: 'blur' }],
    name: [{ required: true, message: '请输入姓名', trigger: 'blur' }]
  })
  
  // 上传校园卡
  const handleCardUpload = (file) => {
    authForm.value.studentCard = file.raw
  }
  
  // 提交认证
  const submitAuth = () => {
    authFormRef.value.validate((valid) => {
      if (valid) {
        // 实际项目需对接学校认证接口
        userStore.authenticate(authForm.value.university, authForm.value.studentId)
        ElMessage.success('认证成功！')
        router.push('/')
      } else {
        ElMessage.error('请完善认证信息')
      }
    })
  }
  
  // 取消
  const cancel = () => {
    router.go(-1)
  }
  </script>
  
  <style scoped>
  .auth-container {
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: 100vh;
    background: #f5f5f5;
  }
  
  .auth-card {
    width: 500px;
    padding: 20px;
  }
  </style>