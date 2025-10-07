
const cloud = require('wx-server-sdk')
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

// 获取用户详情
exports.main = async (event, context) => {
  const { userId } = event
  
  try {
    const result = await db.collection('user')
      .doc(userId)
      .get()

    if (result.data) {
      return {
        success: true,
        data: result.data
      }
    } else {
      return {
        success: false,
        message: '用户不存在'
      }
    }
  } catch (error) {
    console.error('获取用户详情错误:', error)
    return {
      success: false,
      message: '获取用户详情失败'
    }
  }
}
