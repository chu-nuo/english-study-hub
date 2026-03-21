-- Migration: 添加 audio_text 列到 daily_tasks 表
-- 执行时间: 2026-03-21

-- 添加 audio_text 列（可为空，用于存储听力任务的音频文本）
alter table daily_tasks add column if not exists audio_text text;

-- 添加注释说明
comment on column daily_tasks.audio_text is '听力任务的音频文本（用于TTS生成）';
