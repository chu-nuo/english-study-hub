# Supabase 数据库 Schema

-- 用户资料表（与auth.users关联）
create table profiles (
  id uuid references auth.users on delete cascade primary key,
  username text unique not null,
  exam_type text check (exam_type in ('ielts', 'toefl', 'cet4', 'cet6', 'gre', 'gmat')),
  current_level text,
  target_score int,
  daily_study_time int, -- 分钟
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- AI学习策略表（一人一条，存储AI生成的长期策略）
create table learning_strategies (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references profiles(id) on delete cascade,
  strategy_json jsonb not null, -- 存储AI生成的结构化策略
  methodology_summary text, -- 方法论总结
  weekly_structure jsonb, -- 每周学习结构
  created_at timestamp with time zone default timezone('utc'::text, now()),
  updated_at timestamp with time zone default timezone('utc'::text, now()),
  unique(user_id) -- 一个用户一套策略，可更新
);

-- 每日任务表
create table daily_tasks (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references profiles(id) on delete cascade,
  task_date date not null,
  task_type text check (task_type in ('reading', 'listening', 'writing', 'vocabulary', 'review')),
  content jsonb not null, -- AI生成的具体任务内容
  audio_text text, -- 听力任务的音频文本（用于TTS生成）
  is_completed boolean default false,
  completion_data jsonb, -- 存储完成时的数据（如写作内容、听力正确率）
  created_at timestamp with time zone default timezone('utc'::text, now())
); -- 同一天同一类型可多条（多次生成共存），见 migrations

-- 学习记录表（详细记录）
create table study_logs (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references profiles(id) on delete cascade,
  task_id uuid references daily_tasks(id),
  duration int, -- 实际学习分钟
  difficulty_rating int check (difficulty_rating between 1 and 5),
  notes text,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- 启用RLS（行级安全），确保用户只能看到自己的数据
alter table profiles enable row level security;
alter table learning_strategies enable row level security;
alter table daily_tasks enable row level security;
alter table study_logs enable row level security;

-- RLS策略：用户只能CRUD自己的数据
create policy "Users can only access own profile" 
  on profiles for all using (auth.uid() = id);

create policy "Users can only access own strategies" 
  on learning_strategies for all using (auth.uid() = user_id);

create policy "Users can only access own tasks" 
  on daily_tasks for all using (auth.uid() = user_id);

create policy "Users can only access own logs" 
  on study_logs for all using (auth.uid() = user_id);
