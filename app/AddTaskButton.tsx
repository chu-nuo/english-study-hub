'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

const taskTypes = [
  { value: 'reading', label: '阅读', icon: '📖' },
  { value: 'listening', label: '听力', icon: '🎧' },
  { value: 'writing', label: '写作', icon: '✍️' },
  { value: 'vocabulary', label: '词汇', icon: '📝' },
  { value: 'grammar', label: '语法', icon: '📚' },
]

// 内置 API 配置
const API_CONFIG = {
  endpoint: 'https://api.siliconflow.cn/v1/chat/completions',
  apiKey: 'sk-zuokmjfwyhweoxhqwuszsiiixeqyfxmxatcvagjjtiacsblc',
  model: 'deepseek-ai/DeepSeek-V3.2',
}

// 默认任务模板
const defaultTasks = {
  reading: {
    title: '阅读理解练习',
    description: '完成一篇阅读理解练习',
    content: '阅读以下文章并回答问题，认真思考每个问题的答案。',
    duration: 25,
  },
  listening: {
    title: '听力练习',
    description: '完成一段听力练习',
    content: '听录音并回答问题，注意捕捉关键信息。',
    duration: 20,
  },
  writing: {
    title: '写作练习',
    description: '完成一篇写作练习',
    content: '根据题目要求，完成一篇不少于150字的作文。',
    duration: 30,
  },
  vocabulary: {
    title: '词汇学习',
    description: '学习今日重点词汇',
    content: '学习以下10个重点词汇，掌握其发音、词性和用法。',
    duration: 15,
  },
  grammar: {
    title: '语法练习',
    description: '完成语法练习题',
    content: '完成以下语法练习题，巩固语法知识。',
    duration: 15,
  },
}

export default function AddTaskButton() {
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [selectedType, setSelectedType] = useState('reading')
  const [error, setError] = useState('')
  const [debug, setDebug] = useState('')
  const supabase = createClient()

  const handleGenerate = async () => {
    setLoading(true)
    setError('')
    setDebug('开始生成任务...\n')

    try {
      // 步骤1：检查用户登录状态
      setDebug(prev => prev + '1. 检查登录状态...\n')
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      
      if (authError) {
        setDebug(prev => prev + `登录检查失败: ${authError.message}\n`)
        setError('检查登录状态失败: ' + authError.message)
        setLoading(false)
        return
      }
      
      if (!user) {
        setDebug(prev => prev + '用户未登录\n')
        setError('请先登录')
        setLoading(false)
        return
      }
      setDebug(prev => prev + `用户已登录: ${user.id}\n`)

      const today = new Date().toISOString().split('T')[0]
      setDebug(prev => prev + `日期: ${today}\n`)

      // 步骤2：调用 AI API
      setDebug(prev => prev + '2. 调用AI API...\n')
      
      const prompt = `Generate a simple JSON object for a ${selectedType} learning task. Only respond with valid JSON like this:
{"title": "Task Title", "description": "Description", "content": "What to do", "duration": 20}`

      const response = await fetch(API_CONFIG.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${API_CONFIG.apiKey}`,
        },
        body: JSON.stringify({
          model: API_CONFIG.model,
          messages: [
            { role: 'system', content: 'You are a JSON generator. Only output valid JSON, no other text.' },
            { role: 'user', content: prompt }
          ],
          temperature: 0.3,
        }),
      })

      setDebug(prev => prev + `AI响应状态: ${response.status}\n`)

      if (!response.ok) {
        let errorMsg = `API错误: ${response.status}`
        try {
          const errorData = await response.json()
          errorMsg += ` - ${errorData.error?.message || JSON.stringify(errorData)}`
        } catch {}
        setDebug(prev => prev + errorMsg + '\n')
        setError(errorMsg)
        setLoading(false)
        return
      }

      const data = await response.json()
      const content = data.choices?.[0]?.message?.content || ''
      setDebug(prev => prev + `AI返回内容: ${content.substring(0, 100)}...\n`)

      // 步骤3：解析 JSON
      setDebug(prev => prev + '3. 解析AI返回内容...\n')
      
      let taskContent = defaultTasks[selectedType as keyof typeof defaultTasks]
      
      // 尝试解析 AI 返回的 JSON
      try {
        // 提取 JSON
        let jsonStr = content.trim()
        const jsonMatch = jsonStr.match(/\{[\s\S]*\}/)
        if (jsonMatch) {
          jsonStr = jsonMatch[0]
          const parsed = JSON.parse(jsonStr)
          if (parsed.title) {
            taskContent = { ...taskContent, ...parsed }
            setDebug(prev => prev + `解析成功: ${taskContent.title}\n`)
          }
        } else {
          setDebug(prev => prev + '未找到JSON，使用默认模板\n')
        }
      } catch (e: any) {
        setDebug(prev => prev + `JSON解析失败: ${e.message}，使用默认模板\n`)
      }

      // 步骤4：保存到数据库
      setDebug(prev => prev + '4. 保存到数据库...\n')
      
      const { error: insertError } = await supabase.from('daily_tasks').insert({
        user_id: user.id,
        task_date: today,
        task_type: selectedType,
        content: taskContent,
        is_completed: false,
      })

      if (insertError) {
        setDebug(prev => prev + `数据库错误: ${insertError.message}\n`)
        setError('保存任务失败: ' + insertError.message)
        setLoading(false)
        return
      }

      setDebug(prev => prev + '保存成功！\n')
      
      // 成功
      alert('任务生成成功！')
      setIsOpen(false)
      window.location.reload()

    } catch (err: any) {
      const errorMsg = err.message || '未知错误'
      setDebug(prev => prev + `捕获异常: ${errorMsg}\n`)
      setError('生成失败: ' + errorMsg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="px-3 py-1 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
      >
        + AI出题
      </button>

      {/* 弹窗 */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-md mx-4 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">AI智能出题</h2>
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 text-xl"
              >
                ✕
              </button>
            </div>

            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              选择你要练习的类型，AI将为你生成相应的题目
            </p>

            <div className="grid grid-cols-3 gap-3 mb-6">
              {taskTypes.map((type) => (
                <button
                  key={type.value}
                  onClick={() => setSelectedType(type.value)}
                  className={`p-4 rounded-xl border-2 flex flex-col items-center transition-all ${
                    selectedType === type.value
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30'
                      : 'border-gray-200 dark:border-gray-600 hover:border-gray-300'
                  }`}
                >
                  <span className="text-2xl mb-1">{type.icon}</span>
                  <span className="text-sm text-gray-700 dark:text-gray-200">{type.label}</span>
                </button>
              ))}
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg text-sm">
                {error}
              </div>
            )}

            {/* 调试信息 */}
            {debug && process.env.NODE_ENV === 'development' && (
              <div className="mb-4 p-3 bg-gray-100 dark:bg-gray-700 text-xs text-gray-600 dark:text-gray-300 rounded-lg overflow-auto max-h-32 font-mono">
                <pre>{debug}</pre>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => setIsOpen(false)}
                className="flex-1 py-3 px-4 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                取消
              </button>
              <button
                onClick={handleGenerate}
                disabled={loading}
                className="flex-1 py-3 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <span>⏳</span>
                    生成中...
                  </>
                ) : (
                  <>
                    <span>✨</span>
                    生成题目
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
