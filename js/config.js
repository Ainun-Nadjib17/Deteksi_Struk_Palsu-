// Konfigurasi API
// PERHATIAN: Untuk keamanan di produksi nyata, API Key sebaiknya tidak disimpan di frontend.
// Ini hanya untuk keperluan prototipe / proyek personal.

const CONFIG = {
    // API Key sekarang akan diinput lewat UI dan disimpan di LocalStorage
    GEMINI_API_KEY: '',

    // Dapatkan dari Dashboard Supabase -> Project Settings -> API
    // Supabase URL & Anon Key aman untuk ditaruh di sini selama RLS (Row Level Security) aktif di database.
    SUPABASE_URL: 'https://uxtzwdfdepmavwewpjhf.supabase.co',
    SUPABASE_ANON_KEY: 'sb_publishable_Fa53zSAkKQ5780-fTRIxMg_TiWwX9xT'
};
