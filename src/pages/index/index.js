
// 保存新用户 - 使用云函数
async handleSaveNewUser() {
  const { newUserForm } = this.data
  // 表单验证：检查必填字段是否填写
  if (!newUserForm.name || !newUserForm.phone || !newUserForm.address) {
    showToast('请填写姓名、手机号和地址', 'error')
    return
  }

  try {
    // 设置添加用户加载状态
    this.setData({ addUserLoading: true })
    
    // 处理数组字段：将字符串转换为数组
    const diseasesArray = newUserForm.diseases ? 
      newUserForm.diseases.split('、').map(d => d.trim()).filter(d => d) : []
    
    const medicationsArray = newUserForm.medications ? 
      newUserForm.medications.split('\n').map(m => m.trim()).filter(m => m) : []

    // 创建新用户 - 使用云函数
    // createdAt 字段由云函数自动添加，不需要前端传递
    await callCloudFunction('createUser', {
      userData: {
        name: newUserForm.name,
        phone: newUserForm.phone,
        address: newUserForm.address,
        diseases: diseasesArray, // 转换为数组格式
        medications: medicationsArray, // 转换为数组格式
        followups: [] // 初始化随访记录为空数组
        // createdAt 字段由云函数自动添加
      }
    })

    // 显示成功提示
    showToast('用户信息已保存', 'success')
    // 关闭添加用户模态框
    this.setData({ showAddUserModal: false })
    
    // 刷新用户列表，显示新添加的用户
    this.fetchUsers()
  } catch (error) {
    // 捕获并记录添加用户错误
    console.error('添加用户失败:', error)
    showToast('无法保存用户信息', 'error')
  } finally {
    // 无论成功或失败，都设置添加用户加载状态为false
    this.setData({ addUserLoading: false })
  }
}
