# Xeonen Security Architecture

## Overview

Xeonen handles user private keys for automated trading. This document outlines the security measures in place to protect user funds.

**Golden Rule**: Private keys NEVER leave the Key Vault service.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         PUBLIC INTERNET                          │
└───────────────────────────────┬─────────────────────────────────┘
                                │
                     ┌──────────▼──────────┐
                     │    Cloudflare WAF   │
                     │    DDoS Protection  │
                     └──────────┬──────────┘
                                │
                     ┌──────────▼──────────┐
                     │                     │
                     │    WEB APP (Next.js)│
                     │    - User auth      │
                     │    - Dashboard      │
                     │    - Bot config     │
                     │                     │
                     └──────────┬──────────┘
                                │
                    ┌───────────┴───────────┐
                    │   INTERNAL NETWORK    │
                    │   (no public access)  │
                    └───────────┬───────────┘
                                │
                     ┌──────────▼──────────┐
                     │                     │
                     │    KEY VAULT        │
                     │    - Encrypted keys │
                     │    - Sign only      │
                     │    - Audit logs     │
                     │                     │
                     └─────────────────────┘
```

## Key Vault Security

### Encryption
- **Algorithm**: AES-256-GCM (authenticated encryption)
- **Key Derivation**: PBKDF2 with 100,000 iterations (for password-based)
- **IV**: 96-bit random IV per encryption
- **Auth Tag**: 128-bit authentication tag

### Access Control
- JWT-based service authentication
- Short-lived tokens (5 minutes)
- User ID embedded in token, verified against key ownership

### Rate Limiting
- General: 30 requests/minute per IP
- Signing: 10 requests/minute per IP
- Configurable per user tier

### Audit Logging
Every key operation is logged:
- `create`: New key stored
- `sign`: Transaction signed
- `delete`: Key removed
- `access_denied`: Failed access attempt

Logs include:
- Timestamp
- User ID
- Key ID
- IP Address
- Operation metadata

## Web App Security

### Authentication
- NextAuth with email/password
- 2FA via TOTP (required for withdrawals)
- Session management with secure cookies

### Input Validation
- Strict type validation on all inputs
- Amount limits enforced server-side
- Address format validation

### CORS
- Restricted to known origins
- Credentials required

## Withdrawal Protection

### Daily Limits
| Tier | Daily Limit | Over-limit Action |
|------|-------------|-------------------|
| Free | $100 | Blocked |
| Pro | $1,000 | 24h delay + email |
| Elite | $10,000 | 24h delay + email |

### 2FA Requirement
All withdrawals require 2FA confirmation, regardless of amount.

### Whitelist (Optional)
Users can enable address whitelisting:
- Only whitelisted addresses can receive funds
- Adding new address requires 24h delay
- Email notification on whitelist changes

## Incident Response

### Detection
- Anomaly detection on signing patterns
- Geographic impossible travel alerts
- Volume spike detection

### Response Levels

**Level 1 (Suspicious)**
- Log incident
- Alert security team
- Monitor closely

**Level 2 (Confirmed Threat)**
- Freeze affected user accounts
- Block signing requests
- Notify affected users

**Level 3 (Active Breach)**
- Global signing freeze
- Full system audit
- User notification
- Key rotation for affected users

### Recovery
1. Identify attack vector
2. Patch vulnerability
3. Rotate compromised keys
4. Generate new wallets for affected users
5. Post-mortem documentation

## Development Guidelines

### Never Do
1. ❌ Log private keys
2. ❌ Send keys to frontend
3. ❌ Store keys in main database
4. ❌ Skip input validation
5. ❌ Disable rate limiting
6. ❌ Use predictable IVs
7. ❌ Commit .env files

### Always Do
1. ✅ Use parameterized queries
2. ✅ Validate all inputs
3. ✅ Use constant-time comparison for secrets
4. ✅ Clear sensitive data from memory
5. ✅ Log security events
6. ✅ Use HTTPS everywhere
7. ✅ Keep dependencies updated

## Security Contacts

- Security issues: security@xeonen.io
- Bug bounty: See SECURITY.md in repo root
- Emergency: [internal contact]

## Compliance

- Data encrypted at rest and in transit
- GDPR-compliant data handling
- Regular security audits (quarterly)
- Penetration testing (annually)
