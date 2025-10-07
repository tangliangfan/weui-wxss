
# 健管师服务管理信息系统 - 微信小程序

基于React应用迁移而来的微信小程序版本，提供完整的健管师服务管理功能。

## 功能特性

- ✅ 用户登录验证
- ✅ 用户信息管理（增删改查）
- ✅ 健康档案管理
- ✅ 随访记录管理
- ✅ 智能搜索功能
- ✅ 响应式UI设计

## 项目结构

```
├── app.js                 # 小程序入口文件
├── app.json               # 小程序配置文件
├── app.wxss               # 全局样式文件
├── pages/                 # 页面目录
│   ├── login/            # 登录页面
│   ├── index/            # 首页（用户列表）
│   └── userDetail/       # 用户详情页面
├── components/           # 自定义组件目录
├── utils/               # 工具函数目录
├── cloudfunctions/      # 云函数目录
│   ├── login/          # 登录验证
│   ├── getUsers/       # 获取用户列表
│   ├── getUserDetail/  # 获取用户详情
│   ├── createUser/     # 创建用户
│   ├── updateUser/     # 更新用户
│   ├── deleteUser/     # 删除用户
│   └── addFollowup/    # 添加随访记录
├── images/              # 图片资源目录
└── project.config.json  # 项目配置文件
```

## 开发环境配置

1. 安装依赖：
```bash
npm install
```

2. 配置小程序AppID：
   在 `project.config.json` 中修改 `appid` 为你的小程序AppID

3. 配置云开发环境：
   在 `app.js` 中修改云环境ID

4. 开发调试：
```bash
npm run dev
```

## 云函数部署

1. 安装云函数依赖：
```bash
cd cloudfunctions/login && npm install
cd ../getUsers && npm install
# ... 其他云函数目录同样操作
```

2. 上传云函数：
   在微信开发者工具中右键云函数目录，选择"上传并部署"

## 数据模型

### account 表结构
- username: 用户名
- password: 密码
- name: 姓名
- role: 角色

### user 表结构
- name: 姓名
- phone: 手机号
- address: 地址
- diseases: 基础疾病（数组）
- medications: 用药情况（数组）
- followups: 随访记录（数组）
- createdAt: 创建时间
- updatedAt: 更新时间

## 注意事项

1. 确保微信开发者工具已开启云开发功能
2. 云环境需要提前创建并配置正确的权限
3. 生产环境需要配置合法域名和安全域名
4. 建议开启小程序的数据预拉取和周期性更新功能

## 版本信息

- 微信基础库版本：2.19.4+
- Node.js 版本：14.0.0+
- npm 版本：6.0.0+

## 技术支持

如有问题请联系系统开发人员或管理员。
