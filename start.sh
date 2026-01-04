#!/bin/bash

# Quick Start Guide for NextStop Login & Register System

echo "🚀 Starting NextStop Backend & Frontend"
echo "========================================"

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js first."
    exit 1
fi

echo "✅ Node.js found: $(node --version)"

# Start Backend
echo ""
echo "📦 Starting Backend Server..."
cd backend || exit 1

if [ ! -d "node_modules" ]; then
    echo "📥 Installing backend dependencies..."
    npm install
fi

npm run dev &
BACKEND_PID=$!
echo "✅ Backend started (PID: $BACKEND_PID)"

# Wait for backend to start
sleep 2

# Start Frontend
echo ""
echo "⚛️  Starting Frontend Development Server..."
cd ../frontend || exit 1

if [ ! -d "node_modules" ]; then
    echo "📥 Installing frontend dependencies..."
    npm install
fi

npm run dev &
FRONTEND_PID=$!
echo "✅ Frontend started (PID: $FRONTEND_PID)"

echo ""
echo "========================================="
echo "🎉 NextStop is running!"
echo ""
echo "📍 Frontend:  http://localhost:5173"
echo "📍 Backend:   http://localhost:3000"
echo ""
echo "🔗 Links:"
echo "   - Login:    http://localhost:5173/login"
echo "   - Register: http://localhost:5173/register"
echo "   - Dashboard: http://localhost:5173/admindashbord"
echo ""
echo "Press Ctrl+C to stop both servers"
echo "========================================="

# Wait for both processes
wait $BACKEND_PID $FRONTEND_PID
