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

    // 根据任务类型生成更具体的内容
    const getTaskPrompt = (type: string) => {
      switch (type) {
        case 'reading':
          return `生成一个完整的阅读理解练习，必须包含：
1. passage: 一篇完整的英文文章（300-500词），主题可以是科技、环境、教育、社会等，要有实际内容不是placeholder
2. questions: 4-5道选择题，每题4个选项，题目要有实质内容
3. answers: 每道题的正确答案索引(0-3)和详细解析

示例格式：
{
  "title": "阅读理解：人工智能对教育的影响",
  "description": "阅读关于AI在教育领域应用的文章，完成相关理解题目",
  "duration": 30,
  "steps": ["通读文章把握主旨", "仔细阅读题目", "回到文章定位答案", "选择最佳选项", "核对答案并阅读解析"],
  "content": {
    "passage": "Artificial intelligence is transforming education in unprecedented ways... (完整文章)",
    "questions": [
      {"question": "What is the main idea of the passage?", "options": ["AI will replace teachers", "AI is changing how we learn", "AI is too expensive", "AI is not useful"]}
    ],
    "answers": [
      {"correct": 1, "explanation": "The passage discusses how AI transforms education, not replacing teachers or being expensive."}
    ]
  }
}`

        case 'listening':
          return `生成一个完整的听力练习，必须包含：
1. audio_text: 一段完整的听力原文（对话或独白，200-400词）
2. questions: 3-4道听力理解选择题
3. answers: 每道题的正确答案和解析

注意：听力原文要有实际内容，可以是校园生活、工作场景、新闻报道等。`

        case 'writing':
          return `生成一个完整的写作练习，必须包含：
1. prompt: 具体的写作题目（如："Some people think... Do you agree or disagree?"）
2. outline: 详细的写作思路（开头怎么写、中间论点、结尾怎么写）
3. sample: 一篇完整的高分范文（150-250词）
4. checklist: 自查清单（如：是否回应题目、语法检查、词汇多样性等）

注意：题目要具体，范文要完整可用，不是placeholder。`

        case 'vocabulary':
          return `生成一组完整的词汇学习材料，必须包含：
1. words: 12-15个单词，每个包含：
   - word: 单词本身
   - phonetic: 音标（如 /ˈæpəl/）
   - pos: 词性（n./v./adj./adv.）
   - meaning: 中文释义
   - example: 英文例句

单词应该是${exam_type?.toUpperCase()}考试核心词汇，难度适中。

示例：
{
  "words": [
    {"word": "significant", "phonetic": "/sɪɡˈnɪfɪkənt/", "pos": "adj.", "meaning": "重要的，有意义的", "example": "This is a significant discovery for science."}
  ]
}`

        case 'review':
          return `生成一个复习任务，包含：
1. summary: 重点知识点总结（语法点、词汇搭配、做题技巧等）
2. practice: 3-5道练习题（选择题或填空题）
3. tips: 学习建议

内容要具体实用，不是泛泛而谈。`

        default:
          return '生成一个英语学习任务，包含具体可执行的内容。'
      }
    }

    const selectedTaskTypes = task_types.map((t: string) => getTaskPrompt(t)).join('\n\n---\n\n')

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
          { role: 'system', content: '你是一个专业的英语学习任务规划师。请严格按照用户要求输出 JSON 格式，只输出JSON数组，不要任何其他文字。' },
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
    const content = data.choices[0].message.content

    console.log('AI response content length:', content?.length)
    console.log('AI response preview:', content?.substring(0, 200))

    // 尝试解析 JSON
    let tasks
    try {
      tasks = JSON.parse(content)
      console.log('Parsed tasks count:', tasks?.length)
    } catch (parseError) {
      console.error('JSON parse error:', parseError)
      // 如果失败，尝试提取 JSON
      const jsonMatch = content.match(/```json\n?([\s\S]*?)\n?```/) || content.match(/\[[\s\S]*\]/)
      if (jsonMatch) {
        const jsonStr = jsonMatch[1] || jsonMatch[0]
        tasks = JSON.parse(jsonStr)
      } else {
        console.error('JSON parse error, content:', content)
        return NextResponse.json(
          { error: 'AI 返回的数据格式不正确' },
          { status: 500 }
        )
      }
    }

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
