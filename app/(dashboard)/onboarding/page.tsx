'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

const examTypes = [
  { value: 'ielts', label: '雅思 (IELTS)' },
  { value: 'toefl', label: '托福 (TOEFL)' },
  { value: 'cet4', label: '大学英语四级 (CET-4)' },
  { value: 'cet6', label: '大学英语六级 (CET-6)' },
  { value: 'gre', label: 'GRE' },
  { value: 'gmat', label: 'GMAT' },
]

const levels = [
  { value: 'beginner', label: '初级 (A1-A2)' },
  { value: 'intermediate', label: '中级 (B1-B2)' },
  { value: 'advanced', label: '高级 (C1-C2)' },
]

export default function OnboardingPage() {
  const [formData, setFormData] = useState({
    username: '',
    exam_type: '',
    current_level: '',
    target_score: '',
    daily_study_time: '',
  })
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const router = useRouter()
  const supabase = createClient()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')

    try {
      // 获取当前用户
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        setMessage('请先登录')
        return
      }

      // 保存用户资料
      const { error } = await supabase.from('profiles').insert({
        id: user.id,
        username: formData.username,
        exam_type: formData.exam_type,
        current_level: formData.current_level,
        target_score: parseInt(formData.target_score),
        daily_study_time: parseInt(formData.daily_study_time),
      })

      if (error) {
        setMessage(error.message)
        return
      }

      // 跳转到策略生成页
      router.push('/generate-strategy')
    } catch (err) {
      setMessage('发生错误，请重试')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-lg mx-auto bg-white rounded-2xl shadow-lg p-8">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900">完善你的学习档案</h1>
          <p className="mt-2 text-gray-600">这些信息将帮助 AI 为你生成个性化学习策略</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              用户名
            </label>
            <input
              type="text"
              required
              value={formData.username}
              onChange={(e) => setFormData({ ...formData, username: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="给自己起个名字"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              考试类型
            </label>
            <select
              required
              value={formData.exam_type}
              onChange={(e) => setFormData({ ...formData, exam_type: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">请选择考试类型</option>
              {examTypes.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              当前英语水平
            </label>
            <select
              required
              value={formData.current_level}
              onChange={(e) => setFormData({ ...formData, current_level: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">请选择当前水平</option>
              {levels.map((level) => (
                <option key={level.value} value={level.value}>
                  {level.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              目标分数
            </label>
            <input
              type="number"
              required
              value={formData.target_score}
              onChange={(e) => setFormData({ ...formData, target_score: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="例如：雅思 7.0 分输入 7"
            />
            <p className="mt-1 text-xs text-gray-500">雅思请输入 6-9 之间的数字，四六级请输入目标分数</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              每日可学习时间（分钟）
            </label>
            <input
              type="number"
              required
              min="15"
              max="480"
              value={formData.daily_study_time}
              onChange={(e) => setFormData({ ...formData, daily_study_time: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="例如：60"
            />
            <p className="mt-1 text-xs text-gray-500">建议每天至少 30 分钟</p>
          </div>

          {message && (
            <div className="text-sm text-center text-red-600 bg-red-50 p-3 rounded-lg">
              {message}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 px-6 border border-transparent rounded-lg shadow-sm text-base font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {loading ? '保存中...' : '下一步：生成学习策略'}
          </button>
        </form>
      </div>
    </div>
  )
}
