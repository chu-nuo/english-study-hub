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
  const [apiKey, setApiKey] = useState('')
  const [strategy, setStrategy] = useState<StrategyData | null>(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    fetchProfile()
  }, [])

  const fetchProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()
      setProfile(data)
    }
  }

  const generateStrategy = async () => {
    if (!apiKey) {
      setMessage('请输入 AI API Key')
      return
    }
    if (!profile) {
      setMessage('请先完善学习档案')
      return
    }

    setLoading(true)
    setMessage('')

    try {
      // 读取 prompt 模板
      const promptResponse = await fetch('/prompts/strategy-generator.md')
      let promptTemplate = await promptResponse.text()

      // 替换变量
      const prompt = promptTemplate
        .replace('{exam_type}', profile.exam_type)
        .replace('{current_level}', profile.current_level)
        .replace('{target_score}', profile.target_score)
        .replace('{daily_study_time}', profile.daily_study_time)

      // 调用 AI API (SiliconFlow)
      const response = await fetch('https://api.siliconflow.cn/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'deepseek-ai/DeepSeek-V3.2',
          messages: [
            { role: 'system', content: '你是一个专业的英语学习策略规划师。请严格按照用户要求输出 JSON 格式。' },
            { role: 'user', content: prompt }
          ],
          temperature: 0.7,
        }),
      })

      if (!response.ok) {
        throw new Error('API 调用失败')
      }

      const data = await response.json()
      const content = data.choices[0].message.content
      
      // 提取 JSON
      const jsonMatch = content.match(/```json\n?([\s\S]*?)\n?```/) || content.match(/{[\s\S]*}/)
      const jsonStr = jsonMatch ? jsonMatch[1] || jsonMatch[0] : content
      
      const parsedStrategy = JSON.parse(jsonStr)
      setStrategy(parsedStrategy)
    } catch (err) {
      setMessage('生成策略失败，请检查 API Key 是否正确')
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
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  AI API Key
                </label>
                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                />
                <p className="mt-1 text-xs text-gray-500">请输入硅基流动 (SiliconFlow) 的 API Key，使用 DeepSeek-V3.2 模型</p>
              </div>

              {message && (
                <div className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">{message}</div>
              )}

              <button
                onClick={generateStrategy}
                disabled={loading}
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
