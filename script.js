import { inject } from '@vercel/analytics';
inject();

const btnAnalyze = document.getElementById('btn-analyze');
const btnDownload = document.getElementById('btn-download');
const scanLine = document.getElementById('scan-line');
const consoleOutput = document.getElementById('console-output');
const dataViewer = document.getElementById('data-viewer');
const bboxContainer = document.getElementById('bbox-container');
const confidenceScore = document.getElementById('confidence-score');
const btnClearConsole = document.getElementById('btn-clear-console');
const uploadZone = document.getElementById('upload-zone');
const fileUpload = document.getElementById('file-upload');
const viewerContainer = document.getElementById('viewer-container');
const docImage = document.getElementById('doc-image');
const docVideo = document.getElementById('doc-video');
const docAudio = document.getElementById('doc-audio');

// Prevent default drag behaviors globally to avoid accidental file opening
window.addEventListener('dragover', (e) => e.preventDefault());
window.addEventListener('drop', (e) => e.preventDefault());

// File Upload Logic
uploadZone.addEventListener('click', (e) => {
    if (e.target !== fileUpload) fileUpload.click();
});
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

// Mock Data
const mockExtraction = [
    {
        id: 'box-1',
        key: "Company_Logo",
        value: "[Graphic]",
        bbox: { top: '8%', left: '10%', width: '15%', height: '12%', type: 'logo' }
    },
    {
        id: 'box-2',
        key: "Vendor_Details",
        value: "Global Tech Supplies\n123 Innovation Dr.",
        bbox: { top: '8%', left: '70%', width: '20%', height: '10%', type: 'text' }
    },
    {
        id: 'box-3',
        key: "Invoice_Meta",
        value: "INV-2026-1024",
        bbox: { top: '25%', left: '70%', width: '20%', height: '5%', type: 'text' }
    },
    {
        id: 'box-4',
        key: "Bill_To",
        value: "Acme Corp\n456 Factory Ln.",
        bbox: { top: '25%', left: '10%', width: '25%', height: '10%', type: 'text' }
    },
    {
        id: 'box-5',
        key: "Line_Items",
        value: "Table (3 rows)",
        bbox: { top: '45%', left: '10%', width: '80%', height: '25%', type: 'table' },
        children: [
            { id: 'box-5-1', key: "Item_1", value: "Mechanical Keyboard - 2x", bbox: { top: '50%', left: '10%', width: '80%', height: '5%', type: 'table' } },
            { id: 'box-5-2', key: "Item_2", value: "Wireless Mouse - 1x", bbox: { top: '56%', left: '10%', width: '80%', height: '5%', type: 'table' } },
            { id: 'box-5-3', key: "Item_3", value: "USB-C Hub - 5x", bbox: { top: '62%', left: '10%', width: '80%', height: '5%', type: 'table' } }
        ]
    },
    {
        id: 'box-6',
        key: "Total_Tax",
        value: "$28.50",
        bbox: { top: '75%', left: '60%', width: '30%', height: '5%', type: 'text' }
    },
    {
        id: 'box-7',
        key: "Total_Amount",
        value: "$345.00",
        bbox: { top: '82%', left: '60%', width: '30%', height: '6%', type: 'text' }
    }
];

function logToConsole(message, type = 'info') {
    const entry = document.createElement('div');
    entry.className = `log-entry ${type}`;
    const timestamp = new Date().toLocaleTimeString();
    entry.innerText = `[${timestamp}] ${message}`;
    consoleOutput.appendChild(entry);
    consoleOutput.scrollTop = consoleOutput.scrollHeight;
}

btnClearConsole.addEventListener('click', () => {
    consoleOutput.innerHTML = '';
});

// Sleep helper
const sleep = ms => new Promise(r => setTimeout(r, ms));

btnAnalyze.addEventListener('click', async () => {
    // Reset state
    bboxContainer.innerHTML = '';
    dataViewer.innerHTML = '';
    btnDownload.classList.add('disabled');
    confidenceScore.classList.add('hidden');
    
    // UI Loading state
    btnAnalyze.disabled = true;
    btnAnalyze.innerHTML = `<span class="pulse"></span> Analyzing...`;
    scanLine.classList.remove('hidden');

    logToConsole('[INFO] Initializing Qwen2.5-VL pipeline...');
    await sleep(800);
    logToConsole('[INFO] Uploading document to VLM context...');
    await sleep(1000);
    logToConsole('[INFO] Running visual layout parsing (Table/Text/Logo)...');
    await sleep(1200);
    logToConsole('[INFO] Text layer coordinates mapped successfully.');
    await sleep(900);
    logToConsole('[SUCCESS] JSON schema validated successfully.', 'success');

    // Finish analysis
    scanLine.classList.add('hidden');
    btnAnalyze.disabled = false;
    btnAnalyze.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg> Analyze Document`;
    
    confidenceScore.classList.remove('hidden');
    btnDownload.classList.remove('disabled');

    renderResults();
});

function createJsonNode(data, level = 0) {
    const wrapper = document.createElement('div');
    
    const line = document.createElement('div');
    line.className = 'json-line';
    line.style.marginLeft = `${level * 20}px`;
    
    // Highlighting logic
    line.addEventListener('mouseenter', () => highlightBox(data.id, true));
    line.addEventListener('mouseleave', () => highlightBox(data.id, false));
    line.dataset.boxId = data.id;

    line.innerHTML = `<span class="json-key">"${data.key}"</span>: <span class="json-val-string">"${data.value.replace(/\n/g, ' ')}"</span>${data.children ? ',' : ''}`;
    wrapper.appendChild(line);

    if (data.children) {
        data.children.forEach(child => {
            wrapper.appendChild(createJsonNode(child, level + 1));
        });
    }

    return wrapper;
}

function renderResults() {
    // Render JSON structure
    const rootBlock = document.createElement('div');
    rootBlock.innerHTML = `<div class="json-line">{</div>`;
    
    mockExtraction.forEach(item => {
        rootBlock.appendChild(createJsonNode(item, 1));
        drawBBox(item);
        if(item.children) {
            item.children.forEach(child => drawBBox(child));
        }
    });

    rootBlock.innerHTML += `<div class="json-line">}</div>`;
    dataViewer.appendChild(rootBlock);

    // Fade in boxes
    setTimeout(() => {
        document.querySelectorAll('.bbox').forEach(b => b.classList.add('visible'));
    }, 100);
}

function drawBBox(data) {
    const box = document.createElement('div');
    box.className = `bbox type-${data.bbox.type}`;
    box.id = `bbox-${data.id}`;
    
    box.style.top = data.bbox.top;
    box.style.left = data.bbox.left;
    box.style.width = data.bbox.width;
    box.style.height = data.bbox.height;

    // Inverse highlight logic
    box.addEventListener('mouseenter', () => highlightJson(data.id, true));
    box.addEventListener('mouseleave', () => highlightJson(data.id, false));

    bboxContainer.appendChild(box);
}

function highlightBox(id, activate) {
    const box = document.getElementById(`bbox-${id}`);
    if (box) {
        if (activate) box.classList.add('highlight');
        else box.classList.remove('highlight');
    }
}

function highlightJson(id, activate) {
    const line = document.querySelector(`.json-line[data-box-id="${id}"]`);
    if (line) {
        if (activate) line.classList.add('highlight');
        else line.classList.remove('highlight');
        
        // ensure visibility
        if(activate) line.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
}

// Download action
btnDownload.addEventListener('click', () => {
    if (btnDownload.classList.contains('disabled')) return;
    
    logToConsole('[INFO] Preparing extraction export...', 'info');
    
    // Create a mock JSON payload
    const payload = {};
    mockExtraction.forEach(item => {
        if (item.children) {
            payload[item.key] = item.children.map(c => c.value);
        } else {
            payload[item.key] = item.value;
        }
    });

    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(payload, null, 2));
    const dlAnchorElem = document.createElement('a');
    dlAnchorElem.setAttribute("href", dataStr);
    dlAnchorElem.setAttribute("download", "extracted_document.json");
    dlAnchorElem.click();
    
    logToConsole('[SUCCESS] Data exported successfully.', 'success');
});
