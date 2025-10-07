
const cloud = require('wx-server-sdk')
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

// 登录验证
exports.main = async (event, context) => {
  const { username, password } = event
  
  // 参数验证
  if (!username || !password) {
    return {
      success: false,
      message: '账号和密码不能为空',
      code: 'INVALID_PARAMS'
    }
  }

  // 参数格式验证
  if (typeof username !== 'string' || typeof password !== 'string') {
    return {
      success: false,
      message: '参数格式错误',
      code: 'INVALID_PARAMS_FORMAT'
    }
  }

  // 长度验证
  if (username.length < 3 || username.length > 20) {
    return {
      success: false,
      message: '账号长度应在3-20个字符之间',
      code: 'INVALID_USERNAME_LENGTH'
    }
  }

  if (password.length < 6) {
    return {
      success: false,
      message: '密码长度不能少于6个字符',
      code: 'INVALID_PASSWORD_LENGTH'
    }
  }

  try {
    // 查询账号信息 - 使用加密密码验证（实际项目中应该使用加密存储）
    const result = await db.collection('account')
      .where({
        username: db.RegExp({
          regexp: `^${username}$`,
          options: 'i' // 不区分大小写
        })
      })
      .get()

    if (result.data.length === 0) {
      return {
        success: false,
        message: '账号不存在',
        code: 'USER_NOT_FOUND'
      }
    }

    const user = result.data[0]

    // 密码验证（实际项目中应该使用加密比较）
    if (user.password !== password) {
      return {
        success: false,
        message: '密码错误',
        code: 'PASSWORD_MISMATCH'
      }
    }

    // 生成安全的token（实际项目中应该使用JWT等安全机制）
    const token = `${user._id}_${Date.now()}_${Math.random().toString(36).substr(2)}`

    // 更新最后登录时间
    await db.collection('account')
      .doc(user._id)
      .update({
        data: {
          lastLoginTime: new Date()
        }
      })

    return {
      success: true,
      data: {
        token: token,
        user: {
          id: user._id,
          username: user.username,
          name: user.name || user.username,
          role: user.role || 'user',
          avatar: user.avatar || null
        }
      },
      message: '登录成功'
    }

  } catch (error) {
    console.error('登录系统错误:', error)
    
    // 分类错误处理
    if (error.errCode === 'DATABASE_PERMISSION_DENIED') {
      return {
        success: false,
        message: '数据库权限不足',
        code: 'DATABASE_ERROR'
      }
    } else if (error.errCode === 'DATABASE_NETWORK_ERROR') {
      return {
        success: false,
        message: '网络连接异常，请稍后重试',
        code: 'NETWORK_ERROR'
      }
    } else {
      return {
        success: false,
        message: '系统繁忙，请稍后重试',
        code: 'SYSTEM_ERROR'
      }
    }
  }
}
