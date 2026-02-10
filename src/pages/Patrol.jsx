import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../utils/supabase'

const Patrol = () => {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [isPatrolling, setIsPatrolling] = useState(false)
  const [startTime, setStartTime] = useState(null)
  const [elapsedTime, setElapsedTime] = useState(0)
  const [locationCount, setLocationCount] = useState(0)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const mapRef = useRef(null)
  const mapInstanceRef = useRef(null)
  const markerRef = useRef(null)
  const polylineRef = useRef(null)
  const locationsRef = useRef([])
  const intervalRef = useRef(null)
  const timerRef = useRef(null)
  const geolocationRef = useRef(null)

  // 初始化地图
  useEffect(() => {
    if (!window.AMap) {
      setError('高德地图加载失败')
      return
    }

    const map = new window.AMap.Map(mapRef.current, {
      zoom: 15,
      center: [116.397428, 39.90923],
      mapStyle: 'amap://styles/normal'
    })

    mapInstanceRef.current = map

    // 获取当前位置
    map.plugin('AMap.Geolocation', () => {
      const geolocation = new window.AMap.Geolocation({
        enableHighAccuracy: true,
        timeout: 10000,
        zoomToAccuracy: true
      })

      geolocationRef.current = geolocation

      geolocation.getCurrentPosition((status, result) => {
        if (status === 'complete') {
          map.setCenter([result.position.lng, result.position.lat])
        }
      })
    })

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.destroy()
      }
    }
  }, [])

  // 开始巡逻
  const startPatrol = () => {
    setError('')
    locationsRef.current = []
    setLocationCount(0)
    setStartTime(new Date())
    setElapsedTime(0)
    setIsPatrolling(true)

    // 清除旧的标记和轨迹
    if (markerRef.current) {
      mapInstanceRef.current.remove(markerRef.current)
    }
    if (polylineRef.current) {
      mapInstanceRef.current.remove(polylineRef.current)
    }

    // 创建标记
    markerRef.current = new window.AMap.Marker({
      map: mapInstanceRef.current,
      icon: new window.AMap.Icon({
        size: new window.AMap.Size(25, 34),
        image: '//a.amap.com/jsapi_demos/static/demo-center/icons/poi-marker-default.png',
        imageSize: new window.AMap.Size(25, 34)
      })
    })

    // 创建轨迹线
    polylineRef.current = new window.AMap.Polyline({
      map: mapInstanceRef.current,
      strokeColor: '#3b82f6',
      strokeWeight: 6,
      strokeOpacity: 0.8,
      lineJoin: 'round',
      lineCap: 'round'
    })

    // 开始定时记录位置（每5秒）
    intervalRef.current = setInterval(() => {
      recordLocation()
    }, 5000)

    // 启动计时器
    timerRef.current = setInterval(() => {
      setElapsedTime((prev) => prev + 1)
    }, 1000)

    // 立即记录第一个点
    recordLocation()
  }

  // 记录位置
  const recordLocation = () => {
    if (geolocationRef.current) {
      geolocationRef.current.getCurrentPosition((status, result) => {
        if (status === 'complete') {
          const location = {
            lng: result.position.lng,
            lat: result.position.lat,
            timestamp: new Date().toISOString()
          }

          locationsRef.current.push(location)
          setLocationCount(locationsRef.current.length)

          // 更新标记位置
          if (markerRef.current) {
            markerRef.current.setPosition([location.lng, location.lat])
          }

          // 更新轨迹线
          if (polylineRef.current) {
            const path = locationsRef.current.map((loc) => [loc.lng, loc.lat])
            polylineRef.current.setPath(path)
          }

          // 地图跟随
          mapInstanceRef.current.setCenter([location.lng, location.lat])
        }
      })
    }
  }

  // 结束巡逻
  const endPatrol = async () => {
    if (locationsRef.current.length === 0) {
      setError('没有记录到任何位置点')
      return
    }

    setSaving(true)
    setError('')

    try {
      // 停止定时器
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }

      const endTime = new Date()
      const duration = Math.floor((endTime - startTime) / 1000)
      const patrolDate = startTime.toISOString().split('T')[0]

      // 保存到数据库（使用upsert确保同一天只有一条记录）
      const { error: dbError } = await supabase
        .from('patrols')
        .upsert(
          {
            user_id: user.id,
            patrol_date: patrolDate,
            start_time: startTime.toISOString(),
            end_time: endTime.toISOString(),
            duration: duration,
            locations: locationsRef.current
          },
          {
            onConflict: 'user_id,patrol_date'
          }
        )

      if (dbError) {
        throw new Error('保存失败：' + dbError.message)
      }

      alert(`巡逻记录已保存！\n时长：${formatDuration(duration)}\n位置点：${locationsRef.current.length}个`)

      // 重置状态
      setIsPatrolling(false)
      setStartTime(null)
      setElapsedTime(0)
      locationsRef.current = []
      setLocationCount(0)
    } catch (err) {
      setError(err.message || '保存失败')
    } finally {
      setSaving(false)
    }
  }

  // 格式化时长
  const formatDuration = (seconds) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60
    return `${hours}小时${minutes}分${secs}秒`
  }

  // 格式化计时器显示
  const formatTimer = (seconds) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
  }

  // 清理定时器
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
    }
  }, [])

  return (
    <div className="h-screen flex flex-col">
      {/* 顶部导航栏 */}
      <div className="bg-blue-600 text-white p-4 flex items-center justify-between">
        <h1 className="text-xl font-bold">高铁巡逻</h1>
        <div className="flex items-center gap-3">
          <span className="text-sm">欢迎，{user?.username}</span>
          <button
            onClick={() => navigate('/history')}
            className="bg-blue-700 hover:bg-blue-800 px-3 py-1 rounded text-sm"
          >
            历史记录
          </button>
          {user?.role === 'admin' && (
            <button
              onClick={() => navigate('/admin')}
              className="bg-purple-600 hover:bg-purple-700 px-3 py-1 rounded text-sm"
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

      {/* 地图区域 */}
      <div ref={mapRef} className="flex-1 relative">
        {error && (
          <div className="absolute top-4 left-4 right-4 bg-red-500 text-white px-4 py-3 rounded shadow-lg z-10">
            {error}
          </div>
        )}

        {/* 巡逻信息面板 */}
        {isPatrolling && (
          <div className="absolute top-4 left-4 bg-white rounded-lg shadow-lg p-4 z-10">
            <div className="text-sm text-gray-600 mb-1">巡逻中...</div>
            <div className="text-3xl font-bold text-blue-600 mb-2">{formatTimer(elapsedTime)}</div>
            <div className="text-sm text-gray-600">已记录 {locationCount} 个位置点</div>
          </div>
        )}
      </div>

      {/* 底部控制按钮 */}
      <div className="bg-white border-t p-4">
        {!isPatrolling ? (
          <button
            onClick={startPatrol}
            className="w-full bg-green-600 hover:bg-green-700 text-white py-4 rounded-lg text-xl font-bold shadow-lg"
          >
            开始巡逻
          </button>
        ) : (
          <button
            onClick={endPatrol}
            disabled={saving}
            className="w-full bg-red-600 hover:bg-red-700 text-white py-4 rounded-lg text-xl font-bold shadow-lg disabled:opacity-50"
          >
            {saving ? '保存中...' : '结束巡逻'}
          </button>
        )}
      </div>
    </div>
  )
}

export default Patrol
