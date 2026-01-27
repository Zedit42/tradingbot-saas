# Xeonen - Trading Bot SaaS

## 🎯 Konsept
**Clawdbot altyapısı** + **Optimize edilmiş hazır tool'lar**

Kullanıcı deneyimi:
1. Para yatır
2. Tool/strateji seç
3. Karını izle

❌ Mesajlaşma yok
✅ Direkt dashboard + tool execution

## 🔐 GÜVENLİK MİMARİSİ (KRİTİK!)

### Private Key Yönetimi
Private key'ler = kullanıcı fonları. Bir saldırıda TÜM FONLAR GİDER.

**Katmanlı Güvenlik:**

```
┌─────────────────────────────────────────────────────┐
│  1. FRONTEND (Hiçbir key görmez)                    │
│     - Sadece public address                         │
│     - İşlem onayları                                │
└─────────────────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────┐
│  2. API LAYER (İşlem istekleri)                     │
│     - Rate limiting (user başına)                   │
│     - IP whitelist (opsiyonel)                      │
│     - 2FA zorunlu (withdraw için)                   │
└─────────────────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────┐
│  3. KEY VAULT (Ayrı servis - izole)                 │
│     - AWS KMS / HashiCorp Vault / GCP Secret Mgr   │
│     - Keys AES-256 encrypted at rest               │
│     - Decrypt only for signing                      │
│     - HSM backed (prod için)                        │
└─────────────────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────┐
│  4. SIGNER SERVICE (Air-gapped opsiyonel)          │
│     - İşlemleri imzalar                             │
│     - Key'i hiç dışarı vermez                       │
│     - Sadece signed tx döner                        │
└─────────────────────────────────────────────────────┘
```

### Güvenlik Kuralları

| Kural | Açıklama |
|-------|----------|
| **Encryption** | AES-256-GCM, key rotation her 90 gün |
| **Access** | Zero-trust, her istek auth + audit |
| **Withdrawal Limit** | Günlük max $1000, üstü 24h delay + email |
| **2FA** | Withdrawal için zorunlu (TOTP) |
| **Rate Limit** | 100 req/min per user, 10 tx/min |
| **IP Lock** | Opsiyonel - yeni IP = email onay |
| **Audit Log** | Her key access loglanır |
| **Alert** | Anormal aktivite = instant alert |

### Saldırı Senaryoları & Önlemler

| Saldırı | Önlem |
|---------|-------|
| DB Breach | Keys encrypted, key vault ayrı |
| API Exploit | Rate limit, withdrawal delay |
| Insider Threat | Multi-sig admin, audit log |
| Phishing | 2FA, withdrawal whitelist |
| Key Leak | Instant freeze, key rotation |

### Acil Durum Planı

1. **Saldırı Tespit** → Tüm withdrawal'ları freeze
2. **Key Rotation** → Etkilenen user'lar yeni wallet
3. **Forensics** → Log analizi, saldırı vektörü
4. **Kullanıcı Bilgilendirme** → Şeffaf iletişim
5. **Sigorta** → DeFi insurance (Nexus Mutual?)

---

## 💰 Gelir Modeli

| Plan | Fiyat | Özellikler |
|------|-------|------------|
| **Free** | $0 | Paper trading, 1 bot, demo |
| **Pro** | $29/ay | Live trading, tüm botlar, 1 wallet |
| **Elite** | $99/ay | Sınırsız wallet, priority execution, API |

**Ek Gelir:**
- Performance fee: Karın %5-10'u (opsiyonel)
- Priority execution: $5/ay ekstra

---

## 🔧 Tech Stack

### Frontend
- Next.js 15 + Tailwind
- Dashboard: Kar/zarar, aktif botlar, trade history

### Backend
- Next.js API Routes (public endpoints)
- Key Vault Service (ayrı, izole)
- Bot Runner (Clawdbot/Modal.com)

### Database
- PostgreSQL (Supabase) - user data
- Redis - rate limiting, session
- Audit DB - ayrı, immutable log

### Security
- AWS KMS veya HashiCorp Vault (key storage)
- Cloudflare (DDoS, WAF)
- Sentry (error tracking)

---

## 📦 Botlar (7 Aktif)

### 🎯 Trading
1. **Polymarket Auto** - Temporal arbitrage
2. **Hyperliquid Perps** - Futures, leverage
3. **Solana Memecoin** - Dip buy, momentum

### 📊 Strateji
4. **Grid Bot** - Range trading
5. **DCA Bot** - Dollar cost averaging
6. **Funding Farmer** - Funding rate arb

### 🐋 Sinyal
7. **Whale Tracker** - $100k+ takip, auto-trade

---

## 🚀 MVP Roadmap

### Phase 1: Foundation (Hafta 1-2)
- [ ] Landing page
- [ ] Auth (email + 2FA)
- [ ] Dashboard UI
- [ ] Paper trading mode

### Phase 2: Security (Hafta 3)
- [ ] Key Vault setup (AWS KMS)
- [ ] Encryption layer
- [ ] Withdrawal limits
- [ ] Audit logging

### Phase 3: Live Trading (Hafta 4)
- [ ] Wallet deposit flow
- [ ] Bot activation
- [ ] Real execution
- [ ] PnL tracking

### Phase 4: Polish (Hafta 5)
- [ ] Stripe integration
- [ ] Email notifications
- [ ] Mobile responsive
- [ ] Security audit

---

## ⚠️ ASLA YAPMA

1. ❌ Private key'i plaintext DB'de tutma
2. ❌ Key'i frontend'e gönderme
3. ❌ Encryption key'i aynı yerde tutma
4. ❌ Rate limit olmadan API açma
5. ❌ Withdrawal'da 2FA bypass etme
6. ❌ Audit log'u silme/düzenleme
7. ❌ Tek admin ile key vault yönetme

---

## 📁 Yeni Yapı

```
xeonen/
├── apps/
│   ├── web/              # Next.js frontend
│   └── key-vault/        # Isolated key service
├── packages/
│   ├── bots/             # Python trading bots
│   ├── crypto/           # Encryption utilities
│   └── shared/           # Common types/utils
├── infra/
│   ├── terraform/        # AWS KMS, etc.
│   └── docker/           # Container configs
└── docs/
    ├── security.md
    └── incident-response.md
```
