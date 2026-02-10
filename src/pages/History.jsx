import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../utils/supabase'

const History = () => {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [patrolData, setPatrolData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const mapRef = useRef(null)
  const mapInstanceRef = useRef(null)
  const polylineRef = useRef(null)
  const markersRef = useRef([])

  // 初始化地图
  useEffect(() => {
    if (!window.AMap) {
      setError('高德地图加载失败')
      return
    }

    const map = new window.AMap.Map(mapRef.current, {
      zoom: 13,
      center: [116.397428, 39.90923],
      mapStyle: 'amap://styles/normal'
    })

    mapInstanceRef.current = map

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.destroy()
      }
    }
  }, [])

  // 加载巡逻数据
  useEffect(() => {
    loadPatrolData()
  }, [selectedDate, user])

  const loadPatrolData = async () => {
    if (!user) return

    setLoading(true)
    setError('')
    setPatrolData(null)

    try {
      const { data, error: dbError } = await supabase
        .from('patrols')
        .select('*')
        .eq('user_id', user.id)
        .eq('patrol_date', selectedDate)
        .single()

      if (dbError) {
        if (dbError.code === 'PGRST116') {
          setError('该日期没有巡逻记录')
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
      mapInstanceRef.current.remove(polylineRef.current)
    }
    if (markersRef.current.length > 0) {
      mapInstanceRef.current.remove(markersRef.current)
      markersRef.current = []
    }

    const locations = data.locations
    const path = locations.map((loc) => [loc.lng, loc.lat])

    // 绘制轨迹线
    polylineRef.current = new window.AMap.Polyline({
      map: mapInstanceRef.current,
      path: path,
      strokeColor: '#3b82f6',
      strokeWeight: 6,
      strokeOpacity: 0.8,
      lineJoin: 'round',
      lineCap: 'round'
    })

    // 添加起点标记
    const startMarker = new window.AMap.Marker({
      map: mapInstanceRef.current,
      position: [locations[0].lng, locations[0].lat],
      icon: new window.AMap.Icon({
        size: new window.AMap.Size(25, 34),
        image: '//a.amap.com/jsapi_demos/static/demo-center/icons/poi-marker-red.png',
        imageSize: new window.AMap.Size(25, 34)
      }),
      label: {
        content: '起点',
        offset: new window.AMap.Pixel(0, -35),
        direction: 'top'
      }
    })

    // 添加终点标记
    const endMarker = new window.AMap.Marker({
      map: mapInstanceRef.current,
      position: [locations[locations.length - 1].lng, locations[locations.length - 1].lat],
      icon: new window.AMap.Icon({
        size: new window.AMap.Size(25, 34),
        image: '//a.amap.com/jsapi_demos/static/demo-center/icons/poi-marker-default.png',
        imageSize: new window.AMap.Size(25, 34)
      }),
      label: {
        content: '终点',
        offset: new window.AMap.Pixel(0, -35),
        direction: 'top'
      }
    })

    markersRef.current = [startMarker, endMarker]

    // 自动调整视野
    mapInstanceRef.current.setFitView()
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

  return (
    <div className="h-screen flex flex-col">
      {/* 顶部导航栏 */}
      <div className="bg-purple-600 text-white p-4 flex items-center justify-between">
        <h1 className="text-xl font-bold">巡逻历史</h1>
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/patrol')}
            className="bg-purple-700 hover:bg-purple-800 px-3 py-1 rounded text-sm"
          >
            返回巡逻
          </button>
          {user?.role === 'admin' && (
            <button
              onClick={() => navigate('/admin')}
              className="bg-blue-600 hover:bg-blue-700 px-3 py-1 rounded text-sm"
            >
              管理
            </button>
          )}
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

      {/* 日期选择器 */}
      <div className="bg-white border-b p-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">选择日期</label>
        <input
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          max={new Date().toISOString().split('T')[0]}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
        />
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
        {patrolData && (
          <div className="absolute top-4 left-4 bg-white rounded-lg shadow-lg p-4 z-10 max-w-xs">
            <h3 className="text-lg font-bold mb-3 text-gray-800">巡逻详情</h3>
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
                <span className="font-semibold text-blue-600">{formatDuration(patrolData.duration)}</span>
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

export default History
