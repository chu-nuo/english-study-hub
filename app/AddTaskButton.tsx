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

export default function AddTaskButton() {
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [selectedType, setSelectedType] = useState('reading')
  const supabase = createClient()

  const handleGenerate = async () => {
    setLoading(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      const today = new Date().toISOString().split('T')[0]

      // 根据任务类型生成不同的 prompt
      const prompts: Record<string, string> = {
        reading: `生成一道阅读理解题目，包含：
1. 文章标题和简短描述（100字以内）
2. 文章正文（200-300字）
3. 3道选择题，每道题包含题目和4个选项
4. 答案和简要解析

输出JSON格式：
{
  "title": "题目标题",
  "description": "文章简短描述",
  "content": "文章正文",
  "questions": [{"question": "题目1", "options": ["A", "B", "C", "D"], "answer": "A", "explanation": "解析"}],
  "duration": 25
}`,

        listening: `生成一段听力练习，包含：
1. 听力场景描述（conversation/lecture/news）
2. 听力原文文本（150-200字）
3. 3道选择题和答案

输出JSON格式：
{
  "title": "听力练习标题",
  "description": "场景描述",
  "audio_text": "听力原文（用于TTS播放）",
  "questions": [{"question": "题目", "options": ["A", "B", "C", "D"], "answer": "A"}],
  "duration": 20
}`,

        writing: `生成一个写作题目，包含：
1. 题目描述
2. 要求（字数、内容要点）
3. 参考范文开头（2-3句）

输出JSON格式：
{
  "title": "写作题目",
  "description": "题目描述和要求",
  "requirements": "写作要求",
  "sample_intro": "范文开头",
  "duration": 30
}`,

        vocabulary: `生成10个词汇学习任务，包含：
1. 单词
2. 音标
3. 词性
4. 中文释义
5. 例句

输出JSON格式：
{
  "title": "今日词汇学习",
  "words": [{"word": "abandon", "phonetic": "[əˈbændən]", "pos": "v.", "meaning": "放弃，遗弃", "example": "They had to abandon their car in the snow."}],
  "duration": 20
}`,

        grammar: `生成一个语法练习，包含：
1. 语法点描述
2. 练习题（选择题或填空题）
3. 答案和解析

输出JSON格式：
{
  "title": "语法练习",
  "grammar_point": "虚拟语气",
  "questions": [{"question": "题目", "options": ["A", "B", "C", "D"], "answer": "A", "explanation": "解析"}],
  "duration": 15
}`,
      }

      const prompt = prompts[selectedType] || prompts.reading

      const response = await fetch(API_CONFIG.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${API_CONFIG.apiKey}`,
        },
        body: JSON.stringify({
          model: API_CONFIG.model,
          messages: [
            { role: 'system', content: '你是一个专业的英语学习题目生成器。请严格按照JSON格式输出。' },
            { role: 'user', content: prompt }
          ],
          temperature: 0.7,
        }),
      })

      if (!response.ok) {
        throw new Error('API调用失败')
      }

      const data = await response.json()
      const content = data.choices[0].message.content
      
      // 提取JSON
      const jsonMatch = content.match(/```json\n?([\s\S]*?)\n?```/) || content.match(/{[\s\S]*}/)
      const jsonStr = jsonMatch ? jsonMatch[1] || jsonMatch[0] : content
      
      let taskContent
      try {
        taskContent = JSON.parse(jsonStr)
      } catch {
        // 如果解析失败，使用默认格式
        taskContent = {
          title: taskTypes.find(t => t.value === selectedType)?.label + '练习',
          description: 'AI生成的练习题目',
          content: content.substring(0, 500),
          duration: 20,
        }
      }

      // 保存到数据库
      await supabase.from('daily_tasks').insert({
        user_id: user?.id,
        task_date: today,
        task_type: selectedType,
        content: taskContent,
        audio_text: taskContent.audio_text || null,
        is_completed: false,
      })

      // 关闭弹窗并刷新
      setIsOpen(false)
      window.location.reload()

    } catch (err) {
      console.error('生成任务失败:', err)
      alert('生成任务失败，请重试')
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
