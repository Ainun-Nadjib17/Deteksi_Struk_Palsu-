class GeminiAPI {
    constructor() {
        // API Key akan diambil secara dinamis saat analyzeReceipt dipanggil
    }

    async analyzeReceipt(base64Image, mimeType) {
        const apiKey = localStorage.getItem('gemini_api_key') || CONFIG.GEMINI_API_KEY;
        
        if (!apiKey || apiKey.trim() === '' || apiKey.includes('ISI_API_KEY')) {
            throw new Error("Gemini API Key belum dikonfigurasi. Silakan klik ikon Pengaturan di pojok kanan atas.");
        }

        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${apiKey}`;

        const prompt = `
            Anda adalah seorang ahli forensik digital dan auditor keuangan yang bertugas mendeteksi struk atau bukti transfer palsu.
            Analisis gambar struk ini dengan sangat teliti. Perhatikan:
            1. Tipe font dan inkonsistensi ketebalan teks.
            2. Keselarasan baris teks (alignment).
            3. Bayangan, artefak kompresi, atau manipulasi gambar.
            4. Kelogisan angka (jumlah total, PPN, dll).
            5. Kesesuaian format tanggal dan waktu.
            
            Berikan hasil analisis Anda WAJIB dalam format JSON murni dengan 3 properti berikut:
            1. "is_fake" (boolean): true jika palsu, false jika asli.
            2. "confidence" (number): angka 0 sampai 100 yang menunjukkan tingkat keyakinan Anda.
            3. "reason" (string): penjelasan logis dan detail mengapa struk ini palsu atau asli.

            PENTING: Pastikan respons Anda DIAWALI dengan tanda kurung kurawal "{" dan DIAKHIRI dengan "}". Jangan hilangkan tanda kurungnya.
        `;

        // Hilangkan data:image/xxx;base64, dari string
        const base64Data = base64Image.split(',')[1];

        const requestBody = {
            contents: [
                {
                    parts: [
                        { text: prompt },
                        {
                            inlineData: {
                                mimeType: mimeType,
                                data: base64Data
                            }
                        }
                    ]
                }
            ],
            generationConfig: {
                temperature: 0.1,
                topK: 32,
                topP: 1,
                maxOutputTokens: 1024
            }
        };

        try {
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestBody)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(`API Error: ${errorData.error?.message || response.statusText}`);
            }

            const data = await response.json();
            let textResponse = data.candidates[0].content.parts[0].text;
            console.log("Raw AI Response:", textResponse);
            
            // Coba parse JSON dari respons teks
            try {
                // Pembersihan string
                let cleanJson = textResponse.trim();
                cleanJson = cleanJson.replace(/```json\n?|```/g, '').trim();
                
                // Coba temukan blok JSON utuh
                const startIndex = cleanJson.indexOf('{');
                const endIndex = cleanJson.lastIndexOf('}');
                
                if (startIndex !== -1 && endIndex !== -1) {
                    cleanJson = cleanJson.substring(startIndex, endIndex + 1);
                    return JSON.parse(cleanJson);
                }
                
                // JIKA AI masih bandel dan tidak mengeluarkan kurung kurawal
                // Kita gunakan Regex sebagai senjata terakhir!
                const isFakeMatch = textResponse.match(/"is_fake"\s*:\s*(true|false)/i);
                const confidenceMatch = textResponse.match(/"confidence"\s*:\s*(\d+)/i);
                
                // Ambil reason dari pola "reason": "..." sampai akhir teks
                const reasonParts = textResponse.split(/"reason"\s*:\s*"/i);
                let reason = "Alasan tidak dapat diekstrak penuh, tetapi struk terdeteksi.";
                if (reasonParts.length > 1) {
                    reason = reasonParts[1].trim();
                    if (reason.endsWith('}')) reason = reason.slice(0, -1).trim();
                    if (reason.endsWith('"')) reason = reason.slice(0, -1).trim();
                }

                if (isFakeMatch && confidenceMatch) {
                    return {
                        is_fake: isFakeMatch[1].toLowerCase() === 'true',
                        confidence: parseInt(confidenceMatch[1]),
                        reason: reason
                    };
                }

                throw new Error("Pola JSON tidak ditemukan");
                
            } catch (e) {
                console.error("Failed to parse JSON response:", textResponse);
                throw new Error("Gagal membaca hasil AI. Respons asli:\n" + textResponse.substring(0, 100) + "...");
            }

        } catch (error) {
            console.error("Gemini API Error:", error);
            if (error.message.includes("Gagal membaca")) {
                throw error;
            }
            throw new Error(error.message);
        }
    }
}

const geminiClient = new GeminiAPI();
