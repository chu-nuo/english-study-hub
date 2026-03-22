/** 阅读：passage 块（不含题目） */
export function extractReadingPassage(text: string): string {
  let m = text.match(/passage:\s*\|?\s*\n?([\s\S]*?)(?=questions?:)/i)
  if (m) return m[1].trim()
  m = text.match(/passage:\s*\|?\s*\n?([\s\S]*?)(?=\n\s*\d+[\.、．]\s)/i)
  return m ? m[1].trim() : ''
}

/** 听力：原文块 */
export function extractListeningScript(text: string): string {
  let m = text.match(/audio_text:\s*\|?\s*\n?([\s\S]*?)(?=questions?:)/i)
  if (m) return m[1].trim()
  m = text.match(/audio_text:\s*\|?\s*\n?([\s\S]*?)(?=\n\s*\d+[\.、．]\s)/i)
  return m ? m[1].trim() : ''
}

/** 仅把「题目」部分交给 MCQ 解析，避免 passage 正文干扰 */
export function extractMcqSource(text: string): string {
  if (/questions?:/i.test(text)) {
    return text.split(/questions?:/i)[1]?.trim() || ''
  }
  const afterPassage = text.split(/passage:\s*\|?\s*\n?/i)[1]
  if (afterPassage) {
    let idx = afterPassage.search(/\n\s*\d+[\.、．]\s/)
    if (idx < 0) idx = afterPassage.search(/^\s*\d+[\.、．]\s/)
    if (idx >= 0) return afterPassage.slice(idx).trim()
  }
  const afterAudio = text.split(/audio_text:\s*\|?\s*\n?/i)[1]
  if (afterAudio) {
    let idx = afterAudio.search(/\n\s*\d+[\.、．]\s/)
    if (idx < 0) idx = afterAudio.search(/^\s*\d+[\.、．]\s/)
    if (idx >= 0) return afterAudio.slice(idx).trim()
  }
  return text
}

/**
 * 从 AI 返回的正文中解析四选一阅读理解/听力题。
 * 旧版正则用 [^B]+ 截断选项，选项里含字母 B 会整题匹配失败。
 */
export function parseMcqQuestions(text: string): { questions: any[]; answers: any[] } {
  const questions: any[] = []
  const answers: any[] = []

  const qPart = text.split(/questions?:/i)[1] ?? text

  const blocks = qPart
    .split(/(?=\n\s*\d+[\.、．]\s)/)
    .map((s) => s.trim())
    .filter(Boolean)

  for (const block of blocks) {
    const one = parseOneMcqBlock(block)
    if (one) {
      questions.push({ question: one.stem, options: one.options })
      answers.push({ correct: one.correct, explanation: one.explanation })
    }
  }

  if (questions.length > 0) {
    return { questions, answers }
  }

  // 回退：整段里用更宽松的单行/多行模式扫描
  const fallback = parseMcqLoose(qPart)
  return fallback
}

function parseOneMcqBlock(block: string): {
  stem: string
  options: string[]
  correct: number
  explanation: string
} | null {
  const lines = block
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0)
  if (lines.length < 2) return null

  const stem = lines[0].replace(/^\d+[\.、．]\s*/, '').trim()
  const opts: string[] = ['', '', '', '']
  let correct = 0
  let explanation = ''

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i]
    const optM = line.match(/^([A-D])[\)．.、:：]\s*(.+)$/i)
    if (optM) {
      const idx = optM[1].toUpperCase().charCodeAt(0) - 65
      if (idx >= 0 && idx < 4) opts[idx] = optM[2].trim()
      continue
    }
    const ansM = line.match(/(?:答案|Answer)[:：]\s*([A-D])/i)
    if (ansM) {
      correct = ansM[1].toUpperCase().charCodeAt(0) - 65
      continue
    }
    const expM = line.match(/(?:解析|Explanation)[:：]\s*(.+)$/i)
    if (expM) {
      explanation = expM[1].trim()
    }
  }

  if (opts.every(Boolean)) {
    return { stem, options: opts, correct, explanation }
  }

  // 单行四选项：1. stem ... A) ... B) ... C) ... D) ... 答案: X
  const oneLine = lines.join(' ')
  const m = oneLine.match(
    /^\d+[\.、．]\s*(.+?)\s+A[\)．]\s*(.+?)\s+B[\)．]\s*(.+?)\s+C[\)．]\s*(.+?)\s+D[\)．]\s*(.+?)\s*(?:答案|Answer)[:：]\s*([A-D])\s*(?:解析|Explanation)[:：]\s*(.+)$/i
  )
  if (m) {
    return {
      stem: m[1].trim(),
      options: [m[2], m[3], m[4], m[5]].map((s) => s.trim()),
      correct: m[6].toUpperCase().charCodeAt(0) - 65,
      explanation: m[7].trim(),
    }
  }

  const m2 = oneLine.match(
    /^\d+[\.、．]\s*(.+?)\s+A[\)．]\s*(.+?)\s+B[\)．]\s*(.+?)\s+C[\)．]\s*(.+?)\s+D[\)．]\s*(.+?)\s*(?:答案|Answer)[:：]\s*([A-D])/i
  )
  if (m2) {
    return {
      stem: m2[1].trim(),
      options: [m2[2], m2[3], m2[4], m2[5]].map((s) => s.trim()),
      correct: m2[6].toUpperCase().charCodeAt(0) - 65,
      explanation: '',
    }
  }

  return null
}

function parseMcqLoose(section: string): { questions: any[]; answers: any[] } {
  const questions: any[] = []
  const answers: any[] = []
  const re =
    /(\d+)\.\s*([\s\S]+?)\s+A[\)．]\s*([\s\S]+?)\s+B[\)．]\s*([\s\S]+?)\s+C[\)．]\s*([\s\S]+?)\s+D[\)．]\s*([\s\S]+?)\s*(?:答案|Answer)[:：]\s*([A-D])(?:\s*(?:解析|Explanation)[:：]\s*([^\n]+))?/gi
  let m: RegExpExecArray | null
  while ((m = re.exec(section)) !== null) {
    const correctMap: Record<string, number> = { A: 0, B: 1, C: 2, D: 3 }
    const letter = m[7].toUpperCase()
    questions.push({
      question: m[2].replace(/\s+/g, ' ').trim(),
      options: [m[3], m[4], m[5], m[6]].map((s) => s.replace(/\s+/g, ' ').trim()),
    })
    answers.push({
      correct: correctMap[letter] ?? 0,
      explanation: (m[8] || '').trim(),
    })
  }
  return { questions, answers }
}

/** 词汇行：兼容音标、词性、中文释义、例句多种写法 */
export function parseVocabularyWords(text: string): any[] {
  const words: any[] = []
  const section = text.split(/words?:/i)[1] ?? text
  const lines = section.split('\n').map((l) => l.trim())

  for (const line of lines) {
    if (!/^\d+\./.test(line)) continue

    const core = line.replace(/^\d+\.\s*/, '')

    let m = core.match(
      /^([A-Za-z][A-Za-z\-']*)\s+(\[[^\]]+\]|\/[^\/]+\/)\s+([a-zA-Z]+\.?)\s+(.+?)\s*(?:例句|Example)[:：]\s*(.+)$/i
    )
    if (m) {
      words.push({
        word: m[1].trim(),
        phonetic: m[2].trim(),
        pos: m[3].trim(),
        meaning: m[4].trim(),
        example: m[5].trim(),
      })
      continue
    }

    m = core.match(
      /^([A-Za-z][A-Za-z\-']*)\s+(\S+)\s+([a-zA-Z]+\.?)\s+(.+?)\s*(?:例句|Example)[:：]\s*(.+)$/i
    )
    if (m) {
      words.push({
        word: m[1].trim(),
        phonetic: m[2].trim(),
        pos: m[3].trim(),
        meaning: m[4].trim(),
        example: m[5].trim(),
      })
    }
  }

  return words
}
