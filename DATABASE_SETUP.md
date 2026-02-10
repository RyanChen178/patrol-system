# 数据库设置指南

## 步骤1：登录Supabase

1. 访问 https://ujvqkpcbjlylresyvifa.supabase.co
2. 使用您的Supabase账号登录

## 步骤2：执行SQL脚本

1. 在Supabase控制台左侧菜单找到 **SQL Editor**
2. 点击 **New Query** 创建新查询
3. 复制 `database_setup.sql` 文件的全部内容
4. 粘贴到SQL编辑器中
5. 点击 **Run** 按钮执行脚本

## 步骤3：验证表创建

在左侧菜单中点击 **Table Editor**，应该能看到：
- ✅ `users` 表 - 用户表
- ✅ `patrols` 表 - 巡逻记录表

## 数据库结构说明

### users 表
| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID | 主键（自动生成）|
| username | VARCHAR(50) | 用户名（唯一）|
| password_hash | VARCHAR(255) | 密码 |
| role | VARCHAR(20) | 角色：user/admin |
| created_at | TIMESTAMP | 创建时间 |

### patrols 表
| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID | 主键（自动生成）|
| user_id | UUID | 用户ID（外键）|
| patrol_date | DATE | 巡逻日期 |
| start_time | TIMESTAMP | 开始时间 |
| end_time | TIMESTAMP | 结束时间 |
| duration | INTEGER | 巡逻时长（秒）|
| locations | JSONB | 位置点数组 |
| created_at | TIMESTAMP | 创建时间 |

**约束**：每个用户每天只能有一条记录（UNIQUE约束：user_id + patrol_date）

## 默认管理员账号

- 用户名: `admin`
- 密码: `admin123`
- 角色: 管理员

⚠️ **重要**：部署到生产环境前请修改管理员密码！

## 安全策略

已启用行级安全策略(RLS)，确保数据安全访问。
