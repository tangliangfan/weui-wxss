
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
    // 新增数据总览统计
    dashboardStats: {
      totalUsers: 0, // 用户总人数
      newUsersThisYear: 0, // 本年新增用户数
      followedThisMonth: 0, // 本月已随访人数
      overdueFollowup: 0, // 已过随访日期人数
      noFollowupRecords: 0 // 无随访记录人数
    },
    // 图表数据
    chartData: {
      labels: ['总用户', '本年新增', '本月随访', '已过期', '无记录'],
      datasets: [{
        data: [0, 0, 0, 0, 0],
        backgroundColor: ['#4f46e5', '#10b981', '#f59e0b', '#ef4444', '#6b7280']
      }]
    }
  },

  // 页面加载生命周期函数
  onLoad() {
    // 页面加载时获取用户列表
    this.fetchUsers()
  },

  // 页面显示生命周期函数 - 修改刷新逻辑
  onShow() {
    // 检查是否需要刷新数据
    if (this.data.needRefresh) {
      this.fetchUsers()
    }
  },

  // 下拉刷新生命周期函数
  onPullDownRefresh() {
    // 下拉刷新时重新获取用户列表，完成后停止下拉刷新动画
    this.fetchUsers().finally(() => {
      wx.stopPullDownRefresh()
    })
  },

  // 获取用户列表 - 使用云函数
  async fetchUsers() {
    try {
      // 设置加载状态为true，显示加载动画
      this.setData({ loading: true })
      // 调用云函数获取用户列表，不传搜索条件获取所有用户
      const result = await callCloudFunction('getUsers', {})
      
      // 检查云函数返回结果是否成功且有数据
      if (result.success && result.data && result.data.records) {
        const allUsers = result.data.records
        const today = new Date()
        const currentYear = today.getFullYear()
        const currentMonth = today.getMonth()
        
        // 计算统计数据
        const stats = this.calculateDashboardStats(allUsers, currentYear, currentMonth)
        
        // 筛选出需要随访的用户（7天内或已过期）
        const followupUsers = allUsers.filter(user => {
          if (!user.followups || user.followups.length === 0) return false
          const latestFollowup = user.followups[user.followups.length - 1]
          if (!latestFollowup.nextFollowupDate) return false
          const nextFollowupDate = new Date(latestFollowup.nextFollowupDate)
          const sevenDaysLater = new Date()
          sevenDaysLater.setDate(today.getDate() + 7)
          return nextFollowupDate <= sevenDaysLater
        })
        
        // 格式化用户数据
        const formattedUsers = followupUsers.map(user => {
          const formattedUser = { ...user };
          if (user.followups && user.followups.length > 0) {
            const latestFollowup = user.followups[user.followups.length - 1];
            formattedUser.formattedNextFollowupDate = this.formatDateForDisplay(latestFollowup.nextFollowupDate);
          }
          
          const statusInfo = this.getStatusInfo(user);
          formattedUser.statusClass = statusInfo.class;
          formattedUser.statusText = statusInfo.text;
          
          return formattedUser;
        });
        
        // 更新页面数据
        this.setData({
          users: formattedUsers,
          filteredUsers: formattedUsers,
          dashboardStats: stats,
          chartData: {
            labels: ['总用户', '本年新增', '本月随访', '已过期', '无记录'],
            datasets: [{
              data: [
                stats.totalUsers,
                stats.newUsersThisYear,
                stats.followedThisMonth,
                stats.overdueFollowup,
                stats.noFollowupRecords
              ],
              backgroundColor: ['#4f46e5', '#10b981', '#f59e0b', '#ef4444', '#6b7280']
            }]
          },
          lastRefreshTime: Date.now(),
          needRefresh: false
        })
      }
    } catch (error) {
      console.error('查询用户数据失败:', error)
      showToast('数据加载失败，请稍后重试', 'error')
    } finally {
      this.setData({ loading: false })
    }
  },

  // 计算数据总览统计
  calculateDashboardStats(users, currentYear, currentMonth) {
    let totalUsers = users.length
    let newUsersThisYear = 0
    let followedThisMonth = 0
    let overdueFollowup = 0
    let noFollowupRecords = 0

    users.forEach(user => {
      // 统计本年新增用户
      if (user.createdAt) {
        const createDate = new Date(user.createdAt)
        if (createDate.getFullYear() === currentYear) {
          newUsersThisYear++
        }
      }

      // 统计本月随访和过期随访
      if (user.followups && user.followups.length > 0) {
        const latestFollowup = user.followups[user.followups.length - 1]
        
        // 统计本月随访
        if (latestFollowup.followupDate) {
          const followupDate = new Date(latestFollowup.followupDate)
          if (followupDate.getFullYear() === currentYear && 
              followupDate.getMonth() === currentMonth) {
            followedThisMonth++
          }
        }

        // 统计过期随访
        if (latestFollowup.nextFollowupDate) {
          const nextDate = new Date(latestFollowup.nextFollowupDate)
          if (nextDate < new Date()) {
            overdueFollowup++
          }
        }
      } else {
        // 无随访记录
        noFollowupRecords++
      }
    })

    return {
      totalUsers,
      newUsersThisYear,
      followedThisMonth,
      overdueFollowup,
      noFollowupRecords
    }
  },

  // 搜索输入处理函数
  onSearchInput(e) {
    const searchText = e.detail.value
    this.setData({ searchText })
    
    const filteredUsers = this.data.users.filter(user => 
      (user.name && user.name.includes(searchText)) ||
      (user.phone && user.phone.includes(searchText)) ||
      (user.address && user.address.includes(searchText))
    )
    
    this.setData({ filteredUsers })
  },

  // 搜索按钮点击事件处理 - 使用云函数搜索
  async handleSearch() {
    const { searchText } = this.data
    if (!searchText.trim()) {
      showToast('请输入搜索内容', 'error')
      return
    }

    try {
      this.setData({ searchLoading: true })
      const result = await callCloudFunction('getUsers', { searchText })
      
      const formattedResults = result.success ? result.data.records.map(user => {
        const formattedUser = { ...user };
        if (user.followups && user.followups.length > 0) {
          const latestFollowup = user.followups[user.followups.length - 1];
          formattedUser.formattedNextFollowupDate = this.formatDateForDisplay(latestFollowup.nextFollowupDate);
        }
        
        const statusInfo = this.getStatusInfo(user);
        formattedUser.statusClass = statusInfo.class;
        formattedUser.statusText = statusInfo.text;
        
        return formattedUser;
      }) : [];
      
      this.setData({
        searchResults: formattedResults,
        showSearchModal: true
      })
    } catch (error) {
      console.error('搜索失败:', error)
      showToast('搜索过程中出现错误', 'error')
    } finally {
      this.setData({ searchLoading: false })
    }
  },

  // 添加新用户按钮点击事件
  handleAddUser() {
    this.setData({
      showAddUserModal: true,
      newUserForm: {
        name: '',
        phone: '',
        address: '',
        diseases: '',
        medications: ''
      }
    })
  },

  // 表单输入处理函数
  onFormInput(e) {
    const { field } = e.currentTarget.dataset
    const value = e.detail.value
    this.setData({
      [`newUserForm.${field}`]: value
    })
  },

  // 保存新用户 - 使用云函数
  async handleSaveNewUser() {
    const { newUserForm } = this.data
    if (!newUserForm.name || !newUserForm.phone || !newUserForm.address) {
      showToast('请填写姓名、手机号和地址', 'error')
      return
    }

    try {
      this.setData({ addUserLoading: true })
      
      const diseasesArray = newUserForm.diseases ? 
        newUserForm.diseases.split('、').map(d => d.trim()).filter(d => d) : []
      
      const medicationsArray = newUserForm.medications ? 
        newUserForm.medications.split('\n').map(m => m.trim()).filter(m => m) : []

      await callCloudFunction('createUser', {
        userData: {
          name: newUserForm.name,
          phone: newUserForm.phone,
          address: newUserForm.address,
          diseases: diseasesArray,
          medications: medicationsArray,
          followups: [],
          createdAt: new Date().toISOString()
        }
      })

      showToast('用户信息已保存', 'success')
      this.setData({ showAddUserModal: false })
      this.fetchUsers()
    } catch (error) {
      console.error('添加用户失败:', error)
      showToast('无法保存用户信息', 'error')
    } finally {
      this.setData({ addUserLoading: false })
    }
  },

  // 用户点击跳转到详情页
  handleUserClick(e) {
    const user = e.currentTarget.dataset.user
    this.setData({
      showSearchModal: false,
      searchText: ''
    })
    
    this.setData({ needRefresh: true })
    
    wx.navigateTo({
      url: `/pages/userDetail/userDetail?id=${user._id}`
    })
  },

  // 搜索结果点击事件处理
  handleSearchResultClick(e) {
    const user = e.currentTarget.dataset.user
    this.setData({ showSearchModal: false })
    
    this.setData({ needRefresh: true })
    
    wx.navigateTo({
      url: `/pages/userDetail/userDetail?id=${user._id}`
    })
  },

  // 删除用户按钮点击事件
  handleDeleteClick(e) {
    const user = e.currentTarget.dataset.user
    this.setData({
      userToDelete: user,
      showDeleteDialog: true
    })
  },

  // 确认删除操作
  async confirmDelete() {
    const { userToDelete } = this.data
    if (!userToDelete) return

    try {
      this.setData({ deleting: true })
      
      await callCloudFunction('deleteUser', { userId: userToDelete._id })
      
      showToast('用户信息已删除', 'success')
      
      this.setData({
        searchResults: this.data.searchResults.filter(user => user._id !== userToDelete._id)
      })
      
      this.fetchUsers()
    } catch (error) {
      console.error('删除用户失败:', error)
      showToast('无法删除用户信息', 'error')
    } finally {
      this.setData({
        deleting: false,
        showDeleteDialog: false,
        userToDelete: null
      })
    }
  },

  // 计算天数差辅助函数
  getDaysDiff(dateStr) {
    const today = new Date()
    const followupDate = new Date(dateStr)
    const diffTime = followupDate - today
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  },

  // 获取用户状态信息辅助函数
  getStatusInfo(user) {
    if (!user.followups || user.followups.length === 0) {
      return {
        text: '无随访记录',
        class: 'status-badge secondary'
      }
    }

    const latestFollowup = user.followups[user.followups.length - 1]
    if (!latestFollowup.nextFollowupDate) {
      return {
        text: '无下次随访',
        class: 'status-badge secondary'
      }
    }

    const daysDiff = this.getDaysDiff(latestFollowup.nextFollowupDate)
    
    if (daysDiff < 0) {
      return {
        text: `已过期 ${Math.abs(daysDiff)}天`,
        class: 'status-badge danger'
      }
    } else if (daysDiff <= 7) {
      return {
        text: `${daysDiff}天后`,
        class: 'status-badge success'
      }
    } else {
      return {
        text: `${daysDiff}天后`,
        class: 'status-badge secondary'
      }
    }
  },

  // 格式化日期显示函数
  formatDateForDisplay(dateStr) {
    if (!dateStr) return '未设置日期'
    
    try {
      const date = new Date(dateStr)
      const year = date.getFullYear()
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const day = String(date.getDate()).padStart(2, '0')
      return `${year}-${month}-${day}`
    } catch (error) {
      console.error('日期格式化错误:', error)
      return dateStr
    }
  },

  // 关闭所有模态框的通用函数
  hideModal() {
    this.setData({
      showSearchModal: false,
      showAddUserModal: false,
      showDeleteDialog: false
    })
  },

  // 专门关闭搜索弹窗的函数
  hideSearchModal() {
    this.setData({
      showSearchModal: false
    })
  }
})
  