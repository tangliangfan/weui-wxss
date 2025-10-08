
// 随访记录模态框组件
Component({
  properties: {
    // 模态框标题
    modalTitle: {
      type: String,
      value: '随访记录'
    },
    // 模态框副标题
    modalSubtitle: {
      type: String,
      value: ''
    },
    // 随访数据
    followupData: {
      type: Object,
      value: {
        followupDate: '',
        nextFollowupDate: '',
        content: ''
      }
    },
    // 是否正在编辑模式
    isEditing: {
      type: Boolean,
      value: false
    },
    // 是否禁用
    disabled: {
      type: Boolean,
      value: false
    },
    // 确认按钮文字
    confirmText: {
      type: String,
      value: '保存'
    },
    // 最小日期限制
    minDate: {
      type: String,
      value: ''
    }
  },

  data: {
    dateError: false
  },

  methods: {
    // 输入处理
    onInput(e) {
      const { field } = e.currentTarget.dataset
      const value = e.detail.value
      
      // 更新数据
      const newData = { ...this.data.followupData, [field]: value }
      
      // 验证日期
      if (field === 'nextFollowupDate' || field === 'followupDate') {
        this.validateDates(newData)
      }
      
      this.setData({
        followupData: newData
      })
      
      // 触发输入事件
      this.triggerEvent('input', { field, value })
    },

    // 验证日期
    validateDates(data) {
      const { followupDate, nextFollowupDate } = data
      
      if (followupDate && nextFollowupDate) {
        const followup = new Date(followupDate)
        const nextFollowup = new Date(nextFollowupDate)
        const dateError = nextFollowup < followup
        
        this.setData({ dateError })
        
        // 触发验证事件
        this.triggerEvent('validation', { 
          isValid: !dateError,
          error: dateError ? '下次随访日期不能早于本次随访日期' : ''
        })
      } else {
        this.setData({ dateError: false })
        this.triggerEvent('validation', { isValid: true, error: '' })
      }
    },

    // 关闭模态框
    onClose() {
      this.triggerEvent('close')
    },

    // 取消
    onCancel() {
      this.triggerEvent('cancel')
    },

    // 确认
    onConfirm() {
      if (!this.data.dateError) {
        this.triggerEvent('confirm', this.data.followupData)
      }
    }
  },

  // 组件生命周期
  lifetimes: {
    attached() {
      // 初始化时验证日期
      this.validateDates(this.data.followupData)
    }
  }
})
