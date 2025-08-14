// Application Data
const APP_DATA = {
  motivationalQuotes: {
    work: [
      "Focus is the gateway to excellence.",
      "Every master was once a beginner.",
      "Success is built one focused minute at a time.",
      "Your future self will thank you for this focus.",
      "Great things happen when you focus.",
      "This moment of focus creates tomorrow's success.",
      "The successful warrior is the average man with laser-like focus. - Bruce Lee",
      "Concentrate all your thoughts upon the work at hand. - Alexander Graham Bell",
      "Focus on being productive instead of busy. - Tim Ferriss",
      "Excellence is not a skill, it's an attitude. - Ralph Marston"
    ],
    break: [
      "Rest is not idleness, it's preparation for greatness.",
      "A well-rested mind is unstoppable.",
      "You've earned this moment of peace.",
      "Recharge your brilliance.",
      "Every break brings you closer to your goals.",
      "Take time to recharge. You can't pour from an empty cup.",
      "Sometimes the most productive thing you can do is relax. - Mark Black",
      "Your mind needs rest to perform at its best.",
      "Great achievements require great recoveries.",
      "A rested mind is a creative mind."
    ]
  },
  
  presets: [
    { name: "Classic", work: 25, break: 5 },
    { name: "Extended", work: 45, break: 15 },
    { name: "Marathon", work: 90, break: 20 }
  ],
  
  bubbleConfig: {
    baseUrl: "https://YOUR-BUBBLE-APP.bubbleapps.io/version-test/task_manager"
  },
  
  achievements: [
    { name: "First Session", description: "Complete your first focus session" },
    { name: "Daily Warrior", description: "Complete 5 sessions in one day" },
    { name: "Week Streak", description: "Focus for 7 days in a row" },
    { name: "Century Club", description: "Complete 100 total sessions" }
  ]
};

// Main Application Class
class StunningPomodoroTimer {
  constructor() {
    this.timer = null;
    this.totalTime = 0;
    this.timeLeft = 0;
    this.isRunning = false;
    this.isBreak = false;
    this.sessionStartTime = null;
    this.currentTask = '';
    this.userId = this.generateUserId();
    
    this.settings = {
      workTime: 25,
      breakTime: 5,
      bubbleUrl: APP_DATA.bubbleConfig.baseUrl
    };
    
    this.sessions = [];
    this.currentQuote = '';
    
    this.init();
  }
  
  // Initialize the application
  init() {
    this.loadSettings();
    this.checkUrlParameters();
    this.bindEvents();
    this.updateTimerDisplay();
    this.showRandomQuote('work');
    this.loadTodaysSessions();
    this.updateProgressRing();
    this.animateOnLoad();
  }
  
  // Generate unique user ID
  generateUserId() {
    const existingId = localStorage.getItem('focusflow_user_id');
    if (existingId) {
      return existingId;
    }
    
    const newId = 'user_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
    localStorage.setItem('focusflow_user_id', newId);
    return newId;
  }
  
  // Check URL parameters for user data
  checkUrlParameters() {
    const urlParams = new URLSearchParams(window.location.search);
    const userId = urlParams.get('user_id');
    
    if (userId && userId !== this.userId) {
      this.userId = userId;
      localStorage.setItem('focusflow_user_id', userId);
      this.loadUserData(userId);
      this.showWelcomeMessage();
    }
  }
  
  // Load user data and show welcome message
  loadUserData(userId) {
    try {
      const userSessions = JSON.parse(localStorage.getItem(`focusflow_sessions_${userId}`)) || [];
      if (userSessions.length > 0) {
        this.sessions = userSessions;
        this.showUserStats(userSessions);
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  }
  
  // Show welcome message with animation
  showWelcomeMessage() {
    const welcomeSection = document.getElementById('welcomeSection');
    const welcomeText = document.getElementById('welcomeText');
    
    welcomeText.textContent = `Your focus journey continues! Welcome back to your productivity sanctuary.`;
    
    welcomeSection.classList.remove('hidden');
    welcomeSection.classList.add('fade-in');
    
    setTimeout(() => {
      welcomeSection.classList.add('slide-up');
    }, 100);
  }
  
  // Show user statistics
  showUserStats(sessions) {
    const statsGrid = document.getElementById('statsGrid');
    const today = new Date().toDateString();
    
    const todaySessions = sessions.filter(s => new Date(s.date).toDateString() === today);
    const totalFocusTime = sessions.reduce((total, s) => total + (s.type === 'work' ? s.duration : 0), 0);
    const totalSessions = sessions.filter(s => s.type === 'work').length;
    const avgSessionLength = totalSessions > 0 ? Math.round(totalFocusTime / totalSessions / 60) : 0;
    
    statsGrid.innerHTML = `
      <div class="stat-item">
        <div class="stat-value">${todaySessions.length}</div>
        <div class="stat-label">Today's Sessions</div>
      </div>
      <div class="stat-item">
        <div class="stat-value">${totalSessions}</div>
        <div class="stat-label">Total Sessions</div>
      </div>
      <div class="stat-item">
        <div class="stat-value">${Math.round(totalFocusTime / 3600)}h</div>
        <div class="stat-label">Total Focused</div>
      </div>
      <div class="stat-item">
        <div class="stat-value">${avgSessionLength}m</div>
        <div class="stat-label">Avg Session</div>
      </div>
    `;
  }
  
  // Settings Management
  loadSettings() {
    try {
      const saved = localStorage.getItem('focusflow_settings');
      if (saved) {
        this.settings = { ...this.settings, ...JSON.parse(saved) };
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  }
  
  saveSettings() {
    try {
      localStorage.setItem('focusflow_settings', JSON.stringify(this.settings));
    } catch (error) {
      console.error('Error saving settings:', error);
    }
  }
  
  // Timer Functions
  startTimer() {
    // Get task name if starting work session
    if (!this.isBreak && !this.currentTask) {
      this.currentTask = document.getElementById('taskInput').value.trim();
      if (!this.currentTask) {
        this.showNotification('Please enter a task name before starting!', 'warning');
        document.getElementById('taskInput').focus();
        return;
      }
    }
    
    this.isRunning = true;
    this.sessionStartTime = new Date();
    
    if (this.timeLeft === 0) {
      this.totalTime = this.isBreak ? this.settings.breakTime * 60 : this.settings.workTime * 60;
      this.timeLeft = this.totalTime;
    }
    
    this.timer = setInterval(() => {
      this.timeLeft--;
      this.updateTimerDisplay();
      this.updateProgressRing();
      
      if (this.timeLeft <= 0) {
        this.completeSession();
      }
    }, 1000);
    
    this.updateUI();
    this.updateTimerCardMode();
    this.showRandomQuote(this.isBreak ? 'break' : 'work');
    
    // Hide task setup when running
    if (!this.isBreak) {
      this.hideTaskSetup();
    }
  }
  
  pauseTimer() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this.isRunning = false;
    this.updateUI();
    this.updateTimerCardMode();
  }
  
  resetTimer() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    
    this.isRunning = false;
    this.timeLeft = 0;
    this.totalTime = 0;
    this.sessionStartTime = null;
    
    this.updateTimerDisplay();
    this.updateProgressRing();
    this.updateUI();
    this.updateTimerCardMode();
    
    if (!this.isBreak) {
      this.showTaskSetup();
      this.currentTask = '';
      document.getElementById('taskInput').value = '';
    }
    
    this.hideBubbleSection();
  }
  
  skipSession() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    
    this.isRunning = false;
    this.isBreak = !this.isBreak;
    this.timeLeft = 0;
    this.totalTime = 0;
    this.sessionStartTime = null;
    
    this.updateTimerDisplay();
    this.updateProgressRing();
    this.updateUI();
    this.updateTimerCardMode();
    this.showRandomQuote(this.isBreak ? 'break' : 'work');
    
    if (!this.isBreak) {
      this.showTaskSetup();
      this.currentTask = '';
      document.getElementById('taskInput').value = '';
    }
    
    this.hideBubbleSection();
  }
  
  completeSession() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this.isRunning = false;
    
    const sessionData = {
      id: 'session_' + Date.now(),
      date: new Date().toISOString(),
      task: this.currentTask,
      type: this.isBreak ? 'break' : 'work',
      duration: this.totalTime,
      startTime: this.sessionStartTime,
      endTime: new Date()
    };
    
    this.saveSession(sessionData);
    this.showSuccessModal(sessionData);
    
    // Switch to break/work mode
    this.isBreak = !this.isBreak;
    this.timeLeft = 0;
    this.totalTime = 0;
    
    this.updateTimerDisplay();
    this.updateProgressRing();
    this.updateUI();
    this.updateTimerCardMode();
    this.loadTodaysSessions();
    
    // Show bubble section after work session
    if (this.isBreak) {
      this.showBubbleSection();
    } else {
      this.currentTask = '';
      document.getElementById('taskInput').value = '';
      this.showTaskSetup();
      this.hideBubbleSection();
    }
    
    // Play completion sound (if available)
    this.playCompletionSound();
    
    // Show random encouraging quote
    this.showRandomQuote(this.isBreak ? 'break' : 'work');
  }
  
  // Session Management
  saveSession(sessionData) {
    try {
      const key = `focusflow_sessions_${this.userId}`;
      let sessions = JSON.parse(localStorage.getItem(key)) || [];
      sessions.push(sessionData);
      localStorage.setItem(key, JSON.stringify(sessions));
      this.sessions = sessions;
    } catch (error) {
      console.error('Error saving session:', error);
    }
  }
  
  loadTodaysSessions() {
    try {
      const key = `focusflow_sessions_${this.userId}`;
      const sessions = JSON.parse(localStorage.getItem(key)) || [];
      const today = new Date().toDateString();
      const todaySessions = sessions.filter(session => 
        new Date(session.date).toDateString() === today
      );
      
      this.displaySessions(todaySessions);
      this.updateHistorySummary(todaySessions);
    } catch (error) {
      console.error('Error loading sessions:', error);
      this.displaySessions([]);
    }
  }
  
  displaySessions(sessions) {
    const historyList = document.getElementById('historyList');
    
    if (sessions.length === 0) {
      historyList.innerHTML = `
        <div class="empty-history fade-in">
          <div class="empty-icon">🎯</div>
          <p>Start your first session to build your focus streak!</p>
        </div>
      `;
      return;
    }
    
    const sessionsHTML = sessions.map((session, index) => {
      const duration = Math.floor(session.duration / 60);
      const time = new Date(session.date).toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit' 
      });
      
      const typeIcon = session.type === 'work' ? '🎯' : '☕';
      const typeColor = session.type === 'work' ? 'work-session' : 'break-session';
      
      return `
        <div class="history-item ${typeColor} fade-in" style="animation-delay: ${index * 0.1}s">
          <div class="session-info">
            <div class="session-task">
              ${typeIcon} ${session.task || (session.type === 'break' ? 'Break Time' : 'Focus Session')}
            </div>
            <div class="session-time">${time} • ${duration}min</div>
          </div>
          <div class="session-badge">${session.type}</div>
        </div>
      `;
    }).join('');
    
    historyList.innerHTML = sessionsHTML;
  }
  
  updateHistorySummary(sessions) {
    const workSessions = sessions.filter(s => s.type === 'work');
    const totalFocusTime = workSessions.reduce((total, s) => total + s.duration, 0);
    
    document.getElementById('totalSessions').textContent = workSessions.length;
    document.getElementById('totalTime').textContent = `${Math.round(totalFocusTime / 3600)}h`;
  }
  
  // UI Updates
  updateTimerDisplay() {
    if (this.timeLeft === 0 && this.totalTime === 0) {
      // Set default time display
      const defaultTime = this.isBreak ? this.settings.breakTime : this.settings.workTime;
      const minutes = Math.floor(defaultTime);
      const seconds = 0;
      const display = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
      document.getElementById('timerTime').textContent = display;
    } else {
      const minutes = Math.floor(this.timeLeft / 60);
      const seconds = this.timeLeft % 60;
      const display = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
      document.getElementById('timerTime').textContent = display;
    }
    
    document.getElementById('timerLabel').textContent = this.isBreak ? 'Break Time' : 'Focus Time';
    
    // Update page title
    if (this.isRunning && this.timeLeft > 0) {
      const minutes = Math.floor(this.timeLeft / 60);
      const seconds = this.timeLeft % 60;
      const display = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
      document.title = `${display} - ${this.isBreak ? 'Break' : 'Focus'} - FocusFlow`;
    } else {
      document.title = 'FocusFlow - Stunning Pomodoro Timer';
    }
  }
  
  updateProgressRing() {
    const circle = document.querySelector('.progress-circle');
    const circumference = 2 * Math.PI * 90; // radius is 90
    
    if (this.totalTime > 0) {
      const progress = (this.totalTime - this.timeLeft) / this.totalTime;
      const offset = circumference - (progress * circumference);
      circle.style.strokeDashoffset = offset;
    } else {
      circle.style.strokeDashoffset = circumference;
    }
  }
  
  updateTimerCardMode() {
    const timerCard = document.querySelector('.timer-card-3d');
    const root = document.documentElement;
    
    timerCard.classList.remove('work-mode', 'break-mode', 'running');
    
    if (this.isRunning) {
      timerCard.classList.add('running');
    }
    
    if (this.isBreak) {
      timerCard.classList.add('break-mode');
      root.style.setProperty('--gradient-start', 'var(--break-gradient-start)');
      root.style.setProperty('--gradient-end', 'var(--break-gradient-end)');
    } else {
      timerCard.classList.add('work-mode');
      root.style.setProperty('--gradient-start', 'var(--work-gradient-start)');
      root.style.setProperty('--gradient-end', 'var(--work-gradient-end)');
    }
  }
  
  updateUI() {
    const playPauseBtn = document.getElementById('playPauseBtn');
    const playIcon = playPauseBtn.querySelector('.play-icon');
    const pauseIcon = playPauseBtn.querySelector('.pause-icon');
    const btnText = playPauseBtn.querySelector('.btn-text');
    
    if (this.isRunning) {
      playIcon.classList.add('hidden');
      pauseIcon.classList.remove('hidden');
      btnText.textContent = 'Pause';
    } else {
      playIcon.classList.remove('hidden');
      pauseIcon.classList.add('hidden');
      btnText.textContent = this.isBreak ? 'Start Break' : 'Start Focus';
    }
  }
  
  // Quote Management
  showRandomQuote(type) {
    const quotes = APP_DATA.motivationalQuotes[type];
    const randomQuote = quotes[Math.floor(Math.random() * quotes.length)];
    
    const quoteText = document.getElementById('quoteText');
    quoteText.style.opacity = '0';
    quoteText.style.transform = 'translateY(20px)';
    
    setTimeout(() => {
      quoteText.textContent = randomQuote;
      quoteText.style.opacity = '1';
      quoteText.style.transform = 'translateY(0)';
    }, 300);
  }
  
  // Task Setup Management
  showTaskSetup() {
    const taskSetup = document.getElementById('taskSetupSection');
    taskSetup.classList.remove('hidden');
    taskSetup.classList.add('fade-in');
  }
  
  hideTaskSetup() {
    const taskSetup = document.getElementById('taskSetupSection');
    taskSetup.style.transition = 'all 0.3s ease';
    taskSetup.style.transform = 'translateY(-20px)';
    taskSetup.style.opacity = '0';
    
    setTimeout(() => {
      taskSetup.classList.add('hidden');
    }, 300);
  }
  
  // Bubble Integration
  showBubbleSection() {
    const bubbleSection = document.getElementById('bubbleSection');
    bubbleSection.classList.remove('hidden');
    bubbleSection.classList.add('fade-in');
    
    setTimeout(() => {
      bubbleSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 500);
  }
  
  hideBubbleSection() {
    const bubbleSection = document.getElementById('bubbleSection');
    bubbleSection.classList.add('hidden');
  }
  
  buildBubbleUrl() {
    try {
      const totalFocusTime = this.sessions
        .filter(s => s.type === 'work')
        .reduce((total, s) => total + s.duration, 0);
      
      const latestSession = this.sessions[this.sessions.length - 1];
      
      const params = new URLSearchParams({
        user_id: this.userId,
        task_name: latestSession?.task || this.currentTask || '',
        work_time: this.settings.workTime.toString(),
        break_time: this.settings.breakTime.toString(),
        session_start: latestSession?.startTime || '',
        session_end: latestSession?.endTime || '',
        total_focus_time: Math.floor(totalFocusTime / 60).toString(),
        session_count: this.sessions.filter(s => s.type === 'work').length.toString()
      });
      
      return `${this.settings.bubbleUrl}?${params.toString()}`;
    } catch (error) {
      console.error('Error building Bubble URL:', error);
      return this.settings.bubbleUrl;
    }
  }
  
  redirectToBubble() {
    const url = this.buildBubbleUrl();
    window.open(url, '_blank');
    
    // Hide bubble section after sending
    setTimeout(() => {
      this.hideBubbleSection();
    }, 1000);
    
    this.showNotification('Successfully sent to Task Manager! 🚀', 'success');
  }
  
  // Preset Management
  setPreset(workTime, breakTime) {
    if (this.isRunning) {
      this.showNotification('Please stop the timer before changing presets.', 'warning');
      return;
    }
    
    this.settings.workTime = parseInt(workTime);
    this.settings.breakTime = parseInt(breakTime);
    this.saveSettings();
    
    // Reset timer display when changing presets
    if (!this.isRunning) {
      this.timeLeft = 0;
      this.totalTime = 0;
      this.updateTimerDisplay();
      this.updateProgressRing();
    }
    
    this.updatePresetButtons();
    this.showNotification(`Preset updated: ${workTime}/${breakTime} minutes`, 'success');
  }
  
  updatePresetButtons() {
    const presetButtons = document.querySelectorAll('.preset-btn');
    presetButtons.forEach(btn => {
      btn.classList.remove('active');
      const work = parseInt(btn.dataset.work);
      const breakTime = parseInt(btn.dataset.break);
      
      if (work === this.settings.workTime && breakTime === this.settings.breakTime) {
        btn.classList.add('active');
      }
    });
  }
  
  // Modal Management
  showSuccessModal(sessionData) {
    const modal = document.getElementById('successModal');
    const title = document.getElementById('successTitle');
    const message = document.getElementById('successMessage');
    const stats = document.getElementById('sessionStats');
    
    const duration = Math.floor(sessionData.duration / 60);
    const successMessages = [
      '🎉 Outstanding Focus Session!',
      '⭐ Incredible Concentration!',
      '🔥 Amazing Productivity!',
      '💪 Focus Master at Work!',
      '🚀 Stellar Performance!'
    ];
    
    title.textContent = successMessages[Math.floor(Math.random() * successMessages.length)];
    message.textContent = `You completed ${duration} minutes of ${sessionData.type === 'work' ? 'focused work' : 'refreshing break'}!`;
    
    if (sessionData.type === 'work') {
      stats.innerHTML = `
        <div class="session-stat">
          <strong>Task:</strong> ${sessionData.task}
        </div>
        <div class="session-stat">
          <strong>Duration:</strong> ${duration} minutes
        </div>
        <div class="session-stat">
          <strong>Completed:</strong> ${new Date(sessionData.endTime).toLocaleTimeString()}
        </div>
      `;
    }
    
    modal.classList.remove('hidden');
    
    // Auto-hide after 5 seconds
    setTimeout(() => {
      if (!modal.classList.contains('hidden')) {
        this.hideModal('successModal');
      }
    }, 5000);
  }
  
  showSettingsModal() {
    const modal = document.getElementById('settingsModal');
    
    // Update form values
    document.getElementById('workSlider').value = this.settings.workTime;
    document.getElementById('breakSlider').value = this.settings.breakTime;
    document.getElementById('bubbleUrlInput').value = this.settings.bubbleUrl;
    document.getElementById('workValue').textContent = `${this.settings.workTime} min`;
    document.getElementById('breakValue').textContent = `${this.settings.breakTime} min`;
    
    modal.classList.remove('hidden');
  }
  
  hideModal(modalId) {
    const modal = document.getElementById(modalId);
    modal.classList.add('hidden');
  }
  
  saveSettingsFromModal() {
    const workTime = parseInt(document.getElementById('workSlider').value);
    const breakTime = parseInt(document.getElementById('breakSlider').value);
    const bubbleUrl = document.getElementById('bubbleUrlInput').value.trim();
    
    this.settings.workTime = workTime;
    this.settings.breakTime = breakTime;
    this.settings.bubbleUrl = bubbleUrl || this.settings.bubbleUrl;
    
    this.saveSettings();
    this.hideModal('settingsModal');
    this.updatePresetButtons();
    
    if (!this.isRunning) {
      this.timeLeft = 0;
      this.totalTime = 0;
      this.updateTimerDisplay();
      this.updateProgressRing();
    }
    
    this.showNotification('Settings saved successfully! ⚙️', 'success');
  }
  
  // Theme Management
  toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-color-scheme') ||
                        (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    
    document.documentElement.setAttribute('data-color-scheme', newTheme);
    localStorage.setItem('theme', newTheme);
    
    this.showNotification(`Switched to ${newTheme} theme! 🎨`, 'info');
  }
  
  loadTheme() {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
      document.documentElement.setAttribute('data-color-scheme', savedTheme);
    }
  }
  
  // Utility Functions
  showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 16px 24px;
      background: var(--glass-bg);
      border: 1px solid var(--glass-border);
      border-radius: var(--radius-lg);
      backdrop-filter: blur(20px);
      color: var(--color-text);
      font-weight: 500;
      box-shadow: var(--glass-shadow);
      z-index: 3000;
      transform: translateX(400px);
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      max-width: 300px;
    `;
    
    notification.textContent = message;
    document.body.appendChild(notification);
    
    // Animate in
    setTimeout(() => {
      notification.style.transform = 'translateX(0)';
    }, 10);
    
    // Animate out and remove
    setTimeout(() => {
      notification.style.transform = 'translateX(400px)';
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
      }, 300);
    }, 3000);
  }
  
  playCompletionSound() {
    // Create completion sound (if AudioContext is available)
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
      oscillator.frequency.setValueAtTime(1200, audioContext.currentTime + 0.1);
      oscillator.frequency.setValueAtTime(800, audioContext.currentTime + 0.2);
      
      gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.3);
    } catch (error) {
      // Silent fail if audio is not available
    }
  }
  
  animateOnLoad() {
    // Add entrance animations
    const elements = document.querySelectorAll('.glass-card');
    elements.forEach((el, index) => {
      el.style.opacity = '0';
      el.style.transform = 'translateY(20px)';
      
      setTimeout(() => {
        el.style.transition = 'all 0.6s cubic-bezier(0.68, -0.55, 0.265, 1.55)';
        el.style.opacity = '1';
        el.style.transform = 'translateY(0)';
      }, index * 100);
    });
    
    // Animate timer on load
    setTimeout(() => {
      this.updateTimerCardMode();
    }, 500);
  }
  
  // Event Binding
  bindEvents() {
    // Timer controls
    const playPauseBtn = document.getElementById('playPauseBtn');
    if (playPauseBtn) {
      playPauseBtn.addEventListener('click', () => {
        if (this.isRunning) {
          this.pauseTimer();
        } else {
          this.startTimer();
        }
      });
    }
    
    const resetBtn = document.getElementById('resetBtn');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        this.resetTimer();
      });
    }
    
    const skipBtn = document.getElementById('skipBtn');
    if (skipBtn) {
      skipBtn.addEventListener('click', () => {
        this.skipSession();
      });
    }
    
    // Header controls
    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) {
      themeToggle.addEventListener('click', () => {
        this.toggleTheme();
      });
    }
    
    const settingsBtn = document.getElementById('settingsBtn');
    if (settingsBtn) {
      settingsBtn.addEventListener('click', () => {
        this.showSettingsModal();
      });
    }
    
    // Preset buttons
    document.querySelectorAll('.preset-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const work = btn.dataset.work;
        const breakTime = btn.dataset.break;
        this.setPreset(work, breakTime);
      });
    });
    
    // Modal controls
    const closeModal = document.getElementById('closeModal');
    if (closeModal) {
      closeModal.addEventListener('click', () => {
        this.hideModal('settingsModal');
      });
    }
    
    const cancelSettings = document.getElementById('cancelSettings');
    if (cancelSettings) {
      cancelSettings.addEventListener('click', () => {
        this.hideModal('settingsModal');
      });
    }
    
    const saveSettings = document.getElementById('saveSettings');
    if (saveSettings) {
      saveSettings.addEventListener('click', () => {
        this.saveSettingsFromModal();
      });
    }
    
    const continueBtn = document.getElementById('continueBtn');
    if (continueBtn) {
      continueBtn.addEventListener('click', () => {
        this.hideModal('successModal');
      });
    }
    
    // Bubble integration
    const sendToBubbleBtn = document.getElementById('sendToBubbleBtn');
    if (sendToBubbleBtn) {
      sendToBubbleBtn.addEventListener('click', () => {
        this.redirectToBubble();
      });
    }
    
    // Settings sliders
    const workSlider = document.getElementById('workSlider');
    if (workSlider) {
      workSlider.addEventListener('input', (e) => {
        document.getElementById('workValue').textContent = `${e.target.value} min`;
      });
    }
    
    const breakSlider = document.getElementById('breakSlider');
    if (breakSlider) {
      breakSlider.addEventListener('input', (e) => {
        document.getElementById('breakValue').textContent = `${e.target.value} min`;
      });
    }
    
    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      if (e.target.matches('input, textarea')) return;
      
      switch (e.code) {
        case 'Space':
          e.preventDefault();
          if (this.isRunning) {
            this.pauseTimer();
          } else {
            this.startTimer();
          }
          break;
        case 'KeyR':
          e.preventDefault();
          this.resetTimer();
          break;
        case 'KeyS':
          e.preventDefault();
          this.skipSession();
          break;
        case 'Escape':
          // Close any open modals
          document.querySelectorAll('.modal-overlay:not(.hidden)').forEach(modal => {
            modal.classList.add('hidden');
          });
          break;
      }
    });
    
    // Modal overlay clicks
    document.querySelectorAll('.modal-overlay').forEach(overlay => {
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
          overlay.classList.add('hidden');
        }
      });
    });
    
    // Load theme on startup
    this.loadTheme();
    
    // Update preset buttons on load
    this.updatePresetButtons();
  }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new StunningPomodoroTimer();
});

// Export for potential module use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = StunningPomodoroTimer;
}