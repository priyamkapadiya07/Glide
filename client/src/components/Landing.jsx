import { useState } from 'react';
import { motion } from 'framer-motion';
import { Smartphone, Monitor, ChevronRight } from 'lucide-react';

export default function Landing({ pairCode, status, onConnect, trustedDevices, onReconnect }) {
  const [inputCode, setInputCode] = useState('');

  const handleConnect = (e) => {
    e.preventDefault();
    if (inputCode.length === 4) {
      onConnect(inputCode);
    }
  };

  return (
    <div className="w-full flex flex-col md:flex-row gap-8 md:gap-16 items-center justify-center">
      
      {/* Pair Code Section */}
      <div className="flex-1 max-w-md w-full">
        <motion.div 
          className="bg-white p-8 md:p-12 rounded-[2rem] shadow-float border border-white/50 backdrop-blur-xl"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
        >
          <div className="text-center mb-10">
            <h2 className="text-sm font-medium text-warmGray uppercase tracking-wider mb-2">Your Pair Code</h2>
            <div className="text-6xl md:text-7xl font-light tracking-widest text-charcoal tabular-nums">
              {pairCode || '----'}
            </div>
          </div>

          <div className="h-[1px] w-full bg-gradient-to-r from-transparent via-lightGray to-transparent mb-10" />

          <form onSubmit={handleConnect} className="flex flex-col gap-4">
            <label className="text-sm font-medium text-charcoal/70 text-center">Enter Code to Connect</label>
            <div className="flex items-center bg-offWhite rounded-2xl p-2 border border-lightGray focus-within:border-warmGray focus-within:ring-2 focus-within:ring-warmGray/20 transition-all">
              <input 
                type="text" 
                maxLength={4}
                value={inputCode}
                onChange={(e) => setInputCode(e.target.value.replace(/\\D/g, ''))}
                placeholder="0000"
                className="bg-transparent text-center text-2xl tracking-widest outline-none w-full font-medium placeholder:text-lightGray"
                disabled={status === 'connecting'}
              />
              <button 
                type="submit"
                disabled={inputCode.length !== 4 || status === 'connecting'}
                className="bg-charcoal text-white w-12 h-12 rounded-xl flex items-center justify-center hover:bg-black transition-colors disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
              >
                {status === 'connecting' ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <ChevronRight className="w-6 h-6" />
                )}
              </button>
            </div>
          </form>
        </motion.div>
      </div>

      {/* Trusted Devices Section */}
      {trustedDevices && trustedDevices.length > 0 && (
        <div className="flex-1 max-w-md w-full">
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <h3 className="text-lg font-medium mb-6 text-charcoal flex items-center gap-2">
              Trusted Devices
            </h3>
            <div className="flex flex-col gap-3">
              {trustedDevices.map((device) => (
                <button
                  key={device.id}
                  onClick={() => onReconnect && onReconnect(device.id)}
                  disabled={status === 'connecting'}
                  className="w-full bg-white p-4 rounded-2xl shadow-soft hover:shadow-float transition-all group border border-transparent hover:border-dustyPink/30 flex items-center justify-between disabled:opacity-50"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-softBlush rounded-full flex items-center justify-center text-dustyPink group-hover:bg-dustyPink group-hover:text-white transition-colors">
                      {device.name.toLowerCase().includes('mobile') || device.name.toLowerCase().includes('phone') ? (
                        <Smartphone className="w-5 h-5" />
                      ) : (
                        <Monitor className="w-5 h-5" />
                      )}
                    </div>
                    <div className="text-left">
                      <div className="font-medium text-charcoal">{device.name}</div>
                      <div className="text-xs text-warmGray">Click to reconnect</div>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-lightGray group-hover:text-charcoal transition-colors" />
                </button>
              ))}
            </div>
          </motion.div>
        </div>
      )}

    </div>
  );
}
