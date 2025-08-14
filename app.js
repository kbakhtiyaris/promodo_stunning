// Application Data
const APP_DATA = {
  motivationalQuotes: {
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
  },

  presets: [
    { name: "Classic", work: 25, break: 5 },
    { name: "Extended", work: 45, break: 15 },
    { name: "Marathon", work: 90, break: 20 }
  ],

  bubbleConfig: {
    // CHANGE THIS TO YOUR BUBBLE URL
    baseUrl: "https://task-51525.bubbleapps.io/version-test/task_manager"
  }
};

// Main Application Class - FIXED VERSION
class StunningPomodoroTimer {
  constructor() {
    this.timer = null;
    this.totalTime = 0;
    this.timeLeft = 0;
    this.isRunning = false;
    this.isPaused = false;
    this.isBreakTime = false;
    this.currentTask = '';
    this.workMinutes = 25;
    this.breakMinutes = 5;
    this.sessionStartTime = null;
    this.sessionEndTime = null;

    // Generate unique user ID
    this.userId = this.generateUserId();

    // Load saved data
    this.loadUserData();

    // Initialize app
    this.init();
  }

  generateUserId() {
    let userId = localStorage.getItem('focusflow_user_id');
    if (!userId) {
      userId = 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
      localStorage.setItem('focusflow_user_id', userId);
    }
    return userId;
  }

  loadUserData() {
    // Check if returning user from Bubble
    const urlParams = new URLSearchParams(window.location.search);
    const urlUserId = urlParams.get('user_id');

    if (urlUserId) {
      this.userId = urlUserId;
      localStorage.setItem('focusflow_user_id', urlUserId);
      this.showWelcomeBack();
    }

    // Load today's sessions
    this.loadTodaysSessions();
  }

  showWelcomeBack() {
    const welcomeMsg = document.getElementById('welcomeMessage');
    if (welcomeMsg) {
      welcomeMsg.style.display = 'block';
      setTimeout(() => {
        welcomeMsg.style.display = 'none';
      }, 5000);
    }
  }

  init() {
    this.setupEventListeners();
    this.updateDisplay();
    this.displayTodaysStats();
    this.displaySessionHistory();
  }

  setupEventListeners() {
    // Timer controls
    const startBtn = document.getElementById('startBtn');
    const pauseBtn = document.getElementById('pauseBtn');
    const resetBtn = document.getElementById('resetBtn');

    if (startBtn) startBtn.addEventListener('click', () => this.startTimer());
    if (pauseBtn) pauseBtn.addEventListener('click', () => this.pauseTimer());
    if (resetBtn) resetBtn.addEventListener('click', () => this.resetTimer());

    // Task input
    const taskInput = document.getElementById('taskInput');
    if (taskInput) {
      taskInput.addEventListener('input', (e) => {
        this.currentTask = e.target.value;
      });
    }

    // Time inputs
    const workInput = document.getElementById('workMinutes');
    const breakInput = document.getElementById('breakMinutes');

    if (workInput) {
      workInput.addEventListener('change', (e) => {
        this.workMinutes = parseInt(e.target.value) || 25;
        if (!this.isRunning) this.updateDisplay();
      });
    }

    if (breakInput) {
      breakInput.addEventListener('change', (e) => {
        this.breakMinutes = parseInt(e.target.value) || 5;
      });
    }

    // Preset buttons
    document.querySelectorAll('.preset-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const work = parseInt(e.currentTarget.dataset.work);
        const breakTime = parseInt(e.currentTarget.dataset.break);

        this.workMinutes = work;
        this.breakMinutes = breakTime;

        if (workInput) workInput.value = work;
        if (breakInput) breakInput.value = breakTime;

        document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
        e.currentTarget.classList.add('active');

        if (!this.isRunning) this.updateDisplay();
      });
    });

    // Send to Bubble button
    const sendToBubbleBtn = document.getElementById('sendToBubbleBtn');
    if (sendToBubbleBtn) {
      sendToBubbleBtn.addEventListener('click', () => this.sendToBubble());
    }

    // Start new session button
    const startNewBtn = document.getElementById('startNewSessionBtn');
    if (startNewBtn) {
      startNewBtn.addEventListener('click', () => this.startNewSession());
    }

    // Settings
    const settingsBtn = document.getElementById('settingsBtn');
    const settingsModal = document.getElementById('settingsModal');
    const closeSettings = document.getElementById('closeSettings');

    if (settingsBtn) settingsBtn.addEventListener('click', () => {
      if (settingsModal) settingsModal.style.display = 'block';
    });

    if (closeSettings) closeSettings.addEventListener('click', () => {
      if (settingsModal) settingsModal.style.display = 'none';
    });
  }

  startTimer() {
    if (!this.currentTask.trim()) {
      alert('Please enter what you\'re working on!');
      document.getElementById('taskInput').focus();
      return;
    }

    this.isRunning = true;
    this.sessionStartTime = new Date().toISOString();

    if (this.timeLeft === 0) {
      this.totalTime = this.workMinutes * 60;
      this.timeLeft = this.totalTime;
    }

    this.timer = setInterval(() => {
      this.timeLeft--;
      this.updateDisplay();

      if (this.timeLeft <= 0) {
        this.completeSession();
      }
    }, 1000);

    document.getElementById('startBtn').style.display = 'none';
    document.getElementById('pauseBtn').style.display = 'inline-block';
  }

  pauseTimer() {
    this.isRunning = false;
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }

    document.getElementById('startBtn').style.display = 'inline-block';
    document.getElementById('pauseBtn').style.display = 'none';
  }

  resetTimer() {
    this.isRunning = false;
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }

    this.timeLeft = 0;
    this.totalTime = 0;
    this.sessionStartTime = null;

    document.getElementById('startBtn').style.display = 'inline-block';
    document.getElementById('pauseBtn').style.display = 'none';
    document.getElementById('sessionComplete').style.display = 'none';

    this.updateDisplay();
  }

  completeSession() {
    this.isRunning = false;
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }

    this.sessionEndTime = new Date().toISOString();

    // Save session
    this.saveSession();

    // Show completion
    this.showSessionComplete();

    // Update stats
    this.displayTodaysStats();
    this.displaySessionHistory();
  }

  saveSession() {
    const session = {
      taskName: this.currentTask,
      workMinutes: this.workMinutes,
      breakMinutes: this.breakMinutes,
      startTime: this.sessionStartTime,
      endTime: this.sessionEndTime,
      date: new Date().toISOString().split('T')[0],
      userId: this.userId
    };

    // Get existing sessions
    let sessions = JSON.parse(localStorage.getItem('focusflow_sessions') || '[]');
    sessions.push(session);

    // Save to localStorage
    localStorage.setItem('focusflow_sessions', JSON.stringify(sessions));

    console.log('Session saved:', session);
  }

  showSessionComplete() {
    document.getElementById('sessionComplete').style.display = 'block';
    document.getElementById('startBtn').style.display = 'inline-block';
    document.getElementById('pauseBtn').style.display = 'none';

    // Show confetti or celebration effect here
    this.showConfetti();
  }

  showConfetti() {
    // Simple confetti effect
    console.log('🎉 Session completed!');
  }

  sendToBubble() {
    const todaysStats = this.getTodaysStats();

    // Build URL with all parameters
    const params = new URLSearchParams({
      task_name: this.currentTask,
      work_time: this.workMinutes,
      break_time: this.breakMinutes,
      session_start: this.sessionStartTime,
      session_end: this.sessionEndTime,
      user_id: this.userId,
      total_focus_time: todaysStats.totalMinutes,
      session_count: todaysStats.sessionCount
    });

    const fullUrl = `${APP_DATA.bubbleConfig.baseUrl}?${params.toString()}`;

    console.log('Sending to Bubble:', fullUrl);

    // Redirect to Bubble
    window.location.href = fullUrl;
  }

  startNewSession() {
    this.resetTimer();
    document.getElementById('sessionComplete').style.display = 'none';
    document.getElementById('taskInput').focus();
  }

  loadTodaysSessions() {
    const today = new Date().toISOString().split('T')[0];
    const allSessions = JSON.parse(localStorage.getItem('focusflow_sessions') || '[]');

    this.todaysSessions = allSessions.filter(session => 
      session.date === today && session.userId === this.userId
    );

    console.log('Today\'s sessions loaded:', this.todaysSessions);
  }

  getTodaysStats() {
    const totalMinutes = this.todaysSessions.reduce((sum, session) => sum + session.workMinutes, 0);
    const sessionCount = this.todaysSessions.length;

    return { totalMinutes, sessionCount };
  }

  displayTodaysStats() {
    const stats = this.getTodaysStats();

    const focusTimeEl = document.getElementById('todayFocusTime');
    const sessionCountEl = document.getElementById('todaySessionCount');
    const streakEl = document.getElementById('currentStreak');

    if (focusTimeEl) focusTimeEl.textContent = stats.totalMinutes;
    if (sessionCountEl) sessionCountEl.textContent = stats.sessionCount;
    if (streakEl) streakEl.textContent = this.calculateStreak();
  }

  calculateStreak() {
    // Simple streak calculation - days with at least one session
    const allSessions = JSON.parse(localStorage.getItem('focusflow_sessions') || '[]');
    const userSessions = allSessions.filter(s => s.userId === this.userId);

    if (userSessions.length === 0) return 0;

    const uniqueDates = [...new Set(userSessions.map(s => s.date))].sort().reverse();

    let streak = 0;
    const today = new Date().toISOString().split('T')[0];

    for (let i = 0; i < uniqueDates.length; i++) {
      const expectedDate = new Date();
      expectedDate.setDate(expectedDate.getDate() - i);
      const expectedDateStr = expectedDate.toISOString().split('T')[0];

      if (uniqueDates[i] === expectedDateStr) {
        streak++;
      } else {
        break;
      }
    }

    return streak;
  }

  displaySessionHistory() {
    const historyEl = document.getElementById('sessionHistory');
    if (!historyEl) return;

    if (this.todaysSessions.length === 0) {
      historyEl.innerHTML = '<p class="no-sessions">Complete your first session to see history here!</p>';
      return;
    }

    const historyHtml = this.todaysSessions
      .slice(-5) // Show last 5 sessions
      .reverse()
      .map(session => `
        <div class="session-item">
          <div class="session-task">${session.taskName}</div>
          <div class="session-time">${session.workMinutes} min</div>
          <div class="session-date">${new Date(session.endTime).toLocaleTimeString()}</div>
        </div>
      `).join('');

    historyEl.innerHTML = historyHtml;
  }

  updateDisplay() {
    const timeDisplay = document.getElementById('timeDisplay');
    const taskDisplay = document.getElementById('taskDisplay');
    const progressCircle = document.getElementById('progressCircle');

    if (!this.isRunning && this.timeLeft === 0) {
      // Show initial state
      const minutes = this.workMinutes;
      if (timeDisplay) timeDisplay.textContent = `${minutes}:00`;
      if (taskDisplay) taskDisplay.textContent = this.currentTask || 'Ready to focus?';
    } else {
      // Show countdown
      const minutes = Math.floor(this.timeLeft / 60);
      const seconds = this.timeLeft % 60;
      const timeStr = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

      if (timeDisplay) timeDisplay.textContent = timeStr;
      if (taskDisplay) taskDisplay.textContent = this.currentTask;

      // Update progress circle
      if (progressCircle && this.totalTime > 0) {
        const progress = (this.totalTime - this.timeLeft) / this.totalTime;
        const circumference = 2 * Math.PI * 140; // radius = 140
        const strokeDasharray = circumference;
        const strokeDashoffset = circumference * (1 - progress);

        progressCircle.style.strokeDasharray = strokeDasharray;
        progressCircle.style.strokeDashoffset = strokeDashoffset;
      }
    }
  }
}

// Initialize the app when page loads
document.addEventListener('DOMContentLoaded', () => {
  console.log('Initializing FocusFlow...');
  window.pomodoroApp = new StunningPomodoroTimer();
});