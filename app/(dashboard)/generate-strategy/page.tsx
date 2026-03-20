'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

interface StrategyData {
  methodology: {
    core_principle: string
    study_cycle: string
    time_allocation: Record<string, string>
  }
  weekly_structure: Record<string, { focus: string; task_type: string; intensity: string }>
  daily_routine: Record<string, { time: string; duration: string; content: string }>
  milestones: Array<{ day: number; target: string; checkpoint: string }>
  adaptive_rules: string
}

export default function GenerateStrategyPage() {
  const [profile, setProfile] = useState<any>(null)
  const [strategy, setStrategy] = useState<StrategyData | null>(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [debugInfo, setDebugInfo] = useState('')
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    fetchProfile()
  }, [])

  const fetchProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single()
        setProfile(data)
      }
    } catch (err) {
      console.error('Error fetching profile:', err)
    }
  }

  const generateStrategy = async () => {
    if (!profile) {
      setMessage('请先完善学习档案')
      return
    }

    setLoading(true)
    setMessage('')
    setDebugInfo('')

    try {
      // 调用后端 API 生成策略
      const response = await fetch('/api/generate-strategy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          exam_type: profile.exam_type,
          current_level: profile.current_level,
          target_score: profile.target_score,
          daily_study_time: profile.daily_study_time,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        console.error('API Error:', response.status, errorData)
        setDebugInfo(JSON.stringify({ status: response.status, error: errorData }, null, 2))
        throw new Error(errorData.error || `API 调用失败: ${response.status}`)
      }

      const data = await response.json()
      setStrategy(data.strategy)
    } catch (err: any) {
      console.error('Generate strategy error:', err)
      setMessage('生成策略失败: ' + (err.message || '请稍后重试'))
    } finally {
      setLoading(false)
    }
  }

  const saveStrategy = async () => {
    if (!strategy) return

    setSaving(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      const { error } = await supabase.from('learning_strategies').insert({
        user_id: user?.id,
        strategy_json: strategy,
        methodology_summary: strategy.methodology.core_principle,
        weekly_structure: strategy.weekly_structure,
      })

      if (error) throw error

      router.push('/')
    } catch (err) {
      setMessage('保存失败，请重试')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white rounded-2xl shadow-lg p-8 mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">生成你的学习策略</h1>
          
          {!strategy ? (
            <div className="space-y-4">
              <div className="bg-blue-50 p-4 rounded-lg">
                <p className="text-sm text-blue-800">
                  <span className="font-medium">AI 模型:</span> deepseek-ai/DeepSeek-V3.2
                </p>
                <p className="text-sm text-blue-800">
                  <span className="font-medium">服务提供商:</span> 硅基流动 (SiliconFlow)
                </p>
              </div>

              {!profile && (
                <div className="text-sm text-amber-600 bg-amber-50 p-3 rounded-lg">
                  请先<a href="/onboarding" className="underline font-medium">完善学习档案</a>，才能生成学习策略
                </div>
              )}

              {message && (
                <div className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">
                  {message}
                </div>
              )}

              {debugInfo && (
                <div className="text-xs text-gray-600 bg-gray-100 p-3 rounded-lg overflow-auto max-h-40">
                  <p className="font-medium mb-1">调试信息:</p>
                  <pre>{debugInfo}</pre>
                </div>
              )}

              <button
                onClick={generateStrategy}
                disabled={loading || !profile}
                className="w-full py-4 px-6 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? 'AI 正在生成策略...' : '生成学习策略'}
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="bg-blue-50 p-6 rounded-xl">
                <h2 className="text-lg font-semibold text-blue-900 mb-2">核心方法论</h2>
                <p className="text-blue-800">{strategy.methodology.core_principle}</p>
                <p className="mt-2 text-sm text-blue-700">{strategy.methodology.study_cycle}</p>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-3">时间分配</h3>
                <div className="grid grid-cols-2 gap-3">
                  {Object.entries(strategy.methodology.time_allocation).map(([key, value]) => (
                    <div key={key} className="bg-gray-50 p-3 rounded-lg">
                      <span className="font-medium capitalize">{key}: </span>
                      <span className="text-gray-600">{value}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-3">每周结构</h3>
                <div className="space-y-2">
                  {Object.entries(strategy.weekly_structure).map(([day, data]) => (
                    <div key={day} className="flex items-center justify-between bg-gray-50 p-3 rounded-lg">
                      <span className="font-medium capitalize w-20">{day}</span>
                      <span className="text-gray-600 flex-1">{data.focus} - {data.task_type}</span>
                      <span className={`px-2 py-1 rounded text-xs ${
                        data.intensity === 'high' ? 'bg-red-100 text-red-700' :
                        data.intensity === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-green-100 text-green-700'
                      }`}>
                        {data.intensity}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-3">里程碑</h3>
                <div className="space-y-3">
                  {strategy.milestones.map((milestone, idx) => (
                    <div key={idx} className="border-l-4 border-blue-500 pl-4 py-2">
                      <div className="font-medium">第 {milestone.day} 天</div>
                      <div className="text-gray-700">{milestone.target}</div>
                      <div className="text-sm text-gray-500">验证方式: {milestone.checkpoint}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-4 pt-4">
                <button
                  onClick={() => setStrategy(null)}
                  className="flex-1 py-3 px-6 border border-gray-300 rounded-lg font-medium hover:bg-gray-50"
                >
                  重新生成
                </button>
                <button
                  onClick={saveStrategy}
                  disabled={saving}
                  className="flex-1 py-3 px-6 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50"
                >
                  {saving ? '保存中...' : '确认并保存策略'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
