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

// 简单的任务标题模板
const taskTemplates = {
  reading: {
    title: '阅读理解练习',
    description: '完成一篇阅读理解练习',
    content: '阅读以下文章并回答问题',
    duration: 25,
  },
  listening: {
    title: '听力练习',
    description: '完成一段听力练习',
    content: '听录音并回答问题',
    duration: 20,
  },
  writing: {
    title: '写作练习',
    description: '完成一篇写作练习',
    content: '根据题目要求完成写作',
    duration: 30,
  },
  vocabulary: {
    title: '词汇学习',
    description: '学习今日重点词汇',
    content: '学习以下重点词汇',
    duration: 15,
  },
  grammar: {
    title: '语法练习',
    description: '完成语法练习题',
    content: '完成以下语法练习',
    duration: 15,
  },
}

// 尝试解析 JSON，处理各种格式问题
function parseJSON(str: string): any {
  // 移除 markdown 代码块标记
  let cleaned = str.trim()
  
  // 移除 ```json 和 ``` 标记
  cleaned = cleaned.replace(/```json\s*/g, '')
  cleaned = cleaned.replace(/```\s*/g, '')
  
  // 移除开头的非 JSON 字符直到找到 {
  const firstBrace = cleaned.indexOf('{')
  const firstBracket = cleaned.indexOf('[')
  
  if (firstBrace === -1 && firstBracket === -1) {
    throw new Error('No JSON found in response')
  }
  
  let start = firstBrace
  if (firstBracket !== -1 && (firstBrace === -1 || firstBracket < firstBrace)) {
    start = firstBracket
  }
  
  cleaned = cleaned.substring(start)
  
  // 如果以 [ 结尾但中间有 }，尝试修复
  if (cleaned.startsWith('[') && !cleaned.endsWith(']')) {
    const lastBrace = cleaned.lastIndexOf('}')
    if (lastBrace !== -1) {
      cleaned = cleaned.substring(0, lastBrace + 1)
    }
  }
  
  return JSON.parse(cleaned)
}

export default function AddTaskButton() {
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [selectedType, setSelectedType] = useState('reading')
  const [error, setError] = useState('')
  const supabase = createClient()

  const handleGenerate = async () => {
    setLoading(true)
    setError('')

    try {
      // 检查用户登录状态
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      if (authError || !user) {
        setError('请先登录')
        setLoading(false)
        return
      }

      const today = new Date().toISOString().split('T')[0]

      // 使用简单的 prompt
      const simplePrompt = `Generate a JSON array with 1 learning task object for ${selectedType} practice. 

Response format (only JSON, no other text):
[{"title": "Task Title", "description": "Task description", "content": "Task content or question", "duration": number}]

Example for reading:
[{"title": "Reading Comprehension", "description": "Complete this reading exercise", "content": "Read the passage and answer the questions...", "duration": 25}]

Respond with JSON only:`

      // 调用 AI API
      const response = await fetch(API_CONFIG.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${API_CONFIG.apiKey}`,
        },
        body: JSON.stringify({
          model: API_CONFIG.model,
          messages: [
            { role: 'system', content: 'You are a JSON generator. Output ONLY valid JSON, no explanations or other text.' },
            { role: 'user', content: simplePrompt }
          ],
          temperature: 0.3,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(`API调用失败: ${errorData.error?.message || response.statusText}`)
      }

      const data = await response.json()
      const content = data.choices?.[0]?.message?.content || ''
      
      console.log('AI raw response:', content)
      
      // 解析 JSON
      let taskContent
      try {
        const parsed = parseJSON(content)
        if (Array.isArray(parsed) && parsed.length > 0) {
          taskContent = parsed[0]
        } else if (typeof parsed === 'object') {
          taskContent = parsed
        } else {
          throw new Error('Invalid JSON structure')
        }
      } catch (parseErr) {
        console.error('JSON解析失败，使用默认模板')
        // 使用默认模板
        taskContent = taskTemplates[selectedType as keyof typeof taskTemplates]
      }

      // 确保必要字段存在
      if (!taskContent.title) {
        taskContent.title = taskTemplates[selectedType as keyof typeof taskTemplates].title
      }
      if (!taskContent.duration) {
        taskContent.duration = taskTemplates[selectedType as keyof typeof taskTemplates].duration
      }

      console.log('Final task content:', taskContent)

      // 保存到数据库
      const { error: insertError } = await supabase.from('daily_tasks').insert({
        user_id: user.id,
        task_date: today,
        task_type: selectedType,
        content: taskContent,
        audio_text: taskContent.audio_text || null,
        is_completed: false,
      })

      if (insertError) {
        console.error('数据库插入失败:', insertError)
        throw new Error('保存任务失败: ' + insertError.message)
      }

      // 关闭弹窗并刷新
      alert('任务生成成功！')
      setIsOpen(false)
      window.location.reload()

    } catch (err: any) {
      console.error('生成任务失败:', err)
      setError(err.message || '生成任务失败，请重试')
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
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
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
                    <span className="animate-spin">⏳</span>
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
