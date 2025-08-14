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
        this.progressCircle = null;
        this.soundEnabled = true;
        this.notificationsEnabled = true;

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

        // Load settings
        this.loadSettings();
    }

    loadSettings() {
        const settings = JSON.parse(localStorage.getItem('focusflow_settings') || '{}');
        this.soundEnabled = settings.soundEnabled !== false;
        this.notificationsEnabled = settings.notificationsEnabled !== false;
    }

    saveSettings() {
        const settings = {
            soundEnabled: this.soundEnabled,
            notificationsEnabled: this.notificationsEnabled
        };
        localStorage.setItem('focusflow_settings', JSON.stringify(settings));
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
        this.progressCircle = document.getElementById('progressCircle');
        this.setupEventListeners();
        this.updateDisplay();
        this.displayTodaysStats();
        this.displaySessionHistory();
        this.updateQuote();
        this.requestNotificationPermission();
    }

    requestNotificationPermission() {
        if ('Notification' in window && Notification.permission === 'default') {
            Notification.requestPermission();
        }
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

        if (settingsBtn) settingsBtn.addEventListener('click', () => this.openSettings());
        if (closeSettings) closeSettings.addEventListener('click', () => this.closeSettings());

        // Settings controls
        this.setupSettingsControls();

        // Click outside modal to close
        if (settingsModal) {
            settingsModal.addEventListener('click', (e) => {
                if (e.target === settingsModal) {
                    this.closeSettings();
                }
            });
        }
    }

    setupSettingsControls() {
        const focusSlider = document.getElementById('focusSlider');
        const focusValue = document.getElementById('focusValue');
        const breakSlider = document.getElementById('breakSlider');
        const breakValue = document.getElementById('breakValue');
        const soundToggle = document.getElementById('soundToggle');
        const notificationToggle = document.getElementById('notificationToggle');
        const saveSettings = document.getElementById('saveSettings');
        const resetSettings = document.getElementById('resetSettings');

        if (focusSlider && focusValue) {
            focusSlider.addEventListener('input', (e) => {
                focusValue.textContent = e.target.value;
            });
        }

        if (breakSlider && breakValue) {
            breakSlider.addEventListener('input', (e) => {
                breakValue.textContent = e.target.value;
            });
        }

        if (saveSettings) {
            saveSettings.addEventListener('click', () => {
                if (focusSlider) this.workMinutes = parseInt(focusSlider.value);
                if (breakSlider) this.breakMinutes = parseInt(breakSlider.value);
                if (soundToggle) this.soundEnabled = soundToggle.checked;
                if (notificationToggle) this.notificationsEnabled = notificationToggle.checked;
                
                this.saveSettings();
                this.updateDisplay();
                this.closeSettings();
                this.showToast('Settings saved!');
            });
        }

        if (resetSettings) {
            resetSettings.addEventListener('click', () => {
                if (focusSlider) {
                    focusSlider.value = 25;
                    focusValue.textContent = '25';
                }
                if (breakSlider) {
                    breakSlider.value = 5;
                    breakValue.textContent = '5';
                }
                if (soundToggle) soundToggle.checked = true;
                if (notificationToggle) notificationToggle.checked = true;
            });
        }
    }

    openSettings() {
        const settingsModal = document.getElementById('settingsModal');
        const focusSlider = document.getElementById('focusSlider');
        const focusValue = document.getElementById('focusValue');
        const breakSlider = document.getElementById('breakSlider');
        const breakValue = document.getElementById('breakValue');
        const soundToggle = document.getElementById('soundToggle');
        const notificationToggle = document.getElementById('notificationToggle');

        // Set current values
        if (focusSlider) {
            focusSlider.value = this.workMinutes;
            if (focusValue) focusValue.textContent = this.workMinutes;
        }
        if (breakSlider) {
            breakSlider.value = this.breakMinutes;
            if (breakValue) breakValue.textContent = this.breakMinutes;
        }
        if (soundToggle) soundToggle.checked = this.soundEnabled;
        if (notificationToggle) notificationToggle.checked = this.notificationsEnabled;

        if (settingsModal) {
            settingsModal.classList.remove('hidden');
        }
    }

    closeSettings() {
        const settingsModal = document.getElementById('settingsModal');
        if (settingsModal) {
            settingsModal.classList.add('hidden');
        }
    }

    startTimer() {
        if (!this.currentTask.trim()) {
            alert('Please enter what you\'re working on!');
            const taskInput = document.getElementById('taskInput');
            if (taskInput) taskInput.focus();
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
            this.updateProgress();
            
            if (this.timeLeft <= 0) {
                this.completeSession();
            }
        }, 1000);

        // Update UI
        const startBtn = document.getElementById('startBtn');
        const pauseBtn = document.getElementById('pauseBtn');
        const timerCard = document.getElementById('timerCard');
        
        if (startBtn) startBtn.classList.add('hidden');
        if (pauseBtn) pauseBtn.classList.remove('hidden');
        if (timerCard) timerCard.classList.add('running');

        this.updateQuote('work');
    }

    pauseTimer() {
        this.isRunning = false;
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
        }

        const startBtn = document.getElementById('startBtn');
        const pauseBtn = document.getElementById('pauseBtn');
        const timerCard = document.getElementById('timerCard');
        
        if (startBtn) startBtn.classList.remove('hidden');
        if (pauseBtn) pauseBtn.classList.add('hidden');
        if (timerCard) timerCard.classList.remove('running');
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

        const startBtn = document.getElementById('startBtn');
        const pauseBtn = document.getElementById('pauseBtn');
        const sessionComplete = document.getElementById('sessionComplete');
        const timerCard = document.getElementById('timerCard');

        if (startBtn) startBtn.classList.remove('hidden');
        if (pauseBtn) pauseBtn.classList.add('hidden');
        if (sessionComplete) sessionComplete.classList.add('hidden');
        if (timerCard) {
            timerCard.classList.remove('running', 'work-mode', 'break-mode');
        }

        this.updateDisplay();
        this.updateProgress();
        this.updateQuote();
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

        // Show notification
        if (this.notificationsEnabled) {
            this.showNotification();
        }

        // Play sound
        if (this.soundEnabled) {
            this.playCompletionSound();
        }
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
        const sessionComplete = document.getElementById('sessionComplete');
        const startBtn = document.getElementById('startBtn');
        const pauseBtn = document.getElementById('pauseBtn');
        const timerCard = document.getElementById('timerCard');

        if (sessionComplete) sessionComplete.classList.remove('hidden');
        if (startBtn) startBtn.classList.remove('hidden');
        if (pauseBtn) pauseBtn.classList.add('hidden');
        if (timerCard) timerCard.classList.remove('running');

        // Show confetti effect
        this.showConfetti();
    }

    showNotification() {
        if ('Notification' in window && Notification.permission === 'granted') {
            new Notification('Focus Session Complete! 🎉', {
                body: `Great work on "${this.currentTask}"!`,
                icon: '⏱️'
            });
        }
    }

    playCompletionSound() {
        // Create a simple beep sound
        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
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
    }

    showConfetti() {
        // Simple confetti effect
        console.log('🎉 Session completed!');
        
        // Add visual celebration
        const timerCard = document.getElementById('timerCard');
        if (timerCard) {
            timerCard.style.animation = 'none';
            setTimeout(() => {
                timerCard.style.animation = 'success-bounce 0.6s ease-in-out';
            }, 10);
        }
    }

    showToast(message) {
        // Simple toast notification
        const toast = document.createElement('div');
        toast.textContent = message;
        toast.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: var(--color-success);
            color: white;
            padding: 1rem 1.5rem;
            border-radius: var(--radius-base);
            z-index: 10000;
            animation: slideIn 0.3s ease;
        `;
        
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.remove();
        }, 3000);
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
        const sessionComplete = document.getElementById('sessionComplete');
        const taskInput = document.getElementById('taskInput');
        
        if (sessionComplete) sessionComplete.classList.add('hidden');
        if (taskInput) taskInput.focus();
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
            historyEl.innerHTML = `
                <div class="empty-history">
                    <div class="empty-icon">🎯</div>
                    <p>Complete your first session to see history here!</p>
                </div>
            `;
            return;
        }

        const historyHtml = this.todaysSessions
            .slice(-5) // Show last 5 sessions
            .reverse()
            .map(session => `
                <div class="history-item">
                    <div>
                        <strong>${session.taskName}</strong>
                        <div style="font-size: 0.875rem; color: var(--color-text-secondary);">
                            ${session.workMinutes} minutes
                        </div>
                    </div>
                    <div class="status status--success">
                        Completed
                    </div>
                </div>
            `).join('');

        historyEl.innerHTML = historyHtml;
    }

    updateDisplay() {
        const timerDisplay = document.getElementById('timerDisplay');
        if (!timerDisplay) return;

        let displayTime = this.timeLeft;
        if (displayTime === 0 && !this.isRunning) {
            displayTime = this.workMinutes * 60;
        }

        const minutes = Math.floor(displayTime / 60);
        const seconds = displayTime % 60;
        timerDisplay.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }

    updateProgress() {
        if (!this.progressCircle) return;

        const totalSeconds = this.totalTime;
        const remainingSeconds = this.timeLeft;
        const progress = totalSeconds > 0 ? (totalSeconds - remainingSeconds) / totalSeconds : 0;
        
        const circumference = 2 * Math.PI * 85; // radius is 85
        const offset = circumference * (1 - progress);
        
        this.progressCircle.style.strokeDasharray = circumference;
        this.progressCircle.style.strokeDashoffset = offset;
    }

    updateQuote(mode = 'work') {
        const quoteEl = document.getElementById('motivationalQuote');
        if (!quoteEl) return;

        const quotes = APP_DATA.motivationalQuotes[mode] || APP_DATA.motivationalQuotes.work;
        const randomQuote = quotes[Math.floor(Math.random() * quotes.length)];
        quoteEl.textContent = `"${randomQuote}"`;
    }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.pomodoroTimer = new StunningPomodoroTimer();
});

// Add CSS animation keyframes for success bounce
const style = document.createElement('style');
style.textContent = `
    @keyframes success-bounce {
        0% { transform: scale(1); }
        50% { transform: scale(1.05); }
        100% { transform: scale(1); }
    }
    
    @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
`;
document.head.appendChild(style);