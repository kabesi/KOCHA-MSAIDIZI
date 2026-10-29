import React from 'react';
import { useOnlineStatus } from '../useOnlineStatus';
import { WifiOff, Wifi } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();

  return (
    <AnimatePresence>
      {!isOnline && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          className="fixed bottom-20 md:bottom-6 left-4 right-4 md:left-auto md:right-6 z-50 flex items-center justify-between gap-3 rounded-2xl bg-stone-900/95 backdrop-blur-md px-4 py-3 text-xs font-semibold text-white shadow-2xl border border-stone-700/80 max-w-sm"
        >
          <div className="flex items-center gap-2.5">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500"></span>
            </span>
            <div className="flex flex-col">
              <span className="font-bold flex items-center gap-1.5 text-amber-300">
                <WifiOff size={14} /> Offline Mode Active
              </span>
              <span className="text-[11px] text-stone-300">Using local cache. Changes will sync when reconnected.</span>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
