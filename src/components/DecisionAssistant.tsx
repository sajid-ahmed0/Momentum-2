import React, { useState } from 'react';
import { 
  Brain, 
  Sparkles, 
  GitFork, 
  Calendar, 
  Send, 
  Bot, 
  User, 
  ArrowRight, 
  CheckCircle2, 
  Zap, 
  Clock, 
  Flame, 
  Compass, 
  RefreshCw, 
  Check, 
  Plus, 
  ShieldAlert,
  HelpCircle,
  Lightbulb
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { TimeBlock, BlockTask } from '../types';
import { format } from 'date-fns';

interface DecisionAssistantProps {
  onAddBatchTimeBlocks: (blocks: Array<{ startTime: string; endTime: string; activity: string; date: string; color?: string; emoji?: string; subtasks?: BlockTask[] }>) => void;
  onNavigateToSchedule: () => void;
}

interface ChatMessage {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  timestamp: Date;
}

export const DecisionAssistant: React.FC<DecisionAssistantProps> = ({
  onAddBatchTimeBlocks,
  onNavigateToSchedule
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'coach' | 'dilemma' | 'schedule'>('coach');

  // Chat Coach State
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      sender: 'ai',
      text: "👋 Hi! I'm your **Prefrontal Cortex AI Advisor**.\n\nWhen you feel stuck between what feels easy right now (*limbic impulse*) and what will make you proud tonight (*prefrontal priority*), I'm here to help you make rational, high-ROI choices.\n\nWhat situation or decision are you facing right now?",
      timestamp: new Date()
    }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);

  // Dilemma Evaluator State
  const [optionA, setOptionA] = useState('');
  const [optionB, setOptionB] = useState('');
  const [situation, setSituation] = useState('');
  const [dilemmaResult, setDilemmaResult] = useState<{
    reply: string;
    recommendedOption?: string;
  } | null>(null);
  const [isDilemmaLoading, setIsDilemmaLoading] = useState(false);

  // Schedule Generator State
  const [schedSituation, setSchedSituation] = useState('');
  const [schedEnergy, setSchedEnergy] = useState<'low' | 'medium' | 'high'>('medium');
  const [schedStartTime, setSchedStartTime] = useState(() => {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    return `${hours}:00`;
  });
  const [schedDuration, setSchedDuration] = useState<number>(2); // 2 hours
  const [schedTasksInput, setSchedTasksInput] = useState('');
  const [isSchedLoading, setIsSchedLoading] = useState(false);
  const [generatedSchedule, setGeneratedSchedule] = useState<{
    summary: string;
    timeBlocks: Array<{
      activity: string;
      startTime: string;
      endTime: string;
      emoji: string;
      color: string;
      subtasks: Array<{ text: string }>;
    }>;
  } | null>(null);
  const [addedSuccess, setAddedSuccess] = useState(false);

  // Quick Chat Prompts
  const QUICK_PROMPTS = [
    "I want to scroll social media instead of starting my work.",
    "I'm feeling overwhelmed by my to-do list and stuck in paralysis.",
    "I have 2 free hours right now. How should I structure them?",
    "I want to nap, but I need to study for an upcoming exam."
  ];

  const handleSendChat = async (promptOverride?: string) => {
    const textToSend = promptOverride || chatInput;
    if (!textToSend.trim() || isChatLoading) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      sender: 'user',
      text: textToSend,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMsg]);
    if (!promptOverride) setChatInput('');
    setIsChatLoading(true);

    try {
      const historyPayload = messages.slice(-6).map(m => ({
        role: m.sender === 'user' ? 'user' : 'model',
        text: m.text
      }));

      const res = await fetch('/api/ai/decision', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'coach',
          prompt: textToSend,
          history: historyPayload
        })
      });

      const data = await res.json();
      const aiMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        sender: 'ai',
        text: data.reply || "Focus on taking the smallest 2-minute step right now to build momentum.",
        timestamp: new Date()
      };
      setMessages(prev => [...prev, aiMsg]);
    } catch (err) {
      console.error(err);
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        sender: 'ai',
        text: "⚠️ Couldn't reach the Prefrontal Cortex AI server. Take a deep breath, pick the single most urgent task, and spend just 5 minutes on it.",
        timestamp: new Date()
      }]);
    } finally {
      setIsChatLoading(false);
    }
  };

  const handleAnalyzeDilemma = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!optionA.trim() && !optionB.trim()) || isDilemmaLoading) return;

    setIsDilemmaLoading(true);
    setDilemmaResult(null);

    try {
      const res = await fetch('/api/ai/decision', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'dilemma',
          optionA,
          optionB,
          situation
        })
      });

      const data = await res.json();
      setDilemmaResult({
        reply: data.reply,
        recommendedOption: data.recommendedOption
      });
    } catch (err) {
      console.error(err);
      setDilemmaResult({
        reply: `### 🔴 Limbic Impulse (${optionA || 'Short-term'})\nOffers instant comfort or escape from effort.\n\n### 🟢 Prefrontal Choice (${optionB || 'Long-term'})\nAligns with your primary long-term targets.\n\n**Verdict**: Choose **${optionB || 'Option B'}**. Commit to just 5 minutes right now.`
      });
    } finally {
      setIsDilemmaLoading(false);
    }
  };

  const handleGenerateSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSchedLoading) return;

    setIsSchedLoading(true);
    setGeneratedSchedule(null);
    setAddedSuccess(false);

    const userTasksArray = schedTasksInput
      .split('\n')
      .map(t => t.trim())
      .filter(Boolean);

    try {
      const res = await fetch('/api/ai/generate-schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          situation: schedSituation,
          currentEnergy: schedEnergy,
          startTime: schedStartTime,
          timeWindowHours: schedDuration,
          userTasks: userTasksArray,
          targetDate: format(new Date(), 'yyyy-MM-dd')
        })
      });

      const data = await res.json();
      if (data.success && data.timeBlocks) {
        setGeneratedSchedule({
          summary: data.summary,
          timeBlocks: data.timeBlocks
        });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSchedLoading(false);
    }
  };

  const handleIntegrateToSchedule = () => {
    if (!generatedSchedule || !generatedSchedule.timeBlocks.length) return;

    const todayStr = format(new Date(), 'yyyy-MM-dd');

    const formattedBlocks = generatedSchedule.timeBlocks.map(tb => ({
      startTime: tb.startTime,
      endTime: tb.endTime,
      activity: tb.activity,
      date: todayStr,
      color: tb.color || 'indigo',
      emoji: tb.emoji || '🎯',
      subtasks: tb.subtasks?.map((st, idx) => ({
        id: `${Date.now()}-${idx}`,
        text: st.text,
        completed: false
      })) || []
    }));

    onAddBatchTimeBlocks(formattedBlocks);
    setAddedSuccess(true);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-zinc-900 via-zinc-900 to-amber-950/40 border border-zinc-800 p-6 sm:p-8 text-white shadow-xl">
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-mono font-bold">
              <Brain className="w-3.5 h-3.5" /> Neuroscience Decision Engine
            </div>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-2">
              Prefrontal Cortex Center
            </h2>
            <p className="text-sm text-zinc-300 leading-relaxed">
              When your emotional <span className="text-rose-400 font-semibold">limbic system</span> urges instant comfort, use AI to activate your <span className="text-emerald-400 font-semibold">prefrontal cortex</span> for objective clarity, rational choices, and instant action schedules.
            </p>
          </div>

          <div className="flex items-center gap-2 bg-zinc-950/60 p-1.5 rounded-xl border border-zinc-800 shrink-0">
            <button
              onClick={() => setActiveSubTab('coach')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all ${
                activeSubTab === 'coach'
                  ? 'bg-amber-500 text-zinc-950 shadow-md'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50'
              }`}
            >
              <Bot className="w-4 h-4" /> Coach Chat
            </button>
            <button
              onClick={() => setActiveSubTab('dilemma')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all ${
                activeSubTab === 'dilemma'
                  ? 'bg-amber-500 text-zinc-950 shadow-md'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50'
              }`}
            >
              <GitFork className="w-4 h-4" /> Tradeoff Evaluator
            </button>
            <button
              onClick={() => setActiveSubTab('schedule')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all ${
                activeSubTab === 'schedule'
                  ? 'bg-amber-500 text-zinc-950 shadow-md'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50'
              }`}
            >
              <Sparkles className="w-4 h-4" /> AI Time Blocks
            </button>
          </div>
        </div>
      </div>

      {/* SUBTAB 1: PREFRONTAL COACH CHAT */}
      {activeSubTab === 'coach' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Chat Box */}
          <div className="lg:col-span-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl flex flex-col h-[600px] shadow-sm overflow-hidden">
            <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center border border-amber-500/30">
                  <Brain className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">Rational Decision Coach</h3>
                  <p className="text-[11px] text-zinc-400">Powered by Gemini 3.6 Flash • Rational vs Emotional Clarity</p>
                </div>
              </div>
              <button
                onClick={() => setMessages([{
                  id: '1',
                  sender: 'ai',
                  text: "👋 What situation or decision are you facing right now? Tell me what you *want* to do vs what you *need* to do.",
                  timestamp: new Date()
                }])}
                className="p-1.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                title="Reset Chat"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Chat Messages */}
            <div className="flex-1 p-4 overflow-y-auto space-y-4 custom-scrollbar">
              {messages.map(msg => (
                <div
                  key={msg.id}
                  className={`flex items-start gap-3 ${msg.sender === 'user' ? 'flex-row-reverse' : ''}`}
                >
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                    msg.sender === 'user'
                      ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 font-bold text-xs'
                      : 'bg-amber-500 text-zinc-950 font-bold'
                  }`}>
                    {msg.sender === 'user' ? <User className="w-3.5 h-3.5" /> : <Brain className="w-3.5 h-3.5" />}
                  </div>

                  <div className={`max-w-[85%] rounded-2xl p-4 text-xs leading-relaxed whitespace-pre-wrap ${
                    msg.sender === 'user'
                      ? 'bg-amber-500 text-zinc-950 font-medium rounded-tr-none'
                      : 'bg-zinc-100 dark:bg-zinc-800/80 text-zinc-800 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-700/50 rounded-tl-none'
                  }`}>
                    {msg.text}
                  </div>
                </div>
              ))}

              {isChatLoading && (
                <div className="flex items-start gap-3">
                  <div className="w-7 h-7 rounded-lg bg-amber-500 text-zinc-950 font-bold flex items-center justify-center animate-pulse">
                    <Brain className="w-3.5 h-3.5" />
                  </div>
                  <div className="bg-zinc-100 dark:bg-zinc-800 p-4 rounded-2xl rounded-tl-none text-xs text-zinc-400 flex items-center gap-2">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-500" />
                    Analyzing situation with Prefrontal Cortex model...
                  </div>
                </div>
              )}
            </div>

            {/* Input Bar */}
            <div className="p-3 border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendChat();
                }}
                className="flex items-center gap-2"
              >
                <input
                  type="text"
                  placeholder="e.g. 'I want to scroll my phone, but I need to study...'"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  disabled={isChatLoading}
                  className="flex-1 bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700/60 rounded-xl px-4 py-2.5 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                />
                <button
                  type="submit"
                  disabled={!chatInput.trim() || isChatLoading}
                  className="p-2.5 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold rounded-xl transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>
          </div>

          {/* Quick Prompts & Prefrontal Rules */}
          <div className="space-y-4">
            <div className="p-5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5">
                <Lightbulb className="w-3.5 h-3.5 text-amber-500" /> Quick Situation Presets
              </h4>
              <div className="space-y-2">
                {QUICK_PROMPTS.map((prompt, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSendChat(prompt)}
                    disabled={isChatLoading}
                    className="w-full text-left p-2.5 bg-zinc-50 dark:bg-zinc-800/60 hover:bg-amber-500/10 hover:border-amber-500/30 border border-zinc-200 dark:border-zinc-700/50 rounded-xl text-xs text-zinc-700 dark:text-zinc-300 transition-all flex items-center justify-between group"
                  >
                    <span className="line-clamp-2">{prompt}</span>
                    <ArrowRight className="w-3.5 h-3.5 text-zinc-400 group-hover:text-amber-500 shrink-0 ml-2" />
                  </button>
                ))}
              </div>
            </div>

            <div className="p-5 bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/20 rounded-2xl space-y-3">
              <h4 className="text-xs font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                <ShieldAlert className="w-4 h-4" /> The 10/10/10 Decision Rule
              </h4>
              <p className="text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed">
                Before giving in to a limbic urge, ask yourself:
              </p>
              <ul className="text-xs space-y-1.5 text-zinc-600 dark:text-zinc-400 font-mono">
                <li>• How will I feel about this in <strong>10 minutes</strong>?</li>
                <li>• How will I feel in <strong>10 months</strong>?</li>
                <li>• How will I feel in <strong>10 years</strong>?</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* SUBTAB 2: TRADEOFF EVALUATOR */}
      {activeSubTab === 'dilemma' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <form onSubmit={handleAnalyzeDilemma} className="p-6 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl space-y-5 shadow-sm">
            <div className="space-y-1">
              <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                <GitFork className="w-4 h-4 text-amber-500" /> Dilemma & Option Evaluator
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Contrast what your brain wants right now vs what serves your long-term future.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-rose-500 dark:text-rose-400 mb-1.5 flex items-center gap-1.5">
                  <Flame className="w-3.5 h-3.5" /> Option A: What I WANT to do (Limbic Impulse)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Watch YouTube videos, sleep in, doomscroll"
                  value={optionA}
                  onChange={(e) => setOptionA(e.target.value)}
                  className="w-full bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3.5 py-2.5 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-rose-500/50"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-emerald-600 dark:text-emerald-400 mb-1.5 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Option B: What I NEED to do (Prefrontal Choice)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Study for exam, go for a run, write report"
                  value={optionB}
                  onChange={(e) => setOptionB(e.target.value)}
                  className="w-full bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3.5 py-2.5 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-600 dark:text-zinc-400 mb-1.5">
                  Current Situation / Mood / Frustration (Optional)
                </label>
                <textarea
                  rows={3}
                  placeholder="e.g. I am feeling low energy, anxious about my deadline, and tired."
                  value={situation}
                  onChange={(e) => setSituation(e.target.value)}
                  className="w-full bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 rounded-xl p-3 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={(!optionA.trim() && !optionB.trim()) || isDilemmaLoading}
              className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold rounded-xl text-xs transition-all flex items-center justify-center gap-2 shadow-md disabled:opacity-40"
            >
              {isDilemmaLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" /> Evaluating Tradeoffs...
                </>
              ) : (
                <>
                  <Brain className="w-4 h-4" /> Evaluate Tradeoff with AI
                </>
              )}
            </button>
          </form>

          {/* AI Result Box */}
          <div className="p-6 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl flex flex-col shadow-sm">
            <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 mb-4 flex items-center gap-2 border-b border-zinc-100 dark:border-zinc-800 pb-3">
              <Sparkles className="w-4 h-4 text-amber-500" /> Prefrontal Evaluation Output
            </h3>

            {dilemmaResult ? (
              <div className="space-y-4 flex-1">
                <div className="bg-zinc-50 dark:bg-zinc-800/50 p-4 rounded-xl border border-zinc-200 dark:border-zinc-700/60 text-xs text-zinc-800 dark:text-zinc-200 leading-relaxed whitespace-pre-wrap">
                  {dilemmaResult.reply}
                </div>
                {dilemmaResult.recommendedOption && (
                  <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    Recommended Path: {dilemmaResult.recommendedOption}
                  </div>
                )}
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-8 space-y-3 text-zinc-400">
                <Compass className="w-10 h-10 stroke-1 text-zinc-300 dark:text-zinc-700" />
                <p className="text-xs">Fill in your Option A and Option B to get an objective AI trade-off analysis.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* SUBTAB 3: AI TIME BLOCK GENERATOR & DIRECT SCHEDULE INTEGRATION */}
      {activeSubTab === 'schedule' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Input Form */}
          <form onSubmit={handleGenerateSchedule} className="lg:col-span-5 p-6 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl space-y-5 shadow-sm">
            <div className="space-y-1">
              <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-500" /> AI Time Block Generator
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Let Gemini design a realistic time-blocked schedule based on your current state and target tasks.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                  How are you feeling right now?
                </label>
                <input
                  type="text"
                  placeholder="e.g. Slightly tired, overwhelmed by work, low motivation"
                  value={schedSituation}
                  onChange={(e) => setSchedSituation(e.target.value)}
                  className="w-full bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3.5 py-2.5 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                    Energy Level
                  </label>
                  <select
                    value={schedEnergy}
                    onChange={(e) => setSchedEnergy(e.target.value as any)}
                    className="w-full bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                  >
                    <option value="low">🪫 Low Energy</option>
                    <option value="medium">⚡ Medium Focus</option>
                    <option value="high">🔥 High Motivation</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                    Start Time
                  </label>
                  <input
                    type="time"
                    value={schedStartTime}
                    onChange={(e) => setSchedStartTime(e.target.value)}
                    className="w-full bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                  Focus Window Duration
                </label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4].map(hrs => (
                    <button
                      type="button"
                      key={hrs}
                      onClick={() => setSchedDuration(hrs)}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                        schedDuration === hrs
                          ? 'bg-amber-500 text-zinc-950 border-amber-500 shadow-sm'
                          : 'bg-zinc-50 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100'
                      }`}
                    >
                      {hrs} {hrs === 1 ? 'Hour' : 'Hours'}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                  Tasks/Goals to Include (One per line)
                </label>
                <textarea
                  rows={3}
                  placeholder="e.g.&#10;Complete math problem set&#10;Review flashcards&#10;30-min workout"
                  value={schedTasksInput}
                  onChange={(e) => setSchedTasksInput(e.target.value)}
                  className="w-full bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 rounded-xl p-3 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSchedLoading}
              className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold rounded-xl text-xs transition-all flex items-center justify-center gap-2 shadow-md disabled:opacity-40"
            >
              {isSchedLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" /> Generating Schedule...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" /> Generate Time Blocks
                </>
              )}
            </button>
          </form>

          {/* Generated Time Blocks Preview */}
          <div className="lg:col-span-7 p-6 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl flex flex-col shadow-sm">
            <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-3 mb-4">
              <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-amber-500" /> Proposed Time Blocks
              </h3>
              {generatedSchedule && (
                <span className="text-[10px] font-mono font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-md">
                  {generatedSchedule.timeBlocks.length} Blocks Generated
                </span>
              )}
            </div>

            {generatedSchedule ? (
              <div className="space-y-4 flex-1 flex flex-col justify-between">
                <div className="space-y-3">
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 italic bg-amber-500/10 p-3 rounded-xl border border-amber-500/20">
                    💡 {generatedSchedule.summary}
                  </p>

                  <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1 custom-scrollbar">
                    {generatedSchedule.timeBlocks.map((block, i) => (
                      <div
                        key={i}
                        className="p-3.5 bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700/80 rounded-xl space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-lg">{block.emoji}</span>
                            <div>
                              <h4 className="text-xs font-black uppercase text-zinc-900 dark:text-zinc-100">
                                {block.activity}
                              </h4>
                              <p className="text-[10px] font-mono text-amber-600 dark:text-amber-400 font-bold">
                                {block.startTime} – {block.endTime}
                              </p>
                            </div>
                          </div>
                          <span className="text-[9px] font-mono uppercase px-2 py-0.5 rounded font-bold bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300">
                            {block.color}
                          </span>
                        </div>

                        {block.subtasks && block.subtasks.length > 0 && (
                          <div className="pl-6 space-y-1">
                            {block.subtasks.map((st, sIdx) => (
                              <div key={sIdx} className="text-[11px] text-zinc-600 dark:text-zinc-300 flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                                {st.text}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-4 border-t border-zinc-100 dark:border-zinc-800 flex items-center gap-3">
                  <button
                    onClick={handleIntegrateToSchedule}
                    disabled={addedSuccess}
                    className={`flex-1 py-3 px-4 font-bold rounded-xl text-xs transition-all flex items-center justify-center gap-2 shadow-md ${
                      addedSuccess
                        ? 'bg-emerald-600 text-white'
                        : 'bg-amber-500 hover:bg-amber-400 text-zinc-950'
                    }`}
                  >
                    {addedSuccess ? (
                      <>
                        <Check className="w-4 h-4" /> Added to Your Schedule!
                      </>
                    ) : (
                      <>
                        <Plus className="w-4 h-4" /> Add All to Today's Schedule
                      </>
                    )}
                  </button>

                  <button
                    onClick={onNavigateToSchedule}
                    className="py-3 px-4 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 font-bold rounded-xl text-xs transition-all flex items-center gap-1.5"
                  >
                    Go to Schedule <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-8 space-y-3 text-zinc-400">
                <Clock className="w-10 h-10 stroke-1 text-zinc-300 dark:text-zinc-700" />
                <p className="text-xs">Fill out the generator details on the left to generate customized time blocks.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
