// 使用 Supabase API 执行 SQL 脚本
const fs = require('fs');

const SUPABASE_URL = 'https://pafifzxsprzxrvaywrfg.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBhZmlmenhzcHJ6eHJ2YXl3cmZnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzYzNjIzNiwiZXhwIjoyMDg5MjEyMjM2fQ.VlTOE_g4GkUG64D1VGg4084KgZOXjWwhVBQNXFzQfYs';

const sqlContent = fs.readFileSync('supabase/schema.sql', 'utf8');

async function executeSQL() {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
      'apikey': SERVICE_ROLE_KEY,
    },
    body: JSON.stringify({ sql: sqlContent }),
  });

  if (response.ok) {
    console.log('✅ SQL 脚本执行成功！');
  } else {
    const error = await response.text();
    console.error('❌ 执行失败:', error);
  }
}

executeSQL();
