const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const session = require('express-session');
const passport = require('passport');
const cors = require('cors');
const dotenv = require('dotenv');
const { 
    sub, 
    UPDATE_CHANNEL,
    CONFIG_CHANNEL,
    getFullState, 
    setCheckboxState,
    getCheckedCount,
    getGridConfig,
    setGridConfig,
    resetGrid
} = require('./services/redisService');
const { isRateLimited } = require('./middleware/rateLimiter');

dotenv.config();

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ noServer: true });

const sessionMiddleware = session({
    secret: process.env.SESSION_SECRET || 'keyboard cat',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: false, // Disabled for local development
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000 
    }
});

app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:3000', credentials: true }));
app.use(express.json());
app.use(sessionMiddleware);
app.use(passport.initialize());
app.use(passport.session());

require('./config/passport')(passport);
app.use('/auth', require('./routes/auth'));

wss.on('connection', async (ws, request) => {
    const user = request.session && request.session.passport && request.session.passport.user;
    const isAuthenticated = !!user;

    try {
        const config = await getGridConfig();
        const fullState = await getFullState();
        const count = await getCheckedCount();
        
        ws.send(JSON.stringify({ 
            type: 'INIT', 
            data: fullState.toString('base64'),
            count: count,
            config: config
        }));
    } catch (err) {
        console.error('Error sending initial state:', err);
    }

    ws.on('message', async (message) => {
        try {
            const payload = JSON.parse(message);
            if (payload.type === 'TOGGLE') {
                if (!isAuthenticated) return;
                const { index, value } = payload;
                
                const limitKey = `rl:ws:${user.id}`;
                if (await isRateLimited(limitKey, 10, 1)) {
                    return ws.send(JSON.stringify({ type: 'ERROR', message: 'Rate limit exceeded' }));
                }

                await setCheckboxState(index, value ? 1 : 0);
            } else if (payload.type === 'RESIZE') {
                if (!isAuthenticated) return;
                const { cols, rows } = payload;
                if (cols > 0 && rows > 0 && cols * rows <= 1000000) {
                    await setGridConfig(cols, rows);
                }
            } else if (payload.type === 'RESET') {
                if (!isAuthenticated) return;
                await resetGrid();
            }
        } catch (err) {
            console.error('WS Message error:', err);
        }
    });
});

server.on('upgrade', (request, socket, head) => {
    sessionMiddleware(request, {}, () => {
        wss.handleUpgrade(request, socket, head, (ws) => {
            wss.emit('connection', ws, request);
        });
    });
});

sub.subscribe(UPDATE_CHANNEL, CONFIG_CHANNEL);
sub.on('message', async (channel, message) => {
    if (channel === UPDATE_CHANNEL) {
        const update = JSON.parse(message);
        let broadcastMsg;
        if (update.type === 'RESET') {
            broadcastMsg = JSON.stringify({ type: 'RESET', count: 0 });
        } else {
            const count = await getCheckedCount();
            broadcastMsg = JSON.stringify({ type: 'UPDATE', data: update, count: count });
        }
        wss.clients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN) client.send(broadcastMsg);
        });
    } else if (channel === CONFIG_CHANNEL) {
        const config = JSON.parse(message);
        wss.clients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN) client.send(JSON.stringify(config));
        });
    }
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
