import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  console.log('Generate daily API called')
  
  try {
    const body = await request.json()
    console.log('Request body:', JSON.stringify(body, null, 2))
    const { exam_type, current_level, target_score, daily_study_time, day_of_week, weekly_focus, task_types } = body

    if (!exam_type || !current_level || !target_score || !daily_study_time || !task_types || !Array.isArray(task_types)) {
      return NextResponse.json(
        { error: '缺少必要的参数' },
        { status: 400 }
      )
    }

    // 简化的任务生成 - 避免复杂的JSON嵌套导致解析错误
    const getSimpleTaskPrompt = (type: string) => {
      const baseContent = {
        reading: `【阅读任务内容格式】
title: 阅读理解：[文章主题]
description: 阅读以下文章并完成理解题目
passage: |
  [在这里写完整的英文文章，300-500词，主题可以是科技、环境、教育、健康等]
questions:
1. [问题1]? A) [选项] B) [选项] C) [选项] D) [选项] 答案:[A/B/C/D] 解析:[为什么]
2. [问题2]? A) [选项] B) [选项] C) [选项] D) [选项] 答案:[A/B/C/D] 解析:[为什么]
3. [问题3]? A) [选项] B) [选项] C) [选项] D) [选项] 答案:[A/B/C/D] 解析:[为什么]
4. [问题4]? A) [选项] B) [选项] C) [选项] D) [选项] 答案:[A/B/C/D] 解析:[为什么]`,

        listening: `【听力任务内容格式】
title: 听力训练：[场景主题]
description: 听以下对话/独白并回答问题
audio_text: |
  [在这里写完整的听力原文，对话或独白形式，200-400词]
questions:
1. [问题1]? A) [选项] B) [选项] C) [选项] D) [选项] 答案:[A/B/C/D] 解析:[为什么]
2. [问题2]? A) [选项] B) [选项] C) [选项] D) [选项] 答案:[A/B/C/D] 解析:[为什么]
3. [问题3]? A) [选项] B) [选项] C) [选项] D) [选项] 答案:[A/B/C/D] 解析:[为什么]`,

        writing: `【写作任务内容格式】
title: 写作练习：[题目类型]
description: 根据题目要求完成写作任务
prompt: [具体的写作题目，如：Some people think... Do you agree or disagree?]
word_count: [字数要求，如150-200词]
outline: |
  开头段：[怎么写开头]
  主体段1：[论点1及展开]
  主体段2：[论点2及展开]
  结尾段：[怎么写结尾]
sample: |
  [在这里写完整的范文，150-250词]
checklist:
- [自查点1]
- [自查点2]
- [自查点3]`,

        vocabulary: `【词汇任务内容格式】
title: 词汇学习：核心词汇${exam_type?.toUpperCase()}
description: 学习并掌握以下核心词汇
words:
1. [单词] [音标] [词性] [中文释义] 例句：[英文例句]
2. [单词] [音标] [词性] [中文释义] 例句：[英文例句]
3. [单词] [音标] [词性] [中文释义] 例句：[英文例句]
[继续到12-15个单词]`,

        review: `【复习任务内容格式】
title: 复习巩固：重点回顾
description: 复习近期学习的重点内容
summary: |
  [知识点总结]
practice:
1. [练习题1]? 答案：[答案] 解析：[解析]
2. [练习题2]? 答案：[答案] 解析：[解析]
tips: |
  [学习建议]`
      }
      return baseContent[type as keyof typeof baseContent] || baseContent.reading
    }

    const selectedTaskTypes = task_types.map((t: string) => getSimpleTaskPrompt(t)).join('\n\n==========\n\n')

    const prompt = `请为${exam_type?.toUpperCase()}考生生成${task_types.length}个学习任务。

考生信息：
- 当前水平：${current_level}
- 目标分数：${target_score}
- 每日学习时间：${daily_study_time}分钟

【非常重要】
1. 必须生成真实、完整、可直接学习的内容
2. 不要生成placeholder或示例说明
3. 阅读文章必须是完整的真实文章
4. 写作题目必须具体，范文必须是完整的文章
5. 词汇必须是真实单词，有正确音标和例句

任务类型：
${selectedTaskTypes}

请按照上述格式生成内容，确保学生可以直接开始学习。内容要充实、有实际价值。`

    const prompt = `你是专业的英语教育内容生成专家。请为用户生成今日具体、完整、可直接使用的学习任务。

用户信息：
- 考试类型: ${exam_type}
- 当前水平: ${current_level}
- 目标分数: ${target_score}
- 每日学习时间: ${daily_study_time} 分钟

【重要要求】
1. 必须生成真实、完整、可直接学习的内容
2. 不能生成placeholder或示例框架
3. 阅读文章必须是完整的、有实际内容的文章
4. 写作题目必须具体，范文必须是完整的文章
5. 词汇必须是真实的单词，有正确的音标和例句

任务类型要求：
${selectedTaskTypes}

【输出格式】
返回合法的JSON数组，每个任务包含：
- title: 任务标题
- description: 任务简介  
- duration: 预计时间(分钟)
- steps: 执行步骤数组
- content: 任务具体内容（根据类型不同）

请确保生成的内容真实可用，学生可以直接开始学习！`

    // 调用 SiliconFlow API
    const apiKey = process.env.SILICONFLOW_API_KEY
    const model = process.env.SILICONFLOW_MODEL || 'deepseek-ai/DeepSeek-V3.2'

    if (!apiKey) {
      return NextResponse.json(
        { error: '服务器未配置 API Key' },
        { status: 500 }
      )
    }

    const response = await fetch('https://api.siliconflow.cn/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: model,
        messages: [
          { role: 'system', content: '你是专业的英语教育内容生成专家。请生成真实、完整、可直接使用的英语学习材料。' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 4000,
      }),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      console.error('SiliconFlow API Error:', response.status, errorData)
      return NextResponse.json(
        { error: `AI 服务调用失败: ${errorData.error?.message || response.statusText}` },
        { status: 500 }
      )
    }

    const data = await response.json()
    const aiContent = data.choices[0].message.content

    console.log('AI response length:', aiContent?.length)

    // 解析AI返回的文本格式，转换为任务对象
    const tasks = parseTasksFromText(aiContent, task_types)

    if (!Array.isArray(tasks) || tasks.length === 0) {
      return NextResponse.json(
        { error: '生成的任务格式错误' },
        { status: 500 }
      )
    }

    return NextResponse.json({ tasks })
  } catch (err: any) {
    console.error('Generate daily tasks API error:', err)
    return NextResponse.json(
      { error: err.message || '生成任务时发生错误' },
      { status: 500 }
    )
  }
}

// 解析AI返回的文本为任务对象
function parseTasksFromText(text: string, taskTypes: string[]): any[] {
  const tasks: any[] = []
  const sections = text.split(/==========/)

  for (let i = 0; i < sections.length && i < taskTypes.length; i++) {
    const section = sections[i].trim()
    const type = taskTypes[i]

    try {
      const task = parseTaskSection(section, type)
      if (task) tasks.push(task)
    } catch (e) {
      console.error(`解析${type}任务失败:`, e)
    }
  }

  return tasks
}

function parseTaskSection(text: string, type: string): any | null {
  // 提取标题
  const titleMatch = text.match(/title:\s*(.+)/i)
  const title = titleMatch ? titleMatch[1].trim() : `${type}任务`

  // 提取描述
  const descMatch = text.match(/description:\s*(.+)/i)
  const description = descMatch ? descMatch[1].trim() : '完成学习任务'

  const baseTask = {
    title,
    description,
    duration: 30,
    steps: ['仔细阅读任务要求', '完成学习内容', '检查答案并复习'],
    content: {}
  }

  switch (type) {
    case 'reading':
      return parseReadingTask(text, baseTask)
    case 'listening':
      return parseListeningTask(text, baseTask)
    case 'writing':
      return parseWritingTask(text, baseTask)
    case 'vocabulary':
      return parseVocabularyTask(text, baseTask)
    case 'review':
      return parseReviewTask(text, baseTask)
    default:
      return baseTask
  }
}

function parseReadingTask(text: string, baseTask: any): any {
  // 提取文章
  const passageMatch = text.match(/passage:\s*\|?\s*\n?([\s\S]*?)(?=questions:|$)/i)
  const passage = passageMatch ? passageMatch[1].trim() : ''

  // 提取题目
  const questions: any[] = []
  const answers: any[] = []

  const questionMatches = text.matchAll(/(\d+)\.\s*([^?]+)\?\s*A\)\s*([^B]+)B\)\s*([^C]+)C\)\s*([^D]+)D\)\s*([^\n]+?)\s*答案:([A-D])\s*解析:([^\n]+)/gi)

  for (const match of questionMatches) {
    const correctMap: Record<string, number> = { 'A': 0, 'B': 1, 'C': 2, 'D': 3 }
    questions.push({
      question: match[2].trim(),
      options: [match[3].trim(), match[4].trim(), match[5].trim(), match[6].trim()]
    })
    answers.push({
      correct: correctMap[match[7].toUpperCase()] || 0,
      explanation: match[8].trim()
    })
  }

  return {
    ...baseTask,
    content: { passage, questions, answers }
  }
}

function parseListeningTask(text: string, baseTask: any): any {
  const audioMatch = text.match(/audio_text:\s*\|?\s*\n?([\s\S]*?)(?=questions:|$)/i)
  const audio_text = audioMatch ? audioMatch[1].trim() : ''

  const questions: any[] = []
  const answers: any[] = []

  const questionMatches = text.matchAll(/(\d+)\.\s*([^?]+)\?\s*A\)\s*([^B]+)B\)\s*([^C]+)C\)\s*([^D]+)D\)\s*([^\n]+?)\s*答案:([A-D])\s*解析:([^\n]+)/gi)

  for (const match of questionMatches) {
    const correctMap: Record<string, number> = { 'A': 0, 'B': 1, 'C': 2, 'D': 3 }
    questions.push({
      question: match[2].trim(),
      options: [match[3].trim(), match[4].trim(), match[5].trim(), match[6].trim()]
    })
    answers.push({
      correct: correctMap[match[7].toUpperCase()] || 0,
      explanation: match[8].trim()
    })
  }

  return {
    ...baseTask,
    content: { audio_text, questions, answers }
  }
}

function parseWritingTask(text: string, baseTask: any): any {
  const promptMatch = text.match(/prompt:\s*(.+)/i)
  const wordCountMatch = text.match(/word_count:\s*(.+)/i)
  const outlineMatch = text.match(/outline:\s*\|?\s*\n?([\s\S]*?)(?=sample:|$)/i)
  const sampleMatch = text.match(/sample:\s*\|?\s*\n?([\s\S]*?)(?=checklist:|$)/i)
  const checklistMatch = text.match(/checklist:\s*\n?([\s\S]*?)$/i)

  const checklist: string[] = []
  if (checklistMatch) {
    const items = checklistMatch[1].matchAll(/-\s*(.+)/g)
    for (const item of items) {
      checklist.push(item[1].trim())
    }
  }

  return {
    ...baseTask,
    content: {
      prompt: promptMatch ? promptMatch[1].trim() : '',
      word_count: wordCountMatch ? wordCountMatch[1].trim() : '150-200词',
      outline: outlineMatch ? outlineMatch[1].trim() : '',
      sample: sampleMatch ? sampleMatch[1].trim() : '',
      checklist
    }
  }
}

function parseVocabularyTask(text: string, baseTask: any): any {
  const words: any[] = []

  const wordMatches = text.matchAll(/(\d+)\.\s*(\w+)\s+([\/\[\]ˈˌaɪeəʊɔuæɑɒɛɜŋθðʃʒ\.]+)\s+(\w+\.?)\s+([^例]+?)\s*例句[:：]\s*(.+)/gi)

  for (const match of wordMatches) {
    words.push({
      word: match[2].trim(),
      phonetic: match[3].trim(),
      pos: match[4].trim(),
      meaning: match[5].trim(),
      example: match[6].trim()
    })
  }

  return {
    ...baseTask,
    content: { words }
  }
}

function parseReviewTask(text: string, baseTask: any): any {
  const summaryMatch = text.match(/summary:\s*\|?\s*\n?([\s\S]*?)(?=practice:|$)/i)
  const tipsMatch = text.match(/tips:\s*\|?\s*\n?([\s\S]*?)$/i)

  const practice: any[] = []
  const practiceMatches = text.matchAll(/(\d+)\.\s*([^?]+)\?\s*答案:([^\n]+?)\s*解析:([^\n]+)/gi)

  for (const match of practiceMatches) {
    practice.push({
      question: match[2].trim(),
      answer: match[3].trim(),
      explanation: match[4].trim()
    })
  }

  return {
    ...baseTask,
    content: {
      summary: summaryMatch ? summaryMatch[1].trim() : '',
      practice,
      tips: tipsMatch ? tipsMatch[1].trim() : ''
    }
  }
}
