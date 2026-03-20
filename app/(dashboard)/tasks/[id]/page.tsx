'use client'

import { useState, useEffect, useRef } from 'react'
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
  const [isPlaying, setIsPlaying] = useState(false)
  const [audioProgress, setAudioProgress] = useState(0)
  const audioRef = useRef<HTMLAudioElement | null>(null)
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

  const playAudio = async (text: string) => {
    if (!text) return
    
    setIsPlaying(true)
    
    try {
      // 使用 Web Speech API (免费，无需API Key)
      const utterance = new SpeechSynthesisUtterance(text)
      utterance.lang = 'en-US'
      utterance.rate = 0.9
      utterance.pitch = 1
      
      utterance.onend = () => {
        setIsPlaying(false)
      }
      
      utterance.onerror = () => {
        setIsPlaying(false)
      }
      
      speechSynthesis.speak(utterance)
    } catch (err) {
      console.error('Audio playback error:', err)
      setIsPlaying(false)
    }
  }

  const stopAudio = () => {
    speechSynthesis.cancel()
    setIsPlaying(false)
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
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4">⏳</div>
          <div className="text-gray-600 dark:text-gray-400">加载中...</div>
        </div>
      </div>
    )
  }

  if (!task) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">😕</div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">任务不存在</h1>
          <p className="text-gray-600 dark:text-gray-400 mb-4">该任务可能已被删除或不存在</p>
          <Link href="/" className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 underline">
            返回首页
          </Link>
        </div>
      </div>
    )
  }

  const content = task.content || {}

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <header className="bg-white dark:bg-gray-800 shadow-sm">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300">← 返回首页</Link>
          <span className={`px-3 py-1 rounded-full text-sm ${
            task.is_completed
              ? 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300'
              : 'bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-300'
          }`}>
            {task.is_completed ? '已完成' : '进行中'}
          </span>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-6 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded-full text-sm capitalize">
              {task.task_type}
            </span>
            {content.duration && (
              <span className="text-sm text-gray-500 dark:text-gray-400">预计 {content.duration} 分钟</span>
            )}
          </div>

          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">{content.title || '学习任务'}</h1>
          
          <p className="text-gray-700 dark:text-gray-300 mb-6">{content.description}</p>

          {/* 听力任务 - 音频播放功能 */}
          {task.task_type === 'listening' && content.audio_text && (
            <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/30 rounded-xl">
              <h3 className="font-semibold text-blue-900 dark:text-blue-300 mb-3">🎧 听力练习</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                点击播放按钮听取听力原文
              </p>
              <div className="flex items-center gap-3">
                {isPlaying ? (
                  <button
                    onClick={stopAudio}
                    className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                  >
                    <span>⏹</span> 停止
                  </button>
                ) : (
                  <button
                    onClick={() => playAudio(content.audio_text)}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <span>🔊</span> 播放音频
                  </button>
                )}
                <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-blue-500 transition-all duration-300"
                    style={{ width: `${audioProgress}%` }}
                  />
                </div>
              </div>
              <details className="mt-4">
                <summary className="cursor-pointer text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200">
                  查看听力原文
                </summary>
                <p className="mt-2 text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap bg-white dark:bg-gray-800 p-3 rounded-lg">
                  {content.audio_text}
                </p>
              </details>
            </div>
          )}

          {content.steps && content.steps.length > 0 && (
            <div className="mb-6">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-3">任务步骤</h3>
              <ol className="space-y-2">
                {content.steps.map((step: string, idx: number) => (
                  <li key={idx} className="flex items-start gap-3">
                    <span className="flex-shrink-0 w-6 h-6 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded-full flex items-center justify-center text-sm font-medium">
                      {idx + 1}
                    </span>
                    <span className="text-gray-700 dark:text-gray-300">{step}</span>
                  </li>
                ))}
              </ol>
            </div>
          )}
        </div>

        {!task.is_completed && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-6">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-4">完成任务</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                  实际学习时间（分钟）
                </label>
                <input
                  type="number"
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="例如：45"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                  难度评分
                </label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      onClick={() => setDifficulty(star)}
                      className={`text-2xl ${star <= difficulty ? 'text-yellow-400' : 'text-gray-300 dark:text-gray-600'}`}
                    >
                      ⭐
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                  学习笔记
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500"
                  rows={4}
                  placeholder="记录今天的学习心得..."
                />
              </div>

              <button
                onClick={completeTask}
                className="w-full py-4 px-6 bg-green-600 dark:bg-green-700 text-white rounded-lg font-medium hover:bg-green-700 dark:hover:bg-green-800"
              >
                标记为已完成
              </button>
            </div>
          </div>
        )}

        {task.is_completed && task.completion_data && (
          <div className="bg-green-50 dark:bg-green-900/30 rounded-2xl p-6">
            <h3 className="font-semibold text-green-900 dark:text-green-300 mb-4">完成记录</h3>
            <div className="space-y-2 text-green-800 dark:text-green-300">
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
