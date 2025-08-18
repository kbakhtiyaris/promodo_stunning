import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw, Settings, Sun, Moon, ExternalLink } from 'lucide-react';

interface TimerSettings {
  focusTime: number;
  breakTime: number;
  darkMode: boolean;
  soundEnabled: boolean;
  notificationsEnabled: boolean;
}

interface Session {
  taskName: string;
  duration: number;
  startTime: Date;
  endTime: Date;
  type: 'focus' | 'break';
}

interface DailyStats {
  date: string;
  sessions: number;
  minutes: number;
}
const motivationalQuotes = [
  "The way to get started is to quit talking and begin doing. - Walt Disney",
  "Don't let yesterday take up too much of today. - Will Rogers",
  "You learn more from failure than from success. - Unknown",
  "It's not whether you get knocked down, it's whether you get up. - Vince Lombardi",
  "If you are working on something that you really care about, you don't have to be pushed. - Steve Jobs",
  "Focus on being productive instead of busy. - Tim Ferriss",
  "The successful warrior is the average man with laser-like focus. - Bruce Lee",
  "Concentrate all your thoughts upon the work in hand. - Alexander Graham Bell"
];

function App() {
  const [timeLeft, setTimeLeft] = useState(25 * 60); // 25 minutes in seconds
  const [isActive, setIsActive] = useState(false);
  const [isBreak, setIsBreak] = useState(false);
  const [taskName, setTaskName] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [currentQuote, setCurrentQuote] = useState(motivationalQuotes[0]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [sessionStartTime, setSessionStartTime] = useState<Date | null>(null);
  const [dailyStats, setDailyStats] = useState<DailyStats[]>([]);
  const [serviceWorkerRegistration, setServiceWorkerRegistration] = useState<ServiceWorkerRegistration | null>(null);
  const [settings, setSettings] = useState<TimerSettings>({
    focusTime: 25,
    breakTime: 5,
    darkMode: false,
    soundEnabled: true,
    notificationsEnabled: true,
  });

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const serviceWorkerRef = useRef<ServiceWorker | null>(null);

  // Register service worker
  useEffect(() => {
    if ('serviceWorker' in navigator && !window.location.hostname.includes('stackblitz') && !window.location.hostname.includes('webcontainer.io')) {
      navigator.serviceWorker.register('/sw.js')
        .then((registration) => {
          console.log('Service Worker registered:', registration);
          setServiceWorkerRegistration(registration);
          serviceWorkerRef.current = registration.active || registration.installing || registration.waiting;
          
          // Listen for messages from service worker
          navigator.serviceWorker.addEventListener('message', handleServiceWorkerMessage);
        })
        .catch((error) => {
          console.error('Service Worker registration failed:', error);
        });
    } else {
      console.log('Service Worker not supported in this environment');
    }
    
    return () => {
      if ('serviceWorker' in navigator && !window.location.hostname.includes('stackblitz') && !window.location.hostname.includes('webcontainer.io')) {
        navigator.serviceWorker.removeEventListener('message', handleServiceWorkerMessage);
      }
    };
  }, []);

  const handleServiceWorkerMessage = (event: MessageEvent) => {
    const { type, data } = event.data;
    
    switch (type) {
      case 'TIMER_UPDATE':
        setTimeLeft(data.timeLeft);
        break;
        
      case 'TIMER_COMPLETE':
        handleTimerCompleteFromSW(data);
        break;
        
      case 'START_FROM_NOTIFICATION':
        setIsActive(true);
        setTimeLeft(data.timeLeft);
        setIsBreak(data.isBreak);
        setSessionStartTime(new Date(data.startTime));
        break;
    }
  };

  const sendMessageToServiceWorker = (type: string, data?: any) => {
    if (serviceWorkerRef.current) {
      serviceWorkerRef.current.postMessage({ type, data });
    }
  };
  // Load settings from localStorage
  useEffect(() => {
    const savedSettings = localStorage.getItem('focusFlowSettings');
    if (savedSettings) {
      const parsed = JSON.parse(savedSettings);
      setSettings(parsed);
      setTimeLeft(parsed.focusTime * 60);
    }

    const savedSessions = localStorage.getItem('focusFlowSessions');
    if (savedSessions) {
      const parsedSessions = JSON.parse(savedSessions).map((s: any) => ({
        ...s,
        startTime: new Date(s.startTime),
        endTime: new Date(s.endTime)
      }));
      setSessions(parsedSessions);
      updateDailyStats(parsedSessions);
    }

    const savedDailyStats = localStorage.getItem('focusFlowDailyStats');
    if (savedDailyStats) {
      setDailyStats(JSON.parse(savedDailyStats));
    }

    // Set random quote on load
    setCurrentQuote(motivationalQuotes[Math.floor(Math.random() * motivationalQuotes.length)]);
    
    // Request notification permission
    requestNotificationPermission();
    
    // Sync with service worker on load
    setTimeout(() => {
      if (serviceWorkerRef.current) {
        const channel = new MessageChannel();
        channel.port1.onmessage = (event) => {
          if (event.data.type === 'STATE_UPDATE') {
            const swState = event.data.data;
            if (swState.isActive) {
              setIsActive(swState.isActive);
              setTimeLeft(swState.timeLeft);
              setIsBreak(swState.isBreak);
              setTaskName(swState.taskName);
              if (swState.startTime) {
                setSessionStartTime(new Date(swState.startTime));
              }
            }
          }
        };
        serviceWorkerRef.current.postMessage({ type: 'GET_STATE' }, [channel.port2]);
      }
    }, 1000);
  }, []);

  const updateDailyStats = (sessionList: Session[]) => {
    const statsMap = new Map<string, DailyStats>();
    
    sessionList.filter(s => s.type === 'focus').forEach(session => {
      const date = session.startTime.toISOString().split('T')[0];
      const existing = statsMap.get(date) || { date, sessions: 0, minutes: 0 };
      existing.sessions += 1;
      existing.minutes += session.duration;
      statsMap.set(date, existing);
    });
    
    const statsArray = Array.from(statsMap.values()).sort((a, b) => b.date.localeCompare(a.date));
    setDailyStats(statsArray);
    localStorage.setItem('focusFlowDailyStats', JSON.stringify(statsArray));
  };
  // Save settings to localStorage
  useEffect(() => {
    localStorage.setItem('focusFlowSettings', JSON.stringify(settings));
    
    // Update service worker with new settings
    sendMessageToServiceWorker('UPDATE_STATE', { settings });
  }, [settings]);

  // Save sessions to localStorage
  useEffect(() => {
    localStorage.setItem('focusFlowSessions', JSON.stringify(sessions));
    updateDailyStats(sessions);
  }, [sessions]);

  // Timer logic
  useEffect(() => {
    if (isActive && timeLeft > 0 && !serviceWorkerRef.current) {
      // Only run main thread timer if service worker is not available
      intervalRef.current = setInterval(() => {
        setTimeLeft(timeLeft => timeLeft - 1);
      }, 1000);
    } else if (timeLeft === 0) {
      handleTimerComplete();
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isActive, timeLeft]);

  const handleTimerCompleteFromSW = (data: any) => {
    const session: Session = {
      taskName: data.taskName || 'Untitled Task',
      duration: data.duration,
      startTime: new Date(data.startTime),
      endTime: new Date(data.endTime),
      type: data.wasBreak ? 'break' : 'focus'
    };
    
    setSessions(prev => [session, ...prev]);
    setIsBreak(data.isBreak);
    setTimeLeft(data.timeLeft);
    setIsActive(false);
    setSessionStartTime(null);
    
    if (settings.soundEnabled) {
      playNotificationSound();
    }
    
    setCurrentQuote(motivationalQuotes[Math.floor(Math.random() * motivationalQuotes.length)]);
  };
  const handleTimerComplete = () => {
    setIsActive(false);
    
    if (sessionStartTime) {
      const endTime = new Date();
      const session: Session = {
        taskName: taskName || 'Untitled Task',
        duration: isBreak ? settings.breakTime : settings.focusTime,
        startTime: sessionStartTime,
        endTime,
        type: isBreak ? 'break' : 'focus'
      };
      setSessions(prev => [session, ...prev]);
    }

    if (settings.soundEnabled) {
      playNotificationSound();
    }

    if (settings.notificationsEnabled && 'Notification' in window && Notification.permission === 'granted') {
      new Notification(isBreak ? 'Break time is over!' : 'Focus session complete!', {
        body: isBreak ? 'Time to get back to work!' : 'Take a well-deserved break!',
        icon: '/vite.svg',
        tag: 'pomodoro-timer'
      });
    }

    // Switch between focus and break
    setIsBreak(!isBreak);
    setTimeLeft(isBreak ? settings.focusTime * 60 : settings.breakTime * 60);
    setSessionStartTime(null);
    setCurrentQuote(motivationalQuotes[Math.floor(Math.random() * motivationalQuotes.length)]);
  };

  const playNotificationSound = () => {
    if (!audioRef.current) {
      // Create a simple beep sound using Web Audio API
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
      return;
    }
    audioRef.current.play().catch(() => {});
  };

  const toggleTimer = () => {
    const newIsActive = !isActive;
    setIsActive(newIsActive);
    
    if (newIsActive) {
      if (!sessionStartTime) {
        const startTime = new Date();
        setSessionStartTime(startTime);
        
        // Send state to service worker
        sendMessageToServiceWorker('START_TIMER', {
          timeLeft,
          isBreak,
          taskName,
          startTime: startTime.toISOString(),
          settings
        });
      } else {
        // Resume timer
        sendMessageToServiceWorker('START_TIMER', {
          timeLeft,
          isBreak,
          taskName,
          startTime: sessionStartTime.toISOString(),
          settings
        });
      }
    } else {
      // Pause timer
      sendMessageToServiceWorker('PAUSE_TIMER');
    }
  };

  const resetTimer = () => {
    setIsActive(false);
    const newTimeLeft = isBreak ? settings.breakTime * 60 : settings.focusTime * 60;
    setTimeLeft(newTimeLeft);
    setSessionStartTime(null);
    
    // Reset service worker timer
    sendMessageToServiceWorker('RESET_TIMER', { timeLeft: newTimeLeft });
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const setQuickTimer = (minutes: number) => {
    setTimeLeft(minutes * 60);
    setIsActive(false);
    setSessionStartTime(null);
    sendMessageToServiceWorker('RESET_TIMER', { timeLeft: minutes * 60 });
  };

  const sendToBubble = () => {
    const todayStats = getTodayStats();
    
    const totalFocusTime = todayStats.minutes;
    const sessionCount = todayStats.sessions;
    
    // Calculate current streak
    let currentStreak = 0;
    const sortedStats = dailyStats.sort((a, b) => b.date.localeCompare(a.date));
    
    for (let i = 0; i < sortedStats.length; i++) {
      const date = new Date(sortedStats[i].date);
      const expectedDate = new Date();
      expectedDate.setDate(expectedDate.getDate() - i);
      
      if (date.toISOString().split('T')[0] === expectedDate.toISOString().split('T')[0]) {
        currentStreak++;
      } else {
        break;
      }
    }

    const today = new Date().toISOString().split('T')[0];
    const todaySessions = sessions.filter(s => 
      s.startTime.toISOString().split('T')[0] === today && s.type === 'focus'
    );
    const lastSession = todaySessions[0];
    
    const params = new URLSearchParams({
      task_name: taskName || 'Untitled Task',
      work_time: settings.focusTime.toString(),
      break_time: settings.breakTime.toString(),
      session_start: lastSession ? lastSession.startTime.toISOString() : new Date().toISOString(),
      session_end: lastSession ? lastSession.endTime.toISOString() : new Date().toISOString(),
      user_id: 'focus_flow_user_' + Date.now(),
      total_focus_time: totalFocusTime.toString(),
      session_count: sessionCount.toString(),
      current_streak: currentStreak.toString(),
      date: today
    });

    const bubbleUrl = `https://task-51525.bubbleapps.io/version-test/?${params.toString()}`;
    
    console.log('Sending data to Bubble:', {
      task_name: taskName || 'Untitled Task',
      work_time: settings.focusTime,
      break_time: settings.breakTime,
      session_start: lastSession ? lastSession.startTime.toISOString() : new Date().toISOString(),
      session_end: lastSession ? lastSession.endTime.toISOString() : new Date().toISOString(),
      total_focus_time: totalFocusTime,
      session_count: sessionCount,
      current_streak: currentStreak,
      date: today
    });
    
    console.log('Full URL:', bubbleUrl);
    
    window.open(bubbleUrl, '_blank');
  };

  const requestNotificationPermission = async () => {
    if ('Notification' in window && Notification.permission === 'default') {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        console.log('Notification permission granted');
      }
    }
  };


  const progress = ((isBreak ? settings.breakTime * 60 : settings.focusTime * 60) - timeLeft) / (isBreak ? settings.breakTime * 60 : settings.focusTime * 60) * 100;

  const getTodayStats = () => {
    const today = new Date().toISOString().split('T')[0];
    const todayStats = dailyStats.find(stat => stat.date === today);
    return todayStats || { sessions: 0, minutes: 0 };
  };

  const stats = getTodayStats();

  return (
    <div className={`min-h-screen transition-colors duration-300 ${settings.darkMode ? 'bg-gray-900' : 'bg-gradient-to-br from-indigo-50 via-white to-cyan-50'}`}>
      {/* Navigation */}
      <nav className={`${settings.darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white/80 border-white/20'} backdrop-blur-md border-b transition-colors duration-300 h-14 md:h-16`}>
        <div className="max-w-7xl mx-auto px-3 md:px-6 h-full flex items-center justify-between">
          <div className="flex items-center space-x-2 md:space-x-3 flex-1 min-w-0">
            <div className="w-8 h-8 md:w-10 md:h-10 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center flex-shrink-0">
              <Play className="w-4 h-4 md:w-5 md:h-5 text-white" />
            </div>
            <div className="min-w-0 flex-1">
              <h1 className={`text-lg md:text-xl font-bold ${settings.darkMode ? 'text-white' : 'text-gray-900'} truncate`}>
                Focus Flow
              </h1>
              <p className={`text-xs ${settings.darkMode ? 'text-gray-400' : 'text-gray-600'} hidden sm:block`}>
                Boost your productivity
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-1 md:space-x-2 flex-shrink-0">
            <button
              onClick={sendToBubble}
              className={`px-2 md:px-3 py-1.5 md:py-2 text-xs md:text-sm font-medium rounded-lg transition-all duration-200 flex items-center space-x-1 md:space-x-2 mr-1 md:mr-2 ${
                settings.darkMode 
                  ? 'bg-indigo-600 hover:bg-indigo-700 text-white' 
                  : 'bg-indigo-600 hover:bg-indigo-700 text-white'
              }`}
            >
              <ExternalLink className="w-3 h-3 md:w-4 md:h-4" />
              <span className="hidden xs:inline">Send to Bubble</span>
              <span className="xs:hidden">Send</span>
            </button>
            
            <button
              onClick={() => setSettings(prev => ({ ...prev, darkMode: !prev.darkMode }))}
              className={`p-1.5 md:p-2 rounded-lg transition-colors duration-200 ${
                settings.darkMode 
                  ? 'text-gray-300 hover:text-white hover:bg-gray-700' 
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              {settings.darkMode ? <Sun className="w-4 h-4 md:w-5 md:h-5" /> : <Moon className="w-4 h-4 md:w-5 md:h-5" />}
            </button>
            
            <button
              onClick={() => setShowSettings(true)}
              className={`p-1.5 md:p-2 rounded-lg transition-colors duration-200 ${
                settings.darkMode 
                  ? 'text-gray-300 hover:text-white hover:bg-gray-700' 
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              <Settings className="w-4 h-4 md:w-5 md:h-5" />
            </button>
          </div>
        </div>
      </nav>

      {/* Motivational Quote */}
      <div className={`${settings.darkMode ? 'bg-gray-800/50' : 'bg-white/50'} backdrop-blur-sm border-b ${settings.darkMode ? 'border-gray-700' : 'border-gray-200'} transition-colors duration-300`}>
        <div className="max-w-4xl mx-auto px-4 py-3 md:py-4 text-center">
          <p className={`text-sm md:text-base ${settings.darkMode ? 'text-gray-300' : 'text-gray-700'} italic`}>
            "{currentQuote}"
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6 md:py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
          {/* Timer Section */}
          <div className="lg:col-span-2">
            <div className={`${settings.darkMode ? 'bg-gray-800/50' : 'bg-white/70'} backdrop-blur-sm rounded-2xl p-6 md:p-8 shadow-xl border ${settings.darkMode ? 'border-gray-700' : 'border-white/20'} transition-colors duration-300`}>
              {/* Timer Circle */}
              <div className="flex justify-center mb-6 md:mb-8">
                <div className="relative">
                  <svg className="w-48 h-48 md:w-64 md:h-64 transform -rotate-90" viewBox="0 0 100 100">
                    <circle
                      cx="50"
                      cy="50"
                      r="45"
                      stroke={settings.darkMode ? "#374151" : "#e5e7eb"}
                      strokeWidth="2"
                      fill="none"
                    />
                    <circle
                      cx="50"
                      cy="50"
                      r="45"
                      stroke={isBreak ? "#10b981" : "#6366f1"}
                      strokeWidth="2"
                      fill="none"
                      strokeDasharray={`${2 * Math.PI * 45}`}
                      strokeDashoffset={`${2 * Math.PI * 45 * (1 - progress / 100)}`}
                      className="transition-all duration-1000 ease-in-out"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                      <div className={`text-3xl md:text-4xl font-bold ${settings.darkMode ? 'text-white' : 'text-gray-900'} mb-1`}>
                        {formatTime(timeLeft)}
                      </div>
                      <div className={`text-sm md:text-base ${settings.darkMode ? 'text-gray-400' : 'text-gray-600'} font-medium`}>
                        {isBreak ? 'Break Time' : 'Focus Time'}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Controls */}
              <div className="flex justify-center space-x-3 md:space-x-4 mb-6 md:mb-8">
                <button
                  onClick={toggleTimer}
                  className={`flex items-center space-x-2 px-6 md:px-8 py-3 md:py-4 rounded-xl font-semibold transition-all duration-200 transform hover:scale-105 ${
                    isActive
                      ? settings.darkMode 
                        ? 'bg-red-600 hover:bg-red-700 text-white' 
                        : 'bg-red-500 hover:bg-red-600 text-white'
                      : settings.darkMode
                        ? 'bg-indigo-600 hover:bg-indigo-700 text-white'
                        : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                  }`}
                >
                  {isActive ? <Pause className="w-4 h-4 md:w-5 md:h-5" /> : <Play className="w-4 h-4 md:w-5 md:h-5" />}
                  <span className="text-sm md:text-base">{isActive ? 'Pause' : 'Start'}</span>
                </button>
                
                <button
                  onClick={resetTimer}
                  className={`flex items-center space-x-2 px-4 md:px-6 py-3 md:py-4 rounded-xl font-semibold transition-all duration-200 transform hover:scale-105 ${
                    settings.darkMode 
                      ? 'bg-gray-700 hover:bg-gray-600 text-gray-300' 
                      : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                  }`}
                >
                  <RotateCcw className="w-4 h-4 md:w-5 md:h-5" />
                  <span className="text-sm md:text-base">Reset</span>
                </button>
              </div>

              {/* Task Input */}
              <div className="mb-6">
                <label className={`block text-sm font-medium ${settings.darkMode ? 'text-gray-300' : 'text-gray-700'} mb-2`}>
                  What are you working on?
                </label>
                <input
                  type="text"
                  value={taskName}
                  onChange={(e) => setTaskName(e.target.value)}
                  placeholder="Enter your task..."
                  className={`w-full px-4 py-3 rounded-xl border transition-colors duration-200 ${
                    settings.darkMode 
                      ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:border-indigo-500' 
                      : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500 focus:border-indigo-500'
                  } focus:outline-none focus:ring-2 focus:ring-indigo-500/20`}
                />
              </div>

              {/* Quick Presets */}
              <div>
                <label className={`block text-sm font-medium ${settings.darkMode ? 'text-gray-300' : 'text-gray-700'} mb-3`}>
                  Quick Presets
                </label>
                <div className="grid grid-cols-2 md:flex md:flex-wrap gap-2">
                  {[5, 15, 25, 45].map((minutes) => (
                    <button
                      key={minutes}
                      onClick={() => setQuickTimer(minutes)}
                      className={`px-3 md:px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                        settings.darkMode 
                          ? 'bg-gray-700 hover:bg-gray-600 text-gray-300' 
                          : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                      }`}
                    >
                      {minutes}m
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Stats Sidebar */}
          <div className="space-y-6">
            {/* Today's Stats */}
            <div className={`${settings.darkMode ? 'bg-gray-800/50' : 'bg-white/70'} backdrop-blur-sm rounded-2xl p-6 shadow-xl border ${settings.darkMode ? 'border-gray-700' : 'border-white/20'} transition-colors duration-300`}>
              <h3 className={`text-lg font-semibold ${settings.darkMode ? 'text-white' : 'text-gray-900'} mb-4`}>Today's Progress</h3>
              <div className="space-y-4">
                <div className={`p-4 rounded-xl ${settings.darkMode ? 'bg-gray-700/50' : 'bg-indigo-50'}`}>
                  <div className={`text-2xl font-bold ${settings.darkMode ? 'text-indigo-400' : 'text-indigo-600'}`}>
                    {stats.sessions}
                  </div>
                  <div className={`text-sm ${settings.darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Sessions Completed</div>
                </div>
                <div className={`p-4 rounded-xl ${settings.darkMode ? 'bg-gray-700/50' : 'bg-green-50'}`}>
                  <div className={`text-2xl font-bold ${settings.darkMode ? 'text-green-400' : 'text-green-600'}`}>
                    {stats.minutes}
                  </div>
                  <div className={`text-sm ${settings.darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Minutes Focused</div>
                </div>
              </div>
            </div>

            {/* Recent Sessions */}
            <div className={`${settings.darkMode ? 'bg-gray-800/50' : 'bg-white/70'} backdrop-blur-sm rounded-2xl p-6 shadow-xl border ${settings.darkMode ? 'border-gray-700' : 'border-white/20'} transition-colors duration-300`}>
              <div className="flex items-center justify-between mb-4">
                <h3 className={`text-lg font-semibold ${settings.darkMode ? 'text-white' : 'text-gray-900'}`}>Recent Sessions</h3>
                <button
                  onClick={sendToBubble}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all duration-200 flex items-center space-x-1 ${
                    settings.darkMode 
                      ? 'bg-indigo-600 hover:bg-indigo-700 text-white' 
                      : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                  }`}
                >
                  <ExternalLink className="w-3 h-3" />
                  <span>View in Bubble App</span>
                </button>
              </div>
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {sessions.slice(0, 5).map((session, index) => (
                  <div key={index} className={`p-3 rounded-lg ${settings.darkMode ? 'bg-gray-700/50' : 'bg-gray-50'}`}>
                    <div className={`font-medium ${settings.darkMode ? 'text-white' : 'text-gray-900'} text-sm`}>
                      {session.taskName}
                    </div>
                    <div className={`text-xs ${settings.darkMode ? 'text-gray-400' : 'text-gray-600'} mt-1`}>
                      {session.duration}m • {session.startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                ))}
                {sessions.length === 0 && (
                  <div className={`text-center py-8 ${settings.darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    <p className="text-sm">No sessions yet</p>
                    <p className="text-xs mt-1">Start your first focus session!</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className={`${settings.darkMode ? 'bg-gray-800' : 'bg-white'} rounded-2xl p-6 w-full max-w-md shadow-2xl transition-colors duration-300`}>
            <h2 className={`text-xl font-semibold ${settings.darkMode ? 'text-white' : 'text-gray-900'} mb-6`}>Settings</h2>
            
            <div className="space-y-6">
              {/* Timer Duration */}
              <div>
                <h3 className={`text-sm font-medium ${settings.darkMode ? 'text-gray-300' : 'text-gray-700'} mb-3`}>Timer Duration</h3>
                <div className="space-y-3">
                  <div>
                    <label className={`block text-sm ${settings.darkMode ? 'text-gray-400' : 'text-gray-600'} mb-1`}>
                      Focus Time: {settings.focusTime} minutes
                    </label>
                    <input
                      type="range"
                      min="5"
                      max="60"
                      value={settings.focusTime}
                      onChange={(e) => setSettings(prev => ({ ...prev, focusTime: parseInt(e.target.value) }))}
                      className="w-full"
                    />
                  </div>
                  <div>
                    <label className={`block text-sm ${settings.darkMode ? 'text-gray-400' : 'text-gray-600'} mb-1`}>
                      Break Time: {settings.breakTime} minutes
                    </label>
                    <input
                      type="range"
                      min="1"
                      max="30"
                      value={settings.breakTime}
                      onChange={(e) => setSettings(prev => ({ ...prev, breakTime: parseInt(e.target.value) }))}
                      className="w-full"
                    />
                  </div>
                </div>
              </div>

              {/* Preferences */}
              <div>
                <h3 className={`text-sm font-medium ${settings.darkMode ? 'text-gray-300' : 'text-gray-700'} mb-3`}>Preferences</h3>
                <div className="space-y-3">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={settings.darkMode}
                      onChange={(e) => setSettings(prev => ({ ...prev, darkMode: e.target.checked }))}
                      className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className={`ml-2 text-sm ${settings.darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Dark Mode</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={settings.soundEnabled}
                      onChange={(e) => setSettings(prev => ({ ...prev, soundEnabled: e.target.checked }))}
                      className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className={`ml-2 text-sm ${settings.darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Sound Notifications</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={settings.notificationsEnabled}
                      onChange={(e) => setSettings(prev => ({ ...prev, notificationsEnabled: e.target.checked }))}
                      className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className={`ml-2 text-sm ${settings.darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Browser Notifications</span>
                  </label>
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-8">
              <button
                onClick={() => setShowSettings(false)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors duration-200 ${
                  settings.darkMode 
                    ? 'bg-gray-700 hover:bg-gray-600 text-gray-300' 
                    : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                }`}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
