
const cloud = require('wx-server-sdk')
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

// 登录验证
exports.main = async (event, context) => {
  const { username, password } = event
  
  try {
    // 查询账号信息
    const result = await db.collection('account')
      .where({
        username: username,
        password: password
      })
      .get()

    if (result.data.length > 0) {
      const user = result.data[0]
      return {
        success: true,
        data: {
          token: user._id, // 使用_id作为token
          user: {
            id: user._id,
            username: user.username,
            name: user.name,
            role: user.role
          }
        }
      }
    } else {
      return {
        success: false,
        message: '账号或密码错误'
      }
    }
  } catch (error) {
    console.error('登录错误:', error)
    return {
      success: false,
      message: '系统错误，请稍后重试'
    }
  }
}
