
Component({
  properties: {
    userInfo: {
      type: Object,
      value: {}
    }
  },

  methods: {
    onCardClick() {
      if (this.data.userInfo._id) {
        this.triggerEvent('onClick', { userId: this.data.userInfo._id })
      }
    }
  }
})
