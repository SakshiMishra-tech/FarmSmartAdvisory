#!/bin/bash

# FarmSmart Voice Assistant Startup Script
echo "🌾 FarmSmart Voice Assistant - Starting Services"
echo "================================================"

# Function to check if a port is in use
check_port() {
    if lsof -Pi :$1 -sTCP:LISTEN -t >/dev/null ; then
        echo "⚠️  Port $1 is already in use"
        return 1
    else
        echo "✅ Port $1 is available"
        return 0
    fi
}

# Function to start backend
start_backend() {
    echo "🚀 Starting Backend Server..."
    cd backend
    if [ -f "start_backend.py" ]; then
        python3 start_backend.py &
    else
        python3 app.py &
    fi
    BACKEND_PID=$!
    echo "Backend PID: $BACKEND_PID"
    cd ..
}

# Function to start frontend
start_frontend() {
    echo "🎨 Starting Frontend Application..."
    if [ -f "package.json" ]; then
        npm install --legacy-peer-deps
        npm run dev &
    else
        echo "❌ Frontend not found in root directory"
        exit 1
    fi
    FRONTEND_PID=$!
    echo "Frontend PID: $FRONTEND_PID"
}

# Function to cleanup on exit
cleanup() {
    echo ""
    echo "🛑 Shutting down services..."
    if [ ! -z "$BACKEND_PID" ]; then
        kill $BACKEND_PID 2>/dev/null
        echo "Backend stopped"
    fi
    if [ ! -z "$FRONTEND_PID" ]; then
        kill $FRONTEND_PID 2>/dev/null
        echo "Frontend stopped"
    fi
    exit 0
}

# Set up signal handlers
trap cleanup SIGINT SIGTERM

# Check ports
echo "🔍 Checking port availability..."
check_port 8000 || {
    echo "❌ Backend port 8000 is already in use. Please stop the service using that port."
    exit 1
}

check_port 5000 || {
    echo "❌ Frontend port 5000 is already in use. Please stop the service using that port."
    exit 1
}

# Start services
start_backend
sleep 3  # Give backend time to start

start_frontend

echo ""
echo "✅ Services started successfully!"
echo "📍 Backend API: http://localhost:8000"
echo "📍 Frontend App: http://localhost:5000"
echo "📖 API Documentation: http://localhost:8000/docs"
echo ""
echo "Press Ctrl+C to stop all services"

# Wait for user to stop
wait

