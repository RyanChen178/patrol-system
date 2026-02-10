# 高铁巡逻系统

一个基于React + Supabase + 高德地图的实时巡逻轨迹记录系统，支持GPS定位追踪、历史轨迹查看和管理员监控功能。

## 功能特性

### 核心功能
- 📍 **实时定位记录**：开始巡逻后每5秒自动记录GPS位置
- 🗺️ **轨迹可视化**：在高德地图上实时绘制巡逻路线
- 📊 **历史查询**：按日期查看历史巡逻记录和轨迹
- 👥 **用户管理**：支持用户注册登录，用户名唯一性验证
- 🔐 **角色权限**：管理员可查看所有用户的巡逻记录
- 📱 **移动端优化**：完全适配手机浏览器，支持触控操作

### 数据管理
- 每天只保留最后一次巡逻记录（自动覆盖）
- 显示巡逻开始/结束时间、总时长、记录点数
- 数据安全存储在Supabase云数据库

## 技术栈

- **前端框架**：React 18 + Vite
- **UI样式**：TailwindCSS（响应式设计）
- **路由**：React Router v6
- **数据库**：Supabase（PostgreSQL）
- **地图服务**：高德地图 JavaScript API 2.0
- **部署平台**：Vercel（零成本托管）

## 快速开始

### 1. 环境要求

- Node.js 18+
- npm 或 yarn
- Supabase账号
- 高德地图API Key

### 2. 安装依赖

```bash
npm install
```

### 3. 配置数据库

1. 登录 [Supabase](https://supabase.com)
2. 进入SQL Editor
3. 执行 `database_setup.sql` 文件中的SQL脚本
4. 验证 `users` 和 `patrols` 表已创建

### 4. 配置环境变量

项目根目录已包含 `.env` 文件：

```env
SUPABASE_URL=https://ujvqkpcbjlylresyvifa.supabase.co
SUPABASE_KEY=your_supabase_anon_key
AMAP_KEY=63d8e0d1e577c34f3564151b4104a9ec
PORT=3000
```

### 5. 启动开发服务器

```bash
npm run dev
```

访问 http://localhost:3000

### 6. 默认账号

- **管理员账号**：admin / admin123
- **普通用户**：需要自行注册

## 项目结构

```
patrol_system/
├── src/
│   ├── components/          # React组件
│   │   └── ProtectedRoute.jsx   # 路由保护
│   ├── contexts/            # Context状态管理
│   │   └── AuthContext.jsx      # 认证上下文
│   ├── pages/               # 页面组件
│   │   ├── Login.jsx            # 登录页
│   │   ├── Register.jsx         # 注册页
│   │   ├── Patrol.jsx           # 巡逻记录页
│   │   ├── History.jsx          # 历史查询页
│   │   └── Admin.jsx            # 管理员面板
│   ├── utils/               # 工具函数
│   │   └── supabase.js          # Supabase客户端
│   ├── App.jsx              # 应用入口
│   ├── main.jsx             # React挂载点
│   └── index.css            # 全局样式
├── database_setup.sql       # 数据库初始化脚本
├── DATABASE_SETUP.md        # 数据库配置指南
├── DEPLOYMENT.md            # 部署指南
├── package.json
├── vite.config.js
├── tailwind.config.js
└── vercel.json              # Vercel配置
```

## 使用说明

### 巡逻人员操作流程

1. **登录系统**：使用用户名和密码登录
2. **开始巡逻**：点击"开始巡逻"按钮
3. **自动记录**：系统每5秒自动记录当前GPS位置
4. **实时查看**：地图上实时显示巡逻轨迹
5. **结束巡逻**：点击"结束巡逻"保存记录
6. **查看历史**：进入历史记录页面，选择日期查看

### 管理员操作流程

1. **登录系统**：使用管理员账号登录
2. **进入管理面板**：点击"管理"按钮
3. **选择用户**：从下拉列表选择要查看的用户
4. **选择日期**：选择要查看的日期
5. **查看轨迹**：地图上显示该用户的巡逻轨迹和详细信息

## 部署到生产环境

详细部署步骤请参考 [DEPLOYMENT.md](./DEPLOYMENT.md)

### 快速部署到Vercel

1. 推送代码到GitHub
2. 在 [Vercel](https://vercel.com) 导入项目
3. 配置环境变量
4. 点击部署

**完全免费，无需信用卡！**

## 数据库结构

### users 表
存储用户信息

| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID | 主键 |
| username | VARCHAR(50) | 用户名（唯一）|
| password_hash | VARCHAR(255) | 密码哈希 |
| role | VARCHAR(20) | 角色（user/admin）|
| created_at | TIMESTAMP | 创建时间 |

### patrols 表
存储巡逻记录

| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID | 主键 |
| user_id | UUID | 用户ID（外键）|
| patrol_date | DATE | 巡逻日期 |
| start_time | TIMESTAMP | 开始时间 |
| end_time | TIMESTAMP | 结束时间 |
| duration | INTEGER | 时长（秒）|
| locations | JSONB | 位置点数组 |
| created_at | TIMESTAMP | 创建时间 |

**约束**：`UNIQUE(user_id, patrol_date)` - 确保每个用户每天只有一条记录

## 常见问题

### Q: GPS定位不准确怎么办？
A:
- 确保在户外开阔地使用
- 检查手机GPS功能是否开启
- 允许浏览器访问位置权限
- 使用HTTPS协议访问（Vercel默认提供）

### Q: 地图加载失败？
A:
- 检查高德地图API Key是否有效
- 确认API配额未超限
- 检查网络连接

### Q: 同一天多次巡逻会怎样？
A: 系统会自动保留最后一次巡逻记录，覆盖之前的记录

### Q: 如何添加管理员？
A: 在Supabase的users表中，将用户的role字段改为 `admin`

## 性能优化

- ✅ 轨迹数据采用JSONB存储，查询高效
- ✅ 数据库索引优化查询速度
- ✅ 前端使用React.memo和useRef减少重渲染
- ✅ 地图实例复用，避免重复创建
- ✅ Vercel全球CDN加速访问

## 安全性

- ✅ Supabase行级安全策略(RLS)
- ✅ 用户密码加密存储（生产环境建议使用bcrypt）
- ✅ 路由权限保护
- ✅ 管理员角色验证
- ✅ HTTPS加密传输

## 开发计划

- [ ] 添加密码加密（bcrypt）
- [ ] 支持导出巡逻记录为Excel
- [ ] 添加巡逻统计报表
- [ ] 支持多日期范围查询
- [ ] 添加消息通知功能
- [ ] 支持离线记录（PWA）

## 许可证

MIT License

## 联系方式

如有问题或建议，欢迎提Issue或PR！

---

**🎉 完全零成本方案，适合个人和小团队使用！**
