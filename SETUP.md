# AI英语学习平台 - 设置指南

## 📋 项目概述

基于 Next.js + Supabase + Tailwind CSS 构建的 AI 英语学习平台，支持：
- AI 生成个性化学习策略
- 每日任务管理
- 学习进度追踪
- 移动端优先设计

## 🚀 快速开始

### 1. 安装依赖

```bash
cd english-study-hub
npm install
```

### 2. 创建 Supabase 项目

1. 访问 https://supabase.com 并登录
2. 点击 "New Project"
3. 填写项目名称：english-study-hub
4. 设置数据库密码（保存好！）
5. 等待项目创建完成（约 1-2 分钟）

### 3. 配置数据库

1. 在 Supabase Dashboard 中，点击左侧 "SQL Editor"
2. 新建查询，复制 `supabase/schema.sql` 中的全部内容
3. 点击 "Run" 执行 SQL

### 4. 获取 API 密钥

1. 点击左侧 "Project Settings" → "API"
2. 复制以下信息：
   - **Project URL** (NEXT_PUBLIC_SUPABASE_URL)
   - **anon public** (NEXT_PUBLIC_SUPABASE_ANON_KEY)
   - **service_role secret** (SUPABASE_SERVICE_ROLE_KEY)

### 5. 配置环境变量

1. 复制 `.env.local.example` 为 `.env.local`：
```bash
cp .env.local.example .env.local
```

2. 填写你的 Supabase 配置：
```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### 6. 配置认证回调

1. 在 Supabase Dashboard 中，点击 "Authentication" → "URL Configuration"
2. 设置 **Site URL**: `http://localhost:3000`
3. 添加 **Redirect URL**: `http://localhost:3000/callback`

### 7. 启动开发服务器

```bash
npm run dev
```

访问 http://localhost:3000 开始使用！

## 📱 使用流程

1. **注册/登录** - 使用邮箱注册账号
2. **完善档案** - 填写考试类型、当前水平、目标分数、每日学习时间
3. **生成策略** - 输入 OpenAI API Key，AI 生成个性化学习策略
4. **每日任务** - 每天生成具体的学习任务
5. **打卡记录** - 完成任务并记录学习情况

## 🔑 获取 OpenAI API Key

1. 访问 https://platform.openai.com
2. 注册/登录账号
3. 点击右上角头像 → "View API keys"
4. 点击 "Create new secret key"
5. 复制生成的 key（只显示一次！）

## 📁 项目结构

```
english-study-hub/
├── app/
│   ├── (auth)/          # 认证相关页面
│   │   ├── login/       # 登录/注册
│   │   └── callback/    # 认证回调
│   ├── (dashboard)/     # 主界面（需登录）
│   │   ├── page.tsx     # 今日任务首页
│   │   ├── onboarding/  # 信息采集
│   │   ├── generate-strategy/  # 生成策略
│   │   ├── generate-daily/     # 生成每日任务
│   │   ├── strategy/    # 策略展示
│   │   ├── stats/       # 学习统计
│   │   └── tasks/[id]/  # 任务详情
│   ├── auth/signout/    # 退出登录
│   ├── layout.tsx       # 根布局
│   └── globals.css      # 全局样式
├── lib/
│   └── supabase/        # Supabase 客户端
│       ├── client.ts    # 浏览器端
│       └── server.ts    # 服务端
├── prompts/
│   └── strategy-generator.md  # AI Prompt 模板
├── supabase/
│   └── schema.sql       # 数据库 Schema
└── .env.local.example   # 环境变量模板
```

## 🛠️ 技术栈

- **框架**: Next.js 15 (App Router)
- **语言**: TypeScript
- **样式**: Tailwind CSS
- **UI组件**: shadcn/ui
- **后端**: Supabase (Auth + PostgreSQL)
- **AI**: OpenAI GPT-4o-mini

## 📝 数据库表说明

| 表名 | 说明 |
|------|------|
| profiles | 用户资料 |
| learning_strategies | AI学习策略 |
| daily_tasks | 每日任务 |
| study_logs | 学习记录 |

## 🔒 安全说明

- 所有表启用 RLS（行级安全）
- 用户只能访问自己的数据
- API Key 仅存储在浏览器本地
- 使用 Supabase Auth 进行身份验证

## 🐛 常见问题

### 1. 无法登录
- 检查 Supabase 回调 URL 配置
- 确认环境变量正确

### 2. 无法生成策略
- 检查 OpenAI API Key 是否有效
- 确认账户有余额

### 3. 数据库错误
- 确认 SQL 已正确执行
- 检查 RLS 策略是否创建

## 📞 支持

如有问题，请检查：
1. 浏览器控制台错误信息
2. Supabase Dashboard 日志
3. Next.js 终端输出
