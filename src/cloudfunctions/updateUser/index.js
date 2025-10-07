
const cloud = require('wx-server-sdk')
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

// 更新用户信息
exports.main = async (event, context) => {
  const { userId, updateData } = event
  
  try {
    const result = await db.collection('user')
      .doc(userId)
      .update({
        data: {
          ...updateData,
          updatedAt: db.serverDate()
        }
      })

    return {
      success: true,
      data: {
        count: result.stats.updated
      }
    }
  } catch (error) {
    console.error('更新用户错误:', error)
    return {
      success: false,
      message: '更新用户失败'
    }
  }
}
