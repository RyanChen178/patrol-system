# 🚀 快速启动指南

## 第一步：设置数据库（5分钟）

1. 登录 Supabase: https://ujvqkpcbjlylresyvifa.supabase.co
2. 进入左侧菜单 **SQL Editor**
3. 点击 **New Query**
4. 复制 `database_setup.sql` 的全部内容并粘贴
5. 点击 **Run** 执行
6. 在 **Table Editor** 中验证 `users` 和 `patrols` 表已创建

✅ 数据库设置完成！

## 第二步：本地运行（2分钟）

```bash
# 1. 安装依赖
npm install

# 2. 启动开发服务器
npm run dev
```

浏览器访问 http://localhost:3000

## 第三步：测试功能

### 登录测试
- 用户名: `admin`
- 密码: `admin123`

### 功能测试清单
- ✅ 登录/注册
- ✅ 开始巡逻（需要允许浏览器访问位置权限）
- ✅ 查看实时轨迹
- ✅ 结束巡逻并保存
- ✅ 查看历史记录
- ✅ 管理员面板（查看其他用户记录）

## 第四步：部署上线（10分钟）

### 1. 初始化Git并推送到GitHub

```bash
# 初始化仓库
git init
git add .
git commit -m "Initial commit"

# 创建GitHub仓库后
git remote add origin https://github.com/你的用户名/patrol-system.git
git push -u origin main
```

### 2. 部署到Vercel

1. 访问 https://vercel.com（用GitHub登录）
2. 点击 **New Project**
3. 选择 `patrol-system` 仓库
4. **无需配置环境变量**（已在代码中硬编码）
5. 点击 **Deploy**
6. 等待2-3分钟构建完成

✅ 部署成功！获得永久免费链接：`https://你的项目名.vercel.app`

### 3. 在手机上测试

1. 用手机浏览器打开Vercel链接
2. 登录账号
3. 点击"开始巡逻"
4. 允许位置权限
5. 开始走动，查看实时轨迹

## 常见问题速查

### Q: 定位失败？
```
✅ 检查浏览器是否允许位置权限
✅ 确保使用HTTPS访问（localhost或vercel.app都支持）
✅ 确保GPS已开启
```

### Q: 地图不显示？
```
✅ 检查网络连接
✅ 确认高德API Key有效
```

### Q: 数据库连接失败？
```
✅ 确认已执行 database_setup.sql
✅ 检查Supabase URL和Key是否正确
```

## 架构图

```
用户（手机浏览器）
    ↓
React前端（Vercel托管）
    ↓
Supabase数据库（PostgreSQL）
    +
高德地图API（定位/地图显示）
```

## 成本分析

| 服务 | 免费额度 | 实际成本 |
|------|---------|---------|
| Vercel | 无限项目 | 0元 |
| Supabase | 500MB存储 | 0元 |
| 高德地图 | 30万次/天 | 0元 |
| **总计** | | **0元** ✨ |

## 下一步

🎯 **生产环境建议**:
1. 修改管理员默认密码
2. 添加密码加密（bcrypt）
3. 配置自定义域名
4. 添加数据备份计划

📚 **详细文档**:
- 完整功能说明：[README.md](./README.md)
- 数据库配置：[DATABASE_SETUP.md](./DATABASE_SETUP.md)
- 部署详解：[DEPLOYMENT.md](./DEPLOYMENT.md)

---

🎉 **恭喜！您的高铁巡逻系统已经上线！**
