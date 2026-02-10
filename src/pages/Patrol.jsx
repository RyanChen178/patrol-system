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
  const [currentAccuracy, setCurrentAccuracy] = useState(null)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const mapRef = useRef(null)
  const mapInstanceRef = useRef(null)
  const markerRef = useRef(null)
  const accuracyCircleRef = useRef(null)
  const polylineRef = useRef(null)
  const locationsRef = useRef([])
  const geolocationRef = useRef(null)
  const watchIdRef = useRef(null)
  const timerRef = useRef(null)
  const lastRecordTimeRef = useRef(0)

  // 初始化百度地图
  useEffect(() => {
    if (!window.BMap || !window.BMapGL) {
      // 尝试使用BMapGL，如果不存在则使用BMap
      window.BMapGL = window.BMap
    }

    if (!window.BMapGL) {
      setError('百度地图加载失败，请检查网络连接')
      return
    }

    // 创建地图实例
    const map = new window.BMapGL.Map(mapRef.current)
    const point = new window.BMapGL.Point(116.404, 39.915) // 默认中心点（北京）
    map.centerAndZoom(point, 17)
    map.enableScrollWheelZoom(true)

    mapInstanceRef.current = map

    // 创建定位控件
    const geolocation = new window.BMapGL.Geolocation()
    geolocationRef.current = geolocation

    // 获取初始位置
    geolocation.getCurrentPosition((result) => {
      if (geolocation.getStatus() === 0) {
        // 定位成功
        const point = result.point
        map.centerAndZoom(point, 17)
        console.log('✓ 初始定位成功:', point.lng, point.lat, '精度:', result.accuracy, '米')
      } else {
        console.warn('初始定位失败')
      }
    }, {
      enableHighAccuracy: true
    })

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current = null
      }
    }
  }, [])

  // 计算两点之间的距离（米）- 使用百度提供的方法
  const calculateDistance = (lat1, lng1, lat2, lng2) => {
    if (window.BMapGL && window.BMapGL.Map) {
      const point1 = new window.BMapGL.Point(lng1, lat1)
      const point2 = new window.BMapGL.Point(lng2, lat2)
      return mapInstanceRef.current.getDistance(point1, point2).toFixed(2)
    }

    // 备用算法
    const R = 6371e3
    const φ1 = (lat1 * Math.PI) / 180
    const φ2 = (lat2 * Math.PI) / 180
    const Δφ = ((lat2 - lat1) * Math.PI) / 180
    const Δλ = ((lng2 - lng1) * Math.PI) / 180

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

    return R * c
  }

  // 处理位置更新
  const handlePositionUpdate = () => {
    if (!geolocationRef.current) return

    geolocationRef.current.getCurrentPosition((result) => {
      const geolocation = geolocationRef.current

      if (geolocation.getStatus() !== 0) {
        console.warn('定位失败')
        return
      }

      const point = result.point
      const lng = point.lng
      const lat = point.lat
      const accuracy = result.accuracy || 999
      const now = Date.now()

      // 更新当前精度显示
      setCurrentAccuracy(accuracy)

      // 精度过滤：只接受精度小于100米的点
      if (accuracy > 100) {
        console.warn(`定位精度不足: ${accuracy.toFixed(1)}米，已跳过`)
        return
      }

      // 时间过滤：至少间隔5秒记录一次
      if (now - lastRecordTimeRef.current < 5000) {
        return
      }

      // 距离过滤：与上一个点距离至少2米才记录
      if (locationsRef.current.length > 0) {
        const lastLocation = locationsRef.current[locationsRef.current.length - 1]
        const distance = calculateDistance(
          lastLocation.lat,
          lastLocation.lng,
          lat,
          lng
        )

        if (distance < 2) {
          console.log(`移动距离不足: ${distance.toFixed(1)}米，已跳过`)
          return
        }
      }

      // 记录位置点
      const location = {
        lng: lng,
        lat: lat,
        accuracy: accuracy,
        timestamp: new Date().toISOString()
      }

      locationsRef.current.push(location)
      setLocationCount(locationsRef.current.length)
      lastRecordTimeRef.current = now

      console.log(`✓ 记录位置点 #${locationsRef.current.length}, 精度: ${accuracy.toFixed(1)}米`)

      // 更新标记位置
      if (markerRef.current) {
        markerRef.current.setPosition(new window.BMapGL.Point(lng, lat))
      }

      // 更新精度圈
      if (accuracyCircleRef.current) {
        mapInstanceRef.current.removeOverlay(accuracyCircleRef.current)
      }
      accuracyCircleRef.current = new window.BMapGL.Circle(
        new window.BMapGL.Point(lng, lat),
        accuracy,
        {
          strokeColor: '#4299e1',
          strokeWeight: 1,
          strokeOpacity: 0.3,
          fillColor: '#4299e1',
          fillOpacity: 0.1
        }
      )
      mapInstanceRef.current.addOverlay(accuracyCircleRef.current)

      // 更新轨迹线
      if (polylineRef.current && locationsRef.current.length >= 2) {
        const points = locationsRef.current.map((loc) => new window.BMapGL.Point(loc.lng, loc.lat))
        polylineRef.current.setPath(points)
      }

      // 地图跟随
      mapInstanceRef.current.panTo(new window.BMapGL.Point(lng, lat))
    }, {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0
    })
  }

  // 开始巡逻
  const startPatrol = () => {
    if (!geolocationRef.current) {
      setError('定位功能未初始化，请刷新页面重试')
      return
    }

    setError('')
    locationsRef.current = []
    setLocationCount(0)
    setCurrentAccuracy(null)
    setStartTime(new Date())
    setElapsedTime(0)
    setIsPatrolling(true)
    lastRecordTimeRef.current = 0

    // 清除旧的标记和轨迹
    if (markerRef.current) {
      mapInstanceRef.current.removeOverlay(markerRef.current)
    }
    if (polylineRef.current) {
      mapInstanceRef.current.removeOverlay(polylineRef.current)
    }
    if (accuracyCircleRef.current) {
      mapInstanceRef.current.removeOverlay(accuracyCircleRef.current)
    }

    // 创建当前位置标记
    markerRef.current = new window.BMapGL.Marker(new window.BMapGL.Point(116.404, 39.915))
    mapInstanceRef.current.addOverlay(markerRef.current)

    // 创建轨迹线
    polylineRef.current = new window.BMapGL.Polyline([], {
      strokeColor: '#3b82f6',
      strokeWeight: 6,
      strokeOpacity: 0.9
    })
    mapInstanceRef.current.addOverlay(polylineRef.current)

    // 立即获取第一个位置
    handlePositionUpdate()

    // 使用持续定位（每2秒获取一次）
    watchIdRef.current = setInterval(() => {
      handlePositionUpdate()
    }, 2000)

    // 启动计时器
    timerRef.current = setInterval(() => {
      setElapsedTime((prev) => prev + 1)
    }, 1000)

    console.log('✓ 巡逻已开始，使用百度地图定位（BD-09坐标系）')
  }

  // 结束巡逻
  const endPatrol = async () => {
    if (locationsRef.current.length === 0) {
      setError('没有记录到任何有效位置点')
      return
    }

    if (locationsRef.current.length < 3) {
      setError('记录点太少，请至少巡逻移动一段距离后再结束')
      return
    }

    setSaving(true)
    setError('')

    try {
      // 停止位置监听
      if (watchIdRef.current) {
        clearInterval(watchIdRef.current)
        watchIdRef.current = null
      }

      // 停止计时器
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }

      const endTime = new Date()
      const duration = Math.floor((endTime - startTime) / 1000)
      const patrolDate = startTime.toISOString().split('T')[0]

      // 计算总距离
      let totalDistance = 0
      for (let i = 1; i < locationsRef.current.length; i++) {
        const prev = locationsRef.current[i - 1]
        const curr = locationsRef.current[i]
        totalDistance += parseFloat(calculateDistance(prev.lat, prev.lng, curr.lat, curr.lng))
      }

      // 保存到数据库
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

      alert(
        `巡逻记录已保存！\n` +
        `时长：${formatDuration(duration)}\n` +
        `位置点：${locationsRef.current.length}个\n` +
        `总距离：${totalDistance.toFixed(0)}米`
      )

      // 重置状态
      setIsPatrolling(false)
      setStartTime(null)
      setElapsedTime(0)
      setCurrentAccuracy(null)
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

  // 清理
  useEffect(() => {
    return () => {
      if (watchIdRef.current) {
        clearInterval(watchIdRef.current)
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
            <div className="text-sm text-gray-600 mb-1">已记录 {locationCount} 个位置点</div>
            {currentAccuracy !== null && (
              <div className="text-xs mt-2 flex items-center">
                <span className={`inline-block w-2 h-2 rounded-full mr-2 ${
                  currentAccuracy < 30 ? 'bg-green-500' :
                  currentAccuracy < 100 ? 'bg-yellow-500' : 'bg-red-500'
                }`}></span>
                <span className="text-gray-500">
                  GPS精度: {currentAccuracy.toFixed(1)}米
                </span>
              </div>
            )}
            <div className="text-xs text-gray-400 mt-2">
              {currentAccuracy && currentAccuracy < 30 && '✓ 精度优秀'}
              {currentAccuracy && currentAccuracy >= 30 && currentAccuracy < 100 && '✓ 精度良好'}
              {currentAccuracy && currentAccuracy >= 100 && '⚠ 精度较差'}
            </div>
            <div className="text-xs text-blue-500 mt-2">百度地图 BD-09</div>
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
            disabled={saving || locationCount < 3}
            className="w-full bg-red-600 hover:bg-red-700 text-white py-4 rounded-lg text-xl font-bold shadow-lg disabled:opacity-50"
          >
            {saving ? '保存中...' : locationCount < 3 ? '移动中...' : '结束巡逻'}
          </button>
        )}
      </div>
    </div>
  )
}

export default Patrol
