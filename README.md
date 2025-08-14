# Focus Flow - Enhanced Pomodoro Timer with Bubble.io Integration

A beautiful, modern Pomodoro timer built with React and TypeScript, featuring seamless Bubble.io integration for task management.

## ✨ Features

### 🎯 Core Functionality
- **Beautiful Pomodoro Timer** with circular progress indicator
- **Customizable Focus & Break Times** (1-180 minutes for focus, 1-60 minutes for breaks)
- **Quick Presets**: Focus Sprint (25/5), Deep Work (45/15), Marathon (90/20)
- **Task Tracking** with session history
- **Daily Statistics** showing total focus time and completed sessions

### 🎨 Modern Design
- **Glassmorphism UI** with backdrop blur effects
- **Gradient Animations** and floating background elements
- **Responsive Design** that works on all devices
- **Smooth Animations** and micro-interactions
- **Dark/Light Mode** support

### 🔗 Bubble.io Integration
- **One-Click Data Transfer** to your Bubble app
- **Configurable Bubble URL** in settings
- **Comprehensive Data Export** including:
  - Task name
  - Work/break durations
  - Session start/end times
  - User ID
  - Daily statistics

### 🔧 Advanced Features
- **Browser Notifications** when sessions complete
- **Completion Sounds** with Web Audio API
- **Local Data Persistence** with localStorage
- **Session History** tracking
- **Streak Counter** for motivation

## 🚀 Getting Started

1. **Clone and Install**
   ```bash
   npm install
   npm run dev
   ```

2. **Configure Bubble.io Integration**
   - Click the Settings button (⚙️)
   - Enter your Bubble app URL in the format:
     `https://your-app.bubbleapps.io/version-test/task_manager`
   - Save settings

3. **Start Focusing!**
   - Enter your task
   - Choose a preset or set custom times
   - Click "Start Focus"
   - When complete, click "Send to Bubble" to transfer data

## 📊 Data Elements for Bubble.io

When you click "Send to Bubble" or "Open Bubble App", the following data is sent as URL parameters:

### Core Session Data
- `task_name` - The task the user was working on
- `work_time` - Focus duration in minutes
- `break_time` - Break duration in minutes
- `session_start` - ISO timestamp when session started
- `session_end` - ISO timestamp when session ended
- `user_id` - Unique user identifier

### Daily Statistics
- `total_focus_time` - Total minutes focused today
- `session_count` - Number of sessions completed today

### Example URL
```
https://your-app.bubbleapps.io/version-test/task_manager?task_name=Write%20documentation&work_time=25&break_time=5&session_start=2024-01-15T10:00:00.000Z&session_end=2024-01-15T10:25:00.000Z&user_id=user_1705320000000_abc123&total_focus_time=75&session_count=3
```

## 🛠 Bubble.io Setup Guide

### 1. Create Data Types
In your Bubble app, create these data types:

**PomodoroSession**
- `task_name` (text)
- `work_minutes` (number)
- `break_minutes` (number)
- `start_time` (date)
- `end_time` (date)
- `user_id` (text)
- `created_date` (date)

**User** (if not already exists)
- `user_id` (text, unique)
- `total_focus_time` (number)
- `session_count` (number)
- `last_active` (date)

### 2. Create Workflow
Create a workflow triggered "When page is loaded":

1. **Get URL Parameters**
   - Use "Get data from page URL" for each parameter

2. **Create New Session**
   ```
   Create a new PomodoroSession:
   - task_name = Get task_name from page URL
   - work_minutes = Get work_time from page URL (converted to number)
   - break_minutes = Get break_time from page URL (converted to number)
   - start_time = Get session_start from page URL (converted to date)
   - end_time = Get session_end from page URL (converted to date)
   - user_id = Get user_id from page URL
   - created_date = Current date/time
   ```

3. **Update User Stats**
   ```
   Search for User where user_id = Get user_id from page URL
   If found:
     - Make changes to User: 
       - total_focus_time = total_focus_time + work_minutes
       - session_count = session_count + 1
       - last_active = Current date/time
   If not found:
     - Create new User with data from URL parameters
   ```

### 3. Display Data
Create elements to show:
- Recent sessions list
- Daily/weekly statistics
- Progress charts
- Task completion rates

## 🎨 Customization

### Colors & Themes
The app uses a modern color palette with:
- **Primary**: Indigo to Purple gradients
- **Success**: Green to Emerald
- **Warning**: Orange to Red
- **Background**: Soft gradients with animated blobs

### Presets
Easily modify the preset configurations in `src/App.tsx`:
```typescript
const PRESETS = [
  { name: "Focus Sprint", work: 25, break: 5, icon: Zap },
  { name: "Deep Work", work: 45, break: 15, icon: Brain },
  { name: "Marathon", work: 90, break: 20, icon: Target }
];
```

### Motivational Quotes
Add your own quotes in the `MOTIVATIONAL_QUOTES` object.

## 🔧 Technical Details

- **Framework**: React 18 with TypeScript
- **Styling**: Tailwind CSS with custom animations
- **Icons**: Lucide React
- **Storage**: localStorage for persistence
- **Audio**: Web Audio API for completion sounds
- **Notifications**: Browser Notification API

## 📱 Browser Support

- Chrome/Edge 88+
- Firefox 85+
- Safari 14+
- Mobile browsers (iOS Safari, Chrome Mobile)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

MIT License - feel free to use this in your own projects!

---

**Made with ❤️ for productivity enthusiasts and Bubble.io developers**