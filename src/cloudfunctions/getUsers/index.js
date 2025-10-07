
const cloud = require('wx-server-sdk')
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

// 获取用户列表
exports.main = async (event, context) => {
  const { searchText, page = 1, pageSize = 20 } = event
  
  try {
    // 构建查询条件
    let whereCondition = {}
    if (searchText) {
      whereCondition = {
        $or: [
          { name: db.RegExp({ regexp: searchText, options: 'i' }) },
          { phone: db.RegExp({ regexp: searchText, options: 'i' }) },
          { address: db.RegExp({ regexp: searchText, options: 'i' }) }
        ]
      }
    }

    // 获取总数
    const countResult = await db.collection('user')
      .where(whereCondition)
      .count()

    // 获取数据，包含完整的 followups 数组
    const result = await db.collection('user')
      .where(whereCondition)
      .orderBy('createdAt', 'desc')
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .field({
        _id: true,
        name: true,
        phone: true,
        address: true,
        diseases: true,
        medications: true,
        followups: true, // 确保返回完整的随访记录数组
        createdAt: true,
        updatedAt: true
      })
      .get()

    // 确保每个用户的随访记录数组格式正确
    const usersWithFormattedFollowups = result.data.map(user => {
      if (user.followups && Array.isArray(user.followups)) {
        // 确保每个随访记录对象包含正确的字段
        user.followups = user.followups.map(followup => ({
          followupDate: followup.followupDate || '',
          nextFollowupDate: followup.nextFollowupDate || '',
          content: followup.content || ''
        }))
      } else {
        user.followups = []
      }
      return user
    })

    return {
      success: true,
      data: {
        records: usersWithFormattedFollowups,
        total: countResult.total,
        page,
        pageSize
      }
    }
  } catch (error) {
    console.error('获取用户列表错误:', error)
    return {
      success: false,
      message: '获取用户列表失败'
    }
  }
}
