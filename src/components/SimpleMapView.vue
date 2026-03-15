<template>
  <div class="map-page" ref="mapPageRef">
    <div class="map-wrapper" :style="{ flex: `0 0 ${mapWidthPercent}%` }">
      <div class="map-container" ref="mapRef"></div>
      <!-- 左上角：圆形搜索图标，悬停展开并保持，点击 X 收回 -->
      <div class="map-search-overlay" @mouseenter="searchExpanded = true">
        <div class="map-search-box" :class="{ expanded: searchExpanded }">
          <button
            type="button"
            class="search-icon-btn"
            aria-label="搜索"
            @click="searchExpanded = true"
          >
            <el-icon :size="20"><Search /></el-icon>
          </button>
          <input
            v-model="searchKeyword"
            type="text"
            class="search-input"
            placeholder="搜索地点或地址"
            @keyup.enter="onSearch"
          />
          <button
            v-show="searchExpanded"
            type="button"
            class="search-close-btn"
            aria-label="收起"
            @click.stop="searchExpanded = false"
          >
            <el-icon :size="16"><Close /></el-icon>
          </button>
        </div>
      </div>
      <!-- 右下角：返回当前位置（与地图缩放控件错开） -->
      <div class="map-locate-overlay">
        <button
          type="button"
          class="locate-btn"
          aria-label="定位到我的位置"
          title="定位到我的位置"
          @click="goToMyLocation"
        >
          <el-icon :size="22"><Aim /></el-icon>
        </button>
      </div>
    </div>
    <div
      class="resize-handle"
      aria-label="拖动调节左右宽度"
      title="拖动调节左右宽度"
      @mousedown="onResizeStart"
    />
    <aside class="recommend-panel" :style="{ flex: `0 0 ${100 - mapWidthPercent}%` }">
      <div class="recommend-content" :class="{ 'recommend-content--ai': rightTab === 'AI发现' && !selectedRestaurant, 'recommend-content--square': rightTab === '种草广场', 'recommend-content--profile': rightTab === '个人中心' }" ref="recommendContentRef">
        <!-- 推荐：列表 或 餐厅落地页 -->
        <template v-if="rightTab === '美食推荐'">
          <template v-if="selectedRestaurant">
            <!-- 餐厅落地页 -->
            <div class="poi-detail">
              <div class="poi-detail-hero">
                <div class="poi-detail-cover">
                  <template v-if="selectedRestaurant.picUrl">
                    <div class="poi-detail-cover-sharp" :style="{ backgroundImage: 'url(' + selectedRestaurant.picUrl + ')' }"></div>
                    <div class="poi-detail-cover-blur" :style="{ backgroundImage: 'url(' + selectedRestaurant.picUrl + ')' }"></div>
                  </template>
                  <div v-else class="poi-detail-cover-placeholder">暂无图片</div>
                </div>
                <button type="button" class="poi-detail-back" aria-label="返回列表" @click="selectedRestaurant = null">
                  <el-icon :size="20"><ArrowLeft /></el-icon>
                  <span>返回</span>
                </button>
                <div class="poi-detail-hero-overlay">
                  <h1 class="poi-detail-name">{{ selectedRestaurant.name }}</h1>
                  <div class="poi-detail-badges">
                    <span v-if="selectedRestaurant.rating != null" class="poi-detail-stars" :title="'评分 ' + selectedRestaurant.rating">
                      <template v-for="(fill, i) in starFills(selectedRestaurant.rating)" :key="i">
                        <span v-if="fill === 1" class="poi-detail-star poi-detail-star-full">★</span>
                        <span v-else-if="fill === 0.5" class="poi-detail-star poi-detail-star-half">
                          <span class="poi-detail-star-half-empty">☆</span>
                          <span class="poi-detail-star-half-full">★</span>
                        </span>
                        <span v-else class="poi-detail-star poi-detail-star-empty">☆</span>
                      </template>
                      <span class="poi-detail-rating-num">{{ selectedRestaurant.rating }}</span>
                    </span>
                    <span v-else class="poi-detail-badge">暂无评分</span>
                    <span v-if="selectedRestaurant.cost != null && typeof selectedRestaurant.cost === 'number'" class="poi-detail-badge">人均 ¥{{ selectedRestaurant.cost }}</span>
                    <span v-if="selectedRestaurant.type" class="poi-detail-badge poi-detail-badge-type">{{ selectedRestaurant.type.split(';').filter(Boolean).pop() || selectedRestaurant.type }}</span>
                  </div>
                  <div v-if="selectedRestaurant.opentime" class="poi-detail-meta-line">
                    <span class="poi-detail-meta-label">营业时间：</span>
                    <span>{{ selectedRestaurant.opentime }}</span>
                  </div>
                  <div v-if="selectedRestaurant.opentime && isRestaurantOpen(selectedRestaurant.opentime) !== null" class="poi-detail-meta-line">
                    <span class="poi-detail-meta-label">营业状态：</span>
                    <span v-if="isRestaurantOpen(selectedRestaurant.opentime) === true" class="poi-detail-open">营业中</span>
                    <span v-else class="poi-detail-closed">休息中</span>
                  </div>
                </div>
              </div>
              <div class="poi-detail-body">
                <section class="poi-detail-section">
                  <h3 class="poi-detail-section-title">位置</h3>
                  <p class="poi-detail-address">{{ selectedRestaurant.address || '暂无地址' }}</p>
                  <div class="poi-detail-route-btns">
                    <button
                      type="button"
                      class="poi-detail-route-btn"
                      :class="{ active: routeMode === 'walk' }"
                      @click="switchRouteMode('walk')"
                    >
                      步行 {{ formatDuration(routeDurations.walk) }}
                    </button>
                    <button
                      type="button"
                      class="poi-detail-route-btn"
                      :class="{ active: routeMode === 'ride' }"
                      @click="switchRouteMode('ride')"
                    >
                      骑行 {{ formatDuration(routeDurations.ride) }}
                    </button>
                    <button
                      type="button"
                      class="poi-detail-route-btn"
                      :class="{ active: routeMode === 'ebike' }"
                      @click="switchRouteMode('ebike')"
                    >
                      电动车 {{ formatDuration(routeDurations.ebike) }}
                    </button>
                  </div>
                </section>
                <div class="poi-detail-tabs-wrap">
                  <div class="poi-detail-tabs-header">
                    <button
                      v-for="t in detailTabs"
                      :key="t"
                      type="button"
                      class="poi-detail-tab-btn"
                      :class="{ active: detailTab === t }"
                      @click="detailTab = t"
                    >
                      {{ t }}
                    </button>
                  </div>
                  <div class="poi-detail-tab-panel">
                    <template v-if="detailTab === '特色'">
                      <div v-if="specialtyDishes.length" class="poi-detail-dishes">
                        <div
                          v-for="(dish, dIdx) in displayedSpecialtyDishes"
                          :key="dIdx"
                          class="poi-detail-dish-card"
                        >
                          <div class="poi-detail-dish-pic">
                            <img v-if="dish.image" :src="dish.image" :alt="dish.name" />
                            <span v-else class="poi-detail-dish-pic-placeholder">暂无图片</span>
                          </div>
                          <div class="poi-detail-dish-info">
                            <span class="poi-detail-dish-name">{{ stripTagSymbols(dish.name) || dish.name }}</span>
                            <span class="poi-detail-dish-price">{{ dish.price != null ? '¥' + dish.price : '—' }}</span>
                          </div>
                        </div>
                        <button v-if="specialtyDishes.length > SPECIALTY_DISHES_COLLAPSED && !specialtyDishesExpanded" type="button" class="poi-detail-dishes-more" @click="specialtyDishesExpanded = true">点击加载更多</button>
                      </div>
                      <p v-else class="poi-detail-tab-content">{{ formatTag(selectedRestaurant.tag) }}</p>
                    </template>
                    <template v-else-if="detailTab === '团购'">
                      <p class="poi-detail-tab-content poi-detail-groupbuy-tip">暂时无法获取团购信息，比价与团购推荐功能待开发，详情前往各团购平台查看</p>
                      <div class="poi-detail-groupbuy-links">
                        <a :href="meituanGroupBuyUrl" target="_blank" rel="noopener noreferrer" class="poi-detail-groupbuy-link">美团</a>
                        <a :href="douyinGroupBuyUrl" target="_blank" rel="noopener noreferrer" class="poi-detail-groupbuy-link">抖音</a>
                      </div>
                    </template>
                    <template v-else-if="detailTab === '外卖'">
                      <p class="poi-detail-tab-content poi-detail-groupbuy-tip">暂时无法获取外卖信息，比价与外卖推荐功能待开发，详情前往各外卖平台查看</p>
                      <div class="poi-detail-groupbuy-links">
                        <a href="https://waimai.meituan.com/" target="_blank" rel="noopener noreferrer" class="poi-detail-groupbuy-link">美团</a>
                        <a href="https://www.taobao.com/" target="_blank" rel="noopener noreferrer" class="poi-detail-groupbuy-link poi-detail-groupbuy-link--blue">淘宝闪购</a>
                        <a href="https://daojia.jd.com/" target="_blank" rel="noopener noreferrer" class="poi-detail-groupbuy-link">京东</a>
                      </div>
                    </template>
                    <template v-else-if="detailTab === '惜食'">
                      <p class="poi-detail-tab-content poi-detail-groupbuy-tip">暂时无法获取惜食魔法袋信息，详情前往各平台查看</p>
                      <a href="https://magicbag.xishi.life/" target="_blank" rel="noopener noreferrer" class="poi-detail-groupbuy-link">惜食魔法袋</a>
                    </template>
                    <template v-else-if="detailTab === '评价'">
                      <p class="poi-detail-tab-content poi-detail-groupbuy-tip">暂时无法获取评价信息，AI评价总结与评论显示待开发，详情前往各内容平台查看</p>
                      <div class="poi-detail-groupbuy-links">
                        <a :href="xiaohongshuSearchUrl" target="_blank" rel="noopener noreferrer" class="poi-detail-groupbuy-link">小红书</a>
                        <a :href="douyinSearchUrl" target="_blank" rel="noopener noreferrer" class="poi-detail-groupbuy-link">抖音</a>
                        <a :href="dianpingSearchUrl" target="_blank" rel="noopener noreferrer" class="poi-detail-groupbuy-link">大众点评</a>
                      </div>
                    </template>
                    <p v-else class="poi-detail-tab-content">等待商家上传</p>
                  </div>
                </div>
              </div>
            </div>
          </template>
          <template v-else>
            <div class="recommend-top-bar">
              <el-dropdown trigger="click" @command="(cmd) => (sortBy = cmd)">
                <button type="button" class="recommend-top-btn">
                  <span>{{ sortOptions.find((o) => o.value === sortBy)?.label || '排序' }}</span>
                  <el-icon class="recommend-top-btn-icon"><CaretBottom /></el-icon>
                </button>
                <template #dropdown>
                  <el-dropdown-menu>
                    <el-dropdown-item
                      v-for="opt in sortOptions"
                      :key="opt.value"
                      :command="opt.value"
                    >
                      {{ opt.label }}
                    </el-dropdown-item>
                  </el-dropdown-menu>
                </template>
              </el-dropdown>
              <el-popover placement="bottom-end" :width="320" trigger="click">
                <template #reference>
                  <button type="button" class="recommend-top-btn">
                    <el-icon><Filter /></el-icon>
                    <span>筛选</span>
                  </button>
                </template>
                <div class="recommend-filter-popover">
                  <div class="recommend-filter-popover-row">
                    <span class="recommend-filter-label">人均 ¥{{ filterPriceRange[0] }} - ¥{{ filterPriceRange[1] }}</span>
                    <el-slider v-model="filterPriceRange" range :min="0" :max="300" :step="10" />
                  </div>
                  <div class="recommend-filter-popover-row">
                    <span class="recommend-filter-label">距离 0 - {{ filterDistanceKm }} km</span>
                    <el-slider v-model="filterDistanceKm" :min="0.5" :max="3" :step="0.5" />
                  </div>
                  <div class="recommend-filter-popover-row">
                    <span class="recommend-filter-label">餐厅类型</span>
                    <div class="recommend-filter-tags">
                      <button
                        v-for="tag in restaurantTypeTags"
                        :key="tag.id"
                        type="button"
                        class="recommend-filter-tag"
                        :class="{ active: filterTypeTagIds.includes(tag.id) }"
                        @click="toggleFilterTypeTag(tag.id)"
                      >
                        {{ tag.label }}
                      </button>
                    </div>
                    <p v-if="filterTypeTagIds.length === 0" class="recommend-filter-type-error" :class="{ 'recommend-filter-type-error--emphasize': filterTypeErrorEmphasize }">
                      请至少选择一类餐厅
                    </p>
                  </div>
                  <div class="recommend-filter-popover-row recommend-filter-actions">
                    <button type="button" class="recommend-filter-btn reset" @click="resetFilter">重置</button>
                    <button type="button" class="recommend-filter-btn save" @click="saveFilter">保存</button>
                  </div>
                </div>
              </el-popover>
            </div>
            <div class="recommend-list">
              <template v-if="recommendListDisplay.length">
                <template v-for="(entry, idx) in recommendListWithAds" :key="entry.type === 'item' ? (entry.item.id ?? 'i' + entry.index) : entry.adKey">
                  <div
                    v-if="entry.type === 'item'"
                    :id="'list-item-' + String(entry.item.id != null ? entry.item.id : 'i' + entry.index).replace(/[^a-zA-Z0-9-_.]/g, '_')"
                    class="recommend-item"
                    :class="{ 'recommend-item-highlight': highlightedItem === entry.item }"
                    @click.stop="openRestaurantDetail(entry.item)"
                  >
                    <span class="recommend-item-index">{{ entry.index + 1 }}</span>
                    <div class="recommend-item-pic">
                      <img v-if="entry.item.picUrl" :src="entry.item.picUrl" :alt="entry.item.name" loading="lazy" />
                      <span v-else class="recommend-item-pic-placeholder">无图</span>
                    </div>
                    <div class="recommend-item-body">
                      <div class="recommend-item-name">{{ entry.item.name }}</div>
                      <div class="recommend-item-meta">
                        <span v-if="entry.item.rating != null">{{ entry.item.rating }}</span>
                        <span v-else class="recommend-item-meta-empty">暂无评分</span>
                        <template v-if="entry.item.cost != null && typeof entry.item.cost === 'number'">
                          <span class="recommend-item-meta-sep">|</span>
                          <span>人均 ¥{{ entry.item.cost }}</span>
                        </template>
                      </div>
                      <div v-if="getRecommendReasonTags(entry.item).length" class="recommend-item-tags">
                        <span
                          v-for="tag in getRecommendReasonTags(entry.item)"
                          :key="tag.key"
                          class="recommend-item-tag"
                          :class="tag.class"
                        >{{ tag.label }}</span>
                      </div>
                    </div>
                    <button type="button" class="recommend-item-fav" aria-label="收藏" @click.stop="onFavClick(entry.item)">
                      <svg v-if="isFav(entry.item)" class="recommend-item-star" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                      </svg>
                      <svg v-else class="recommend-item-star recommend-item-star--outline" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                      </svg>
                    </button>
                  </div>
                  <div v-else-if="entry.type === 'ad'" class="recommend-ad-slot">
                    <button type="button" class="recommend-ad-close" aria-label="关闭广告" @click.stop="closeAd(entry.adKey)">×</button>
                    <span class="recommend-ad-text">联盟广告位</span>
                  </div>
                </template>
              </template>
              <p v-else-if="recommendLoading" class="recommend-placeholder">正在加载周边餐厅…</p>
              <p v-else-if="recommendList.length" class="recommend-placeholder">暂无符合筛选条件的结果</p>
              <p v-else class="recommend-placeholder">暂无推荐，可移动标记或点击定位</p>
              <div v-if="recommendListDisplay.length" class="recommend-load-more-row">
                <span
                  v-if="recommendVisibleCount < sortedAndFilteredList.length || !noMoreFromApi"
                  class="recommend-load-more-link"
                  :class="{ loading: recommendLoadMoreLoading }"
                  @click="recommendLoadMoreLoading ? undefined : loadMoreRecommend()"
                >
                  <span v-if="recommendLoadMoreLoading" class="recommend-load-more-spin"></span>
                  <span v-else>加载更多</span>
                </span>
                <span v-else class="recommend-load-more-end">人家是有底线的哦~</span>
              </div>
            </div>
          </template>
        </template>
        <!-- AI推荐：ChatGPT 风格对话 + 智能体推荐；点击餐厅在本页展示详情 -->
        <template v-else-if="rightTab === 'AI发现'">
          <template v-if="selectedRestaurant">
            <!-- 在 AI 推荐页内展示餐厅详情，样式同推荐页 -->
            <div class="poi-detail">
              <div class="poi-detail-hero">
                <div class="poi-detail-cover">
                  <template v-if="selectedRestaurant.picUrl">
                    <div class="poi-detail-cover-sharp" :style="{ backgroundImage: 'url(' + selectedRestaurant.picUrl + ')' }"></div>
                    <div class="poi-detail-cover-blur" :style="{ backgroundImage: 'url(' + selectedRestaurant.picUrl + ')' }"></div>
                  </template>
                  <div v-else class="poi-detail-cover-placeholder">暂无图片</div>
                </div>
                <button type="button" class="poi-detail-back" aria-label="返回对话" @click="selectedRestaurant = null">
                  <el-icon :size="20"><ArrowLeft /></el-icon>
                  <span>返回</span>
                </button>
                <div class="poi-detail-hero-overlay">
                  <h1 class="poi-detail-name">{{ selectedRestaurant.name }}</h1>
                  <div class="poi-detail-badges">
                    <span v-if="selectedRestaurant.rating != null" class="poi-detail-stars" :title="'评分 ' + selectedRestaurant.rating">
                      <template v-for="(fill, i) in starFills(selectedRestaurant.rating)" :key="i">
                        <span v-if="fill === 1" class="poi-detail-star poi-detail-star-full">★</span>
                        <span v-else-if="fill === 0.5" class="poi-detail-star poi-detail-star-half">
                          <span class="poi-detail-star-half-empty">☆</span>
                          <span class="poi-detail-star-half-full">★</span>
                        </span>
                        <span v-else class="poi-detail-star poi-detail-star-empty">☆</span>
                      </template>
                      <span class="poi-detail-rating-num">{{ selectedRestaurant.rating }}</span>
                    </span>
                    <span v-else class="poi-detail-badge">暂无评分</span>
                    <span v-if="selectedRestaurant.cost != null && typeof selectedRestaurant.cost === 'number'" class="poi-detail-badge">人均 ¥{{ selectedRestaurant.cost }}</span>
                    <span v-if="selectedRestaurant.type" class="poi-detail-badge poi-detail-badge-type">{{ selectedRestaurant.type.split(';').filter(Boolean).pop() || selectedRestaurant.type }}</span>
                  </div>
                  <div v-if="selectedRestaurant.opentime" class="poi-detail-meta-line">
                    <span class="poi-detail-meta-label">营业时间：</span>
                    <span>{{ selectedRestaurant.opentime }}</span>
                  </div>
                  <div v-if="selectedRestaurant.opentime && isRestaurantOpen(selectedRestaurant.opentime) !== null" class="poi-detail-meta-line">
                    <span class="poi-detail-meta-label">营业状态：</span>
                    <span v-if="isRestaurantOpen(selectedRestaurant.opentime) === true" class="poi-detail-open">营业中</span>
                    <span v-else class="poi-detail-closed">休息中</span>
                  </div>
                </div>
              </div>
              <div class="poi-detail-body">
                <section class="poi-detail-section">
                  <h3 class="poi-detail-section-title">位置</h3>
                  <p class="poi-detail-address">{{ selectedRestaurant.address || '暂无地址' }}</p>
                  <div class="poi-detail-route-btns">
                    <button type="button" class="poi-detail-route-btn" :class="{ active: routeMode === 'walk' }" @click="switchRouteMode('walk')">步行 {{ formatDuration(routeDurations.walk) }}</button>
                    <button type="button" class="poi-detail-route-btn" :class="{ active: routeMode === 'ride' }" @click="switchRouteMode('ride')">骑行 {{ formatDuration(routeDurations.ride) }}</button>
                    <button type="button" class="poi-detail-route-btn" :class="{ active: routeMode === 'ebike' }" @click="switchRouteMode('ebike')">电动车 {{ formatDuration(routeDurations.ebike) }}</button>
                  </div>
                </section>
                <div class="poi-detail-tabs-wrap">
                  <div class="poi-detail-tabs-header">
                    <button v-for="t in detailTabs" :key="t" type="button" class="poi-detail-tab-btn" :class="{ active: detailTab === t }" @click="detailTab = t">{{ t }}</button>
                  </div>
                  <div class="poi-detail-tab-panel">
                    <template v-if="detailTab === '特色'">
                      <div v-if="specialtyDishes.length" class="poi-detail-dishes">
                        <div v-for="(dish, dIdx) in displayedSpecialtyDishes" :key="dIdx" class="poi-detail-dish-card">
                          <div class="poi-detail-dish-pic"><img v-if="dish.image" :src="dish.image" :alt="dish.name" /><span v-else class="poi-detail-dish-pic-placeholder">暂无图片</span></div>
                          <div class="poi-detail-dish-info"><span class="poi-detail-dish-name">{{ stripTagSymbols(dish.name) || dish.name }}</span><span class="poi-detail-dish-price">{{ dish.price != null ? '¥' + dish.price : '—' }}</span></div>
                        </div>
                        <button v-if="specialtyDishes.length > SPECIALTY_DISHES_COLLAPSED && !specialtyDishesExpanded" type="button" class="poi-detail-dishes-more" @click="specialtyDishesExpanded = true">点击加载更多</button>
                      </div>
                      <p v-else class="poi-detail-tab-content">{{ formatTag(selectedRestaurant.tag) }}</p>
                    </template>
                    <template v-else-if="detailTab === '团购'"><p class="poi-detail-tab-content poi-detail-groupbuy-tip">暂时无法获取团购信息，比价与团购推荐功能待开发，详情前往各团购平台查看</p><div class="poi-detail-groupbuy-links"><a :href="meituanGroupBuyUrl" target="_blank" rel="noopener noreferrer" class="poi-detail-groupbuy-link">美团</a><a :href="douyinGroupBuyUrl" target="_blank" rel="noopener noreferrer" class="poi-detail-groupbuy-link">抖音</a></div></template>
                    <template v-else-if="detailTab === '外卖'"><p class="poi-detail-tab-content poi-detail-groupbuy-tip">暂时无法获取外卖信息，比价与外卖推荐功能待开发，详情前往各外卖平台查看</p><div class="poi-detail-groupbuy-links"><a href="https://waimai.meituan.com/" target="_blank" rel="noopener noreferrer" class="poi-detail-groupbuy-link">美团</a><a href="https://www.taobao.com/" target="_blank" rel="noopener noreferrer" class="poi-detail-groupbuy-link poi-detail-groupbuy-link--blue">淘宝闪购</a><a href="https://daojia.jd.com/" target="_blank" rel="noopener noreferrer" class="poi-detail-groupbuy-link">京东</a></div></template>
                    <template v-else-if="detailTab === '惜食'"><p class="poi-detail-tab-content poi-detail-groupbuy-tip">暂时无法获取惜食魔法袋信息，详情前往各平台查看</p><a href="https://magicbag.xishi.life/" target="_blank" rel="noopener noreferrer" class="poi-detail-groupbuy-link">惜食魔法袋</a></template>
                    <template v-else-if="detailTab === '评价'"><p class="poi-detail-tab-content poi-detail-groupbuy-tip">暂时无法获取评价信息，AI评价总结与评论显示待开发，详情前往各内容平台查看</p><div class="poi-detail-groupbuy-links"><a :href="xiaohongshuSearchUrl" target="_blank" rel="noopener noreferrer" class="poi-detail-groupbuy-link">小红书</a><a :href="douyinSearchUrl" target="_blank" rel="noopener noreferrer" class="poi-detail-groupbuy-link">抖音</a><a :href="dianpingSearchUrl" target="_blank" rel="noopener noreferrer" class="poi-detail-groupbuy-link">大众点评</a></div></template>
                    <p v-else class="poi-detail-tab-content">等待商家上传</p>
                  </div>
                </div>
              </div>
            </div>
          </template>
          <template v-else>
          <div class="ai-chat-wrap">
            <div class="ai-chat-messages" ref="aiChatMessagesRef">
              <div class="ai-chat-messages-inner">
              <template v-for="(msg, idx) in aiChatMessages" :key="idx">
                <div class="ai-chat-msg" :class="msg.role">
                  <div class="ai-chat-avatar">
                    <span v-if="msg.role === 'assistant'" class="ai-chat-avatar-icon">助</span>
                    <span v-else class="ai-chat-avatar-icon user">我</span>
                  </div>
                  <div class="ai-chat-content">
                    <div class="ai-chat-bubble">
                      <p class="ai-chat-text">{{ msg.content }}</p>
                      <div v-if="(idx === 0 && msg.role === 'assistant' ? initialAiRecommendations : (msg.recommendedShops || [])).length" class="ai-chat-cards">
                        <div
                          v-for="(shop, sIdx) in (idx === 0 && msg.role === 'assistant' ? initialAiRecommendations : (msg.recommendedShops || [])).slice(0, 5)"
                          :key="(shop && (shop.id != null ? shop.id : shop.name)) || sIdx"
                          class="ai-chat-card recommend-item"
                          @click="openRestaurantDetail(shop)"
                        >
                          <span class="recommend-item-index">{{ sIdx + 1 }}</span>
                          <div class="recommend-item-pic">
                            <img v-if="shop.picUrl" :src="shop.picUrl" :alt="shop.name" />
                            <span v-else class="recommend-item-pic-placeholder">无图</span>
                          </div>
                          <div class="recommend-item-body">
                            <div class="recommend-item-name">{{ shop.name }}</div>
                            <div class="recommend-item-meta">
                              <span v-if="shop.rating != null">{{ shop.rating }}</span>
                              <span v-else class="recommend-item-meta-empty">暂无评分</span>
                              <template v-if="shop.cost != null && typeof shop.cost === 'number'">
                                <span class="recommend-item-meta-sep">|</span>
                                <span>人均 ¥{{ shop.cost }}</span>
                              </template>
                            </div>
                          </div>
                          <button type="button" class="recommend-item-fav" aria-label="收藏" @click.stop="onFavClick(shop)">
                            <svg v-if="isFav(shop)" class="recommend-item-star" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                            </svg>
                            <svg v-else class="recommend-item-star recommend-item-star--outline" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </template>
              <div v-if="aiChatLoading" class="ai-chat-msg assistant">
                <div class="ai-chat-avatar"><span class="ai-chat-avatar-icon">助</span></div>
                <div class="ai-chat-content">
                  <div class="ai-chat-bubble ai-chat-typing">
                    <span class="ai-chat-dots"><span></span><span></span><span></span></span>
                  </div>
                </div>
              </div>
              </div>
            </div>
            <div class="ai-chat-input-bar">
              <input
                v-model="aiChatInput"
                type="text"
                class="ai-chat-input"
                placeholder="输入口味、预算或场景…"
                @keyup.enter.prevent="sendAiChat"
              />
              <button type="button" class="ai-chat-send" :disabled="aiChatLoading || !aiChatInput.trim()" @click="sendAiChat" title="发送">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/></svg>
              </button>
            </div>
          </div>
          </template>
        </template>
        <!-- 种草广场：列表与发帖同属右侧容器，发帖为内嵌页随容器自适应 -->
        <template v-else-if="rightTab === '种草广场'">
          <div class="square-area">
            <!-- 作品详情页（小红书风格）：无顶栏标题，多图轮播，店铺名单独一行+步行路径 -->
            <template v-if="selectedSquarePost">
              <div class="square-detail-page">
                <div class="square-detail-header">
                  <button type="button" class="post-inline-back" @click="closeSquareDetail">
                    <el-icon :size="20"><ArrowLeft /></el-icon>
                    <span>返回</span>
                  </button>
                  <button v-if="selectedSquarePost.authorName === '我'" type="button" class="square-detail-delete" @click="confirmDeletePost(selectedSquarePost)">删除</button>
                </div>
                <div class="square-detail-body">
                  <div class="square-detail-img-wrap">
                    <template v-if="squareDetailImages.length">
                      <img :src="squareDetailImages[squarePostImageIndex]" :alt="selectedSquarePost.title" class="square-detail-img" />
                      <button v-if="squareDetailImages.length > 1" type="button" class="square-detail-img-prev" aria-label="上一张" @click.stop="squarePostImageIndex = (squarePostImageIndex - 1 + squareDetailImages.length) % squareDetailImages.length">‹</button>
                      <button v-if="squareDetailImages.length > 1" type="button" class="square-detail-img-next" aria-label="下一张" @click.stop="squarePostImageIndex = (squarePostImageIndex + 1) % squareDetailImages.length">›</button>
                    </template>
                    <div v-else class="square-detail-img-placeholder">暂无图片</div>
                  </div>
                  <div class="square-detail-actions">
                    <button type="button" class="square-detail-action-btn" :class="{ active: selectedSquarePost.liked }" @click="togglePostLike(selectedSquarePost)">
                      <svg v-if="selectedSquarePost.liked === true" class="square-detail-action-icon" viewBox="0 0 24 24" fill="currentColor"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
                      <svg v-else class="square-detail-action-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
                      <span>点赞</span>
                      <span class="square-detail-action-num">{{ selectedSquarePost.likeCount ?? 0 }}</span>
                    </button>
                    <button type="button" class="square-detail-action-btn">
                      <svg class="square-detail-action-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                      <span>评论</span>
                      <span class="square-detail-action-num">{{ squareDetailComments.length }}</span>
                    </button>
                  </div>
                  <div class="square-detail-content">
                    <h1 class="square-detail-title-text">{{ selectedSquarePost.title }}</h1>
                    <div class="square-detail-meta">
                      <span class="square-detail-avatar">{{ (selectedSquarePost.authorName || '用').charAt(0) }}</span>
                      <span class="square-detail-author">{{ selectedSquarePost.authorName || '匿名用户' }}</span>
                    </div>
                    <div v-if="selectedSquarePost.shopName" class="square-detail-shop-row">
                      <span class="square-detail-shop-icon">📍</span>
                      <span class="square-detail-shop-name">{{ selectedSquarePost.shopName }}</span>
                    </div>
                    <p v-if="selectedSquarePost.content" class="square-detail-desc">{{ selectedSquarePost.content }}</p>
                  </div>
                  <div class="square-detail-comments">
                    <h3 class="square-detail-comments-title">评论区</h3>
                    <div v-if="squareDetailComments.length" class="square-detail-comment-list">
                      <div v-for="(c, i) in squareDetailComments" :key="i" class="square-detail-comment-item">
                        <span class="square-detail-comment-author">{{ c.author || '匿名用户' }}</span>
                        <span class="square-detail-comment-text">{{ c.content }}</span>
                      </div>
                    </div>
                    <p v-else class="square-detail-comments-empty">暂无评论，快来抢沙发～</p>
                  </div>
                </div>
              </div>
            </template>
            <template v-else-if="!showPostModal">
              <div class="square-wrap">
                <div class="square-waterfall">
                  <div v-for="post in squarePosts" :key="post.id" class="square-card">
                    <div class="square-card-img" @click="openSquarePostDetail(post)">
                      <img v-if="(post.images && post.images[0]) || post.imageUrl" :src="(post.images && post.images[0]) || post.imageUrl" :alt="post.title || ''" loading="lazy" />
                      <div v-else class="square-card-img-placeholder">暂无图片</div>
                    </div>
                    <div class="square-card-info">
                      <div class="square-card-title">{{ (post.title || '').trim() ? post.title : (post.content || '').trim() || '暂无内容' }}</div>
                      <div class="square-card-shop">{{ post.shopName || '未关联店铺' }}</div>
                      <div class="square-card-footer">
                        <div class="square-card-user">
                          <span class="square-card-avatar" :style="post.authorAvatar ? { backgroundImage: 'url(' + post.authorAvatar + ')' } : {}">{{ !post.authorAvatar ? (post.authorName || '用').charAt(0) : '' }}</span>
                          <span class="square-card-name">{{ post.authorName || '匿名用户' }}</span>
                        </div>
                        <div class="square-card-like" @click.stop="togglePostLike(post)">
                          <svg v-if="(post.liked === true)" class="square-card-like-icon" viewBox="0 0 24 24" fill="currentColor"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
                          <svg v-else class="square-card-like-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
                          <span class="square-card-like-num">{{ post.likeCount ?? 0 }}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </template>
            <!-- 发帖内嵌页：占满右侧容器，随容器大小自适应 -->
            <div v-else class="post-inline-page">
              <div class="post-inline-header">
                <button type="button" class="post-inline-back" aria-label="返回" @click="closePostModal">
                  <el-icon :size="20"><ArrowLeft /></el-icon>
                  <span>返回</span>
                </button>
                <span class="post-inline-title post-inline-title--center">发笔记</span>
              </div>
              <div class="post-inline-body">
                <div class="post-modal-row">
                  <label class="post-modal-label">照片</label>
                  <div class="post-modal-photo post-modal-photo--inline" @click="triggerPhotoInput">
                    <img v-if="newPostImageUrl" :src="newPostImageUrl" alt="预览" class="post-modal-photo-preview" />
                    <span v-else class="post-modal-photo-placeholder">点击添加图片</span>
                    <input ref="photoInputRef" type="file" accept="image/*" class="post-modal-photo-input" @change="onPostPhotoChange" />
                  </div>
                </div>
                <div class="post-modal-row">
                  <label class="post-modal-label">标题与内容</label>
                  <input v-model="newPostTitle" type="text" class="post-modal-input" placeholder="写个标题" maxlength="50" />
                  <textarea v-model="newPostContent" class="post-modal-textarea" placeholder="分享你的美食体验…" rows="4" />
                </div>
                <div class="post-modal-row">
                  <label class="post-modal-label">关联店铺</label>
                  <input v-model="newPostShopName" type="text" class="post-modal-input" placeholder="输入店铺名称（可选）" />
                </div>
                <div class="post-modal-actions">
                  <button type="button" class="post-modal-btn-publish" @click="publishPost">发布</button>
                </div>
              </div>
            </div>
          </div>
        </template>
        <!-- 个人中心：主页与二级页（饮食偏好/反馈与帮助/收藏/看过/广场作品） -->
        <template v-else-if="rightTab === '个人中心'">
          <div class="profile-wrap">
            <template v-if="!profileSubPage">
              <div class="profile-header">
                <div class="profile-avatar">{{ (userStore.userInfo?.id || '用').toString().charAt(0) }}</div>
                <div class="profile-info">
                  <div class="profile-name">{{ profileDisplayName }}</div>
                  <div class="profile-badge">{{ profileMemberBadge }}</div>
                </div>
              </div>
              <div class="profile-diamond">
                <button type="button" class="profile-diamond-item" @click="onProfileNav('collect')">
                  <span class="profile-diamond-icon">★</span>
                  <span class="profile-diamond-label">收藏</span>
                </button>
                <button type="button" class="profile-diamond-item" @click="onProfileNav('seen')">
                  <span class="profile-diamond-icon">👁</span>
                  <span class="profile-diamond-label">看过</span>
                </button>
                <button type="button" class="profile-diamond-item" @click="onProfileNav('square')">
                  <span class="profile-diamond-icon">✎</span>
                  <span class="profile-diamond-label">广场作品</span>
                </button>
              </div>
              <div class="profile-list">
                <button type="button" class="profile-list-item profile-list-item--with-switch" @click="openMemberFromProfile">
                  <span>续费管理</span>
                  <span class="profile-list-switch-wrap" @click.stop>
                    <span class="profile-list-switch" :class="{ 'profile-list-switch--on': isPaidMember, 'profile-list-switch--off': !isPaidMember }"></span>
                  </span>
                </button>
                <button type="button" class="profile-list-item" @click="onProfileNav('preference')">
                  <span>饮食偏好</span>
                  <span class="profile-list-arrow">›</span>
                </button>
                <button type="button" class="profile-list-item" @click="onProfileNav('feedback')">
                  <span>反馈与帮助</span>
                  <span class="profile-list-arrow">›</span>
                </button>
                <button type="button" class="profile-list-item profile-list-item--danger" @click="userStore.logout(); router.push('/login')">
                  <span>退出登录</span>
                  <span class="profile-list-arrow">›</span>
                </button>
              </div>
            </template>
            <!-- 二级页：饮食偏好 -->
            <template v-else-if="profileSubPage === 'preference'">
              <div class="profile-sub-header">
                <button type="button" class="profile-sub-back" @click="profileSubPage = null">
                  <el-icon :size="20"><ArrowLeft /></el-icon>
                  <span>返回</span>
                </button>
                <span class="profile-sub-title profile-sub-title--center">饮食偏好</span>
              </div>
              <div class="profile-sub-body">
                <div class="preference-row">
                  <label class="preference-label">预算区间</label>
                  <el-slider v-model="preferenceBudget" range :min="0" :max="100" :marks="{ 0: '0', 50: '50', 100: '100+' }" />
                </div>
                <div class="preference-gap"></div>
                <div class="preference-row">
                  <label class="preference-label">口味偏好</label>
                  <input v-model="preferenceTasteStr" type="text" class="preference-input" placeholder="如：辣、甜、咸、清淡" />
                </div>
                <div class="preference-row">
                  <label class="preference-label">饮食忌口</label>
                  <input v-model="preferenceTaboosStr" type="text" class="preference-input" placeholder="如：香菜、海鲜" />
                </div>
                <button type="button" class="preference-save" @click="savePreferenceFromProfile">保存</button>
              </div>
            </template>
            <!-- 二级页：反馈与帮助 -->
            <template v-else-if="profileSubPage === 'feedback'">
              <div class="profile-sub-header">
                <button type="button" class="profile-sub-back" @click="profileSubPage = null">
                  <el-icon :size="20"><ArrowLeft /></el-icon>
                  <span>返回</span>
                </button>
                <span class="profile-sub-title profile-sub-title--center">反馈与帮助</span>
              </div>
              <div class="profile-sub-body feedback-tabs">
                <div class="feedback-tab-head">
                  <button type="button" class="feedback-tab-btn" :class="{ active: feedbackTab === 'faq' }" @click="feedbackTab = 'faq'">常见问题</button>
                  <button type="button" class="feedback-tab-btn" :class="{ active: feedbackTab === 'submit' }" @click="feedbackTab = 'submit'">反馈问题</button>
                  <button type="button" class="feedback-tab-btn" :class="{ active: feedbackTab === 'history' }" @click="feedbackTab = 'history'">反馈记录</button>
                </div>
                <div v-if="feedbackTab === 'faq'" class="feedback-panel">
                  <div class="faq-item">
                    <div class="faq-q">如何收藏店铺？</div>
                    <div class="faq-a">在美食推荐或 AI 发现列表中点店铺卡片上的星标即可收藏。</div>
                  </div>
                  <div class="faq-item">
                    <div class="faq-q">如何发布种草笔记？</div>
                    <div class="faq-a">进入种草广场，点击右下角 + 按钮，填写照片、标题与内容后发布。</div>
                  </div>
                  <div class="faq-item">
                    <div class="faq-q">会员有哪些权益？</div>
                    <div class="faq-a">连续包月/月度会员可享每周优惠券、去广告、专属活动等，详见学生会员弹窗。</div>
                  </div>
                </div>
                <div v-else-if="feedbackTab === 'submit'" class="feedback-panel">
                  <textarea v-model="feedbackInput" class="feedback-textarea" placeholder="请描述您的问题或建议…" rows="4"></textarea>
                  <button type="button" class="feedback-submit-btn" @click="submitFeedback">提交反馈</button>
                </div>
                <div v-else class="feedback-panel">
                  <div v-if="feedbackRecords.length === 0" class="feedback-empty">暂无反馈记录</div>
                  <div v-for="(r, i) in feedbackRecords" :key="i" class="feedback-record-item">
                    <div class="feedback-record-content">{{ r.content }}</div>
                    <div class="feedback-record-time">{{ r.time }}</div>
                  </div>
                </div>
              </div>
            </template>
            <!-- 二级页：我的收藏 -->
            <template v-else-if="profileSubPage === 'collect'">
              <div class="profile-sub-header">
                <button type="button" class="profile-sub-back" @click="profileSubPage = null; updatePoiMarkersForCurrentTab()">
                  <el-icon :size="20"><ArrowLeft /></el-icon>
                  <span>返回</span>
                </button>
                <span class="profile-sub-title profile-sub-title--center">我的收藏</span>
              </div>
              <div class="profile-collect-list">
                <div v-for="(shop, idx) in favShops" :key="shop.id ?? idx" class="ai-chat-card recommend-item" @click="openRestaurantDetail(shop)">
                  <span class="recommend-item-index">{{ idx + 1 }}</span>
                  <div class="recommend-item-pic">
                    <img v-if="shop.picUrl" :src="shop.picUrl" :alt="shop.name" />
                    <span v-else class="recommend-item-pic-placeholder">无图</span>
                  </div>
                  <div class="recommend-item-body">
                    <div class="recommend-item-name">{{ shop.name }}</div>
                    <div class="recommend-item-meta">
                      <span v-if="shop.rating != null">{{ shop.rating }}</span>
                      <span v-else class="recommend-item-meta-empty">暂无评分</span>
                      <template v-if="shop.cost != null && typeof shop.cost === 'number'">
                        <span class="recommend-item-meta-sep">|</span>
                        <span>人均 ¥{{ shop.cost }}</span>
                      </template>
                    </div>
                  </div>
                  <button type="button" class="recommend-item-fav" @click.stop="onFavClick(shop)">
                    <svg v-if="isFav(shop)" class="recommend-item-star" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
                    <svg v-else class="recommend-item-star recommend-item-star--outline" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
                  </button>
                </div>
                <p v-if="favShops.length === 0" class="profile-empty-tip">暂无收藏</p>
              </div>
            </template>
            <!-- 二级页：看过 -->
            <template v-else-if="profileSubPage === 'seen'">
              <div class="profile-sub-header">
                <button type="button" class="profile-sub-back" @click="profileSubPage = null; updatePoiMarkersForCurrentTab()">
                  <el-icon :size="20"><ArrowLeft /></el-icon>
                  <span>返回</span>
                </button>
                <span class="profile-sub-title profile-sub-title--center">看过</span>
              </div>
              <div class="profile-collect-list">
                <div v-for="(shop, idx) in seenShops" :key="shop.id ?? 's'+idx" class="ai-chat-card recommend-item" @click="openRestaurantDetail(shop)">
                  <span class="recommend-item-index">{{ idx + 1 }}</span>
                  <div class="recommend-item-pic">
                    <img v-if="shop.picUrl" :src="shop.picUrl" :alt="shop.name" />
                    <span v-else class="recommend-item-pic-placeholder">无图</span>
                  </div>
                  <div class="recommend-item-body">
                    <div class="recommend-item-name">{{ shop.name }}</div>
                    <div class="recommend-item-meta">
                      <span v-if="shop.rating != null">{{ shop.rating }}</span>
                      <span v-else class="recommend-item-meta-empty">暂无评分</span>
                      <template v-if="shop.cost != null && typeof shop.cost === 'number'">
                        <span class="recommend-item-meta-sep">|</span>
                        <span>人均 ¥{{ shop.cost }}</span>
                      </template>
                    </div>
                  </div>
                </div>
                <p v-if="seenShops.length === 0" class="profile-empty-tip">暂无浏览记录</p>
              </div>
            </template>
            <!-- 二级页：我的作品 -->
            <template v-else-if="profileSubPage === 'square'">
              <div class="profile-sub-header">
                <button type="button" class="profile-sub-back" @click="profileSubPage = null">
                  <el-icon :size="20"><ArrowLeft /></el-icon>
                  <span>返回</span>
                </button>
                <span class="profile-sub-title profile-sub-title--center">我的作品</span>
              </div>
              <div class="profile-square-waterfall square-waterfall">
                <div v-for="post in mySquarePosts" :key="post.id" class="square-card" @click="openSquarePostDetail(post)">
                  <div class="square-card-img">
                    <img v-if="post.imageUrl" :src="post.imageUrl" :alt="post.title" />
                    <div v-else class="square-card-img-placeholder">暂无图片</div>
                  </div>
                  <div class="square-card-title">{{ post.title }}</div>
                  <div class="square-card-shop">{{ post.shopName || '未关联店铺' }}</div>
                </div>
                <p v-if="mySquarePosts.length === 0" class="profile-empty-tip profile-empty-tip--center">暂无作品</p>
              </div>
            </template>
          </div>
        </template>
      </div>
      <!-- 广场页右下角 + 按钮（固定不随滚动） -->
      <button
        v-if="rightTab === '种草广场' && !showPostModal && !selectedSquarePost"
        type="button"
        class="square-fab square-fab--fixed"
        aria-label="发帖"
        @click="openPostModal"
      >
        <el-icon :size="24"><Plus /></el-icon>
      </button>
      <!-- 底栏 Tab -->
      <div class="recommend-bottom-bar">
        <button
          v-for="t in rightTabs"
          :key="t"
          type="button"
          class="bottom-tab"
          :class="{ active: rightTab === t }"
          @click="onBottomTabClick(t)"
        >
          {{ t }}
        </button>
      </div>
    </aside>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, nextTick, watch, inject } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Search, Close, Aim, ArrowLeft, CaretBottom, Filter, Plus } from '@element-plus/icons-vue'
import AMapLoader from '@amap/amap-jsapi-loader'
import { useUserStore } from '../stores/user'

const currentUniversity = inject('currentUniversity', ref(''))
const openMemberDialog = inject('openMemberDialog', () => {})
const openPreferences = inject('openPreferences', () => {})
const userStore = useUserStore()
const router = useRouter()

const mapRef = ref(null)
const markerPosition = ref(null)
const searchKeyword = ref('')
const searchExpanded = ref(false)
const recommendList = ref([])
const recommendLoading = ref(false)

const rightTabs = ['美食推荐', 'AI发现', '种草广场', '个人中心']
const rightTab = ref('美食推荐')
const selectedRestaurant = ref(null)
/** 推荐页已展示数量，默认 15，加载更多每次 +10 */
const recommendVisibleCount = ref(15)
const recommendLoadMoreLoading = ref(false)
/** 高德周边搜索下一页页码（初始加载 1～4 页，更多从第 5 页起），用于“加载更多”时请求更多且不重复 */
const recommendNextPage = ref(5)
const noMoreFromApi = ref(false)

const aiChatMessagesRef = ref(null)
const aiChatMessages = ref([
  {
    role: 'assistant',
    content: '你好～我是校园美食小助手，可以告诉我你的口味、预算或场景（比如一人食、聚餐、想吃辣），我会为你推荐合适的店铺。',
    recommendedShops: []
  }
])
const aiChatInput = ref('')
const aiChatLoading = ref(false)
const recommendContentRef = ref(null)
/** 详情页返回后恢复滚动：进入详情前保存的滚动位置与目标（列表 / 聊天） */
const scrollTopBeforeDetail = ref(0)
const scrollRestoreTarget = ref('list')
const highlightedItem = ref(null)

/** 广场：瀑布流帖子列表（含示例），每项可含 images[]、likeCount、liked；示例默认无图、不展示标题 */
const squarePosts = ref([
  { id: '1', imageUrl: '', images: [], title: '', authorName: '吃货小王', authorAvatar: '', shopName: '虎头军煎饼(北航沙河校区店)', shopId: null, likeCount: 12, liked: false, content: '煎饼料足，酱香浓郁，北航同学都爱。' },
  { id: '2', imageUrl: '', images: [], title: '', authorName: '小美', authorAvatar: '', shopName: '冒二麻一·麻辣香锅冒菜(沙河店)', shopId: null, likeCount: 8, liked: false, content: '麻辣过瘾，配菜丰富。' },
  { id: '3', imageUrl: '', images: [], title: '', authorName: '美食控', authorAvatar: '', shopName: '北京航空航天大学沙河校区西区食堂', shopId: null, likeCount: 25, liked: false, content: '西区食堂性价比高，种类多。' }
])
/** 当前查看的广场作品详情（用于详情页） */
const selectedSquarePost = ref(null)
/** 详情页当前图片下标（多图左右切换） */
const squarePostImageIndex = ref(0)
/** 详情页评论区（示例数据，按帖子 id 区分） */
const squareDetailComments = ref([])
/** 个人中心二级页：null | preference | feedback | collect | seen | square */
const profileSubPage = ref(null)
/** 收藏的店铺完整列表（用于收藏页展示与地图） */
const favShops = ref([])
/** 看过的店铺完整列表（进入详情页时追加） */
const seenShops = ref([])
/** 反馈记录列表 */
const feedbackRecords = ref([])
const showPostModal = ref(false)
const newPostTitle = ref('')
const newPostContent = ref('')
const newPostImageUrl = ref('')
const newPostShopId = ref('')
const newPostShopName = ref('')
/** 从地图/推荐页选中的店铺，用于发帖 */
const selectedShopForPost = ref(null)
/**  true 时点击推荐页列表或地图蓝钉会将该店铺设为 selectedShopForPost 并回到广场 */
const selectingShopFromMap = ref(false)
const photoInputRef = ref(null)

watch(newPostShopId, (id) => {
  if (!id) {
    selectedShopForPost.value = null
    return
  }
  const shop = sortedAndFilteredList.value.find((s) => s.id === id)
  selectedShopForPost.value = shop ? { ...shop } : null
})

const routeDurations = ref({ walk: null, ride: null, ebike: null })
const routeMode = ref('walk')
const detailTab = ref('特色')
const specialtyDishes = ref([])
const detailTabs = ['特色', '团购', '外卖', '惜食', '评价']
const specialtyDishesExpanded = ref(false)
const SPECIALTY_DISHES_COLLAPSED = 4

const meituanGroupBuyUrl = computed(() => {
  const name = selectedRestaurant.value?.name
  if (!name) return 'https://www.meituan.com/'
  return 'https://www.meituan.com/s/' + encodeURIComponent(name)
})

const douyinGroupBuyUrl = computed(() => {
  const name = selectedRestaurant.value?.name
  if (!name) return 'https://www.douyin.com/'
  return 'https://www.douyin.com/search/' + encodeURIComponent(name + ' 团购') + '?type=general'
})

const xiaohongshuSearchUrl = computed(() => {
  const name = selectedRestaurant.value?.name
  if (!name) return 'https://www.xiaohongshu.com/'
  return 'https://www.xiaohongshu.com/search_result?keyword=' + encodeURIComponent(name)
})
const douyinSearchUrl = computed(() => {
  const name = selectedRestaurant.value?.name
  if (!name) return 'https://www.douyin.com/'
  return 'https://www.douyin.com/search/' + encodeURIComponent(name) + '?type=general'
})
const dianpingSearchUrl = computed(() => {
  const name = selectedRestaurant.value?.name
  if (!name) return 'https://www.dianping.com/'
  return 'https://www.dianping.com/search/keyword/2/0_' + encodeURIComponent(name)
})

const displayedSpecialtyDishes = computed(() => {
  const list = specialtyDishes.value
  if (specialtyDishesExpanded.value || list.length <= SPECIALTY_DISHES_COLLAPSED) return list
  return list.slice(0, SPECIALTY_DISHES_COLLAPSED)
})

const sortOptions = [
  { value: 'smart', label: '智能排序' },
  { value: 'distance', label: '距离优先' },
  { value: 'rating', label: '好评优先' },
  { value: 'price', label: '低价优先' }
]
const sortBy = ref('smart')
/** 筛选弹窗内：人均、距离、餐厅类型（保存前可改） */
const filterPriceRange = ref([0, 300])
const filterDistanceKm = ref(3)
/** 高德 POI type 为「餐饮服务;中餐厅;xxx」，按关键词匹配 */
const restaurantTypeTags = [
  { id: '中餐厅', label: '中餐厅', keywords: ['中餐厅', '中餐'] },
  { id: '西餐厅', label: '西餐厅', keywords: ['西餐厅', '西餐'] },
  { id: '快餐', label: '快餐', keywords: ['快餐'] },
  { id: '咖啡茶饮', label: '咖啡茶饮', keywords: ['咖啡', '茶饮', '饮品'] },
  { id: '火锅', label: '火锅', keywords: ['火锅'] },
  { id: '小吃', label: '小吃', keywords: ['小吃'] },
  { id: '烘焙甜点', label: '烘焙甜点', keywords: ['烘焙', '甜点', '蛋糕'] },
  { id: '其他', label: '其他', keywords: [] }
]
const allTypeTagIds = restaurantTypeTags.map((t) => t.id)
const filterTypeTagIds = ref([...allTypeTagIds])
/** 已保存的筛选（用于列表过滤与请求 radius），默认全选 */
const appliedFilterPrice = ref([0, 300])
const appliedFilterDistanceKm = ref(3)
const appliedFilterTypeTagIds = ref([...allTypeTagIds])
const filterTypeErrorEmphasize = ref(false)

function toggleFilterTypeTag(id) {
  const idx = filterTypeTagIds.value.indexOf(id)
  if (idx >= 0) {
    filterTypeTagIds.value = filterTypeTagIds.value.filter((_, i) => i !== idx)
  } else {
    filterTypeTagIds.value = [...filterTypeTagIds.value, id]
  }
  filterTypeErrorEmphasize.value = false
}

function resetFilter() {
  filterPriceRange.value = [0, 300]
  filterDistanceKm.value = 3
  filterTypeTagIds.value = [...allTypeTagIds]
}

function saveFilter() {
  if (filterTypeTagIds.value.length === 0) {
    filterTypeErrorEmphasize.value = true
    return
  }
  filterTypeErrorEmphasize.value = false
  appliedFilterPrice.value = [...filterPriceRange.value]
  appliedFilterDistanceKm.value = filterDistanceKm.value
  appliedFilterTypeTagIds.value = [...filterTypeTagIds.value]
  loadNearbyRestaurants()
}

function matchPoiByType(item, selectedIds) {
  if (!selectedIds.length) return true
  const typeStr = (item.type || '') + (item.tag || '')
  for (const id of selectedIds) {
    const tag = restaurantTypeTags.find((t) => t.id === id)
    if (!tag) continue
    if (tag.keywords.length === 0) {
      const othersMatch = selectedIds.filter((i) => i !== '其他').some((i) => {
        const t = restaurantTypeTags.find((x) => x.id === i)
        return t && t.keywords.some((k) => typeStr.includes(k))
      })
      if (!othersMatch) return true
    } else if (tag.keywords.some((k) => typeStr.includes(k))) return true
  }
  return false
}

const sortedAndFilteredList = computed(() => {
  const list = recommendList.value
  if (!list.length) return []
  let out = list.slice()
  const current = currentUniversity.value
  try {
    const universities = JSON.parse(import.meta.env.VITE_UNIVERSITIES || '[]')
    const otherNames = universities.filter((u) => u.name && u.name !== current).map((u) => u.name)
    if (otherNames.length) {
      out = out.filter((item) => !item.name || !otherNames.some((name) => item.name.includes(name)))
    }
  } catch (_) {}
  const [minPrice, maxPrice] = appliedFilterPrice.value
  const maxDistM = appliedFilterDistanceKm.value * 1000
  const typeIds = appliedFilterTypeTagIds.value
  out = out.filter((item) => {
    const cost = item.cost != null && typeof item.cost === 'number' ? item.cost : 0
    if (cost < minPrice || cost > maxPrice) return false
    if (item.distance != null && item.distance > maxDistM) return false
    return matchPoiByType(item, typeIds)
  })
  if (sortBy.value === 'smart') {
    out.sort((a, b) => {
      const distKmA = a.distance != null ? Math.max(a.distance / 1000, 0.001) : 1
      const distKmB = b.distance != null ? Math.max(b.distance / 1000, 0.001) : 1
      const ratingA = a.rating != null ? a.rating : 0
      const ratingB = b.rating != null ? b.rating : 0
      const costA = typeof a.cost === 'number' && !Number.isNaN(a.cost) ? a.cost : 999
      const costB = typeof b.cost === 'number' && !Number.isNaN(b.cost) ? b.cost : 999
      const scoreA = (2 / distKmA) * 0.5 + (ratingA / 2.5) * 0.5 + (100 / costA) * 0.2
      const scoreB = (2 / distKmB) * 0.5 + (ratingB / 2.5) * 0.5 + (100 / costB) * 0.2
      return scoreB - scoreA
    })
  } else if (sortBy.value === 'distance') {
    out.sort((a, b) => (a.distance ?? 999999) - (b.distance ?? 999999))
  } else if (sortBy.value === 'rating') {
    out.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0))
  } else if (sortBy.value === 'price') {
    out.sort((a, b) => {
      const ca = typeof a.cost === 'number' && !Number.isNaN(a.cost) ? a.cost : 999999
      const cb = typeof b.cost === 'number' && !Number.isNaN(b.cost) ? b.cost : 999999
      return ca - cb
    })
  }
  return out
})

/** 推荐页当前展示的列表（用于列表渲染与地图蓝钉），最多 recommendVisibleCount 条 */
const recommendListDisplay = computed(() => sortedAndFilteredList.value.slice(0, recommendVisibleCount.value))

/** 已关闭的广告位 key 集合（第5、25、45…项下的广告可关闭） */
const closedAdKeys = ref(new Set())
/** 推荐列表 + 在第5、25、45…项后插入的广告位（被关闭的不展示） */
const recommendListWithAds = computed(() => {
  const list = recommendListDisplay.value
  const closed = closedAdKeys.value
  const result = []
  for (let i = 0; i < list.length; i++) {
    result.push({ type: 'item', index: i, item: list[i] })
    if (i + 1 >= 5 && (i + 1 - 5) % 20 === 0 && !closed.has('ad-' + (i + 1))) {
      result.push({ type: 'ad', adKey: 'ad-' + (i + 1) })
    }
  }
  return result
})
function closeAd(adKey) {
  closedAdKeys.value = new Set([...closedAdKeys.value, adKey])
}

/** 美食推荐列表项推荐理由标签：学生党优选(人均<25)、大众优选(评分>=4.5)、离你最近 */
function getRecommendReasonTags(item) {
  const list = recommendListDisplay.value
  const minDist = list.length ? Math.min(...list.map((i) => (i.distance != null ? i.distance : Infinity))) : Infinity
  const tags = []
  if (item.cost != null && typeof item.cost === 'number' && item.cost < 25) {
    tags.push({ key: 'student', label: '学生党优选', class: 'recommend-item-tag--student' })
  }
  if (item.rating != null && Number(item.rating) >= 4.5) {
    tags.push({ key: 'popular', label: '大众优选', class: 'recommend-item-tag--popular' })
  }
  if (item.distance != null && item.distance === minDist && minDist !== Infinity) {
    tags.push({ key: 'nearest', label: '离你最近', class: 'recommend-item-tag--nearest' })
  }
  return tags
}

const favIds = ref(new Set())
function isFav(item) {
  const id = item?.id ?? item?.name
  return id != null && favIds.value.has(String(id))
}
function onFavClick(item) {
  if (!userStore.userInfo?.id) {
    router.push('/login')
    return
  }
  const id = item?.id ?? item?.name
  if (id == null) return
  const next = new Set(favIds.value)
  if (next.has(String(id))) {
    next.delete(String(id))
    favShops.value = favShops.value.filter((s) => (s?.id ?? s?.name) !== id)
  } else {
    next.add(String(id))
    if (!favShops.value.some((s) => (s?.id ?? s?.name) === id)) favShops.value = [...favShops.value, { ...item }]
  }
  favIds.value = next
}

/** AI 初始对话中展示的智能推荐前 3 家 */
const initialAiRecommendations = computed(() => sortedAndFilteredList.value.slice(0, 3))

/** AI 推荐页地图上要显示的蓝钉列表：取最后一条带推荐的助手消息，否则用初始 3 家 */
const aiMapMarkersList = computed(() => {
  const msgs = aiChatMessages.value
  for (let i = msgs.length - 1; i >= 0; i--) {
    if (msgs[i].role === 'assistant' && msgs[i].recommendedShops && msgs[i].recommendedShops.length) {
      return msgs[i].recommendedShops.slice(0, 5)
    }
  }
  return initialAiRecommendations.value
})

const mapPageRef = ref(null)
const mapWidthPercent = ref(60)
const MIN_MAP = 30
const MAX_MAP = 70

function onResizeStart(e) {
  e.preventDefault()
  const startX = e.clientX
  const startPercent = mapWidthPercent.value

  function onMove(moveE) {
    if (!mapPageRef.value) return
    const rect = mapPageRef.value.getBoundingClientRect()
    const delta = moveE.clientX - startX
    const deltaPercent = (delta / rect.width) * 100
    let next = startPercent + deltaPercent
    next = Math.max(MIN_MAP, Math.min(MAX_MAP, next))
    mapWidthPercent.value = next
  }

  function onUp() {
    document.removeEventListener('mousemove', onMove)
    document.removeEventListener('mouseup', onUp)
    document.body.style.cursor = ''
    document.body.style.userSelect = ''
    if (mapInstance) mapInstance.resize()
  }

  document.body.style.cursor = 'col-resize'
  document.body.style.userSelect = 'none'
  document.addEventListener('mousemove', onMove)
  document.addEventListener('mouseup', onUp)
}


/** 地图实例与标记实例，供搜索跳转使用 */
let mapInstance = null
let markerInstance = null
let geocoderInstance = null
let placeSearchInstance = null
let walkingInstance = null
let ridingInstance = null
let ridingInstanceNoMap = null
let AMapNamespace = null
/** 推荐餐厅在地图上的蓝色序号标记，用于统一清除与 fitView */
let poiMarkers = []
/** 为 true 时本次只更新标记、不执行 setFitView，用于拖动红图钉后保持用户当前比例尺 */
let skipFitViewOnce = false

function formatDistance(m) {
  if (m >= 1000) return (m / 1000).toFixed(1) + ' km'
  return m + ' m'
}

function formatDuration(sec) {
  if (sec == null || sec < 0) return '—'
  if (sec < 60) return sec + '秒'
  return Math.round(sec / 60) + '分钟'
}

/** 去掉【】等符号 */
function stripTagSymbols(str) {
  if (str == null || typeof str !== 'string') return ''
  return str.replace(/[【】\[\]〔〕［］]/g, '').trim()
}

/** 高德 tag 可能是字符串或数组，统一转为展示文案（并去掉【】等符号） */
function formatTag(tag) {
  if (tag == null) return '等待商家上传'
  if (typeof tag === 'string') return stripTagSymbols(tag) || '等待商家上传'
  if (Array.isArray(tag)) return tag.length ? tag.filter(Boolean).map((t) => stripTagSymbols(String(t))).join('、') : '等待商家上传'
  return '等待商家上传'
}

/** 将评分转为 5 个星位：1 满星，0.5 半星（左实右空），0 空星 */
function starFills(rating) {
  if (rating == null || rating < 0) return [0, 0, 0, 0, 0]
  const r = Math.min(5, Math.max(0, Number(rating)))
  const full = Math.floor(r)
  const hasHalf = r - full >= 0.5
  const arr = []
  for (let i = 0; i < full; i++) arr.push(1)
  if (hasHalf) arr.push(0.5)
  while (arr.length < 5) arr.push(0)
  return arr.slice(0, 5)
}

/** 根据营业时间字符串与当前时间判断是否营业中，仅支持当日时间范围如 10:00-22:00 */
function isRestaurantOpen(opentimeStr) {
  if (!opentimeStr || typeof opentimeStr !== 'string') return null
  const match = opentimeStr.match(/(\d{1,2}):(\d{2})\s*[-–到至]\s*(\d{1,2}):(\d{2})/)
  if (!match) return null
  const [, sh, sm, eh, em] = match.map(Number)
  const now = new Date()
  const currentMins = now.getHours() * 60 + now.getMinutes()
  const startMins = sh * 60 + sm
  let endMins = eh * 60 + em
  if (endMins < startMins) endMins += 24 * 60
  const wrap = currentMins < startMins ? currentMins + 24 * 60 : currentMins
  return wrap >= startMins && wrap <= endMins
}

/** 红色倒立水滴图钉（无序号）：与蓝色图钉同造型，仅颜色不同，用于当前定位/可拖动标记 */
function getRedDropDataUrl() {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 28 36" width="28" height="36">
    <path fill="#F56C6C" stroke="#d95454" stroke-width="1.2" d="M14 2C7.4 2 2 7.4 2 14c0 10 12 20 12 20s12-10 12-20C26 7.4 20.6 2 14 2z"/>
    <circle cx="14" cy="12" r="6" fill="#fff"/>
  </svg>`
  return 'data:image/svg+xml,' + encodeURIComponent(svg)
}

/** 蓝色倒立水滴图钉（与序号融合为一）：序号画在图钉顶部圆圈内，一张图即一个标记 */
function getBlueDropWithNumberDataUrl(num) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 28 36" width="28" height="36">
    <path fill="#409EFF" stroke="#3380d9" stroke-width="1.2" d="M14 2C7.4 2 2 7.4 2 14c0 10 12 20 12 20s12-10 12-20C26 7.4 20.6 2 14 2z"/>
    <circle cx="14" cy="12" r="6" fill="#fff"/>
    <text x="14" y="12.5" text-anchor="middle" dominant-baseline="central" fill="#409EFF" font-size="11" font-weight="700" font-family="system-ui,sans-serif">${num}</text>
  </svg>`
  return 'data:image/svg+xml,' + encodeURIComponent(svg)
}

function focusMapOnPoi(item) {
  if (!mapInstance || !item.location) return
  const lng = item.location.lng ?? item.location.getLng?.()
  const lat = item.location.lat ?? item.location.getLat?.()
  if (lng != null && lat != null) {
    mapInstance.setCenter([lng, lat])
    mapInstance.setZoom(17)
  }
}

function openRestaurantDetail(item) {
  if (selectingShopFromMap.value) {
    selectedShopForPost.value = { ...item }
    newPostShopId.value = item.id ?? ''
    rightTab.value = '种草广场'
    selectingShopFromMap.value = false
    return
  }
  if (rightTab.value === '美食推荐') {
    scrollRestoreTarget.value = 'list'
    scrollTopBeforeDetail.value = recommendContentRef.value?.scrollTop ?? 0
  } else {
    scrollRestoreTarget.value = 'chat'
    scrollTopBeforeDetail.value = aiChatMessagesRef.value?.scrollTop ?? 0
  }
  selectedRestaurant.value = { ...item }
  const sid = item?.id ?? item?.name
  if (sid != null && !seenShops.value.some((s) => (s?.id ?? s?.name) === sid)) {
    seenShops.value = [...seenShops.value, { ...item }]
  }
  routeDurations.value = { walk: null, ride: null, ebike: null }
  routeMode.value = 'walk'
  detailTab.value = '特色'
  specialtyDishes.value = []
  specialtyDishesExpanded.value = false
  hideAllMarkers()
  focusMapOnPoi(item)
  nextTick(() => {
    clearAllRoutes()
    drawWalkingRoute(selectedRestaurant.value)
    fetchRideDurations(selectedRestaurant.value)
    fetchSpecialtyDishes(selectedRestaurant.value)
    recommendContentRef.value?.scrollTo({ top: 0, behavior: 'smooth' })
  })
}

function onPoiMarkerClick(item) {
  if (selectingShopFromMap.value) {
    selectedShopForPost.value = { ...item }
    newPostShopId.value = item.id ?? ''
    rightTab.value = '种草广场'
    selectingShopFromMap.value = false
    return
  }
  if (rightTab.value === 'AI发现') {
    openRestaurantDetail(item)
    return
  }
  rightTab.value = '美食推荐'
  selectedRestaurant.value = null
  const list = sortedAndFilteredList.value
  const found = list.some((x) => (x.id && item.id && x.id === item.id) || x === item)
  if (!found) {
    focusMapOnPoi(item)
    return
  }
  highlightedItem.value = item
  nextTick(() => {
    const idx = list.findIndex((x) => (x.id != null && item.id != null && x.id === item.id) || x === item)
    if (idx >= 0) {
      const id = 'list-item-' + String(item.id != null ? item.id : 'i' + idx).replace(/[^a-zA-Z0-9-_.]/g, '_')
      document.getElementById(id)?.scrollIntoView({ block: 'start', behavior: 'smooth' })
    }
    setTimeout(() => {
      highlightedItem.value = null
    }, 2000)
  })
}

function openPostModal() {
  showPostModal.value = true
  newPostTitle.value = ''
  newPostContent.value = ''
  newPostImageUrl.value = ''
  newPostShopId.value = selectedShopForPost.value?.id ?? ''
  newPostShopName.value = selectedShopForPost.value?.name ?? ''
  if (!selectedShopForPost.value && newPostShopId.value) {
    const shop = sortedAndFilteredList.value.find((s) => s.id === newPostShopId.value)
    selectedShopForPost.value = shop ? { ...shop } : null
    if (shop) newPostShopName.value = shop.name ?? ''
  }
}
function closePostModal() {
  showPostModal.value = false
  selectingShopFromMap.value = false
}
function triggerPhotoInput() {
  photoInputRef.value?.click()
}
function onPostPhotoChange(e) {
  const file = e.target?.files?.[0]
  if (!file || !file.type.startsWith('image/')) return
  const url = URL.createObjectURL(file)
  newPostImageUrl.value = url
}
function selectShopFromMap() {
  selectingShopFromMap.value = true
  rightTab.value = '美食推荐'
  selectedRestaurant.value = null
  updatePoiMarkersForCurrentTab()
}
function publishPost() {
  const title = (newPostTitle.value || '无标题').trim()
  const shopName = (newPostShopName.value || '').trim() || (selectedShopForPost.value?.name ?? '')
  const shopId = selectedShopForPost.value?.id ?? null
  const imgUrl = newPostImageUrl.value || ''
  squarePosts.value = [
    {
      id: String(Date.now()),
      imageUrl: imgUrl,
      images: imgUrl ? [imgUrl, imgUrl, imgUrl, imgUrl] : [],
      title: title.slice(0, 50),
      content: (newPostContent.value || '').trim(),
      authorName: '我',
      authorAvatar: '',
      shopName,
      shopId,
      likeCount: 0,
      liked: false
    },
    ...squarePosts.value
  ]
  closePostModal()
  newPostTitle.value = ''
  newPostContent.value = ''
  newPostImageUrl.value = ''
  newPostShopId.value = ''
  newPostShopName.value = ''
  selectedShopForPost.value = null
}
function parseGeocodeLocation(geo) {
  if (!geo?.location) return { lng: null, lat: null }
  const loc = geo.location
  if (typeof loc === 'object' && loc.lng != null && loc.lat != null) return { lng: loc.lng, lat: loc.lat }
  if (typeof loc === 'string') {
    const parts = loc.split(',')
    if (parts.length >= 2) return { lng: parseFloat(parts[0]), lat: parseFloat(parts[1]) }
  }
  return { lng: null, lat: null }
}

function drawSquareDetailWalkingRoute(endLng, endLat) {
  if (endLng == null || endLat == null || !markerPosition.value || !walkingInstance || !mapInstance || !AMapNamespace) return
  const start = [markerPosition.value.lng, markerPosition.value.lat]
  const end = [endLng, endLat]
  clearRidingRoute()
  walkingInstance.search(start, end, (walkStatus, walkResult) => {
    try {
      if (walkStatus === 'complete' && walkResult?.routes?.length && mapInstance && AMapNamespace) {
        const bounds = new AMapNamespace.Bounds(
          new AMapNamespace.LngLat(Math.min(start[0], end[0]), Math.min(start[1], end[1])),
          new AMapNamespace.LngLat(Math.max(start[0], end[0]), Math.max(start[1], end[1]))
        )
        mapInstance.setBounds(bounds, 80)
      }
    } catch (_) {}
  })
}

function openSquarePostDetail(post) {
  selectedSquarePost.value = post
  squarePostImageIndex.value = 0
  clearAllRoutes()
  const shopName = (post.shopName || '').trim()
  if (!shopName || !markerPosition.value || (!geocoderInstance && !placeSearchInstance)) return

  const tryDrawRoute = (lng, lat) => {
    if (lng != null && lat != null) drawSquareDetailWalkingRoute(lng, lat)
  }

  if (geocoderInstance) {
    geocoderInstance.getLocation(shopName, (status, result) => {
      if (status === 'complete' && result?.info === 'OK' && result.geocodes?.length) {
        const { lng, lat } = parseGeocodeLocation(result.geocodes[0])
        tryDrawRoute(lng, lat)
        return
      }
      if (placeSearchInstance) {
        if (typeof placeSearchInstance.setCity === 'function') placeSearchInstance.setCity('北京')
        placeSearchInstance.search(shopName, (psStatus, psResult) => {
          if (psStatus === 'complete' && psResult?.poiList?.pois?.length) {
            const poi = psResult.poiList.pois[0]
            const loc = poi.location
            let lng = null, lat = null
            if (loc && typeof loc.getLng === 'function') {
              lng = loc.getLng()
              lat = loc.getLat()
            } else if (loc && (loc.lng != null || loc.lat != null)) {
              lng = loc.lng
              lat = loc.lat
            }
            tryDrawRoute(lng, lat)
          }
        })
      }
    })
  } else if (placeSearchInstance) {
    if (typeof placeSearchInstance.setCity === 'function') placeSearchInstance.setCity('北京')
    placeSearchInstance.search(shopName, (psStatus, psResult) => {
      if (psStatus === 'complete' && psResult?.poiList?.pois?.length) {
        const poi = psResult.poiList.pois[0]
        const loc = poi.location
        let lng = null, lat = null
        if (loc && typeof loc.getLng === 'function') {
          lng = loc.getLng()
          lat = loc.getLat()
        } else if (loc && (loc.lng != null || loc.lat != null)) {
          lng = loc.lng
          lat = loc.lat
        }
        tryDrawRoute(lng, lat)
      }
    })
  }
}

function closeSquareDetail() {
  selectedSquarePost.value = null
  squarePostImageIndex.value = 0
  clearAllRoutes()
}

function togglePostLike(post) {
  if (post.liked === true) {
    post.liked = false
    post.likeCount = Math.max(0, (post.likeCount ?? 0) - 1)
  } else {
    post.liked = true
    post.likeCount = (post.likeCount ?? 0) + 1
  }
}

function confirmDeletePost(post) {
  if (!post || post.authorName !== '我') return
  if (!confirm('确定要删除这篇笔记吗？')) return
  squarePosts.value = squarePosts.value.filter((p) => p.id !== post.id)
  closeSquareDetail()
  ElMessage.success('已删除')
}

const profileDisplayName = computed(() => {
  const u = userStore.userInfo
  if (!u?.id) return '未登录'
  return u.id || u.university || '学生用户'
})
const profileMemberBadge = computed(() => {
  const u = userStore.userInfo
  if (!u?.id) return '未登录'
  return u.isAuthenticated ? '已认证' : '免费计划'
})
const isPaidMember = computed(() => !!userStore.userInfo?.isAuthenticated)

const preferenceBudget = ref([0, 100])
const preferenceTasteStr = ref('')
const preferenceTaboosStr = ref('')
const feedbackTab = ref('faq')
const feedbackInput = ref('')

const mySquarePosts = computed(() => squarePosts.value.filter((p) => p.authorName === '我'))

const SQUARE_DETAIL_PLACEHOLDER = 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300"><rect fill="%23f0f0f0" width="400" height="300"/><text x="50%" y="50%" fill="%23909399" font-size="14" text-anchor="middle" dy=".3em">暂无图片</text></svg>')

const squareDetailImages = computed(() => {
  const post = selectedSquarePost.value
  if (!post) return []
  const list = post.images && post.images.length ? post.images : (post.imageUrl ? [post.imageUrl] : [])
  const filtered = list.filter(Boolean)
  if (filtered.length === 0) return [SQUARE_DETAIL_PLACEHOLDER, SQUARE_DETAIL_PLACEHOLDER, SQUARE_DETAIL_PLACEHOLDER, SQUARE_DETAIL_PLACEHOLDER]
  return filtered
})

watch(profileSubPage, (page) => {
  if (page === 'preference') {
    const p = userStore.userInfo?.preferences
    preferenceBudget.value = p?.budget ? [...p.budget] : [0, 100]
    preferenceTasteStr.value = (p?.taste && Array.isArray(p.taste) ? p.taste : []).join('、')
    preferenceTaboosStr.value = (p?.taboos && Array.isArray(p.taboos) ? p.taboos : []).join('、')
  }
  if (page === 'collect' || page === 'seen') nextTick(() => updatePoiMarkersForCurrentTab())
})

function onBottomTabClick(t) {
  if (t === '个人中心' && !userStore.userInfo?.id) {
    router.push('/login')
    return
  }
  rightTab.value = t
}

function onProfileNav(which) {
  if (!userStore.userInfo?.id) {
    router.push('/login')
    return
  }
  if (which === 'member') openMemberDialog()
  if (which === 'preference') {
    profileSubPage.value = 'preference'
  }
  if (which === 'feedback') profileSubPage.value = 'feedback'
  if (which === 'collect') profileSubPage.value = 'collect'
  if (which === 'seen') profileSubPage.value = 'seen'
  if (which === 'square') profileSubPage.value = 'square'
}

function savePreferenceFromProfile() {
  const taste = preferenceTasteStr.value.split(/[、,，\s]+/).map((s) => s.trim()).filter(Boolean)
  const taboos = preferenceTaboosStr.value.split(/[、,，\s]+/).map((s) => s.trim()).filter(Boolean)
  userStore.updatePreferences({ budget: [...preferenceBudget.value], taste, taboos })
  ElMessage.success('已保存')
  profileSubPage.value = null
}

function submitFeedback() {
  const content = feedbackInput.value.trim()
  if (!content) return
  feedbackRecords.value = [{ content, time: new Date().toLocaleString('zh-CN') }, ...feedbackRecords.value]
  feedbackInput.value = ''
  ElMessage.success('反馈已提交')
}

function openMemberFromProfile() {
  if (!userStore.userInfo?.id) {
    router.push('/login')
    return
  }
  openMemberDialog()
}

async function sendAiChat() {
  const text = aiChatInput.value.trim()
  if (!text || aiChatLoading.value) return
  const history = aiChatMessages.value.slice(-10).map((m) => ({ role: m.role, content: m.content }))
  aiChatMessages.value.push({ role: 'user', content: text, recommendedShops: [] })
  aiChatInput.value = ''
  aiChatLoading.value = true
  nextTick(() => scrollAiChatToBottom())
  const apiUrl = import.meta.env.VITE_AI_API
  const nearbyRestaurants = sortedAndFilteredList.value.slice(0, 100)
  const payload = {
    message: text,
    history,
    university: currentUniversity.value,
    nearbyRestaurants,
    stream: false
  }
  try {
    const res = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
    if (!res.ok) throw new Error(res.statusText)
    const data = await res.json().catch(() => ({}))
    const reply = data.reply || '暂时无法生成推荐，请稍后再试。'
    const recommendedShops = Array.isArray(data.recommendedShops) ? data.recommendedShops : []
    aiChatMessages.value.push({ role: 'assistant', content: reply, recommendedShops })
  } catch (e) {
    console.warn('AI推荐请求失败', e)
    aiChatMessages.value.push({
      role: 'assistant',
      content: '网络异常，请检查是否已启动后端服务（npm run dev 或 node server.js）后重试。',
      recommendedShops: []
    })
  }
  aiChatLoading.value = false
  nextTick(() => scrollAiChatToBottom())
}

function scrollAiChatToBottom() {
  const el = aiChatMessagesRef.value
  if (el) el.scrollTop = el.scrollHeight
}

async function loadMoreRecommend() {
  if (recommendLoadMoreLoading.value) return
  const total = sortedAndFilteredList.value.length
  if (total > recommendVisibleCount.value) {
    recommendLoadMoreLoading.value = true
    const start = Date.now()
    recommendVisibleCount.value = Math.min(recommendVisibleCount.value + 10, total)
    nextTick(() => updatePoiMarkersForCurrentTab())
    await new Promise((r) => setTimeout(r, Math.max(0, 500 - (Date.now() - start))))
    recommendLoadMoreLoading.value = false
    return
  }
  if (noMoreFromApi.value) return
  recommendLoadMoreLoading.value = true
  const start = Date.now()
  await fetchMoreNearbyRestaurants()
  const totalAfter = sortedAndFilteredList.value.length
  if (totalAfter > recommendVisibleCount.value) {
    recommendVisibleCount.value = Math.min(recommendVisibleCount.value + 10, totalAfter)
  }
  nextTick(() => updatePoiMarkersForCurrentTab())
  await new Promise((r) => setTimeout(r, Math.max(0, 500 - (Date.now() - start))))
  recommendLoadMoreLoading.value = false
}

function clearWalkingRoute() {
  try {
    if (walkingInstance && typeof walkingInstance.clear === 'function') {
      walkingInstance.clear()
    }
  } catch (_) {}
}

function clearRidingRoute() {
  try {
    if (ridingInstance && typeof ridingInstance.clear === 'function') {
      ridingInstance.clear()
    }
  } catch (_) {}
}

function clearAllRoutes() {
  clearWalkingRoute()
  clearRidingRoute()
}

/** 隐藏地图上所有图钉（红点 + 蓝色餐厅序号），用于显示步行路线时减少重叠 */
function hideAllMarkers() {
  try {
    if (markerInstance && typeof markerInstance.hide === 'function') markerInstance.hide()
    poiMarkers.forEach((m) => {
      try {
        if (m && typeof m.hide === 'function') m.hide()
      } catch (_) {}
    })
  } catch (_) {}
}

/** 显示地图上所有图钉 */
function showAllMarkers() {
  try {
    if (markerInstance && typeof markerInstance.show === 'function') markerInstance.show()
    poiMarkers.forEach((m) => {
      try {
        if (m && typeof m.show === 'function') m.show()
      } catch (_) {}
    })
  } catch (_) {}
}

function getRouteStartEnd(item) {
  if (!markerPosition.value || !item?.location) return null
  const endLng = item.location.lng ?? item.location.getLng?.()
  const endLat = item.location.lat ?? item.location.getLat?.()
  if (endLng == null || endLat == null) return null
  return {
    start: [markerPosition.value.lng, markerPosition.value.lat],
    end: [endLng, endLat]
  }
}

function drawWalkingRoute(item) {
  const se = getRouteStartEnd(item)
  if (!se || !walkingInstance || !mapInstance || !AMapNamespace) return
  clearRidingRoute()
  walkingInstance.search(se.start, se.end, (status, result) => {
    try {
      if (status === 'complete' && result?.routes?.length && mapInstance && AMapNamespace) {
        const route = result.routes[0]
        const walkSec = route.duration != null ? route.duration : route.time
        if (walkSec != null) routeDurations.value = { ...routeDurations.value, walk: walkSec }
        const [s0, s1] = se.start
        const [e0, e1] = se.end
        const bounds = new AMapNamespace.Bounds(
          new AMapNamespace.LngLat(Math.min(s0, e0), Math.min(s1, e1)),
          new AMapNamespace.LngLat(Math.max(s0, e0), Math.max(s1, e1))
        )
        mapInstance.setBounds(bounds, 80)
      }
    } catch (err) {
      console.warn('步行路线展示失败', err)
    }
  })
}

function drawRidingRoute(item) {
  const se = getRouteStartEnd(item)
  if (!se || !ridingInstance || !mapInstance || !AMapNamespace) return
  clearWalkingRoute()
  ridingInstance.search(se.start, se.end, (status, result) => {
    try {
      if (status === 'complete' && result?.routes?.length && mapInstance && AMapNamespace) {
        const route = result.routes[0]
        const rideSec = route.duration != null ? route.duration : route.time
        if (rideSec != null) routeDurations.value = { ...routeDurations.value, ride: rideSec, ebike: rideSec }
        const [s0, s1] = se.start
        const [e0, e1] = se.end
        const bounds = new AMapNamespace.Bounds(
          new AMapNamespace.LngLat(Math.min(s0, e0), Math.min(s1, e1)),
          new AMapNamespace.LngLat(Math.max(s0, e0), Math.max(s1, e1))
        )
        mapInstance.setBounds(bounds, 80)
      }
    } catch (err) {
      console.warn('骑行路线展示失败', err)
    }
  })
}

function switchRouteMode(mode) {
  routeMode.value = mode
  const item = selectedRestaurant.value
  if (!item) return
  clearAllRoutes()
  if (mode === 'walk') {
    drawWalkingRoute(item)
  } else {
    drawRidingRoute(item)
  }
}

function fetchRideDurations(item) {
  const se = getRouteStartEnd(item)
  if (!se || !ridingInstanceNoMap) return
  ridingInstanceNoMap.search(se.start, se.end, (status, result) => {
    try {
      if (status === 'complete' && result?.routes?.length) {
        const route = result.routes[0]
        const rideSec = route.duration != null ? route.duration : route.time
        if (rideSec != null) routeDurations.value = { ...routeDurations.value, ride: rideSec, ebike: rideSec }
      }
    } catch (_) {}
  })
}

/** 解析 tag 为菜品名数组（高德 tag 可能为字符串或数组） */
function parseTagToDishNames(tag) {
  if (tag == null) return []
  if (Array.isArray(tag)) return tag.filter((t) => t && String(t).trim()).map((t) => String(t).trim())
  const s = String(tag).trim()
  if (!s) return []
  return s.split(/[,，、;；\s]+/).map((t) => t.trim()).filter(Boolean)
}

/** 拉取 POI 详情并生成特色菜列表（名称来自 tag，图片来自 POI photos，价格无则兜底） */
async function fetchSpecialtyDishes(item) {
  if (!item) return
  const webKey = import.meta.env.VITE_AMAP_WEB_KEY
  if (!item.id || !webKey) {
    const names = parseTagToDishNames(item.tag)
    specialtyDishes.value = names.map((name) => ({ name, image: null, price: null }))
    return
  }
  try {
    const url = `https://restapi.amap.com/v5/place/detail?key=${encodeURIComponent(webKey)}&id=${encodeURIComponent(item.id)}&show_fields=photos,business`
    const res = await fetch(url)
    const data = await res.json()
    let names = []
    let firstPhotoUrl = null
    if (data.status === '1' && data.pois?.poi) {
      const poi = Array.isArray(data.pois.poi) ? data.pois.poi[0] : data.pois.poi
      if (poi) {
        names = parseTagToDishNames(poi.tag ?? item.tag)
        const photos = poi.photos?.photo ?? poi.photos
        const photoList = Array.isArray(photos) ? photos : photos ? [photos] : []
        firstPhotoUrl = photoList[0]?.url ?? null
      }
    }
    if (!names.length) names = parseTagToDishNames(item.tag)
    specialtyDishes.value = names.map((name) => ({ name, image: firstPhotoUrl, price: null }))
  } catch (e) {
    console.warn('特色菜拉取失败', e)
    specialtyDishes.value = parseTagToDishNames(item.tag).map((name) => ({ name, image: null, price: null }))
  }
}

/** 根据传入的列表在地图上绘制蓝色水滴标记；空数组则只清除不绘制。用于推荐页（展示条数）与 AI 推荐页（AI 推荐店） */
function updatePoiMarkersOnMap(list) {
  if (!mapInstance || !AMapNamespace) return
  poiMarkers.forEach((m) => {
    try {
      if (m.remove) m.remove()
      else if (mapInstance.remove) mapInstance.remove(m)
    } catch (_) {}
  })
  poiMarkers = []

  const listToUse = Array.isArray(list) ? list : []
  if (!listToUse.length) return

  listToUse.forEach((item, index) => {
    const lng = item.location?.lng ?? item.location?.getLng?.()
    const lat = item.location?.lat ?? item.location?.getLat?.()
    if (lng == null || lat == null) return
    const pos = [lng, lat]
    const num = index + 1
    const icon = new AMapNamespace.Icon({
      size: new AMapNamespace.Size(28, 36),
      image: getBlueDropWithNumberDataUrl(num),
      imageSize: new AMapNamespace.Size(28, 36)
    })
    const m = new AMapNamespace.Marker({
      position: pos,
      icon,
      title: item.name
    })
    m.on('click', () => onPoiMarkerClick(item))
    m.addTo(mapInstance)
    poiMarkers.push(m)
  })

  const overlays = [markerInstance, ...poiMarkers].filter(Boolean)
  if (overlays.length && !skipFitViewOnce) {
    try {
      mapInstance.setFitView(overlays, 60)
    } catch (_) {}
  }
  if (skipFitViewOnce) skipFitViewOnce = false
}

/** 按当前 tab 更新地图蓝钉：推荐页用 recommendListDisplay，AI 推荐页用 aiMapMarkersList，路线/广场则清除 */
function updatePoiMarkersForCurrentTab() {
  if (rightTab.value === '美食推荐') {
    updatePoiMarkersOnMap(recommendListDisplay.value)
  } else if (rightTab.value === 'AI发现') {
    updatePoiMarkersOnMap([])
  } else if (rightTab.value === '个人中心' && profileSubPage.value === 'collect') {
    updatePoiMarkersOnMap(favShops.value)
  } else if (rightTab.value === '个人中心' && profileSubPage.value === 'seen') {
    updatePoiMarkersOnMap(seenShops.value)
  } else {
    updatePoiMarkersOnMap([])
  }
}

const AMAP_WEB_BASE = 'https://restapi.amap.com'

/** 人均仅当为有效数字时返回数字，否则返回 null（避免高德返回 [] 等导致页面上显示异常） */
function normalizeCost(cost) {
  if (cost == null) return null
  if (Array.isArray(cost)) return null
  const n = Number(cost)
  if (Number.isNaN(n) || !Number.isFinite(n) || n < 0) return null
  return n
}

/** 高德 Web 服务 API 返回的 POI 转为列表项（含图片、评分、人均；location 为字符串 "lng,lat"） */
function mapWebPoiToItem(p, i) {
  const photos = p.photos || p.images || []
  const firstPhoto = Array.isArray(photos) ? photos[0] : null
  const picUrl = firstPhoto && firstPhoto.url ? firstPhoto.url : null
  const biz = p.biz_ext || p.bizExt || {}
  const rating = biz.rating != null ? biz.rating : null
  const cost = normalizeCost(biz.cost)
  const locStr = p.location || ''
  const [lngStr, latStr] = locStr.split(',')
  const lng = lngStr != null ? parseFloat(lngStr) : null
  const lat = latStr != null ? parseFloat(latStr) : null
  const opentime = p.opentime || p.opentime_week || p.opentime_today || (p.biz_ext && (p.biz_ext.opentime || p.biz_ext.opentime_week)) || null
  return {
    id: p.id || 'poi-' + i,
    name: p.name,
    address: p.address,
    pname: p.pname || '',
    cityname: p.cityname || '',
    adname: p.adname || '',
    location: lng != null && lat != null ? { lng, lat } : null,
    distance: p.distance != null ? parseInt(p.distance, 10) : null,
    picUrl,
    rating,
    cost,
    tel: p.tel || null,
    tag: p.tag || null,
    type: p.type || null,
    opentime: opentime || null
  }
}

/** 使用高德 Web 服务：周边搜索 + 可选详情补全 */
async function loadNearbyRestaurants() {
  if (!mapInstance || !markerPosition.value) return
  const webKey = import.meta.env.VITE_AMAP_WEB_KEY
  if (!webKey) {
    ElMessage.warning('未配置 VITE_AMAP_WEB_KEY，无法加载推荐')
    return
  }
  const { lng, lat } = markerPosition.value
  recommendLoading.value = true
  recommendList.value = []
  recommendNextPage.value = 5
  noMoreFromApi.value = false

  const radiusM = Math.round((appliedFilterDistanceKm.value || 3) * 1000)
  const radius = Math.min(50000, Math.max(500, radiusM))
  try {
    const allPois = []
    for (let page = 1; page <= 4; page++) {
      const url = `${AMAP_WEB_BASE}/v3/place/around?key=${encodeURIComponent(webKey)}&location=${lng},${lat}&types=050000&radius=${radius}&extensions=all&offset=25&page=${page}`
      const res = await fetch(url)
      const data = await res.json()
      if (data.status !== '1' || !data.pois || !data.pois.length) break
      const seen = new Set(allPois.map((p) => p.id))
      for (const p of data.pois) {
        if (p.id && !seen.has(p.id)) {
          seen.add(p.id)
          allPois.push(p)
        } else if (!p.id) {
          allPois.push(p)
        }
      }
      if (data.pois.length < 25) break
    }
    if (allPois.length > 0) {
      recommendList.value = allPois.map((p, i) => mapWebPoiToItem(p, i)).slice(0, 100)
      recommendVisibleCount.value = 15
      recommendLoading.value = false
      return
    }
  } catch (e) {
    console.warn('周边搜索失败', e)
    recommendLoading.value = false
  }

  if (!geocoderInstance) {
    recommendLoading.value = false
    return
  }
  geocoderInstance.getAddress([lng, lat], async (status, result) => {
    if (status !== 'complete' || !result?.regeocode?.addressComponent) {
      recommendLoading.value = false
      return
    }
    const comp = result.regeocode.addressComponent
    const city = comp.city || comp.province || comp.district || '北京'
    try {
      const url = `${AMAP_WEB_BASE}/v3/place/text?key=${encodeURIComponent(webKey)}&types=050000&city=${encodeURIComponent(city)}&citylimit=true&extensions=all&offset=25&page=1`
      const res = await fetch(url)
      const data = await res.json()
      recommendLoading.value = false
      noMoreFromApi.value = true
      if (data.status === '1' && data.pois && data.pois.length > 0) {
        recommendList.value = data.pois.slice(0, 100).map((p, i) => mapWebPoiToItem(p, i))
        recommendVisibleCount.value = 15
      }
    } catch (e) {
      console.warn('城市搜索失败', e)
      recommendLoading.value = false
    }
  })
}

/** 从高德请求更多页（与已加载不重复），追加到 recommendList */
async function fetchMoreNearbyRestaurants() {
  const webKey = import.meta.env.VITE_AMAP_WEB_KEY
  if (!webKey || !markerPosition.value) return
  const { lng, lat } = markerPosition.value
  const radiusM = Math.round((appliedFilterDistanceKm.value || 3) * 1000)
  const radius = Math.min(50000, Math.max(500, radiusM))
  const existingIds = new Set(recommendList.value.map((p) => p.id))
  const startPage = recommendNextPage.value
  const toAdd = []
  for (let page = startPage; page <= startPage + 3; page++) {
    const url = `${AMAP_WEB_BASE}/v3/place/around?key=${encodeURIComponent(webKey)}&location=${lng},${lat}&types=050000&radius=${radius}&extensions=all&offset=25&page=${page}`
    const res = await fetch(url)
    const data = await res.json()
    if (data.status !== '1' || !data.pois || !data.pois.length) {
      noMoreFromApi.value = true
      break
    }
    for (const p of data.pois) {
      if (p.id && !existingIds.has(p.id)) {
        existingIds.add(p.id)
        toAdd.push(mapWebPoiToItem(p, recommendList.value.length + toAdd.length))
      }
    }
    recommendNextPage.value = page + 1
    if (data.pois.length < 25) {
      noMoreFromApi.value = true
      break
    }
  }
  if (toAdd.length) {
    recommendList.value = [...recommendList.value, ...toAdd]
    ElMessage.success(`已加载更多 ${toAdd.length} 家`)
  }
  if (toAdd.length === 0 && startPage === recommendNextPage.value) noMoreFromApi.value = true
}

const doGetLocation = () => {
  const options = {
    enableHighAccuracy: false,
    timeout: 15000,
    maximumAge: 0
  }
  navigator.geolocation.getCurrentPosition(
    (position) => {
      const lng = position.coords.longitude
      const lat = position.coords.latitude
      const positionArr = [lng, lat]
      markerInstance.setPosition(positionArr)
      mapInstance.setCenter(positionArr)
      markerPosition.value = { lng, lat }
      loadNearbyRestaurants()
      ElMessage.success('已定位到当前位置')
    },
    (err) => {
      const msg =
        err.code === 1
          ? '未授权定位权限，请在浏览器或系统设置中允许位置访问'
          : err.code === 2
            ? '位置不可用，请检查设备定位是否开启'
            : err.code === 3
              ? '定位超时，请检查网络后重试'
              : '无法获取位置，请使用 localhost 或 HTTPS 访问后重试'
      ElMessage.error(msg)
    },
    options
  )
}

const goToMyLocation = async () => {
  if (!navigator.geolocation) {
    ElMessage.warning('当前浏览器不支持定位')
    return
  }
  if (!mapInstance || !markerInstance) {
    ElMessage.warning('地图未就绪，请稍后再试')
    return
  }
  if (!window.isSecureContext) {
    ElMessage.warning('定位需要在安全环境（HTTPS 或 localhost）下使用，请用 localhost 访问')
    return
  }

  const permissionTip =
    '正在请求定位权限，请留意浏览器地址栏左侧或标签页内的权限弹窗，点击「允许」'

  if (navigator.permissions && navigator.permissions.query) {
    try {
      const status = await navigator.permissions.query({ name: 'geolocation' })
      if (status.state === 'denied') {
        ElMessage.warning({
          message: '当前网站已被禁止使用位置信息。请点击地址栏左侧的锁/信息图标 → 网站设置 → 位置 → 改为「允许」，然后刷新页面再试。',
          duration: 6000,
          showClose: true
        })
        return
      }
      if (status.state === 'prompt') {
        ElMessage.info({ message: permissionTip, duration: 5000 })
      }
    } catch {
      ElMessage.info({ message: permissionTip, duration: 5000 })
    }
  } else {
    ElMessage.info({ message: permissionTip, duration: 5000 })
  }

  ElMessage.info('正在获取位置…')
  doGetLocation()
}

const onSearch = () => {
  const keyword = searchKeyword.value.trim()
  if (!keyword) return
  if (!geocoderInstance || !mapInstance || !markerInstance) {
    ElMessage.warning('地图未就绪，请稍后再试')
    return
  }
  geocoderInstance.getLocation(keyword, (status, result) => {
    if (status === 'complete' && result.info === 'OK' && result.geocodes?.length) {
      const geo = result.geocodes[0]
      const lng = geo.location?.lng
      const lat = geo.location?.lat
      if (lng != null && lat != null) {
        const position = [lng, lat]
        markerInstance.setPosition(position)
        mapInstance.setCenter(position)
        markerPosition.value = { lng, lat }
        loadNearbyRestaurants()
        ElMessage.success('已定位到：' + (geo.formattedAddress || keyword))
      } else {
        ElMessage.error('未解析到坐标')
      }
    } else {
      ElMessage.error('未找到该位置，请换一个关键词试试')
    }
  })
}

onMounted(async () => {
  try {
    await nextTick()
    if (!mapRef.value) {
      console.error('地图容器未就绪')
      ElMessage.error('地图容器未就绪，请刷新重试')
      return
    }

    const key = import.meta.env.VITE_AMAP_KEY
    const securityJsCode = import.meta.env.VITE_AMAP_SECURITY_CODE

    if (securityJsCode) {
      window._AMapSecurityConfig = { securityJsCode }
    }

    const AMap = await AMapLoader.load({
      key,
      securityJsCode,
      version: '2.0',
      plugins: ['AMap.Scale', 'AMap.ToolBar', 'AMap.Geocoder', 'AMap.PlaceSearch', 'AMap.Walking', 'AMap.Riding']
    })

    if (!mapRef.value) return

    AMapNamespace = AMap

    const universities = JSON.parse(import.meta.env.VITE_UNIVERSITIES || '[]')
    const defaultCenterLngLat = [116.270541, 40.15354]
    const defaultCenter = universities.length
      ? universities[0].center.split(',').map(Number)
      : defaultCenterLngLat

    const map = new AMap.Map(mapRef.value, {
      zoom: 15,
      center: defaultCenter
    })
    mapInstance = map

    map.addControl(new AMap.Scale())
    map.addControl(new AMap.ToolBar())

    geocoderInstance = new AMap.Geocoder({ city: '全国' })
    placeSearchInstance = new AMap.PlaceSearch({ pageSize: 20, pageIndex: 1 })
    try {
      if (typeof AMap.Walking === 'function') {
        walkingInstance = new AMap.Walking({ map })
      }
    } catch (err) {
      console.warn('步行路线插件初始化失败', err)
      walkingInstance = null
    }
    try {
      if (typeof AMap.Riding === 'function') {
        ridingInstance = new AMap.Riding({ map })
        ridingInstanceNoMap = new AMap.Riding()
      }
    } catch (err) {
      console.warn('骑行路线插件初始化失败', err)
      ridingInstance = null
      ridingInstanceNoMap = null
    }
    const redDropIcon = new AMap.Icon({
      size: new AMap.Size(28, 36),
      image: getRedDropDataUrl(),
      imageSize: new AMap.Size(28, 36)
    })
    const marker = new AMap.Marker({
      position: defaultCenter,
      icon: redDropIcon,
      draggable: true,
      title: '拖动可更改位置'
    })
    markerInstance = marker

    marker.on('dragend', () => {
      const pos = marker.getPosition()
      const lng = pos.getLng()
      const lat = pos.getLat()
      markerPosition.value = { lng, lat }
      mapInstance.setCenter([lng, lat])
      skipFitViewOnce = true
      loadNearbyRestaurants()
      ElMessage.success(`位置已更新：${lng.toFixed(6)}, ${lat.toFixed(6)}`)
    })

    marker.addTo(map)
    markerPosition.value = {
      lng: defaultCenter[0],
      lat: defaultCenter[1]
    }

    loadNearbyRestaurants()

    watch(
      [sortedAndFilteredList, recommendVisibleCount, rightTab, aiMapMarkersList],
      () => {
        if (selectedRestaurant.value) return
        updatePoiMarkersForCurrentTab()
      },
      { deep: true }
    )
    watch(rightTab, (tab) => {
      if (selectedRestaurant.value) return
      updatePoiMarkersForCurrentTab()
      if (tab === 'AI发现') nextTick(() => scrollAiChatToBottom())
    })

    watch(selectedRestaurant, (val) => {
      if (!val) {
        clearAllRoutes()
        showAllMarkers()
        nextTick(() => {
          if (scrollRestoreTarget.value === 'list' && recommendContentRef.value) {
            recommendContentRef.value.scrollTop = scrollTopBeforeDetail.value
          } else if (scrollRestoreTarget.value === 'chat' && aiChatMessagesRef.value) {
            aiChatMessagesRef.value.scrollTop = scrollTopBeforeDetail.value
          }
        })
      }
    })

    watch(
      currentUniversity,
      (name) => {
        if (!mapInstance || !markerInstance || !name) return
        const universities = JSON.parse(import.meta.env.VITE_UNIVERSITIES || '[]')
        const uni = universities.find((u) => u.name === name)
        if (!uni?.center) return
        const center = uni.center.split(',').map(Number)
        mapInstance.setCenter(center)
        markerInstance.setPosition(center)
        markerPosition.value = { lng: center[0], lat: center[1] }
        loadNearbyRestaurants()
      },
      { immediate: false }
    )
  } catch (e) {
    console.error('地图加载失败:', e)
    ElMessage.error('地图加载失败：请检查高德 Key/安全码/域名白名单')
  }
})

// 避免未捕获异常被 Vite 客户端报成 Script error
if (typeof window !== 'undefined') {
  window.addEventListener('unhandledrejection', (event) => {
    console.warn('[unhandledrejection]', event.reason)
  })
}
</script>

<style scoped>
.map-page {
  display: flex;
  width: 100%;
  height: 100%;
  min-height: 0;
}

.map-wrapper {
  position: relative;
  min-width: 0;
  min-height: 0;
}

.resize-handle {
  flex: 0 0 6px;
  min-width: 6px;
  cursor: col-resize;
  background: #e8eaed;
  transition: background 0.15s;
}

.resize-handle:hover {
  background: #409eff;
}

.map-container {
  width: 100%;
  height: 100%;
}

.map-search-overlay {
  position: absolute;
  top: 12px;
  left: 12px;
  z-index: 100;
}

/* 右下角定位按钮：与高德缩放/工具栏错开，避免遮挡 */
.map-locate-overlay {
  position: absolute;
  right: 16px;
  bottom: 90px;
  z-index: 100;
}

.locate-btn {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: 50%;
  background: #fff;
  color: #303133;
  box-shadow: 0 1px 6px rgba(0, 0, 0, 0.15);
  cursor: pointer;
  transition: background 0.2s, color 0.2s;
}

.locate-btn:hover {
  background: #f5f7fa;
  color: #409eff;
}

.map-search-box {
  display: flex;
  align-items: center;
  height: 40px;
  background: #f1f3f4;
  border-radius: 20px;
  box-shadow: 0 1px 6px rgba(0, 0, 0, 0.15);
  overflow: hidden;
  transition: width 0.2s ease, background 0.2s ease;
  width: 40px;
}

.map-search-box.expanded {
  width: 320px;
  background: #fff;
}

.search-icon-btn {
  flex-shrink: 0;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: transparent;
  color: #5f6368;
  cursor: pointer;
}

.map-search-box.expanded .search-icon-btn {
  color: #202124;
}

.search-input {
  flex: 1;
  min-width: 0;
  height: 100%;
  padding: 0 8px 0 4px;
  border: none;
  background: transparent;
  font-size: 14px;
  color: #202124;
  outline: none;
}

.search-close-btn {
  flex-shrink: 0;
  width: 32px;
  height: 32px;
  margin-right: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: transparent;
  color: #5f6368;
  cursor: pointer;
  border-radius: 50%;
  transition: background 0.15s, color 0.15s;
}

.search-close-btn:hover {
  background: #f1f3f4;
  color: #202124;
}

.map-search-box:not(.expanded) .search-close-btn {
  display: none;
}

.search-input::placeholder {
  color: #5f6368;
}

.recommend-panel {
  position: relative;
  flex: 1;
  min-width: 0;
  min-height: 0;
  background: #fff;
  border-left: 1px solid #eee;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.recommend-content {
  flex: 1;
  min-height: 0;
  overflow: auto;
  padding: 16px;
}

.recommend-content.recommend-content--ai {
  display: flex;
  flex-direction: column;
  flex: 1 1 0%;
  min-height: 0;
  height: 100%;
  padding: 0;
  overflow: hidden;
}

.recommend-content.recommend-content--ai .ai-chat-wrap {
  position: relative;
  flex: 1 1 0%;
  min-height: 0;
  height: 0;
  width: 100%;
  min-width: 0;
  max-width: 100%;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}
/* 滚动容器用块级布局，高度由内层真实撑开，才能正确产生可滚动区域 */
.recommend-content.recommend-content--ai .ai-chat-wrap .ai-chat-messages {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 64px;
  height: auto;
  display: block;
  overflow-y: scroll;
  overflow-x: hidden;
  scrollbar-width: auto;
}
.recommend-content.recommend-content--ai .ai-chat-messages-inner {
  display: block;
  padding: 16px 12px 24px;
  min-height: 100%;
  box-sizing: border-box;
}
.recommend-content.recommend-content--ai .ai-chat-messages-inner .ai-chat-msg {
  margin-bottom: 24px;
}
.recommend-content.recommend-content--ai .ai-chat-messages-inner .ai-chat-msg:last-child {
  margin-bottom: 0;
}
.recommend-content.recommend-content--ai .ai-chat-wrap .ai-chat-input-bar {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
}

.recommend-content.recommend-content--square {
  padding: 12px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.recommend-content.recommend-content--profile {
  padding: 0;
  overflow-y: auto;
}

.profile-wrap {
  padding: 16px;
}
.profile-header {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 16px 0;
  border-bottom: 1px solid #ebeef5;
}
.profile-avatar {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: linear-gradient(135deg, #409eff 0%, #66b1ff 100%);
  color: #fff;
  font-size: 22px;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.profile-info {
  flex: 1;
  min-width: 0;
}
.profile-name {
  font-size: 17px;
  font-weight: 600;
  color: #303133;
  margin-bottom: 4px;
}
.profile-badge {
  font-size: 12px;
  color: #409eff;
}
.profile-diamond {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  padding: 20px 0;
  border-bottom: 1px solid #ebeef5;
}
.profile-diamond-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 14px 8px;
  border: none;
  background: #f5f7fa;
  border-radius: 10px;
  cursor: pointer;
  transition: background 0.2s;
}
.profile-diamond-item:hover {
  background: #ecf5ff;
}
.profile-diamond-icon {
  font-size: 22px;
}
.profile-diamond-label {
  font-size: 13px;
  color: #606266;
}
.profile-list {
  padding: 8px 0;
}
.profile-list-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 14px 0;
  border: none;
  background: none;
  font-size: 15px;
  color: #303133;
  text-align: left;
  cursor: pointer;
  border-bottom: 1px solid #f0f0f0;
  transition: background 0.2s;
}
.profile-list-item:hover {
  background: #f5f7fa;
}
.profile-list-arrow {
  color: #c0c4cc;
  font-size: 18px;
}
.profile-list-item--danger .profile-list-arrow,
.profile-list-item--danger {
  color: #f56c6c;
}

.profile-list-item--with-switch {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.profile-list-switch-wrap {
  flex-shrink: 0;
}
.profile-list-switch {
  display: inline-block;
  width: 50px;
  height: 28px;
  border-radius: 14px;
  transition: background 0.2s;
}
.profile-list-switch--off {
  background: #dcdfe6;
}
.profile-list-switch--on {
  background: #409eff;
}

.profile-sub-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  border-bottom: 1px solid #ebeef5;
}
.profile-sub-back {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 0;
  border: none;
  background: none;
  color: #409eff;
  font-size: 15px;
  cursor: pointer;
}
.profile-sub-title {
  font-size: 17px;
  font-weight: 600;
  color: #303133;
}
.profile-sub-title--center {
  flex: 1;
  text-align: center;
  padding-right: 60px;
}
.profile-sub-body {
  padding: 16px;
  overflow-y: auto;
}
.preference-row {
  margin-bottom: 12px;
}
.preference-label {
  display: block;
  font-size: 14px;
  color: #606266;
  margin-bottom: 8px;
}
.preference-gap {
  height: 24px;
}
.preference-input {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #dcdfe6;
  border-radius: 8px;
  font-size: 14px;
  box-sizing: border-box;
}
.preference-save {
  margin-top: 20px;
  width: 100%;
  padding: 12px;
  border: none;
  border-radius: 10px;
  background: #409eff;
  color: #fff;
  font-size: 15px;
  cursor: pointer;
}
.feedback-tab-head {
  display: flex;
  gap: 0;
  border-bottom: 1px solid #ebeef5;
  margin-bottom: 16px;
}
.feedback-tab-btn {
  flex: 1;
  padding: 10px;
  border: none;
  background: none;
  font-size: 14px;
  color: #909399;
  cursor: pointer;
  border-bottom: 2px solid transparent;
  margin-bottom: -1px;
}
.feedback-tab-btn.active {
  color: #409eff;
  border-bottom-color: #409eff;
}
.feedback-panel {
  min-height: 120px;
}
.faq-item {
  padding: 12px 0;
  border-bottom: 1px solid #f0f0f0;
}
.faq-q {
  font-weight: 500;
  color: #303133;
  margin-bottom: 6px;
}
.faq-a {
  font-size: 13px;
  color: #606266;
  line-height: 1.5;
}
.feedback-textarea {
  width: 100%;
  padding: 12px;
  border: 1px solid #dcdfe6;
  border-radius: 8px;
  font-size: 14px;
  resize: vertical;
  min-height: 100px;
  box-sizing: border-box;
  margin-bottom: 12px;
}
.feedback-submit-btn {
  padding: 10px 20px;
  border: none;
  border-radius: 8px;
  background: #409eff;
  color: #fff;
  font-size: 14px;
  cursor: pointer;
}
.feedback-empty, .profile-empty-tip {
  text-align: center;
  color: #909399;
  font-size: 14px;
  padding: 24px 0;
}
.profile-empty-tip--center {
  display: block;
  width: 100%;
  text-align: center;
}
.feedback-record-item {
  padding: 12px 0;
  border-bottom: 1px solid #f0f0f0;
}
.feedback-record-content {
  font-size: 14px;
  color: #303133;
  margin-bottom: 4px;
}
.feedback-record-time {
  font-size: 12px;
  color: #909399;
}
.profile-collect-list {
  padding: 12px;
  overflow-y: auto;
}
.profile-collect-list .recommend-item {
  margin-bottom: 10px;
}
.profile-square-waterfall {
  padding: 12px;
  overflow-y: auto;
}

.square-card-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 4px 10px 8px;
  min-width: 0;
}

.square-card-like {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: #e53935;
  flex-shrink: 0;
  cursor: pointer;
}
.square-card-like-icon {
  width: 16px;
  height: 16px;
  flex-shrink: 0;
}
.square-card-like-num {
  font-size: 12px;
  color: #9e9e9e;
}

.square-detail-page {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: #fff;
}
.square-detail-header {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 12px 8px 12px 4px;
  border-bottom: 1px solid #ebeef5;
}
.square-detail-delete {
  padding: 4px 10px;
  border: none;
  background: none;
  color: #f56c6c;
  font-size: 14px;
  cursor: pointer;
}
.square-detail-body {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
}
.square-detail-img-wrap {
  position: relative;
  width: 100%;
  min-height: 280px;
  background: #f0f0f0;
  display: flex;
  align-items: center;
  justify-content: center;
}
.square-detail-img {
  width: 100%;
  display: block;
  min-height: 280px;
  max-height: 360px;
  object-fit: cover;
}
.square-detail-img-placeholder {
  min-height: 280px;
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #909399;
  font-size: 14px;
}
.square-detail-img-prev,
.square-detail-img-next {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: none;
  background: rgba(0,0,0,.4);
  color: #fff;
  font-size: 24px;
  line-height: 1;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  z-index: 2;
}
.square-detail-img-prev { left: 12px; }
.square-detail-img-next { right: 12px; }

.square-detail-actions {
  display: flex;
  align-items: center;
  justify-content: space-evenly;
  padding: 12px 16px;
  border-bottom: 1px solid #ebeef5;
}
.square-detail-action-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 0;
  border: none;
  background: none;
  font-size: 14px;
  color: #606266;
  cursor: pointer;
}
.square-detail-action-btn.active,
.square-detail-action-btn:hover { color: #e53935; }
.square-detail-action-icon {
  width: 20px;
  height: 20px;
  flex-shrink: 0;
}
.square-detail-action-num {
  font-size: 13px;
  color: #909399;
}

.square-detail-content {
  padding: 16px;
}

.square-detail-comments {
  padding: 16px;
  border-top: 1px solid #ebeef5;
}
.square-detail-comments-title {
  font-size: 15px;
  font-weight: 600;
  color: #303133;
  margin: 0 0 12px;
}
.square-detail-comment-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.square-detail-comment-item {
  font-size: 14px;
  color: #606266;
  line-height: 1.5;
}
.square-detail-comment-author {
  color: #303133;
  font-weight: 500;
  margin-right: 6px;
}
.square-detail-comments-empty {
  font-size: 14px;
  color: #909399;
  margin: 0;
}
.square-detail-title-text {
  font-size: 18px;
  font-weight: 600;
  color: #303133;
  margin: 0 0 12px;
}
.square-detail-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}
.square-detail-avatar {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: #409eff;
  color: #fff;
  font-size: 12px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
.square-detail-author {
  font-size: 14px;
  color: #606266;
}
.square-detail-shop-row {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 12px;
}
.square-detail-shop-icon {
  font-size: 14px;
}
.square-detail-shop-name {
  font-size: 14px;
  color: #303133;
  font-weight: 500;
}
.square-detail-desc {
  font-size: 14px;
  color: #606266;
  line-height: 1.6;
  margin: 0;
}

.square-area {
  position: relative;
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
}
.square-area .recommend-title {
  flex-shrink: 0;
}
.square-wrap {
  position: relative;
  flex: 1;
  min-height: 200px;
  padding-bottom: 24px;
}

.square-waterfall {
  column-count: 2;
  column-gap: 10px;
}

.square-card {
  position: relative;
  break-inside: avoid;
  margin-bottom: 12px;
  border-radius: 12px;
  overflow: hidden;
  background: #fff;
  box-shadow: 0 1px 6px rgba(0,0,0,.08);
  cursor: pointer;
}

.square-card-img {
  width: 100%;
  aspect-ratio: 3/4;
  background: #f5f5f5;
  position: relative;
}

.square-card-img img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.square-card-img-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #909399;
  font-size: 13px;
}

.square-card-info {
  min-width: 0;
}

.square-card-title {
  padding: 8px 10px 4px;
  font-size: 14px;
  font-weight: 500;
  color: #303133;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.square-card-user {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
  flex: 1;
  overflow: hidden;
}

.square-card-avatar {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: #409eff;
  color: #fff;
  font-size: 11px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background-size: cover;
  background-position: center;
  flex-shrink: 0;
}

.square-card-name {
  font-size: 12px;
  color: #606266;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.square-card-shop {
  padding: 0 10px 4px;
  font-size: 12px;
  color: #909399;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.square-fab {
  width: 52px;
  height: 52px;
  border-radius: 50%;
  border: none;
  background: #409eff;
  color: #fff;
  box-shadow: 0 4px 12px rgba(64, 158, 255, .45);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2;
}
.square-fab--fixed {
  position: absolute;
  right: 16px;
  bottom: 64px;
}

.square-fab:hover {
  background: #66b1ff;
}

.square-fab:active {
  transform: scale(0.96);
}

/* 发帖弹窗（蓝色主题）；内联在右侧容器内 */
.post-modal-mask {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,.5);
  z-index: 2000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}
/* 发帖内嵌页：占满右侧容器并自适应 */
.post-inline-page {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: #fff;
}
.post-inline-header {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 8px 12px 4px;
  border-bottom: 1px solid #ebeef5;
}
.post-inline-back {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 6px;
  margin: 0;
  border: none;
  background: none;
  color: #409eff;
  font-size: 15px;
  cursor: pointer;
  flex-shrink: 0;
}
.post-inline-title {
  font-size: 17px;
  font-weight: 600;
  color: #303133;
}
.post-inline-title--center {
  flex: 1;
  text-align: center;
  padding-right: 80px;
}
.post-inline-body {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 16px;
}
.post-modal-photo--inline {
  max-height: 160px;
  aspect-ratio: 1;
}

.post-modal {
  width: 100%;
  max-width: 420px;
  max-height: 90vh;
  overflow: hidden;
  background: #fff;
  border-radius: 16px;
  box-shadow: 0 8px 32px rgba(0,0,0,.15);
  display: flex;
  flex-direction: column;
}

.post-modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  border-bottom: 1px solid #ebeef5;
}

.post-modal-title {
  font-size: 17px;
  font-weight: 600;
  color: #303133;
}

.post-modal-close {
  padding: 4px;
  border: none;
  background: none;
  color: #909399;
  cursor: pointer;
  border-radius: 8px;
}

.post-modal-close:hover {
  color: #303133;
  background: #f5f7fa;
}

.post-modal-body {
  padding: 16px;
  overflow-y: auto;
}

.post-modal-row {
  margin-bottom: 16px;
}

.post-modal-label {
  display: block;
  font-size: 13px;
  color: #606266;
  margin-bottom: 8px;
}

.post-modal-photo {
  width: 100%;
  aspect-ratio: 1;
  max-height: 200px;
  border: 1px dashed #c0c4cc;
  border-radius: 12px;
  background: #fafafa;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  cursor: pointer;
}

.post-modal-photo:hover {
  border-color: #409eff;
  background: #ecf5ff;
}

.post-modal-photo-preview {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 12px;
}

.post-modal-photo-placeholder {
  font-size: 14px;
  color: #909399;
}

.post-modal-photo-input {
  position: absolute;
  width: 0;
  height: 0;
  opacity: 0;
  pointer-events: none;
}

.post-modal-input {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #dcdfe6;
  border-radius: 8px;
  font-size: 14px;
  margin-bottom: 8px;
  box-sizing: border-box;
}

.post-modal-input:focus {
  outline: none;
  border-color: #409eff;
}

.post-modal-textarea {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #dcdfe6;
  border-radius: 8px;
  font-size: 14px;
  resize: vertical;
  min-height: 80px;
  box-sizing: border-box;
}

.post-modal-textarea:focus {
  outline: none;
  border-color: #409eff;
}

.post-modal-shop-row {
  display: flex;
  gap: 10px;
  align-items: center;
}

.post-modal-select {
  flex: 1;
  padding: 8px 12px;
  border: 1px solid #dcdfe6;
  border-radius: 8px;
  font-size: 14px;
  background: #fff;
}

.post-modal-btn-outline {
  padding: 8px 14px;
  border: 1px solid #409eff;
  color: #409eff;
  background: #fff;
  border-radius: 8px;
  font-size: 13px;
  cursor: pointer;
  white-space: nowrap;
}

.post-modal-btn-outline:hover {
  background: #ecf5ff;
}

.post-modal-shop-tip {
  margin-top: 6px;
  font-size: 12px;
  color: #409eff;
}

.post-modal-actions {
  margin-top: 20px;
  padding-top: 12px;
}

.post-modal-btn-publish {
  width: 100%;
  padding: 12px;
  border: none;
  border-radius: 10px;
  background: #409eff;
  color: #fff;
  font-size: 15px;
  font-weight: 500;
  cursor: pointer;
}

.post-modal-btn-publish:hover {
  background: #66b1ff;
}

.post-modal-btn-publish:active {
  transform: scale(0.98);
}

/* 餐厅落地页 */
.poi-detail {
  display: flex;
  flex-direction: column;
  min-height: 0;
  padding-bottom: 16px;
}

/* 高度保证：返回按钮(~44px) + 标题与按钮最小间隔 30px = 74px 需在 overlay 上方；overlay 占底部 60%，故 40%*H>=74 → min-height 185px */
.poi-detail-hero {
  flex-shrink: 0;
  margin-bottom: 16px;
  position: relative;
  width: 100%;
  max-width: 100%;
  border-radius: 12px;
  overflow: hidden;
  aspect-ratio: 16 / 5;
  min-height: 185px;
  background: #1a1a1a;
}

.poi-detail-cover {
  position: absolute;
  inset: 0;
}

/* 渐变模糊：顶层无模糊，自上而下线性过渡到底部 100% 模糊 */
.poi-detail-cover-sharp {
  position: absolute;
  inset: 0;
  background-size: cover;
  background-position: center;
  -webkit-mask-image: linear-gradient(to bottom, black 0%, transparent 100%);
  mask-image: linear-gradient(to bottom, black 0%, transparent 100%);
}

.poi-detail-cover-blur {
  position: absolute;
  inset: 0;
  background-size: cover;
  background-position: center;
  filter: blur(20px);
  transform: scale(1.08);
  -webkit-mask-image: linear-gradient(to bottom, transparent 0%, black 100%);
  mask-image: linear-gradient(to bottom, transparent 0%, black 100%);
}

.poi-detail-cover-placeholder {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #909399;
  font-size: 14px;
}

.poi-detail-back {
  position: absolute;
  top: 0;
  left: 0;
  z-index: 10;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 12px 16px;
  border: none;
  background: transparent;
  font-size: 15px;
  color: #fff;
  cursor: pointer;
  transition: color 0.2s;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.6);
}

.poi-detail-back:hover {
  color: #c6e2ff;
}

.poi-detail-hero-overlay {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  min-height: 60%;
  padding: 16px;
  background: linear-gradient(to top, rgba(0, 0, 0, 0.85) 0%, rgba(0, 0, 0, 0.5) 50%, transparent 100%);
  color: #fff;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  gap: 6px;
}

.poi-detail-name {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
  color: #fff;
  line-height: 1.3;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
}

.poi-detail-badges {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.poi-detail-badge {
  display: inline-block;
  padding: 4px 10px;
  font-size: 12px;
  color: #fff;
  background: rgba(255, 255, 255, 0.25);
  border-radius: 6px;
}

.poi-detail-badge-type {
  background: rgba(64, 158, 255, 0.8);
}

.poi-detail-stars {
  display: inline-flex;
  align-items: center;
  gap: 1px;
  font-size: 14px;
  color: #f7ba2a;
}

.poi-detail-star {
  display: inline-block;
}

.poi-detail-star-full {
  color: #f7ba2a;
}

.poi-detail-star-empty {
  color: rgba(255, 255, 255, 0.35);
}

/* 半星：一颗星位置内左半实心★、右半空心☆ */
.poi-detail-star-half {
  position: relative;
  display: inline-block;
  width: 1em;
  line-height: 1;
  vertical-align: middle;
}

.poi-detail-star-half-empty {
  display: block;
  color: rgba(255, 255, 255, 0.35);
}

.poi-detail-star-half-full {
  position: absolute;
  left: 0;
  top: 0;
  width: 50%;
  overflow: hidden;
  color: #f7ba2a;
}

.poi-detail-rating-num {
  margin-left: 4px;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.9);
}

.poi-detail-meta-line {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.95);
}

.poi-detail-meta-label {
  color: rgba(255, 255, 255, 0.75);
  margin-right: 4px;
}

.poi-detail-open {
  color: #67c23a;
  font-weight: 500;
}

.poi-detail-closed {
  color: #f56c6c;
}

.poi-detail-body {
  flex: 1;
  min-height: 0;
}

.poi-detail-section {
  margin-bottom: 18px;
}

.poi-detail-section-title {
  margin: 0 0 8px 0;
  font-size: 14px;
  font-weight: 600;
  color: #303133;
}

.poi-detail-address {
  margin: 0 0 8px 0;
  font-size: 14px;
  color: #606266;
  line-height: 1.5;
}
.poi-detail-route-btns {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 10px;
}
.poi-detail-route-btn {
  flex: 1;
  min-width: 0;
  padding: 8px 12px;
  font-size: 13px;
  color: #606266;
  background: #f5f7fa;
  border: 1px solid #ebeef5;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.2s, border-color 0.2s, color 0.2s;
}
.poi-detail-route-btn:hover {
  background: #ecf5ff;
  border-color: #409eff;
  color: #409eff;
}
.poi-detail-route-btn.active {
  background: #409eff;
  border-color: #409eff;
  color: #fff;
}
.poi-detail-tabs-wrap {
  margin-top: 16px;
  border: 1px solid #ebeef5;
  border-radius: 8px;
  overflow: hidden;
}
.poi-detail-tabs-header {
  display: flex;
  flex-wrap: wrap;
  background: #f5f7fa;
  border-bottom: 1px solid #ebeef5;
}
.poi-detail-tab-btn {
  flex: 1;
  min-width: 0;
  padding: 10px 12px;
  font-size: 14px;
  color: #606266;
  background: transparent;
  border: none;
  cursor: pointer;
  transition: background 0.2s, color 0.2s;
}
.poi-detail-tab-btn:hover {
  background: #ecf5ff;
  color: #409eff;
}
.poi-detail-tab-btn.active {
  background: #fff;
  color: #409eff;
  font-weight: 500;
}
.poi-detail-tab-panel {
  padding: 14px 16px;
  min-height: 60px;
  background: #fff;
}
.poi-detail-tab-content {
  margin: 0;
  font-size: 14px;
  color: #606266;
  line-height: 1.6;
}
.poi-detail-groupbuy-tip {
  margin-bottom: 12px;
}
.poi-detail-groupbuy-links {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}
.poi-detail-groupbuy-link {
  display: inline-block;
  padding: 8px 16px;
  font-size: 14px;
  color: #fff;
  border-radius: 8px;
  text-decoration: none;
  transition: opacity 0.2s, transform 0.15s;
}
.poi-detail-groupbuy-link:hover {
  opacity: 0.95;
  transform: translateY(-1px);
}
.poi-detail-groupbuy-link:nth-child(1) {
  background: linear-gradient(135deg, #ffd100 0%, #ff6b00 100%);
}
.poi-detail-groupbuy-link:nth-child(2) {
  background: linear-gradient(135deg, #000 0%, #333 100%);
}
.poi-detail-groupbuy-link--blue {
  background: linear-gradient(135deg, #1890ff 0%, #096dd9 100%) !important;
}
.poi-detail-groupbuy-link:nth-child(3) {
  background: linear-gradient(135deg, #e3393c 0%, #c81623 100%);
}
.poi-detail-dishes {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
  gap: 12px;
}
.poi-detail-dishes-more {
  grid-column: 1 / -1;
  padding: 10px 16px;
  border: 1px solid #dcdfe6;
  border-radius: 8px;
  background: #f5f7fa;
  color: #606266;
  font-size: 14px;
  cursor: pointer;
}
.poi-detail-dishes-more:hover {
  background: #eef1f6;
  color: #409eff;
}
.poi-detail-dish-card {
  background: #f9fafb;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid #ebeef5;
}
.poi-detail-dish-pic {
  width: 100%;
  aspect-ratio: 1;
  background: #e8eaed;
  display: flex;
  align-items: center;
  justify-content: center;
}
.poi-detail-dish-pic img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.poi-detail-dish-pic-placeholder {
  font-size: 12px;
  color: #909399;
}
.poi-detail-dish-info {
  padding: 6px 8px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.poi-detail-dish-name {
  font-size: 13px;
  color: #303133;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.poi-detail-dish-price {
  font-size: 12px;
  color: #f56c6c;
  font-weight: 500;
}

.poi-detail-action {
  display: inline-block;
  padding: 6px 12px;
  font-size: 13px;
  color: #409eff;
  background: transparent;
  border: 1px solid #409eff;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.2s, color 0.2s;
}

.poi-detail-action:hover {
  background: #409eff;
  color: #fff;
}

.poi-detail-tel {
  font-size: 14px;
  color: #409eff;
  text-decoration: none;
}

.poi-detail-tel:hover {
  text-decoration: underline;
}

.poi-detail-tag {
  margin: 0;
  font-size: 14px;
  color: #606266;
  line-height: 1.5;
}

.poi-detail-empty {
  margin: 0;
  font-size: 14px;
  color: #909399;
  font-style: normal;
}

/* ChatGPT 风格对话：整体占满右侧，宽度随右侧容器自适应 */
.ai-chat-wrap {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  min-width: 0;
  width: 100%;
  height: 100%;
  background: #f7f7f8;
}
/* 消息区可纵向滚动；AI 发现下由 .recommend-content--ai .ai-chat-wrap .ai-chat-messages 绝对定位限定高度 */
.ai-chat-messages {
  flex: 1 1 0%;
  min-height: 0;
  height: 0;
  min-width: 0;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 16px 12px 24px;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  gap: 24px;
  -webkit-overflow-scrolling: touch;
}
/* AI 发现：始终显示明显的竖向滚动条 */
.recommend-content.recommend-content--ai .ai-chat-messages {
  scrollbar-width: auto;
  scrollbar-color: #909090 #e0e0e0;
}
.recommend-content.recommend-content--ai .ai-chat-messages::-webkit-scrollbar {
  width: 12px;
}
.recommend-content.recommend-content--ai .ai-chat-messages::-webkit-scrollbar-track {
  background: #e0e0e0;
  border-radius: 6px;
}
.recommend-content.recommend-content--ai .ai-chat-messages::-webkit-scrollbar-thumb {
  background: #909090;
  border-radius: 6px;
  border: 2px solid #e0e0e0;
}
.recommend-content.recommend-content--ai .ai-chat-messages::-webkit-scrollbar-thumb:hover {
  background: #606060;
}
/* 每条消息不收缩，总高度才能超出容器，产生可滚动区域 */
.ai-chat-msg {
  flex-shrink: 0;
  display: flex;
  gap: 12px;
  max-width: 100%;
}
.ai-chat-msg.user {
  flex-direction: row-reverse;
}
.ai-chat-msg.user .ai-chat-content {
  align-items: flex-end;
}
.ai-chat-avatar {
  flex-shrink: 0;
  width: 28px;
  height: 28px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #409eff;
  color: #fff;
  font-size: 12px;
  font-weight: 600;
}
.ai-chat-msg.user .ai-chat-avatar {
  background: #409eff;
}
.ai-chat-content {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  max-width: 85%;
  min-width: 0;
}
.ai-chat-bubble {
  padding: 12px 16px;
  border-radius: 12px;
  font-size: 14px;
  line-height: 1.6;
  background: #fff;
  border: 1px solid #e5e5e5;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
}
.ai-chat-msg.user .ai-chat-bubble {
  background: #19c37d;
  border-color: #19c37d;
  color: #fff;
}
.ai-chat-text {
  margin: 0 0 10px 0;
  white-space: pre-wrap;
  word-break: break-word;
  color: #374151;
}
.ai-chat-msg.user .ai-chat-text {
  color: #fff;
}
.ai-chat-text:last-child {
  margin-bottom: 0;
}
.ai-chat-typing {
  padding: 8px 0;
}
.ai-chat-dots {
  display: inline-flex;
  gap: 4px;
}
.ai-chat-dots span {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #9ca3af;
  animation: ai-chat-bounce 1.4s ease-in-out infinite both;
}
.ai-chat-dots span:nth-child(1) { animation-delay: 0s }
.ai-chat-dots span:nth-child(2) { animation-delay: 0.2s }
.ai-chat-dots span:nth-child(3) { animation-delay: 0.4s }
@keyframes ai-chat-bounce {
  0%, 80%, 100% { transform: scale(0.6); opacity: 0.5 }
  40% { transform: scale(1); opacity: 1 }
}
.ai-chat-cards {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-top: 12px;
}

/* AI 推荐内列表项缩小：高度与字号与助手文案(14px)匹配，序号与内容同排、左侧留白小 */
.ai-chat-cards .recommend-item {
  padding: 6px 8px;
  margin-bottom: 4px;
  gap: 8px;
}
.ai-chat-cards .recommend-item-index {
  flex-shrink: 0;
  width: 20px;
  height: 20px;
  line-height: 20px;
  font-size: 11px;
  border-radius: 6px;
}
.ai-chat-cards .recommend-item-fav {
  width: 22px;
  height: 22px;
}
.ai-chat-cards .recommend-item-pic {
  width: 48px;
  height: 48px;
  border-radius: 6px;
}
.ai-chat-cards .recommend-item-pic-placeholder {
  font-size: 11px;
}
.ai-chat-cards .recommend-item-name {
  font-size: 13px;
  margin-bottom: 2px;
}
.ai-chat-cards .recommend-item-meta {
  font-size: 11px;
}
.ai-chat-cards .recommend-item-meta-sep {
  margin: 0 4px;
}

.ai-chat-input-bar {
  flex-shrink: 0;
  height: 64px;
  min-height: 64px;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 16px;
  background: #fff;
  border-top: 1px solid #e5e5e5;
}
.ai-chat-input {
  flex: 1;
  min-width: 0;
  padding: 12px 16px;
  font-size: 15px;
  border: 1px solid #d1d5db;
  border-radius: 12px;
  outline: none;
  transition: border-color 0.2s, box-shadow 0.2s;
  background: #fff;
}
.ai-chat-input:focus {
  border-color: #409eff;
  box-shadow: 0 0 0 2px rgba(64, 158, 255, 0.15);
}
.ai-chat-input::placeholder {
  color: #9ca3af;
}
.ai-chat-send {
  flex-shrink: 0;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  background: #409eff;
  border: none;
  border-radius: 10px;
  cursor: pointer;
  transition: background 0.2s;
}
.ai-chat-send:hover:not(:disabled) {
  background: #66b1ff;
}
.ai-chat-send:disabled {
  background: #a0cfff;
  cursor: not-allowed;
}

.tab-placeholder {
  padding: 24px 0;
  text-align: center;
  color: #909399;
  font-size: 14px;
}

.recommend-bottom-bar {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-around;
  height: 52px;
  padding: 0 8px;
  background: #fff;
  border-top: 1px solid #eee;
  box-shadow: 0 -1px 4px rgba(0, 0, 0, 0.06);
}

.bottom-tab {
  flex: 1;
  height: 100%;
  border: none;
  background: transparent;
  font-size: 15px;
  color: #606266;
  cursor: pointer;
  transition: color 0.2s, font-weight 0.2s;
}

.bottom-tab:hover {
  color: #409eff;
}

.bottom-tab.active {
  color: #409eff;
  font-weight: 600;
}

.recommend-title {
  margin: 0 0 12px 0;
  font-size: 16px;
  font-weight: 600;
  color: #303133;
}

.recommend-top-bar {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
}

.recommend-top-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 6px 12px;
  font-size: 13px;
  color: #606266;
  background: #f5f7fa;
  border: 1px solid #e4e7ed;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.2s, color 0.2s, border-color 0.2s;
}

.recommend-top-btn:hover {
  background: #ecf5ff;
  color: #409eff;
  border-color: #c6e2ff;
}

.recommend-top-btn-icon {
  font-size: 12px;
}

.recommend-filter-popover {
  padding: 4px 0;
}

.recommend-filter-popover-row {
  margin-bottom: 14px;
}

.recommend-filter-popover-row:last-child {
  margin-bottom: 0;
}

.recommend-filter-label {
  display: block;
  font-size: 12px;
  color: #606266;
  margin-bottom: 6px;
}

.recommend-filter-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.recommend-filter-tag {
  padding: 4px 10px;
  font-size: 12px;
  color: #606266;
  background: #f5f7fa;
  border: 1px solid #e4e7ed;
  border-radius: 6px;
  cursor: pointer;
  transition: color 0.2s, background 0.2s, border-color 0.2s;
}

.recommend-filter-tag:hover {
  color: #409eff;
  border-color: #c6e2ff;
  background: #ecf5ff;
}

.recommend-filter-tag.active {
  color: #409eff;
  border-color: #409eff;
  background: #ecf5ff;
}

.recommend-filter-type-error {
  margin: 8px 0 0;
  font-size: 12px;
  color: #f56c6c;
  transition: transform 0.2s, opacity 0.2s;
}
.recommend-filter-type-error--emphasize {
  animation: filter-type-error-shake 0.4s ease-out;
}
@keyframes filter-type-error-shake {
  0%, 100% { transform: translateX(0); }
  20% { transform: translateX(-4px); }
  40% { transform: translateX(4px); }
  60% { transform: translateX(-2px); }
  80% { transform: translateX(2px); }
}

.recommend-filter-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 16px;
  padding-top: 12px;
  border-top: 1px solid #ebeef5;
}

.recommend-filter-btn {
  padding: 6px 16px;
  font-size: 13px;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.2s, color 0.2s, border-color 0.2s;
}

.recommend-filter-btn.reset {
  color: #606266;
  background: #f5f7fa;
  border: 1px solid #dcdfe6;
}

.recommend-filter-btn.reset:hover {
  color: #409eff;
  border-color: #c6e2ff;
  background: #ecf5ff;
}

.recommend-filter-btn.save {
  color: #fff;
  background: #409eff;
  border: 1px solid #409eff;
}

.recommend-filter-btn.save:hover {
  background: #66b1ff;
  border-color: #66b1ff;
}

.recommend-list {
  min-height: 200px;
}

.recommend-load-more-row {
  padding: 12px;
  text-align: center;
  font-size: 13px;
}

.recommend-load-more-link {
  color: #409eff;
  cursor: pointer;
  transition: color 0.2s;
}

.recommend-load-more-link:hover:not(.loading) {
  color: #66b1ff;
}

.recommend-load-more-link.loading {
  cursor: not-allowed;
  color: #409eff;
}

.recommend-load-more-spin {
  display: inline-block;
  width: 14px;
  height: 14px;
  vertical-align: middle;
  margin-right: 4px;
  border: 2px solid #b3d8ff;
  border-top-color: #409eff;
  border-radius: 50%;
  animation: recommend-load-spin 0.7s linear infinite;
}

@keyframes recommend-load-spin {
  to { transform: rotate(360deg); }
}

.recommend-load-more-end {
  color: #303133;
}

.recommend-ad-slot {
  position: relative;
  height: 52px;
  margin-bottom: 8px;
  background: #f0f2f5;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.recommend-ad-close {
  position: absolute;
  top: 6px;
  right: 8px;
  width: 24px;
  height: 24px;
  padding: 0;
  border: none;
  background: rgba(0,0,0,.08);
  color: #606266;
  font-size: 18px;
  line-height: 1;
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}
.recommend-ad-close:hover {
  background: rgba(0,0,0,.12);
  color: #303133;
}
.recommend-ad-text {
  font-size: 13px;
  color: #909399;
}

.recommend-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  margin-bottom: 8px;
  background: #f9fafb;
  border-radius: 10px;
  cursor: pointer;
  transition: background 0.2s, box-shadow 0.2s;
}

.recommend-item:hover {
  background: #f0f2f5;
}

.recommend-item-highlight {
  animation: recommend-item-highlight 2s ease-out;
}

@keyframes recommend-item-highlight {
  0% {
    background: #ecf5ff;
    box-shadow: 0 0 0 2px #409eff;
  }
  70% {
    background: #ecf5ff;
    box-shadow: 0 0 0 2px #409eff;
  }
  100% {
    background: #f9fafb;
    box-shadow: none;
  }
}

.recommend-item-index {
  flex-shrink: 0;
  width: 24px;
  height: 24px;
  line-height: 24px;
  text-align: center;
  font-size: 12px;
  font-weight: 700;
  color: #fff;
  background: linear-gradient(135deg, #409eff 0%, #66b1ff 100%);
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(64, 158, 255, 0.35);
}

.recommend-item-fav {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  padding: 0;
  border: none;
  background: rgba(255, 255, 255, 0.9);
  border-radius: 50%;
  cursor: pointer;
  color: #f56c6c;
  transition: color 0.2s, background 0.2s, transform 0.15s;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);
  margin-left: auto;
}

.recommend-item-fav:hover {
  color: #e6a23c;
  background: #fff;
  transform: scale(1.08);
}

.recommend-item-star {
  width: 14px;
  height: 14px;
  color: #f7ba2a;
}
.recommend-item-star--outline {
  color: #f7ba2a;
  stroke: #f7ba2a;
}
.recommend-item-fav:hover .recommend-item-star {
  color: #e6a23c;
}
.recommend-item-fav:hover .recommend-item-star--outline {
  stroke: #e6a23c;
}

.recommend-item-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-top: 3px;
  line-height: 1.2;
}
.recommend-item-tag {
  font-size: 10px;
  padding: 1px 6px;
  border-radius: 8px;
  border: none;
  color: #fff;
}
.recommend-item-tag--student {
  background: #f7ba2a;
}
.recommend-item-tag--popular {
  background: #f56c6c;
}
.recommend-item-tag--nearest {
  background: #409eff;
}

.ai-chat-cards .recommend-item-star {
  width: 12px;
  height: 12px;
}

.recommend-item-pic {
  flex-shrink: 0;
  width: 64px;
  height: 64px;
  border-radius: 8px;
  overflow: hidden;
  background: #e8eaed;
  display: flex;
  align-items: center;
  justify-content: center;
}

.recommend-item-pic img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.recommend-item-pic-placeholder {
  font-size: 12px;
  color: #909399;
}

.recommend-item-body {
  flex: 1;
  min-width: 0;
  line-height: 1.25;
}

.recommend-item-name {
  font-weight: 600;
  color: #303133;
  font-size: 14px;
  margin-bottom: 2px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  line-height: 1.3;
}

.recommend-item-meta {
  font-size: 12px;
  color: #606266;
  line-height: 1.3;
}

.recommend-item-meta-sep {
  margin: 0 6px;
  color: #c0c4cc;
}

.recommend-item-meta-empty {
  color: #909399;
}

.recommend-placeholder {
  margin: 0;
  color: #909399;
  font-size: 14px;
}

</style>

