# TradingBot Pro - SaaS

Automated crypto trading bots as a service.

## 🚀 Quick Start

```bash
# Install dependencies
pnpm install

# Setup database
npx prisma db push

# Run dev server
pnpm dev
```

## 💳 Stripe Setup

1. Create account at [stripe.com](https://stripe.com)
2. Go to Dashboard → Products → Create Product
3. Create two products:
   - **Pro Plan**: $29/month recurring
   - **Elite Plan**: $99/month recurring
4. Copy the Price IDs to `.env`
5. Setup webhook:
   - Stripe Dashboard → Webhooks → Add endpoint
   - URL: `https://yourdomain.com/api/stripe/webhook`
   - Events: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`
   - Copy webhook secret to `.env`

## 📈 Monetization Strategy

### Pricing Tiers
| Plan | Price | Target |
|------|-------|--------|
| Free | $0 | Paper trading, lead gen |
| Pro | $29/mo | Serious traders |
| Elite | $99/mo | Power users |

### Revenue Projections
```
Month 1: 20 users × $29 = $580
Month 3: 100 users × $35 avg = $3,500
Month 6: 300 users × $40 avg = $12,000
```

### Marketing Channels
1. **Twitter/X** - Trading results, bot updates
2. **Reddit** - r/algotrading, r/cryptocurrency
3. **Discord** - Trading communities
4. **Product Hunt** - Launch day traffic
5. **SEO** - "crypto trading bot", "automated trading"

## 🛠 Tech Stack

- **Frontend**: Next.js 16, Tailwind CSS
- **Auth**: NextAuth 5
- **Database**: Prisma + SQLite (dev) / PostgreSQL (prod)
- **Payments**: Stripe
- **Wallet**: wagmi + viem
- **Bots**: Python (7 bots: Polymarket, Hyperliquid, Solana, Grid, DCA, Funding Farmer, Whale Tracker)

## 📁 Project Structure

```
├── src/
│   ├── app/           # Next.js app router
│   ├── components/    # React components
│   └── lib/           # Utilities (auth, db, stripe)
├── bots/              # Python trading bots
├── prisma/            # Database schema
└── public/            # Static assets
```

## 🚀 Deployment

### Vercel (Recommended)
```bash
vercel
```

### Environment Variables (Production)
- `DATABASE_URL` - PostgreSQL connection string
- `AUTH_SECRET` - Random 32-char string
- `AUTH_URL` - Your domain (https://...)
- `STRIPE_SECRET_KEY` - Live key (sk_live_...)
- `STRIPE_WEBHOOK_SECRET` - Webhook secret
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` - Publishable key

## 📝 TODO

- [ ] Bot runner API (execute Python bots)
- [ ] Real-time trade updates (WebSocket)
- [ ] Mobile app (React Native)
- [ ] Referral system
- [ ] API access for Elite users
