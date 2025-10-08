
const { showToast, showLoading, hideLoading, login } = require('../../utils/cloud');

Page({
  data: {
    formData: {
      username: '',
      password: ''
    },
    loading: false,
    showPassword: false
  },

  onInputChange(e) {
    const field = e.currentTarget.dataset.field;
    const value = e.detail.value;
    this.setData({
      [`formData.${field}`]: value
    });
  },

  togglePassword() {
    this.setData({
      showPassword: !this.data.showPassword
    });
  },

  async handleLogin(e) {
    const { username, password } = this.data.formData;
    
    if (!username || !password) {
      // 使用自定义的 toast 样式确保文字完整显示
      wx.showToast({
        title: '请填写账号和密码',
        icon: 'none',
        duration: 2000,
        mask: true
      });
      return;
    }

    this.setData({ loading: true });

    try {
      // 调用云函数登录
      const result = await login(username, password);

      if (result.success) {
        // 保存token和用户信息
        wx.setStorageSync('token', result.data.token);
        wx.setStorageSync('userInfo', result.data.user);
        
        // 使用自定义的 toast 样式确保文字完整显示
        wx.showToast({
          title: '登录成功',
          icon: 'success',
          duration: 1000,
          mask: true
        });
        
        // 跳转到首页
        setTimeout(() => {
          wx.reLaunch({
            url: '/pages/index/index'
          });
        }, 1000);
      } else {
        // 使用自定义的 toast 样式确保文字完整显示
        wx.showToast({
          title: result.message || '登录失败',
          icon: 'none',
          duration: 2000,
          mask: true
        });
      }
    } catch (error) {
      console.error('登录错误:', error);
      // 使用自定义的 toast 样式确保文字完整显示
      wx.showToast({
        title: '网络连接异常，请稍后重试',
        icon: 'none',
        duration: 2000,
        mask: true
      });
    } finally {
      this.setData({ loading: false });
    }
  }
});
