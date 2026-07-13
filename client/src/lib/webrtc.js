import { io } from 'socket.io-client';

const CHUNK_SIZE = 64 * 1024; // 64 KB chunks

export class WebRTCManager {
  constructor(onStatusChange, onFileProgress, onFileComplete, onTextMessage, onPairCode, onFileStart) {
    const serverUrl = import.meta.env.VITE_SERVER_URL || (window.location.origin === 'http://localhost:5173' ? 'http://localhost:3001' : '/');
    this.socket = io(serverUrl);
    this.peerConnection = null;
    this.dataChannel = null;
    
    // Callbacks
    this.onStatusChange = onStatusChange; // (status, info)
    this.onFileProgress = onFileProgress; // (fileId, progress, speed)
    this.onFileComplete = onFileComplete; // (fileId, blob/fileInfo)
    this.onTextMessage = onTextMessage;   // (text)
    this.onPairCode = onPairCode;         // (code)
    this.onFileStart = onFileStart;       // (fileInfo)

    // File Receiving State
    this.receiveBuffer = [];
    this.receivedSize = 0;
    this.receivingFile = null;

    // File Sending Queue
    this.sendQueue = [];
    this.isSending = false;

    this.setupSocket();
  }

  setupSocket() {
    this.socket.on('connect_error', (err) => {
      this.onStatusChange('error', 'Unable to connect to the backend server.');
    });

    this.socket.on('pair-code', (code) => {
      this.onPairCode(code);
    });

    this.socket.on('incoming-pair', ({ from, deviceId, deviceName }) => {
      // Automatically accept for this simple app
      const myId = this.myDevice ? this.myDevice.id : 'unknown';
      const myName = this.myDevice ? this.myDevice.name : 'Unknown Device';
      
      this.socket.emit('accept-pair', { to: from, deviceId: myId, deviceName: myName });
      this.onStatusChange('connected', { id: deviceId, name: deviceName, socketId: from });
      this.initiateWebRTC(from);
    });

    this.socket.on('pair-accepted', ({ from, deviceId, deviceName }) => {
      this.onStatusChange('connected', { id: deviceId, name: deviceName, socketId: from });
      // The one who accepted is the one we connect to. 
      // The requester will wait for the offer.
    });

    this.socket.on('pair-error', (err) => {
      this.onStatusChange('error', err);
    });

    this.socket.on('webrtc-offer', async ({ from, offer }) => {
      if (!this.peerConnection) this.createPeerConnection(from);
      await this.peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await this.peerConnection.createAnswer();
      await this.peerConnection.setLocalDescription(answer);
      this.socket.emit('webrtc-answer', { to: from, answer });
    });

    this.socket.on('webrtc-answer', async ({ from, answer }) => {
      if (this.peerConnection) {
        await this.peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
      }
    });

    this.socket.on('webrtc-ice-candidate', async ({ from, candidate }) => {
      if (this.peerConnection) {
        try {
          await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (e) {
          console.error('Error adding received ice candidate', e);
        }
      }
    });
  }

  requestPair(code, myDevice) {
    this.socket.emit('request-pair', { 
      code, 
      deviceId: myDevice.id, 
      deviceName: myDevice.name 
    });
    this.onStatusChange('connecting');
  }

  requestReconnect(targetDeviceId, myDevice) {
    this.socket.emit('request-reconnect', {
      targetDeviceId,
      deviceId: myDevice.id,
      deviceName: myDevice.name
    });
    this.onStatusChange('connecting');
  }

  registerDevice(myDevice) {
    this.myDevice = myDevice;
    this.socket.emit('register-device', {
      deviceId: myDevice.id,
      deviceName: myDevice.name
    });
  }

  createPeerConnection(targetSocketId) {
    this.peerConnection = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
      ]
    });

    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        this.socket.emit('webrtc-ice-candidate', { to: targetSocketId, candidate: event.candidate });
      }
    };

    this.peerConnection.ondatachannel = (event) => {
      this.setupDataChannel(event.channel);
    };

    this.peerConnection.onconnectionstatechange = () => {
      if (this.peerConnection.connectionState === 'disconnected' || 
          this.peerConnection.connectionState === 'failed') {
        this.onStatusChange('disconnected');
      }
    };
  }

  initiateWebRTC(targetSocketId) {
    this.createPeerConnection(targetSocketId);
    
    // Create Data Channel
    this.dataChannel = this.peerConnection.createDataChannel('transfer', {
      ordered: true
    });
    this.setupDataChannel(this.dataChannel);

    this.peerConnection.createOffer().then(offer => {
      return this.peerConnection.setLocalDescription(offer);
    }).then(() => {
      this.socket.emit('webrtc-offer', { to: targetSocketId, offer: this.peerConnection.localDescription });
    }).catch(e => console.error(e));
  }

  setupDataChannel(channel) {
    this.dataChannel = channel;
    this.dataChannel.binaryType = 'arraybuffer';

    this.dataChannel.onopen = () => {
      this.onStatusChange('ready');
    };

    this.dataChannel.onmessage = (event) => {
      if (typeof event.data === 'string') {
        const msg = JSON.parse(event.data);
        if (msg.type === 'text') {
          this.onTextMessage(msg.content);
        } else if (msg.type === 'file-start') {
          this.receivingFile = msg.file;
          this.receiveBuffer = [];
          this.receivedSize = 0;
          if (this.onFileStart) {
            this.onFileStart(this.receivingFile);
          }
        } else if (msg.type === 'file-end') {
          const blob = new Blob(this.receiveBuffer, { type: this.receivingFile.type });
          this.onFileComplete(this.receivingFile, blob);
          this.receivingFile = null;
          this.receiveBuffer = [];
        } else if (msg.type === 'cancel-transfer') {
            this.receivingFile = null;
            this.receiveBuffer = [];
            this.onStatusChange('transfer-cancelled');
        }
      } else {
        // Binary Data (File Chunk)
        this.receiveBuffer.push(event.data);
        this.receivedSize += event.data.byteLength;
        if (this.receivingFile) {
          const progress = (this.receivedSize / this.receivingFile.size) * 100;
          this.onFileProgress(this.receivingFile.id, progress, 0); // speed calculation can be added
        }
      }
    };

    this.dataChannel.onclose = () => {
      this.onStatusChange('disconnected');
    };
  }

  sendText(text) {
    if (this.dataChannel && this.dataChannel.readyState === 'open') {
      this.dataChannel.send(JSON.stringify({ type: 'text', content: text }));
    }
  }

  enqueueFile(file, id) {
    this.sendQueue.push({ file, id });
    if (!this.isSending) {
      this.processQueue();
    }
  }

  async processQueue() {
    if (this.sendQueue.length === 0) {
      this.isSending = false;
      return;
    }

    this.isSending = true;
    const { file, id } = this.sendQueue.shift();
    
    // Announce file start
    const fileMeta = {
      id: id,
      name: file.name,
      size: file.size,
      type: file.type
    };
    
    this.dataChannel.send(JSON.stringify({ type: 'file-start', file: fileMeta }));

    let offset = 0;
    const fileReader = new FileReader();

    const readSlice = (o) => {
      const slice = file.slice(offset, o + CHUNK_SIZE);
      fileReader.readAsArrayBuffer(slice);
    };

    let startTime = performance.now();
    let lastBytes = 0;

    fileReader.onload = (e) => {
      this.dataChannel.send(e.target.result);
      offset += e.target.result.byteLength;
      
      const now = performance.now();
      const dt = (now - startTime) / 1000;
      let speed = 0;
      if (dt > 0.5) {
          speed = (offset - lastBytes) / dt; // bytes per second
          startTime = now;
          lastBytes = offset;
      }

      this.onFileProgress(fileMeta.id, (offset / file.size) * 100, speed);

      if (offset < file.size) {
        // To prevent freezing and buffer overflow
        if (this.dataChannel.bufferedAmount > CHUNK_SIZE * 64) {
          setTimeout(() => readSlice(offset), 10);
        } else {
          readSlice(offset);
        }
      } else {
        this.dataChannel.send(JSON.stringify({ type: 'file-end' }));
        this.processQueue();
      }
    };

    readSlice(0);
  }

  disconnect() {
    if (this.dataChannel) this.dataChannel.close();
    if (this.peerConnection) this.peerConnection.close();
    this.socket.disconnect();
  }
}
