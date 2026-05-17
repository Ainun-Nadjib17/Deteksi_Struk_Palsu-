class SupabaseClient {
    constructor() {
        if (CONFIG.SUPABASE_URL && !CONFIG.SUPABASE_URL.includes('ISI_SUPABASE') && 
            CONFIG.SUPABASE_ANON_KEY && !CONFIG.SUPABASE_ANON_KEY.includes('ISI_SUPABASE')) {
            this.supabase = window.supabase.createClient(
                CONFIG.SUPABASE_URL,
                CONFIG.SUPABASE_ANON_KEY
            );
        } else {
            console.warn("Supabase credentials belum diisi di config.js");
            this.supabase = null;
        }
    }

    async saveScanHistory(receiptName, isFake, analysisReason) {
        if (!this.supabase) return null;

        try {
            const { data, error } = await this.supabase
                .from('scan_history')
                .insert([
                    {
                        receipt_name: receiptName,
                        is_fake: isFake,
                        analysis_reason: analysisReason
                    }
                ])
                .select();

            if (error) throw error;
            return data;
        } catch (error) {
            console.error("Error saving history:", error.message);
            return null;
        }
    }

    async getScanHistory() {
        if (!this.supabase) return [];

        try {
            const { data, error } = await this.supabase
                .from('scan_history')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(10);

            if (error) throw error;
            return data;
        } catch (error) {
            console.error("Error fetching history:", error.message);
            return [];
        }
    }
}

const supabaseDb = new SupabaseClient();
