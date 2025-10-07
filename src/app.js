
App({
  onLaunch() {
    // 初始化云开发
    if (wx.cloud) {
      wx.cloud.init({
        env: 'your-env-id', // 替换为实际环境ID
        traceUser: true
      });
    }
    
    // 检查登录状态
    const token = wx.getStorageSync('token');
    if (token) {
      wx.reLaunch({
        url: '/pages/index/index'
      });
    }
  },
  
  globalData: {
    userInfo: null
    // 移除了baseUrl配置
  }
});
  