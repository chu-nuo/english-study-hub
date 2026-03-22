import { redirect } from 'next/navigation'

/** 历史列表已合并到「学习统计 → 已完成任务」 */
export default function HistoryPage() {
  redirect('/stats')
}
