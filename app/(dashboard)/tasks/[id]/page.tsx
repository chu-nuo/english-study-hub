'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function TaskPage() {
  const params = useParams()
  const [task, setTask] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [notes, setNotes] = useState('')
  const [duration, setDuration] = useState('')
  const [difficulty, setDifficulty] = useState(3)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    if (params.id) {
      fetchTask(params.id as string)
    }
  }, [params.id])

  const fetchTask = async (taskId: string) => {
    console.log('Fetching task with ID:', taskId)
    
    const { data, error } = await supabase
      .from('daily_tasks')
      .select('*')
      .eq('id', taskId)
      .single()
    
    console.log('Task data:', data, 'Error:', error)
    
    if (data) {
      setTask(data)
      if (data.completion_data) {
        setNotes(data.completion_data.notes || '')
        setDuration(data.completion_data.duration || '')
        setDifficulty(data.completion_data.difficulty || 3)
      }
    }
    setLoading(false)
  }

  const completeTask = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    
    // 更新任务状态
    await supabase
      .from('daily_tasks')
      .update({
        is_completed: true,
        completion_data: {
          notes,
          duration: parseInt(duration) || 0,
          difficulty,
          completed_at: new Date().toISOString(),
        },
      })
      .eq('id', params.id)

    // 添加学习记录
    await supabase.from('study_logs').insert({
      user_id: user?.id,
      task_id: params.id,
      duration: parseInt(duration) || 0,
      difficulty_rating: difficulty,
      notes,
    })

    router.push('/')
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4">⏳</div>
          <div className="text-gray-600">加载中...</div>
        </div>
      </div>
    )
  }

  if (!task) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">😕</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">任务不存在</h1>
          <p className="text-gray-600 mb-4">该任务可能已被删除或不存在</p>
          <Link href="/" className="text-blue-600 hover:text-blue-700 underline">
            返回首页
          </Link>
        </div>
      </div>
    )
  }

  const content = task.content || {}

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="text-blue-600 hover:text-blue-700">← 返回首页</Link>
          <span className={`px-3 py-1 rounded-full text-sm ${
            task.is_completed
              ? 'bg-green-100 text-green-700'
              : 'bg-yellow-100 text-yellow-700'
          }`}>
            {task.is_completed ? '已完成' : '进行中'}
          </span>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6">
        <div className="bg-white rounded-2xl shadow-sm p-6 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm capitalize">
              {task.task_type}
            </span>
            {content.duration && (
              <span className="text-sm text-gray-500">预计 {content.duration} 分钟</span>
            )}
          </div>

          <h1 className="text-2xl font-bold text-gray-900 mb-4">{content.title || '学习任务'}</h1>
          
          <p className="text-gray-700 mb-6">{content.description}</p>

          {content.steps && content.steps.length > 0 && (
            <div className="mb-6">
              <h3 className="font-semibold mb-3">任务步骤</h3>
              <ol className="space-y-2">
                {content.steps.map((step: string, idx: number) => (
                  <li key={idx} className="flex items-start gap-3">
                    <span className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center text-sm font-medium">
                      {idx + 1}
                    </span>
                    <span className="text-gray-700">{step}</span>
                  </li>
                ))}
              </ol>
            </div>
          )}
        </div>

        {!task.is_completed && (
          <div className="bg-white rounded-2xl shadow-sm p-6">
            <h3 className="font-semibold mb-4">完成任务</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  实际学习时间（分钟）
                </label>
                <input
                  type="number"
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="例如：45"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  难度评分
                </label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      onClick={() => setDifficulty(star)}
                      className={`text-2xl ${star <= difficulty ? 'text-yellow-400' : 'text-gray-300'}`}
                    >
                      ⭐
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  学习笔记
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  rows={4}
                  placeholder="记录今天的学习心得..."
                />
              </div>

              <button
                onClick={completeTask}
                className="w-full py-4 px-6 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700"
              >
                标记为已完成
              </button>
            </div>
          </div>
        )}

        {task.is_completed && task.completion_data && (
          <div className="bg-green-50 rounded-2xl p-6">
            <h3 className="font-semibold text-green-900 mb-4">完成记录</h3>
            <div className="space-y-2 text-green-800">
              <div>实际学习时间: {task.completion_data.duration} 分钟</div>
              <div>难度评分: {'⭐'.repeat(task.completion_data.difficulty || 3)}</div>
              {task.completion_data.notes && (
                <div>学习笔记: {task.completion_data.notes}</div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
