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
    }, 1000);

    return () => clearInterval(timer);
  }, [phase]);

  const getPhaseText = () => {
    switch (phase) {
      case 'in': return 'Breathe In';
      case 'hold': return 'Hold';
      case 'out': return 'Breathe Out';
    }
  };

  return (
    <div className="fixed inset-0 z-[60] bg-zinc-950 flex flex-col items-center justify-center p-6 text-white overflow-hidden">
      {/* Background Glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div 
          animate={{
            scale: phase === 'in' ? [1, 1.5] : phase === 'out' ? [1.5, 1] : 1.5,
            opacity: phase === 'in' ? [0.1, 0.3] : phase === 'out' ? [0.3, 0.1] : 0.3
          }}
          transition={{ duration: phase === 'in' ? 4 : phase === 'out' ? 8 : 7, ease: "linear" }}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-emerald-500/20 rounded-full blur-[100px]"
        />
        <motion.div 
          animate={{
            scale: phase === 'in' ? [1.2, 1.8] : phase === 'out' ? [1.8, 1.2] : 1.8,
            opacity: phase === 'in' ? [0.05, 0.2] : phase === 'out' ? [0.2, 0.05] : 0.2
          }}
          transition={{ duration: phase === 'in' ? 4 : phase === 'out' ? 8 : 7, ease: "linear", delay: 1 }}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-500/10 rounded-full blur-[120px]"
        />
      </div>

      {/* Header */}
      <div className="absolute top-0 left-0 right-0 p-6 flex items-center justify-between z-10">
        <button 
          onClick={onBack}
          className="p-3 hover:bg-white/10 rounded-full transition-colors flex items-center gap-2 group"
        >
          <ChevronLeft className="w-5 h-5" />
          <span className="text-xs font-black uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">Exit</span>
        </button>
        <span className="text-xs font-black uppercase tracking-[0.3em] opacity-40">Relax</span>
        <button className="p-3 hover:bg-white/10 rounded-full transition-colors">
          <Info className="w-5 h-5" />
        </button>
      </div>

      {/* Main Content */}
      <div className="relative flex flex-col items-center justify-center space-y-16">
        {/* Outer Ring */}
        <div className="relative w-72 h-72 rounded-full border border-white/5 flex items-center justify-center">
            {/* Spinning Indicator */}
            <motion.div 
              animate={{ rotate: 360 }}
              transition={{ duration: phase === 'in' ? 4 : phase === 'out' ? 8 : 7, ease: "linear", repeat: Infinity }}
              className="absolute inset-0 p-1"
            >
                <div className="w-4 h-4 bg-white rounded-full blur-[2px] shadow-[0_0_15px_rgba(255,255,255,0.8)]" />
            </motion.div>

            {/* Inner Ring */}
            <div className="w-64 h-64 rounded-full border border-white/10 flex items-center justify-center p-4">
                {/* Visual Guide */}
                <motion.div 
                  className="w-full h-full rounded-full bg-gradient-to-br from-emerald-400 via-teal-500 to-blue-600 shadow-[0_0_50px_rgba(16,185,129,0.3)]"
                  animate={{
                    scale: phase === 'in' ? [0.7, 1] : phase === 'out' ? [1, 0.7] : 1,
                  }}
                  transition={{ 
                    duration: phase === 'in' ? 4 : phase === 'out' ? 8 : 7, 
                    ease: "easeInOut" 
                  }}
                />
            </div>
        </div>

        {/* Text Instructions */}
        <div className="text-center space-y-2">
          <AnimatePresence mode="wait">
            <motion.h2 
              key={phase}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="text-2xl font-black uppercase tracking-widest text-white"
            >
              {getPhaseText()}
            </motion.h2>
          </AnimatePresence>
          <p className="text-[10px] font-bold uppercase tracking-[0.5em] text-white/30 tabular-nums">
            {timeLeft}s
          </p>
        </div>
      </div>

      {/* Bottom Controls (Visual Only for now) */}
      <div className="absolute bottom-12 flex flex-col items-center space-y-8">
        <div className="flex items-center space-y-1 flex-col">
            <div className="w-px h-8 bg-white/20" />
            <span className="text-[9px] font-black uppercase tracking-widest text-white/20 italic">Focus on the center</span>
        </div>
        
        {/* Progress Dots */}
        <div className="flex gap-2">
            <div className={cn("w-1.5 h-1.5 rounded-full transition-colors", phase === 'in' ? "bg-emerald-400" : "bg-white/10")} />
            <div className={cn("w-1.5 h-1.5 rounded-full transition-colors", phase === 'hold' ? "bg-teal-400" : "bg-white/10")} />
            <div className={cn("w-1.5 h-1.5 rounded-full transition-colors", phase === 'out' ? "bg-blue-400" : "bg-white/10")} />
        </div>
      </div>
    </div>
  );
};
