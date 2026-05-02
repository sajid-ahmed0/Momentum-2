import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronLeft, Volume2, VolumeX } from 'lucide-react';
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
            scale: phase === 'in' ? [1, 1.2, 1.3] : phase === 'out' ? [1.3, 1.2, 1] : 1.3,
            opacity: phase === 'in' ? [0.05, 0.1] : phase === 'out' ? [0.1, 0.05] : 0.1,
          }}
          transition={{ duration: getDuration(), ease: "easeInOut" }}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120vh] h-[120vh] rounded-full blur-[80px] transform-gpu will-change-transform bg-gradient-to-tr from-emerald-500/20 to-blue-500/20"
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
                 className="absolute w-[450px] h-[450px] rounded-full blur-[100px] transform-gpu will-change-transform bg-teal-500/30"
              />
              
              <motion.div 
                 animate={{
                   scale: phase === 'in' ? [1.1, 1.5] : phase === 'out' ? [1.5, 1.1] : 1.5,
                   opacity: phase === 'in' ? [0.05, 0.2] : phase === 'out' ? [0.2, 0.05] : 0.2
                 }}
                 transition={{ duration: getDuration() * 1.5, ease: "easeInOut", repeat: Infinity, repeatType: "reverse" }}
                 className="absolute w-[500px] h-[500px] rounded-full blur-[120px] transform-gpu will-change-transform bg-blue-500/20"
              />

              {/* Progress System */}
              <div className="absolute inset-0 flex items-center justify-center -rotate-90">
                {/* Background Ring */}
                <div className="absolute w-[340px] h-[340px] rounded-full border border-white/5 backdrop-blur-[2px]" />
                
                {/* Visual Progress SVG */}
                <svg 
                  viewBox="0 0 200 200"
                  className="w-[360px] h-[360px] pointer-events-none drop-shadow-[0_0_15px_rgba(20,184,166,0.3)]"
                >
                    <motion.circle 
                      cx="100" cy="100" r="92" 
                      fill="none" 
                      stroke="currentColor" 
                      className={cn(
                        "transition-colors duration-1000",
                        phase === 'in' ? "text-emerald-400" : phase === 'hold' ? "text-teal-400" : "text-blue-400"
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
                      phase === 'in' ? "bg-emerald-200" : "bg-white"
                    )} />
                    {/* Tiny trailing flare */}
                    <div className="absolute right-2 w-1.5 h-1.5 bg-white/20 blur-sm rounded-full" />
                </motion.div>
              </div>
 
              {/* Central Core Circle */}
              <div className="relative w-64 h-64 sm:w-72 sm:h-72 flex items-center justify-center">
                  <motion.div 
                    initial={{ scale: 0.8 }}
                    animate={{
                      scale: phase === 'in' ? [0.85, 1.1] : phase === 'out' ? [1.1, 0.85] : [1.1, 1.08, 1.1],
                      boxShadow: phase === 'in' ? '0 0 50px rgba(16,185,129,0.2)' : '0 0 30px rgba(59,130,246,0.1)'
                    }}
                    transition={{ 
                      duration: getDuration(), 
                      ease: "easeInOut",
                      repeat: (phase === 'hold' || phase === 'rest') ? Infinity : 0
                    }}
                    className={cn(
                      "w-full h-full rounded-full relative overflow-hidden transform-gpu will-change-transform transition-all duration-1000",
                      "bg-gradient-to-br from-white/10 via-white/5 to-transparent backdrop-blur-xl border border-white/20",
                      "shadow-[inset_0_0_40px_rgba(255,255,255,0.1)]"
                    )}
                  >
                      {/* Inner Dynamic Gradient Layer */}
                      <motion.div 
                        animate={{ 
                          opacity: phase === 'in' ? 0.8 : 0.4,
                          background: phase === 'in' ? 'radial-gradient(circle at 30% 30%, #10b981 0%, transparent 70%)' : 'radial-gradient(circle at 30% 30%, #3b82f6 0%, transparent 70%)'
                        }}
                        transition={{ duration: 1000 }}
                        className="absolute inset-0"
                      />
                      
                      {/* Glass Specular highlights */}
                      <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] bg-gradient-to-br from-white/20 to-transparent rounded-full blur-xl" />
                      <div className="absolute bottom-[5%] right-[5%] w-[30%] h-[30%] bg-white/5 rounded-full blur-lg" />
                  </motion.div>
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

