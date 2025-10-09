
// 修改说明：修复了编辑随访输入处理函数，正确处理 FollowupModal 组件传递的数据
// 原方法：onEditFollowupInput(e) 使用 e.currentTarget.dataset.field 和 e.detail.value
// 修改后：直接使用 e.detail.field 和 e.detail.value，确保数据正确同步

const { callCloudFunction, showToast, showLoading, hideLoading } = require('../../utils/cloud')
const { formatDate } = require('../../utils/util')

Page({
  data: {
    userId: '',
    userData: null,
    loading: true,
    saving: false,
    showFollowupDialog: false,
    showEditFollowupDialog: false,
    showBasicEditDialog: false,
    showHealthEditDialog: false,
    newFollowup: {
      followupDate: '',
      nextFollowupDate: '',
      content: ''
    },
    editFollowupForm: {
      index: -1,
      followupDate: '',
      nextFollowupDate: '',
      content: ''
    },
    editForm: {
      phone: '',
      address: '',
      diseases: '',
      medications: ''
    },
    userInitial: '?',
    currentDate: '',
    newFollowupDateError: false,
    editFollowupDateError: false
  },

  onLoad(options) {
    const { id } = options
    if (id) {
      this.setData({ userId: id })
      this.fetchUserData()
    } else {
      showToast('用户ID不存在', 'error')
      wx.navigateBack()
    }
    
    // 设置当前日期
    const today = new Date().toISOString().split('T')[0]
    this.setData({ currentDate: today })
  },

  // 获取用户详情数据
  async fetchUserData() {
    try {
      this.setData({ loading: true })
      const result = await callCloudFunction('getUserDetail', {
        userId: this.data.userId
      })
      
      if (result && result.success && result.data) {
        const userData = result.data
        
        const processedUserData = {
          name: userData.name || '未命名用户',
          phone: userData.phone || '',
          address: userData.address || '',
          diseases: userData.diseases || [],
          medications: userData.medications || [],
          followups: userData.followups || []
        }
        
        // 格式化随访记录并计算状态 - 优化性能，只处理最后两条记录
        if (processedUserData.followups && processedUserData.followups.length > 0) {
          processedUserData.followups = this.processFollowupsWithStatusOptimized(processedUserData.followups)
        }
        
        const userInitial = processedUserData.name ? processedUserData.name.charAt(0) : '?'
        
        this.setData({ 
          userData: processedUserData,
          userInitial: userInitial
        })
      } else {
        const errorMessage = result?.message || '用户不存在'
        showToast(errorMessage, 'error')
        setTimeout(() => {
          this.handleBack()
        }, 1500)
      }
    } catch (error) {
      console.error('获取用户详情失败:', error)
      showToast('获取用户详情失败，请稍后重试', 'error')
    } finally {
      this.setData({ loading: false })
    }
  },

  // 优化后的随访记录状态计算方法 - 只处理最后两条记录
  processFollowupsWithStatusOptimized(followups) {
    const totalRecords = followups.length
    
    // 如果记录数量很少，直接处理所有记录
    if (totalRecords <= 2) {
      return followups.map((followup, index) => {
        const hasNextFollowup = index < totalRecords - 1
        let nextFollowupStatus = this.calculateNextFollowupStatus(followup.nextFollowupDate)
        
        // 如果当前记录状态为 expired 且存在下一条随访记录，则变更为 passed 状态
        if (nextFollowupStatus === 'expired' && hasNextFollowup) {
          nextFollowupStatus = 'passed'
        }
        
        return {
          ...followup,
          formattedFollowupDate: this.formatDate(followup.followupDate),
          formattedNextFollowupDate: this.formatDate(followup.nextFollowupDate),
          nextFollowupStatus: nextFollowupStatus
        }
      })
    }
    
    // 对于大量记录，只处理最后两条记录，前面的记录保持原样
    return followups.map((followup, index) => {
      // 只处理最后两条记录
      if (index >= totalRecords - 2) {
        const hasNextFollowup = index < totalRecords - 1
        let nextFollowupStatus = this.calculateNextFollowupStatus(followup.nextFollowupDate)
        
        // 如果当前记录状态为 expired 且存在下一条随访记录，则变更为 passed 状态
        if (nextFollowupStatus === 'expired' && hasNextFollowup) {
          nextFollowupStatus = 'passed'
        }
        
        return {
          ...followup,
          formattedFollowupDate: this.formatDate(followup.followupDate),
          formattedNextFollowupDate: this.formatDate(followup.nextFollowupDate),
          nextFollowupStatus: nextFollowupStatus
        }
      } else {
        // 前面的记录保持原样，只确保有基本的状态字段
        return {
          ...followup,
          formattedFollowupDate: this.formatDate(followup.followupDate),
          formattedNextFollowupDate: this.formatDate(followup.nextFollowupDate),
          nextFollowupStatus: followup.nextFollowupStatus || this.calculateNextFollowupStatus(followup.nextFollowupDate)
        }
      }
    })
  },

  // 计算下次随访日期状态
  calculateNextFollowupStatus(nextFollowupDate) {
    if (!nextFollowupDate) return 'passed'
    
    const today = new Date()
    const nextDate = new Date(nextFollowupDate)
    const timeDiff = nextDate.getTime() - today.getTime()
    const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24))
    
    if (daysDiff > 0) {
      return 'active'
    } else if (daysDiff === 0) {
      return 'expired'
    } else {
      return 'passed'
    }
  },

  // 返回上一页
  handleBack() {
    wx.navigateBack()
  },

  // 打开新增随访弹窗
  handleAddFollowup() {
    const today = new Date().toISOString().split('T')[0]
    const nextWeek = new Date()
    nextWeek.setDate(nextWeek.getDate() + 7)
    const nextWeekStr = nextWeek.toISOString().split('T')[0]
    
    this.setData({
      showFollowupDialog: true,
      newFollowup: {
        followupDate: today,
        nextFollowupDate: nextWeekStr,
        content: ''
      },
      newFollowupDateError: false
    })
  },

  // 打开编辑随访弹窗
  handleEditFollowup(e) {
    const { index } = e.currentTarget.dataset
    const { userData } = this.data
    
    if (userData.followups && userData.followups[index]) {
      const followup = userData.followups[index]
      this.setData({
        showEditFollowupDialog: true,
        editFollowupForm: {
          index: index,
          followupDate: followup.followupDate || '',
          nextFollowupDate: followup.nextFollowupDate || '',
          content: followup.content || ''
        },
        editFollowupDateError: false
      })
    }
  },

  // 新增随访输入处理
  onNewFollowupInput(e) {
    const { field } = e.currentTarget.dataset
    const value = e.detail.value
    
    this.setData({
      [`newFollowup.${field}`]: value
    })
    
    // 验证日期
    if (field === 'nextFollowupDate' || field === 'followupDate') {
      this.validateNewFollowupDates()
    }
  },

  // 编辑随访输入处理 - 修复数据同步问题
  onEditFollowupInput(e) {
    const { field, value } = e.detail
    
    // 直接使用 FollowupModal 组件传递过来的数据更新 editFollowupForm
    this.setData({
      [`editFollowupForm.${field}`]: value
    })
    
    // 验证日期
    if (field === 'nextFollowupDate' || field === 'followupDate') {
      this.validateEditFollowupDates()
    }
  },

  // 新增随访日期验证
  validateNewFollowupDates() {
    const { followupDate, nextFollowupDate } = this.data.newFollowup
    
    if (followupDate && nextFollowupDate) {
      const followup = new Date(followupDate)
      const nextFollowup = new Date(nextFollowupDate)
      const dateError = nextFollowup < followup
      
      this.setData({ newFollowupDateError: dateError })
    } else {
      this.setData({ newFollowupDateError: false })
    }
  },

  // 编辑随访日期验证
  validateEditFollowupDates() {
    const { followupDate, nextFollowupDate } = this.data.editFollowupForm
    
    if (followupDate && nextFollowupDate) {
      const followup = new Date(followupDate)
      const nextFollowup = new Date(nextFollowupDate)
      const dateError = nextFollowup < followup
      
      this.setData({ editFollowupDateError: dateError })
    } else {
      this.setData({ editFollowupDateError: false })
    }
  },

  // 新增随访验证回调
  onNewFollowupValidation(e) {
    this.setData({ newFollowupDateError: !e.detail.isValid })
  },

  // 编辑随访验证回调
  onEditFollowupValidation(e) {
    this.setData({ editFollowupDateError: !e.detail.isValid })
  },

  // 保存随访记录
  async handleSaveFollowup() {
    const { newFollowup, userData, newFollowupDateError } = this.data
    
    if (newFollowupDateError) {
      showToast('下次随访日期不能早于本次随访日期', 'error')
      return
    }
    
    if (!newFollowup.followupDate || !newFollowup.nextFollowupDate || !newFollowup.content) {
      showToast('请填写完整的随访信息', 'error')
      return
    }

    try {
      this.setData({ saving: true })
      
      const newFollowupRecord = {
        followupDate: newFollowup.followupDate,
        nextFollowupDate: newFollowup.nextFollowupDate,
        content: newFollowup.content,
        createdAt: new Date().toISOString()
      }

      const currentFollowups = userData.followups || []
      let updatedFollowups = [...currentFollowups]
      
      // 智能更新上一条记录的下次随访日期
      if (currentFollowups.length > 0) {
        const lastFollowupIndex = currentFollowups.length - 1
        const lastFollowup = currentFollowups[lastFollowupIndex]
        
        // 如果本次随访日期早于上条记录的下次随访日期，更新上条记录
        if (lastFollowup.nextFollowupDate && new Date(newFollowup.followupDate) < new Date(lastFollowup.nextFollowupDate)) {
          updatedFollowups[lastFollowupIndex] = {
            ...lastFollowup,
            nextFollowupDate: newFollowup.followupDate,
            formattedNextFollowupDate: this.formatDate(newFollowup.followupDate),
            nextFollowupStatus: this.calculateNextFollowupStatus(newFollowup.followupDate)
          }
        }
      }

      // 调用云函数添加随访记录
      await callCloudFunction('addFollowup', {
        userId: this.data.userId,
        followupData: newFollowupRecord,
        updatePreviousFollowup: currentFollowups.length > 0,
        previousFollowups: updatedFollowups
      })

      // 重新处理随访记录的状态 - 使用优化后的方法
      const allFollowups = [...updatedFollowups, newFollowupRecord]
      const processedFollowups = this.processFollowupsWithStatusOptimized(allFollowups)

      this.setData({
        'userData.followups': processedFollowups,
        showFollowupDialog: false,
        newFollowup: {
          followupDate: '',
          nextFollowupDate: '',
          content: ''
        },
        newFollowupDateError: false
      })

      showToast('随访记录已保存', 'success')
      
      // 设置全局刷新标志，通知首页刷新数据
      this.setGlobalRefreshFlag()
    } catch (error) {
      console.error('保存随访记录失败:', error)
      showToast('保存随访记录失败', 'error')
    } finally {
      this.setData({ saving: false })
    }
  },

  // 保存编辑的随访记录
  async handleSaveEditFollowup() {
    const { editFollowupForm, userData, editFollowupDateError } = this.data
    
    if (editFollowupDateError) {
      showToast('下次随访日期不能早于本次随访日期', 'error')
      return
    }
    
    if (!editFollowupForm.followupDate || !editFollowupForm.nextFollowupDate || !editFollowupForm.content) {
      showToast('请填写完整的随访信息', 'error')
      return
    }

    try {
      this.setData({ saving: true })
      
      const updatedFollowups = [...userData.followups]
      const updatedFollowup = {
        ...updatedFollowups[editFollowupForm.index],
        followupDate: editFollowupForm.followupDate,
        nextFollowupDate: editFollowupForm.nextFollowupDate,
        content: editFollowupForm.content
      }
      
      updatedFollowups[editFollowupForm.index] = updatedFollowup

      // 重新处理随访记录的状态 - 使用优化后的方法
      const processedFollowups = this.processFollowupsWithStatusOptimized(updatedFollowups)

      // 调用云函数更新随访记录
      await callCloudFunction('updateUser', {
        userId: this.data.userId,
        updateData: {
          followups: processedFollowups
        }
      })

      this.setData({
        'userData.followups': processedFollowups,
        showEditFollowupDialog: false,
        editFollowupForm: {
          index: -1,
          followupDate: '',
          nextFollowupDate: '',
          content: ''
        },
        editFollowupDateError: false
      })

      showToast('随访记录已更新', 'success')
      
      // 设置全局刷新标志，通知首页刷新数据
      this.setGlobalRefreshFlag()
    } catch (error) {
      console.error('更新随访记录失败:', error)
      showToast('更新随访记录失败', 'error')
    } finally {
      this.setData({ saving: false })
    }
  },

  // 打开基本信息编辑弹窗
  handleOpenBasicEdit() {
    const { userData } = this.data
    this.setData({
      showBasicEditDialog: true,
      editForm: {
        phone: userData.phone || '',
        address: userData.address || '',
        diseases: userData.diseases ? userData.diseases.join('、') : '',
        medications: userData.medications ? userData.medications.join('\n') : ''
      }
    })
  },

  // 表单输入处理
  onEditFormInput(e) {
    const { field } = e.currentTarget.dataset
    const value = e.detail.value
    this.setData({
      [`editForm.${field}`]: value
    })
  },

  // 保存基本信息编辑
  async handleSaveBasicEdit() {
    const { editForm } = this.data
    if (!editForm.phone || !editForm.address) {
      showToast('请填写电话和地址', 'error')
      return
    }

    try {
      this.setData({ saving: true })
      
      await callCloudFunction('updateUser', {
        userId: this.data.userId,
        updateData: {
          phone: editForm.phone,
          address: editForm.address
        }
      })

      this.setData({
        'userData.phone': editForm.phone,
        'userData.address': editForm.address,
        showBasicEditDialog: false
      })

      showToast('基本信息已更新', 'success')
      
      // 设置全局刷新标志，通知首页刷新数据
      this.setGlobalRefreshFlag()
    } catch (error) {
      console.error('保存基本信息失败:', error)
      showToast('保存基本信息失败', 'error')
    } finally {
      this.setData({ saving: false })
    }
  },

  // 打开健康档案编辑弹窗
  handleOpenHealthEdit() {
    const { userData } = this.data
    this.setData({
      showHealthEditDialog: true,
      editForm: {
        phone: '',
        address: '',
        diseases: userData.diseases ? userData.diseases.join('、') : '',
        medications: userData.medications ? userData.medications.join('\n') : ''
      }
    })
  },

  // 保存健康档案编辑
  async handleSaveHealthEdit() {
    const { editForm } = this.data
    
    if (editForm.diseases && editForm.diseases.trim()) {
      const diseasesArray = editForm.diseases.split('、').map(d => d.trim()).filter(d => d)
      if (diseasesArray.length > 1 && !editForm.diseases.includes('、')) {
        showToast('请使用顿号分隔多个疾病', 'error')
        return
      }
    } else {
      showToast('请填写基础疾病', 'error')
      return
    }

    if (editForm.medications && editForm.medications.trim()) {
      const medicationsArray = editForm.medications.split('\n').map(m => m.trim()).filter(m => m)
      if (medicationsArray.length > 1 && !editForm.medications.includes('\n')) {
        showToast('请使用换行分隔多种用药', 'error')
        return
      }
    } else {
      showToast('请填写用药情况', 'error')
      return
    }

    try {
      this.setData({ saving: true })
      
      const diseasesArray = editForm.diseases.split('、').map(d => d.trim()).filter(d => d)
      const medicationsArray = editForm.medications.split('\n').map(m => m.trim()).filter(m => m)

      if (diseasesArray.length === 0) {
        showToast('请填写有效的基础疾病信息', 'error')
        this.setData({ saving: false })
        return
      }

      if (medicationsArray.length === 0) {
        showToast('请填写有效的用药情况信息', 'error')
        this.setData({ saving: false })
        return
      }

      await callCloudFunction('updateUser', {
        userId: this.data.userId,
        updateData: {
          diseases: diseasesArray,
          medications: medicationsArray
        }
      })

      this.setData({
        'userData.diseases': diseasesArray,
        'userData.medications': medicationsArray,
        showHealthEditDialog: false
      })

      showToast('健康档案已更新', 'success')
      
      // 设置全局刷新标志，通知首页刷新数据
      this.setGlobalRefreshFlag()
    } catch (error) {
      console.error('保存健康档案失败:', error)
      showToast('保存健康档案失败', 'error')
    } finally {
      this.setData({ saving: false })
    }
  },

  // 设置全局刷新标志
  setGlobalRefreshFlag() {
    // 获取首页页面实例
    const pages = getCurrentPages()
    if (pages.length > 1) {
      const indexPage = pages[0]
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
      showFollowupDialog: false,
      showEditFollowupDialog: false,
      showBasicEditDialog: false,
      showHealthEditDialog: false,
      newFollowupDateError: false,
      editFollowupDateError: false
    })
  },

  // 格式化日期显示
  formatDate(dateStr) {
    if (!dateStr) return '未设置日期'
    return formatDate(dateStr)
  }
})
  