import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { exam_type, current_level, target_score, daily_study_time } = body

    if (!exam_type || !current_level || !target_score || !daily_study_time) {
      return NextResponse.json(
        { error: '缺少必要的参数' },
        { status: 400 }
      )
    }

    // 读取 prompt 模板
    const promptTemplate = `# Role
你是一位拥有10年经验的语言教学专家和数据科学家，精通雅思/托福/四六级/GRE的备考策略设计。

# Context
用户即将参加${exam_type}考试，当前水平${current_level}，目标分数${target_score}，每天可投入${daily_study_time}分钟。

# Task
基于认知科学原理（艾宾浩斯遗忘曲线、刻意练习、间隔重复），设计一套个性化的90天备考策略。

# Output Format (必须输出JSON格式)
{
  "methodology": {
    "core_principle": "策略核心原则（如：输入输出循环、高频重复）",
    "study_cycle": "3阶段循环描述（积累期→强化期→冲刺期）",
    "time_allocation": {
      "reading": "占比和建议时段",
      "listening": "占比和建议时段", 
      "writing": "占比和建议时段",
      "vocabulary": "占比和建议时段"
    }
  },
  "weekly_structure": {
    "monday": {"focus": "主科目", "task_type": "训练类型", "intensity": "high/medium/low"},
    "tuesday": {"focus": "主科目", "task_type": "训练类型", "intensity": "high/medium/low"},
    "wednesday": {"focus": "主科目", "task_type": "训练类型", "intensity": "high/medium/low"},
    "thursday": {"focus": "主科目", "task_type": "训练类型", "intensity": "high/medium/low"},
    "friday": {"focus": "主科目", "task_type": "训练类型", "intensity": "high/medium/low"},
    "saturday": {"focus": "主科目", "task_type": "训练类型", "intensity": "high/medium/low"},
    "sunday": {"focus": "review", "task_type": "周复盘", "intensity": "low"}
  },
  "daily_routine": {
    "session1": {"time": "早晨/午休/晚上", "duration": "分钟", "content": "具体内容"},
    "session2": {"time": "早晨/午休/晚上", "duration": "分钟", "content": "具体内容"}
  },
  "milestones": [
    {"day": 30, "target": "第一阶段目标", "checkpoint": "如何验证达成"},
    {"day": 60, "target": "第二阶段目标", "checkpoint": "如何验证达成"},
    {"day": 90, "target": "第三阶段目标", "checkpoint": "如何验证达成"}
  ],
  "adaptive_rules": "根据学习数据调整策略的规则（如：连续3天正确率<60%则降低难度）"
}`

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
          { role: 'system', content: '你是一个专业的英语学习策略规划师。请严格按照用户要求输出 JSON 格式。' },
          { role: 'user', content: promptTemplate }
        ],
        temperature: 0.7,
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
    
    // 提取 JSON
    const jsonMatch = content.match(/```json\n?([\s\S]*?)\n?```/) || content.match(/{[\s\S]*}/)
    const jsonStr = jsonMatch ? jsonMatch[1] || jsonMatch[0] : content
    
    let strategy
    try {
      strategy = JSON.parse(jsonStr)
    } catch (parseErr) {
      console.error('JSON parse error:', parseErr)
      return NextResponse.json(
        { error: 'AI 返回的数据格式不正确' },
        { status: 500 }
      )
    }

    return NextResponse.json({ strategy })
  } catch (err: any) {
    console.error('Generate strategy API error:', err)
    return NextResponse.json(
      { error: err.message || '生成策略时发生错误' },
      { status: 500 }
    )
  }
}
