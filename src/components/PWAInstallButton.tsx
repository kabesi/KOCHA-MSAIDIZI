import React, { useState } from 'react';
import { usePWAInstall } from '../usePWAInstall';
import { Download, Share2, PlusSquare, X, CheckCircle, Smartphone } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface PWAInstallButtonProps {
  variant?: 'compact' | 'badge' | 'full';
  className?: string;
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({
  variant = 'compact',
  className = '',
}) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const [installing, setInstalling] = useState(false);

  // If already running inside standalone PWA, hide install prompt
  if (isInstalled) {
    return null;
  }

  const handleInstallClick = async () => {
    if (isInstallable) {
      setInstalling(true);
      await install();
      setInstalling(false);
    } else if (isIOS) {
      setShowIOSGuide(true);
    }
  };

  // If not installable and not iOS, we can still show a helpful button if clicked on desktop/android or hide
  if (!isInstallable && !isIOS) {
    return null;
  }

  return (
    <>
      {variant === 'compact' && (
        <button
          type="button"
          onClick={handleInstallClick}
          disabled={installing}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-bold transition-all shadow-sm shadow-emerald-700/20 cursor-pointer ${className}`}
          title="Install KochaMsaidizi App"
        >
          <Smartphone size={14} className="shrink-0" />
          <span className="whitespace-nowrap">{isIOS ? 'Install PWA' : 'Install App'}</span>
        </button>
      )}

      {variant === 'badge' && (
        <button
          type="button"
          onClick={handleInstallClick}
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-emerald-500/30 bg-emerald-50 text-emerald-800 text-[11px] font-bold hover:bg-emerald-100 transition-colors ${className}`}
        >
          <Download size={12} />
          <span>App Available</span>
        </button>
      )}

      {/* iOS Safari Guided Install Sheet */}
      <AnimatePresence>
        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-4">
            <motion.div
              initial={{ opacity: 0, y: 40, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 40, scale: 0.95 }}
              className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl border border-stone-200 text-stone-900"
            >
              <div className="flex items-center justify-between pb-3 border-b border-stone-100">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-emerald-600 flex items-center justify-center text-white shadow-xs">
                    <Smartphone size={20} />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-stone-900">Install KochaMsaidizi</h3>
                    <p className="text-[11px] text-stone-500">Fast home screen access & full screen mode</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowIOSGuide(false)}
                  className="p-1.5 rounded-xl text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="py-4 space-y-3.5 text-xs text-stone-700">
                <div className="flex items-start gap-3 p-2.5 bg-stone-50 rounded-xl border border-stone-100">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white font-black text-xs">
                    1
                  </span>
                  <div>
                    <p className="font-semibold text-stone-900">Tap the Share button</p>
                    <p className="text-[11px] text-stone-500 flex items-center gap-1 mt-0.5">
                      Look for <Share2 size={13} className="text-blue-500 inline" /> in your Safari toolbar (at the bottom or top).
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-2.5 bg-stone-50 rounded-xl border border-stone-100">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white font-black text-xs">
                    2
                  </span>
                  <div>
                    <p className="font-semibold text-stone-900">Select "Add to Home Screen"</p>
                    <p className="text-[11px] text-stone-500 flex items-center gap-1 mt-0.5">
                      Scroll down the share sheet and tap <PlusSquare size={13} className="text-stone-700 inline" /> <strong>Add to Home Screen</strong>.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-2.5 bg-stone-50 rounded-xl border border-stone-100">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white font-black text-xs">
                    3
                  </span>
                  <div>
                    <p className="font-semibold text-stone-900">Tap "Add" in top-right</p>
                    <p className="text-[11px] text-stone-500 mt-0.5">
                      KochaMsaidizi will be placed directly on your phone's home screen!
                    </p>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowIOSGuide(false)}
                className="w-full py-2.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-white font-bold text-xs uppercase tracking-wider transition-colors"
              >
                Got It
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};
