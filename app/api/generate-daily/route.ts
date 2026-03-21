import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { exam_type, current_level, target_score, daily_study_time, day_of_week, weekly_focus, task_types } = body

    if (!exam_type || !current_level || !target_score || !daily_study_time || !task_types || !Array.isArray(task_types)) {
      return NextResponse.json(
        { error: '缺少必要的参数' },
        { status: 400 }
      )
    }

    // 根据任务类型生成更具体的内容
    const taskTypePrompts: Record<string, string> = {
      reading: '阅读理解：提供一篇雅思/托福/四六级阅读文章的标题、来源、字数，以及3-5道选择题让学生练习。题目必须包含：文章正文内容、每道题目的选项和正确答案。',
      listening: '听力训练：提供一个完整的听力练习场景。必须包含：听力音频文本（用【听力文本】标注）、3-5道听力题目（选择题）和正确答案。',
      writing: '写作练习：给出一个写作题目，包含题目描述、字数要求、参考范文或写作思路。',
      vocabulary: '词汇学习：列出10-15个今日应学习的重点词汇，每个词必须包含：单词、音标、词性、中文释义、一个例句。',
      review: '复习巩固：设计复习内容，包含之前学过的重点知识点回顾、错题整理方法。',
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
2. description - 具体的任务描述，包含题目或内容
3. duration - 预计完成时间（分钟）
4. steps - 具体的执行步骤（3-5步）
5. audio_text - 【仅听力任务】包含完整的听力原文文本（用于后续生成音频），其他任务留空

【输出格式】必须是合法的JSON数组。
例如：
[
  {
    "title": "完成剑雅真题第X篇阅读",
    "description": "阅读文章并完成题目...",
    "duration": 30,
    "steps": ["先阅读题目", "快速浏览文章", "定位关键词", "答题", "核对答案"],
    "audio_text": ""
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

    // 尝试解析 JSON
    let tasks
    try {
      tasks = JSON.parse(content)
    } catch {
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
