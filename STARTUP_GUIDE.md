# 🚀 FarmSmart Voice Assistant - Startup Guide

## Quick Start (3 Options)

### Option 1: One-Click Startup (Recommended)
```bash
# For Mac/Linux:
./start_voice_assistant.sh

# For Windows:
start_voice_assistant.bat
```

### Option 2: Manual Startup (2 Steps)

#### Step 1: Start Backend
```bash
# Open Terminal/Command Prompt
cd backend
python start_backend.py
```

#### Step 2: Start Frontend
```bash
# Open another Terminal/Command Prompt
cd client
npm install
npm run dev
```

### Option 3: Next.js Frontend (Alternative)
```bash
# If you prefer the Next.js version:
cd frontend
npm install
npm run dev
```

## 📋 Detailed Instructions

### Prerequisites Check
- [ ] Python 3.8+ installed
- [ ] Node.js 18+ installed
- [ ] Modern web browser (Chrome/Firefox recommended)
- [ ] Microphone access enabled

### Backend Setup

1. **Navigate to backend directory:**
   ```bash
   cd backend
   ```

2. **Install Python dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

3. **Start the backend server:**
   ```bash
   python start_backend.py
   ```
   
   **Expected output:**
   ```
   🌾 FarmSmart Voice Assistant Backend
   ========================================
   ✅ Requirements installed successfully
   🚀 Starting FarmSmart Voice Assistant Backend...
   📍 Server will be available at: http://localhost:8000
   📖 API Documentation: http://localhost:8000/docs
   🔍 Health Check: http://localhost:8000/health
   ```

4. **Verify backend is running:**
   - Open http://localhost:8000 in your browser
   - You should see: `{"message": "FarmSmart Voice Assistant API", "version": "1.0.0"}`

### Frontend Setup (Main Application)

1. **Navigate to client directory:**
   ```bash
   cd client
   ```

2. **Install Node.js dependencies:**
   ```bash
   npm install
   ```

3. **Start the frontend server:**
   ```bash
   npm run dev
   ```
   
   **Expected output:**
   ```
   VITE v5.x.x  ready in xxx ms
   ➜  Local:   http://localhost:3000/
   ➜  Network: use --host to expose
   ```

4. **Access the application:**
   - Open http://localhost:3000 in your browser
   - You should see the FarmSmart farming application with voice assistant integrated

### Alternative Frontend (Next.js)

1. **Navigate to frontend directory:**
   ```bash
   cd frontend
   ```

2. **Install Node.js dependencies:**
   ```bash
   npm install
   ```

3. **Start the frontend server:**
   ```bash
   npm run dev
   ```
   
   **Expected output:**
   ```
   ▲ Next.js 15.5.2
   - Local:        http://localhost:3000
   - Network:      http://192.168.x.x:3000
   ```

4. **Access the application:**
   - Open http://localhost:3000 in your browser
   - You should see the FarmSmart Voice Assistant interface

## 🎤 Testing the Voice Assistant

### 1. Access Voice Assistant
- **Main App**: The voice assistant is integrated into the main farming application dashboard
- **Next.js App**: The voice assistant is on the main page
- Look for the "Voice Assistant" card/component in the interface

### 2. Grant Microphone Permission
- When you first click "Start Voice Assistant", your browser will ask for microphone permission
- Click "Allow" to enable voice recognition

### 3. Test Voice Commands
Try these sample commands:

**English:**
- "What crops should I plant?"
- "Tell me about soil"
- "How to control pests?"
- "When to harvest?"
- "Show me crop recommendations" (will switch to crop tab)
- "Show me yield prediction" (will switch to yield tab)

**Hindi:**
- "कौन सी फसल लगाऊं?"
- "मिट्टी के बारे में बताओ"
- "कीटों से कैसे बचें?"
- "फसल सिफारिश दिखाओ"

**Marathi:**
- "कोणती पिके लावावीत?"
- "मातीबद्दल सांगा"
- "किड्यांपासून कसे बचाव करावा?"
- "पीक शिफारस दाखवा"

### 4. Expected Behavior
- Click "Start Voice Assistant" → Button changes to "Stop Listening"
- Speak your question clearly
- You should see your transcript appear
- The assistant's response should appear below
- Voice commands can switch between app tabs
- Click "Stop Listening" when done
- Conversation history is saved and can be replayed

## 🔧 Troubleshooting

### Backend Issues

**Port 8000 already in use:**
```bash
# Kill process using port 8000
# Windows:
netstat -ano | findstr :8000
taskkill /PID <PID_NUMBER> /F

# Mac/Linux:
lsof -ti:8000 | xargs kill -9
```

**Python dependencies not installing:**
```bash
# Try upgrading pip
python -m pip install --upgrade pip
pip install -r requirements.txt
```

**Backend not responding:**
- Check if backend is running: http://localhost:8000/health
- Check terminal for error messages
- Ensure no firewall is blocking port 8000

### Frontend Issues

**Port 3000 already in use:**
```bash
# Kill process using port 3000
# Windows:
netstat -ano | findstr :3000
taskkill /PID <PID_NUMBER> /F

# Mac/Linux:
lsof -ti:3000 | xargs kill -9
```

**Node modules issues:**
```bash
# Clear node modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

**Frontend not connecting to backend:**
- Ensure backend is running on http://localhost:8000
- Check browser console for CORS errors
- Verify API calls are going to correct endpoint

### Voice Recognition Issues

**Microphone not working:**
- Check browser permissions (click lock icon in address bar)
- Try refreshing the page
- Test microphone in other applications

**Voice not being recognized:**
- Speak clearly and slowly
- Reduce background noise
- Try different browsers (Chrome works best)
- Check if Web Speech API is supported

**No response from assistant:**
- Check if backend is running
- Check browser console for errors
- Verify API endpoint is correct
- Test with simple commands first

## 🧪 Testing Script

Run the automated test script to verify everything is working:

```bash
# Make sure backend is running first
python test_voice_assistant.py
```

This will test:
- Backend health check
- API endpoints
- Voice query processing
- Multi-language support

## 📱 Browser Compatibility

| Browser | Voice Recognition | Status |
|---------|------------------|--------|
| Chrome  | ✅ Full Support  | Recommended |
| Firefox | ✅ Full Support  | Good |
| Safari  | ⚠️ Limited      | May have issues |
| Edge    | ✅ Full Support  | Good |

## 🔒 Security Notes

- The application runs locally on your machine
- Voice data is processed in your browser
- No voice recordings are stored
- Only text queries are sent to the backend
- No personal data is collected

## 📞 Support

If you encounter issues:

1. **Check the troubleshooting section above**
2. **Review browser console for errors** (F12 → Console)
3. **Ensure both backend and frontend are running**
4. **Test with the automated test script**
5. **Try different browsers if voice recognition fails**

## 🎯 Success Indicators

You'll know everything is working when:

- ✅ Backend shows "Server running" message
- ✅ Frontend loads at http://localhost:3000
- ✅ Voice assistant button responds to clicks
- ✅ Microphone permission is granted
- ✅ Voice commands are transcribed
- ✅ Assistant responses appear
- ✅ Multiple languages work

---

**Happy Farming! 🌾**

*Need help? Check the troubleshooting section or run the test script!*

