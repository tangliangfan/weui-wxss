
Component({
  properties: {
    show: {
      type: Boolean,
      value: false
    },
    title: {
      type: String,
      value: ''
    },
    subtitle: {
      type: String,
      value: ''
    },
    showClose: {
      type: Boolean,
      value: true
    },
    showFooter: {
      type: Boolean,
      value: true
    },
    cancelText: {
      type: String,
      value: '取消'
    },
    confirmText: {
      type: String,
      value: '确定'
    },
    cancelDisabled: {
      type: Boolean,
      value: false
    },
    confirmDisabled: {
      type: Boolean,
      value: false
    },
    confirmLoading: {
      type: Boolean,
      value: false
    },
    maskClosable: {
      type: Boolean,
      value: true
    }
  },

  methods: {
    onMaskTap() {
      if (this.data.maskClosable) {
        this.onClose()
      }
    },

    onClose() {
      this.triggerEvent('close')
    },

    onCancel() {
      this.triggerEvent('cancel')
    },

    onConfirm() {
      this.triggerEvent('confirm')
    },

    stopPropagation() {
      // 阻止事件冒泡
    },

    preventTouchMove() {
      return false
    }
  }
})
