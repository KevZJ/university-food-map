<template>
    <div class="shop-detail">
      <el-page-header @back="goBack" content="商家详情"></el-page-header>
      
      <el-row :gutter="20">
        <!-- 左侧商家信息 -->
        <el-col :span="16">
          <el-card>
            <div class="shop-basic">
              <h2>{{ shopInfo.name }}</h2>
              <el-rate v-model="shopInfo.score" disabled></el-rate>
              <p>人均：¥{{ shopInfo.price }}</p>
              <p>地址：{{ shopInfo.address }}</p>
              <p>营业时间：{{ shopInfo.businessHours }}</p>
              <p>
                <el-tag v-if="shopInfo.hasDiscount" type="success">学生优惠</el-tag>
                <el-tag v-if="shopInfo.speed === 'fast'" type="primary">出餐快</el-tag>
                <el-tag v-if="shopInfo.isPopular" type="warning">人气高</el-tag>
              </p>
            </div>
            
            <!-- AI生成的优缺点 -->
            <div class="shop-ai-analysis">
              <h3>AI口碑分析</h3>
              <el-row :gutter="10">
                <el-col :span="12">
                  <div class="pros">
                    <h4>优点</h4>
                    <p>{{ shopInfo.aiAnalysis.pros }}</p>
                  </div>
                </el-col>
                <el-col :span="12">
                  <div class="cons">
                    <h4>缺点</h4>
                    <p>{{ shopInfo.aiAnalysis.cons }}</p>
                  </div>
                </el-col>
              </el-row>
            </div>
            
            <!-- 菜品列表 -->
            <div class="shop-menu">
              <h3>菜品推荐</h3>
              <el-table :data="shopInfo.menu" border>
                <el-table-column prop="name" label="菜品名称"></el-table-column>
                <el-table-column prop="price" label="价格"></el-table-column>
                <el-table-column prop="score" label="评分">
                  <template #default="scope">
                    <el-rate v-model="scope.row.score" disabled size="small"></el-rate>
                  </template>
                </el-table-column>
                <el-table-column prop="recommendReason" label="推荐理由"></el-table-column>
              </el-table>
            </div>
            
            <!-- AI点菜助手 -->
            <div class="ai-order-assistant">
              <el-button type="primary" @click="openAIOrderAssistant">AI点菜助手</el-button>
              
              <el-dialog v-model="orderDialogVisible" title="AI点菜助手" width="60%">
                <el-form :model="orderForm" label-width="80px">
                  <el-form-item label="就餐人数">
                    <el-input-number v-model="orderForm.people" :min="1" :max="10"></el-input-number>
                  </el-form-item>
                  <el-form-item label="人均预算">
                    <el-input-number v-model="orderForm.budget" :min="10" :max="100"></el-input-number>
                  </el-form-item>
                  <el-form-item label="口味偏好">
                    <el-select v-model="orderForm.taste" multiple placeholder="请选择">
                      <el-option label="辣" value="spicy"></el-option>
                      <el-option label="甜" value="sweet"></el-option>
                      <el-option label="咸" value="salty"></el-option>
                      <el-option label="清淡" value="light"></el-option>
                    </el-select>
                  </el-form-item>
                  <el-form-item label="饮食忌口">
                    <el-input v-model="orderForm.taboos" placeholder="如：不吃香菜、不吃海鲜"></el-input>
                  </el-form-item>
                </el-form>
                
                <el-button type="primary" @click="generateOrderRecommend">生成推荐</el-button>
                
                <div v-if="orderRecommend" class="order-recommend">
                  <h4>AI推荐菜品组合</h4>
                  <p>{{ orderRecommend }}</p>
                </div>
              </el-dialog>
            </div>
          </el-card>
          
          <!-- 学生评价 -->
          <el-card style="margin-top: 20px;">
            <h3>学生评价</h3>
            <el-tabs v-model="activeTab">
              <el-tab-pane label="全部" name="all"></el-tab-pane>
              <el-tab-pane label="好评" name="good"></el-tab-pane>
              <el-tab-pane label="差评" name="bad"></el-tab-pane>
              <el-tab-pane label="带图" name="image"></el-tab-pane>
            </el-tabs>
            
            <div class="comments-list">
              <el-card v-for="comment in shopInfo.comments" :key="comment.id" style="margin-top: 10px;">
                <div class="comment-header">
                  <span>{{ comment.userName }}</span>
                  <span>{{ comment.university }}</span>
                  <el-rate v-model="comment.score" disabled size="small"></el-rate>
                </div>
                <div class="comment-content">{{ comment.content }}</div>
                <div v-if="comment.images" class="comment-images">
                  <img v-for="img in comment.images" :key="img" :src="img" alt="评价图片">
                </div>
              </el-card>
            </div>
          </el-card>
        </el-col>
        
        <!-- 右侧操作区 -->
        <el-col :span="8">
          <el-card>
            <div class="shop-actions">
              <el-button type="primary" icon="el-icon-location" @click="navigateToShop">导航到店</el-button>
              <el-button icon="el-icon-star-off" @click="collectShop">{{ isCollected ? '取消收藏' : '收藏' }}</el-button>
              <el-button icon="el-icon-share" @click="shareShop">分享</el-button>
              <el-button icon="el-icon-chat-dot-round" @click="writeComment">写评价</el-button>
              
              <div class="shop-qrcode">
                <p>扫码查看优惠</p>
                <img src="https://placehold.co/150x150" alt="优惠二维码">
              </div>
              
              <!-- 学生专属优惠 -->
              <div class="shop-discounts">
                <h3>学生专属优惠</h3>
                <el-list>
                  <el-list-item v-for="discount in shopInfo.discounts" :key="discount.id">
                    <div class="discount-item">
                      <h4>{{ discount.title }}</h4>
                      <p>{{ discount.desc }}</p>
                      <p>有效期：{{ discount.validTime }}</p>
                      <el-button type="text" @click="getDiscount(discount.id)">领取</el-button>
                    </div>
                  </el-list-item>
                </el-list>
              </div>
            </div>
          </el-card>
        </el-col>
      </el-row>
    </div>
  </template>
  
  <script setup>
  import { ref, onMounted } from 'vue'
  import { useRoute, useRouter } from 'vue-router'
  import axios from 'axios'
  import { useUserStore } from '../stores/user'
  
  // 初始化变量
  const route = useRoute()
  const router = useRouter()
  const userStore = useUserStore()
  const shopId = route.params.id
  
  // 商家信息
  const shopInfo = ref({})
  
  // AI点菜助手
  const orderDialogVisible = ref(false)
  const orderForm = ref({
    people: 1,
    budget: 20,
    taste: [],
    taboos: ''
  })
  const orderRecommend = ref('')
  
  // 评价相关
  const activeTab = ref('all')
  const isCollected = ref(false)
  
  // 页面加载
  onMounted(async () => {
    try {
      // 实际项目替换为真实接口
      const res = await axios.get(`${import.meta.env.VITE_BASE_API}/shops/${shopId}`)
      shopInfo.value = res.data
    } catch (e) {
      console.error('加载商家详情失败:', e)
      // 模拟数据
      shopInfo.value = {
        id: shopId,
        name: 'XX食堂一楼快餐',
        score: 4.8,
        price: 15,
        address: 'XX大学西门内100米',
        businessHours: '06:30-22:00',
        hasDiscount: true,
        speed: 'fast',
        isPopular: true,
        aiAnalysis: {
          pros: '出餐快（平均5分钟）、性价比高、学生8折优惠、分量足、卫生条件好',
          cons: '高峰期座位紧张、菜品种类较少、无包间'
        },
        menu: [
          { name: '麻辣香锅', price: 18, score: 4.9, recommendReason: '销量第一，学生好评率95%' },
          { name: '番茄炒蛋盖饭', price: 12, score: 4.7, recommendReason: '清淡可口，适合减脂' },
          { name: '牛肉面', price: 15, score: 4.8, recommendReason: '分量足，牛肉多' }
        ],
        comments: [
          {
            id: 1,
            userName: '学生A',
            university: 'XX大学',
            score: 5,
            content: '出餐真的很快，5分钟就拿到了，味道也不错，学生还能打折',
            images: []
          },
          {
            id: 2,
            userName: '学生B',
            university: 'YY学院',
            score: 3,
            content: '味道还行，就是高峰期人太多，没地方坐',
            images: ['https://placehold.co/100x100']
          }
        ],
        discounts: [
          {
            id: 1,
            title: '学生8折优惠',
            desc: '凭学生证到店消费享8折',
            validTime: '长期有效'
          },
          {
            id: 2,
            title: '满20减5',
            desc: '拼单满20元立减5元',
            validTime: '2026-03-01 至 2026-04-01'
          }
        ]
      }
    }
  })
  
  // 返回上一页
  const goBack = () => {
    router.go(-1)
  }
  
  // 打开AI点菜助手
  const openAIOrderAssistant = () => {
    orderDialogVisible.value = true
  }
  
  // 生成点菜推荐
  const generateOrderRecommend = async () => {
    try {
      // 调用AI接口生成推荐
      const res = await axios.post(`${import.meta.env.VITE_BASE_API}/ai/order-recommend`, {
        shopId,
        people: orderForm.value.people,
        budget: orderForm.value.budget,
        taste: orderForm.value.taste,
        taboos: orderForm.value.taboos
      })
      orderRecommend.value = res.data.recommend
    } catch (e) {
      console.error('生成点菜推荐失败:', e)
      // 模拟推荐
      orderRecommend.value = `推荐菜品：麻辣香锅（微辣）、番茄炒蛋盖饭、拍黄瓜，总计${orderForm.value.people * orderForm.value.budget}元，适合${orderForm.value.people}人食用，避开了${orderForm.value.taboos}，符合${orderForm.value.taste.join('、')}口味偏好。`
    }
  }
  
  // 导航到店
  const navigateToShop = () => {
    // 调用高德地图导航
    window.open(`https://amap.com/navigation?to=${shopInfo.value.location}&mode=walk`, '_blank')
  }
  
  // 收藏商家
  const collectShop = () => {
    isCollected.value = !isCollected.value
    ElMessage.success(isCollected.value ? '收藏成功' : '取消收藏成功')
  }
  
  // 分享商家
  const shareShop = () => {
    // 生成分享链接
    const shareUrl = `${window.location.origin}/shop/${shopId}`
    // 复制到剪贴板
    navigator.clipboard.writeText(shareUrl)
    ElMessage.success('分享链接已复制到剪贴板')
  }
  
  // 写评价
  const writeComment = () => {
    if (!userStore.userInfo.isAuthenticated) {
      ElMessage.warning('请先完成学生认证')
      router.push('/auth')
      return
    }
    // 打开评价弹窗（实际项目实现）
    ElMessage.info('评价功能开发中...')
  }
  
  // 领取优惠
  const getDiscount = (discountId) => {
    ElMessage.success('优惠领取成功！')
  }
  </script>
  
  <style scoped>
  .shop-detail {
    padding: 20px;
  }
  
  .shop-basic {
    margin-bottom: 20px;
  }
  
  .shop-ai-analysis {
    margin-bottom: 20px;
    padding: 10px;
    background: #f9f9f9;
    border-radius: 8px;
  }
  
  .pros {
    color: #67c23a;
  }
  
  .cons {
    color: #f56c6c;
  }
  
  .shop-menu {
    margin-bottom: 20px;
  }
  
  .ai-order-assistant {
    margin-top: 20px;
  }
  
  .order-recommend {
    margin-top: 10px;
    padding: 10px;
    background: #f0f9ff;
    border-radius: 8px;
  }
  
  .comments-list {
    margin-top: 10px;
  }
  
  .comment-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 10px;
  }
  
  .comment-content {
    margin-bottom: 10px;
  }
  
  .comment-images {
    display: flex;
    gap: 10px;
  }
  
  .comment-images img {
    width: 100px;
    height: 100px;
    object-fit: cover;
    border-radius: 4px;
  }
  
  .shop-actions {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  
  .shop-qrcode {
    text-align: center;
    margin: 20px 0;
  }
  
  .shop-discounts {
    margin-top: 20px;
  }
  
  .discount-item {
    padding: 10px 0;
    border-bottom: 1px dashed #e6e6e6;
  }
  </style>