import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../utils/supabase'

const Admin = () => {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [users, setUsers] = useState([])
  const [selectedUserId, setSelectedUserId] = useState('')
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [patrolData, setPatrolData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const mapRef = useRef(null)
  const mapInstanceRef = useRef(null)
  const polylineRef = useRef(null)
  const markersRef = useRef([])

  // 初始化百度地图
  useEffect(() => {
    if (!window.BMap || !window.BMapGL) {
      // 尝试使用BMapGL，如果不存在则使用BMap
      window.BMapGL = window.BMap
    }

    if (!window.BMapGL) {
      setError('百度地图加载失败')
      return
    }

    // 创建地图实例
    const map = new window.BMapGL.Map(mapRef.current)
    const point = new window.BMapGL.Point(116.404, 39.915) // 默认中心点（北京）
    map.centerAndZoom(point, 13)
    map.enableScrollWheelZoom(true)

    mapInstanceRef.current = map

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current = null
      }
    }
  }, [])

  // 加载用户列表
  useEffect(() => {
    loadUsers()
  }, [])

  // 加载巡逻数据
  useEffect(() => {
    if (selectedUserId) {
      loadPatrolData()
    }
  }, [selectedUserId, selectedDate])

  const loadUsers = async () => {
    try {
      const { data, error: dbError } = await supabase
        .from('users')
        .select('id, username, role, created_at')
        .order('created_at', { ascending: false })

      if (dbError) throw dbError

      setUsers(data || [])
      if (data && data.length > 0) {
        setSelectedUserId(data[0].id)
      }
    } catch (err) {
      setError(err.message || '加载用户列表失败')
    }
  }

  const loadPatrolData = async () => {
    if (!selectedUserId) return

    setLoading(true)
    setError('')
    setPatrolData(null)

    try {
      const { data, error: dbError } = await supabase
        .from('patrols')
        .select('*')
        .eq('user_id', selectedUserId)
        .eq('patrol_date', selectedDate)
        .single()

      if (dbError) {
        if (dbError.code === 'PGRST116') {
          setError('该用户在此日期没有巡逻记录')
        } else {
          throw dbError
        }
        return
      }

      setPatrolData(data)
      displayPatrolOnMap(data)
    } catch (err) {
      setError(err.message || '加载失败')
    } finally {
      setLoading(false)
    }
  }

  // 在地图上显示巡逻轨迹
  const displayPatrolOnMap = (data) => {
    if (!mapInstanceRef.current || !data.locations || data.locations.length === 0) {
      return
    }

    // 清除旧的标记和轨迹
    if (polylineRef.current) {
      mapInstanceRef.current.removeOverlay(polylineRef.current)
    }
    if (markersRef.current.length > 0) {
      markersRef.current.forEach(marker => {
        mapInstanceRef.current.removeOverlay(marker)
      })
      markersRef.current = []
    }

    const locations = data.locations
    const path = locations.map((loc) => new window.BMapGL.Point(loc.lng, loc.lat))

    // 绘制轨迹线
    polylineRef.current = new window.BMapGL.Polyline(path, {
      strokeColor: '#8b5cf6',
      strokeWeight: 6,
      strokeOpacity: 0.8
    })
    mapInstanceRef.current.addOverlay(polylineRef.current)

    // 添加起点标记
    const startMarker = new window.BMapGL.Marker(new window.BMapGL.Point(locations[0].lng, locations[0].lat))
    const startLabel = new window.BMapGL.Label('起点', {
      offset: new window.BMapGL.Size(10, -20)
    })
    startLabel.setStyle({
      color: 'white',
      backgroundColor: '#ef4444',
      border: 'none',
      borderRadius: '4px',
      padding: '4px 8px',
      fontSize: '12px',
      fontWeight: 'bold'
    })
    startMarker.setLabel(startLabel)
    mapInstanceRef.current.addOverlay(startMarker)

    // 添加终点标记
    const endMarker = new window.BMapGL.Marker(new window.BMapGL.Point(locations[locations.length - 1].lng, locations[locations.length - 1].lat))
    const endLabel = new window.BMapGL.Label('终点', {
      offset: new window.BMapGL.Size(10, -20)
    })
    endLabel.setStyle({
      color: 'white',
      backgroundColor: '#10b981',
      border: 'none',
      borderRadius: '4px',
      padding: '4px 8px',
      fontSize: '12px',
      fontWeight: 'bold'
    })
    endMarker.setLabel(endLabel)
    mapInstanceRef.current.addOverlay(endMarker)

    markersRef.current = [startMarker, endMarker]

    // 自动调整视野
    mapInstanceRef.current.setViewport(path)
  }

  // 格式化时长
  const formatDuration = (seconds) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60
    return `${hours}小时${minutes}分${secs}秒`
  }

  // 格式化时间
  const formatTime = (isoString) => {
    const date = new Date(isoString)
    return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  }

  // 权限检查
  if (user?.role !== 'admin') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-xl text-red-600">您没有权限访问此页面</div>
      </div>
    )
  }

  const selectedUser = users.find((u) => u.id === selectedUserId)

  return (
    <div className="h-screen flex flex-col">
      {/* 顶部导航栏 */}
      <div className="bg-indigo-600 text-white p-4 flex items-center justify-between">
        <h1 className="text-xl font-bold">管理员面板</h1>
        <div className="flex items-center gap-3">
          <span className="text-sm">管理员：{user?.username}</span>
          <button
            onClick={() => navigate('/patrol')}
            className="bg-indigo-700 hover:bg-indigo-800 px-3 py-1 rounded text-sm"
          >
            返回巡逻
          </button>
          <button
            onClick={() => navigate('/history')}
            className="bg-purple-600 hover:bg-purple-700 px-3 py-1 rounded text-sm"
          >
            我的历史
          </button>
          <button
            onClick={() => {
              logout()
              navigate('/login')
            }}
            className="bg-red-600 hover:bg-red-700 px-3 py-1 rounded text-sm"
          >
            退出
          </button>
        </div>
      </div>

      {/* 查询面板 */}
      <div className="bg-white border-b p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">选择用户</label>
            <select
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
            >
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.username} {u.role === 'admin' ? '(管理员)' : ''}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">选择日期</label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              max={new Date().toISOString().split('T')[0]}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>
      </div>

      {/* 地图区域 */}
      <div ref={mapRef} className="flex-1 relative">
        {loading && (
          <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center z-10">
            <div className="text-lg">加载中...</div>
          </div>
        )}

        {error && (
          <div className="absolute top-4 left-4 right-4 bg-yellow-500 text-white px-4 py-3 rounded shadow-lg z-10">
            {error}
          </div>
        )}

        {/* 巡逻信息面板 */}
        {patrolData && selectedUser && (
          <div className="absolute top-4 left-4 bg-white rounded-lg shadow-lg p-4 z-10 max-w-xs">
            <h3 className="text-lg font-bold mb-3 text-gray-800">
              {selectedUser.username} 的巡逻记录
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">开始时间：</span>
                <span className="font-semibold">{formatTime(patrolData.start_time)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">结束时间：</span>
                <span className="font-semibold">{formatTime(patrolData.end_time)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">巡逻时长：</span>
                <span className="font-semibold text-indigo-600">{formatDuration(patrolData.duration)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">记录点数：</span>
                <span className="font-semibold">{patrolData.locations.length} 个</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default Admin
