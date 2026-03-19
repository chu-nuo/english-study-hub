'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

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
  const [apiKey, setApiKey] = useState('')
  const [selectedTypes, setSelectedTypes] = useState<string[]>(['reading', 'vocabulary'])
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
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
    }
  }

  const generateTasks = async () => {
    if (!apiKey) {
      setMessage('请输入 AI API Key')
      return
    }
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

      const prompt = `基于以下学习策略，为今天生成具体的学习任务：

考试类型: ${profile.exam_type}
当前水平: ${profile.current_level}
目标分数: ${profile.target_score}
每日学习时间: ${profile.daily_study_time} 分钟

今日计划重点: ${weeklyPlan?.focus || '综合训练'}
任务类型: ${weeklyPlan?.task_type || '多样化训练'}

请生成 ${selectedTypes.length} 个具体任务，每个任务包含：
1. 任务标题
2. 任务描述
3. 预计完成时间（分钟）
4. 具体步骤

输出格式为 JSON 数组：
[
  {
    "title": "任务标题",
    "description": "任务描述",
    "duration": 30,
    "steps": ["步骤1", "步骤2", "步骤3"]
  }
]`

      const response = await fetch('https://api.siliconflow.cn/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'deepseek-ai/DeepSeek-V3.2',
          messages: [
            { role: 'system', content: '你是一个专业的英语学习任务规划师。请严格按照用户要求输出 JSON 格式。' },
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
      
      const jsonMatch = content.match(/```json\n?([\s\S]*?)\n?```/) || content.match(/\[[\s\S]*\]/)
      const jsonStr = jsonMatch ? jsonMatch[1] || jsonMatch[0] : content
      
      const tasks = JSON.parse(jsonStr)

      // 保存任务到数据库
      const { data: { user } } = await supabase.auth.getUser()
      
      for (let i = 0; i < tasks.length; i++) {
        await supabase.from('daily_tasks').insert({
          user_id: user?.id,
          task_date: today,
          task_type: selectedTypes[i] || 'reading',
          content: tasks[i],
        })
      }

      router.push('/')
    } catch (err) {
      setMessage('生成任务失败，请检查 API Key 是否正确')
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
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-lg mx-auto bg-white rounded-2xl shadow-lg p-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">生成今日任务</h1>
        
        <div className="space-y-6">
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
            <p className="mt-1 text-xs text-gray-500">请输入硅基流动 (SiliconFlow) 的 API Key</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              选择今日任务类型
            </label>
            <div className="space-y-2">
              {taskTypes.map((type) => (
                <label
                  key={type.value}
                  className={`flex items-center p-3 rounded-lg border-2 cursor-pointer transition-all ${
                    selectedTypes.includes(type.value)
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selectedTypes.includes(type.value)}
                    onChange={() => toggleTaskType(type.value)}
                    className="w-4 h-4 text-blue-600 rounded"
                  />
                  <span className="ml-3">{type.label}</span>
                </label>
              ))}
            </div>
          </div>

          {message && (
            <div className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">{message}</div>
          )}

          <button
            onClick={generateTasks}
            disabled={loading || selectedTypes.length === 0}
            className="w-full py-4 px-6 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'AI 正在生成任务...' : `生成 ${selectedTypes.length} 个任务`}
          </button>
        </div>
      </div>
    </div>
  )
}
