// js/supabase.js
const SUPABASE_URL = "https://colwfoppnibihoktistz.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_JasQFmDueboMfFpj_VOy2g_gYNhCRP2";

// expose globally
window.supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
