
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
      },
      observer: function(newVal) {
        // 当外部传入的 followupData 变化时，更新内部数据
        this.setData({
          'localFollowupData.followupDate': newVal.followupDate || '',
          'localFollowupData.nextFollowupDate': newVal.nextFollowupDate || '',
          'localFollowupData.content': newVal.content || ''
        });
        // 只验证日期，不触发事件，避免递归更新
        this.validateDatesSilent(newVal);
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
    dateError: false,
    // 内部使用的随访数据，用于显示
    localFollowupData: {
      followupDate: '',
      nextFollowupDate: '',
      content: ''
    }
  },

  methods: {
    // 日期选择变化处理
    onDateChange(e) {
      const { field } = e.currentTarget.dataset
      const value = e.detail.value
      
      // 先更新显示，再验证日期
      const updateData = {}
      updateData[`localFollowupData.${field}`] = value
      
      this.setData(updateData, () => {
        // 在回调中验证日期，确保数据已更新
        this.validateDates(this.data.localFollowupData)
        
        // 触发输入事件，通知父组件
        this.triggerEvent('input', { field, value })
      })
    },

    // 输入处理 - 修复文本输入问题
    onInput(e) {
      const { field } = e.currentTarget.dataset
      const value = e.detail.value
      
      // 更新内部数据
      const updateData = {}
      updateData[`localFollowupData.${field}`] = value
      
      this.setData(updateData, () => {
        // 触发输入事件，通知父组件
        this.triggerEvent('input', { field, value })
      })
    },

    // 验证日期（不触发事件）
    validateDatesSilent(data) {
      const { followupDate, nextFollowupDate } = data
      
      if (followupDate && nextFollowupDate) {
        const followup = new Date(followupDate)
        const nextFollowup = new Date(nextFollowupDate)
        const dateError = nextFollowup < followup
        
        this.setData({ dateError })
      } else {
        this.setData({ dateError: false })
      }
    },

    // 验证日期（触发事件）
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
        this.triggerEvent('confirm', this.data.localFollowupData)
      }
    }
  },

  // 组件生命周期
  lifetimes: {
    attached() {
      // 初始化时设置内部数据
      const { followupData } = this.data
      this.setData({
        localFollowupData: {
          followupDate: followupData.followupDate || '',
          nextFollowupDate: followupData.nextFollowupDate || '',
          content: followupData.content || ''
        }
      })
      // 初始化时验证日期（不触发事件）
      this.validateDatesSilent(this.data.localFollowupData)
    }
  }
})
  