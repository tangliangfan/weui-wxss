
App({
  onLaunch() {
    // 初始化云开发
    if (wx.cloud) {
      wx.cloud.init({
        env: 'healthmanagementinfosys01-0ae99f', // 替换为实际环境ID
        traceUser: true
      });
    }
    
    // 检查登录状态 - 使用 WeDa 框架的认证方式
    // 移除了基于 token 的检查，因为 WeDa 框架使用内置的认证系统
    // 页面跳转逻辑由各个页面的认证检查处理
  },
  
  globalData: {
    userInfo: null,
    // 可以添加其他全局状态
    currentUser: null,
    isAuthenticated: false
  },
  
  // 设置全局用户信息
  setUserInfo(userInfo) {
    this.globalData.userInfo = userInfo;
    this.globalData.currentUser = userInfo;
    this.globalData.isAuthenticated = !!userInfo;
  },
  
  // 获取全局用户信息
  getUserInfo() {
    return this.globalData.userInfo;
  },
  
  // 检查认证状态
  checkAuth() {
    return this.globalData.isAuthenticated;
  },
  
  // 清除用户信息
  clearUserInfo() {
    this.globalData.userInfo = null;
    this.globalData.currentUser = null;
    this.globalData.isAuthenticated = false;
  }
});
