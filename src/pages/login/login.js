
// 引入工具函数和云函数调用方法
const { showToast, showLoading, hideLoading, login } = require('../../utils/cloud');

// 页面定义
Page({
  // 页面数据定义
  data: {
    formData: { // 表单数据对象
      username: '', // 用户名输入框的值
      password: ''  // 密码输入框的值
    },
    loading: false, // 加载状态，控制登录按钮的加载动画
    showPassword: false, // 是否显示密码，控制密码的可见性
    passwordFocus: false, // 控制密码输入框的聚焦状态
    showCustomToast: false, // 控制自定义提示框显示
    toastText: '' // 自定义提示框文本
  },

  // 输入框变化事件处理函数
  onInputChange(e) {
    const field = e.currentTarget.dataset.field; // 从dataset中获取字段名（username或password）
    const value = e.detail.value; // 获取输入框的值
    // 更新对应字段的值到formData中
    this.setData({
      [`formData.${field}`]: value // 使用模板字符串动态设置字段值
    });
  },

  // 显示自定义提示框
  showCustomToast(text) {
    this.setData({
      toastText: text,
      showCustomToast: true
    });
    
    // 3秒后自动隐藏
    setTimeout(() => {
      this.setData({
        showCustomToast: false
      });
    }, 3000);
  },

  // 切换密码显示/隐藏状态
  togglePassword() {
    // 添加调试日志，检查函数是否被调用
    console.log('togglePassword called, current showPassword:', this.data.showPassword);
    
    // 先取消聚焦，然后重新聚焦来刷新输入框
    this.setData({
      passwordFocus: false,
      showPassword: !this.data.showPassword
    }, () => {
      // 设置完成后的回调，确认状态已更新
      console.log('showPassword updated to:', this.data.showPassword);
      
      // 延迟重新聚焦输入框
      setTimeout(() => {
        this.setData({
          passwordFocus: true
        });
        console.log('密码输入框重新聚焦');
      }, 50);
    });
  },

  // 处理登录按钮点击事件
  async handleLogin(e) {
    const { username, password } = this.data.formData; // 从formData中解构出用户名和密码
    
    // 验证用户名和密码是否为空
    if (!username || !password) {
      // 使用自定义提示框替代微信原生提示框
      this.showCustomToast('请填写账号和密码');
      return; // 终止函数执行
    }

    // 设置加载状态为true，显示加载动画
    this.setData({ loading: true });

    try {
      // 调用云函数login进行登录验证
      const result = await login(username, password);

      // 判断登录是否成功
      if (result.success) {
        // 登录成功，保存token到本地存储
        wx.setStorageSync('token', result.data.token);
        // 保存用户信息到本地存储
        wx.setStorageSync('userInfo', result.data.user);
        
        // 使用自定义提示框显示成功信息
        this.showCustomToast('登录成功');
        
        // 1秒后跳转到首页
        setTimeout(() => {
          wx.reLaunch({ // 使用reLaunch关闭所有页面并打开首页
            url: '/pages/index/index' // 首页路径
          });
        }, 1000);
      } else {
        // 登录失败，显示错误信息
        this.showCustomToast(result.message || '登录失败，请检查账号密码');
      }
    } catch (error) {
      // 捕获并处理网络请求错误
      console.error('登录错误:', error); // 在控制台输出错误信息
      // 显示网络异常提示
      this.showCustomToast('网络连接异常，请稍后重试');
    } finally {
      // 无论成功失败，都关闭加载状态
      this.setData({ loading: false });
    }
  }
});
