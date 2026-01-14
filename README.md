# 🎯 Premium Bot - MongoDB to PostgreSQL Migration

> **Complete migration from MongoDB/Mongoose to PostgreSQL/TypeORM with professional payment integration**

## 🚀 Project Overview

This is a premium Telegram bot with advanced payment integration that has been fully migrated from MongoDB to PostgreSQL. The bot supports multiple paym
- ✅ **Code Quality**: Senior-level refactoring

## 🏗️ Database Schema

### PostgreSQL Tables:
- `users` - User management with Telegram integration
- `plans` - Subscription plans and pricing
- `transactions` - Payment transactions tracking
- `user_cards` - User payment cards management
- `user_subscriptions` - Active subscriptions
- `user_payments` - Payment history

## 💳 Payment Providers

### 1. **Click** 
- One-time payments ✅
- Subscription payments ✅
- Webhook integration ✅

### 2. **Payme**
- JSON-RPC API integration ✅
- Transaction management ✅
- Webhook support ✅

### 3. **UzCard**
- API integration ✅
- Card management ✅
- One-time payments ✅

## 🔧 Tech Stack

- **Backend**: NestJS + TypeScript
- **Database**: PostgreSQL + TypeORM
- **Bot Framework**: Grammy (Telegram Bot API)
- **Payment**: Click, Payme, UzCard APIs
- **Validation**: Class Validator
- **Logging**: Winston Logger

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- PostgreSQL 14+
- pnpm (recommended)

### Installation

```bash
# Clone the repository
git clone https://github.com/kamol0815/ism.git
cd ism

# Install dependencies
pnpm install

# Setup environment variables
cp .env.example .env
# Edit .env with your configuration

# Run database migrations
pnpm run migration:run

# Start the application
pnpm run start:dev
```

### Environment Variables

```env
# Database
POSTGRES_URI=postgres://user:password@host:port/database

# Bot Configuration
BOT_TOKEN=your_telegram_bot_token
APP_PORT=8980
BASE_URL=your_server_url

# Payment Providers
PAYME_MERCHANT_ID=your_payme_merchant_id
PAYME_PASSWORD=your_payme_password
CLICK_SERVICE_ID=your_click_service_id
CLICK_SECRET=your_click_secret
UZCARD_LOGIN=your_uzcard_login
UZCARD_PASSWORD=your_uzcard_password
```

## 📊 Key Features

- 🤖 **Telegram Bot**: Full-featured bot with subscription management
- 💰 **Multiple Payments**: Support for 3 major payment providers
- 📱 **Mobile Friendly**: Optimized payment flows for mobile users
- �� **Secure**: Professional security measures and validation
- 📈 **Scalable**: TypeORM with proper database design
- 📋 **Logging**: Comprehensive logging for debugging and monitoring

## 🔍 API Endpoints

- `POST /api/payme` - Payme webhook endpoint
- `POST /api/click` - Click webhook endpoint
- `GET /api/uzcard-api/*` - UzCard API endpoints
- `GET /api/payment-link/*` - Payment link generation
- `POST /api/subscription/*` - Subscription management

## 🛠️ Development

### Database Operations

```bash
# Generate migration
pnpm run migration:generate

# Run migrations
pnpm run migration:run

# Revert migration
pnpm run migration:revert
```

### Testing

```bash
# Run tests
pnpm run test

# Run e2e tests
pnpm run test:e2e

# Test coverage
pnpm run test:cov
```

## 🏆 Migration Achievements

- **51 files changed** with comprehensive refactoring
- **9,709 insertions, 3,287 deletions** - major codebase improvement
- **100% MongoDB removal** - no legacy code remaining
- **Professional error handling** - production-ready code
- **Enhanced logging** - debugging and monitoring capabilities
- **TypeORM integration** - modern ORM with proper relationships
- **UUID support** - PostgreSQL best practices

## 🔗 Links

- [Repository](https://github.com/kamol0815/ism)
- [Issues](https://github.com/kamol0815/ism/issues)

## 📄 License

This project is licensed under the MIT License.

---

**Built with ❤️ using NestJS, PostgreSQL, and TypeORM**
