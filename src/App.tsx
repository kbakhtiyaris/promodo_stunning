import React, { useState, useEffect, useRef } from 'react';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  Settings, 
  ExternalLink, 
  Timer, 
  Target, 
  TrendingUp,
  Award,
  Zap,
  Coffee,
  Brain,
  CheckCircle,
  Clock,
  Calendar,
  BarChart3,
  Sparkles,
  Moon,
  Sun
} from 'lucide-react';

interface PomodoroSession {
  id: string;
  taskName: string;
  workMinutes: number;
  breakMinutes: number;
  startTime: string;
  endTime: string;
  date: string;
  userId: string;
}

interface StreakData {
  lastVisitDate: string;
  currentStreak: number;
  longestStreak: number;
}
interface Settings {
  workMinutes: number;
  breakMinutes: number;
  soundEnabled: boolean;
  notificationsEnabled: boolean;
  bubbleUrl: string;
  darkMode: boolean;
}

const MOTIVATIONAL_QUOTES = {
  work: [
    "Focus is the gateway to excellence.",
    "Every master was once a beginner.",
    "Success is built one focused minute at a time.",
    "Your future self will thank you for this focus.",
    "Great things happen when you focus.",
    "This moment of focus creates tomorrow's success."
  ],
  break: [
    "Rest is not idleness, it's preparation for greatness.",
    "A well-rested mind is unstoppable.",
    "You've earned this moment of peace.",
    "Recharge your brilliance.",
    "Every break brings you closer to your goals."
  ]
};

const PRESETS = [
  { name: "Focus Sprint", work: 25, break: 5, icon: Zap },
  { name: "Deep Work", work: 45, break: 15, icon: Brain },
  { name: "Marathon", work: 90, break: 20, icon: Target }
];

function App() {
  const [timer, setTimer] = useState<NodeJS.Timeout | null>(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [totalTime, setTotalTime] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [isBreakTime, setIsBreakTime] = useState(false);
  const [currentTask, setCurrentTask] = useState('');
  const [sessionStartTime, setSessionStartTime] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [currentQuote, setCurrentQuote] = useState(MOTIVATIONAL_QUOTES.work[0]);
  const [userId] = useState(() => {
    let id = localStorage.getItem('focusflow_user_id');
    if (!id) {
      id = 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
      localStorage.setItem('focusflow_user_id', id);
    }
    return id;
  });

  const [settings, setSettings] = useState<Settings>(() => {
    const saved = localStorage.getItem('focusflow_settings');
    return saved ? JSON.parse(saved) : {
      workMinutes: 25,
      breakMinutes: 5,
      soundEnabled: true,
      notificationsEnabled: true,
      bubbleUrl: 'https://task-51525.bubbleapps.io/version-test/tasks',
      darkMode: false
    };
  });

  const [sessions, setSessions] = useState<PomodoroSession[]>(() => {
    const saved = localStorage.getItem('focusflow_sessions');
    return saved ? JSON.parse(saved) : [];
  });

  const [streakData, setStreakData] = useState<StreakData>(() => {
    const saved = localStorage.getItem('focusflow_streak');
    return saved ? JSON.parse(saved) : {
      lastVisitDate: '',
      currentStreak: 0,
      longestStreak: 0
    };
  });
  const progressRef = useRef<SVGCircleElement>(null);

  // Update streak on app load and session completion
  useEffect(() => {
    updateStreak();
  }, []);

  const updateStreak = () => {
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    
    let newStreakData = { ...streakData };
    
    if (streakData.lastVisitDate === '') {
      // First visit ever
      newStreakData = {
        lastVisitDate: today,
        currentStreak: 1,
        longestStreak: 1
      };
    } else if (streakData.lastVisitDate === today) {
      // Already visited today, no change needed
      return;
    } else if (streakData.lastVisitDate === yesterday) {
      // Visited yesterday, increment streak
      newStreakData = {
        lastVisitDate: today,
        currentStreak: streakData.currentStreak + 1,
        longestStreak: Math.max(streakData.longestStreak, streakData.currentStreak + 1)
      };
    } else {
      // Missed one or more days, reset streak
      newStreakData = {
        lastVisitDate: today,
        currentStreak: 1,
        longestStreak: streakData.longestStreak
      };
    }
    
    setStreakData(newStreakData);
    localStorage.setItem('focusflow_streak', JSON.stringify(newStreakData));
  };
  // Initialize timer display
  useEffect(() => {
    if (timeLeft === 0 && !isRunning) {
      setTimeLeft(settings.workMinutes * 60);
      setTotalTime(settings.workMinutes * 60);
    }
  }, [settings.workMinutes, timeLeft, isRunning]);

  // Timer logic
  useEffect(() => {
    if (isRunning && timeLeft > 0) {
      const interval = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            completeSession();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      setTimer(interval);
      return () => clearInterval(interval);
    }
  }, [isRunning, timeLeft]);

  // Update progress circle
  useEffect(() => {
    if (progressRef.current && totalTime > 0) {
      const progress = (totalTime - timeLeft) / totalTime;
      const circumference = 2 * Math.PI * 85;
      const offset = circumference * (1 - progress);
      progressRef.current.style.strokeDasharray = `${circumference}`;
      progressRef.current.style.strokeDashoffset = `${offset}`;
    }
  }, [timeLeft, totalTime]);

  // Update quote periodically
  useEffect(() => {
    const interval = setInterval(() => {
      const quotes = isBreakTime ? MOTIVATIONAL_QUOTES.break : MOTIVATIONAL_QUOTES.work;
      const randomQuote = quotes[Math.floor(Math.random() * quotes.length)];
      setCurrentQuote(randomQuote);
    }, 30000);
    return () => clearInterval(interval);
  }, [isBreakTime]);

  const startTimer = () => {
    if (!currentTask.trim()) {
      alert('Please enter what you\'re working on!');
      return;
    }
    setIsRunning(true);
    setSessionStartTime(new Date().toISOString());
    if (timeLeft === 0) {
      const duration = isBreakTime ? settings.breakMinutes : settings.workMinutes;
      setTimeLeft(duration * 60);
      setTotalTime(duration * 60);
    }
  };

  const pauseTimer = () => {
    setIsRunning(false);
    if (timer) {
      clearInterval(timer);
      setTimer(null);
    }
  };

  const resetTimer = () => {
    setIsRunning(false);
    if (timer) {
      clearInterval(timer);
      setTimer(null);
    }
    setTimeLeft(0);
    setTotalTime(0);
    setSessionStartTime(null);
    setShowSuccess(false);
    setIsBreakTime(false);
    
    // Reset quote to work mode
    const workQuotes = MOTIVATIONAL_QUOTES.work;
    setCurrentQuote(workQuotes[Math.floor(Math.random() * workQuotes.length)]);
  };

  const completeSession = () => {
    setIsRunning(false);
    if (timer) {
      clearInterval(timer);
      setTimer(null);
    }

    if (!isBreakTime) {
      // Completed a focus session, save it and start break
      const session: PomodoroSession = {
        id: Date.now().toString(),
        taskName: currentTask,
        workMinutes: settings.workMinutes,
        breakMinutes: settings.breakMinutes,
        startTime: sessionStartTime || new Date().toISOString(),
        endTime: new Date().toISOString(),
        date: new Date().toISOString().split('T')[0],
        userId
      };

      const newSessions = [...sessions, session];
      setSessions(newSessions);
      localStorage.setItem('focusflow_sessions', JSON.stringify(newSessions));
      
      // Update streak when completing a session
      updateStreak();

      // Start break time
      setIsBreakTime(true);
      setTimeLeft(settings.breakMinutes * 60);
      setTotalTime(settings.breakMinutes * 60);
      setSessionStartTime(new Date().toISOString());
      setIsRunning(true);
      
      // Update quote for break time
      const breakQuotes = MOTIVATIONAL_QUOTES.break;
      setCurrentQuote(breakQuotes[Math.floor(Math.random() * breakQuotes.length)]);
    } else {
      // Completed a break, show success modal
      setIsBreakTime(false);
      setShowSuccess(true);
      setTimeLeft(settings.workMinutes * 60);
      setTotalTime(settings.workMinutes * 60);
      setSessionStartTime(null);
      
      // Update quote for work time
      const workQuotes = MOTIVATIONAL_QUOTES.work;
      setCurrentQuote(workQuotes[Math.floor(Math.random() * workQuotes.length)]);
    }
    
    if (settings.notificationsEnabled && 'Notification' in window && Notification.permission === 'granted') {
      new Notification(isBreakTime ? 'Break Complete! 🎯' : 'Focus Session Complete! 🎉', {
        body: isBreakTime ? 'Time to get back to work!' : `Great work on "${currentTask}"! Time for a break.`,
      });
    }

    if (settings.soundEnabled) {
      playCompletionSound();
    }
  };

  const playCompletionSound = () => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.value = 800;
      oscillator.type = 'sine';
      
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.5);
    } catch (error) {
      console.log('Could not play sound:', error);
    }
  };

  const sendToBubble = () => {
    const todaysStats = getTodaysStats();
    
    // Get the most recent completed session or create current session data
    const sessionData = {
      task_name: currentTask.trim() || 'Untitled Task',
      work_time: settings.workMinutes.toString(),
      break_time: settings.breakMinutes.toString(),
      session_start: sessionStartTime || new Date().toISOString(),
      session_end: new Date().toISOString(),
      user_id: userId,
      total_focus_time: todaysStats.totalMinutes.toString(),
      session_count: todaysStats.sessionCount.toString(),
      current_streak: streakData.currentStreak.toString(),
      date: new Date().toISOString().split('T')[0]
    };

    console.log('Sending data to Bubble:', sessionData);
    
    const params = new URLSearchParams({
      task_name: sessionData.task_name,
      work_time: sessionData.work_time,
      break_time: sessionData.break_time,
      session_start: sessionData.session_start,
      session_end: sessionData.session_end,
      user_id: sessionData.user_id,
      total_focus_time: sessionData.total_focus_time,
      session_count: sessionData.session_count,
      current_streak: sessionData.current_streak,
      date: sessionData.date
    });

    const fullUrl = `${settings.bubbleUrl}?${params.toString()}`;
    console.log('Full Bubble URL:', fullUrl);
    window.open(fullUrl, '_blank');
  };

  const getTodaysStats = () => {
    const today = new Date().toISOString().split('T')[0];
    const todaySessions = sessions.filter(s => s.date === today && s.userId === userId);
    return {
      totalMinutes: todaySessions.reduce((sum, s) => sum + s.workMinutes, 0),
      sessionCount: todaySessions.length
    };
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const applyPreset = (preset: typeof PRESETS[0]) => {
    setSettings(prev => ({
      ...prev,
      workMinutes: preset.work,
      breakMinutes: preset.break
    }));
    if (!isRunning && !isBreakTime) {
      setTimeLeft(preset.work * 60);
      setTotalTime(preset.work * 60);
    }
  };

  const saveSettings = (newSettings: Settings) => {
    setSettings(newSettings);
    localStorage.setItem('focusflow_settings', JSON.stringify(newSettings));
    if (!isRunning && !isBreakTime) {
      setTimeLeft(newSettings.workMinutes * 60);
      setTotalTime(newSettings.workMinutes * 60);
    }
  };

  const todaysStats = getTodaysStats();
  const displayTime = timeLeft || (settings.workMinutes * 60);

  const toggleDarkMode = () => {
    const newSettings = { ...settings, darkMode: !settings.darkMode };
    setSettings(newSettings);
    localStorage.setItem('focusflow_settings', JSON.stringify(newSettings));
  };

  return (
    <div className={`min-h-screen transition-colors duration-300 ${
      settings.darkMode 
        ? 'bg-gradient-to-br from-gray-900 via-gray-800 to-indigo-900' 
        : 'bg-gradient-to-br from-indigo-50 via-white to-purple-50'
    }`}>
      {/* Animated Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className={`absolute -top-40 -right-40 w-80 h-80 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob ${
          settings.darkMode ? 'bg-purple-600' : 'bg-purple-300'
        }`}></div>
        <div className={`absolute -bottom-40 -left-40 w-80 h-80 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-2000 ${
          settings.darkMode ? 'bg-yellow-600' : 'bg-yellow-300'
        }`}></div>
        <div className={`absolute top-40 left-40 w-80 h-80 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-4000 ${
          settings.darkMode ? 'bg-pink-600' : 'bg-pink-300'
        }`}></div>
      </div>

      {/* Header */}
      <header className={`relative z-10 backdrop-blur-md border-b sticky top-0 transition-colors duration-300 ${
        settings.darkMode 
          ? 'bg-gray-900/80 border-gray-700/50' 
          : 'bg-white/80 border-gray-200/50'
      }`}>
        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8">
          <div className="flex justify-between items-center h-14 sm:h-16">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center flex-shrink-0">
                <Timer className="w-4 h-4 sm:w-6 sm:h-6 text-white" />
              </div>
              <div className="min-w-0 flex-1">
                <h1 className={`text-xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent`}>
                  Focus Flow
                </h1>
                <p className={`text-xs hidden sm:block ${settings.darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  Productivity Timer
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2 sm:space-x-3">
              <button
                onClick={toggleDarkMode}
                className={`p-1.5 sm:p-2 rounded-lg transition-all duration-200 ${
                  settings.darkMode 
                    ? 'text-gray-300 hover:text-yellow-400 hover:bg-gray-800' 
                    : 'text-gray-600 hover:text-indigo-600 hover:bg-indigo-50'
                }`}
              >
                {settings.darkMode ? <Sun className="w-4 h-4 sm:w-5 sm:h-5" /> : <Moon className="w-4 h-4 sm:w-5 sm:h-5" />}
              </button>
              <button
                onClick={() => setShowSettings(true)}
                className={`p-1.5 sm:p-2 rounded-lg transition-all duration-200 ${
                  settings.darkMode 
                    ? 'text-gray-300 hover:text-indigo-400 hover:bg-gray-800' 
                    : 'text-gray-600 hover:text-indigo-600 hover:bg-indigo-50'
                }`}
              >
                <Settings className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
              <button
                onClick={sendToBubble}
                className="flex items-center space-x-1 sm:space-x-2 px-2 sm:px-4 py-1.5 sm:py-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-lg hover:from-indigo-600 hover:to-purple-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 mr-1"
              >
                <ExternalLink className="w-3 h-3 sm:w-4 sm:h-4" />
                <span className="text-xs sm:text-sm font-medium hidden xs:inline">Send to Bubble</span>
                <span className="text-xs sm:text-sm font-medium xs:hidden">Send</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Timer Section */}
          <div className="lg:col-span-2">
            <div className={`backdrop-blur-md rounded-3xl shadow-xl border p-8 mb-8 transition-colors duration-300 ${
              settings.darkMode 
                ? 'bg-gray-800/70 border-gray-700/50' 
                : 'bg-white/70 border-white/50'
            }`}>
              <div className="text-center mb-8">
                <div className="relative inline-block">
                  <svg className="w-64 h-64 transform -rotate-90" viewBox="0 0 180 180">
                    <circle
                      cx="90"
                      cy="90"
                      r="85"
                      fill="none"
                      stroke={settings.darkMode ? "rgb(75 85 99)" : "rgb(229 231 235)"}
                      strokeWidth="8"
                    />
                    <circle
                      ref={progressRef}
                      cx="90"
                      cy="90"
                      r="85"
                      fill="none"
                      stroke="url(#gradient)"
                      strokeWidth="8"
                      strokeLinecap="round"
                      className="transition-all duration-1000 ease-in-out"
                    />
                    <defs>
                      <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#6366f1" />
                        <stop offset="100%" stopColor="#8b5cf6" />
                      </linearGradient>
                    </defs>
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <div className="text-5xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent mb-2">
                      {formatTime(displayTime)}
                    </div>
                    <div className={`text-sm uppercase tracking-wide ${
                      settings.darkMode ? 'text-gray-400' : 'text-gray-500'
                    }`}>
                      {isBreakTime ? 'Break Time' : 'Focus Time'}
                    </div>
                    {isBreakTime && (
                      <div className={`flex items-center mt-2 text-xs ${
                        settings.darkMode ? 'text-orange-400' : 'text-orange-600'
                      }`}>
                        <Coffee className="w-3 h-3 mr-1" />
                        <span>Take a breather!</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex justify-center space-x-4 mb-8">
                {!isRunning ? (
                  <button
                    onClick={startTimer}
                    className={`flex items-center space-x-2 px-8 py-4 text-white rounded-2xl transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-1 ${
                      isBreakTime 
                        ? 'bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700' 
                        : 'bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700'
                    }`}
                  >
                    <Play className="w-5 h-5" />
                    <span className="font-semibold">{isBreakTime ? 'Start Break' : 'Start Focus'}</span>
                  </button>
                ) : (
                  <button
                    onClick={pauseTimer}
                    className="flex items-center space-x-2 px-8 py-4 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-2xl hover:from-orange-600 hover:to-red-600 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-1"
                  >
                    <Pause className="w-5 h-5" />
                    <span className="font-semibold">Pause</span>
                  </button>
                )}
                <button
                  onClick={resetTimer}
                  className={`flex items-center space-x-2 px-6 py-4 rounded-2xl transition-all duration-200 ${
                    settings.darkMode 
                      ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' 
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <RotateCcw className="w-5 h-5" />
                  <span className="font-semibold">Reset</span>
                </button>
              </div>

              {/* Task Input */}
              <div className="mb-8">
                <label className={`block text-sm font-medium mb-2 ${
                  settings.darkMode ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  {isBreakTime ? 'Break Activity (optional)' : 'What are you working on?'}
                </label>
                <input
                  type="text"
                  value={currentTask}
                  onChange={(e) => setCurrentTask(e.target.value)}
                  placeholder={isBreakTime ? 'Take a walk, stretch, hydrate...' : 'Enter your task or goal...'}
                  className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200 ${
                    settings.darkMode 
                      ? 'bg-gray-700/50 border-gray-600 text-gray-200 placeholder-gray-400' 
                      : 'bg-white/50 border-gray-200 text-gray-900 placeholder-gray-500'
                  }`}
                  maxLength={100}
                  disabled={isBreakTime}
                />
              </div>

              {/* Presets */}
              {!isBreakTime && (
              <div className="mb-8">
                <h3 className={`text-lg font-semibold mb-4 ${
                  settings.darkMode ? 'text-gray-200' : 'text-gray-800'
                }`}>Quick Presets</h3>
                <div className="grid grid-cols-3 gap-4">
                  {PRESETS.map((preset) => {
                    const Icon = preset.icon;
                    return (
                      <button
                        key={preset.name}
                        onClick={() => applyPreset(preset)}
                        className={`p-4 border rounded-xl transition-all duration-200 group disabled:opacity-50 disabled:cursor-not-allowed ${
                          settings.darkMode 
                            ? 'bg-gray-700/50 border-gray-600 hover:bg-gray-700/80 hover:border-indigo-400' 
                            : 'bg-white/50 border-gray-200 hover:bg-white/80 hover:border-indigo-300'
                        }`}
                        disabled={isRunning}
                      >
                        <Icon className="w-6 h-6 text-indigo-600 mx-auto mb-2 group-hover:scale-110 transition-transform duration-200" />
                        <div className={`text-sm font-medium ${
                          settings.darkMode ? 'text-gray-200' : 'text-gray-800'
                        }`}>{preset.name}</div>
                        <div className={`text-xs ${
                          settings.darkMode ? 'text-gray-400' : 'text-gray-500'
                        }`}>{preset.work}m / {preset.break}m</div>
                      </button>
                    );
                  })}
                </div>
              </div>
              )}
            </div>

            {/* Quote Section */}
            <div className={`backdrop-blur-md rounded-2xl p-6 border ${
              isBreakTime 
                ? settings.darkMode 
                  ? 'bg-gradient-to-r from-orange-500/20 to-amber-500/20 border-orange-400/30' 
                  : 'bg-gradient-to-r from-orange-500/10 to-amber-500/10 border-orange-200/50'
                : settings.darkMode 
                  ? 'bg-gradient-to-r from-indigo-500/20 to-purple-500/20 border-indigo-400/30' 
                  : 'bg-gradient-to-r from-indigo-500/10 to-purple-500/10 border-indigo-200/50'
            }`}>
              <div className="flex items-start space-x-4">
                <Sparkles className={`w-6 h-6 mt-1 flex-shrink-0 ${
                  isBreakTime 
                    ? settings.darkMode ? 'text-orange-400' : 'text-orange-600'
                    : settings.darkMode ? 'text-indigo-400' : 'text-indigo-600'
                }`} />
                <div>
                  <p className={`italic text-lg leading-relaxed ${
                    settings.darkMode ? 'text-gray-300' : 'text-gray-700'
                  }`}>"{currentQuote}"</p>
                </div>
              </div>
            </div>
          </div>

          {/* Stats Sidebar */}
          <div className="space-y-6">
            {/* Today's Stats */}
            <div className={`backdrop-blur-md rounded-2xl shadow-lg border p-6 transition-colors duration-300 ${
              settings.darkMode 
                ? 'bg-gray-800/70 border-gray-700/50' 
                : 'bg-white/70 border-white/50'
            }`}>
              <h3 className={`text-lg font-semibold mb-4 flex items-center ${
                settings.darkMode ? 'text-gray-200' : 'text-gray-800'
              }`}>
                <BarChart3 className={`w-5 h-5 mr-2 ${
                  settings.darkMode ? 'text-indigo-400' : 'text-indigo-600'
                }`} />
                Today's Progress
              </h3>
              <div className="space-y-4">
                <div className={`flex items-center justify-between p-3 rounded-xl ${
                  settings.darkMode 
                    ? 'bg-gradient-to-r from-green-900/30 to-emerald-900/30' 
                    : 'bg-gradient-to-r from-green-50 to-emerald-50'
                }`}>
                  <div className="flex items-center space-x-3">
                    <Clock className={`w-5 h-5 ${
                      settings.darkMode ? 'text-green-400' : 'text-green-600'
                    }`} />
                    <span className={`text-sm ${
                      settings.darkMode ? 'text-gray-300' : 'text-gray-700'
                    }`}>Focus Time</span>
                  </div>
                  <span className={`text-lg font-bold ${
                    settings.darkMode ? 'text-green-400' : 'text-green-600'
                  }`}>{todaysStats.totalMinutes}m</span>
                </div>
                <div className={`flex items-center justify-between p-3 rounded-xl ${
                  settings.darkMode 
                    ? 'bg-gradient-to-r from-blue-900/30 to-indigo-900/30' 
                    : 'bg-gradient-to-r from-blue-50 to-indigo-50'
                }`}>
                  <div className="flex items-center space-x-3">
                    <CheckCircle className={`w-5 h-5 ${
                      settings.darkMode ? 'text-blue-400' : 'text-blue-600'
                    }`} />
                    <span className={`text-sm ${
                      settings.darkMode ? 'text-gray-300' : 'text-gray-700'
                    }`}>Sessions</span>
                  </div>
                  <span className={`text-lg font-bold ${
                    settings.darkMode ? 'text-blue-400' : 'text-blue-600'
                  }`}>{todaysStats.sessionCount}</span>
                </div>
                <div className={`flex items-center justify-between p-3 rounded-xl ${
                  settings.darkMode 
                    ? 'bg-gradient-to-r from-purple-900/30 to-pink-900/30' 
                    : 'bg-gradient-to-r from-purple-50 to-pink-50'
                }`}>
                  <div className="flex items-center space-x-3">
                    <Award className={`w-5 h-5 ${
                      settings.darkMode ? 'text-purple-400' : 'text-purple-600'
                    }`} />
                    <span className={`text-sm ${
                      settings.darkMode ? 'text-gray-300' : 'text-gray-700'
                    }`}>Streak</span>
                  </div>
                  <span className={`text-lg font-bold ${
                    settings.darkMode ? 'text-purple-400' : 'text-purple-600'
                  }`}>
                    {streakData.currentStreak} day{streakData.currentStreak !== 1 ? 's' : ''}
                  </span>
                </div>
              </div>
            </div>

            {/* Recent Sessions */}
            <div className={`backdrop-blur-md rounded-2xl shadow-lg border p-6 transition-colors duration-300 ${
              settings.darkMode 
                ? 'bg-gray-800/70 border-gray-700/50' 
                : 'bg-white/70 border-white/50'
            }`}>
              <h3 className={`text-lg font-semibold mb-4 flex items-center ${
                settings.darkMode ? 'text-gray-200' : 'text-gray-800'
              }`}>
                <Calendar className={`w-5 h-5 mr-2 ${
                  settings.darkMode ? 'text-indigo-400' : 'text-indigo-600'
                }`} />
                Recent Sessions
              </h3>
              <div className="mb-4">
                <button
                  onClick={sendToBubble}
                  className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-lg hover:from-indigo-600 hover:to-purple-700 transition-all duration-200 text-sm"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span>View in Bubble App</span>
                </button>
              </div>
              <div className="space-y-3">
                {sessions.slice(-3).reverse().map((session) => (
                  <div key={session.id} className={`flex items-center justify-between p-3 rounded-xl ${
                    settings.darkMode ? 'bg-gray-700/50' : 'bg-gray-50/50'
                  }`}>
                    <div>
                      <div className={`text-sm font-medium truncate max-w-32 ${
                        settings.darkMode ? 'text-gray-200' : 'text-gray-800'
                      }`}>
                        {session.taskName}
                      </div>
                      <div className={`text-xs ${
                        settings.darkMode ? 'text-gray-400' : 'text-gray-500'
                      }`}>
                        {session.workMinutes} minutes
                      </div>
                    </div>
                    <CheckCircle className={`w-5 h-5 ${
                      settings.darkMode ? 'text-green-400' : 'text-green-500'
                    }`} />
                  </div>
                ))}
                {sessions.length === 0 && (
                  <div className={`text-center py-8 ${
                    settings.darkMode ? 'text-gray-400' : 'text-gray-500'
                  }`}>
                    <Target className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Complete your first session!</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Success Modal */}
      {showSuccess && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className={`rounded-3xl shadow-2xl max-w-md w-full p-8 text-center transform animate-bounce-in transition-colors duration-300 ${
            settings.darkMode ? 'bg-gray-800' : 'bg-white'
          }`}>
            <div className="w-16 h-16 bg-gradient-to-r from-green-500 to-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-8 h-8 text-white" />
            </div>
            <h2 className={`text-2xl font-bold mb-2 ${
              settings.darkMode ? 'text-gray-200' : 'text-gray-800'
            }`}>Break Complete!</h2>
            <p className={`mb-6 ${
              settings.darkMode ? 'text-gray-400' : 'text-gray-600'
            }`}>Ready to get back to work? 🎯</p>
            <div className="flex space-x-3">
              <button
                onClick={sendToBubble}
                className="flex-1 flex items-center justify-center space-x-2 px-4 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-xl hover:from-indigo-600 hover:to-purple-700 transition-all duration-200"
              >
                <ExternalLink className="w-4 h-4" />
                <span>Send to Bubble</span>
              </button>
              <button
                onClick={() => {
                  setShowSuccess(false);
                  // Don't reset task, user might want to continue with same task
                }}
                className={`flex-1 px-4 py-3 rounded-xl transition-all duration-200 ${
                  settings.darkMode 
                    ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Start New Focus
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {showSettings && (
        <SettingsModal
          settings={settings}
          onSave={saveSettings}
          onClose={() => setShowSettings(false)}
        />
      )}
    </div>
  );
}

interface SettingsModalProps {
  settings: Settings;
  onSave: (settings: Settings) => void;
  onClose: () => void;
}

function SettingsModal({ settings, onSave, onClose }: SettingsModalProps) {
  const [localSettings, setLocalSettings] = useState(settings);

  const handleSave = () => {
    onSave(localSettings);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className={`rounded-3xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto transition-colors duration-300 ${
        settings.darkMode ? 'bg-gray-800' : 'bg-white'
      }`}>
        <div className={`p-6 border-b ${
          settings.darkMode ? 'border-gray-700' : 'border-gray-200'
        }`}>
          <div className="flex items-center justify-between">
            <h2 className={`text-xl font-bold ${
              settings.darkMode ? 'text-gray-200' : 'text-gray-800'
            }`}>Settings</h2>
            <button
              onClick={onClose}
              className={`p-2 rounded-lg transition-all duration-200 ${
                settings.darkMode 
                  ? 'text-gray-400 hover:text-gray-200 hover:bg-gray-700' 
                  : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
              }`}
            >
              ×
            </button>
          </div>
        </div>
        
        <div className="p-6 space-y-6">
          {/* Timer Settings */}
          <div>
            <h3 className={`text-lg font-semibold mb-4 ${
              settings.darkMode ? 'text-gray-200' : 'text-gray-800'
            }`}>Timer Duration</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={`block text-sm font-medium mb-2 ${
                  settings.darkMode ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  Focus Time (minutes)
                </label>
                <input
                  type="number"
                  min="1"
                  max="180"
                  value={localSettings.workMinutes}
                  onChange={(e) => setLocalSettings(prev => ({
                    ...prev,
                    workMinutes: parseInt(e.target.value) || 25
                  }))}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors duration-200 ${
                    settings.darkMode 
                      ? 'bg-gray-700 border-gray-600 text-gray-200' 
                      : 'bg-white border-gray-300 text-gray-900'
                  }`}
                />
              </div>
              <div>
                <label className={`block text-sm font-medium mb-2 ${
                  settings.darkMode ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  Break Time (minutes)
                </label>
                <input
                  type="number"
                  min="1"
                  max="60"
                  value={localSettings.breakMinutes}
                  onChange={(e) => setLocalSettings(prev => ({
                    ...prev,
                    breakMinutes: parseInt(e.target.value) || 5
                  }))}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors duration-200 ${
                    settings.darkMode 
                      ? 'bg-gray-700 border-gray-600 text-gray-200' 
                      : 'bg-white border-gray-300 text-gray-900'
                  }`}
                />
              </div>
            </div>
          </div>

          {/* Preferences */}
          <div>
            <h3 className={`text-lg font-semibold mb-4 ${
              settings.darkMode ? 'text-gray-200' : 'text-gray-800'
            }`}>Preferences</h3>
            <div className="space-y-3">
              <label className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  checked={localSettings.darkMode}
                  onChange={(e) => setLocalSettings(prev => ({
                    ...prev,
                    darkMode: e.target.checked
                  }))}
                  className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                />
                <span className={`text-sm ${
                  settings.darkMode ? 'text-gray-300' : 'text-gray-700'
                }`}>Dark mode</span>
              </label>
              <label className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  checked={localSettings.soundEnabled}
                  onChange={(e) => setLocalSettings(prev => ({
                    ...prev,
                    soundEnabled: e.target.checked
                  }))}
                  className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                />
                <span className={`text-sm ${
                  settings.darkMode ? 'text-gray-300' : 'text-gray-700'
                }`}>Play completion sound</span>
              </label>
              <label className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  checked={localSettings.notificationsEnabled}
                  onChange={(e) => setLocalSettings(prev => ({
                    ...prev,
                    notificationsEnabled: e.target.checked
                  }))}
                  className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                />
                <span className={`text-sm ${
                  settings.darkMode ? 'text-gray-300' : 'text-gray-700'
                }`}>Show browser notifications</span>
              </label>
            </div>
          </div>
        </div>

        <div className={`p-6 border-t flex justify-end space-x-3 ${
          settings.darkMode ? 'border-gray-700' : 'border-gray-200'
        }`}>
          <button
            onClick={onClose}
            className={`px-4 py-2 rounded-lg transition-all duration-200 ${
              settings.darkMode 
                ? 'text-gray-300 bg-gray-700 hover:bg-gray-600' 
                : 'text-gray-700 bg-gray-100 hover:bg-gray-200'
            }`}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-lg hover:from-indigo-600 hover:to-purple-700 transition-all duration-200"
          >
            Save Settings
          </button>
        </div>
      </div>
    </div>
  );
}

export default App;