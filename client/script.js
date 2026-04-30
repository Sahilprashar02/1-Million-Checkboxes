let COLS = 1000;
let ROWS = 1000;
const CELL_SIZE = 24; 
const BACKEND_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
    ? 'http://localhost:5000' 
    : window.location.origin;

const WS_URL = BACKEND_URL.replace(/^http/, 'ws');

let socket;
let checkboxState = new Uint8Array(125000); // 1,000,000 bits default
let user = null;
let optimisticUpdates = new Set(); 

const landingPage = document.getElementById('landing-page');
const appContainer = document.getElementById('app-container');
const gridContainer = document.getElementById('grid-container');
const visibleGrid = document.getElementById('visible-grid');
const totalCheckedEl = document.getElementById('total-checked');
const loginLandingBtn = document.getElementById('login-landing-btn');
const logoutBtn = document.getElementById('logout-btn');
const resetBtn = document.getElementById('reset-btn');
const userNameEl = document.getElementById('user-name');
const coordsEl = document.getElementById('coords');
const statusEl = document.getElementById('connection-status');

const inputCols = document.getElementById('input-cols');
const inputRows = document.getElementById('input-rows');
const applyGridBtn = document.getElementById('apply-grid-btn');

// 1. Auth Logic
async function checkAuth() {
    try {
        const res = await fetch(`${BACKEND_URL}/auth/me`, { credentials: 'include' });
        const data = await res.json();
        if (data.user) {
            user = data.user;
            userNameEl.textContent = user.displayName;
            landingPage.classList.add('hidden');
            appContainer.classList.remove('hidden');
            initWS(); 
        } else {
            landingPage.classList.remove('hidden');
            appContainer.classList.add('hidden');
        }
    } catch (err) {
        console.error('Auth check failed', err);
    }
}

loginLandingBtn.addEventListener('click', () => {
    window.location.href = `${BACKEND_URL}/auth/google`; 
});

document.getElementById('guest-login-btn').addEventListener('click', () => {
    window.location.href = `${BACKEND_URL}/auth/guest`;
});

logoutBtn.addEventListener('click', () => {
    window.location.href = `${BACKEND_URL}/auth/logout`;
});

// 2. WebSocket Logic
function initWS() {
    socket = new WebSocket(WS_URL);

    socket.onopen = () => {
        statusEl.textContent = 'Online';
        statusEl.style.color = '#22d3ee';
    };

    socket.onmessage = (event) => {
        const msg = JSON.parse(event.data);
        if (msg.type === 'INIT') {
            const binaryString = atob(msg.data);
            checkboxState = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
                checkboxState[i] = binaryString.charCodeAt(i);
            }
            if (msg.config) updateGridDimensions(msg.config.cols, msg.config.rows);
            else updateGridDimensions(COLS, ROWS); 
            totalCheckedEl.textContent = msg.count.toLocaleString();
            render();
        } else if (msg.type === 'UPDATE') {
            const { index, value } = msg.data;
            setBit(index, value);
            optimisticUpdates.delete(index);
            totalCheckedEl.textContent = msg.count.toLocaleString();
            updateSingleCheckbox(index, value);
        } else if (msg.type === 'RESIZE') {
            updateGridDimensions(msg.cols, msg.rows);
            if (msg.count !== undefined) totalCheckedEl.textContent = msg.count.toLocaleString();
            
            // Dynamically resize the state array while preserving data
            const newSize = Math.ceil((msg.cols * msg.rows) / 8);
            if (newSize > checkboxState.length) {
                const newState = new Uint8Array(newSize);
                newState.set(checkboxState);
                checkboxState = newState;
            }
            
            render();
            showToast(`Grid resized to ${msg.cols}x${msg.rows}`, 'info');
        } else if (msg.type === 'RESET') {
            checkboxState.fill(0);
            totalCheckedEl.textContent = '0';
            render();
            showToast('Grid has been reset!', 'info');
        } else if (msg.type === 'ERROR') {
            showToast(msg.message, 'danger');
        }
    };

    socket.onclose = () => {
        statusEl.textContent = 'Offline';
        statusEl.style.color = '#ff0055';
        setTimeout(initWS, 3000);
    };
}

function updateGridDimensions(cols, rows) {
    // We update the viewable columns/rows, but VIRTUAL_WIDTH stays 2000
    const oldCols = COLS;
    const oldRows = ROWS;
    
    // Update local state
    COLS = cols;
    ROWS = rows;
    
    document.documentElement.style.setProperty('--total-width', `${cols * CELL_SIZE}px`);
    document.documentElement.style.setProperty('--total-height', `${rows * CELL_SIZE}px`);
    
    inputCols.value = cols;
    inputRows.value = rows;
}

applyGridBtn.addEventListener('click', () => {
    const cols = parseInt(inputCols.value);
    const rows = parseInt(inputRows.value);
    if (cols > 0 && rows > 0 && cols * rows <= 1000000) {
        socket.send(JSON.stringify({ type: 'RESIZE', cols, rows }));
    } else {
        showToast('Invalid size (Max 1M)', 'warning');
    }
});

resetBtn.addEventListener('click', () => {
    if (confirm('Reset everything?')) {
        socket.send(JSON.stringify({ type: 'RESET' }));
    }
});

// 3. Bit Manipulation
function getBit(index) {
    const byteIndex = Math.floor(index / 8);
    const bitOffset = index % 8;
    return (checkboxState[byteIndex] >> bitOffset) & 1;
}

function setBit(index, value) {
    const byteIndex = Math.floor(index / 8);
    const bitOffset = index % 8;
    if (value) {
        checkboxState[byteIndex] |= (1 << bitOffset);
    } else {
        checkboxState[byteIndex] &= ~(1 << bitOffset);
    }
}

// 4. Rendering Logic (Virtualized)
function render() {
    requestAnimationFrame(() => {
        const scrollTop = gridContainer.scrollTop;
        const scrollLeft = gridContainer.scrollLeft;
        const viewportHeight = gridContainer.clientHeight;
        const viewportWidth = gridContainer.clientWidth;

        const startRow = Math.floor(scrollTop / CELL_SIZE);
        const endRow = Math.min(ROWS - 1, Math.ceil((scrollTop + viewportHeight) / CELL_SIZE));
        const startCol = Math.floor(scrollLeft / CELL_SIZE);
        const endCol = Math.min(COLS - 1, Math.ceil((scrollLeft + viewportWidth) / CELL_SIZE));

        coordsEl.textContent = `Pos: ${startCol}, ${startRow} | ID: ${startRow * COLS + startCol}`;

        visibleGrid.style.setProperty('--cols', endCol - startCol + 1);
        visibleGrid.style.setProperty('--rows', endRow - startRow + 1);
        visibleGrid.style.top = `${startRow * CELL_SIZE}px`;
        visibleGrid.style.left = `${startCol * CELL_SIZE}px`;

        visibleGrid.innerHTML = '';
        const fragment = document.createDocumentFragment();
        
        for (let r = startRow; r <= endRow; r++) {
            for (let c = startCol; c <= endCol; c++) {
                const index = r * COLS + c; // Use current columns
                const isChecked = getBit(index);
                const isOptimistic = optimisticUpdates.has(index);
                
                const div = document.createElement('div');
                div.className = `checkbox-item ${isChecked ? 'checked' : ''} ${isOptimistic ? 'optimistic' : ''}`;
                div.dataset.index = index;
                div.title = `ID: ${index}`; // Show ID on hover
                div.onclick = () => toggleCheckbox(index);
                fragment.appendChild(div);
            }
        }
        visibleGrid.appendChild(fragment);
    });
}

function toggleCheckbox(index) {
    if (!user) return;
    const currentValue = getBit(index);
    const newValue = currentValue ? 0 : 1;
    setBit(index, newValue);
    optimisticUpdates.add(index);
    updateSingleCheckbox(index, newValue, true);
    socket.send(JSON.stringify({ type: 'TOGGLE', index, value: newValue }));
}

function updateSingleCheckbox(index, value, isOptimistic = false) {
    const el = visibleGrid.querySelector(`[data-index="${index}"]`);
    if (el) {
        if (value) el.classList.add('checked');
        else el.classList.remove('checked');
        if (isOptimistic) el.classList.add('optimistic');
        else el.classList.remove('optimistic');
    }
}

function showToast(msg, type) {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = msg;
    document.getElementById('toast-container').appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

// Listeners
gridContainer.addEventListener('scroll', render);
window.addEventListener('resize', render);

// Init
checkAuth();
