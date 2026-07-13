import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, MonitorSmartphone, Plus, Save, Send, Smartphone, X, File, Folder, HardDrive, Share2, Type } from 'lucide-react';
import { getMyDevice, getTrustedDevices, addTrustedDevice, removeTrustedDevice } from './lib/storage';
import { WebRTCManager } from './lib/webrtc';
import Landing from './components/Landing';
import ActiveConnection from './components/ActiveConnection';

function App() {
  const [myDevice, setMyDevice] = useState(null);
  const [trustedDevices, setTrustedDevices] = useState([]);
  const [webrtc, setWebrtc] = useState(null);
  
  // Connection State
  const [status, setStatus] = useState('disconnected'); // disconnected, connecting, connected, ready
  const [pairCode, setPairCode] = useState(null);
  const [connectedDevice, setConnectedDevice] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');

  // Transfer State
  const [transfers, setTransfers] = useState([]); // { id, name, progress, speed, type: 'send'|'receive', status: 'transferring'|'completed' }
  const [receivedFiles, setReceivedFiles] = useState([]);
  const [textMessages, setTextMessages] = useState([]);
  const [showSavePrompt, setShowSavePrompt] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState(null);

  useEffect(() => {
    async function init() {
      const me = await getMyDevice();
      setMyDevice(me);
      const trusted = await getTrustedDevices();
      setTrustedDevices(trusted);
    }
    init();
  }, []);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setDeferredPrompt(null);
      }
    }
  };

  const handleStatusChange = useCallback((newStatus, info) => {
    setStatus(newStatus);
    if (newStatus === 'connected' && info) {
      setConnectedDevice(info);
      // Check if trusted, if not prompt
      getTrustedDevices().then(devices => {
        if (!devices.find(d => d.id === info.id)) {
          setShowSavePrompt(true);
        }
      });
    } else if (newStatus === 'disconnected') {
      setConnectedDevice(null);
      setShowSavePrompt(false);
      setTransfers([]);
      setTextMessages([]);
    } else if (newStatus === 'error') {
      setErrorMessage(info);
      setTimeout(() => setErrorMessage(''), 3000);
      setStatus('disconnected');
    }
  }, []);

  const handleFileStart = useCallback((fileInfo) => {
    setTransfers(prev => {
      if (prev.find(t => t.id === fileInfo.id)) return prev;
      return [...prev, {
        id: fileInfo.id,
        name: fileInfo.name,
        progress: 0,
        speed: 0,
        type: 'receive',
        status: 'transferring'
      }];
    });
  }, []);

  const handleFileProgress = useCallback((id, progress, speed) => {
    setTransfers(prev => {
      const idx = prev.findIndex(t => t.id === id);
      if (idx !== -1) {
        const newTransfers = [...prev];
        newTransfers[idx] = { ...newTransfers[idx], progress, speed };
        return newTransfers;
      }
      return prev; // We'll add it initially when file-start happens
    });
  }, []);

  const handleFileComplete = useCallback((fileInfo, blob) => {
    setTransfers(prev => {
      return prev.map(t => t.id === fileInfo.id ? { ...t, progress: 100, status: 'completed' } : t);
    });

    const url = URL.createObjectURL(blob);
    setReceivedFiles(prev => [...prev, { ...fileInfo, url }]);
    
    // Auto download (optional, but requested for smooth experience)
    const a = document.createElement('a');
    a.href = url;
    a.download = fileInfo.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }, []);

  const handleTextMessage = useCallback((text) => {
    setTextMessages(prev => [...prev, { id: Date.now(), text, type: 'received' }]);
  }, []);

  const handlePairCode = useCallback((code) => {
    setPairCode(code);
  }, []);

  useEffect(() => {
    if (!webrtc) {
      const rtc = new WebRTCManager(
        handleStatusChange,
        handleFileProgress,
        handleFileComplete,
        handleTextMessage,
        handlePairCode,
        handleFileStart
      );
      setWebrtc(rtc);
    }
    return () => {
      if (webrtc) webrtc.disconnect();
    };
  }, []); // Run once on mount

  useEffect(() => {
    if (webrtc && myDevice) {
      webrtc.registerDevice(myDevice);
    }
  }, [webrtc, myDevice]);

  const connectToDevice = (code) => {
    if (webrtc && myDevice) {
      webrtc.requestPair(code, myDevice);
    }
  };

  const handleReconnect = (targetId) => {
    if (webrtc && myDevice) {
      webrtc.requestReconnect(targetId, myDevice);
    }
  };

  const handleFilesDrop = (files) => {
    if (!webrtc || status !== 'ready') return;
    files.forEach(file => {
      const transferId = Math.random().toString(36).substring(7); // approximate, server side assigns true ID later in our simplified flow, actually let's generate it here
      // Real implementation would manage queue state.
      webrtc.enqueueFile(file, transferId);
      setTransfers(prev => [...prev, {
        id: transferId, // Placeholder until progress updates it
        name: file.name,
        progress: 0,
        speed: 0,
        type: 'send',
        status: 'transferring'
      }]);
    });
  };

  const handleSaveDevice = async (customName) => {
    if (connectedDevice) {
      const updated = await addTrustedDevice({
        id: connectedDevice.id,
        name: customName || connectedDevice.name,
      });
      setTrustedDevices(updated);
      setShowSavePrompt(false);
    }
  };

  const handleDeleteDevice = async (id) => {
    const updated = await removeTrustedDevice(id);
    setTrustedDevices(updated);
  };

  const sendTextMessage = (text) => {
    if (webrtc && text.trim()) {
      webrtc.sendText(text);
      setTextMessages(prev => [...prev, { id: Date.now(), text, type: 'sent' }]);
    }
  };

  const disconnect = () => {
    if (webrtc) {
      webrtc.disconnect();
      setWebrtc(null);
      // Re-init
      setTimeout(() => {
        const rtc = new WebRTCManager(
          handleStatusChange, handleFileProgress, handleFileComplete, handleTextMessage, handlePairCode, handleFileStart
        );
        setWebrtc(rtc);
      }, 100);
    }
    setStatus('disconnected');
    setConnectedDevice(null);
    setPairCode(null);
  };

  if (!myDevice) return <div className="flex items-center justify-center h-[100dvh]">Loading...</div>;

  return (
    <div className="h-[100dvh] w-full bg-offWhite text-charcoal font-sans selection:bg-dustyPink selection:text-white flex flex-col relative overflow-hidden fixed inset-0">
      
      {/* Toast Notification for Errors */}
      <AnimatePresence>
        {errorMessage && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="absolute top-4 left-1/2 transform -translate-x-1/2 z-50 bg-red-500 text-white px-4 py-2 rounded-2xl shadow-float flex items-center gap-2"
          >
            <span>{errorMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <main className="flex-grow flex flex-col w-full max-w-6xl mx-auto p-4 md:p-8">
        <header className="flex justify-between items-center py-4 mb-8">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-charcoal rounded-2xl flex items-center justify-center shadow-soft">
              <Share2 className="text-white w-5 h-5" />
            </div>
            <h1 className="text-2xl font-semibold tracking-tight">Glide</h1>
          </div>
          <div className="flex items-center gap-4">
            {deferredPrompt && (
              <button
                onClick={handleInstallClick}
                className="text-sm font-medium bg-dustyPink text-white px-4 py-2 rounded-xl hover:bg-opacity-90 transition-colors shadow-soft"
              >
                Install App
              </button>
            )}
            {status !== 'disconnected' && status !== 'connecting' && (
              <button 
                onClick={disconnect}
                className="text-sm font-medium text-warmGray hover:text-charcoal transition-colors px-4 py-2 rounded-full hover:bg-lightGray"
              >
                Disconnect
              </button>
            )}
          </div>
        </header>

        <AnimatePresence mode="wait">
          {status === 'disconnected' || status === 'connecting' || status === 'error' ? (
            <motion.div
              key="landing"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex-grow flex"
            >
              <Landing 
                pairCode={pairCode} 
                status={status} 
                onConnect={connectToDevice}
                trustedDevices={trustedDevices}
                onReconnect={handleReconnect}
                onDeleteDevice={handleDeleteDevice}
              />
            </motion.div>
          ) : (
            <motion.div
              key="active"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="flex-grow flex flex-col h-full"
            >
              <ActiveConnection 
                device={connectedDevice}
                onFilesDrop={handleFilesDrop}
                status={status}
                transfers={transfers}
                receivedFiles={receivedFiles}
                textMessages={textMessages}
                onSendText={sendTextMessage}
                showSavePrompt={showSavePrompt}
                onSaveDevice={handleSaveDevice}
                onDismissSave={() => setShowSavePrompt(false)}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}

export default App;
