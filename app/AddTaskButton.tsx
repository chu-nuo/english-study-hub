'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

const taskTypes = [
  { value: 'reading', label: '阅读', icon: '📖' },
  { value: 'listening', label: '听力', icon: '🎧' },
  { value: 'writing', label: '写作', icon: '✍️' },
  { value: 'vocabulary', label: '词汇', icon: '📝' },
  { value: 'speaking', label: '口语', icon: '🎤' },
  { value: 'grammar', label: '语法', icon: '📚' },
  { value: 'other', label: '其他', icon: '📌' },
]

export default function AddTaskButton() {
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [title, setTitle] = useState('')
  const [taskType, setTaskType] = useState('reading')
  const [description, setDescription] = useState('')
  const [duration, setDuration] = useState('')
  const supabase = createClient()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return

    setLoading(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      const today = new Date().toISOString().split('T')[0]

      const { error } = await supabase.from('daily_tasks').insert({
        user_id: user?.id,
        task_date: today,
        task_type: taskType,
        content: {
          title: title.trim(),
          description: description.trim() || '自定义学习任务',
          duration: parseInt(duration) || 30,
          steps: ['开始学习', '完成练习', '复习巩固'],
        },
        is_completed: false,
      })

      if (error) throw error

      // 关闭弹窗并刷新页面
      setIsOpen(false)
      setTitle('')
      setDescription('')
      setDuration('')
      window.location.reload()
    } catch (err) {
      console.error('添加任务失败:', err)
      alert('添加任务失败，请重试')
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
        + 添加任务
      </button>

      {/* 弹窗 */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-md mx-4 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">添加自定义任务</h2>
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                  任务标题 *
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="例如：完成一篇阅读理解"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                  任务类型
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {taskTypes.map((type) => (
                    <button
                      key={type.value}
                      type="button"
                      onClick={() => setTaskType(type.value)}
                      className={`p-2 rounded-lg border-2 text-sm transition-all ${
                        taskType === type.value
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30'
                          : 'border-gray-200 dark:border-gray-600 hover:border-gray-300'
                      }`}
                    >
                      <span>{type.icon}</span>
                      <span className="block text-xs mt-1 text-gray-700 dark:text-gray-200">{type.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                  任务描述
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="任务的详细描述（可选）"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                  预计时间（分钟）
                </label>
                <input
                  type="number"
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  min="1"
                  max="300"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="30"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="flex-1 py-2 px-4 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={loading || !title.trim()}
                  className="flex-1 py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {loading ? '添加中...' : '添加任务'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
