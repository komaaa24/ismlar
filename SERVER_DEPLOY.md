# 🚀 SERVERDA BOTNI YANGILASH BO'YICHA QO'LLANMA

## 📋 Qadamlar:

### 1️⃣ Serverga SSH orqali kirish
```bash
ssh user@your-server-ip
```

### 2️⃣ Loyiha papkasiga o'tish
```bash
cd /path/to/your/bot/project
```

### 3️⃣ Yangi kodlarni GitHub'dan tortib olish
```bash
git pull origin master
```

### 4️⃣ Dependencies'larni yangilash (agar kerak bo'lsa)
```bash
pnpm install
```

### 5️⃣ Eski botni to'xtatish
```bash
# PM2 ishlatayotgan bo'lsangiz:
pm2 stop bot-name

# Yoki process ID orqali:
ps aux | grep "nest start" | grep -v grep | awk '{print $2}' | xargs kill -9
```

### 6️⃣ Production build qilish
```bash
pnpm run build
```

### 7️⃣ Yangi botni ishga tushirish
```bash
# PM2 bilan (tavsiya etiladi):
pm2 start dist/main.js --name bot-name

# Yoki oddiy:
pnpm run start:prod
```

### 8️⃣ Bot statusini tekshirish
```bash
pm2 status
# yoki
pm2 logs bot-name
```

---

## 🔥 PM2 ISHLATMASANGIZ (BIRINCHI MARTA)

### PM2'ni o'rnatish:
```bash
npm install -g pm2
```

### Botni PM2 bilan ishga tushirish:
```bash
pm2 start npm --name "names-bot" -- run start:prod
pm2 save
pm2 startup
```

---

## 📊 YANGI FUNKSIYALAR

### Qo'shilgan activity tracking:
- ✅ `/start` komandasi tracking
- ✅ Ism qidiruv tracking
- ✅ Inline keyboard clicks tracking
- ✅ To'lov jarayoni tracking
- ✅ Konversiya hisoblash

### Admin komandalar:
- `/stats` - To'liq statistika (yangilangan)
- `/activity` - Faollik statistikasi
- `/funnel` - To'lov funnel
- `/users_active` - Top foydalanuvchilar
- `/daily` - Kunlik statistika

---

## ⚠️ MUHIM:

1. **Database migratsiya:** TypeORM auto-sync yoqilgan, yangi `activity_logs` jadvali avtomatik yaratiladi
2. **Environment variables:** `.env` fayl to'g'ri sozlanganligini tekshiring
3. **Port:** 9990 port ochiq bo'lishi kerak

---

## 🐛 MUAMMOLAR

### Agar bot ishlamasa:

1. **Loglarni tekshiring:**
```bash
pm2 logs names-bot --lines 50
```

2. **Database ulanishini tekshiring:**
```bash
# .env faylida:
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=your_password
DB_DATABASE=names
```

3. **Port band bo'lsa:**
```bash
lsof -ti:9990 | xargs kill -9
```

---

## 📞 YORDAM

Agar qiyinchilik bo'lsa, quyidagilarni tekshiring:
- Git pull muvaffaqiyatli o'tdimi?
- Dependencies o'rnatildimi?
- Build xatosiz o'tdimi?
- Database ishlaydimi?
- .env fayl mavjudmi?

---

**Oxirgi yangilanish:** 2025-11-18
**Commit ID:** 643a953
