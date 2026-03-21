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

// 内置 API 配置
const API_CONFIG = {
  endpoint: 'https://api.siliconflow.cn/v1/chat/completions',
  apiKey: 'sk-zuokmjfwyhweoxhqwuszsiiixeqyfxmxatcvagjjtiacsblc',
  model: 'deepseek-ai/DeepSeek-V3.2',
}

// 请求超时包装器
const fetchWithTimeout = async (url: string, options: RequestInit, timeoutMs = 60000): Promise<Response> => {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)
  
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    })
    clearTimeout(timeoutId)
    return response
  } catch (error: any) {
    clearTimeout(timeoutId)
    if (error.name === 'AbortError') {
      throw new Error('请求超时，请稍后重试')
    }
    throw error
  }
}

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

      // 根据任务类型生成更具体的内容
      const taskTypePrompts: Record<string, string> = {
        reading: '阅读理解：提供一篇雅思/托福/四六级阅读文章的标题、来源、字数，以及3-5道选择题让学生练习。题目必须包含：文章正文内容、每道题目的选项和正确答案。',
        listening: '听力训练：提供一个完整的听力练习场景。必须包含：听力音频文本（用【听力文本】标注）、3-5道听力题目（选择题）和正确答案。',
        writing: '写作练习：给出一个写作题目，包含题目描述、字数要求、参考范文或写作思路。',
        vocabulary: '词汇学习：列出10-15个今日应学习的重点词汇，每个词必须包含：单词、音标、词性、中文释义、一个例句。',
        review: '复习巩固：设计复习内容，包含之前学过的重点知识点回顾、错题整理方法。',
      }

      const selectedTaskTypes = selectedTypes.map(t => taskTypePrompts[t] || taskTypePrompts.reading).join('\n\n')

      const prompt = `你是英语学习任务生成器。请为用户生成今日具体可执行的学习任务。

用户信息：
- 考试类型: ${profile.exam_type}
- 当前水平: ${profile.current_level}
- 目标分数: ${profile.target_score}
- 每日学习时间: ${profile.daily_study_time} 分钟

今日计划重点: ${weeklyPlan?.focus || '综合训练'}

请为以下 ${selectedTypes.length} 种任务类型各生成1个具体任务：
${selectedTaskTypes}

【重要】每个任务必须包含：
1. title - 具体可执行的任务标题
2. description - 具体的任务描述，包含题目或内容
3. duration - 预计完成时间（分钟）
4. steps - 具体的执行步骤（3-5步）
5. audio_text - 【仅听力任务】包含完整的听力原文文本（用于后续生成音频），其他任务留空

【输出格式】必须是合法的JSON数组。
例如：
[
  {
    "title": "完成剑雅真题第X篇阅读",
    "description": "阅读文章并完成题目...",
    "duration": 30,
    "steps": ["先阅读题目", "快速浏览文章", "定位关键词", "答题", "核对答案"],
    "audio_text": ""
  }
]`

      const response = await fetchWithTimeout(API_CONFIG.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${API_CONFIG.apiKey}`,
        },
        body: JSON.stringify({
          model: API_CONFIG.model,
          messages: [
            { role: 'system', content: '你是一个专业的英语学习任务规划师。请严格按照用户要求输出 JSON 格式，只输出JSON数组，不要任何其他文字。' },
            { role: 'user', content: prompt }
          ],
          temperature: 0.7,
          max_tokens: 4000,
        }),
      }, 90000)

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(`API 调用失败: ${errorData.error?.message || response.statusText}`)
      }

      const data = await response.json()
      const content = data.choices[0].message.content
      
      // 尝试解析 JSON
      let tasks
      try {
        // 先尝试直接解析
        tasks = JSON.parse(content)
      } catch {
        // 如果失败，尝试提取 JSON
        const jsonMatch = content.match(/```json\n?([\s\S]*?)\n?```/) || content.match(/\[[\s\S]*\]/)
        if (jsonMatch) {
          const jsonStr = jsonMatch[1] || jsonMatch[0]
          tasks = JSON.parse(jsonStr)
        } else {
          throw new Error('AI 返回格式错误，请重试')
        }
      }

      if (!Array.isArray(tasks) || tasks.length === 0) {
        throw new Error('生成的任务格式错误，请重试')
      }

      // 保存任务到数据库
      const { data: { user } } = await supabase.auth.getUser()
      
      for (let i = 0; i < tasks.length; i++) {
        await supabase.from('daily_tasks').insert({
          user_id: user?.id,
          task_date: today,
          task_type: selectedTypes[i] || 'reading',
          content: tasks[i],
          audio_text: tasks[i].audio_text || null,
        })
      }

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
              <span className="font-medium">AI 模型:</span> {API_CONFIG.model}
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
