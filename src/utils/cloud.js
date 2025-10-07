
// 云函数调用封装 - 修复云函数调用方式
const callCloudFunction = (name, data = {}) => {
  return new Promise((resolve, reject) => {
    wx.cloud.callFunction({
      name: name,
      data: data,
      success: (res) => {
        console.log('云函数调用成功:', name, res)
        // 直接返回云函数的执行结果
        resolve(res.result)
      },
      fail: (err) => {
        console.error('云函数调用失败:', name, err)
        reject(new Error('网络请求失败，请检查网络连接'))
      }
    })
  })
}

// 登录 - 修复参数传递
const login = (username, password) => {
  return callCloudFunction('login', { 
    username: username, 
    password: password 
  })
}

// 获取用户列表
const getUsers = (searchText = '', page = 1, pageSize = 20) => {
  return callCloudFunction('getUsers', { 
    searchText: searchText, 
    page: page, 
    pageSize: pageSize 
  })
}

// 获取用户详情
const getUserDetail = (userId) => {
  return callCloudFunction('getUserDetail', { 
    userId: userId 
  })
}

// 创建用户
const createUser = (userData) => {
  return callCloudFunction('createUser', { 
    userData: userData 
  })
}

// 更新用户
const updateUser = (userId, updateData) => {
  return callCloudFunction('updateUser', { 
    userId: userId, 
    updateData: updateData 
  })
}

// 删除用户
const deleteUser = (userId) => {
  return callCloudFunction('deleteUser', { 
    userId: userId 
  })
}

// 添加随访记录
const addFollowup = (userId, followupData) => {
  return callCloudFunction('addFollowup', { 
    userId: userId, 
    followupData: followupData 
  })
}

// Toast提示封装
const showToast = (message, type = 'success') => {
  const icon = type === 'success' ? 'success' : 'none'
  wx.showToast({
    title: message,
    icon: icon,
    duration: 2000
  })
}

// 显示加载中
const showLoading = (title = '加载中...') => {
  wx.showLoading({
    title: title,
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
