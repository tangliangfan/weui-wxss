
const cloud = require('wx-server-sdk')
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

// 添加随访记录
exports.main = async (event, context) => {
  const { userId, followupData, updatePreviousFollowup, previousFollowups } = event
  
  try {
    // 先获取用户当前的随访记录
    const userResult = await db.collection('user')
      .doc(userId)
      .get()

    if (!userResult.data) {
      return {
        success: false,
        message: '用户不存在'
      }
    }

    let newFollowups
    let updateData = {
      followups: [],
      updatedAt: db.serverDate()
    }

    if (updatePreviousFollowup && previousFollowups && previousFollowups.length > 0) {
      // 使用前端传递的已更新随访记录数组
      newFollowups = [...previousFollowups, followupData]
      updateData.followups = newFollowups
    } else {
      // 原有逻辑：直接添加新记录
      const currentFollowups = userResult.data.followups || []
      newFollowups = [...currentFollowups, followupData]
      updateData.followups = newFollowups
    }

    // 更新用户的随访记录
    const result = await db.collection('user')
      .doc(userId)
      .update({
        data: updateData
      })

    return {
      success: true,
      data: {
        count: result.stats.updated,
        newFollowups: newFollowups
      }
    }
  } catch (error) {
    console.error('添加随访记录错误:', error)
    return {
      success: false,
      message: '添加随访记录失败'
    }
  }
}
