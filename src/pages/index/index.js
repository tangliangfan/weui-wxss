
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
      followedThisMonth: 极
    },
    overviewLoading: false, // 总览数据加载状态
    showOverviewDetailModal: false, // 控制数据卡片详情模态框显示
    overviewModalTitle: '', // 数据卡片模态框标题
    overviewDetailUsers: [], // 数据卡片详情用户列表
    overviewDetailLoading: false, // 数据卡片详情加载状态
    currentOverviewType: '' // 当前选中的数据卡片类型
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

  // 获取用户列表 - 使用云函数
  async fetchUsers() {
    try {
      // 设置加载状态为true，显示加载动画
      this.setData({ loading: true })
      // 调用云函数获取用户列表，不传搜索条件获取所有用户
      const result = await callCloudFunction('getUsers', {})
      
      // 检查云函数返回结果是否成功且有数据
      if (result.success && result.data && result.data.records) {
        // 获取当前日期
        const today = new Date()
        // 计算7天后的日期
        const sevenDaysLater = new Date()
        sevenDaysLater.setDate(today.getDate() + 7)
        
        // 筛选出需要随访的用户（7天内或已过期）
        const followupUsers = result.data.records.filter(user => {
          // 如果没有随访记录，过滤掉该用户
          if (!user.followups || user.followups.length === 0) return false

          // 获取最新的随访记录（最后一条记录）
            const latestFollowup = user.followups[user.followups.length - 1]
            // 如果没有下次随访日期，过滤掉该用户
            if (!latestFollowup.nextFollowupDate) return false
            
            // 转换下次随访日期为Date对象
            const nextFollowupDate = new Date(latestFollowup.nextFollowupDate)
            // 筛选条件：下次随访日期在7天内或已过期
            return nextFollowupDate <= sevenDaysLater
          })
          
          // 格式化用户数据，添加格式化后的日期字段和状态信息
          const formattedUsers = followupUsers.map(user => {
            const formattedUser = { ...user };
            if (user.followups && user.followups.length > 0) {
              const latestFollowup = user.followups[user.followups.length - 1];
              formattedUser.formattedNextFollowupDate = this.formatDateForDisplay(latestFollowup.nextFollowupDate);
            }
            
            // 预处理状态信息，避免在 WXML 中调用返回对象的函数
            const statusInfo = this.getStatusInfo(user);
            formattedUser.statusClass = statusInfo.class;
            formattedUser.statusText = statusInfo.text;
            
            return formattedUser;
          });
          
          // 更新页面数据，设置用户列表和过滤后的用户列表
          this.setData({
            users: formattedUsers,
            filteredUsers: formattedUsers,
            lastRefreshTime: Date.now(), // 更新最后刷新时间
            needRefresh: false // 数据刷新完成后重置标志
          })
        }
      } catch (error) {
        // 捕获并记录错误，显示错误提示
        console.error('查询用户数据失败:', error)
        showToast('数据加载失败，请稍后重试', 'error')
      } finally {
        // 无论成功或失败，都设置加载状态为false，隐藏加载动画
        this.setData({ loading: false })
      }
    },
    
    // 数据卡片点击事件处理
    async handleOverviewCardClick(e) {
      const { type } = e.currentTarget.dataset;
      this.setData({ 
        currentOverviewType: type,
        overviewDetailLoading: true,
        showOverviewDetailModal: true
      });
      
      // 设置模态框标题
      let modalTitle = '';
      switch (type) {
        case 'total':
          modalTitle = '所有用户';
          break;
        case 'yearNew':
          modalTitle = '本年新增用户';
          break;
        case 'monthNew':
          modalTitle = '本月新增用户';
          break;
        case 'monthFollowed':
          modalTitle = '本月已随访用户';
          break;
        case 'overdue':
          modalTitle = '过期随访用户';
          break;
        case 'noFollowup':
          modalTitle = '无随访记录用户';
          break;
        default:
          modalTitle = '用户列表';
      }
      
      this.setData({ overviewModalTitle: modalTitle });
      
      try {
        // 调用云函数获取所有用户数据
        const result = await callCloudFunction('getUsers', {});
        
        if (result.success && result.data && result.data.records) {
          const allUsers = result.data.records;
          const currentYear = new Date().getFullYear();
          const currentMonth = new Date().getMonth();
          const today = new Date();
          
          // 根据卡片类型筛选用户
          let filteredUsers = [];
          switch (type) {
            case 'total':
              filteredUsers = allUsers;
              break;
            case 'yearNew':
              filteredUsers = allUsers.filter(user => {
                const createDate = new Date(user.createdAt);
                return createDate.getFullYear() === currentYear;
              });
              break;
            case 'monthNew':
              filteredUsers = allUsers.filter(user => {
                const createDate = new Date(user.createdAt);
                return createDate.getFullYear() === currentYear && 
                       createDate.getMonth() === currentMonth;
              });
              break;
            case 'monthFollowed':
              filteredUsers = allUsers.filter(user => {
                if (!user.followups || user.followups.length === 0) return false;
                const latestFollowup = user.followups[user.followups.length - 1];
                const followupDate = new Date(latestFollowup.followupDate);
                return followupDate.getFullYear() === currentYear && 
                       followupDate.getMonth() === currentMonth;
              });
              break;
            case 'overdue':
              filteredUsers = allUsers.filter(user => {
                if (!user.followups || user.followups.length === 0) return false;
                const latestFollowup = user.followups[user.followups.length - 1];
                if (!latestFollowup.nextFollowupDate) return false;
                const nextDate = new Date(latestFollowup.nextFollowupDate);
                return nextDate < today;
              });
              break;
            case 'noFollowup':
              filteredUsers = allUsers.filter(user => 
                !user.followups || user.followups.length === 0
              );
              break;
          }
          
          // 格式化用户数据 - 修复：为 createdAt 字段添加格式化后的字段
          const formattedUsers = filteredUsers.map(user => {
            const formattedUser = { ...user };
            
            // 格式化创建时间
            if (user.createdAt) {
              formattedUser.formattedCreatedAt = this.formatDateForDisplay(user.createdAt);
            }
            
            // 格式化下次随访日期
            if (user.followups && user.followups.length > 0) {
              const latestFollowup = user.followups[user.followups.length - 1];
              formattedUser.formattedNextFollowupDate = this.formatDateForDisplay(latestFollowup.nextFollowupDate);
            }
            
            // 预处理状态信息
            const statusInfo = this.getStatusInfo(user);
            formattedUser.statusClass = statusInfo.class;
            formattedUser.statusText = statusInfo.text;
            
            return formattedUser;
          });
          
          this.setData({ overviewDetailUsers: formattedUsers });
        }
      } catch (error) {
        console.error('获取用户数据失败:', error);
        showToast('数据加载失败', 'error');
      } finally {
        this.setData({ overviewDetailLoading: false });
      }
    },
    
    // 数据卡片详情用户点击事件
    handleOverviewDetailUserClick(e) {
      const user = e.currentTarget.dataset.user;
      this.hideOverviewDetailModal();
      
      // 设置需要刷新标志，当从详情页返回时刷新数据
      this.setData({ needRefresh: true });
      
      // 跳转到用户详情页面，传递用户ID参数
      wx.navigateTo({
        url: `/pages/userDetail/userDetail?id=${user._id}`
      });
    },
    
    // 关闭数据卡片详情模态框
    hideOverviewDetailModal() {
      this.setData({
        showOverviewDetailModal: false,
        overviewDetailUsers: [],
        overviewDetailLoading: false
      });
    },
    
    // 搜索输入处理函数
    onSearchInput(e) {
      // 获取输入框的值
      const searchText = e.detail.value
      // 更新搜索文本
      this.setData({ searchText })
      
      // 实时过滤用户列表，根据姓名、手机号、地址进行模糊搜索
      const filteredUsers = this.data.users.filter(user => 
        (user.name && user.name.includes(searchText)) ||
        (user.phone && user.phone.includes(searchText)) ||
        (user.address && user.address.includes(searchText))
      )
      
      // 更新过滤后的用户列表
      this.setData({ filteredUsers })
    },
    
    // 搜索按钮点击事件处理 - 使用云函数搜索
    async handleSearch() {
      const { searchText } = this.data
      // 检查搜索文本是否为空
      if (!searchText.trim()) {
        showToast('请输入搜索内容', 'error')
        return
      }
      
      try {
        // 设置搜索加载状态，显示搜索加载动画
        this.setData({ searchLoading: true })
        // 调用云函数进行搜索，传入搜索文本
        const result = await callCloudFunction('getUsers', { searchText })
        
        // 格式化搜索结果数据
        const formattedResults = result.success ? result.data.records.map(user => {
          const formattedUser = { ...user };
          if (user.followups && user.followups.length > 0) {
            const latestFollowup = user.followups[user.followups.length - 1];
            formattedUser.formattedNextFollowupDate = this.formatDateForDisplay(latestFollowup.nextFollowupDate);
          }
          
          // 预处理状态信息
          const statusInfo = this.getStatusInfo(user);
          formattedUser.statusClass = statusInfo.class;
          formattedUser.statusText = statusInfo.text;
          
          return formattedUser;
        }) : [];
        
        // 更新搜索结果列表
        this.setData({
          searchResults: formattedResults,
          showSearchModal: true // 显示搜索模态框
        })
      } catch (error) {
        // 捕获并记录搜索错误，显示错误提示
        console.error('搜索失败:', error)
        showToast('搜索过程中出现错误', 'error')
      } finally {
        // 无论成功或失败，都设置搜索加载状态为false
        this.setData({ searchLoading: false })
      }
    },
    
    // 添加新用户按钮点击事件
    handleAddUser() {
      // 显示添加用户模态框，并重置表单数据
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
      // 获取输入字段名和值
      const { field } = e.currentTarget.dataset
      const value = e.detail.value
      // 动态更新表单对应字段的值
      this.setData({
        [`newUserForm.${field}`]: value
      })
    },
    
    // 保存新用户 - 使用云函数
    async handleSaveNewUser() {
      const { newUserForm } = this.data
      // 表单验证：检查必填字段是否填写
      if (!newUserForm.name || !newUserForm.phone || !newUserForm.address) {
        showToast('请填写姓名、手机号和地址', 'error')
        return
      }
      
      try {
        // 设置添加用户加载状态
        this.setData({ addUserLoading: true })
        
        // 处理数组字段：将字符串转换为数组
        const diseasesArray = newUserForm.diseases ? 
          newUserForm.diseases.split('、').map(d => d.trim()).filter(d => d) : []
        
        const medicationsArray = newUserForm.medications ? 
          newUserForm.medications.split('\n').map(m => m.trim()).filter(m => m) : []
        
        // 创建新用户 - 使用云函数
        await callCloudFunction('createUser', {
          userData: {
            name: newUserForm.name,
            phone: newUserForm.phone,
            address: newUserForm.address,
            diseases: diseasesArray, // 转换为数组格式
            medications: medicationsArray, // 转换为数组格式
            followups: [], // 初始化随访记录为空数组
            createdAt: new Date().toISOString() // 创建时间
          }
        })
        
        // 显示成功提示
        showToast('用户信息已保存', 'success')
        // 关闭添加用户模态框
        this.setData({ showAddUserModal: false })
        
        // 刷新用户列表和数据总览，显示新添加的用户
        this.fetchUsers()
        this.fetchOverviewData()
      } catch (error) {
        // 捕获并记录添加用户错误
        console.error('添加用户失败:', error)
        showToast('无法保存用户信息', 'error')
      } finally {
        // 无论成功或失败，都设置添加用户加载状态为false
        this.setData({ addUserLoading: false })
      }
    },
    
    // 用户点击跳转到详情页
    handleUserClick(e) {
      // 获取点击的用户数据
      const user = e.currentTarget.dataset.user
      // 关闭搜索模态框并清空搜索文本
      this.setData({
        showSearchModal: false,
        searchText: ''
      })
      
      // 设置需要刷新标志，当从详情页返回时刷新数据
      this.setData({ needRefresh: true })
      
      // 跳转到用户详情页面，传递用户ID参数
      wx.navigateTo({
        url: `/pages/userDetail/userDetail?id=${user._id}`
      })
    },
    
    // 搜索结果点击事件处理
    handleSearchResultClick(e) {
      // 获取点击的搜索结果用户数据
      const user = e.currentTarget.dataset.user
      // 关闭搜索模态框
      this.setData({ showSearchModal: false })
      
      // 设置需要刷新标志，当从详情页返回时刷新数据
      this.setData({ needRefresh: true })
      
      // 跳转到用户详情页面，传递用户ID参数
      wx.navigateTo({
        url: `/pages/userDetail/userDetail?id=${user._id}`
      })
    },
    
    // 删除用户按钮点击事件 - 修复 stopPropagation 错误
    handleDeleteClick(e) {
      // 在小程序中，事件对象没有 stopPropagation 方法
      // 使用 WXML 中的 catchtap 来阻止事件冒泡
      
      // 获取要删除的用户数据
      const user = e.currentTarget.dataset.user
      // 显示删除确认对话框，并设置待删除用户
      this.setData({
        userToDelete: user,
        showDeleteDialog: true
      })
    },
    
    // 确认删除操作
    async confirmDelete() {
      const { userToDelete } = this.data
      // 安全检查：确保有要删除的用户
      if (!userToDelete) return
      
      try {
        // 设置删除加载状态
        this.setData({ deleting: true })
        
        // 调用云函数删除用户
        await callCloudFunction('deleteUser', { userId: userToDelete._id })
        
        // 显示删除成功提示
        showToast('用户信息已删除', 'success')
        
        // 更新搜索结果列表，移除已删除的用户
        this.setData({
          searchResults: this.data.searchResults.filter(user => user._id !== userToDelete._id)
        })
        
        // 刷新用户列表和数据总览
        this.fetchUsers()
        this.fetchOverviewData()
      } catch (error) {
        // 捕获并记录删除错误
        console.error('删除用户失败:', error)
        showToast('无法删除用户信息', 'error')
      } finally {
        // 无论成功或失败，都重置删除相关状态
        this.setData({
          deleting: false,
          showDeleteDialog: false,
          userToDelete: null
        })
      }
    },
    
    // 计算天数差辅助函数
    getDaysDiff(dateStr) {
      // 获取当前日期
      const today = new Date()
      // 转换传入的日期字符串为Date对象
      const followupDate = new Date(dateStr)
      // 计算日期差值（毫秒）
      const diffTime = followupDate - today
      // 转换为天数并向上取整
      return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    },
    
    // 获取用户状态信息辅助函数
    getStatusInfo(user) {
      // 如果没有随访记录，返回无随访记录状态
      if (!user.followups || user.followups.length === 0) {
        return {
          text: '无随访记录',
          class: 'status-badge secondary'
        }
      }
      
      // 获取最新的随访记录
      const latestFollowup = user.followups[user.followups.length - 1]
      // 如果没有下次随访日期，返回无下次随访状态
      if (!latestFollowup.nextFollowupDate) {
        return {
          text: '无下次随访',
          class: 'status-badge secondary'
        }
      }
      
      // 计算距离下次随访的天数差
      const daysDiff = this.getDaysDiff(latestFollowup.nextFollowupDate)
      
      // 根据天数差返回不同的状态信息
      if (daysDiff < 0) {
        // 已过期状态
        return {
          text: `已过期 ${Math.abs(daysDiff)}天`,
          class: 'status-badge danger'
        }
      } else if (daysDiff <= 7) {
        // 7天内需要随访状态
        return {
          text: `${daysDiff}天后`,
          class: 'status-badge success'
        }
      } else {
        // 7天外随访状态
        return {
          text: `${daysDiff}天后`,
          class: 'status-badge secondary'
        }
      }
    },
    
    // 获取随访时间显示文本 - 新增函数
    getFollowupTimeText(user) {
      if (!user.followups || user.followups.length === 0) return ''
      
      const latestFollowup = user.followups[user.followups.length - 1]
      if (!latestFollowup.nextFollowupDate) return ''
      
      const daysDiff = this.getDaysDiff(latestFollowup.nextFollowupDate)
      
      if (daysDiff < 0) {
        return `已过期${Math.abs(daysDiff)}天`
      } else {
        return `${daysDiff}天后`
      }
    },
    
    // 获取随访时间显示样式类 - 修改函数，移除 followup-time-normal 状态
    getFollowupTimeClass(user) {
      if (!user.followups || user.followups.length === 0) return ''
      
      const latestFollowup = user.followups[user.followups.length - 1]
      if (!latestFollowup.nextFollowupDate) return ''
      
      const daysDiff = this.getDaysDiff(latestFollowup.nextFollowupDate)
      
      if (daysDiff < 0) {
        return 'followup-time-overdue'
      } else {
        return 'followup-time-remaining'
      }
    },
    
    // 格式化日期显示函数（用于WXML显示）- 修复语法错误
    formatDateForDisplay(dateStr) {
      // 处理空值情况
      if (!dateStr) return '未设置日期'
      
      try {
        // 转换日期字符串为Date对象
        const date = new Date(dateStr)
        // 获取年份
        const year = date.getFullYear()
        // 获取月份（0-11），+1并补零
        const month = String(date.getMonth() + 1).padStart(2, '0')
        // 获取日期，补零
        const day = String(date.getDate()).padStart(2, '0')
        
        // 返回格式化后的日期字符串
        return `${year}-${month}-${day}`
      } catch (error) {
        // 捕获日期解析错误，返回原始字符串
        console.error('日期格式化错误:', error)
        return dateStr
      }
    },
    
    // 关闭所有模态框的通用函数
    hideModal() {
      this.setData({
        showSearchModal: false, // 关闭搜索模态框
        showAddUserModal: false, // 关闭添加用户模态框
        showDeleteDialog: false // 关闭删除确认对话框
      })
    },
    
    // 专门关闭搜索弹窗的函数
    hideSearchModal() {
      this.setData({
        showSearchModal: false // 仅关闭搜索模态框
      })
    },
    
    // 阻止事件冒泡的辅助函数 - 在小程序中不需要此方法
    // 使用 WXML 中的 catchtap 来阻止事件冒泡
  })
  