#!/bin/bash

# 🛑 SERVERDA BAJARING - Barcha bot jarayonlarini to'xtatish

echo "🔍 1. Bot jarayonlarini qidirish..."
ps aux | grep -E "nest|node.*names|bot" | grep -v grep

echo ""
echo "🛑 2. PM2 jarayonlarini to'xtatish..."
pm2 stop all
pm2 delete all
pm2 kill

echo ""
echo "🔫 3. Node jarayonlarini to'xtatish..."
pkill -f "nest"
pkill -f "node.*names"
killall -9 node 2>/dev/null

echo ""
echo "🧹 4. Port 9990 ni tozalash..."
lsof -ti:9990 | xargs kill -9 2>/dev/null

echo ""
echo "⏳ 5. Kutish (5 sekund)..."
sleep 5

echo ""
echo "✅ Barcha jarayonlar to'xtatildi!"
echo ""
echo "📝 Endi yangi botni ishga tushiring:"
echo "   pm2 start dist/main.js --name names-bot"
