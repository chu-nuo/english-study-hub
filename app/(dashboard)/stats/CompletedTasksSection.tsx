import Link from 'next/link'

type Task = {
  id: string
  task_date: string
  task_type: string
  is_completed: boolean
  content: { title?: string } | null
  completion_data?: { duration?: number } | null
}

export default function CompletedTasksSection({ tasks }: { tasks: Task[] }) {
  const completed = tasks?.filter((t) => t.is_completed) || []
  const grouped: Record<string, Task[]> = {}
  completed.forEach((task) => {
    const date = task.task_date
    if (!grouped[date]) grouped[date] = []
    grouped[date].push(task)
  })
  const dateList = Object.keys(grouped).sort((a, b) => new Date(b).getTime() - new Date(a).getTime())

  if (dateList.length === 0) {
    return (
      <p className="text-gray-500 dark:text-gray-400 text-center py-8" id="completed-tasks">
        暂无已完成任务，完成今日任务后会出现在这里。
      </p>
    )
  }

  return (
    <div id="completed-tasks" className="space-y-6">
      {dateList.map((date) => (
        <div key={date} className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm overflow-hidden">
          <div className="bg-emerald-50 dark:bg-emerald-900/30 px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-lg">📅</span>
              <span className="font-medium text-gray-900 dark:text-white">{date}</span>
            </div>
            <span className="text-sm text-gray-500 dark:text-gray-400">{grouped[date]?.length} 个已完成</span>
          </div>
          <div className="divide-y divide-gray-100 dark:divide-gray-700">
            {grouped[date]?.map((task) => (
              <Link
                key={task.id}
                href={`/tasks/${task.id}`}
                className="flex items-center gap-4 p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
              >
                <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-400">
                  ✓
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="px-2 py-0.5 text-xs rounded bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 capitalize">
                      {task.task_type}
                    </span>
                    {task.completion_data?.duration != null && (
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {task.completion_data.duration}分钟
                      </span>
                    )}
                  </div>
                  <p className="text-gray-900 dark:text-white font-medium truncate">
                    {task.content?.title || '学习任务'}
                  </p>
                </div>
                <span className="text-gray-400 dark:text-gray-500">→</span>
              </Link>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
