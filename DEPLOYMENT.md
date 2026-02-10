# 部署指南

## 前置准备

1. ✅ 已配置Supabase数据库（执行 `database_setup.sql`）
2. ✅ 已获取高德地图API Key
3. ✅ 已创建GitHub账号
4. ✅ 已创建Vercel账号（使用GitHub登录）

## 步骤1：创建Git仓库并推送代码

### 1.1 初始化Git仓库

```bash
git init
git add .
git commit -m "Initial commit: 高铁巡逻系统"
```

### 1.2 创建GitHub仓库

1. 访问 https://github.com/new
2. 仓库名称：`patrol-system`
3. 选择 **Private**（私有仓库）
4. 点击 **Create repository**

### 1.3 推送代码到GitHub

```bash
git remote add origin https://github.com/你的用户名/patrol-system.git
git branch -M main
git push -u origin main
```

## 步骤2：部署到Vercel

### 2.1 导入项目

1. 访问 https://vercel.com
2. 点击 **Add New** → **Project**
3. 选择 **Import Git Repository**
4. 找到 `patrol-system` 仓库并点击 **Import**

### 2.2 配置项目

- **Framework Preset**: Vite
- **Root Directory**: `./`
- **Build Command**: `npm run build`
- **Output Directory**: `dist`

### 2.3 配置环境变量

在 **Environment Variables** 部分添加以下变量：

| 变量名 | 值 | 说明 |
|--------|-----|------|
| `VITE_SUPABASE_URL` | `https://ujvqkpcbjlylresyvifa.supabase.co` | Supabase URL |
| `VITE_SUPABASE_KEY` | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` | Supabase API Key |
| `VITE_AMAP_KEY` | `63d8e0d1e577c34f3564151b4104a9ec` | 高德地图API Key |

⚠️ **重要**：Vite项目的环境变量必须以 `VITE_` 开头才能在客户端访问！

### 2.4 修改代码使用环境变量

需要更新以下文件：

**src/utils/supabase.js**
```javascript
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_KEY
```

**index.html**
```html
<script type="text/javascript">
  window.AMAP_KEY = import.meta.env.VITE_AMAP_KEY || '63d8e0d1e577c34f3564151b4104a9ec'
</script>
<script type="text/javascript" src="https://webapi.amap.com/maps?v=2.0&key=63d8e0d1e577c34f3564151b4104a9ec"></script>
```

### 2.5 点击部署

1. 点击 **Deploy** 按钮
2. 等待构建完成（约2-3分钟）
3. 部署成功后会显示访问链接

## 步骤3：测试部署

1. 访问Vercel提供的URL（如：`https://patrol-system-xxx.vercel.app`）
2. 测试登录功能（admin / admin123）
3. 测试巡逻记录功能
4. 在手机浏览器中测试GPS定位

## 步骤4：绑定自定义域名（可选）

1. 在Vercel项目设置中点击 **Domains**
2. 添加您的域名
3. 按照提示配置DNS记录

## 常见问题

### Q1: 构建失败提示Node版本问题
**A**: 在 `package.json` 中添加：
```json
"engines": {
  "node": ">=18.0.0"
}
```

### Q2: 地图无法加载
**A**: 检查高德地图API Key是否正确，确保已在高德开放平台添加域名白名单

### Q3: 数据库连接失败
**A**:
1. 检查Supabase URL和Key是否正确
2. 确认已执行 `database_setup.sql` 创建表结构
3. 检查Supabase RLS策略是否正确配置

### Q4: GPS定位失败
**A**:
1. 确保使用HTTPS访问（Vercel默认提供HTTPS）
2. 在浏览器中允许位置权限
3. 确保设备GPS功能已开启

## 零成本部署总结

✅ **Vercel**: 免费托管，自动CI/CD，全球CDN
✅ **Supabase**: 免费数据库（500MB存储，无限API请求）
✅ **高德地图**: 免费配额（每天30万次调用）
✅ **GitHub**: 免费代码托管

**总成本：0元** 🎉

## 后续维护

### 更新代码
```bash
git add .
git commit -m "更新说明"
git push
```

Vercel会自动检测到推送并重新部署！

### 查看日志
在Vercel控制台的 **Deployments** 页面查看部署日志和运行日志

### 回滚版本
在Vercel控制台点击历史部署记录，选择 **Promote to Production** 即可回滚
