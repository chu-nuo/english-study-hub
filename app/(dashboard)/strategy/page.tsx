import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function StrategyPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: strategy } = await supabase
    .from('learning_strategies')
    .select('*')
    .eq('user_id', user.id)
    .single()

  if (!strategy) {
    redirect('/generate-strategy')
  }

  const strategyData = strategy.strategy_json

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="text-blue-600 hover:text-blue-700">← 返回首页</Link>
          <h1 className="text-xl font-bold text-gray-900">我的学习策略</h1>
          <div />
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        {/* 核心方法论 */}
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">核心方法论</h2>
          <div className="bg-blue-50 p-4 rounded-xl mb-4">
            <h3 className="font-semibold text-blue-900 mb-2">{strategyData.methodology?.core_principle}</h3>
            <p className="text-blue-800">{strategyData.methodology?.study_cycle}</p>
          </div>
          
          <h3 className="font-semibold mb-3">时间分配</h3>
          <div className="grid grid-cols-2 gap-3">
            {strategyData.methodology?.time_allocation &&
              Object.entries(strategyData.methodology.time_allocation).map(([key, value]: [string, any]) => (
                <div key={key} className="bg-gray-50 p-3 rounded-lg">
                  <span className="font-medium capitalize">{key}: </span>
                  <span className="text-gray-600">{value}</span>
                </div>
              ))}
          </div>
        </div>

        {/* 每周结构 */}
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">每周学习安排</h2>
          <div className="space-y-3">
            {strategyData.weekly_structure &&
              Object.entries(strategyData.weekly_structure).map(([day, data]: [string, any]) => (
                <div key={day} className="flex items-center justify-between bg-gray-50 p-4 rounded-xl">
                  <div className="flex items-center gap-4">
                    <span className="font-medium capitalize w-16">{day}</span>
                    <div>
                      <div className="font-medium">{data.focus}</div>
                      <div className="text-sm text-gray-500">{data.task_type}</div>
                    </div>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-sm ${
                    data.intensity === 'high' ? 'bg-red-100 text-red-700' :
                    data.intensity === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-green-100 text-green-700'
                  }`}>
                    {data.intensity === 'high' ? '高强度' :
                     data.intensity === 'medium' ? '中强度' : '低强度'}
                  </span>
                </div>
              ))}
          </div>
        </div>

        {/* 里程碑 */}
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">里程碑</h2>
          <div className="space-y-4">
            {strategyData.milestones?.map((milestone: any, idx: number) => (
              <div key={idx} className="border-l-4 border-blue-500 pl-4 py-2">
                <div className="font-bold text-lg">第 {milestone.day} 天</div>
                <div className="text-gray-700 mt-1">{milestone.target}</div>
                <div className="text-sm text-gray-500 mt-1">验证方式: {milestone.checkpoint}</div>
              </div>
            ))}
          </div>
        </div>

        {/* 自适应规则 */}
        {strategyData.adaptive_rules && (
          <div className="bg-white rounded-2xl shadow-sm p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">自适应调整规则</h2>
            <p className="text-gray-700">{strategyData.adaptive_rules}</p>
          </div>
        )}
      </main>
    </div>
  )
}
