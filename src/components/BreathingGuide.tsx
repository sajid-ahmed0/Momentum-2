import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronLeft, Layers } from 'lucide-react';
import { cn } from '../lib/utils';

type VisualTheme = 'zen' | 'fluid' | 'minimal';

interface BreathingGuideProps {
  onBack: () => void;
}

export const BreathingGuide = ({ onBack }: BreathingGuideProps) => {
  const [theme, setTheme] = useState<VisualTheme>('zen');
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
            scale: phase === 'in' ? [1, 1.2, 1.3] : phase === 'out' ? [1.3, 1.2, 1] : 1.3,
            opacity: phase === 'in' ? [0.05, 0.1] : phase === 'out' ? [0.1, 0.05] : 0.1,
          }}
          transition={{ duration: getDuration(), ease: "easeInOut" }}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120vh] h-[120vh] rounded-full blur-[80px] transform-gpu will-change-transform bg-gradient-to-tr from-emerald-500/20 to-blue-500/20"
        />
      </div>

      {/* Header */}
      <div className="absolute top-0 left-0 right-0 p-6 sm:p-10 flex items-center justify-between z-50">
        <div className="flex items-center gap-2">
          <motion.button 
            whileHover={{ x: -2 }}
            whileTap={{ scale: 0.95 }}
            onClick={onBack}
            className="p-3 hover:bg-white/10 rounded-full transition-colors flex items-center gap-4 group"
          >
            <ChevronLeft className="w-5 h-5 text-white/40 group-hover:text-white" />
            <span className="hidden sm:inline text-[10px] font-black uppercase tracking-[0.3em] opacity-0 group-hover:opacity-100 transition-all">Exit</span>
          </motion.button>
          
          {/* Theme Selector */}
          <div className="flex bg-white/5 p-1 rounded-full border border-white/5 backdrop-blur-sm ml-2">
            {(['zen', 'fluid', 'minimal'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTheme(t)}
                className={cn(
                  "px-3 py-1.5 rounded-full text-[8px] font-black uppercase tracking-widest transition-all",
                  theme === t ? "bg-white/20 text-white shadow-lg" : "text-white/30 hover:text-white/50"
                )}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* Centered Immersion Info */}
        <div className="absolute left-1/2 -translate-x-1/2 flex flex-col items-center text-center">
            <div className="flex items-center gap-3">
              <span className="text-[10px] font-black uppercase tracking-[0.5em] text-white opacity-40">Immersion</span>
              {wakeLockActive && <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.5)]" />}
            </div>
            <div className="text-[14px] font-mono font-black text-white mt-2 tabular-nums tracking-wider opacity-90">
                {formatSessionTime(sessionTimeLeft)}
            </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Audio controls removed */}
        </div>
      </div>

      {/* Main Content - Centered & Immersive */}
      <div className="flex-1 w-full h-full flex flex-col items-center justify-center relative z-0 min-h-0 pt-0">
        <div className="flex flex-col items-center justify-center space-y-16 lg:space-y-24">
          <div className="relative flex items-center justify-center scale-90 sm:scale-100">
              {/* Outer Atmosphere Glows */}
              <motion.div 
                 animate={{
                   scale: phase === 'in' ? [1, 1.3] : phase === 'out' ? [1.3, 1] : 1.3,
                   opacity: phase === 'in' ? [0.1, 0.4] : phase === 'out' ? [0.4, 0.1] : 0.4
                 }}
                 transition={{ duration: getDuration(), ease: "easeInOut" }}
                 className={cn(
                   "absolute w-[450px] h-[450px] rounded-full blur-[100px] transform-gpu will-change-transform transition-colors duration-1000",
                   theme === 'fluid' ? "bg-indigo-500/30" : theme === 'minimal' ? "bg-white/10" : "bg-teal-500/30"
                 )}
              />
              
              <motion.div 
                 animate={{
                   scale: phase === 'in' ? [1.1, 1.5] : phase === 'out' ? [1.5, 1.1] : 1.5,
                   opacity: phase === 'in' ? [0.05, 0.2] : phase === 'out' ? [0.2, 0.05] : 0.2
                 }}
                 transition={{ duration: getDuration() * 1.5, ease: "easeInOut", repeat: Infinity, repeatType: "reverse" }}
                 className={cn(
                   "absolute w-[500px] h-[500px] rounded-full blur-[120px] transform-gpu will-change-transform transition-colors duration-1000",
                   theme === 'fluid' ? "bg-purple-500/20" : theme === 'minimal' ? "bg-white/5" : "bg-blue-500/20"
                 )}
              />

              {/* Progress System - Shared across themes or unique */}
              {theme !== 'minimal' && (
                <div className="absolute inset-0 flex items-center justify-center -rotate-90">
                  {/* Background Ring */}
                  <div className="absolute w-[340px] h-[340px] rounded-full border border-white/5 backdrop-blur-[2px]" />
                  
                  {/* Visual Progress SVG */}
                  <svg 
                    viewBox="0 0 200 200"
                    className="w-[360px] h-[360px] pointer-events-none drop-shadow-[0_0_15px_rgba(255,255,255,0.1)]"
                  >
                      <motion.circle 
                        cx="100" cy="100" r="92" 
                        fill="none" 
                        stroke="currentColor" 
                        className={cn(
                          "transition-colors duration-1000",
                          theme === 'fluid' ? "text-purple-400" : "text-teal-400"
                        )}
                        strokeWidth="1.5"
                        strokeDasharray="578"
                        strokeLinecap="round"
                        animate={{ strokeDashoffset: [578, 0] }}
                        transition={{ duration: getDuration(), ease: "linear", key: phase }}
                      />
                  </svg>
                  
                  {/* Orbital Particle */}
                  <motion.div 
                    animate={{ rotate: 360 }}
                    transition={{ duration: getDuration(), ease: "linear", repeat: Infinity }}
                    className="absolute w-[368px] h-[368px] flex items-center justify-center pointer-events-none"
                  >
                      <div className={cn(
                        "absolute right-0 w-3.5 h-3.5 rounded-full shadow-[0_0_25px_rgba(255,255,255,1)] z-20 transition-colors duration-1000",
                        theme === 'fluid' ? "bg-purple-200" : "bg-white"
                      )} />
                  </motion.div>
                </div>
              )}
 
              {/* Theme-Specific Central Core */}
              <div className="relative w-64 h-64 sm:w-72 sm:h-72 flex items-center justify-center">
                  <AnimatePresence mode="wait">
                    {theme === 'zen' && (
                      <motion.div 
                        key="zen"
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ 
                          opacity: 1, 
                          scale: phase === 'in' ? [0.85, 1.1] : phase === 'out' ? [1.1, 0.85] : [1.1, 1.08, 1.1],
                        }}
                        exit={{ opacity: 0, scale: 1.2 }}
                        transition={{ duration: getDuration(), ease: "easeInOut" }}
                        className="w-full h-full rounded-full relative overflow-hidden backdrop-blur-xl border border-white/20 bg-gradient-to-br from-white/10 to-transparent shadow-[inset_0_0_40px_rgba(255,255,255,0.1)]"
                      >
                         <motion.div 
                            animate={{ opacity: phase === 'in' ? 0.8 : 0.4 }}
                            className="absolute inset-0 bg-gradient-to-br from-emerald-500/20 via-teal-500/10 to-transparent"
                         />
                      </motion.div>
                    )}

                    {theme === 'fluid' && (
                      <motion.div 
                        key="fluid"
                        initial={{ opacity: 0 }}
                        animate={{ 
                          opacity: 1,
                          scale: phase === 'in' ? [1, 1.3] : phase === 'out' ? [1.3, 1] : 1.3,
                          borderRadius: ["40% 60% 70% 30% / 40% 50% 60% 50%", "60% 40% 30% 70% / 50% 40% 30% 60%", "40% 60% 70% 30% / 40% 50% 60% 50%"]
                        }}
                        exit={{ opacity: 0 }}
                        transition={{ 
                          scale: { duration: getDuration() },
                          borderRadius: { duration: 8, repeat: Infinity, ease: "linear" }
                        }}
                        className="w-full h-full bg-gradient-to-tr from-indigo-500/40 to-purple-500/40 backdrop-blur-2xl border border-white/20 shadow-[0_0_50px_rgba(139,92,246,0.3)]"
                      />
                    )}

                    {theme === 'minimal' && (
                      <motion.div 
                        key="minimal"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="relative w-full h-full flex items-center justify-center"
                      >
                        <motion.div 
                          animate={{
                            scale: phase === 'in' ? [1, 1.8] : phase === 'out' ? [1.8, 1] : 1.8,
                            opacity: phase === 'in' ? [0.2, 0.8] : phase === 'out' ? [0.8, 0.2] : 0.8
                          }}
                          transition={{ duration: getDuration(), ease: "easeInOut" }}
                          className="absolute w-2 h-2 bg-white rounded-full shadow-[0_0_30px_rgba(255,255,255,0.8)]"
                        />
                        <svg viewBox="0 0 100 100" className="w-full h-full opacity-20">
                          <motion.circle 
                            cx="50" cy="50" r="45"
                            fill="none" stroke="white" strokeWidth="0.5"
                            animate={{ scale: phase === 'in' ? [0.8, 1.1] : phase === 'out' ? [1.1, 0.8] : 1.1 }}
                            transition={{ duration: getDuration() }}
                          />
                        </svg>
                      </motion.div>
                    )}
                  </AnimatePresence>
              </div>
          </div>

          <div className="text-center space-y-6">
            <div className="relative h-10 flex items-center justify-center">
              <AnimatePresence mode="wait">
                  <motion.div 
                      key={phase}
                      initial={{ opacity: 0, scale: 0.8, filter: 'blur(10px)' }}
                      animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
                      exit={{ opacity: 0, scale: 1.2, filter: 'blur(11px)' }}
                      transition={{ duration: 0.6, ease: "easeOut" }}
                      className="flex flex-col items-center"
                  >
                      <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black uppercase tracking-[0.25em] text-white drop-shadow-2xl">
                          {getPhaseText()}
                      </h2>
                  </motion.div>
              </AnimatePresence>
            </div>
            
            <div className="flex flex-col items-center space-y-4">
              <span className="text-[12px] font-mono font-black tabular-nums text-white/40 tracking-[0.8em]">
                  {timeLeft.toString().padStart(2, '0')}
              </span>
              <div className="flex gap-2">
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

