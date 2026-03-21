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
    const taskTypePrompts: Record<string, string> = {
      reading: `阅读理解任务：
1. 提供一篇${exam_type?.toUpperCase()}水平的阅读文章（300-500词）
2. 生成4-5道选择题，每题4个选项
3. 【重要】正确答案和解析要单独存放，不要直接显示在题目中
4. 题目格式要求：
   - passage: 文章正文（要有换行格式）
   - questions: 题目数组，每个题目包含 question(问题), options(选项数组，不要标注正确答案)
   - answers: 答案数组，每个包含 correct(正确选项索引0-3), explanation(解析说明)`,

      listening: `听力训练任务：
1. 提供一段听力原文文本（200-400词）
2. 生成3-4道听力理解选择题
3. 【重要】正确答案和解析要单独存放
4. 题目格式要求：
   - audio_text: 听力原文
   - questions: 题目数组
   - answers: 答案数组`,

      writing: `写作练习任务：
1. 给出一个写作题目和字数要求
2. 提供写作思路指导
3. 提供高分范文（供学习参考）
4. 提供评分标准和自查清单`,

      vocabulary: `词汇学习任务：
1. 生成12-15个核心词汇
2. 每个词汇包含：word(单词), phonetic(音标), pos(词性), meaning(中文释义), example(例句)
3. 【重要】同时生成卡片模式数据：
   - cards: 数组，每个卡片用于背诵模式，包含 word 和 meaning
   - quiz: 小测验题目，看中文选英文，或看英文选中文`,

      review: `复习巩固任务：
1. 根据之前学习内容设计复习
2. 包含重点知识点回顾
3. 设计自我检测题目
4. 提供错题整理模板`,
    }

    const selectedTaskTypes = task_types.map((t: string) => taskTypePrompts[t] || taskTypePrompts.reading).join('\n\n')

    const prompt = `你是英语学习任务生成器。请为用户生成今日具体可执行的学习任务。

用户信息：
- 考试类型: ${exam_type}
- 当前水平: ${current_level}
- 目标分数: ${target_score}
- 每日学习时间: ${daily_study_time} 分钟

今日计划重点: ${weekly_focus || '综合训练'}

请为以下 ${task_types.length} 种任务类型各生成1个具体任务：
${selectedTaskTypes}

【重要】每个任务必须包含：
1. title - 具体可执行的任务标题
2. description - 任务简介（1-2句话）
3. duration - 预计完成时间（分钟）
4. steps - 具体的执行步骤（3-5步）
5. content - 【重要】任务的具体内容，根据任务类型有不同的结构：
   - 阅读/听力任务：包含 passage(文章), questions(题目数组，不含答案), answers(答案和解析数组)
   - 词汇任务：包含 words(词汇数组), cards(卡片数组), quiz(测验数组)
   - 写作任务：包含 prompt(题目), outline(思路), sample(范文), checklist(自查清单)

【输出格式】必须是合法的JSON数组，格式如下：
[
  {
    "title": "任务标题",
    "description": "任务简介",
    "duration": 30,
    "steps": ["步骤1", "步骤2", "步骤3"],
    "content": {
      "passage": "文章正文（阅读/听力任务）",
      "questions": [
        {"question": "问题1", "options": ["A选项", "B选项", "C选项", "D选项"]},
        {"question": "问题2", "options": ["A选项", "B选项", "C选项", "D选项"]}
      ],
      "answers": [
        {"correct": 1, "explanation": "解析说明"},
        {"correct": 2, "explanation": "解析说明"}
      ]
    }
  }
]`

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
