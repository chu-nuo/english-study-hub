import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { redirect } from 'next/navigation'

export default async function HistoryPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // 获取所有历史任务（按日期倒序）
  const { data: tasks } = await supabase
    .from('daily_tasks')
    .select('*')
    .eq('user_id', user.id)
    .order('task_date', { ascending: false })
    .limit(100)

  // 按日期分组
  const groupedTasks: Record<string, typeof tasks> = {}
  tasks?.forEach((task) => {
    const date = task.task_date
    if (!groupedTasks[date]) {
      groupedTasks[date] = []
    }
    groupedTasks[date].push(task)
  })

  const dateList = Object.keys(groupedTasks).sort((a, b) => new Date(b).getTime() - new Date(a).getTime())

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* 顶部导航 */}
      <header className="bg-white dark:bg-gray-800 shadow-sm">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300">
            ← 返回首页
          </Link>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">历史任务</h1>
          <div className="w-8">{/* spacer */}</div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6">
        {dateList.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">📚</div>
            <p className="text-gray-600 dark:text-gray-400">还没有历史任务记录</p>
          </div>
        ) : (
          <div className="space-y-6">
            {dateList.map((date) => (
              <div key={date} className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm overflow-hidden">
                {/* 日期标题 */}
                <div className="bg-blue-50 dark:bg-blue-900/30 px-4 py-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">📅</span>
                    <span className="font-medium text-gray-900 dark:text-white">{date}</span>
                  </div>
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    {groupedTasks[date]?.length} 个任务
                  </span>
                </div>

                {/* 任务列表 */}
                <div className="divide-y divide-gray-100 dark:divide-gray-700">
                  {groupedTasks[date]?.map((task) => (
                    <Link
                      key={task.id}
                      href={`/tasks/${task.id}`}
                      className="flex items-center gap-4 p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                    >
                      {/* 完成状态 */}
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                          task.is_completed
                            ? 'bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-400'
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500'
                        }`}
                      >
                        {task.is_completed ? '✓' : '○'}
                      </div>

                      {/* 任务信息 */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="px-2 py-0.5 text-xs rounded bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 capitalize">
                            {task.task_type}
                          </span>
                          {task.completion_data?.duration && (
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              {task.completion_data.duration}分钟
                            </span>
                          )}
                        </div>
                        <p className="text-gray-900 dark:text-white font-medium truncate">
                          {task.content?.title || '学习任务'}
                        </p>
                      </div>

                      {/* 箭头 */}
                      <span className="text-gray-400 dark:text-gray-500">→</span>
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
