
const cloud = require('wx-server-sdk')
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

// 删除用户
exports.main = async (event, context) => {
  const { userId } = event
  
  try {
    const result = await db.collection('user')
      .doc(userId)
      .remove()

    return {
      success: true,
      data: {
        count: result.stats.removed
      }
    }
  } catch (error) {
    console.error('删除用户错误:', error)
    return {
      success: false,
      message: '删除用户失败'
    }
  }
}
