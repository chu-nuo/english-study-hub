import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function StatsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // 获取学习统计
  const { data: tasks } = await supabase
    .from('daily_tasks')
    .select('*')
    .eq('user_id', user.id)

  const { data: logs } = await supabase
    .from('study_logs')
    .select('*')
    .eq('user_id', user.id)

  const completedTasks = tasks?.filter(t => t.is_completed).length || 0
  const totalTasks = tasks?.length || 0
  const totalStudyTime = logs?.reduce((sum, log) => sum + (log.duration || 0), 0) || 0

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="text-blue-600 hover:text-blue-700">← 返回首页</Link>
          <h1 className="text-xl font-bold text-gray-900">学习统计</h1>
          <div />
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6">
        {/* 概览卡片 */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-2xl p-6 shadow-sm text-center">
            <div className="text-3xl font-bold text-blue-600">{completedTasks}</div>
            <div className="text-sm text-gray-500 mt-1">已完成任务</div>
          </div>
          <div className="bg-white rounded-2xl p-6 shadow-sm text-center">
            <div className="text-3xl font-bold text-green-600">{totalTasks - completedTasks}</div>
            <div className="text-sm text-gray-500 mt-1">待完成任务</div>
          </div>
          <div className="bg-white rounded-2xl p-6 shadow-sm text-center">
            <div className="text-3xl font-bold text-purple-600">{Math.round(totalStudyTime / 60)}</div>
            <div className="text-sm text-gray-500 mt-1">学习小时</div>
          </div>
        </div>

        {/* 完成率 */}
        <div className="bg-white rounded-2xl p-6 shadow-sm mb-6">
          <h2 className="text-lg font-semibold mb-4">任务完成率</h2>
          <div className="relative h-4 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="absolute h-full bg-blue-600 rounded-full transition-all"
              style={{ width: `${totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0}%` }}
            />
          </div>
          <div className="mt-2 text-sm text-gray-600">
            {totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0}% 完成
          </div>
        </div>

        {/* 最近学习记录 */}
        <div className="bg-white rounded-2xl p-6 shadow-sm">
          <h2 className="text-lg font-semibold mb-4">最近学习记录</h2>
          
          {!logs || logs.length === 0 ? (
            <p className="text-gray-500 text-center py-8">还没有学习记录，开始你的第一个任务吧！</p>
          ) : (
            <div className="space-y-3">
              {logs.slice(0, 10).map((log: any) => (
                <div key={log.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <div className="font-medium">{log.notes || '学习记录'}</div>
                    <div className="text-sm text-gray-500">{new Date(log.created_at).toLocaleDateString('zh-CN')}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium">{log.duration} 分钟</div>
                    {log.difficulty_rating && (
                      <div className="text-sm text-gray-500">难度: {'⭐'.repeat(log.difficulty_rating)}</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
