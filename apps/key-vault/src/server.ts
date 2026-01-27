/**
 * Key Vault Server
 * 
 * SECURITY CRITICAL:
 * - This server should run in an isolated environment
 * - Only accept connections from trusted internal services
 * - Never expose to public internet
 */

import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import jwt from 'jsonwebtoken';
import path from 'path';
import { KeyVault } from './vault';

// ============================================================================
// CONFIG
// ============================================================================

const PORT = process.env.KEY_VAULT_PORT || 4000;
const MASTER_KEY = process.env.KEY_VAULT_MASTER_KEY;
const JWT_SECRET = process.env.KEY_VAULT_JWT_SECRET;
const ALLOWED_ORIGINS = (process.env.KEY_VAULT_ALLOWED_ORIGINS || 'http://localhost:3000').split(',');
const DB_PATH = process.env.KEY_VAULT_DB_PATH || path.join(__dirname, '../data/vault.db');

// Validate required env vars
if (!MASTER_KEY) {
  console.error('❌ FATAL: KEY_VAULT_MASTER_KEY not set');
  process.exit(1);
}
if (!JWT_SECRET) {
  console.error('❌ FATAL: KEY_VAULT_JWT_SECRET not set');
  process.exit(1);
}

// ============================================================================
// INIT
// ============================================================================

const app = express();
const vault = new KeyVault(DB_PATH, MASTER_KEY);

// ============================================================================
// MIDDLEWARE
// ============================================================================

// Security headers
app.use(helmet());

// CORS - only allow trusted origins
app.use(cors({
  origin: ALLOWED_ORIGINS,
  credentials: true,
}));

// Parse JSON
app.use(express.json({ limit: '1mb' }));

// Rate limiting - very strict
const limiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // 30 requests per minute per IP
  message: { error: 'Too many requests, slow down' },
});
app.use(limiter);

// Signing rate limit - even stricter
const signingLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10, // 10 signing requests per minute
  message: { error: 'Signing rate limit exceeded' },
});

// ============================================================================
// AUTH MIDDLEWARE
// ============================================================================

interface AuthRequest extends express.Request {
  userId?: string;
  serviceId?: string;
}

function authMiddleware(req: AuthRequest, res: express.Response, next: express.NextFunction) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const token = authHeader.substring(7);
  
  try {
    const payload = jwt.verify(token, JWT_SECRET!) as { userId: string; serviceId: string };
    req.userId = payload.userId;
    req.serviceId = payload.serviceId;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

// ============================================================================
// ROUTES
// ============================================================================

// Health check (no auth)
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

// Store a new key
app.post('/keys', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { privateKey, publicAddress, chain } = req.body;

    if (!privateKey || !publicAddress || !chain) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    if (!['solana', 'evm'].includes(chain)) {
      return res.status(400).json({ error: 'Invalid chain' });
    }

    const keyBuffer = Buffer.from(privateKey, 'base64');
    const ipAddress = req.ip || req.headers['x-forwarded-for'] as string || 'unknown';

    const keyId = vault.storeKey({
      userId: req.userId!,
      privateKey: keyBuffer,
      publicAddress,
      chain,
      ipAddress,
    });

    res.json({ id: keyId, publicAddress, chain });
  } catch (error: any) {
    console.error('Store key error:', error);
    res.status(500).json({ error: error.message || 'Failed to store key' });
  }
});

// List keys for user
app.get('/keys', authMiddleware, (req: AuthRequest, res) => {
  try {
    const keys = vault.listKeys(req.userId!);
    res.json(keys);
  } catch (error: any) {
    console.error('List keys error:', error);
    res.status(500).json({ error: 'Failed to list keys' });
  }
});

// Delete a key
app.delete('/keys/:keyId', authMiddleware, (req: AuthRequest, res) => {
  try {
    const ipAddress = req.ip || (Array.isArray(req.headers['x-forwarded-for']) ? req.headers['x-forwarded-for'][0] : req.headers['x-forwarded-for']) || 'unknown';
    const keyId = Array.isArray(req.params.keyId) ? req.params.keyId[0] : req.params.keyId;
    const deleted = vault.deleteKey(keyId, req.userId!, ipAddress);
    
    if (deleted) {
      res.json({ success: true });
    } else {
      res.status(404).json({ error: 'Key not found' });
    }
  } catch (error: any) {
    console.error('Delete key error:', error);
    res.status(500).json({ error: 'Failed to delete key' });
  }
});

// Sign a Solana transaction
app.post('/sign/solana', authMiddleware, signingLimiter, async (req: AuthRequest, res) => {
  try {
    const { keyId, transaction } = req.body;

    if (!keyId || !transaction) {
      return res.status(400).json({ error: 'Missing keyId or transaction' });
    }

    const ipAddress = req.ip || req.headers['x-forwarded-for'] as string || 'unknown';

    const signature = await vault.signSolanaTransaction({
      keyId,
      userId: req.userId!,
      transaction,
      ipAddress,
    });

    res.json({ signature });
  } catch (error: any) {
    console.error('Sign Solana error:', error);
    res.status(500).json({ error: error.message || 'Signing failed' });
  }
});

// Sign an EVM transaction
app.post('/sign/evm', authMiddleware, signingLimiter, async (req: AuthRequest, res) => {
  try {
    const { keyId, transaction } = req.body;

    if (!keyId || !transaction) {
      return res.status(400).json({ error: 'Missing keyId or transaction' });
    }

    const ipAddress = req.ip || req.headers['x-forwarded-for'] as string || 'unknown';

    const signedTx = await vault.signEvmTransaction({
      keyId,
      userId: req.userId!,
      transaction,
      ipAddress,
    });

    res.json({ signedTransaction: signedTx });
  } catch (error: any) {
    console.error('Sign EVM error:', error);
    res.status(500).json({ error: error.message || 'Signing failed' });
  }
});

// Get audit logs
app.get('/audit', authMiddleware, (req: AuthRequest, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 100, 1000);
    const logs = vault.getAuditLogs(req.userId!, limit);
    res.json(logs);
  } catch (error: any) {
    console.error('Audit logs error:', error);
    res.status(500).json({ error: 'Failed to get audit logs' });
  }
});

// ============================================================================
// ERROR HANDLER
// ============================================================================

app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// ============================================================================
// START
// ============================================================================

app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════════════════╗
║                                                        ║
║   🔐 KEY VAULT SERVER                                  ║
║   ─────────────────                                    ║
║   Port: ${PORT}                                          ║
║   DB: ${DB_PATH.slice(-30).padStart(30)}               ║
║                                                        ║
║   ⚠️  SECURITY CRITICAL SERVICE                        ║
║   • Keep master key SECRET                             ║
║   • Do NOT expose to public internet                   ║
║   • Monitor audit logs regularly                       ║
║                                                        ║
╚════════════════════════════════════════════════════════╝
`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('Shutting down key vault...');
  vault.close();
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('Shutting down key vault...');
  vault.close();
  process.exit(0);
});
