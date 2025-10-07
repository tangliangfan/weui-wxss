
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
    console.log('登录按钮点击事件:', e)
    
    const { username, password } = this.data.formData;
    
    // 表单验证
    if (!username || !password) {
      showToast('请填写账号和密码');
      return;
    }

    this.setData({ loading: true });
    showLoading('登录中...');

    try {
      console.log('开始调用登录云函数:', username)
      // 调用云函数登录
      const result = await login(username, password);
      console.log('登录云函数返回:', result)

      if (result && result.success) {
        // 保存token和用户信息
        wx.setStorageSync('token', result.data.token);
        wx.setStorageSync('userInfo', result.data.user);
        
        showToast('登录成功', 'success');
        
        // 跳转到首页
        setTimeout(() => {
          wx.reLaunch({
            url: '/pages/index/index'
          });
        }, 1000);
      } else {
        showToast(result?.message || '登录失败，请检查账号密码');
      }
    } catch (error) {
      console.error('登录错误:', error);
      showToast('网络连接异常，请稍后重试');
    } finally {
      this.setData({ loading: false });
      hideLoading();
    }
  },

  // 添加调试方法，用于测试按钮点击
  testButtonClick() {
    console.log('测试按钮点击事件')
    showToast('按钮点击测试成功')
  }
})
