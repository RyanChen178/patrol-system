-- 高铁巡逻系统数据库设置脚本
-- 请在Supabase SQL编辑器中执行此脚本

-- 1. 创建用户表
CREATE TABLE IF NOT EXISTS users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(20) DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. 创建巡逻记录表
CREATE TABLE IF NOT EXISTS patrols (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  patrol_date DATE NOT NULL,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE,
  duration INTEGER, -- 巡逻时长（秒）
  locations JSONB DEFAULT '[]'::jsonb, -- 存储位置点数组 [{lng, lat, timestamp}]
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

  -- 确保每个用户每天只有一条记录（最后一次）
  UNIQUE(user_id, patrol_date)
);

-- 3. 创建索引提高查询性能
CREATE INDEX IF NOT EXISTS idx_patrols_user_id ON patrols(user_id);
CREATE INDEX IF NOT EXISTS idx_patrols_date ON patrols(patrol_date);
CREATE INDEX IF NOT EXISTS idx_patrols_user_date ON patrols(user_id, patrol_date);

-- 4. 启用行级安全策略 (Row Level Security)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE patrols ENABLE ROW LEVEL SECURITY;

-- 5. 创建用户表的安全策略
-- 允许所有人查询用户（用于用户名唯一性检查）
CREATE POLICY "允许查询用户" ON users
  FOR SELECT
  USING (true);

-- 允许插入新用户（注册）
CREATE POLICY "允许注册新用户" ON users
  FOR INSERT
  WITH CHECK (true);

-- 6. 创建巡逻记录表的安全策略
-- 用户可以查看自己的巡逻记录
CREATE POLICY "用户查看自己的记录" ON patrols
  FOR SELECT
  USING (true); -- 简化处理，前端控制权限

-- 用户可以插入自己的巡逻记录
CREATE POLICY "用户创建巡逻记录" ON patrols
  FOR INSERT
  WITH CHECK (true);

-- 用户可以更新自己的巡逻记录
CREATE POLICY "用户更新巡逻记录" ON patrols
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- 用户可以删除自己的巡逻记录
CREATE POLICY "用户删除巡逻记录" ON patrols
  FOR DELETE
  USING (true);

-- 7. 插入测试管理员账号（用户名: admin, 密码: admin123）
INSERT INTO users (username, password_hash, role)
VALUES ('admin', 'admin123', 'admin')
ON CONFLICT (username) DO NOTHING;

-- 8. 创建函数：获取用户特定日期的巡逻记录
CREATE OR REPLACE FUNCTION get_patrol_by_date(
  p_user_id UUID,
  p_date DATE
)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  patrol_date DATE,
  start_time TIMESTAMP WITH TIME ZONE,
  end_time TIMESTAMP WITH TIME ZONE,
  duration INTEGER,
  locations JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id,
    p.user_id,
    p.patrol_date,
    p.start_time,
    p.end_time,
    p.duration,
    p.locations
  FROM patrols p
  WHERE p.user_id = p_user_id
    AND p.patrol_date = p_date;
END;
$$ LANGUAGE plpgsql;

-- 完成！
-- 现在您可以使用这个数据库了
