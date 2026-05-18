import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function checkTasks() {
  const { data, error } = await supabase
    .from('tasks')
    .select('id, text, time, done, notified_2h, notified_30m, notified_5m')
    .order('created_at', { ascending: false })
    .limit(5);

  console.log('Error:', error);
  console.log('Tasks:', data);
}

checkTasks();
