const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
  pingTimeout: 60000,
  pingInterval: 25000,
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// A simple Map to track connected devices and their pair codes
// Map<socketId, { deviceId, deviceName, pairCode }>
const users = new Map();
// Map<pairCode, socketId> to quickly find a user by their code
const pairCodes = new Map();

function generatePairCode() {
  let code;
  do {
    code = Math.floor(1000 + Math.random() * 9000).toString();
  } while (pairCodes.has(code));
  return code;
}

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // Generate and assign a pairing code
  const code = generatePairCode();
  users.set(socket.id, { pairCode: code });
  pairCodes.set(code, socket.id);

  socket.emit('pair-code', code);

  socket.on('request-pair', ({ code: targetCode, deviceId, deviceName }) => {
    console.log(`Socket ${socket.id} requesting pair with ${targetCode}`);
    const targetSocketId = pairCodes.get(targetCode);
    
    if (targetSocketId && targetSocketId !== socket.id) {
      // Notify the target that someone wants to pair
      io.to(targetSocketId).emit('incoming-pair', {
        from: socket.id,
        deviceId,
        deviceName
      });
      // Acknowledge to the sender
      socket.emit('pair-pending');
    } else {
      socket.emit('pair-error', 'Invalid pair code or device unavailable');
    }
  });
  
  socket.on('accept-pair', ({ to, deviceId, deviceName }) => {
    console.log(`Socket ${socket.id} accepted pair with ${to}`);
    // Let the requester know pairing is accepted and give them the target's info
    io.to(to).emit('pair-accepted', {
      from: socket.id,
      deviceId,
      deviceName
    });
  });

  socket.on('request-reconnect', ({ targetDeviceId, deviceId, deviceName }) => {
    console.log(`Socket ${socket.id} requesting reconnect to ${targetDeviceId}`);
    let targetSocketId = null;
    for (const [id, data] of users.entries()) {
      if (data.deviceId === targetDeviceId) {
        targetSocketId = id;
        break;
      }
    }
    
    if (targetSocketId && targetSocketId !== socket.id) {
      io.to(targetSocketId).emit('incoming-pair', {
        from: socket.id,
        deviceId,
        deviceName
      });
      socket.emit('pair-pending');
    } else {
      socket.emit('pair-error', 'Device is offline or unavailable.');
    }
  });

  // WebRTC Signaling
  socket.on('webrtc-offer', ({ to, offer }) => {
    io.to(to).emit('webrtc-offer', { from: socket.id, offer });
  });

  socket.on('webrtc-answer', ({ to, answer }) => {
    io.to(to).emit('webrtc-answer', { from: socket.id, answer });
  });

  socket.on('webrtc-ice-candidate', ({ to, candidate }) => {
    io.to(to).emit('webrtc-ice-candidate', { from: socket.id, candidate });
  });
  
  // Directly connect to a trusted device if both are online
  socket.on('check-trusted-device', ({ targetDeviceId }, callback) => {
    // Find if the target device is currently online
    // Normally we'd use device IDs linked to socket IDs.
    // Let's augment users map when they provide their device ID.
    // For simplicity, we can broadcast or use a map of deviceId -> socketId
    let foundSocketId = null;
    for (const [id, data] of users.entries()) {
      if (data.deviceId === targetDeviceId) {
        foundSocketId = id;
        break;
      }
    }
    
    if (foundSocketId) {
      callback({ online: true, socketId: foundSocketId });
    } else {
      callback({ online: false });
    }
  });

  socket.on('register-device', ({ deviceId, deviceName }) => {
    const data = users.get(socket.id);
    if (data) {
      data.deviceId = deviceId;
      data.deviceName = deviceName;
      users.set(socket.id, data);
    }
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    const data = users.get(socket.id);
    if (data && data.pairCode) {
      pairCodes.delete(data.pairCode);
    }
    users.delete(socket.id);
    // Could notify paired users, but WebRTC data channel close will handle it.
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Signaling server listening on port ${PORT}`);
});
