import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronLeft, Info } from 'lucide-react';
import { cn } from '../lib/utils';

interface BreathingGuideProps {
  onBack: () => void;
}

export const BreathingGuide = ({ onBack }: BreathingGuideProps) => {
  const [phase, setPhase] = useState<'in' | 'hold' | 'out'>('in');
  const [timeLeft, setTimeLeft] = useState(4);
  const [sessionTimeLeft, setSessionTimeLeft] = useState(120); // 2 minutes session

  // Screen Wake Lock Logic
  useEffect(() => {
    let wakeLock: any = null;

    const requestWakeLock = async () => {
      try {
        if ('wakeLock' in navigator) {
          wakeLock = await (navigator as any).wakeLock.request('screen');
        }
      } catch (err) {
        console.error('Wake Lock request failed:', err);
      }
    };

    requestWakeLock();

    // Re-request wake lock when page becomes visible again
    const handleVisibilityChange = () => {
      if (wakeLock !== null && document.visibilityState === 'visible') {
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
            return 7;
          } else if (phase === 'hold') {
            setPhase('out');
            return 8;
          } else {
            setPhase('in');
            return 4;
          }
        }
        return prev - 1;
      });
      
      // Update session timer
      setSessionTimeLeft((prev) => {
        if (prev <= 1) {
          onBack(); // Auto completion
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
    }
  };

  const getDuration = () => {
    if (phase === 'in') return 4;
    if (phase === 'hold') return 7;
    return 8;
  };

  const formatSessionTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 z-[60] bg-zinc-950 flex flex-col items-center justify-center p-6 text-white overflow-hidden">
      {/* Background Atmosphere - Optimized for performance */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div 
          animate={{
            scale: phase === 'in' ? [1, 1.1, 1.2] : phase === 'out' ? [1.2, 1.1, 1] : 1.2,
            opacity: phase === 'in' ? [0.1, 0.15] : phase === 'out' ? [0.15, 0.1] : 0.15,
            rotate: [0, 360]
          }}
          transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-tr from-emerald-500/10 via-transparent to-blue-500/10 rounded-full blur-[60px] transform-gpu will-change-transform"
        />
        <motion.div 
          animate={{
            x: [0, 30, 0, -30, 0],
            y: [0, -20, 0, 20, 0],
          }}
          transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] bg-teal-500/5 rounded-full blur-[40px] transform-gpu will-change-transform"
        />
      </div>

      {/* Header */}
      <div className="absolute top-0 left-0 right-0 p-8 flex items-center justify-between z-10">
        <motion.button 
          whileHover={{ x: -2 }}
          whileTap={{ scale: 0.95 }}
          onClick={onBack}
          className="p-3 hover:bg-white/10 rounded-full transition-colors flex items-center gap-3 group"
        >
          <ChevronLeft className="w-5 h-5 text-white/40 group-hover:text-white" />
          <span className="text-[10px] font-black uppercase tracking-[0.3em] opacity-0 group-hover:opacity-100 transition-all">Back</span>
        </motion.button>
        <div className="flex flex-col items-center">
            <span className="text-[10px] font-black uppercase tracking-[0.5em] text-white opacity-40">Immersion Mode</span>
            <div className="text-[10px] font-mono font-black text-emerald-500 mt-1 tabular-nums animate-pulse">
                {formatSessionTime(sessionTimeLeft)}
            </div>
        </div>
        <button className="p-3 hover:bg-white/10 rounded-full transition-colors">
          <Info className="w-5 h-5 opacity-20" />
        </button>
      </div>

      {/* Main content Container */}
      <div className="relative flex flex-col items-center justify-center space-y-20">
        {/* The Orb System */}
        <div className="relative flex items-center justify-center">
            {/* Pulsing Aura - Simplified */}
            <motion.div 
               animate={{
                 scale: phase === 'in' ? [1, 1.25] : phase === 'out' ? [1.25, 1] : 1.25,
                 opacity: phase === 'in' ? [0.1, 0.3] : phase === 'out' ? [0.3, 0.1] : [0.3, 0.25, 0.3]
               }}
               transition={{ duration: getDuration(), ease: "easeInOut" }}
               className="absolute w-80 h-80 rounded-full bg-emerald-500/5 blur-2xl transform-gpu will-change-transform"
            />

            {/* Rotating Track */}
            <svg className="absolute w-[320px] h-[320px] -rotate-90 pointer-events-none">
                <circle 
                  cx="160" cy="160" r="150" 
                  fill="none" 
                  stroke="currentColor" 
                  className="text-white/5"
                  strokeWidth="1"
                />
                <motion.circle 
                  cx="160" cy="160" r="150" 
                  fill="none" 
                  stroke="currentColor" 
                  className="text-emerald-500/30"
                  strokeWidth="2"
                  strokeDasharray="942"
                  animate={{
                    strokeDashoffset: [942, 0]
                  }}
                  transition={{ duration: getDuration(), ease: "linear", key: phase }}
                />
            </svg>

            {/* Orbiting Point */}
            <motion.div 
              animate={{ rotate: 360 }}
              transition={{ duration: getDuration(), ease: "linear", repeat: Infinity }}
              className="absolute w-[300px] h-[300px] flex items-center justify-end transform-gpu will-change-transform"
            >
                <div className="w-2.5 h-2.5 bg-white rounded-full shadow-[0_0_15px_rgba(255,255,255,0.8)] z-20" />
            </motion.div>

            {/* Central Orb */}
            <div className="relative w-64 h-64 flex items-center justify-center">
                <motion.div 
                  initial={{ scale: 0.8 }}
                  animate={{
                    scale: phase === 'in' ? [0.8, 1.1] : phase === 'out' ? [1.1, 0.8] : [1.1, 1.08, 1.1],
                  }}
                  transition={{ 
                    duration: getDuration(), 
                    ease: "easeInOut",
                    repeat: phase === 'hold' ? Infinity : 0
                  }}
                  className="w-full h-full rounded-full bg-gradient-to-br from-emerald-400 via-teal-500 to-blue-600 shadow-[0_0_60px_rgba(16,185,129,0.2)] relative overflow-hidden transform-gpu will-change-transform"
                >
                    {/* Inner light glint - Fixed position for performance */}
                    <div className="absolute top-[10%] left-[10%] w-[40%] h-[40%] bg-white/10 rounded-full blur-xl" />
                </motion.div>
            </div>
        </div>

        {/* Dynamic Typography */}
        <div className="text-center space-y-6">
          <div className="relative h-12 flex items-center justify-center">
            <AnimatePresence mode="wait">
                <motion.div 
                    key={phase}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.4, ease: "easeOut" }}
                    className="flex flex-col items-center"
                >
                    <h2 className="text-4xl font-black uppercase tracking-[0.2em] text-white">
                        {getPhaseText()}
                    </h2>
                </motion.div>
            </AnimatePresence>
          </div>
          
          <div className="flex flex-col items-center space-y-2">
            <span className="text-[12px] font-mono font-black tabular-nums text-white/30 tracking-[0.8em]">
                {timeLeft.toString().padStart(2, '0')}
            </span>
            <div className="flex gap-1.5 mt-2">
                {[...Array(getDuration())].map((_, i) => (
                    <div 
                        key={i} 
                        className={cn(
                            "h-1 rounded-full transition-all duration-300",
                            i < (getDuration() - timeLeft) ? "w-4 bg-emerald-500" : "w-1 bg-white/5"
                        )} 
                    />
                ))}
            </div>
          </div>
        </div>
      </div>

      {/* Guide Footer */}
      <div className="absolute bottom-16 flex flex-col items-center space-y-10">
        <motion.div 
            animate={{ opacity: [0.1, 0.4, 0.1] }}
            transition={{ duration: 3, repeat: Infinity }}
            className="flex flex-col items-center space-y-3"
        >
            <div className="w-[1px] h-12 bg-gradient-to-b from-white/20 to-transparent" />
            <span className="text-[9px] font-black uppercase tracking-[0.4em] text-white/40 italic">Sync your mind with the orb</span>
        </motion.div>
        
        {/* Phase Indicator Pills */}
        <div className="flex bg-white/5 backdrop-blur-md p-1.5 rounded-full border border-white/5">
            <div className={cn(
                "px-6 py-2 rounded-full text-[9px] font-black uppercase tracking-widest transition-all duration-500",
                phase === 'in' ? "bg-white text-zinc-950 shadow-lg" : "text-white/20"
            )}>In</div>
            <div className={cn(
                "px-6 py-2 rounded-full text-[9px] font-black uppercase tracking-widest transition-all duration-500",
                phase === 'hold' ? "bg-white text-zinc-950 shadow-lg" : "text-white/20"
            )}>Hold</div>
            <div className={cn(
                "px-6 py-2 rounded-full text-[9px] font-black uppercase tracking-widest transition-all duration-500",
                phase === 'out' ? "bg-white text-zinc-950 shadow-lg" : "text-white/20"
            )}>Out</div>
        </div>
      </div>
    </div>
  );
};
