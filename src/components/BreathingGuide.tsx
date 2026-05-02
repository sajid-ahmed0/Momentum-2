import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronLeft } from 'lucide-react';
import { cn } from '../lib/utils';

interface BreathingGuideProps {
  onBack: () => void;
}

export const BreathingGuide = ({ onBack }: BreathingGuideProps) => {
  const [phase, setPhase] = useState<'in' | 'hold' | 'out' | 'rest'>('in');
  const [timeLeft, setTimeLeft] = useState(4);
  const [sessionTimeLeft, setSessionTimeLeft] = useState(120); // 2 minute standard
  const [wakeLockActive, setWakeLockActive] = useState(false);

  // Screen Wake Lock Logic
  useEffect(() => {
    let wakeLock: any = null;

    const requestWakeLock = async () => {
      try {
        if ('wakeLock' in navigator) {
          wakeLock = await (navigator as any).wakeLock.request('screen');
          setWakeLockActive(true);
        }
      } catch (err) {
        setWakeLockActive(false);
      }
    };

    requestWakeLock();

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        requestWakeLock();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (wakeLock !== null) {
        wakeLock.release().catch(() => {});
      }
    };
  }, []);

  // Sync timers with phases
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          if (phase === 'in') {
            setPhase('hold');
            return 4;
          } else if (phase === 'hold') {
            setPhase('out');
            return 4;
          } else if (phase === 'out') {
            setPhase('rest');
            return 4;
          } else {
            setPhase('in');
            return 4;
          }
        }
        return prev - 1;
      });
      
      setSessionTimeLeft((prev) => {
        if (prev <= 1) {
          onBack(); 
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [phase, onBack]);

  const getPhaseText = () => {
    switch (phase) {
      case 'in': return 'Breathe In';
      case 'hold': return 'Hold';
      case 'out': return 'Breathe Out';
      case 'rest': return 'Hold';
    }
  };

  const getDuration = () => {
    return 4;
  };

  const formatSessionTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
      <div className={cn(
      "fixed inset-0 z-[60] flex flex-col items-center justify-center p-6 text-white overflow-hidden transition-colors duration-1000 bg-zinc-950"
    )}>
      {/* Background Atmosphere */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div 
          animate={{
            scale: phase === 'in' ? [1, 1.2] : phase === 'out' ? [1.2, 1] : 1.2,
            opacity: phase === 'in' ? [0.1, 0.2] : phase === 'out' ? [0.2, 0.1] : 0.2
          }}
          transition={{ duration: getDuration(), ease: "easeInOut" }}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full blur-[120px] transform-gpu will-change-transform bg-emerald-500/20"
        />
      </div>

      {/* Header */}
      <div className="absolute top-0 left-0 right-0 p-10 flex items-center justify-between z-10">
        <motion.button 
          whileHover={{ x: -2 }}
          whileTap={{ scale: 0.95 }}
          onClick={onBack}
          className="p-3 hover:bg-white/10 rounded-full transition-colors flex items-center gap-4 group"
        >
          <ChevronLeft className="w-5 h-5 text-white/40 group-hover:text-white" />
          <span className="text-[10px] font-black uppercase tracking-[0.3em] opacity-0 group-hover:opacity-100 transition-all">Exit</span>
        </motion.button>

        <div className="flex flex-col items-center">
            <span className="text-[10px] font-black uppercase tracking-[0.5em] text-white opacity-40">Immersion</span>
            <div className="text-[14px] font-mono font-black text-white mt-1 tabular-nums tracking-wider">
                {formatSessionTime(sessionTimeLeft)}
            </div>
        </div>

        <div className="w-12 h-12 flex items-center justify-center">
          {wakeLockActive && (
            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_15px_rgba(16,185,129,0.5)]" />
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 w-full h-full flex flex-col items-center justify-center relative z-0">
        <div className="flex flex-col items-center justify-center space-y-12">
          <div className="relative flex items-center justify-center">
              <motion.div 
                 animate={{
                   scale: phase === 'in' ? [1, 1.4] : phase === 'out' ? [1.4, 1] : 1.4,
                   opacity: phase === 'in' ? [0.2, 0.5] : phase === 'out' ? [0.5, 0.2] : 0.5
                 }}
                 transition={{ duration: getDuration(), ease: "easeInOut" }}
                 className="absolute w-[320px] h-[320px] rounded-full blur-[60px] transform-gpu will-change-transform bg-emerald-500/30"
              />

              <svg 
                viewBox="0 0 200 200"
                className="absolute w-[280px] h-[280px] -rotate-90 pointer-events-none"
              >
                  <circle cx="100" cy="100" r="95" fill="none" stroke="currentColor" className="text-white/5" strokeWidth="0.5" />
                  <motion.circle 
                    cx="100" cy="100" r="95" 
                    fill="none" stroke="currentColor" 
                    className="text-emerald-500/40"
                    strokeWidth="1.5"
                    strokeDasharray="597"
                    animate={{ strokeDashoffset: [597, 0] }}
                    transition={{ duration: getDuration(), ease: "linear", key: phase }}
                  />
              </svg>

              <motion.div 
                animate={{ rotate: 360 }}
                transition={{ duration: getDuration(), ease: "linear", repeat: Infinity }}
                className="absolute w-[280px] h-[280px] flex items-center justify-end transform-gpu will-change-transform"
              >
                  <div className="w-2.5 h-2.5 bg-white rounded-full shadow-[0_0_20px_rgba(255,255,255,0.9)] z-20" />
              </motion.div>

              <div className="relative w-56 h-56 flex items-center justify-center">
                  <motion.div 
                    initial={{ scale: 0.8 }}
                    animate={{
                      scale: phase === 'in' ? [0.8, 1.2] : phase === 'out' ? [1.2, 0.8] : 1.2,
                    }}
                    transition={{ duration: getDuration(), ease: "easeInOut" }}
                    className="w-full h-full rounded-full bg-emerald-500/10 border border-emerald-500/20 backdrop-blur-sm relative overflow-hidden"
                  >
                      <motion.div 
                        animate={{
                          y: phase === 'in' ? ['100%', '0%'] : phase === 'out' ? ['0%', '100%'] : '0%'
                        }}
                        transition={{ duration: getDuration(), ease: "linear" }}
                        className="absolute inset-0 bg-gradient-to-t from-emerald-500/30 to-emerald-400/10"
                      />
                  </motion.div>
              </div>
          </div>

          <div className="text-center space-y-4">
            <div className="relative h-12 flex items-center justify-center">
              <AnimatePresence mode="wait">
                  <motion.div 
                      key={phase}
                      initial={{ opacity: 0, scale: 0.9, filter: 'blur(10px)' }}
                      animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
                      exit={{ opacity: 0, scale: 1.1, filter: 'blur(10px)' }}
                      transition={{ duration: 0.5 }}
                      className="flex flex-col items-center"
                  >
                      <h2 className="text-3xl font-black uppercase tracking-[0.2em] text-white">
                          {getPhaseText()}
                      </h2>
                  </motion.div>
              </AnimatePresence>
            </div>
            
            <div className="flex flex-col items-center space-y-2">
              <span className="text-[12px] font-mono font-black tabular-nums text-white/40 tracking-[0.6em]">
                  {timeLeft.toString().padStart(2, '0')}
              </span>
              <div className="flex gap-1.5">
                  {[...Array(getDuration())].map((_, i) => (
                      <div 
                          key={i} 
                          className={cn(
                              "h-1 rounded-full transition-all duration-500",
                              i < (getDuration() - timeLeft) ? "w-4 bg-white" : "w-1 bg-white/10"
                          )} 
                      />
                  ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="absolute bottom-10 flex flex-col items-center space-y-8">
        <motion.div 
            animate={{ opacity: [0.2, 0.5, 0.2], y: [0, -5, 0] }}
            transition={{ duration: 4, repeat: Infinity }}
            className="flex flex-col items-center space-y-3"
        >
            <div className="w-[1px] h-10 bg-gradient-to-b from-white/30 to-transparent" />
            <span className="text-[9px] font-black uppercase tracking-[0.5em] text-white/40 tracking-widest">BOX BREATHING</span>
        </motion.div>
        
        <div className="flex bg-white/10 backdrop-blur-2xl p-1.5 rounded-full border border-white/10 shadow-2xl">
            {['in', 'hold', 'out', 'rest'].map((p) => (
              <div key={p} className={cn(
                  "px-6 py-2.5 rounded-full text-[9px] font-black uppercase tracking-widest transition-all duration-700",
                  phase === p ? "bg-white text-zinc-950 shadow-xl scale-105" : "text-white/20"
              )}>{p === 'rest' ? 'hold' : p}</div>
            ))}
        </div>
      </div>
    </div>
  );
};

