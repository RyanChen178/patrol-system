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
  const watchIdRef = useRef(null)
  const timerRef = useRef(null)
  const lastRecordTimeRef = useRef(0)

  // 初始化地图
  useEffect(() => {
    if (!window.AMap) {
      setError('高德地图加载失败')
      return
    }

    const map = new window.AMap.Map(mapRef.current, {
      zoom: 17,
      center: [116.397428, 39.90923],
      mapStyle: 'amap://styles/normal'
    })

    mapInstanceRef.current = map

    // 使用浏览器原生API获取初始位置
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { longitude, latitude } = position.coords
          map.setCenter([longitude, latitude])
        },
        (error) => {
          console.warn('初始定位失败:', error.message)
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        }
      )
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.destroy()
      }
    }
  }, [])

  // 计算两点之间的距离（米）
  const calculateDistance = (lat1, lng1, lat2, lng2) => {
    const R = 6371e3 // 地球半径（米）
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
  const handlePositionUpdate = (position) => {
    const { latitude, longitude, accuracy } = position.coords
    const now = Date.now()

    // 精度过滤：只接受精度小于50米的点
    if (accuracy > 50) {
      console.warn(`定位精度不足: ${accuracy.toFixed(1)}米，已跳过`)
      setCurrentAccuracy(accuracy)
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
        latitude,
        longitude
      )

      if (distance < 2) {
        console.log(`移动距离不足: ${distance.toFixed(1)}米，已跳过`)
        return
      }
    }

    // 记录位置点
    const location = {
      lng: longitude,
      lat: latitude,
      accuracy: accuracy,
      timestamp: new Date().toISOString()
    }

    locationsRef.current.push(location)
    setLocationCount(locationsRef.current.length)
    setCurrentAccuracy(accuracy)
    lastRecordTimeRef.current = now

    console.log(`✓ 记录位置点 #${locationsRef.current.length}, 精度: ${accuracy.toFixed(1)}米`)

    // 更新标记位置
    if (markerRef.current) {
      markerRef.current.setPosition([longitude, latitude])
    }

    // 更新精度圈
    if (accuracyCircleRef.current) {
      mapInstanceRef.current.remove(accuracyCircleRef.current)
    }
    accuracyCircleRef.current = new window.AMap.Circle({
      map: mapInstanceRef.current,
      center: [longitude, latitude],
      radius: accuracy,
      strokeColor: '#4299e1',
      strokeWeight: 1,
      strokeOpacity: 0.3,
      fillColor: '#4299e1',
      fillOpacity: 0.1
    })

    // 更新轨迹线
    if (polylineRef.current && locationsRef.current.length >= 2) {
      const path = locationsRef.current.map((loc) => [loc.lng, loc.lat])
      polylineRef.current.setPath(path)
    }

    // 地图跟随
    mapInstanceRef.current.setCenter([longitude, latitude])
  }

  // 开始巡逻
  const startPatrol = () => {
    if (!navigator.geolocation) {
      setError('您的设备不支持GPS定位')
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
      mapInstanceRef.current.remove(markerRef.current)
    }
    if (polylineRef.current) {
      mapInstanceRef.current.remove(polylineRef.current)
    }
    if (accuracyCircleRef.current) {
      mapInstanceRef.current.remove(accuracyCircleRef.current)
    }

    // 创建当前位置标记
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
      strokeOpacity: 0.9,
      lineJoin: 'round',
      lineCap: 'round'
    })

    // 使用watchPosition持续监听位置变化（高精度模式）
    watchIdRef.current = navigator.geolocation.watchPosition(
      handlePositionUpdate,
      (error) => {
        console.error('定位错误:', error.message)
        switch (error.code) {
          case error.PERMISSION_DENIED:
            setError('请允许浏览器访问位置权限')
            break
          case error.POSITION_UNAVAILABLE:
            setError('无法获取位置信息，请确保GPS已开启')
            break
          case error.TIMEOUT:
            setError('定位超时，请检查网络连接')
            break
          default:
            setError('定位失败: ' + error.message)
        }
      },
      {
        enableHighAccuracy: true, // 启用高精度模式（使用GPS）
        timeout: 10000, // 10秒超时
        maximumAge: 0 // 不使用缓存位置
      }
    )

    // 启动计时器
    timerRef.current = setInterval(() => {
      setElapsedTime((prev) => prev + 1)
    }, 1000)
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
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current)
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
        totalDistance += calculateDistance(prev.lat, prev.lng, curr.lat, curr.lng)
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
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current)
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
                  currentAccuracy < 20 ? 'bg-green-500' :
                  currentAccuracy < 50 ? 'bg-yellow-500' : 'bg-red-500'
                }`}></span>
                <span className="text-gray-500">
                  GPS精度: {currentAccuracy.toFixed(1)}米
                </span>
              </div>
            )}
            <div className="text-xs text-gray-400 mt-2">
              {currentAccuracy && currentAccuracy < 20 && '✓ 精度优秀'}
              {currentAccuracy && currentAccuracy >= 20 && currentAccuracy < 50 && '✓ 精度良好'}
              {currentAccuracy && currentAccuracy >= 50 && '⚠ 精度较差'}
            </div>
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
