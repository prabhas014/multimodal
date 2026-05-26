
const btnAnalyze = document.getElementById('btn-analyze');
const btnDownload = document.getElementById('btn-download');
const scanLine = document.getElementById('scan-line');
const dataViewer = document.getElementById('data-viewer');
const bboxContainer = document.getElementById('bbox-container');
const confidenceScore = document.getElementById('confidence-score');
const uploadZone = document.getElementById('upload-zone');
const fileUpload = document.getElementById('file-upload');
const viewerContainer = document.getElementById('viewer-container');
const docImage = document.getElementById('doc-image');
const docVideo = document.getElementById('doc-video');
const docAudio = document.getElementById('doc-audio');
const apiKeyInput = document.getElementById('api-key-input');
const langsmithKeyInput = document.getElementById('langsmith-key-input');

// Load API keys from local storage
if (localStorage.getItem('geminiApiKey')) {
    apiKeyInput.value = localStorage.getItem('geminiApiKey');
}
if (localStorage.getItem('langsmithApiKey')) {
    langsmithKeyInput.value = localStorage.getItem('langsmithApiKey');
}

apiKeyInput.addEventListener('change', (e) => {
    localStorage.setItem('geminiApiKey', e.target.value.trim());
});
langsmithKeyInput.addEventListener('change', (e) => {
    localStorage.setItem('langsmithApiKey', e.target.value.trim());
});

// Password toggles
document.querySelectorAll('.toggle-password').forEach(button => {
    button.addEventListener('click', function() {
        const input = this.previousElementSibling;
        if (input.type === 'password') {
            input.type = 'text';
            this.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>';
        } else {
            input.type = 'password';
            this.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>';
        }
    });
});

// Prevent default drag behaviors globally to avoid accidental file opening
window.addEventListener('dragover', (e) => e.preventDefault());
window.addEventListener('drop', (e) => e.preventDefault());

// File Upload Logic
uploadZone.addEventListener('dragenter', (e) => { e.preventDefault(); uploadZone.classList.add('dragover'); });
uploadZone.addEventListener('dragover', (e) => { e.preventDefault(); uploadZone.classList.add('dragover'); });
uploadZone.addEventListener('dragleave', (e) => { e.preventDefault(); uploadZone.classList.remove('dragover'); });
uploadZone.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadZone.classList.remove('dragover');
    if (e.dataTransfer.files.length) handleFile(e.dataTransfer.files[0]);
});
fileUpload.addEventListener('change', (e) => {
    if (e.target.files.length) handleFile(e.target.files[0]);
});

function handleFile(file) {
    logToConsole(`[INFO] Reading uploaded file: ${file.name}`);
    
    docImage.classList.add('hidden');
    docVideo.classList.add('hidden');
    docAudio.classList.add('hidden');
    bboxContainer.innerHTML = '';
    
    if (file.type === "application/pdf") {
        logToConsole(`[WARN] Native PDF viewing is limited. For full bounding box support, consider uploading images.`, 'warn');
        docImage.classList.remove('hidden');
    } else if (file.type.startsWith('video/')) {
        logToConsole(`[INFO] Video file detected. Extracting keyframes for analysis...`, 'info');
        docVideo.classList.remove('hidden');
    } else if (file.type.startsWith('audio/')) {
        logToConsole(`[INFO] Audio file detected. Transcribing speech to text...`, 'info');
        docAudio.classList.remove('hidden');
    } else {
        docImage.classList.remove('hidden');
    }
    
    const reader = new FileReader();
    reader.onload = (e) => {
        window.currentFileData = e.target.result;
        window.currentFileMime = file.type;

        if (file.type.startsWith('video/')) {
            docVideo.src = e.target.result;
        } else if (file.type.startsWith('audio/')) {
            docAudio.src = e.target.result;
        } else {
            docImage.src = e.target.result;
        }
        
        uploadZone.classList.add('hidden');
        viewerContainer.classList.remove('hidden');
        logToConsole(`[SUCCESS] File loaded into viewer. Starting analysis...`, 'success');
        
        // Automatically trigger analysis
        btnAnalyze.click();
    };
    reader.readAsDataURL(file);
}

// Zoom controls
let zoomLevel = 1;
const docWrapper = document.getElementById('document-wrapper');
document.getElementById('btn-zoom-in').addEventListener('click', () => {
    zoomLevel += 0.1;
    updateZoom();
});
document.getElementById('btn-zoom-out').addEventListener('click', () => {
    if(zoomLevel > 0.3) zoomLevel -= 0.1;
    updateZoom();
});
function updateZoom() {
    docWrapper.style.transform = `scale(${zoomLevel})`;
    document.getElementById('zoom-level').innerText = `${Math.round(zoomLevel * 100)}%`;
}


function logToConsole(message, type = 'info') {
    const timestamp = new Date().toLocaleTimeString();
    const formattedMessage = `[${timestamp}] ${message}`;
    if (type === 'error') console.error(formattedMessage);
    else if (type === 'warn') console.warn(formattedMessage);
    else console.log(formattedMessage);
}

// Sleep helper
const sleep = ms => new Promise(r => setTimeout(r, ms));

btnAnalyze.addEventListener('click', async () => {
    if (!window.currentFileData) {
        logToConsole('[ERROR] No document loaded for analysis.', 'error');
        return;
    }

    // Reset state
    bboxContainer.innerHTML = '';
    dataViewer.innerHTML = '';
    btnDownload.classList.add('disabled');
    confidenceScore.classList.add('hidden');
    
    // UI Loading state
    btnAnalyze.disabled = true;
    btnAnalyze.innerHTML = `<span class="pulse"></span> Analyzing...`;
    scanLine.classList.remove('hidden');

    logToConsole('[INFO] Sending document to Vercel Gemini API...');
    
    try {
        const res = await fetch('/api/analyze', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                apiKey: apiKeyInput.value.trim(),
                langsmithApiKey: langsmithKeyInput.value.trim(),
                fileData: window.currentFileData,
                mimeType: window.currentFileMime
            })
        });

        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.error || 'Failed to analyze document');
        }

        const data = await res.json();
        logToConsole('[SUCCESS] Analysis complete! Generating report...', 'success');
        
        if (!data.result) {
            logToConsole(`[WARN] Received empty or undefined result from server.`, 'warn');
        } else if (data.result === "No data returned from AI.") {
            logToConsole(`[WARN] The AI did not return any text. Model might be blocked.`, 'warn');
        } else {
            logToConsole(`[INFO] Received ${data.result.length} characters of markdown.`);
        }
        
        window.currentExtractionData = data.result;

        // Finish analysis
        scanLine.classList.add('hidden');
        btnAnalyze.disabled = false;
        btnAnalyze.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg> Analyze Document`;
        
        confidenceScore.classList.remove('hidden');
        btnDownload.classList.remove('disabled');

        renderResults(data.result);
    } catch (e) {
        scanLine.classList.add('hidden');
        btnAnalyze.disabled = false;
        btnAnalyze.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg> Analyze Document`;
        logToConsole(`[ERROR] ${e.message}`, 'error');
    }
});

function renderResults(markdownData) {
    if (markdownData) {
        dataViewer.innerHTML = marked.parse(markdownData);
    } else {
        dataViewer.innerHTML = `<div class="empty-state"><p>No data extracted.</p></div>`;
    }
}

// BBox logic has been removed as the new prompt focuses on holistic markdown reporting.

// Download action
btnDownload.addEventListener('click', () => {
    if (btnDownload.classList.contains('disabled')) return;
    
    logToConsole('[INFO] Preparing report export...', 'info');
    
    const dataStr = "data:text/markdown;charset=utf-8," + encodeURIComponent(window.currentExtractionData || "No data");
    const dlAnchorElem = document.createElement('a');
    dlAnchorElem.setAttribute("href", dataStr);
    dlAnchorElem.setAttribute("download", "Nexus_Analysis_Report.md");
    dlAnchorElem.click();
    
    logToConsole('[SUCCESS] Data exported successfully.', 'success');
});
