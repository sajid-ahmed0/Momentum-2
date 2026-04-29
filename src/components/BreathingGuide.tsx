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
  const [sessionTimeLeft, setSessionTimeLeft] = useState(300); // 5 minute standard
  const [wakeLockActive, setWakeLockActive] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [audioError, setAudioError] = useState<string | null>(null);
  
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Audio setup
  useEffect(() => {
    const audio = new Audio('/meditation.mp3?v=1');
    audio.loop = true;
    
    audio.oncanplaythrough = () => {
      console.log("Audio can play through");
      setAudioError(null);
    };

    audio.onerror = (e) => {
      console.error("Audio error:", e);
      setAudioError("Failed to load audio file. Please ensure it's a valid audio file.");
    };

    audioRef.current = audio;
    
    return () => {
      audio.pause();
      audioRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (audioRef.current) {
      if (!isMuted) {
        audioRef.current.play().catch(e => {
          console.error("Audio play failed:", e);
          setAudioError("Browser blocked auto-play or file is invalid.");
        });
      } else {
        audioRef.current.pause();
      }
    }
  }, [isMuted]);

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
          {audioError && (
            <span className="text-[9px] text-rose-500 font-bold uppercase tracking-wider bg-rose-500/10 px-2 py-1 rounded-md">
              Audio Error
            </span>
          )}
          <motion.button 
            whileTap={{ scale: 0.9 }}
            onClick={() => setIsMuted(!isMuted)}
            className={cn(
              "p-3 rounded-full transition-all border",
              isMuted 
                ? "bg-white/5 hover:bg-white/10 border-white/5" 
                : "bg-white/20 hover:bg-white/30 border-white/20 shadow-[0_0_15px_rgba(255,255,255,0.1)]"
            )}
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-white/40" /> : <Volume2 className="w-4 h-4 text-white" />}
          </motion.button>
        </div>
      </div>

      {/* Main Content - Improved centering for all viewports */}
      <div className="flex-1 w-full h-full flex flex-col items-center justify-center relative z-0 min-h-0">
        <div className="flex flex-col items-center justify-center space-y-12 lg:space-y-16">
          <div className="relative flex items-center justify-center scale-[0.8] sm:scale-90 lg:scale-100 mb-4">
              <motion.div 
                 animate={{
                   scale: phase === 'in' ? [1, 1.4] : phase === 'out' ? [1.4, 1] : 1.4,
                   opacity: phase === 'in' ? [0.1, 0.4] : phase === 'out' ? [0.4, 0.1] : 0.4
                 }}
                 transition={{ duration: getDuration(), ease: "easeInOut" }}
                 className="absolute w-[400px] h-[400px] rounded-full blur-[60px] transform-gpu will-change-transform bg-emerald-500/20"
              />

              <svg className="absolute w-[340px] h-[340px] -rotate-90 pointer-events-none">
                  <circle cx="170" cy="170" r="160" fill="none" stroke="currentColor" className="text-white/5" strokeWidth="1" />
                  <motion.circle 
                    cx="170" cy="170" r="160" 
                    fill="none" stroke="currentColor" 
                    className="transition-colors duration-1000 text-emerald-500/40"
                    strokeWidth="3"
                    strokeDasharray="1005"
                    animate={{ strokeDashoffset: [1005, 0] }}
                    transition={{ duration: getDuration(), ease: "linear", key: phase }}
                  />
              </svg>

              <motion.div 
                animate={{ rotate: 360 }}
                transition={{ duration: getDuration(), ease: "linear", repeat: Infinity }}
                className="absolute w-[320px] h-[320px] flex items-center justify-end transform-gpu will-change-transform"
              >
                  <div className="w-3 h-3 bg-white rounded-full shadow-[0_0_20px_rgba(255,255,255,0.9)] z-20" />
              </motion.div>

              <div className="relative w-72 h-72 flex items-center justify-center">
                  <motion.div 
                    initial={{ scale: 0.8 }}
                    animate={{
                      scale: phase === 'in' ? [0.8, 1.15] : phase === 'out' ? [1.15, 0.8] : [1.15, 1.1, 1.15],
                    }}
                    transition={{ 
                      duration: getDuration(), 
                      ease: "easeInOut",
                      repeat: phase === 'hold' ? Infinity : 0
                    }}
                    className="w-full h-full rounded-full shadow-2xl relative overflow-hidden transform-gpu will-change-transform transition-all duration-1000 bg-gradient-to-br from-emerald-400 via-teal-500 to-blue-600"
                  >
                      <div className="absolute top-[10%] left-[10%] w-[40%] h-[40%] bg-white/20 rounded-full blur-2xl" />
                  </motion.div>
              </div>
          </div>

          <div className="text-center space-y-10">
            <div className="relative h-16 flex items-center justify-center">
              <AnimatePresence mode="wait">
                  <motion.div 
                      key={phase}
                      initial={{ opacity: 0, scale: 0.8, filter: 'blur(10px)' }}
                      animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
                      exit={{ opacity: 0, scale: 1.2, filter: 'blur(11px)' }}
                      transition={{ duration: 0.6, ease: "easeOut" }}
                      className="flex flex-col items-center"
                  >
                      <h2 className="text-4xl lg:text-5xl font-black uppercase tracking-[0.3em] text-white drop-shadow-2xl">
                          {getPhaseText()}
                      </h2>
                  </motion.div>
              </AnimatePresence>
            </div>
            
            <div className="flex flex-col items-center space-y-4">
              <span className="text-[14px] font-mono font-black tabular-nums text-white/40 tracking-[1em]">
                  {timeLeft.toString().padStart(2, '0')}
              </span>
              <div className="flex gap-2">
                  {[...Array(getDuration())].map((_, i) => (
                      <div 
                          key={i} 
                          className={cn(
                              "h-1.5 rounded-full transition-all duration-500",
                              i < (getDuration() - timeLeft) ? "w-6 bg-white" : "w-1.5 bg-white/10"
                          )} 
                      />
                  ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="absolute bottom-16 flex flex-col items-center space-y-12">
        <motion.div 
            animate={{ opacity: [0.2, 0.5, 0.2], y: [0, -5, 0] }}
            transition={{ duration: 4, repeat: Infinity }}
            className="flex flex-col items-center space-y-4"
        >
            <div className="w-[1px] h-16 bg-gradient-to-b from-white/30 to-transparent" />
            <span className="text-[10px] font-black uppercase tracking-[0.5em] text-white/40 tracking-widest">BOX BREATHING</span>
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

