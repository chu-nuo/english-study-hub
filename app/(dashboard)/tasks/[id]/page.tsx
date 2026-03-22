'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

/** 浏览器 TTS 朗读听力原文（英语） */
function ListeningTTS({ text }: { text: string }) {
  const [playing, setPlaying] = useState(false)

  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined') window.speechSynthesis.cancel()
    }
  }, [text])

  useEffect(() => {
    const synth = typeof window !== 'undefined' ? window.speechSynthesis : null
    if (!synth) return
    const warm = () => synth.getVoices()
    synth.addEventListener('voiceschanged', warm)
    warm()
    return () => synth.removeEventListener('voiceschanged', warm)
  }, [])

  const speak = () => {
    if (typeof window === 'undefined' || !text?.trim()) return
    const synth = window.speechSynthesis
    synth.cancel()
    const u = new SpeechSynthesisUtterance(text)
    u.lang = 'en-US'
    u.rate = 0.9
    const voices = synth.getVoices()
    const v =
      voices.find((x) => /en[-_]US/i.test(x.lang)) ||
      voices.find((x) => x.lang.startsWith('en'))
    if (v) u.voice = v
    u.onend = () => setPlaying(false)
    u.onerror = () => setPlaying(false)
    synth.speak(u)
    setPlaying(true)
  }

  const stop = () => {
    if (typeof window === 'undefined') return
    window.speechSynthesis.cancel()
    setPlaying(false)
  }

  return (
    <div className="mb-4">
      <button
        type="button"
        onClick={playing ? stop : speak}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium shadow-sm"
      >
        {playing ? '⏹ 停止' : '▶ 播放原文'}
      </button>
      <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
        使用本机浏览器语音朗读（英语）。若无声请先点击一次以触发播放，或在系统设置中检查语音包。
      </p>
    </div>
  )
}

// 阅读/听力题目组件
function QuizSection({ questions, answers, taskType }: { questions: any[], answers: any[], taskType: string }) {
  const [userAnswers, setUserAnswers] = useState<number[]>(new Array(questions.length).fill(-1))
  const [showResults, setShowResults] = useState(false)

  const handleSelect = (questionIdx: number, optionIdx: number) => {
    if (showResults) return
    const newAnswers = [...userAnswers]
    newAnswers[questionIdx] = optionIdx
    setUserAnswers(newAnswers)
  }

  const checkAnswers = () => {
    setShowResults(true)
  }

  const correctCount = userAnswers.filter((ans, idx) => ans === answers[idx]?.correct).length

  return (
    <div className="space-y-6">
      {questions.map((q, idx) => (
        <div key={idx} className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
          <p className="font-medium text-gray-900 dark:text-white mb-3">
            {idx + 1}. {q.question}
          </p>
          <div className="space-y-2">
            {q.options.map((option: string, optIdx: number) => {
              const isSelected = userAnswers[idx] === optIdx
              const isCorrect = answers[idx]?.correct === optIdx
              const showCorrect = showResults && isCorrect
              const showWrong = showResults && isSelected && !isCorrect

              return (
                <button
                  key={optIdx}
                  type="button"
                  onClick={() => handleSelect(idx, optIdx)}
                  disabled={showResults}
                  className={`w-full text-left p-3 rounded-lg border-2 transition-all text-gray-900 dark:text-gray-100 ${
                    showCorrect
                      ? 'border-green-500 bg-green-50 dark:bg-green-900/30 text-gray-900 dark:text-gray-100'
                      : showWrong
                      ? 'border-red-500 bg-red-50 dark:bg-red-900/30 text-gray-900 dark:text-gray-100'
                      : isSelected
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-gray-900 dark:text-gray-100'
                      : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                  }`}
                >
                  <span className="font-medium mr-2 text-gray-800 dark:text-gray-200">{String.fromCharCode(65 + optIdx)}.</span>
                  <span className="text-gray-900 dark:text-gray-100">{option}</span>
                </button>
              )
            })}
          </div>
          {showResults && answers[idx]?.explanation && (
            <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-sm text-blue-800 dark:text-blue-300">
              <span className="font-medium">解析：</span>
              {answers[idx].explanation}
            </div>
          )}
        </div>
      ))}

      {!showResults ? (
        <button
          onClick={checkAnswers}
          disabled={userAnswers.includes(-1)}
          className="w-full py-3 px-6 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          提交答案
        </button>
      ) : (
        <div className="text-center p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
          <p className="text-lg font-medium text-gray-900 dark:text-white">
            答对 {correctCount} / {questions.length} 题
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            {correctCount === questions.length ? '🎉 完美！' : correctCount >= questions.length / 2 ? '👍 不错！' : '💪 继续加油！'}
          </p>
        </div>
      )}
    </div>
  )
}

// 单词卡片组件
function VocabularyCards({ words }: { words: any[] }) {
  const [currentIdx, setCurrentIdx] = useState(0)
  const [showAnswer, setShowAnswer] = useState(false)
  const [mode, setMode] = useState<'word-to-meaning' | 'meaning-to-word'>('word-to-meaning')
  const [learned, setLearned] = useState<Set<number>>(new Set())

  const currentWord = words[currentIdx]
  if (!currentWord) return null

  const handleNext = () => {
    setShowAnswer(false)
    setCurrentIdx((prev) => (prev + 1) % words.length)
  }

  const handlePrev = () => {
    setShowAnswer(false)
    setCurrentIdx((prev) => (prev - 1 + words.length) % words.length)
  }

  const toggleLearned = () => {
    const newLearned = new Set(learned)
    if (newLearned.has(currentIdx)) {
      newLearned.delete(currentIdx)
    } else {
      newLearned.add(currentIdx)
    }
    setLearned(newLearned)
  }

  return (
    <div className="space-y-4">
      {/* 模式切换 */}
      <div className="flex gap-2 justify-center">
        <button
          onClick={() => { setMode('word-to-meaning'); setShowAnswer(false); }}
          className={`px-4 py-2 rounded-lg text-sm ${
            mode === 'word-to-meaning'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
          }`}
        >
          看单词选释义
        </button>
        <button
          onClick={() => { setMode('meaning-to-word'); setShowAnswer(false); }}
          className={`px-4 py-2 rounded-lg text-sm ${
            mode === 'meaning-to-word'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
          }`}
        >
          看释义选单词
        </button>
      </div>

      {/* 进度 */}
      <div className="text-center text-sm text-gray-600 dark:text-gray-400">
        {currentIdx + 1} / {words.length} | 已掌握: {learned.size}
      </div>

      {/* 卡片 */}
      <div
        onClick={() => setShowAnswer(!showAnswer)}
        className="relative h-64 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-6 flex flex-col items-center justify-center cursor-pointer shadow-lg hover:shadow-xl transition-shadow"
      >
        {!showAnswer ? (
          <>
            {mode === 'word-to-meaning' ? (
              <>
                <p className="text-3xl font-bold text-white mb-2">{currentWord.word}</p>
                <p className="text-blue-200">{currentWord.phonetic}</p>
                <p className="text-sm text-blue-200 mt-4">点击查看释义</p>
              </>
            ) : (
              <>
                <p className="text-2xl font-bold text-white text-center mb-2">{currentWord.meaning}</p>
                <p className="text-sm text-blue-200 mt-4">点击查看单词</p>
              </>
            )}
          </>
        ) : (
          <>
            {mode === 'word-to-meaning' ? (
              <>
                <p className="text-xl font-bold text-white mb-2">{currentWord.meaning}</p>
                <p className="text-blue-200">{currentWord.pos}</p>
                <p className="text-sm text-white/80 mt-4 text-center italic">"{currentWord.example}"</p>
              </>
            ) : (
              <>
                <p className="text-3xl font-bold text-white mb-2">{currentWord.word}</p>
                <p className="text-blue-200">{currentWord.phonetic}</p>
                <p className="text-blue-200">{currentWord.pos}</p>
                <p className="text-sm text-white/80 mt-4 text-center italic">"{currentWord.example}"</p>
              </>
            )}
          </>
        )}

        {/* 掌握标记 */}
        <button
          onClick={(e) => { e.stopPropagation(); toggleLearned(); }}
          className={`absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
            learned.has(currentIdx)
              ? 'bg-green-500 text-white'
              : 'bg-white/20 text-white hover:bg-white/30'
          }`}
        >
          ✓
        </button>
      </div>

      {/* 导航 */}
      <div className="flex justify-between">
        <button
          onClick={handlePrev}
          className="px-6 py-2 bg-gray-200 dark:bg-gray-700 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600"
        >
          ← 上一个
        </button>
        <button
          onClick={handleNext}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          下一个 →
        </button>
      </div>
    </div>
  )
}

// 词汇列表组件
function VocabularyList({ words }: { words: any[] }) {
  return (
    <div className="grid gap-3">
      {words.map((word, idx) => (
        <div key={idx} className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
          <div className="flex items-start gap-3">
            <span className="text-lg font-bold text-blue-600 dark:text-blue-400">{word.word}</span>
            <span className="text-sm text-gray-500 dark:text-gray-400">{word.phonetic}</span>
            <span className="text-sm text-gray-600 dark:text-gray-400">{word.pos}</span>
          </div>
          <p className="text-gray-800 dark:text-gray-200 mt-1">{word.meaning}</p>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-2 italic">"{word.example}"</p>
        </div>
      ))}
    </div>
  )
}

export default function TaskPage() {
  const params = useParams()
  const [task, setTask] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [notes, setNotes] = useState('')
  const [writingDraft, setWritingDraft] = useState('')
  const [duration, setDuration] = useState('')
  const [difficulty, setDifficulty] = useState(3)
  const [activeTab, setActiveTab] = useState<'content' | 'cards'>('content')
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    if (params.id) {
      fetchTask(params.id as string)
    }
  }, [params.id])

  const fetchTask = async (taskId: string) => {
    const { data, error } = await supabase
      .from('daily_tasks')
      .select('*')
      .eq('id', taskId)
      .single()

    if (data) {
      setTask(data)
      if (data.completion_data) {
        setNotes(data.completion_data.notes || '')
        setWritingDraft(data.completion_data.writing_draft || '')
        setDuration(data.completion_data.duration || '')
        setDifficulty(data.completion_data.difficulty || 3)
      }
    }
    setLoading(false)
  }

  const completeTask = async () => {
    const { data: { user } } = await supabase.auth.getUser()

    await supabase
      .from('daily_tasks')
      .update({
        is_completed: true,
        completion_data: {
          notes,
          duration: parseInt(duration) || 0,
          difficulty,
          completed_at: new Date().toISOString(),
          ...(task.task_type === 'writing' ? { writing_draft: writingDraft } : {}),
        },
      })
      .eq('id', params.id)

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
          <Link href="/" className="text-blue-600 dark:text-blue-400 hover:underline">返回首页</Link>
        </div>
      </div>
    )
  }

  // 兼容旧数据：曾把整个任务对象塞进 content，正文在 content.content 下
  const rawContent = (task.content || {}) as any
  let content: any
  if (
    rawContent.content &&
    typeof rawContent.content === 'object' &&
    !Array.isArray(rawContent.content)
  ) {
    const { content: inner, ...rest } = rawContent
    content = { ...rest, ...inner }
  } else {
    content = rawContent
  }
  const hasQuiz = content.questions && content.questions.length > 0
  const hasPassage = content.passage && content.passage.length > 0
  const hasAudioText = content.audio_text && content.audio_text.length > 0
  const hasWritingContent = content.prompt && content.sample
  const hasVocabCards = task.task_type === 'vocabulary' && content.words && content.words.length > 0

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <header className="bg-white dark:bg-gray-800 shadow-sm">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="text-blue-600 dark:text-blue-400">← 返回首页</Link>
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
        {/* 任务标题 */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-6 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded-full text-sm capitalize">
              {task.task_type}
            </span>
            <span className="text-sm text-gray-500 dark:text-gray-400">预计 {task.content?.duration || 30} 分钟</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">{content.title || '学习任务'}</h1>
          <p className="text-gray-700 dark:text-gray-300">{content.description}</p>
        </div>

        {task.task_type === 'vocabulary' && (!content.words || content.words.length === 0) && (
          <div className="bg-amber-50 dark:bg-amber-900/30 rounded-2xl p-4 mb-6 text-sm text-amber-800 dark:text-amber-200">
            未解析到词汇列表。请删除今日任务后重新「AI 生成」；若仍为空，请检查模型输出是否包含「words:」与「例句」行。
          </div>
        )}

        {/* 词汇任务 - 标签切换 */}
        {hasVocabCards && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-6 mb-6">
            <div className="flex gap-2 mb-4">
              <button
                onClick={() => setActiveTab('content')}
                className={`px-4 py-2 rounded-lg ${
                  activeTab === 'content'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                }`}
              >
                词汇列表
              </button>
              <button
                onClick={() => setActiveTab('cards')}
                className={`px-4 py-2 rounded-lg ${
                  activeTab === 'cards'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                }`}
              >
                🎴 卡片背诵
              </button>
            </div>

            {activeTab === 'content' ? (
              <VocabularyList words={content.words} />
            ) : (
              <VocabularyCards words={content.words} />
            )}
          </div>
        )}

        {/* 阅读/听力任务 - 文章和题目 */}
        {(hasQuiz || hasPassage || hasAudioText) && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-6 mb-6">
            {/* 文章内容 */}
            {hasPassage && (
              <div className="mb-6">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-3">文章内容</h3>
                <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl whitespace-pre-wrap text-gray-700 dark:text-gray-300 leading-relaxed">
                  {content.passage}
                </div>
              </div>
            )}

            {/* 听力原文 */}
            {hasAudioText && (
              <div className="mb-6">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-3">🎧 听力原文</h3>
                {task.task_type === 'listening' && typeof content.audio_text === 'string' && (
                  <ListeningTTS text={content.audio_text} />
                )}
                <div className="p-4 bg-blue-50 dark:bg-blue-900/30 rounded-xl whitespace-pre-wrap text-gray-700 dark:text-gray-300">
                  {content.audio_text}
                </div>
              </div>
            )}

            {/* 题目 */}
            {hasQuiz && (
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white mb-4">练习题</h3>
                <QuizSection questions={content.questions} answers={content.answers || []} taskType={task.task_type} />
              </div>
            )}

            {(hasPassage || hasAudioText) && !hasQuiz && (
              <p className="text-sm text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-900/30 rounded-lg p-3">
                当前未解析到选择题。请删除今日任务后重新「AI 生成」，新版本会正确保存题目。
              </p>
            )}
          </div>
        )}

        {/* 写作任务 */}
        {(task.task_type === 'writing' || hasWritingContent) && content.prompt && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-6 mb-6 space-y-6">
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-3">写作题目</h3>
              <div className="p-4 bg-blue-50 dark:bg-blue-900/30 rounded-xl">
                <p className="text-gray-800 dark:text-gray-200">{content.prompt}</p>
                {content.word_count && (
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">字数要求：{content.word_count}</p>
                )}
              </div>
            </div>

            {content.outline && (
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white mb-3">写作思路</h3>
                <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl whitespace-pre-wrap text-gray-700 dark:text-gray-300">
                  {content.outline}
                </div>
              </div>
            )}

            {content.sample && (
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white mb-3">参考范文</h3>
                <div className="p-4 bg-green-50 dark:bg-green-900/30 rounded-xl whitespace-pre-wrap text-gray-700 dark:text-gray-300">
                  {content.sample}
                </div>
              </div>
            )}

            {content.checklist && (
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white mb-3">自查清单</h3>
                <ul className="space-y-2">
                  {content.checklist.map((item: string, idx: number) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="text-blue-600 dark:text-blue-400">☐</span>
                      <span className="text-gray-700 dark:text-gray-300">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {task.task_type === 'writing' && (
              <div>
                <label htmlFor="writing-draft" className="block font-semibold text-gray-900 dark:text-white mb-3">
                  写作区
                </label>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                  在此撰写作文；内容会随「标记为已完成」一并保存，可随时回来修改。
                </p>
                <textarea
                  id="writing-draft"
                  name="writing_draft"
                  value={writingDraft}
                  onChange={(e) => setWritingDraft(e.target.value)}
                  spellCheck
                  className="w-full min-h-[min(28rem,55vh)] px-4 py-4 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white rounded-xl text-base leading-relaxed shadow-inner focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-y"
                  placeholder="Type your essay here..."
                />
              </div>
            )}
          </div>
        )}

        {/* 任务步骤 */}
        {content.steps && content.steps.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-6 mb-6">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-4">任务步骤</h3>
            <ol className="space-y-3">
              {content.steps.map((step: string, idx: number) => (
                <li key={idx} className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-7 h-7 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded-full flex items-center justify-center text-sm font-medium">
                    {idx + 1}
                  </span>
                  <span className="text-gray-700 dark:text-gray-300 pt-0.5">{step}</span>
                </li>
              ))}
            </ol>
          </div>
        )}

        {/* 完成任务表单 */}
        {!task.is_completed && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-6">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-4">完成任务</h3>
            <div className="space-y-4">
              <div>
                <label htmlFor="task-duration" className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                  实际学习时间（分钟）
                </label>
                <input
                  id="task-duration"
                  name="duration_minutes"
                  type="number"
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg"
                  placeholder="例如：45"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">难度评分</label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button key={star} onClick={() => setDifficulty(star)} className={`text-2xl ${star <= difficulty ? 'text-yellow-400' : 'text-gray-300 dark:text-gray-600'}`}>⭐</button>
                  ))}
                </div>
              </div>
              <div>
                <label htmlFor="task-notes" className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                  学习笔记
                </label>
                <textarea
                  id="task-notes"
                  name="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg"
                  rows={4}
                  placeholder="记录今天的学习心得..."
                />
              </div>
              <button onClick={completeTask} className="w-full py-4 px-6 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700">
                标记为已完成
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
