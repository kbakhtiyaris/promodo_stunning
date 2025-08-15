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
  Sparkles
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
      bubbleUrl: 'https://task-51525.bubbleapps.io/version-test/tasks'
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
    const params = new URLSearchParams({
      task_name: currentTask,
      work_time: settings.workMinutes.toString(),
      break_time: settings.breakMinutes.toString(),
      session_start: sessionStartTime || '',
      session_end: new Date().toISOString(),
      user_id: userId,
      total_focus_time: todaysStats.totalMinutes.toString(),
      session_count: todaysStats.sessionCount.toString()
    });

    const fullUrl = `${settings.bubbleUrl}?${params.toString()}`;
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      {/* Animated Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-yellow-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-2000"></div>
        <div className="absolute top-40 left-40 w-80 h-80 bg-pink-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-4000"></div>
      </div>

      {/* Header */}
      <header className="relative z-10 bg-white/80 backdrop-blur-md border-b border-gray-200/50 sticky top-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center">
                <Timer className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                  Focus Flow
                </h1>
                <p className="text-xs text-gray-500">Productivity Timer</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={() => setShowSettings(true)}
                className="p-2 text-gray-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all duration-200"
              >
                <Settings className="w-5 h-5" />
              </button>
              <button
                onClick={sendToBubble}
                className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-lg hover:from-indigo-600 hover:to-purple-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
              >
                <ExternalLink className="w-4 h-4" />
                <span className="text-sm font-medium">Open Bubble App</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Timer Section */}
          <div className="lg:col-span-2">
            <div className="bg-white/70 backdrop-blur-md rounded-3xl shadow-xl border border-white/50 p-8 mb-8">
              <div className="text-center mb-8">
                <div className="relative inline-block">
                  <svg className="w-64 h-64 transform -rotate-90" viewBox="0 0 180 180">
                    <circle
                      cx="90"
                      cy="90"
                      r="85"
                      fill="none"
                      stroke="rgb(229 231 235)"
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
                    <div className="text-sm text-gray-500 uppercase tracking-wide">
                      {isBreakTime ? 'Break Time' : 'Focus Time'}
                    </div>
                    {isBreakTime && (
                      <div className="flex items-center mt-2 text-xs text-orange-600">
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
                  className="flex items-center space-x-2 px-6 py-4 bg-gray-100 text-gray-700 rounded-2xl hover:bg-gray-200 transition-all duration-200"
                >
                  <RotateCcw className="w-5 h-5" />
                  <span className="font-semibold">Reset</span>
                </button>
              </div>

              {/* Task Input */}
              <div className="mb-8">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {isBreakTime ? 'Break Activity (optional)' : 'What are you working on?'}
                </label>
                <input
                  type="text"
                  value={currentTask}
                  onChange={(e) => setCurrentTask(e.target.value)}
                  placeholder={isBreakTime ? 'Take a walk, stretch, hydrate...' : 'Enter your task or goal...'}
                  className="w-full px-4 py-3 bg-white/50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200"
                  maxLength={100}
                  disabled={isBreakTime}
                />
              </div>

              {/* Presets */}
              {!isBreakTime && (
              <div className="mb-8">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Quick Presets</h3>
                <div className="grid grid-cols-3 gap-4">
                  {PRESETS.map((preset) => {
                    const Icon = preset.icon;
                    return (
                      <button
                        key={preset.name}
                        onClick={() => applyPreset(preset)}
                        className="p-4 bg-white/50 border border-gray-200 rounded-xl hover:bg-white/80 hover:border-indigo-300 transition-all duration-200 group disabled:opacity-50 disabled:cursor-not-allowed"
                        disabled={isRunning}
                      >
                        <Icon className="w-6 h-6 text-indigo-600 mx-auto mb-2 group-hover:scale-110 transition-transform duration-200" />
                        <div className="text-sm font-medium text-gray-800">{preset.name}</div>
                        <div className="text-xs text-gray-500">{preset.work}m / {preset.break}m</div>
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
                ? 'bg-gradient-to-r from-orange-500/10 to-amber-500/10 border-orange-200/50' 
                : 'bg-gradient-to-r from-indigo-500/10 to-purple-500/10 border-indigo-200/50'
            }`}>
              <div className="flex items-start space-x-4">
                <Sparkles className={`w-6 h-6 mt-1 flex-shrink-0 ${
                  isBreakTime ? 'text-orange-600' : 'text-indigo-600'
                }`} />
                <div>
                  <p className="text-gray-700 italic text-lg leading-relaxed">"{currentQuote}"</p>
                </div>
              </div>
            </div>
          </div>

          {/* Stats Sidebar */}
          <div className="space-y-6">
            {/* Today's Stats */}
            <div className="bg-white/70 backdrop-blur-md rounded-2xl shadow-lg border border-white/50 p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                <BarChart3 className="w-5 h-5 text-indigo-600 mr-2" />
                Today's Progress
              </h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl">
                  <div className="flex items-center space-x-3">
                    <Clock className="w-5 h-5 text-green-600" />
                    <span className="text-sm text-gray-700">Focus Time</span>
                  </div>
                  <span className="text-lg font-bold text-green-600">{todaysStats.totalMinutes}m</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl">
                  <div className="flex items-center space-x-3">
                    <CheckCircle className="w-5 h-5 text-blue-600" />
                    <span className="text-sm text-gray-700">Sessions</span>
                  </div>
                  <span className="text-lg font-bold text-blue-600">{todaysStats.sessionCount}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl">
                  <div className="flex items-center space-x-3">
                    <Award className="w-5 h-5 text-purple-600" />
                    <span className="text-sm text-gray-700">Streak</span>
                  </div>
                  <span className="text-lg font-bold text-purple-600">
                    {streakData.currentStreak} day{streakData.currentStreak !== 1 ? 's' : ''}
                  </span>
                </div>
              </div>
            </div>

            {/* Recent Sessions */}
            <div className="bg-white/70 backdrop-blur-md rounded-2xl shadow-lg border border-white/50 p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                <Calendar className="w-5 h-5 text-indigo-600 mr-2" />
                Recent Sessions
              </h3>
              <div className="space-y-3">
                {sessions.slice(-3).reverse().map((session) => (
                  <div key={session.id} className="flex items-center justify-between p-3 bg-gray-50/50 rounded-xl">
                    <div>
                      <div className="text-sm font-medium text-gray-800 truncate max-w-32">
                        {session.taskName}
                      </div>
                      <div className="text-xs text-gray-500">
                        {session.workMinutes} minutes
                      </div>
                    </div>
                    <CheckCircle className="w-5 h-5 text-green-500" />
                  </div>
                ))}
                {sessions.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
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
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-8 text-center transform animate-bounce-in">
            <div className="w-16 h-16 bg-gradient-to-r from-green-500 to-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Break Complete!</h2>
            <p className="text-gray-600 mb-6">Ready to get back to work? 🎯</p>
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
                className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-all duration-200"
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
      <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-800">Settings</h2>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-all duration-200"
            >
              ×
            </button>
          </div>
        </div>
        
        <div className="p-6 space-y-6">
          {/* Timer Settings */}
          <div>
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Timer Duration</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>

          {/* Bubble.io Integration */}
          <div>
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Bubble.io Integration</h3>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Your Bubble App URL
              </label>
              <input
                type="url"
                value={localSettings.bubbleUrl}
                onChange={(e) => setLocalSettings(prev => ({
                  ...prev,
                  bubbleUrl: e.target.value
                }))}
                placeholder="https://your-app.bubbleapps.io/version-test/task_manager"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
              <p className="text-xs text-gray-500 mt-1">
                This is where your session data will be sent
              </p>
            </div>
          </div>

          {/* Preferences */}
          <div>
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Preferences</h3>
            <div className="space-y-3">
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
                <span className="text-sm text-gray-700">Play completion sound</span>
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
                <span className="text-sm text-gray-700">Show browser notifications</span>
              </label>
            </div>
          </div>
        </div>

        <div className="p-6 border-t border-gray-200 flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-all duration-200"
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