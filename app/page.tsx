import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

export default async function HomePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // 检查用户是否已有资料
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!profile) {
    redirect('/onboarding')
  }

  // 检查是否已有学习策略
  const { data: strategy } = await supabase
    .from('learning_strategies')
    .select('*')
    .eq('user_id', user.id)
    .single()

  if (!strategy) {
    redirect('/generate-strategy')
  }

  // 获取今日任务
  const today = new Date().toISOString().split('T')[0]
  const { data: tasks } = await supabase
    .from('daily_tasks')
    .select('*')
    .eq('user_id', user.id)
    .eq('task_date', today)

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 顶部导航 */}
      <header className="bg-white shadow-sm">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-900">今日学习</h1>
          <div className="flex items-center gap-4">
            <Link href="/strategy" className="text-sm text-blue-600 hover:text-blue-700">
              我的策略
            </Link>
            <form action="/auth/signout" method="post">
              <button type="submit" className="text-sm text-gray-600 hover:text-gray-800">
                退出
              </button>
            </form>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6">
        {/* 欢迎区域 */}
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-2xl p-6 text-white mb-6">
          <h2 className="text-lg font-semibold">你好，{profile.username}！</h2>
          <p className="mt-1 text-blue-100">
            今天是你的第 {Math.floor((Date.now() - new Date(profile.created_at).getTime()) / (1000 * 60 * 60 * 24)) + 1} 天学习
          </p>
          <div className="mt-4 flex items-center gap-4 text-sm">
            <span className="bg-white/20 px-3 py-1 rounded-full">
              目标: {profile.exam_type?.toUpperCase()} {profile.target_score}分
            </span>
            <span className="bg-white/20 px-3 py-1 rounded-full">
              每日 {profile.daily_study_time} 分钟
            </span>
          </div>
        </div>

        {/* 今日任务 */}
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">今日任务</h3>
            <span className="text-sm text-gray-500">{today}</span>
          </div>

          {!tasks || tasks.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500 mb-4">今天还没有生成任务</p>
              <Link
                href="/generate-daily"
                className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                生成今日任务
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {tasks.map((task) => (
                <div
                  key={task.id}
                  className={`p-4 rounded-xl border-2 transition-all ${
                    task.is_completed
                      ? 'border-green-200 bg-green-50'
                      : 'border-gray-200 hover:border-blue-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                          task.is_completed
                            ? 'bg-green-500 border-green-500'
                            : 'border-gray-300'
                        }`}
                      >
                        {task.is_completed && <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>}
                      </div>
                      <div>
                        <span className="inline-block px-2 py-1 text-xs rounded bg-gray-100 text-gray-700 capitalize mr-2">
                          {task.task_type}
                        </span>
                        <span className="font-medium">
                          {task.content?.title || '学习任务'}
                        </span>
                      </div>
                    </div>
                    <Link
                      href={`/tasks/${task.id}`}
                      className="text-sm text-blue-600 hover:text-blue-700"
                    >
                      {task.is_completed ? '查看' : '开始'}
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 快捷入口 */}
        <div className="grid grid-cols-2 gap-4 mt-6">
          <Link
            href="/strategy"
            className="bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="text-2xl mb-2">📋</div>
            <div className="font-medium">学习策略</div>
            <div className="text-sm text-gray-500">查看完整计划</div>
          </Link>
          
          <Link
            href="/stats"
            className="bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="text-2xl mb-2">📊</div>
            <div className="font-medium">学习统计</div>
            <div className="text-sm text-gray-500">追踪进度</div>
          </Link>
        </div>
      </main>
    </div>
  )
}
