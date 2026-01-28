const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    },
    pingTimeout: 60000,
    pingInterval: 25000
});

const PORT = process.env.PORT || 5000;

// simple in-memory storage
let onlineUsers = new Map(); // socketId -> { ip, partnerId }
let queue = [];
let bannedIPs = new Set();

io.on('connection', (socket) => {
    const ip = socket.handshake.headers['x-forwarded-for'] || socket.handshake.address;

    if (bannedIPs.has(ip)) {
        socket.disconnect();
        return;
    }

    onlineUsers.set(socket.id, { ip, partnerId: null });

    socket.on('next', () => {
        disconnectFromPartner(socket.id);
        if (!queue.includes(socket.id)) {
            queue.push(socket.id);
        }
        matchUsers();
    });

    socket.on('signal', (data) => {
        const { to, signal } = data;
        if (onlineUsers.has(to)) {
            io.to(to).emit('signal', { from: socket.id, signal });
        }
    });

    socket.on('sendMessage', (data) => {
        const user = onlineUsers.get(socket.id);
        if (user && user.partnerId) {
            io.to(user.partnerId).emit('message', {
                from: 'Stranger',
                text: data.text
            });
        }
    });

    socket.on('disconnect', () => {
        disconnectFromPartner(socket.id);
        onlineUsers.delete(socket.id);
        queue = queue.filter(id => id !== socket.id);
    });

    // Admin Events
    socket.on('admin_login', (password) => {
        if (password === 'admin123') {
            socket.join('admins');
            socket.emit('admin_auth_success');
        }
    });
});

function disconnectFromPartner(socketId) {
    const user = onlineUsers.get(socketId);
    if (user && user.partnerId) {
        const partnerId = user.partnerId;
        const partner = onlineUsers.get(partnerId);

        if (partner) {
            partner.partnerId = null;
            io.to(partnerId).emit('partnerDisconnected');
        }
        user.partnerId = null;
    }
    queue = queue.filter(id => id !== socketId);
}

function matchUsers() {
    while (queue.length >= 2) {
        const user1Id = queue.shift();
        const user2Id = queue.shift();

        const user1 = onlineUsers.get(user1Id);
        const user2 = onlineUsers.get(user2Id);

        if (user1 && user2) {
            user1.partnerId = user2Id;
            user2.partnerId = user1Id;

            io.to(user1Id).emit('matchFound', { partnerId: user2Id, initiator: true });
            io.to(user2Id).emit('matchFound', { partnerId: user1Id, initiator: false });
        } else {
            if (user1) queue.push(user1Id);
            if (user2) queue.push(user2Id);
        }
    }
}

setInterval(() => {
    const stats = {
        onlineCount: onlineUsers.size,
        users: Array.from(onlineUsers.entries()).map(([id, data]) => ({ id, ip: data.ip }))
    };
    io.to('admins').emit('statsUpdate', stats);
}, 5000);

server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
