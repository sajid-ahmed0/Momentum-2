import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronLeft, Info, Volume2, CloudRain, Wind, TreePine, Waves, Music } from 'lucide-react';
import { cn } from '../lib/utils';

interface BreathingGuideProps {
  onBack: () => void;
}

type Atmosphere = 'none' | 'rain' | 'waves' | 'forest' | 'white-noise';

const ATMOSPHERES: Record<Atmosphere, { name: string, icon: any, color: string, url: string }> = {
  'none': { name: 'Silence', icon: Volume2, color: 'emerald', url: '' },
  'rain': { name: 'Rain', icon: CloudRain, color: 'blue', url: 'https://cdn.pixabay.com/audio/2021/11/25/audio_82c2358f22.mp3' },
  'waves': { name: 'Ocean', icon: Waves, color: 'cyan', url: 'https://cdn.pixabay.com/audio/2022/03/10/audio_f574d754f1.mp3' },
  'forest': { name: 'Forest', icon: TreePine, color: 'teal', url: 'https://cdn.pixabay.com/audio/2022/03/10/audio_5594685ef0.mp3' },
  'white-noise': { name: 'Noise', icon: Wind, color: 'zinc', url: 'https://cdn.pixabay.com/audio/2022/03/10/audio_c0c4587a32.mp3' },
};

export const BreathingGuide = ({ onBack }: BreathingGuideProps) => {
  const [phase, setPhase] = useState<'in' | 'hold' | 'out'>('in');
  const [timeLeft, setTimeLeft] = useState(4);
  const [sessionTimeLeft, setSessionTimeLeft] = useState(120); // 2 minutes session
  const [wakeLockActive, setWakeLockActive] = useState(false);
  const [atmosphere, setAtmosphere] = useState<Atmosphere>('none');
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Audio Logic
  useEffect(() => {
    if (atmosphere === 'none') {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      return;
    }

    const audio = new Audio(ATMOSPHERES[atmosphere].url);
    audio.loop = true;
    audio.volume = 0.4;
    audio.play().catch(e => console.log('Audio play failed:', e));
    audioRef.current = audio;

    return () => {
      audio.pause();
    };
  }, [atmosphere]);

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

  const currentAtmColor = ATMOSPHERES[atmosphere].color;

  return (
    <div className={cn(
      "fixed inset-0 z-[60] flex flex-col items-center justify-center p-6 text-white overflow-hidden transition-colors duration-1000",
      atmosphere === 'none' ? 'bg-zinc-950' : 
      atmosphere === 'rain' ? 'bg-[#0a1128]' : 
      atmosphere === 'waves' ? 'bg-[#001d3d]' : 
      atmosphere === 'forest' ? 'bg-[#081c15]' : 'bg-zinc-900'
    )}>
      {/* Background Atmosphere */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div 
          animate={{
            scale: phase === 'in' ? [1, 1.4, 1.6] : phase === 'out' ? [1.6, 1.4, 1] : 1.6,
            opacity: phase === 'in' ? [0.1, 0.2] : phase === 'out' ? [0.2, 0.1] : 0.2,
            rotate: [0, 360]
          }}
          transition={{ duration: 40, repeat: Infinity, ease: "linear" }}
          className={cn(
            "absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full blur-[100px] transform-gpu will-change-transform",
            atmosphere === 'none' ? 'bg-gradient-to-tr from-emerald-500/20 to-blue-500/20' : 
            atmosphere === 'rain' ? 'bg-gradient-to-tr from-blue-500/30 to-indigo-500/30' : 
            atmosphere === 'waves' ? 'bg-gradient-to-tr from-cyan-500/30 to-blue-600/30' : 
            atmosphere === 'forest' ? 'bg-gradient-to-tr from-emerald-600/30 to-teal-800/30' : 'bg-white/10'
          )}
        />
        <motion.div 
          animate={{
            x: [0, 40, 0, -40, 0],
            y: [0, -30, 0, 30, 0],
          }}
          transition={{ duration: 25, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-white/5 rounded-full blur-[60px] transform-gpu will-change-transform"
        />
      </div>

      {/* Header */}
      <div className="absolute top-0 left-0 right-0 p-8 flex items-center justify-between z-10 transition-all">
        <motion.button 
          whileHover={{ x: -2 }}
          whileTap={{ scale: 0.95 }}
          onClick={onBack}
          className="p-3 hover:bg-white/10 rounded-full transition-colors flex items-center gap-3 group"
        >
          <ChevronLeft className="w-5 h-5 text-white/40 group-hover:text-white" />
          <span className="text-[10px] font-black uppercase tracking-[0.3em] opacity-0 group-hover:opacity-100 transition-all">End Session</span>
        </motion.button>

        <div className="flex flex-col items-center">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-[0.5em] text-white opacity-40">Immersion</span>
              {wakeLockActive && <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />}
            </div>
            <div className="text-[11px] font-mono font-black text-white mt-1 tabular-nums">
                {formatSessionTime(sessionTimeLeft)}
            </div>
        </div>

        <div className="flex items-center gap-2">
          {Object.entries(ATMOSPHERES).map(([key, value]) => {
            const Icon = value.icon;
            return (
              <motion.button
                key={key}
                whileTap={{ scale: 0.9 }}
                onClick={() => setAtmosphere(key as Atmosphere)}
                className={cn(
                  "p-2.5 rounded-full transition-all border",
                  atmosphere === key 
                    ? "bg-white text-zinc-950 border-white shadow-xl scale-110" 
                    : "bg-white/5 text-white/40 border-transparent hover:bg-white/10 hover:text-white"
                )}
                title={value.name}
              >
                <Icon className="w-3.5 h-3.5" />
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* Main Content */}
      <div className="relative flex flex-col items-center justify-center space-y-20">
        <div className="relative flex items-center justify-center">
            <motion.div 
               animate={{
                 scale: phase === 'in' ? [1, 1.3] : phase === 'out' ? [1.3, 1] : 1.3,
                 opacity: phase === 'in' ? [0.1, 0.4] : phase === 'out' ? [0.4, 0.1] : [0.4, 0.35, 0.4]
               }}
               transition={{ duration: getDuration(), ease: "easeInOut" }}
               className={cn(
                 "absolute w-96 h-96 rounded-full blur-3xl transform-gpu will-change-transform",
                 atmosphere === 'none' ? 'bg-emerald-500/10' : 
                 atmosphere === 'rain' ? 'bg-blue-500/20' : 
                 atmosphere === 'waves' ? 'bg-cyan-500/20' : 
                 atmosphere === 'forest' ? 'bg-teal-500/20' : 'bg-white/10'
               )}
            />

            <svg className="absolute w-[340px] h-[340px] -rotate-90 pointer-events-none">
                <circle cx="170" cy="170" r="160" fill="none" stroke="currentColor" className="text-white/5" strokeWidth="1" />
                <motion.circle 
                  cx="170" cy="170" r="160" 
                  fill="none" stroke="currentColor" 
                  className={cn(
                    "transition-colors duration-1000",
                    atmosphere === 'none' ? 'text-emerald-500/40' : 
                    atmosphere === 'rain' ? 'text-blue-400/40' : 
                    atmosphere === 'waves' ? 'text-cyan-400/40' : 
                    atmosphere === 'forest' ? 'text-teal-400/40' : 'text-white/40'
                  )}
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
                  className={cn(
                    "w-full h-full rounded-full shadow-2xl relative overflow-hidden transform-gpu will-change-transform transition-all duration-1000",
                    atmosphere === 'none' ? 'bg-gradient-to-br from-emerald-400 via-teal-500 to-blue-600' : 
                    atmosphere === 'rain' ? 'bg-gradient-to-br from-blue-400 via-indigo-600 to-zinc-950' : 
                    atmosphere === 'waves' ? 'bg-gradient-to-br from-cyan-400 via-blue-600 to-sky-900' : 
                    atmosphere === 'forest' ? 'bg-gradient-to-br from-emerald-500 via-teal-800 to-zinc-950' : 'bg-gradient-to-br from-zinc-700 via-zinc-800 to-zinc-950'
                  )}
                >
                    <div className="absolute top-[10%] left-[10%] w-[40%] h-[40%] bg-white/20 rounded-full blur-2xl" />
                </motion.div>
            </div>
        </div>

        <div className="text-center space-y-8">
          <div className="relative h-16 flex items-center justify-center">
            <AnimatePresence mode="wait">
                <motion.div 
                    key={phase}
                    initial={{ opacity: 0, scale: 0.8, filter: 'blur(10px)' }}
                    animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
                    exit={{ opacity: 0, scale: 1.2, filter: 'blur(10px)' }}
                    transition={{ duration: 0.6, ease: "easeOut" }}
                    className="flex flex-col items-center"
                >
                    <h2 className="text-5xl font-black uppercase tracking-[0.3em] text-white drop-shadow-2xl">
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

      <div className="absolute bottom-16 flex flex-col items-center space-y-12">
        <motion.div 
            animate={{ opacity: [0.2, 0.5, 0.2], y: [0, -5, 0] }}
            transition={{ duration: 4, repeat: Infinity }}
            className="flex flex-col items-center space-y-4"
        >
            <div className="w-[1px] h-16 bg-gradient-to-b from-white/30 to-transparent" />
            <span className="text-[10px] font-black uppercase tracking-[0.5em] text-white/40">Immersed in {ATMOSPHERES[atmosphere].name}</span>
        </motion.div>
        
        <div className="flex bg-white/10 backdrop-blur-2xl p-1.5 rounded-full border border-white/10 shadow-2xl">
            {['in', 'hold', 'out'].map((p) => (
              <div key={p} className={cn(
                  "px-8 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all duration-700",
                  phase === p ? "bg-white text-zinc-950 shadow-xl scale-105" : "text-white/20"
              )}>{p}</div>
            ))}
        </div>
      </div>
    </div>
  );
};

