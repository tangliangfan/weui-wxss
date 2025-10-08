
// 导入云函数调用工具和提示工具
const { callCloudFunction, showToast, showLoading, hideLoading } = require('../../utils/cloud')
// 导入日期格式化工具
const { formatDate } = require('../../utils/util')

// 页面逻辑定义
Page({
  // 页面数据定义
  data: {
    searchText: '', // 搜索框输入文本
    users: [], // 完整的用户列表
    filteredUsers: [], // 根据搜索条件过滤后的用户列表
    loading: true, // 加载状态，控制加载动画显示
    showSearchModal: false, // 控制搜索模态框显示
    searchResults: [], // 搜索结果列表
    searchLoading: false, // 搜索加载状态
    showAddUserModal: false, // 控制添加用户模态框显示
    addUserLoading: false, // 添加用户加载状态
    newUserForm: { // 新用户表单数据
      name: '', // 姓名
      phone: '', // 手机号
      address: '', // 地址
      diseases: '', // 基础疾病（字符串格式）
      medications: '' // 用药情况（字符串格式）
    },
    showDeleteDialog: false, // 控制删除确认对话框显示
    userToDelete: null, // 待删除的用户对象
    deleting: false, // 删除操作加载状态
    lastRefreshTime: 0, // 上次刷新时间戳
    needRefresh: false, // 是否需要刷新标志
    overviewData: { // 数据总览统计
      totalUsers: 0, // 用户总人数
      newUsersThisYear: 0, // 本年新增用户数
      newUsersThisMonth: 0, // 本月新增用户数
      followedThisMonth: 0, // 本月已随访人数
      overdueFollowup: 0, // 已过随访日期人数
      noFollowupRecords: 0 // 无随访记录人数
    },
    overviewLoading: false // 总览数据加载状态
  },

  // 页面加载生命周期函数
  onLoad() {
    // 页面加载时获取用户列表和数据总览
    this.fetchUsers()
    this.fetchOverviewData()
  },

  // 页面显示生命周期函数 - 修改刷新逻辑
  onShow() {
    // 检查是否需要刷新数据
    if (this.data.needRefresh) {
      this.fetchUsers()
      this.fetchOverviewData()
      // 注意：这里不再立即设置 needRefresh: false，而是在 fetchUsers 完成后设置
    }
  },

  // 下拉刷新生命周期函数
  onPullDownRefresh() {
    // 下拉刷新时重新获取用户列表和数据总览，完成后停止下拉刷新动画
    Promise.all([
      this.fetchUsers(),
      this.fetchOverviewData()
    ]).finally(() => {
      wx.stopPullDownRefresh()
    })
  },

  // 获取数据总览统计
  async fetchOverviewData() {
    try {
      this.setData({ overviewLoading: true })
      
      // 调用云函数获取所有用户数据用于统计
      const result = await callCloudFunction('getUsers', {})
      
      if (result.success && result.data && result.data.records) {
        const allUsers = result.data.records
        const currentYear = new Date().getFullYear()
        const currentMonth = new Date().getMonth()
        const today = new Date()
        
        // 计算统计数据
        const overviewData = {
          totalUsers: allUsers.length,
          newUsersThisYear: allUsers.filter(user => {
            const createDate = new Date(user.createdAt)
            return createDate.getFullYear() === currentYear
          }).length,
          newUsersThisMonth: allUsers.filter(user => {
            const createDate = new Date(user.createdAt)
            return createDate.getFullYear() === currentYear && 
                   createDate.getMonth() === currentMonth
          }).length,
          followedThisMonth: allUsers.filter(user => {
            if (!user.followups || user.followups.length === 0) return false
            const latestFollowup = user.followups[user.followups.length - 1]
            const followupDate = new Date(latestFollowup.followupDate)
            return followupDate.getFullYear() === currentYear && 
                   followupDate.getMonth() === currentMonth
          }).length,
          overdueFollowup: allUsers.filter(user => {
            if (!user.followups || user.followups.length === 0) return false
            const latestFollowup = user.followups[user.followups.length - 1]
            if (!latestFollowup.nextFollowupDate) return false
            const nextDate = new Date(latestFollowup.nextFollowupDate)
            return nextDate < today
          }).length,
          noFollowupRecords: allUsers.filter(user => 
            !user.followups || user.followups.length === 0
          ).length
        }
        
        this.setData({ overviewData })
      }
    } catch (error) {
      console.error('获取数据总览失败:', error)
      showToast('数据总览加载失败', 'error')
    } finally {
      this.setData({ overviewLoading: false })
    }
  },

  // ... 保持已有代码
})
