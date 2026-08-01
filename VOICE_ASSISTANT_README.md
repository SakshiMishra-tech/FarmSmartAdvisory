# 🌾 FarmSmart Voice Assistant

A voice-enabled farming advisory system that helps farmers get instant advice on soil, crops, weather, and farming practices through natural language interaction.

## 🚀 Quick Start

### Prerequisites
- Python 3.8+ (for backend)
- Node.js 18+ (for frontend)
- Modern web browser with microphone access

### Backend Setup (Python FastAPI)

1. **Navigate to backend directory:**
   ```bash
   cd backend
   ```

2. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

3. **Start the backend server:**
   ```bash
   python start_backend.py
   ```
   
   Or directly:
   ```bash
   python app.py
   ```

4. **Verify backend is running:**
   - API: http://localhost:8000
   - Health Check: http://localhost:8000/health
   - API Docs: http://localhost:8000/docs

### Frontend Setup (Next.js)

1. **Navigate to frontend directory:**
   ```bash
   cd frontend
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Start the frontend server:**
   ```bash
   npm run dev
   ```
   
   Or use the batch file (Windows):
   ```bash
   start_frontend.bat
   ```

4. **Access the application:**
   - Frontend: http://localhost:3000

## 🎤 Voice Assistant Features

### Supported Languages
- **English** (en)
- **Hindi** (hi) 
- **Marathi** (mr)

### Voice Commands Categories

#### 🌱 Soil Advice
- "Tell me about my soil"
- "What's good for my land?"
- "मिट्टी के बारे में बताओ"

#### 🌾 Crop Recommendations
- "What crops should I plant?"
- "कौन सी फसल लगाऊं?"
- "पिकाची शिफारस करा"

#### 🌤️ Weather Information
- "How's the weather?"
- "मौसम कैसा है?"
- "हवामान कसे आहे?"

#### 🧪 Fertilizer Guidance
- "What fertilizer should I use?"
- "कौन सा खाद डालूं?"
- "कोणते खत वापरावे?"

#### 🐛 Pest Control
- "How to control pests?"
- "कीटों से कैसे बचें?"
- "किड्यांपासून कसे बचाव करावा?"

#### 💧 Irrigation Tips
- "How much water to give?"
- "कितना पानी दूं?"
- "किती पाणी द्यावे?"

#### 🌾 Harvest Timing
- "When to harvest?"
- "कब काटना है?"
- "कधी कापावे?"

## 🔧 Technical Details

### Backend API Endpoints

#### POST `/voice-query`
Processes voice input and returns farming advice.

**Request:**
```json
{
  "query": "What crops should I plant?",
  "language": "en"
}
```

**Response:**
```json
{
  "response": "This season pulses and mustard will be good. Consider planting wheat, rice, or maize based on your soil conditions."
}
```

#### GET `/health`
Health check endpoint.

**Response:**
```json
{
  "status": "healthy",
  "message": "Voice Assistant API is running"
}
```

### Frontend Components

#### VoiceAssistant Component
- Handles speech recognition
- Manages microphone access
- Displays transcript and responses
- Error handling for unsupported browsers

#### Key Features:
- **Real-time Speech Recognition**: Uses Web Speech API
- **Multi-language Support**: Automatically detects language
- **Response Display**: Shows both user input and AI response
- **Error Handling**: Graceful fallback for unsupported browsers

## 🛠️ Development

### Backend Development
```bash
cd backend
python -m uvicorn app:app --reload --host 0.0.0.0 --port 8000
```

### Frontend Development
```bash
cd frontend
npm run dev
```

### Adding New Languages
1. Add language code to the `responses` dictionary in `backend/app.py`
2. Add corresponding keywords in the keyword detection logic
3. Update the frontend to support the new language

### Adding New Voice Commands
1. Add new keywords to the detection logic in `backend/app.py`
2. Add corresponding responses in all supported languages
3. Test with voice input

## 🐛 Troubleshooting

### Common Issues

#### Backend Not Starting
- Check if port 8000 is available
- Verify Python dependencies are installed
- Check for syntax errors in `app.py`

#### Frontend Not Connecting to Backend
- Ensure backend is running on http://localhost:8000
- Check CORS settings in backend
- Verify API endpoint URLs in frontend

#### Voice Recognition Not Working
- Ensure microphone permissions are granted
- Check if browser supports Web Speech API
- Try refreshing the page
- Check browser console for errors

#### Microphone Access Denied
- Grant microphone permissions in browser
- Check browser settings
- Try using HTTPS (required for some browsers)

### Browser Compatibility
- **Chrome**: Full support
- **Firefox**: Full support
- **Safari**: Limited support
- **Edge**: Full support

## 📱 Usage Instructions

1. **Open the application** in your web browser
2. **Click "Start Voice Assistant"** to begin listening
3. **Speak your farming question** clearly
4. **Wait for the response** to appear on screen
5. **Click "Stop Listening"** when done

## 🔒 Security Notes

- The application runs locally and doesn't store voice data
- Voice recognition happens in the browser
- Only text queries are sent to the backend
- No personal data is collected or stored

## 📈 Future Enhancements

- [ ] Integration with actual ML models
- [ ] Weather API integration
- [ ] Soil data integration
- [ ] Multi-language voice recognition
- [ ] Offline mode support
- [ ] Mobile app version

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

For issues and questions:
1. Check the troubleshooting section
2. Review browser console for errors
3. Ensure both backend and frontend are running
4. Verify microphone permissions

---

**Happy Farming! 🌾**

