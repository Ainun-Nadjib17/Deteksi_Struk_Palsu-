document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const dropArea = document.getElementById('upload-area');
    const fileInput = document.getElementById('file-input');
    const btnBrowse = document.getElementById('btn-browse');
    const uploadContent = document.querySelector('.upload-content');
    const previewArea = document.getElementById('preview-area');
    const imagePreview = document.getElementById('image-preview');
    const btnRemove = document.getElementById('btn-remove');
    const btnScan = document.getElementById('btn-scan');
    
    const loadingState = document.getElementById('loading-state');
    const resultArea = document.getElementById('result-area');
    const resultStatus = document.getElementById('result-status');
    const resultReason = document.getElementById('result-reason');
    const btnNewScan = document.getElementById('btn-new-scan');
    
    const historyList = document.getElementById('history-list');
    const btnRefreshHistory = document.getElementById('btn-refresh-history');

    // Settings Modal Elements
    const btnSettings = document.getElementById('btn-settings');
    const settingsModal = document.getElementById('settings-modal');
    const btnCloseSettings = document.getElementById('btn-close-settings');
    const btnSaveSettings = document.getElementById('btn-save-settings');
    const geminiKeyInput = document.getElementById('gemini-key-input');

    let currentFile = null;

    // --- Initialization ---
    loadHistory();
    // Load API Key to input if exists
    geminiKeyInput.value = localStorage.getItem('gemini_api_key') || '';

    // --- Event Listeners ---
    btnBrowse.addEventListener('click', () => fileInput.click());
    
    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length) {
            handleFile(e.target.files[0]);
        }
    });

    btnRemove.addEventListener('click', resetUploader);
    
    btnNewScan.addEventListener('click', () => {
        resetUploader();
        resultArea.classList.add('hidden');
        dropArea.classList.remove('hidden');
    });

    btnScan.addEventListener('click', startScan);
    
    btnRefreshHistory.addEventListener('click', loadHistory);

    // Settings Modal Listeners
    btnSettings.addEventListener('click', () => settingsModal.classList.remove('hidden'));
    btnCloseSettings.addEventListener('click', () => settingsModal.classList.add('hidden'));
    
    // Tutup modal jika klik di luar box
    settingsModal.addEventListener('click', (e) => {
        if (e.target === settingsModal) {
            settingsModal.classList.add('hidden');
        }
    });

    btnSaveSettings.addEventListener('click', () => {
        const key = geminiKeyInput.value.trim();
        if (key) {
            localStorage.setItem('gemini_api_key', key);
            settingsModal.classList.add('hidden');
            alert('API Key berhasil disimpan di browser!');
        } else {
            alert('API Key tidak boleh kosong.');
        }
    });

    // --- Drag & Drop ---
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropArea.addEventListener(eventName, preventDefaults, false);
    });

    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    ['dragenter', 'dragover'].forEach(eventName => {
        dropArea.addEventListener(eventName, () => {
            if (!currentFile) dropArea.classList.add('dragover');
        }, false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
        dropArea.addEventListener(eventName, () => {
            dropArea.classList.remove('dragover');
        }, false);
    });

    dropArea.addEventListener('drop', (e) => {
        if (currentFile) return; // Prevent drop if already has file
        const dt = e.dataTransfer;
        if (dt.files && dt.files.length) {
            handleFile(dt.files[0]);
        }
    }, false);

    // --- Core Functions ---
    function handleFile(file) {
        if (!file.type.startsWith('image/')) {
            alert('Silakan unggah file gambar (JPG/PNG).');
            return;
        }

        currentFile = file;
        const reader = new FileReader();
        
        reader.onload = (e) => {
            imagePreview.src = e.target.result;
            uploadContent.classList.add('hidden');
            previewArea.classList.remove('hidden');
        };
        
        reader.readAsDataURL(file);
    }

    function resetUploader() {
        currentFile = null;
        fileInput.value = '';
        imagePreview.src = '';
        previewArea.classList.add('hidden');
        uploadContent.classList.remove('hidden');
    }

    async function startScan() {
        if (!currentFile) return;

        // Cek apakah API Key sudah diatur sebelum memulai proses loading
        const apiKey = localStorage.getItem('gemini_api_key') || CONFIG.GEMINI_API_KEY;
        if (!apiKey || apiKey.trim() === '' || apiKey.includes('ISI_API_KEY')) {
            settingsModal.classList.remove('hidden');
            alert('Mohon masukkan Gemini API Key Anda terlebih dahulu!');
            return;
        }

        // Hide preview, show loading
        dropArea.classList.add('hidden');
        loadingState.classList.remove('hidden');

        try {
            const base64Image = imagePreview.src;
            const mimeType = currentFile.type;
            
            // Call Gemini API
            const result = await geminiClient.analyzeReceipt(base64Image, mimeType);
            
            // Show Result
            displayResult(result);
            
            // Save to DB (Background)
            const fileName = currentFile.name;
            await supabaseDb.saveScanHistory(fileName, result.is_fake, result.reason);
            
            // Refresh history quietly
            loadHistory();
            
        } catch (error) {
            alert("Terjadi kesalahan: " + error.message);
            // Revert UI
            loadingState.classList.add('hidden');
            dropArea.classList.remove('hidden');
        }
    }

    function displayResult(result) {
        loadingState.classList.add('hidden');
        resultArea.classList.remove('hidden');
        
        const isFake = result.is_fake;
        
        // Setup Status Header
        resultStatus.className = 'result-header ' + (isFake ? 'result-status-fake' : 'result-status-real');
        
        const icon = isFake ? '<i class="ri-alert-fill"></i>' : '<i class="ri-checkbox-circle-fill"></i>';
        const title = isFake ? 'Struk Terindikasi PALSU' : 'Struk Terindikasi ASLI';
        
        resultStatus.innerHTML = `
            ${icon}
            <div>
                <h3 style="font-size: 1.25rem; font-weight: 700;">${title}</h3>
                <span style="font-size: 0.875rem;">Keyakinan AI: ${result.confidence}%</span>
            </div>
        `;
        
        // Setup Reason
        resultReason.textContent = result.reason;
    }

    async function loadHistory() {
        if (!CONFIG.SUPABASE_URL || CONFIG.SUPABASE_URL.includes('ISI_SUPABASE')) return;
        
        const btnIcon = btnRefreshHistory.querySelector('i');
        btnIcon.classList.add('ri-loader-4-line', 'spin');
        btnIcon.classList.remove('ri-refresh-line');
        
        try {
            const data = await supabaseDb.getScanHistory();
            
            if (data && data.length > 0) {
                historyList.innerHTML = '';
                data.forEach(item => {
                    const date = new Date(item.created_at).toLocaleDateString('id-ID', {
                        day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute:'2-digit'
                    });
                    
                    const badgeClass = item.is_fake ? 'badge-fake' : 'badge-real';
                    const badgeText = item.is_fake ? 'Palsu' : 'Asli';
                    
                    const el = document.createElement('div');
                    el.className = 'history-item';
                    el.innerHTML = `
                        <div class="history-info">
                            <h4>${item.receipt_name}</h4>
                            <span class="history-date">${date}</span>
                        </div>
                        <span class="badge ${badgeClass}">${badgeText}</span>
                    `;
                    historyList.appendChild(el);
                });
            } else {
                historyList.innerHTML = '<div class="empty-state">Belum ada riwayat pemindaian.</div>';
            }
        } catch (error) {
            console.error(error);
        } finally {
            btnIcon.classList.remove('ri-loader-4-line', 'spin');
            btnIcon.classList.add('ri-refresh-line');
        }
    }
});
