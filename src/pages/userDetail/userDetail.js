
const { callCloudFunction, showToast, showLoading, hideLoading } = require('../../utils/cloud')
const { formatDate } = require('../../utils/util')

Page({
  data: {
    userId: '',
    userData: null,
    loading: true,
    saving: false,
    showFollowupDialog: false,
    showBasicEditDialog: false,
    showHealthEditDialog: false,
    newFollowup: {
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
    // 新增：存储用户姓氏首字母
    userInitial: '?'
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
  },

  // 获取用户详情数据 - 使用云函数
  async fetchUserData() {
    try {
      this.setData({ loading: true })
      const result = await callCloudFunction('getUserDetail', {
        userId: this.data.userId
      })
      
      // 修复：正确处理云函数返回的数据格式，确保数据完整性
      if (result && result.success && result.data) {
        const userData = result.data
        
        // 确保用户数据包含必要的字段，设置默认值
        const processedUserData = {
          name: userData.name || '未命名用户',
          phone: userData.phone || '',
          address: userData.address || '',
          diseases: userData.diseases || [],
          medications: userData.medications || [],
          followups: userData.followups || []
        }
        
        // 格式化随访记录的日期字段
        if (processedUserData.followups && processedUserData.followups.length > 0) {
          processedUserData.followups = processedUserData.followups.map(followup => ({
            ...followup,
            formattedFollowupDate: this.formatDate(followup.followupDate),
            formattedNextFollowupDate: this.formatDate(followup.nextFollowupDate)
          }))
        }
        
        // 计算用户姓氏首字母
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
      }
    })
  },

  // 新增随访输入处理
  onNewFollowupInput(e) {
    const { field } = e.currentTarget.dataset
    const value = e.detail.value
    this.setData({
      [`newFollowup.${field}`]: value
    })
  },

  // 保存随访记录 - 使用云函数
  async handleSaveFollowup() {
    const { newFollowup, userData } = this.data
    if (!newFollowup.nextFollowupDate || !newFollowup.content) {
      showToast('请填写下次随访日期和随访内容', 'error')
      return
    }

    try {
      this.setData({ saving: true })
      
      // 构建新的随访记录
      const newFollowupRecord = {
        followupDate: newFollowup.followupDate,
        nextFollowupDate: newFollowup.nextFollowupDate,
        content: newFollowup.content,
        createdAt: new Date().toISOString()
      }

      // 获取当前随访记录
      const currentFollowups = userData.followups || []
      let updatedFollowups = [...currentFollowups]
      
      // 如果存在之前的随访记录，更新上一条记录的下次随访日期
      if (currentFollowups.length > 0) {
        const lastFollowupIndex = currentFollowups.length - 1
        // 创建更新后的随访记录数组
        updatedFollowups = currentFollowups.map((followup, index) => {
          if (index === lastFollowupIndex) {
            // 更新最后一条记录的下次随访日期为本次随访日期
            return {
              ...followup,
              nextFollowupDate: newFollowup.followupDate
            }
          }
          return followup
        })
      }

      // 调用云函数添加随访记录并更新上一条记录
      await callCloudFunction('addFollowup', {
        userId: this.data.userId,
        followupData: newFollowupRecord,
        updatePreviousFollowup: currentFollowups.length > 0, // 标记是否需要更新上一条记录
        previousFollowups: updatedFollowups // 传递更新后的随访记录数组
      })

      // 格式化新添加的随访记录
      const formattedFollowup = {
        ...newFollowupRecord,
        formattedFollowupDate: this.formatDate(newFollowupRecord.followupDate),
        formattedNextFollowupDate: this.formatDate(newFollowupRecord.nextFollowupDate)
      }

      // 更新本地数据
      this.setData({
        'userData.followups': [...updatedFollowups, formattedFollowup],
        showFollowupDialog: false,
        newFollowup: {
          followupDate: '',
          nextFollowupDate: '',
          content: ''
        }
      })

      showToast('随访记录已保存', 'success')
    } catch (error) {
      console.error('保存随访记录失败:', error)
      showToast('保存随访记录失败，请稍后重试', 'error')
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

  // 保存基本信息编辑 - 使用云函数
  async handleSaveBasicEdit() {
    const { editForm } = this.data
    if (!editForm.phone || !editForm.address) {
      showToast('请填写电话和地址', 'error')
      return
    }

    try {
      this.setData({ saving: true })
      
      // 调用云函数更新用户基本信息
      await callCloudFunction('updateUser', {
        userId: this.data.userId,
        updateData: {
          phone: editForm.phone,
          address: editForm.address
        }
      })

      // 更新本地数据
      this.setData({
        'userData.phone': editForm.phone,
        'userData.address': editForm.address,
        showBasicEditDialog: false
      })

      showToast('基本信息已更新', 'success')
    } catch (error) {
      console.error('保存基本信息失败:', error)
      showToast('保存基本信息失败，请稍后重试', 'error')
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

  // 保存健康档案编辑 - 使用云函数
  async handleSaveHealthEdit() {
    const { editForm } = this.data
    
    // 验证基础疾病输入格式 - 必须包含顿号分隔符
    if (editForm.diseases && editForm.diseases.trim()) {
      // 检查是否包含顿号分隔符（单条疾病不需要分隔符，多条必须用顿号）
      const diseasesArray = editForm.diseases.split('、').map(d => d.trim()).filter(d => d)
      if (diseasesArray.length > 1 && !editForm.diseases.includes('、')) {
        showToast('请使用顿号分隔多个疾病', 'error')
        return
      }
    } else {
      showToast('请填写基础疾病', 'error')
      return
    }

    // 验证用药情况输入格式 - 必须包含换行分隔符
    if (editForm.medications && editForm.medications.trim()) {
      // 检查是否包含换行分隔符（单条用药不需要分隔符，多条必须用换行）
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
      
      // 处理数组字段
      const diseasesArray = editForm.diseases.split('、').map(d => d.trim()).filter(d => d)
      const medicationsArray = editForm.medications.split('\n').map(m => m.trim()).filter(m => m)

      // 验证处理后的数据有效性
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

      // 调用云函数更新健康档案
      await callCloudFunction('updateUser', {
        userId: this.data.userId,
        updateData: {
          diseases: diseasesArray,
          medications: medicationsArray
        }
      })

      // 更新本地数据
      this.setData({
        'userData.diseases': diseasesArray,
        'userData.medications': medicationsArray,
        showHealthEditDialog: false
      })

      showToast('健康档案已更新', 'success')
    } catch (error) {
      console.error('保存健康档案失败:', error)
      showToast('保存健康档案失败，请稍后重试', 'error')
    } finally {
      this.setData({ saving: false })
    }
  },

  // 关闭所有弹窗
  hideModal() {
    this.setData({
      showFollowupDialog: false,
      showBasicEditDialog: false,
      showHealthEditDialog: false
    })
  },

  // 格式化日期显示
  formatDate(dateStr) {
    if (!dateStr) return '未设置日期'
    return formatDate(dateStr)
  }
})
