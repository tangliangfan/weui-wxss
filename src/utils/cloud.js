
// 云函数调用封装 - 直接使用微信云开发
const callCloudFunction = (name, data = {}) => {
  return new Promise((resolve, reject) => {
    wx.cloud.callFunction({
      name,
      data,
      success: (res) => {
        if (res.result && res.result.success) {
          resolve(res.result)
        } else {
          reject(new Error(res.result?.message || '操作失败'))
        }
      },
      fail: (err) => {
        console.error('云函数调用失败:', err)
        reject(new Error('网络请求失败，请检查网络连接'))
      }
    })
  })
}

// 登录
const login = (username, password) => {
  return callCloudFunction('login', { username, password })
}

// 获取用户列表
const getUsers = (searchText = '', page = 1, pageSize = 20) => {
  return callCloudFunction('getUsers', { searchText, page, pageSize })
}

// 获取用户详情
const getUserDetail = (userId) => {
  return callCloudFunction('getUserDetail', { userId })
}

// 创建用户
const createUser = (userData) => {
  return callCloudFunction('createUser', { userData })
}

// 更新用户
const updateUser = (userId, updateData) => {
  return callCloudFunction('updateUser', { userId, updateData })
}

// 删除用户
const deleteUser = (userId) => {
  return callCloudFunction('deleteUser', { userId })
}

// 添加随访记录
const addFollowup = (userId, followupData) => {
  return callCloudFunction('addFollowup', { userId, followupData })
}

// Toast提示封装
const showToast = (message, type = 'success') => {
  const icon = type === 'success' ? 'success' : 'none'
  wx.showToast({
    title: message,
    icon,
    duration: 2000
  })
}

// 显示加载中
const showLoading = (title = '加载中...') => {
  wx.showLoading({
    title,
    mask: true
  })
}

// 隐藏加载
const hideLoading = () => {
  wx.hideLoading()
}

module.exports = {
  callCloudFunction,
  login,
  getUsers,
  getUserDetail,
  createUser,
  updateUser,
  deleteUser,
  addFollowup,
  showToast,
  showLoading,
  hideLoading
}
