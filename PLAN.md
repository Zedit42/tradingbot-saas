# TradingBot SaaS - Xeonen

## 🎯 MVP Hedef
Trading botlarımızı hosted SaaS olarak sunmak.
Kullanıcı wallet bağlar, strateji seçer, bot çalışır.

## 💰 Gelir Modeli
- **Free**: Paper trading, 1 bot
- **Pro ($29/ay)**: Live trading, tüm botlar, 1 wallet
- **Elite ($99/ay)**: Sınırsız wallet, öncelikli sinyaller, Telegram alerts

## 🔧 Tech Stack
- **Frontend**: Next.js 15 + Tailwind (auth-kit base)
- **Backend**: Next.js API routes + Prisma
- **Database**: PostgreSQL (Supabase free tier)
- **Payments**: Stripe
- **Hosting**: Vercel (free tier başlangıç)
- **Bot Runtime**: Modal.com / Railway (background jobs)

## 📦 Botlar (7 Aktif)

### 🎯 Trading Botları
1. **Polymarket Auto** - Temporal arbitrage, prediction markets
2. **Hyperliquid Perps** - Futures trading, leverage, short/long
3. **Solana Memecoin** - Auto-trade Solana meme tokens (dip buy + momentum)

### 📊 Strateji Botları
4. **Grid Bot** - Range trading, otomatik grid alım/satım
5. **DCA Bot** - Dollar cost averaging, düzenli alım
6. **Funding Farmer** - Funding rate arbitrage, delta-neutral

### 🐋 Sinyal Botları
7. **Whale Tracker** - $100k+ wallet hareketleri takip + auto-trade

## 🚀 MVP Features (v0.1 - 1 hafta)
- [ ] Landing page
- [ ] Auth (email + wallet connect)
- [ ] Dashboard
- [ ] Wallet connection (EVM + Solana)
- [ ] Polymarket bot activation
- [ ] Trade history view
- [ ] Stripe integration

## 📅 Timeline
- **Gün 1-2**: Landing + Auth + Dashboard UI
- **Gün 3-4**: Wallet connect + Bot backend
- **Gün 5**: Stripe + Deployment
- **Gün 6-7**: Test + Launch

## 🎨 Branding
- **Name**: TradingBot Pro / AutoTrade AI / BotVault
- **Domain**: tradingbot.pro / autotrade.ai / botvault.io
- **Tagline**: "Set it. Forget it. Profit."

## 📁 Project Structure
```
tradingbot-saas/
├── src/
│   ├── app/
│   │   ├── (marketing)/     # Landing, pricing
│   │   ├── (auth)/          # Login, register
│   │   ├── (dashboard)/     # Main app
│   │   └── api/             # API routes
│   ├── components/
│   │   ├── ui/              # Shadcn components
│   │   ├── dashboard/       # Dashboard components
│   │   └── bots/            # Bot-specific UI
│   ├── lib/
│   │   ├── auth.ts          # NextAuth config
│   │   ├── prisma.ts        # DB client
│   │   ├── stripe.ts        # Payments
│   │   └── bots/            # Bot logic (Python wrappers)
│   └── styles/
├── prisma/
│   └── schema.prisma
├── bots/                    # Python bot scripts
│   ├── polymarket/
│   ├── hyperliquid/
│   └── solana/
└── public/
```
