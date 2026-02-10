import { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from '../utils/supabase'

const AuthContext = createContext({})

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // 检查本地存储的用户信息
    const savedUser = localStorage.getItem('patrol_user')
    if (savedUser) {
      setUser(JSON.parse(savedUser))
    }
    setLoading(false)
  }, [])

  const login = async (username, password) => {
    try {
      // 查询用户
      const { data: users, error } = await supabase
        .from('users')
        .select('*')
        .eq('username', username)
        .single()

      if (error || !users) {
        throw new Error('用户名或密码错误')
      }

      // 简单密码验证（实际应该用bcrypt）
      if (users.password_hash !== password) {
        throw new Error('用户名或密码错误')
      }

      const userData = {
        id: users.id,
        username: users.username,
        role: users.role
      }

      setUser(userData)
      localStorage.setItem('patrol_user', JSON.stringify(userData))
      return userData
    } catch (error) {
      throw error
    }
  }

  const register = async (username, password) => {
    try {
      // 检查用户名是否已存在
      const { data: existingUser } = await supabase
        .from('users')
        .select('username')
        .eq('username', username)
        .single()

      if (existingUser) {
        throw new Error('用户名已存在')
      }

      // 创建新用户
      const { data, error } = await supabase
        .from('users')
        .insert([
          {
            username,
            password_hash: password, // 实际应该加密
            role: 'user'
          }
        ])
        .select()
        .single()

      if (error) {
        throw new Error('注册失败：' + error.message)
      }

      const userData = {
        id: data.id,
        username: data.username,
        role: data.role
      }

      setUser(userData)
      localStorage.setItem('patrol_user', JSON.stringify(userData))
      return userData
    } catch (error) {
      throw error
    }
  }

  const logout = () => {
    setUser(null)
    localStorage.removeItem('patrol_user')
  }

  const value = {
    user,
    login,
    register,
    logout,
    loading
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
