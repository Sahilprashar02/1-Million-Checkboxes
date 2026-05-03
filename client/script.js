let COLS = 1000;
let ROWS = 1000;
const CELL_SIZE = 24; 
const BACKEND_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
    ? 'http://localhost:5000' 
    : window.location.origin;

const WS_URL = BACKEND_URL.replace(/^http/, 'ws');

let socket;
let checkboxState = new Uint8Array(125000); // 1,000,000 bits
let optimisticUpdates = new Map();

const scrollContainer = document.getElementById('scroll-container');
const gridContainer = document.getElementById('grid-container');
const visibleGrid = document.getElementById('visible-grid');
const totalCheckedEl = document.getElementById('total-checked');
const statusEl = document.getElementById('connection-status');
const coordsEl = document.getElementById('coords');
const resizeBtn = document.getElementById('resize-btn');
const resetBtn = document.getElementById('reset-btn');
const inputCols = document.getElementById('input-cols');
const inputRows = document.getElementById('input-rows');
const landingPage = document.getElementById('landing-page');
const appContainer = document.getElementById('app-container');
const loginLandingBtn = document.getElementById('login-landing-btn');
const logoutBtn = document.getElementById('logout-btn');
const userDisplayName = document.getElementById('user-display-name');

// --- Auth Handling ---

async function checkAuth() {
    try {
        const res = await fetch(`${BACKEND_URL}/auth/me`, { credentials: 'include' });
        const data = await res.json();
        if (data.user) {
            userDisplayName.textContent = data.user.displayName || data.user.username;
            landingPage.classList.add('hidden');
            appContainer.classList.remove('hidden');
            initWS();
        } else {
            landingPage.classList.remove('hidden');
            appContainer.classList.add('hidden');
        }
    } catch (err) {
        console.error('Auth check failed', err);
        landingPage.classList.remove('hidden');
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

// --- WebSocket Logic ---

function initWS() {
    socket = new WebSocket(WS_URL);

    socket.onopen = () => {
        statusEl.textContent = 'Online';
        statusEl.style.color = 'var(--cyan)';
    };

    socket.onmessage = (event) => {
        const msg = JSON.parse(event.data);
        
        if (msg.type === 'INIT') {
            const binaryString = atob(msg.data);
            const bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
                bytes[i] = binaryString.charCodeAt(i);
            }
            checkboxState = bytes;
            totalCheckedEl.textContent = msg.count;
            if (msg.config) {
                COLS = msg.config.cols;
                ROWS = msg.config.rows;
                inputCols.value = COLS;
                inputRows.value = ROWS;
                updateGridDimensions();
            }
            render();
        } else if (msg.type === 'UPDATE') {
            const { index, value } = msg.data;
            setBit(index, value);
            optimisticUpdates.delete(index);
            totalCheckedEl.textContent = msg.count;
            render();
        } else if (msg.type === 'RESIZE') {
            COLS = msg.cols;
            ROWS = msg.rows;
            inputCols.value = COLS;
            inputRows.value = ROWS;
            totalCheckedEl.textContent = msg.count;
            updateGridDimensions();
            render();
        } else if (msg.type === 'RESET') {
            checkboxState.fill(0);
            totalCheckedEl.textContent = '0';
            render();
            showToast('Grid has been reset!', 'info');
        } else if (msg.type === 'USER_COUNT') {
            const el = document.getElementById('online-users');
            if (el) el.textContent = msg.count;
        } else if (msg.type === 'ERROR') {
            showToast(msg.message, 'danger');
        }
    };

    socket.onclose = () => {
        statusEl.textContent = 'Offline';
        statusEl.style.color = 'var(--red)';
        setTimeout(initWS, 3000);
    };
}

// --- Grid Engine ---

function updateGridDimensions() {
    gridContainer.style.width = `${COLS * CELL_SIZE}px`;
    gridContainer.style.height = `${ROWS * CELL_SIZE}px`;
    
    // Update CSS variables for the visible grid
    document.documentElement.style.setProperty('--total-width', `${COLS * CELL_SIZE}px`);
    document.documentElement.style.setProperty('--total-height', `${ROWS * CELL_SIZE}px`);
}

function getBit(index) {
    const byteIndex = Math.floor(index / 8);
    const bitIndex = index % 8;
    return (checkboxState[byteIndex] & (1 << bitIndex)) !== 0;
}

function setBit(index, value) {
    const byteIndex = Math.floor(index / 8);
    const bitIndex = index % 8;
    if (value) {
        checkboxState[byteIndex] |= (1 << bitIndex);
    } else {
        checkboxState[byteIndex] &= ~(1 << bitIndex);
    }
}

function render() {
    const scrollTop = scrollContainer.scrollTop;
    const scrollLeft = scrollContainer.scrollLeft;
    const viewportHeight = scrollContainer.clientHeight;
    const viewportWidth = scrollContainer.clientWidth;

    const startRow = Math.floor(scrollTop / CELL_SIZE);
    const endRow = Math.min(ROWS - 1, Math.ceil((scrollTop + viewportHeight) / CELL_SIZE));
    const startCol = Math.floor(scrollLeft / CELL_SIZE);
    const endCol = Math.min(COLS - 1, Math.ceil((scrollLeft + viewportWidth) / CELL_SIZE));

    coordsEl.textContent = `Pos: ${startCol}, ${startRow} | ID: ${startRow * COLS + startCol}`;

    visibleGrid.style.setProperty('--cols', endCol - startCol + 1);
    visibleGrid.style.setProperty('--rows', endRow - startRow + 1);
    visibleGrid.style.top = `${startRow * CELL_SIZE}px`;
    visibleGrid.style.left = `${startCol * CELL_SIZE}px`;

    const fragment = document.createDocumentFragment();
    for (let r = startRow; r <= endRow; r++) {
        for (let c = startCol; c <= endCol; c++) {
            const index = r * COLS + c;
            const isChecked = getBit(index);
            const isOptimistic = optimisticUpdates.has(index);
            const displayChecked = isOptimistic ? optimisticUpdates.get(index) : isChecked;

            const cb = document.createElement('div');
            cb.className = `checkbox ${displayChecked ? 'checked' : ''} ${isOptimistic ? 'optimistic' : ''}`;
            cb.title = `ID: ${index}`;
            cb.onclick = () => toggleCheckbox(index, !displayChecked);
            fragment.appendChild(cb);
        }
    }

    visibleGrid.innerHTML = '';
    visibleGrid.appendChild(fragment);
}

function toggleCheckbox(index, value) {
    if (!socket || socket.readyState !== WebSocket.OPEN) return;
    
    optimisticUpdates.set(index, value);
    render();

    socket.send(JSON.stringify({
        type: 'TOGGLE',
        index,
        value
    }));
}

// --- Event Listeners ---

scrollContainer.onscroll = render;
window.onresize = render;

resizeBtn.onclick = () => {
    const cols = parseInt(inputCols.value);
    const rows = parseInt(inputRows.value);
    if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ type: 'RESIZE', cols, rows }));
    }
};

resetBtn.onclick = () => {
    if (confirm('Are you sure you want to reset the entire grid? This cannot be undone.')) {
        socket.send(JSON.stringify({ type: 'RESET' }));
    }
};

function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

// Start
checkAuth();
updateGridDimensions();
