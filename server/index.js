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
    }
});

const PORT = 5000;

// simple in-memory storage
let onlineUsers = new Map(); // socketId -> { ip, partnerId }
let queue = [];
let bannedIPs = new Set();

io.on('connection', (socket) => {
    const ip = socket.handshake.address;

    // Check if banned
    if (bannedIPs.has(ip)) {
        console.log(`Banned IP tried to connect: ${ip}`);
        socket.disconnect();
        return;
    }

    console.log(`User connected: ${socket.id} (${ip})`);
    onlineUsers.set(socket.id, { ip, partnerId: null });

    // Handle finding a partner
    socket.on('joinQueue', () => {
        // If already in a call, disconnect from partner
        disconnectFromPartner(socket.id);

        if (!queue.includes(socket.id)) {
            queue.push(socket.id);
        }
        matchUsers();
    });

    socket.on('signal', (data) => {
        const { to, signal } = data;
        io.to(to).emit('signal', { from: socket.id, signal });
    });

    socket.on('sendMessage', (data) => {
        const user = onlineUsers.get(socket.id);
        if (user && user.partnerId) {
            io.to(user.partnerId).emit('message', {
                from: socket.id,
                text: data.text
            });
        }
    });

    socket.on('next', () => {
        disconnectFromPartner(socket.id);
        queue.push(socket.id);
        matchUsers();
    });

    // Admin Events
    socket.on('admin_login', (password) => {
        if (password === 'admin123') {
            socket.join('admins');
            socket.emit('admin_auth_success');
        }
    });

    socket.on('admin_ban_user', (targetSocketId) => {
        const targetUser = onlineUsers.get(targetSocketId);
        if (targetUser) {
            bannedIPs.add(targetUser.ip);
            const socketToDisconnect = io.sockets.sockets.get(targetSocketId);
            if (socketToDisconnect) {
                socketToDisconnect.disconnect();
            }
            console.log(`IP ${targetUser.ip} banned by admin.`);
        }
    });

    socket.on('disconnect', () => {
        disconnectFromPartner(socket.id);
        onlineUsers.delete(socket.id);
        queue = queue.filter(id => id !== socket.id);
        console.log(`User disconnected: ${socket.id}`);
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
    // Remove from queue if they were in it
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

            // user1 is the initiator
            io.to(user1Id).emit('matchFound', { partnerId: user2Id, initiator: true });
            io.to(user2Id).emit('matchFound', { partnerId: user1Id, initiator: false });
        }
    }
}

// Stats Update every 5 seconds
setInterval(() => {
    const stats = {
        onlineCount: onlineUsers.size,
        users: Array.from(onlineUsers.entries()).map(([id, data]) => ({
            id,
            ip: data.ip
        }))
    };
    io.to('admins').emit('statsUpdate', stats);
}, 5000);

server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
