#!/bin/bash

# 🔧 Server - Bot Qayta Ishga Tushirish Skript
# Bu skriptni serverda bajaring: bash server-restart.sh

echo "🛑 1. Barcha bot jarayonlarini to'xtatish..."
pm2 stop all 2>/dev/null
pm2 delete all 2>/dev/null
ps aux | grep "nest start" | grep -v grep | awk '{print $2}' | xargs kill -9 2>/dev/null
lsof -ti:9990 | xargs kill -9 2>/dev/null
echo "✅ Bot jarayonlari to'xtatildi"

echo ""
echo "📥 2. GitHub dan yangi kodlarni tortish..."
git stash 2>/dev/null
git pull origin master
if [ $? -ne 0 ]; then
    echo "❌ Git pull xatosi! Iltimos qo'lda pull qiling."
    exit 1
fi
echo "✅ Yangi kodlar yuklab olindi"

echo ""
echo "📦 3. Paketlarni yangilash..."
pnpm install
echo "✅ Paketlar yangilandi"

echo ""
echo "🔨 4. Build qilish..."
rm -rf dist
pnpm run build
if [ $? -ne 0 ]; then
    echo "❌ Build xatosi!"
    exit 1
fi
echo "✅ Build muvaffaqiyatli"

echo ""
echo "🚀 5. Bot ni ishga tushirish..."
pm2 start dist/main.js --name "names-bot"
pm2 save
echo "✅ Bot ishga tushdi"

echo ""
echo "📊 6. Statusni tekshirish..."
sleep 3
pm2 status

echo ""
echo "📝 Loglarni ko'rish uchun: pm2 logs names-bot"
echo "🎉 Tayyor!"
