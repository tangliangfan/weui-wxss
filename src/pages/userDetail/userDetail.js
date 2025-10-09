
// 引入云函数调用工具和工具函数
const { callCloudFunction, showToast, showLoading, hideLoading } = require('../../utils/cloud')
const { formatDate } = require('../../utils/util')

// 页面定义
Page({
  // 页面数据定义
  data: {
    userId: '', // 用户ID
    userData: null, // 用户数据对象
    loading: true, // 加载状态
    saving: false, // 保存状态
    showFollowupDialog: false, // 显示新增随访弹窗
    showEditFollowupDialog: false, // 显示编辑随访弹窗
    showBasicEditDialog: false, // 显示基本信息编辑弹窗
    showHealthEditDialog: false, // 显示健康档案编辑弹窗
    newFollowup: { // 新增随访数据
      followupDate: '', // 本次随访日期
      nextFollowupDate: '', // 下次随访日期
      content: '' // 随访内容
    },
    editFollowupForm: { // 编辑随访表单数据
      index: -1, // 编辑的随访记录索引
      followupDate: '', // 本次随访日期
      nextFollowupDate: '', // 下次随访日期
      content: '' // 随访内容
    },
    editForm: { // 编辑表单数据
      phone: '', // 电话号码
      address: '', // 地址
      diseases: '', // 基础疾病（字符串格式）
      medications: '' // 用药情况（字符串格式）
    },
    userInitial: '?', // 用户姓名首字母
    currentDate: '', // 当前日期
    newFollowupDateError: false, // 新增随访日期错误
    editFollowupDateError: false // 编辑随访日期错误
  },

  // 页面加载生命周期函数
  onLoad(options) {
    // 从页面参数获取用户ID
    const { id } = options
    if (id) {
      // 设置用户ID并获取用户数据
      this.setData({ userId: id })
      this.fetchUserData()
    } else {
      // 用户ID不存在，显示错误并返回
      showToast('用户ID不存在', 'error')
      wx.navigateBack()
    }
    
    // 设置当前日期（YYYY-MM-DD格式）
    const today = new Date().toISOString().split('T')[0]
    this.setData({ currentDate: today })
  },

  // 获取用户详情数据
  async fetchUserData() {
    try {
      // 显示加载状态
      this.setData({ loading: true })
      // 调用云函数获取用户详情
      const result = await callCloudFunction('getUserDetail', {
        userId: this.data.userId
      })
      
      // 处理返回结果
      if (result && result.success && result.data) {
        const userData = result.data
        
        // 处理用户数据，设置默认值
        const processedUserData = {
          name: userData.name || '未命名用户', // 用户姓名
          phone: userData.phone || '', // 电话号码
          address: userData.address || '', // 地址
          diseases: userData.diseases || [], // 基础疾病数组
          medications: userData.medications || [], // 用药情况数组
          followups: userData.followups || [] // 随访记录数组
        }
        
        // 格式化随访记录并计算状态 - 优化性能，只处理最后两条记录
        if (processedUserData.followups && processedUserData.followups.length > 0) {
          processedUserData.followups = this.processFollowupsWithStatusOptimized(processedUserData.followups)
        }
        
        // 获取用户姓名首字母
        const userInitial = processedUserData.name ? processedUserData.name.charAt(0) : '?'
        
        // 更新页面数据
        this.setData({ 
          userData: processedUserData,
          userInitial: userInitial
        })
      } else {
        // 用户不存在或获取失败
        const errorMessage = result?.message || '用户不存在'
        showToast(errorMessage, 'error')
        // 1.5秒后返回上一页
        setTimeout(() => {
          this.handleBack()
        }, 1500)
      }
    } catch (error) {
      // 捕获并处理错误
      console.error('获取用户详情失败:', error)
      showToast('获取用户详情失败，请稍后重试', 'error')
    } finally {
      // 无论成功失败，都关闭加载状态
      this.setData({ loading: false })
    }
  },

  // 优化后的随访记录状态计算方法 - 只处理最后两条记录
  processFollowupsWithStatusOptimized(followups) {
    const totalRecords = followups.length
    
    // 如果记录数量很少，直接处理所有记录
    if (totalRecords <= 2) {
      return followups.map((followup, index) => {
        const hasNextFollowup = index < totalRecords - 1 // 是否有下一条随访记录
        let nextFollowupStatus = this.calculateNextFollowupStatus(followup.nextFollowupDate)
        
        // 如果当前记录状态为 expired 且存在下一条随访记录，则变更为 passed 状态
        if (nextFollowupStatus === 'expired' && hasNextFollowup) {
          nextFollowupStatus = 'passed'
        }
        
        return {
          ...followup, // 保留原有属性
          formattedFollowupDate: this.formatDate(followup.followupDate), // 格式化本次随访日期
          formattedNextFollowupDate: this.formatDate(followup.nextFollowupDate), // 格式化下次随访日期
          nextFollowupStatus: nextFollowupStatus // 下次随访状态
        }
      })
    }
    
    // 对于大量记录，只处理最后两条记录，前面的记录保持原样
    return followups.map((followup, index) => {
      // 只处理最后两条记录
      if (index >= totalRecords - 2) {
        const hasNextFollowup = index < totalRecords - 1 // 是否有下一条随访记录
        let nextFollowupStatus = this.calculateNextFollowupStatus(followup.nextFollowupDate)
        
        // 如果当前记录状态为 expired 且存在下一条随访记录，则变更为 passed 状态
        if (nextFollowupStatus === 'expired' && hasNextFollowup) {
          nextFollowupStatus = 'passed'
        }
        
        return {
          ...followup, // 保留原有属性
          formattedFollowupDate: this.formatDate(followup.followupDate), // 格式化本次随访日期
          formattedNextFollowupDate: this.formatDate(followup.nextFollowupDate), // 格式化下次随访日期
          nextFollowupStatus: nextFollowupStatus // 下次随访状态
        }
      } else {
        // 前面的记录保持原样，只确保有基本的状态字段
        return {
          ...followup, // 保留原有属性
          formattedFollowupDate: this.formatDate(followup.followupDate), // 格式化本次随访日期
          formattedNextFollowupDate: this.formatDate(followup.nextFollowupDate), // 格式化下次随访日期
          nextFollowupStatus: followup.nextFollowupStatus || this.calculateNextFollowupStatus(followup.nextFollowupDate) // 下次随访状态
        }
      }
    })
  },

  // 计算下次随访日期状态
  calculateNextFollowupStatus(nextFollowupDate) {
    if (!nextFollowupDate) return 'passed' // 没有下次随访日期，显示已过期
    
    const today = new Date() // 当前日期
    const nextDate = new Date(nextFollowupDate) // 下次随访日期
    const timeDiff = nextDate.getTime() - today.getTime() // 时间差（毫秒）
    const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24)) // 天数差
    
    if (daysDiff > 0) {
      return 'active' // 未过期，活跃状态
    } else if (daysDiff === 0) {
      return 'expired' // 今天到期，过期状态
    } else {
      return 'passed' // 已过期，已过去状态
    }
  },

  // 返回上一页
  handleBack() {
    wx.navigateBack() // 微信小程序导航返回
  },

  // 打开新增随访弹窗
  handleAddFollowup() {
    const today = new Date().toISOString().split('T')[0] // 今天日期
    const nextWeek = new Date() // 下周日期
    nextWeek.setDate(nextWeek.getDate() + 7) // 加7天
    const nextWeekStr = nextWeek.toISOString().split('T')[0] // 格式化
    
    // 设置新增随访数据和显示弹窗
    this.setData({
      showFollowupDialog: true,
      newFollowup: {
        followupDate: today, // 默认今天
        nextFollowupDate: nextWeekStr, // 默认一周后
        content: '' // 空内容
      },
      newFollowupDateError: false // 重置错误状态
    })
  },

  // 打开编辑随访弹窗
  handleEditFollowup(e) {
    const { index } = e.currentTarget.dataset // 获取点击的随访记录索引
    const { userData } = this.data // 获取用户数据
    
    // 确保随访记录存在
    if (userData.followups && userData.followups[index]) {
      const followup = userData.followups[index] // 获取随访记录
      // 设置编辑表单数据和显示弹窗
      this.setData({
        showEditFollowupDialog: true,
        editFollowupForm: {
          index: index, // 记录索引
          followupDate: followup.followupDate || '', // 本次随访日期
          nextFollowupDate: followup.nextFollowupDate || '', // 下次随访日期
          content: followup.content || '' // 随访内容
        },
        editFollowupDateError: false // 重置错误状态
      })
    }
  },

  // 新增随访输入处理
  onNewFollowupInput(e) {
    const { field } = e.currentTarget.dataset // 获取字段名
    const value = e.detail.value // 获取输入值
    
    // 更新对应字段的值
    this.setData({
      [`newFollowup.${field}`]: value
    })
    
    // 如果是日期字段，验证日期
    if (field === 'nextFollowupDate' || field === 'followupDate') {
      this.validateNewFollowupDates()
    }
  },

  // 编辑随访输入处理
  onEditFollowupInput(e) {
    const { field, value } = e.detail // 从事件详情获取字段名和值
    
    // 直接使用 FollowupModal 组件传递过来的数据更新 editFollowupForm
    this.setData({
      [`editFollowupForm.${field}`]: value
    })
    
    // 如果是日期字段，验证日期
    if (field === 'nextFollowupDate' || field === 'followupDate') {
      this.validateEditFollowupDates()
    }
  },

  // 新增随访日期验证
  validateNewFollowupDates() {
    const { followupDate, nextFollowupDate } = this.data.newFollowup
    
    // 两个日期都存在时才验证
    if (followupDate && nextFollowupDate) {
      const followup = new Date(followupDate) // 本次随访日期
      const nextFollowup = new Date(nextFollowupDate) // 下次随访日期
      const dateError = nextFollowup < followup // 下次日期不能早于本次
      
      this.setData({ newFollowupDateError: dateError }) // 设置错误状态
    } else {
      this.setData({ newFollowupDateError: false }) // 重置错误状态
    }
  },

  // 编辑随访日期验证
  validateEditFollowupDates() {
    const { followupDate, nextFollowupDate } = this.data.editFollowupForm
    
    // 两个日期都存在时才验证
    if (followupDate && nextFollowupDate) {
      const followup = new Date(followupDate) // 本次随访日期
      const nextFollowup = new Date(nextFollowupDate) // 下次随访日期
      const dateError = nextFollowup < followup // 下次日期不能早于本次
      
      this.setData({ editFollowupDateError: dateError }) // 设置错误状态
    } else {
      this.setData({ editFollowupDateError: false }) // 重置错误状态
    }
  },

  // 新增随访验证回调
  onNewFollowupValidation(e) {
    this.setData({ newFollowupDateError: !e.detail.isValid }) // 设置错误状态
  },

  // 编辑随访验证回调
  onEditFollowupValidation(e) {
    this.setData({ editFollowupDateError: !e.detail.isValid }) // 设置错误状态
  },

  // 保存随访记录
  async handleSaveFollowup() {
    const { newFollowup, userData, newFollowupDateError } = this.data
    
    // 验证日期错误
    if (newFollowupDateError) {
      showToast('下次随访日期不能早于本次随访日期', 'error')
      return
    }
    
    // 验证必填字段
    if (!newFollowup.followupDate || !newFollowup.nextFollowupDate || !newFollowup.content) {
      showToast('请填写完整的随访信息', 'error')
      return
    }

    try {
      this.setData({ saving: true }) // 显示保存状态
      
      // 创建新的随访记录对象
      const newFollowupRecord = {
        followupDate: newFollowup.followupDate, // 本次随访日期
        nextFollowupDate: newFollowup.nextFollowupDate, // 下次随访日期
        content: newFollowup.content, // 随访内容
        createdAt: new Date().toISOString() // 创建时间
      }

      const currentFollowups = userData.followups || [] // 当前随访记录
      let updatedFollowups = [...currentFollowups] // 复制数组
      
      // 智能更新上一条记录的下次随访日期
      if (currentFollowups.length > 0) {
        const lastFollowupIndex = currentFollowups.length - 1 // 最后一条记录索引
        const lastFollowup = currentFollowups[lastFollowupIndex] // 最后一条记录
        
        // 如果本次随访日期早于上条记录的下次随访日期，更新上条记录
        if (lastFollowup.nextFollowupDate && new Date(newFollowup.followupDate) < new Date(lastFollowup.nextFollowupDate)) {
          updatedFollowups[lastFollowupIndex] = {
            ...lastFollowup, // 保留原有属性
            nextFollowupDate: newFollowup.followupDate, // 更新下次随访日期
            formattedNextFollowupDate: this.formatDate(newFollowup.followupDate), // 格式化日期
            nextFollowupStatus: this.calculateNextFollowupStatus(newFollowup.followupDate) // 重新计算状态
          }
        }
      }

      // 调用云函数添加随访记录
      await callCloudFunction('addFollowup', {
        userId: this.data.userId, // 用户ID
        followupData: newFollowupRecord, // 随访数据
        updatePreviousFollowup: currentFollowups.length > 0, // 是否需要更新上条记录
        previousFollowups: updatedFollowups // 更新后的随访记录
      })

      // 重新处理随访记录的状态 - 使用优化后的方法
      const allFollowups = [...updatedFollowups, newFollowupRecord] // 合并新旧记录
      const processedFollowups = this.processFollowupsWithStatusOptimized(allFollowups) // 处理状态

      // 更新页面数据
      this.setData({
        'userData.followups': processedFollowups, // 更新随访记录
        showFollowupDialog: false, // 关闭弹窗
        newFollowup: { // 重置表单
          followupDate: '',
          nextFollowupDate: '',
          content: ''
        },
        newFollowupDateError: false // 重置错误状态
      })

      showToast('随访记录已保存', 'success') // 显示成功提示
      
      // 设置全局刷新标志，通知首页刷新数据
      this.setGlobalRefreshFlag()
    } catch (error) {
      // 捕获并处理错误
      console.error('保存随访记录失败:', error)
      showToast('保存随访记录失败', 'error')
    } finally {
      this.setData({ saving: false }) // 关闭保存状态
    }
  },

  // 保存编辑的随访记录
  async handleSaveEditFollowup() {
    const { editFollowupForm, userData, editFollowupDateError } = this.data
    
    // 验证日期错误
    if (editFollowupDateError) {
      showToast('下次随访日期不能早于本次随访日期', 'error')
      return
    }
    
    // 验证必填字段
    if (!editFollowupForm.followupDate || !editFollowupForm.nextFollowupDate || !editFollowupForm.content) {
      showToast('请填写完整的随访信息', 'error')
      return
    }

    try {
      this.setData({ saving: true }) // 显示保存状态
      
      const updatedFollowups = [...userData.followups] // 复制随访记录数组
      const updatedFollowup = {
        ...updatedFollowups[editFollowupForm.index], // 保留原有属性
        followupDate: editFollowupForm.followupDate, // 更新本次随访日期
        nextFollowupDate: editFollowupForm.nextFollowupDate, // 更新下次随访日期
        content: editFollowupForm.content // 更新随访内容
      }
      
      updatedFollowups[editFollowupForm.index] = updatedFollowup // 替换原记录

      // 重新处理随访记录的状态 - 使用优化后的方法
      const processedFollowups = this.processFollowupsWithStatusOptimized(updatedFollowups)

      // 调用云函数更新随访记录
      await callCloudFunction('updateUser', {
        userId: this.data.userId, // 用户ID
        updateData: {
          followups: processedFollowups // 更新后的随访记录
        }
      })

      // 更新页面数据
      this.setData({
        'userData.followups': processedFollowups, // 更新随访记录
        showEditFollowupDialog: false, // 关闭弹窗
        editFollowupForm: { // 重置表单
          index: -1,
          followupDate: '',
          nextFollowupDate: '',
          content: ''
        },
        editFollowupDateError: false // 重置错误状态
      })

      showToast('随访记录已更新', 'success') // 显示成功提示
      
      // 设置全局刷新标志，通知首页刷新数据
      this.setGlobalRefreshFlag()
    } catch (error) {
      // 捕获并处理错误
      console.error('更新随访记录失败:', error)
      showToast('更新随访记录失败', 'error')
    } finally {
      this.setData({ saving: false }) // 关闭保存状态
    }
  },

  // 打开基本信息编辑弹窗
  handleOpenBasicEdit() {
    const { userData } = this.data // 获取用户数据
    this.setData({
      showBasicEditDialog: true, // 显示弹窗
      editForm: {
        phone: userData.phone || '', // 电话号码
        address: userData.address || '', // 地址
        diseases: userData.diseases ? userData.diseases.join('、') : '', // 基础疾病（字符串）
        medications: userData.medications ? userData.medications.join('\n') : '' // 用药情况（字符串）
      }
    })
  },

  // 表单输入处理
  onEditFormInput(e) {
    const { field } = e.currentTarget.dataset // 获取字段名
    const value = e.detail.value // 获取输入值
    // 更新对应字段的值
    this.setData({
      [`editForm.${field}`]: value
    })
  },

  // 保存基本信息编辑
  async handleSaveBasicEdit() {
    const { editForm } = this.data // 获取表单数据
    // 验证必填字段
    if (!editForm.phone || !editForm.address) {
      showToast('请填写电话和地址', 'error')
      return
    }

    try {
      this.setData({ saving: true }) // 显示保存状态
      
      // 调用云函数更新用户信息
      await callCloudFunction('updateUser', {
        userId: this.data.userId, // 用户ID
        updateData: {
          phone: editForm.phone, // 电话号码
          address: editForm.address // 地址
        }
      })

      // 更新页面数据
      this.setData({
        'userData.phone': editForm.phone, // 更新电话号码
        'userData.address': editForm.address, // 更新地址
        showBasicEditDialog: false // 关闭弹窗
      })

      showToast('基本信息已更新', 'success') // 显示成功提示
      
      // 设置全局刷新标志，通知首页刷新数据
      this.setGlobalRefreshFlag()
    } catch (error) {
      // 捕获并处理错误
      console.error('保存基本信息失败:', error)
      showToast('保存基本信息失败', 'error')
    } finally {
      this.setData({ saving: false }) // 关闭保存状态
    }
  },

  // 打开健康档案编辑弹窗
  handleOpenHealthEdit() {
    const { userData } = this.data // 获取用户数据
    this.setData({
      showHealthEditDialog: true, // 显示弹窗
      editForm: {
        phone: '', // 清空电话
        address: '', // 清空地址
        diseases: userData.diseases ? userData.diseases.join('、') : '', // 基础疾病（字符串）
        medications: userData.medications ? userData.medications.join('\n') : '' // 用药情况（字符串）
      }
    })
  },

  // 保存健康档案编辑
  async handleSaveHealthEdit() {
    const { editForm } = this.data // 获取表单数据
    
    // 验证基础疾病字段
    if (editForm.diseases && editForm.diseases.trim()) {
      const diseasesArray = editForm.diseases.split('、').map(d => d.trim()).filter(d => d) // 分割字符串为数组
      // 验证分隔符使用
      if (diseasesArray.length > 1 && !editForm.diseases.includes('、')) {
        showToast('请使用顿号分隔多个疾病', 'error')
        return
      }
    } else {
      showToast('请填写基础疾病', 'error')
      return
    }

    // 验证用药情况字段
    if (editForm.medications && editForm.medications.trim()) {
      const medicationsArray = editForm.medications.split('\n').map(m => m.trim()).filter(m => m) // 分割字符串为数组
      // 验证分隔符使用
      if (medicationsArray.length > 1 && !editForm.medications.includes('\n')) {
        showToast('请使用换行分隔多种用药', 'error')
        return
      }
    } else {
      showToast('请填写用药情况', 'error')
      return
    }

    try {
      this.setData({ saving: true }) // 显示保存状态
      
      // 处理基础疾病数据
      const diseasesArray = editForm.diseases.split('、').map(d => d.trim()).filter(d => d)
      // 处理用药情况数据
      const medicationsArray = editForm.medications.split('\n').map(m => m.trim()).filter(m => m)

      // 验证基础疾病数据有效性
      if (diseasesArray.length === 0) {
        showToast('请填写有效的基础疾病信息', 'error')
        this.setData({ saving: false })
        return
      }

      // 验证用药情况数据有效性
      if (medicationsArray.length === 0) {
        showToast('请填写有效的用药情况信息', 'error')
        this.setData({ saving: false })
        return
      }

      // 调用云函数更新健康档案
      await callCloudFunction('updateUser', {
        userId: this.data.userId, // 用户ID
        updateData: {
          diseases: diseasesArray, // 基础疾病数组
          medications: medicationsArray // 用药情况数组
        }
      })

      // 更新页面数据
      this.setData({
        'userData.diseases': diseasesArray, // 更新基础疾病
        'userData.medications': medicationsArray, // 更新用药情况
        showHealthEditDialog: false // 关闭弹窗
      })

      showToast('健康档案已更新', 'success') // 显示成功提示
      
      // 设置全局刷新标志，通知首页刷新数据
      this.setGlobalRefreshFlag()
    } catch (error) {
      // 捕获并处理错误
      console.error('保存健康档案失败:', error)
      showToast('保存健康档案失败', 'error')
    } finally {
      this.setData({ saving: false }) // 关闭保存状态
    }
  },

  // 设置全局刷新标志
  setGlobalRefreshFlag() {
    // 获取首页页面实例
    const pages = getCurrentPages()
    if (pages.length > 1) {
      const indexPage = pages[0] // 首页页面实例
      if (indexPage && indexPage.setData) {
        // 设置首页的 needRefresh 标志为 true
        indexPage.setData({
          needRefresh: true
        })
      }
    }
  },

  // 关闭所有弹窗
  hideModal() {
    this.setData({
      showFollowupDialog: false, // 关闭新增随访弹窗
      showEditFollowupDialog: false, // 关闭编辑随访弹窗
      showBasicEditDialog: false, // 关闭基本信息编辑弹窗
      showHealthEditDialog: false, // 关闭健康档案编辑弹窗
      newFollowupDateError: false, // 重置新增随访日期错误
      editFollowupDateError: false // 重置编辑随访日期错误
    })
  },

  // 格式化日期显示
  formatDate(dateStr) {
    if (!dateStr) return '未设置日期' // 空值处理
    return formatDate(dateStr) // 调用工具函数格式化日期
  }
})
