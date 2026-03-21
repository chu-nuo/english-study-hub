'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const taskTypes = [
  { value: 'reading', label: '阅读理解' },
  { value: 'listening', label: '听力训练' },
  { value: 'writing', label: '写作练习' },
  { value: 'vocabulary', label: '词汇学习' },
  { value: 'review', label: '复习巩固' },
]

export default function GenerateDailyPage() {
  const [profile, setProfile] = useState<any>(null)
  const [strategy, setStrategy] = useState<any>(null)
  const [selectedTypes, setSelectedTypes] = useState<string[]>(['reading', 'vocabulary'])
  const [loading, setLoading] = useState(false)
  const [initialLoading, setInitialLoading] = useState(true)
  const [message, setMessage] = useState('')
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setInitialLoading(true)
    
    // 10秒超时保护
    const timeoutId = setTimeout(() => {
      setInitialLoading(false)
      setMessage('加载超时，请刷新页面重试')
    }, 10000)
    
    try {
      const { data: { user } } = await supabase.auth.getUser()
      clearTimeout(timeoutId)
      
      if (!user) {
        setInitialLoading(false)
        return
      }
      
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()
      setProfile(profileData)

      const { data: strategyData } = await supabase
        .from('learning_strategies')
        .select('*')
        .eq('user_id', user.id)
        .single()
      setStrategy(strategyData)
    } catch (error) {
      console.error('获取数据失败:', error)
      setMessage('加载数据失败，请刷新页面')
    } finally {
      setInitialLoading(false)
    }
  }

  const generateTasks = async () => {
    if (!profile || !strategy) {
      setMessage('请先完善学习档案并生成策略')
      return
    }

    setLoading(true)
    setMessage('')

    try {
      const today = new Date().toISOString().split('T')[0]
      const dayOfWeek = new Date().toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase()
      const weeklyPlan = strategy.strategy_json?.weekly_structure?.[dayOfWeek]

      // 调用后端 API 生成任务
      const response = await fetch('/api/generate-daily', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          exam_type: profile.exam_type,
          current_level: profile.current_level,
          target_score: profile.target_score,
          daily_study_time: profile.daily_study_time,
          day_of_week: dayOfWeek,
          weekly_focus: weeklyPlan?.focus || '综合训练',
          task_types: selectedTypes,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `API 调用失败: ${response.status}`)
      }

      const data = await response.json()
      const tasks = data.tasks

      if (!Array.isArray(tasks) || tasks.length === 0) {
        throw new Error('生成的任务格式错误')
      }

      // 保存任务到数据库
      const { data: { user } } = await supabase.auth.getUser()
      console.log('Current user:', user?.id)
      
      if (!user?.id) {
        throw new Error('用户未登录或会话已过期')
      }
      
      // 先删除今日已有任务（避免唯一约束冲突）
      const { error: deleteError } = await supabase
        .from('daily_tasks')
        .delete()
        .eq('user_id', user.id)
        .eq('task_date', today)
      
      if (deleteError) {
        console.error('删除旧任务失败:', deleteError)
      }
      
      for (let i = 0; i < tasks.length; i++) {
        const taskData = {
          user_id: user.id,
          task_date: today,
          task_type: selectedTypes[i] || 'reading',
          content: tasks[i],
          audio_text: tasks[i].audio_text || null,
        }
        console.log('Inserting task:', JSON.stringify(taskData, null, 2))
        
        const { error: insertError } = await supabase.from('daily_tasks').insert(taskData)
        
        if (insertError) {
          console.error('插入任务失败:', JSON.stringify(insertError, null, 2))
          throw new Error(`保存任务失败: ${insertError.message || insertError.code || JSON.stringify(insertError)}`)
        }
      }

      console.log('All tasks inserted successfully, redirecting...')
      router.push('/')
    } catch (err: any) {
      setMessage('生成任务失败: ' + (err.message || '请稍后重试'))
    } finally {
      setLoading(false)
    }
  }

  const toggleTaskType = (type: string) => {
    setSelectedTypes(prev =>
      prev.includes(type)
        ? prev.filter(t => t !== type)
        : [...prev, type]
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8 px-4">
      <div className="max-w-lg mx-auto bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">生成今日任务</h1>
        
        <div className="space-y-6">
          <div className="bg-blue-50 dark:bg-blue-900/30 p-4 rounded-lg">
            <p className="text-sm text-blue-800 dark:text-blue-300">
              <span className="font-medium">AI 模型:</span> deepseek-ai/DeepSeek-V3.2
            </p>
            <p className="text-sm text-blue-800 dark:text-blue-300">
              <span className="font-medium">服务提供商:</span> 硅基流动 (SiliconFlow)
            </p>
          </div>

          {!profile && (
            <div className="text-sm text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/30 p-3 rounded-lg">
              请先<a href="/onboarding" className="underline font-medium">完善学习档案</a>
            </div>
          )}

          {!strategy && (
            <div className="text-sm text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/30 p-3 rounded-lg">
              请先<a href="/generate-strategy" className="underline font-medium">生成学习策略</a>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-3">
              选择今日任务类型
            </label>
            <div className="space-y-2">
              {taskTypes.map((type) => (
                <label
                  key={type.value}
                  className={`flex items-center p-3 rounded-lg border-2 cursor-pointer transition-all ${
                    selectedTypes.includes(type.value)
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30'
                      : 'border-gray-200 dark:border-gray-600 hover:border-gray-300'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selectedTypes.includes(type.value)}
                    onChange={() => toggleTaskType(type.value)}
                    className="w-4 h-4 text-blue-600 rounded"
                  />
                  <span className="ml-3 text-gray-900 dark:text-gray-100">{type.label}</span>
                </label>
              ))}
            </div>
          </div>

          {message && (
            <div className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30 p-3 rounded-lg">{message}</div>
          )}

          <button
            onClick={generateTasks}
            disabled={loading || initialLoading || selectedTypes.length === 0 || !profile || !strategy}
            className="w-full py-4 px-6 bg-blue-600 dark:bg-blue-700 text-white rounded-lg font-medium hover:bg-blue-700 dark:hover:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {initialLoading ? '加载中...' : loading ? 'AI 正在生成任务...' : `生成 ${selectedTypes.length} 个任务`}
          </button>
        </div>
      </div>
    </div>
  )
}
