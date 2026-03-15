<template>
  <!-- 顶部导航栏：左上角 logo，右侧学生会员 -->
  <el-header class="app-header">
    <div class="header-left">
      <img :src="iconPng" alt="blueberry" class="app-header-logo" />
    </div>
    <div class="header-right">
      <el-button type="primary" @click="memberDialogVisible = true">学生会员</el-button>
    </div>
  </el-header>

  <!-- 学生会员弹窗：免费 / 连续包月 / 月度会员 -->
  <el-dialog
    v-model="memberDialogVisible"
    title="学生会员"
    width="380px"
    align-center
    :show-close="true"
    class="member-dialog"
    @close="selectedMemberPlan = 'free'"
  >
    <div class="member-cards">
      <div
        class="member-card member-card--free"
        :class="{ active: selectedMemberPlan === 'free' }"
        @click="selectedMemberPlan = 'free'"
      >
        <div class="member-card-title">免费</div>
        <div class="member-card-desc">基础推荐与地图能力</div>
        <div class="member-card-footer">
          <span class="member-card-price">¥0</span>
          <span class="member-card-radio"><span v-if="selectedMemberPlan === 'free'" class="member-card-radio-dot"></span></span>
        </div>
      </div>
      <div
        class="member-card member-card--paid"
        :class="{ active: selectedMemberPlan === 'monthly' }"
        @click="selectedMemberPlan = 'monthly'"
      >
        <div class="member-card-title">连续包月</div>
        <div class="member-card-desc">每周专属优惠券 · 列表去广告 · 优先客服</div>
        <div class="member-card-footer">
          <span class="member-card-price">¥8.8/月</span>
          <span class="member-card-radio"><span v-if="selectedMemberPlan === 'monthly'" class="member-card-radio-dot"></span></span>
        </div>
      </div>
      <div
        class="member-card member-card--paid"
        :class="{ active: selectedMemberPlan === 'single' }"
        @click="selectedMemberPlan = 'single'"
      >
        <div class="member-card-title">月度会员</div>
        <div class="member-card-desc">每周优惠券 · 去广告 · 月度专属活动</div>
        <div class="member-card-footer">
          <span class="member-card-price">¥9.9/月</span>
          <span class="member-card-radio"><span v-if="selectedMemberPlan === 'single'" class="member-card-radio-dot"></span></span>
        </div>
      </div>
    </div>
    <template #footer>
      <el-button @click="memberDialogVisible = false">取消</el-button>
      <el-button type="primary" @click="onMemberConfirm">确认</el-button>
    </template>
  </el-dialog>

  <!-- 主内容区：顶 bar 下方全高，随浏览器自适应 -->
  <main class="app-main">
    <div class="app-main-inner">
      <router-view />
    </div>
  </main>

  <!-- 偏好设置弹窗 -->
  <el-dialog v-model="preferenceDialog" title="口味偏好设置" width="400px">
    <el-form :model="preferenceForm" label-width="80px">
      <el-form-item label="预算区间">
        <el-slider
          v-model="preferenceForm.budget"
          range
          :min="0"
          :max="100"
          :marks="{ 0: '0', 20: '20', 50: '50', 100: '100+' }"
        ></el-slider>
      </el-form-item>
      <el-form-item label="口味偏好">
        <el-select v-model="preferenceForm.taste" multiple placeholder="请选择">
          <el-option label="辣" value="spicy"></el-option>
          <el-option label="甜" value="sweet"></el-option>
          <el-option label="咸" value="salty"></el-option>
          <el-option label="清淡" value="light"></el-option>
          <el-option label="酸" value="sour"></el-option>
        </el-select>
      </el-form-item>
      <el-form-item label="饮食忌口">
        <el-select v-model="preferenceForm.taboos" multiple placeholder="请选择">
          <el-option label="香菜" value="coriander"></el-option>
          <el-option label="葱蒜" value="onion"></el-option>
          <el-option label="海鲜" value="seafood"></el-option>
          <el-option label="油炸" value="fried"></el-option>
          <el-option label="猪肉" value="pork"></el-option>
        </el-select>
      </el-form-item>
    </el-form>
    <template #footer>
      <div class="dialog-footer">
        <el-button @click="preferenceDialog = false">取消</el-button>
        <el-button type="primary" @click="savePreferences">保存</el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, onMounted, provide } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { ArrowDown } from '@element-plus/icons-vue'
import { useUserStore } from './stores/user'
import iconPng from './icon.png'

const router = useRouter()
const userStore = useUserStore()
const universities = ref(JSON.parse(import.meta.env.VITE_UNIVERSITIES || '[]'))
const currentUniversity = ref('')
provide('currentUniversity', currentUniversity)
provide('openMemberDialog', () => { memberDialogVisible.value = true })
provide('openPreferences', () => { preferenceDialog.value = true })
const preferenceDialog = ref(false)
const memberDialogVisible = ref(false)
const selectedMemberPlan = ref('free') // 'free' | 'monthly' | 'single'

// 偏好设置表单
const preferenceForm = ref({
  budget: [0, 100],
  taste: [],
  taboos: []
})

// 页面加载时初始化
onMounted(() => {
  // 校区：已登录用用户学校，否则用第一个
  currentUniversity.value = userStore.userInfo?.university || (universities.value.length ? universities.value[0].name : '')
  if (userStore.userInfo.preferences) {
    preferenceForm.value = { ...userStore.userInfo.preferences }
  }
})

// 打开偏好设置
const updatePreferences = () => {
  preferenceDialog.value = true
}

// 保存偏好设置
const savePreferences = () => {
  userStore.updatePreferences(preferenceForm.value)
  preferenceDialog.value = false
  ElMessage.success('偏好设置保存成功！AI推荐会更精准哦～')
}

// 学生会员确认：免费仅关闭；付费需先登录再跳转支付宝
const onMemberConfirm = () => {
  if (selectedMemberPlan.value === 'free') {
    memberDialogVisible.value = false
    return
  }
  if (!userStore.userInfo?.id) {
    memberDialogVisible.value = false
    router.push('/login')
    return
  }
  memberDialogVisible.value = false
  window.open('https://www.alipay.com/', '_blank')
}
</script>

<style scoped>
.app-header {
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  background-color: #fff;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
  z-index: 999;
  padding: 0 15px;
}

.header-left {
  display: flex;
  align-items: center;
}
.app-header-logo {
  height: 48px;
  width: auto;
  object-fit: contain;
  display: block;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 15px;
}

.el-dropdown-link {
  display: inline-flex;
  align-items: center;
  cursor: pointer;
}

.app-main {
  flex: 1;
  min-height: 0;
  padding: 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.app-main-inner {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* 学生会员弹窗 */
.member-dialog .el-dialog__body {
  padding: 12px 20px;
}
.member-cards {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.member-card {
  border-radius: 12px;
  padding: 14px 16px;
  cursor: pointer;
  border: 2px solid transparent;
  transition: border-color 0.2s, box-shadow 0.2s;
}
.member-card.active {
  border-color: #409eff;
  box-shadow: 0 0 0 1px #409eff;
}
.member-card--free {
  background: #f5f5f5;
  color: #606266;
}
.member-card--paid {
  background: #ecf5ff;
  color: #303133;
}
.member-card-title {
  font-weight: 600;
  font-size: 15px;
  margin-bottom: 6px;
}
.member-card-desc {
  font-size: 12px;
  color: #909399;
  margin-bottom: 10px;
  line-height: 1.4;
}
.member-card--paid .member-card-desc {
  color: #606266;
}
.member-card-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.member-card-price {
  font-size: 16px;
  font-weight: 600;
  color: #409eff;
}
.member-card--free .member-card-price {
  color: #606266;
}
.member-card-radio {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  border: 2px solid #dcdfe6;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
.member-card.active .member-card-radio {
  border-color: #409eff;
}
.member-card-radio-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #409eff;
}
</style>