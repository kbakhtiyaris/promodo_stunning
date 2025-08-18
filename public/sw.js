// Service Worker for background timer and notifications
let timerState = {
  isActive: false,
  timeLeft: 0,
  isBreak: false,
  startTime: null,
  taskName: '',
  settings: {
    focusTime: 25,
    breakTime: 5,
    soundEnabled: true,
    notificationsEnabled: true
  }
};

let timerInterval = null;

// Listen for messages from the main thread
self.addEventListener('message', (event) => {
  const { type, data } = event.data;
  
  switch (type) {
    case 'START_TIMER':
      timerState = { ...timerState, ...data, isActive: true };
      startBackgroundTimer();
      break;
      
    case 'PAUSE_TIMER':
      timerState.isActive = false;
      stopBackgroundTimer();
      break;
      
    case 'RESET_TIMER':
      timerState.isActive = false;
      timerState.timeLeft = data.timeLeft;
      timerState.startTime = null;
      stopBackgroundTimer();
      break;
      
    case 'UPDATE_STATE':
      timerState = { ...timerState, ...data };
      break;
      
    case 'GET_STATE':
      event.ports[0].postMessage({ type: 'STATE_UPDATE', data: timerState });
      break;
  }
});

function startBackgroundTimer() {
  if (timerInterval) {
    clearInterval(timerInterval);
  }
  
  timerInterval = setInterval(() => {
    if (timerState.isActive && timerState.timeLeft > 0) {
      timerState.timeLeft--;
      
      // Notify main thread of time update
      self.clients.matchAll().then(clients => {
        clients.forEach(client => {
          client.postMessage({
            type: 'TIMER_UPDATE',
            data: { timeLeft: timerState.timeLeft }
          });
        });
      });
    } else if (timerState.timeLeft === 0 && timerState.isActive) {
      handleTimerComplete();
    }
  }, 1000);
}

function stopBackgroundTimer() {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
}

function handleTimerComplete() {
  timerState.isActive = false;
  stopBackgroundTimer();
  
  // Show notification
  if (timerState.settings.notificationsEnabled) {
    self.registration.showNotification(
      timerState.isBreak ? 'Break time is over!' : 'Focus session complete!',
      {
        body: timerState.isBreak ? 'Time to get back to work!' : 'Take a well-deserved break!',
        icon: '/vite.svg',
        badge: '/vite.svg',
        tag: 'pomodoro-timer',
        requireInteraction: true,
        actions: [
          {
            action: 'start-next',
            title: timerState.isBreak ? 'Start Focus' : 'Start Break'
          },
          {
            action: 'dismiss',
            title: 'Dismiss'
          }
        ]
      }
    );
  }
  
  // Play sound (if supported)
  if (timerState.settings.soundEnabled) {
    // Note: Audio in service worker is limited, main thread will handle this
  }
  
  // Switch between focus and break
  const wasBreak = timerState.isBreak;
  timerState.isBreak = !timerState.isBreak;
  timerState.timeLeft = timerState.isBreak ? 
    timerState.settings.focusTime * 60 : 
    timerState.settings.breakTime * 60;
  
  // Notify main thread
  self.clients.matchAll().then(clients => {
    clients.forEach(client => {
      client.postMessage({
        type: 'TIMER_COMPLETE',
        data: {
          wasBreak,
          taskName: timerState.taskName,
          duration: wasBreak ? timerState.settings.breakTime : timerState.settings.focusTime,
          startTime: timerState.startTime,
          endTime: new Date().toISOString(),
          isBreak: timerState.isBreak,
          timeLeft: timerState.timeLeft
        }
      });
    });
  });
}

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  if (event.action === 'start-next') {
    timerState.isActive = true;
    timerState.startTime = new Date().toISOString();
    startBackgroundTimer();
    
    // Notify main thread
    self.clients.matchAll().then(clients => {
      clients.forEach(client => {
        client.postMessage({
          type: 'START_FROM_NOTIFICATION',
          data: timerState
        });
      });
    });
  }
  
  // Focus or open the app
  event.waitUntil(
    self.clients.matchAll().then(clients => {
      if (clients.length > 0) {
        return clients[0].focus();
      }
      return self.clients.openWindow('/');
    })
  );
});

// Keep service worker alive
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});