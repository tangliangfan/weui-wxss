
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
      wx.showToast({
        title: '请填写账号和密码',
        icon: 'none',
        duration: 2000
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
        
        wx.showToast({
          title: '登录成功',
          icon: 'success',
          duration: 1000
        });
        
        // 跳转到首页
        setTimeout(() => {
          wx.reLaunch({
            url: '/pages/index/index'
          });
        }, 1000);
      } else {
        wx.showToast({
          title: result.message || '登录失败，请检查账号密码',
          icon: 'none',
          duration: 3000
        });
      }
    } catch (error) {
      console.error('登录错误:', error);
      wx.showToast({
        title: '网络连接异常，请稍后重试',
        icon: 'none',
        duration: 3000
      });
    } finally {
      this.setData({ loading: false });
    }
  }
});
