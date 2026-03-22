-- 允许同一天、同一任务类型下存在多条记录（多次 AI 生成可共存）
alter table daily_tasks drop constraint if exists daily_tasks_user_id_task_date_task_type_key;
