import { createClient } from "@supabase/supabase-js";

// Mengambil URL dan Key dari file .env
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
// Kita tetap gunakan nama variabel VITE_SUPABASE_ANON_KEY di kode agar konsisten dengan file .env
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn("Supabase credentials missing. Please check your .env file.");
}

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
