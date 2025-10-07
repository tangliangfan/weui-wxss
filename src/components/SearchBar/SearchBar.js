
const app = getApp()

Component({
  properties: {
    placeholder: {
      type: String,
      value: '搜索用户姓名或手机号'
    }
  },

  data: {
    searchText: '',
    showHistory: false,
    searchHistory: []
  },

  lifetimes: {
    attached() {
      this.loadSearchHistory()
    }
  },

  methods: {
    onInput(e) {
      const value = e.detail.value
      this.setData({
        searchText: value,
        showHistory: value === ''
      })
      this.triggerEvent('input', { value })
    },

    onSearch() {
      if (this.data.searchText.trim()) {
        this.saveToHistory(this.data.searchText)
        this.triggerEvent('search', { keyword: this.data.searchText })
        this.setData({ showHistory: false })
      }
    },

    onClear() {
      this.setData({
        searchText: '',
        showHistory: true
      })
      this.triggerEvent('input', { value: '' })
    },

    onFilter() {
      this.triggerEvent('filter')
    },

    onHistoryItemClick(e) {
      const item = e.currentTarget.dataset.item
      this.setData({
        searchText: item,
        showHistory: false
      })
      this.triggerEvent('search', { keyword: item })
    },

    onClearHistory() {
      wx.removeStorageSync('searchHistory')
      this.setData({ searchHistory: [] })
    },

    loadSearchHistory() {
      const history = wx.getStorageSync('searchHistory') || []
      this.setData({ searchHistory: history.slice(0, 5) })
    },

    saveToHistory(keyword) {
      let history = wx.getStorageSync('searchHistory') || []
      // 去重
      history = history.filter(item => item !== keyword)
      // 添加到开头
      history.unshift(keyword)
      // 限制数量
      history = history.slice(0, 10)
      wx.setStorageSync('searchHistory', history)
      this.setData({ searchHistory: history.slice(0, 5) })
    }
  }
})
