// server.js（ESM 版本，适配 "type": "module"）
import 'dotenv/config'
import path from 'path'
import { fileURLToPath } from 'url'
import express from 'express'
import cors from 'cors'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const app = express()

// 中间件
app.use(cors())
app.use(express.json())

// 模拟商家数据
const shops = [
  {
    id: 1,
    name: 'XX食堂一楼快餐',
    category: 'fastfood',
    price: 15,
    hasDiscount: true,
    speed: 'fast',
    score: 4.8,
    location: '116.39748,39.90882',
    desc: '出餐快，性价比高，学生8折',
    address: 'XX大学西门内100米',
    businessHours: '06:30-22:00',
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
  },
  {
    id: 2,
    name: 'YY奶茶店',
    category: 'dessert',
    price: 18,
    hasDiscount: true,
    speed: 'normal',
    score: 4.5,
    location: '116.39848,39.90982',
    desc: '新品第二杯半价，距离宿舍近',
    address: 'XX大学南门对面',
    businessHours: '09:00-23:00',
    isPopular: true,
    aiAnalysis: {
      pros: '新品多、学生优惠、距离宿舍近、环境好',
      cons: '高峰期排队久、部分饮品偏甜'
    },
    menu: [
      { name: '珍珠奶茶', price: 12, score: 4.6, recommendReason: '经典款，不踩雷' },
      { name: '水果茶', price: 18, score: 4.7, recommendReason: '水果新鲜，性价比高' },
      { name: '冰淇淋奶茶', price: 20, score: 4.8, recommendReason: '夏季爆款' }
    ],
    comments: [
      {
        id: 1,
        userName: '学生C',
        university: 'XX大学',
        score: 4,
        content: '新品第二杯半价很划算，就是排队有点久',
        images: []
      }
    ],
    discounts: [
      {
        id: 1,
        title: '第二杯半价',
        desc: '学生凭学生证享第二杯半价',
        validTime: '2026-03-01 至 2026-04-01'
      }
    ]
  }
]

// 获取商家列表
app.get('/api/shops', (req, res) => {
  res.json(shops)
})

// 获取商家详情
app.get('/api/shops/:id', (req, res) => {
  const shop = shops.find(s => s.id === parseInt(req.params.id))
  if (shop) {
    res.json(shop)
  } else {
    res.status(404).json({ message: '商家不存在' })
  }
})

const DASHSCOPE_CHAT_URL = 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions'
const AI_MODEL = 'qwen3.5-flash'

function buildSystemPrompt(university, restaurantList) {
  const listText = restaurantList.length === 0
    ? '（当前暂无周边餐厅列表，请引导用户先去「推荐」页加载附近美食。）'
    : `当前学校：${university || '未选择'}。周边餐厅列表（序号、名称、人均、评分，最多100家）：${restaurantList.slice(0, 100).map((s, i) => `${i + 1}. ${s.name}${s.cost != null ? ' 人均¥' + s.cost : ''}${s.rating != null ? ' 评分' + s.rating : ''}`).join('；')}。`
  return `你是校园美食推荐智能体，用户是在校大学生。请根据用户输入与对话历史中的偏好（口味、预算、场景如一人食/聚餐等），用 1～3 句话简短回复，并自然提及你为他挑选的推荐。

重要：你推荐的餐厅必须从上面「周边餐厅列表」里选。在回复最后单独占一行，严格按以下格式输出（只写序号，用英文逗号分隔，最多5个序号）：
[RECOMMEND: 序号1, 序号2, 序号3]
例如推荐列表中第 2、5、10 家则写：[RECOMMEND: 2, 5, 10]
若没有餐厅列表或用户未说明需求，可友好引导用户说出口味、预算或场景，且不要输出 [RECOMMEND: ...] 行。${listText}`
}

// 从用户消息与历史中提取偏好关键词（用于规则兜底）
function extractPreferenceKeys(message, history) {
  const text = [message, ...(history || []).map(m => m.content || '')].join(' ')
  const lower = text.toLowerCase()
  const keys = { cheap: false, highRating: false, spicy: false, sweet: false, group: false, fast: false }
  if (/\d+元|便宜|实惠|低价|人均\s*\d+|预算/.test(text)) keys.cheap = true
  if (/评分|好评|高分|好吃|推荐/.test(text)) keys.highRating = true
  if (/辣|火锅|川|湘/.test(text)) keys.spicy = true
  if (/甜|奶茶|甜品|饮料/.test(text)) keys.sweet = true
  if (/聚餐|多人|请客|宿舍/.test(text)) keys.group = true
  if (/快|快餐|赶时间|出餐/.test(text)) keys.fast = true
  return keys
}

// 从大模型回复中解析 [RECOMMEND: 序号1, 序号2, ...]，按序号从周边列表中取店（1-based，与 prompt 中列表一致）
function parseRecommendedShopsFromReply(replyText, nearbyRestaurants) {
  const match = replyText.match(/\[RECOMMEND:\s*([^\]]+)\]/)
  if (!match || !Array.isArray(nearbyRestaurants) || nearbyRestaurants.length === 0) return null
  const parts = match[1].split(/[,，]/).map(s => s.trim()).filter(Boolean)
  const result = []
  const maxIndex = nearbyRestaurants.length
  const seen = new Set()

  for (const part of parts) {
    const num = parseInt(part, 10)
    if (Number.isNaN(num) || num < 1 || num > maxIndex) continue
    const idx = num - 1
    const shop = nearbyRestaurants[idx]
    if (!shop || seen.has(idx)) continue
    seen.add(idx)
    result.push(shop)
  }
  return result.length > 0 ? result : null
}

// 去掉回复中 [RECOMMEND: ...] 那一行，只保留给用户看的文字
function stripRecommendLine(replyText) {
  return replyText
    .replace(/\n?\[RECOMMEND:[^\]]*\]\s*/gi, '')
    .replace(/\n?\[Recommand[^\]]*\]\s*/gi, '')
    .trim()
}

// 从周边列表中规则筛选并排序，最多返回 5 家（无 LLM 时的兜底）
function pickRecommendedShops(nearbyRestaurants, preference) {
  if (!Array.isArray(nearbyRestaurants) || nearbyRestaurants.length === 0) return []
  let list = nearbyRestaurants.map((p, i) => ({
    ...p,
    _cost: typeof p.cost === 'number' && p.cost > 0 ? p.cost : 999,
    _rating: typeof p.rating === 'number' ? p.rating : (p.rating != null ? Number(p.rating) : 0)
  }))
  if (preference.cheap) list.sort((a, b) => a._cost - b._cost)
  else if (preference.highRating) list.sort((a, b) => b._rating - a._rating)
  else list.sort((a, b) => (a.distance != null && b.distance != null ? a.distance - b.distance : 0))
  return list.slice(0, 5).map(({ _cost, _rating, ...rest }) => rest)
}

// 发送 SSE 一行
function sendSSE(res, obj) {
  res.write(`data: ${JSON.stringify(obj)}\n\n`)
}

// AI助手接口：调用百炼 qwen3.5-flash，支持对话记忆 + 周边餐厅列表；stream=true 时流式输出文字，RECOMMEND 不流式
app.post('/api/ai-assistant', async (req, res) => {
  const { message, history = [], university = '', nearbyRestaurants = [], stream: wantStream } = req.body
  const pref = extractPreferenceKeys(message || '', history)
  const recommendedShops = pickRecommendedShops(nearbyRestaurants, pref)
  const apiKey = process.env.BAILIAN_API_KEY || process.env.DASHSCOPE_API_KEY

  if (wantStream && apiKey) {
    try {
      res.setHeader('Content-Type', 'text/event-stream')
      res.setHeader('Cache-Control', 'no-cache')
      res.setHeader('Connection', 'keep-alive')
      res.setHeader('X-Accel-Buffering', 'no')
      res.flushHeaders?.()

      const systemContent = buildSystemPrompt(university, nearbyRestaurants)
      const messages = [
        { role: 'system', content: systemContent },
        ...history.slice(-8).map((m) => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: m.content })),
        { role: 'user', content: message }
      ]
      const response = await fetch(DASHSCOPE_CHAT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({
          model: AI_MODEL,
          messages,
          max_tokens: 512,
          temperature: 0.7,
          stream: true
        })
      })
      if (!response.ok || !response.body) throw new Error(response.statusText || 'Stream failed')
      let fullContent = ''
      let lastSentLength = 0
      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const raw = line.slice(6)
            if (raw === '[DONE]') continue
            try {
              const data = JSON.parse(raw)
              const delta = data.choices?.[0]?.delta?.content
              if (typeof delta === 'string') {
                fullContent += delta
                const recommendIdx = fullContent.indexOf('[RECOMMEND:')
                const displayEnd = recommendIdx >= 0 ? recommendIdx : fullContent.length
                const displayContent = fullContent.slice(0, displayEnd).trimEnd()
                if (displayContent.length > lastSentLength) {
                  sendSSE(res, { content: displayContent.slice(lastSentLength) })
                  lastSentLength = displayContent.length
                }
              }
            } catch (_) {}
          }
        }
      }
      const replyText = fullContent.trim()
      const fromLlm = parseRecommendedShopsFromReply(replyText, nearbyRestaurants)
      const finalShops = fromLlm && fromLlm.length > 0 ? fromLlm : recommendedShops
      sendSSE(res, { done: true, recommendedShops: finalShops })
      res.end()
      return
    } catch (err) {
      console.warn('[AI] 流式调用失败:', err.message || err)
      sendSSE(res, { error: err.message || 'Stream failed', done: true, recommendedShops })
      res.end()
      return
    }
  }

  let reply = ''
  if (apiKey) {
    try {
      const systemContent = buildSystemPrompt(university, nearbyRestaurants)
      const messages = [
        { role: 'system', content: systemContent },
        ...history.slice(-8).map((m) => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: m.content })),
        { role: 'user', content: message }
      ]
      const response = await fetch(DASHSCOPE_CHAT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: AI_MODEL,
          messages,
          max_tokens: 512,
          temperature: 0.7
        })
      })
      const data = await response.json()
      const content = data.choices?.[0]?.message?.content
      if (content && typeof content === 'string') {
        reply = content.trim()
        const fromLlm = parseRecommendedShopsFromReply(reply, nearbyRestaurants)
        if (fromLlm && fromLlm.length > 0) {
          recommendedShops.length = 0
          recommendedShops.push(...fromLlm)
        }
        reply = stripRecommendLine(reply)
        if (/\[RECOMMEND:\s*[^\]]+\]/.test(reply)) {
          console.warn('[AI] [RECOMMEND] 序号解析无效或超出范围，已回退为规则推荐。')
        }
      } else {
        throw new Error(data.error?.message || 'Invalid response')
      }
    } catch (err) {
      console.warn('[AI] 百炼 API 调用失败:', err.message || err)
      reply = recommendedShops.length === 0
        ? '当前还没有加载到学校周边的餐厅列表哦～请先在「推荐」页让地图加载附近美食，或移动地图上的红点再试。'
        : `根据你的偏好，为你推荐：${recommendedShops.map((s, i) => `${i + 1}. ${s.name}${s.cost != null ? '（人均约 ¥' + s.cost + '）' : ''}`).join('；')}。点击卡片可查看详情与路线～`
    }
  } else {
    console.warn('[AI] 未配置 BAILIAN_API_KEY / DASHSCOPE_API_KEY，未调用大模型')
    reply = recommendedShops.length === 0
      ? '当前还没有加载到学校周边的餐厅列表哦～请先在「推荐」页让地图加载附近美食。你也可在项目根目录 .env 中配置 BAILIAN_API_KEY 以启用智能回复。'
      : `根据你的偏好，为你推荐以下 ${recommendedShops.length} 家附近美食：${recommendedShops.map((s, i) => `${i + 1}. ${s.name}${s.cost != null ? '（人均约 ¥' + s.cost + '）' : ''}`).join('；')}。点击卡片可查看详情与路线～`
  }

  res.json({
    reply,
    recommendedShops
  })
})

// AI点菜推荐接口
app.post('/api/ai/order-recommend', (req, res) => {
  const { shopId, people, budget, taste, taboos } = req.body
  
  const shop = shops.find(s => s.id === parseInt(shopId))
  let recommend = ''
  
  if (shop) {
    const tasteText = taste.length > 0 ? taste.join('、') : '大众'
    recommend = `推荐菜品：${shop.menu.map(m => m.name).join('、')}，总计${people * budget}元，适合${people}人食用，避开了${taboos || '无'}，符合${tasteText}口味偏好。推荐理由：这些菜品是该店销量前3的菜品，学生好评率超过90%，性价比高。`
  } else {
    recommend = '未找到该商家，无法生成点菜推荐。'
  }
  
  res.json({ recommend })
})

// 生产环境：托管前端构建产物，同一域名访问
const distPath = path.join(__dirname, '..', 'dist')
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(distPath))
  app.get('path', (req, res, next) => {
    if (req.path.startsWith('/api')) return next()
    res.sendFile(path.join(distPath, 'index.html'))
  })
}

// 启动服务器（Render/Railway 等会注入 process.env.PORT）
const PORT = Number(process.env.PORT) || 3000
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})
