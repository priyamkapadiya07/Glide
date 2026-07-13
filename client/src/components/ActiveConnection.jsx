import { useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { UploadCloud, File, Folder, Download, CheckCircle, X, Send, HardDrive } from 'lucide-react';

export default function ActiveConnection({ 
  device, 
  onFilesDrop, 
  status, 
  transfers, 
  receivedFiles,
  textMessages,
  onSendText,
  showSavePrompt,
  onSaveDevice,
  onDismissSave
}) {
  const [isDragging, setIsDragging] = useState(false);
  const [textInput, setTextInput] = useState('');
  const fileInputRef = useRef(null);
  const messagesEndRef = useRef(null);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onFilesDrop(Array.from(e.dataTransfer.files));
    }
  }, [onFilesDrop]);

  const handleFileSelect = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      onFilesDrop(Array.from(e.target.files));
    }
  };

  const handleTextSubmit = (e) => {
    e.preventDefault();
    if (textInput.trim()) {
      onSendText(textInput);
      setTextInput('');
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }
  };

  const formatSize = (bytes) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="flex-1 flex flex-col h-full gap-6">
      
      {/* Save Device Prompt */}
      <AnimatePresence>
        {showSavePrompt && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-white rounded-2xl p-4 shadow-soft flex items-center justify-between border border-dustyPink/20"
          >
            <div className="flex items-center gap-3">
              <div className="bg-softBlush p-2 rounded-full text-dustyPink">
                <HardDrive className="w-5 h-5" />
              </div>
              <div>
                <p className="font-medium text-charcoal">Save {device?.name}?</p>
                <p className="text-xs text-warmGray">Remember this device for 1-click reconnects later.</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={onDismissSave} className="px-4 py-2 text-sm text-warmGray hover:bg-lightGray rounded-xl transition-colors">
                Not now
              </button>
              <button onClick={onSaveDevice} className="px-4 py-2 text-sm bg-charcoal text-white rounded-xl hover:bg-black transition-colors">
                Save Device
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex-1 flex flex-col lg:flex-row gap-6 min-h-0">
        
        {/* Left Column: Drag & Drop Zone and Transfers */}
        <div className="flex-1 flex flex-col gap-6 min-h-0">
          
          {/* Dropzone */}
          <div 
            className={`relative rounded-[2rem] border-2 border-dashed transition-all duration-300 flex flex-col items-center justify-center p-8 text-center overflow-hidden h-64 shrink-0
              ${isDragging ? 'border-dustyPink bg-softBlush/50 scale-[1.02]' : 'border-lightGray bg-white hover:border-warmGray/50'}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <AnimatePresence>
              {isDragging && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 bg-white/40 backdrop-blur-sm z-10 flex flex-col items-center justify-center"
                >
                  <UploadCloud className="w-16 h-16 text-dustyPink mb-4" />
                  <p className="text-2xl font-medium text-charcoal">Drop to Send</p>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="bg-offWhite w-16 h-16 rounded-full flex items-center justify-center mb-4">
              <File className="w-8 h-8 text-warmGray" />
            </div>
            <h3 className="text-xl font-medium text-charcoal mb-2">Drag & Drop files here</h3>
            <p className="text-sm text-warmGray mb-6">or select files from your device</p>
            
            <div className="flex gap-4">
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="bg-charcoal text-white px-6 py-3 rounded-xl font-medium hover:bg-black transition-colors shadow-soft"
              >
                Select Files
              </button>
              <input 
                type="file" 
                multiple 
                className="hidden" 
                ref={fileInputRef}
                onChange={handleFileSelect}
              />
            </div>
          </div>

          {/* Transfers Queue */}
          <div className="flex-1 bg-white rounded-[2rem] p-6 shadow-soft flex flex-col min-h-0">
            <h3 className="font-medium text-charcoal mb-4 flex items-center justify-between">
              <span>Transfers</span>
              <span className="text-xs bg-lightGray px-2 py-1 rounded-full text-warmGray">
                {transfers.length} items
              </span>
            </h3>
            
            <div className="flex-1 overflow-y-auto pr-2 space-y-3 custom-scrollbar">
              {transfers.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-warmGray opacity-50">
                  <File className="w-10 h-10 mb-2" />
                  <p className="text-sm">No active transfers</p>
                </div>
              ) : (
                transfers.map(transfer => (
                  <div key={transfer.id} className="bg-offWhite rounded-2xl p-4 flex flex-col gap-2 relative overflow-hidden group">
                    <div className="flex justify-between items-start z-10 relative">
                      <div className="flex items-center gap-3 overflow-hidden">
                        <div className="bg-white p-2 rounded-xl shrink-0">
                          {transfer.status === 'completed' ? (
                            <CheckCircle className="w-5 h-5 text-green-500" />
                          ) : transfer.type === 'send' ? (
                            <UploadCloud className="w-5 h-5 text-dustyPink" />
                          ) : (
                            <Download className="w-5 h-5 text-dustyPink" />
                          )}
                        </div>
                        <div className="truncate pr-4">
                          <p className="font-medium text-charcoal text-sm truncate">{transfer.name}</p>
                          <p className="text-xs text-warmGray">
                            {transfer.status === 'completed' ? 'Completed' : 
                             `${Math.round(transfer.progress)}% • ${formatSize(transfer.speed)}/s`}
                          </p>
                        </div>
                      </div>
                      
                      {transfer.status !== 'completed' && (
                        <button className="text-warmGray hover:text-red-500 transition-colors p-1 rounded-full hover:bg-lightGray shrink-0">
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                    
                    {/* Progress Bar */}
                    <div className="h-1.5 w-full bg-lightGray rounded-full overflow-hidden z-10 relative">
                      <motion.div 
                        className={`h-full ${transfer.status === 'completed' ? 'bg-green-500' : 'bg-charcoal'}`}
                        initial={{ width: 0 }}
                        animate={{ width: `${transfer.progress}%` }}
                        transition={{ ease: "linear", duration: 0.2 }}
                      />
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Text Sharing & Received Files */}
        <div className="w-full lg:w-80 flex flex-col gap-6 shrink-0 min-h-[400px]">
          
          {/* Text Sharing */}
          <div className="bg-white rounded-[2rem] p-4 flex flex-col shadow-soft h-1/2">
            <h3 className="font-medium text-charcoal mb-4 px-2">Text Share</h3>
            <div className="flex-1 overflow-y-auto px-2 space-y-4 mb-4 custom-scrollbar">
              {textMessages.length === 0 ? (
                <div className="h-full flex items-center justify-center text-warmGray text-sm opacity-50">
                  Send text instantly
                </div>
              ) : (
                textMessages.map(msg => (
                  <div key={msg.id} className={`flex flex-col max-w-[85%] ${msg.type === 'sent' ? 'ml-auto' : 'mr-auto'}`}>
                    <div className={`p-3 rounded-2xl text-sm ${msg.type === 'sent' ? 'bg-charcoal text-white rounded-br-sm' : 'bg-offWhite text-charcoal border border-lightGray rounded-bl-sm'}`}>
                      {msg.text}
                    </div>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>
            <form onSubmit={handleTextSubmit} className="flex gap-2">
              <input 
                type="text" 
                value={textInput}
                onChange={e => setTextInput(e.target.value)}
                placeholder="Type a message..."
                className="flex-1 bg-offWhite border border-lightGray rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-warmGray"
              />
              <button 
                type="submit"
                disabled={!textInput.trim()}
                className="bg-charcoal text-white p-2 rounded-xl disabled:opacity-50 hover:bg-black transition-colors"
              >
                <Send className="w-5 h-5" />
              </button>
            </form>
          </div>

          {/* Received Files Quick Access */}
          <div className="bg-white rounded-[2rem] p-6 flex flex-col shadow-soft h-1/2">
             <h3 className="font-medium text-charcoal mb-4">Received Files</h3>
             <div className="flex-1 overflow-y-auto space-y-2 custom-scrollbar pr-2">
                {receivedFiles.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-warmGray text-sm opacity-50">
                    No files received yet
                  </div>
                ) : (
                  receivedFiles.map(file => (
                    <a 
                      key={file.id} 
                      href={file.url} 
                      download={file.name}
                      className="flex items-center gap-3 p-3 rounded-xl hover:bg-offWhite transition-colors group"
                    >
                      <div className="bg-lightGray p-2 rounded-lg text-charcoal">
                        <File className="w-4 h-4" />
                      </div>
                      <div className="flex-1 overflow-hidden">
                        <p className="text-sm font-medium text-charcoal truncate">{file.name}</p>
                        <p className="text-xs text-warmGray">{formatSize(file.size)}</p>
                      </div>
                      <Download className="w-4 h-4 text-warmGray opacity-0 group-hover:opacity-100 transition-opacity" />
                    </a>
                  ))
                )}
             </div>
          </div>

        </div>

      </div>
    </div>
  );
}
