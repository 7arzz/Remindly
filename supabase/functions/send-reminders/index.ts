import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

Deno.serve(async (req) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )

  const now = new Date();
  
  // 1. Ambil tugas yang belum selesai, memiliki pengingat, dan belum pernah dikirimi notifikasi
  const { data: tasks, error } = await supabase
    .from('tasks')
    .select(`
      id, 
      text, 
      time, 
      reminder_offset, 
      user_id,
      user_push_tokens (fcm_token)
    `)
    .eq('done', false)
    .eq('reminder_sent', false)
    .gt('reminder_offset', 0);

  if (error) {
    console.error("Error fetching tasks:", error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }

  // 2. Filter tugas yang waktu pengingatnya sudah tiba (deadline - offset)
  const remindersToSend = tasks.filter(task => {
    const deadline = new Date(task.time);
    const reminderTime = new Date(deadline.getTime() - (task.reminder_offset * 60000));
    return now >= reminderTime && now < deadline;
  });

  const results = [];

  // 3. Proses pengiriman (saat ini log ke console dan update DB)
  for (const task of remindersToSend) {
    const fcmToken = Array.isArray(task.user_push_tokens) 
      ? task.user_push_tokens[0]?.fcm_token 
      : task.user_push_tokens?.fcm_token;

    if (!fcmToken) {
      console.log(`No FCM token found for user: ${task.user_id}`);
      continue;
    }

    // CATATAN: Untuk mengirim ke Firebase asli, Anda perlu menambahkan fetch ke API FCM di sini.
    console.log(`Triggering notification for: ${task.text} to token: ${fcmToken}`);
    
    const { error: updateError } = await supabase
      .from('tasks')
      .update({ reminder_sent: true })
      .eq('id', task.id);

    results.push({ task: task.text, status: updateError ? 'failed' : 'processed' });
  }

  return new Response(JSON.stringify({ 
    message: "Reminder check completed", 
    results 
  }), {
    headers: { "Content-Type": "application/json" }
  });
})
