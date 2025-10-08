
const cloud = require('wx-server-sdk')
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

// 创建用户
exports.main = async (event, context) => {
  const { userData } = event
  
  try {
    const result = await db.collection('user')
      .add({
        data: {
          ...userData,
          createdAt: db.serverDate(), // 使用服务器时间作为创建时间
          updatedAt: db.serverDate()   // 同时设置更新时间
        }
      })

    return {
      success: true,
      data: {
        id: result._id
      }
    }
  } catch (error) {
    console.error('创建用户错误:', error)
    return {
      success: false,
      message: '创建用户失败'
    }
  }
}
