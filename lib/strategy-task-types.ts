const ALL_TYPES = ['reading', 'listening', 'writing', 'vocabulary', 'review'] as const
export type StrategyTaskType = (typeof ALL_TYPES)[number]

/** 根据周计划中的 focus / task_type 文案推断今日推荐题型 */
export function inferTaskTypesFromWeeklyPlan(
  plan: { focus?: string; task_type?: string } | null | undefined
): StrategyTaskType[] {
  if (!plan) return ['reading', 'vocabulary']

  const hay = `${plan.focus || ''} ${plan.task_type || ''}`.toLowerCase()
  const types: StrategyTaskType[] = []
  const add = (t: StrategyTaskType) => {
    if (!types.includes(t)) types.push(t)
  }

  if (/阅读|精读|泛读|\bread(ing)?\b/.test(hay)) add('reading')
  if (/听力|听写|listening|listen|audio|口语?/.test(hay)) add('listening')
  if (/写作|作文|writ(ing)?|essay|议论文/.test(hay)) add('writing')
  if (/词汇|单词|vocab(ulary)?|lexical/.test(hay)) add('vocabulary')
  if (/复习|巩固|复盘|review|周复盘/.test(hay)) add('review')

  if (types.length === 0) return ['reading', 'vocabulary']
  return types
}

export function getWeekdayKey(): string {
  return new Date().toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase()
}
