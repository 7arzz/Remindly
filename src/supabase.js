import { createClient } from "@supabase/supabase-js";

// Langsung menggunakan URL dan Key agar pasti terbaca
const supabaseUrl = "https://wdydmrdcxuhtcqqckcmq.supabase.co";
const supabaseAnonKey = "sb_publishable_6hW4k0K-Vt5sYPemW6aBdQ_ellHx98b";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export const loginWithGoogle = async () => {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: window.location.origin,
    },
  });
  if (error) throw error;
  return data;
};

export const logout = async () => {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
};
