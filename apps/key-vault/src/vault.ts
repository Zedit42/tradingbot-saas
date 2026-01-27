/**
 * Key Vault - Secure storage for private keys
 * 
 * SECURITY CRITICAL:
 * - Keys are NEVER exposed outside this service
 * - Only signed transactions are returned
 * - All access is logged
 */

import crypto from 'crypto';
import Database from 'better-sqlite3';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';

// Encryption constants (must match @xeonen/crypto)
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;
const KEY_LENGTH = 32;

interface StoredKey {
  id: string;
  userId: string;
  publicAddress: string;
  chain: 'solana' | 'evm';
  encryptedKey: string; // JSON: { ciphertext, iv, authTag }
  createdAt: number;
  lastUsedAt: number | null;
}

interface AuditLog {
  id: string;
  keyId: string;
  userId: string;
  action: 'create' | 'sign' | 'delete' | 'access_denied';
  metadata: string; // JSON
  ipAddress: string;
  timestamp: number;
}

export class KeyVault {
  private db: Database.Database;
  private masterKey: Buffer;

  constructor(dbPath: string, masterKeyHex: string) {
    // Validate master key
    if (!masterKeyHex || masterKeyHex.length !== 64) {
      throw new Error('Invalid master key: must be 64 hex characters (256 bits)');
    }
    this.masterKey = Buffer.from(masterKeyHex, 'hex');

    // Initialize database
    this.db = new Database(dbPath);
    this.db.pragma('journal_mode = WAL');
    this.initTables();
  }

  private initTables() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS keys (
        id TEXT PRIMARY KEY,
        userId TEXT NOT NULL,
        publicAddress TEXT NOT NULL,
        chain TEXT NOT NULL,
        encryptedKey TEXT NOT NULL,
        createdAt INTEGER NOT NULL,
        lastUsedAt INTEGER,
        UNIQUE(userId, publicAddress)
      );

      CREATE INDEX IF NOT EXISTS idx_keys_user ON keys(userId);
      CREATE INDEX IF NOT EXISTS idx_keys_address ON keys(publicAddress);

      CREATE TABLE IF NOT EXISTS audit_logs (
        id TEXT PRIMARY KEY,
        keyId TEXT,
        userId TEXT NOT NULL,
        action TEXT NOT NULL,
        metadata TEXT,
        ipAddress TEXT,
        timestamp INTEGER NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_logs(userId);
      CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON audit_logs(timestamp);
    `);
  }

  /**
   * Encrypt a private key for storage
   */
  private encrypt(plaintext: Buffer): string {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, this.masterKey, iv, { 
      authTagLength: AUTH_TAG_LENGTH 
    });
    
    const encrypted = Buffer.concat([cipher.update(plaintext), cipher.final()]);
    const authTag = cipher.getAuthTag();

    return JSON.stringify({
      ciphertext: encrypted.toString('base64'),
      iv: iv.toString('base64'),
      authTag: authTag.toString('base64'),
    });
  }

  /**
   * Decrypt a private key from storage
   */
  private decrypt(encryptedJson: string): Buffer {
    const { ciphertext, iv, authTag } = JSON.parse(encryptedJson);
    
    const decipher = crypto.createDecipheriv(
      ALGORITHM, 
      this.masterKey, 
      Buffer.from(iv, 'base64'),
      { authTagLength: AUTH_TAG_LENGTH }
    );
    decipher.setAuthTag(Buffer.from(authTag, 'base64'));

    return Buffer.concat([
      decipher.update(Buffer.from(ciphertext, 'base64')),
      decipher.final()
    ]);
  }

  /**
   * Store a new private key
   */
  storeKey(params: {
    userId: string;
    privateKey: Buffer;
    publicAddress: string;
    chain: 'solana' | 'evm';
    ipAddress: string;
  }): string {
    const id = uuidv4();
    const encryptedKey = this.encrypt(params.privateKey);
    const now = Date.now();

    const stmt = this.db.prepare(`
      INSERT INTO keys (id, userId, publicAddress, chain, encryptedKey, createdAt, lastUsedAt)
      VALUES (?, ?, ?, ?, ?, ?, NULL)
    `);

    try {
      stmt.run(id, params.userId, params.publicAddress, params.chain, encryptedKey, now);
    } catch (error: any) {
      if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
        throw new Error('Key already exists for this address');
      }
      throw error;
    }

    // Audit log
    this.log({
      keyId: id,
      userId: params.userId,
      action: 'create',
      metadata: { publicAddress: params.publicAddress, chain: params.chain },
      ipAddress: params.ipAddress,
    });

    // Clear the private key from memory
    params.privateKey.fill(0);

    return id;
  }

  /**
   * Get private key for signing (INTERNAL USE ONLY)
   * Returns the decrypted key - handle with extreme care
   */
  private getKeyForSigning(keyId: string, userId: string): Buffer {
    const stmt = this.db.prepare(`
      SELECT * FROM keys WHERE id = ? AND userId = ?
    `);
    const row = stmt.get(keyId, userId) as StoredKey | undefined;

    if (!row) {
      throw new Error('Key not found');
    }

    // Update last used
    this.db.prepare('UPDATE keys SET lastUsedAt = ? WHERE id = ?').run(Date.now(), keyId);

    return this.decrypt(row.encryptedKey);
  }

  /**
   * Sign a Solana transaction
   */
  async signSolanaTransaction(params: {
    keyId: string;
    userId: string;
    transaction: string; // Base64 encoded serialized transaction
    ipAddress: string;
  }): Promise<string> {
    // Get key
    const privateKey = this.getKeyForSigning(params.keyId, params.userId);

    try {
      // Import Solana libraries dynamically
      const { Keypair } = await import('@solana/web3.js');
      
      // Create keypair from secret key
      const keypair = Keypair.fromSecretKey(privateKey);
      
      // Decode and sign transaction
      const txBuffer = Buffer.from(params.transaction, 'base64');
      const signature = keypair.sign(txBuffer);

      // Audit log
      this.log({
        keyId: params.keyId,
        userId: params.userId,
        action: 'sign',
        metadata: { chain: 'solana', txHash: Buffer.from(signature).toString('hex').slice(0, 16) + '...' },
        ipAddress: params.ipAddress,
      });

      return Buffer.from(signature).toString('base64');
    } finally {
      // Clear key from memory
      privateKey.fill(0);
    }
  }

  /**
   * Sign an EVM transaction
   */
  async signEvmTransaction(params: {
    keyId: string;
    userId: string;
    transaction: object; // Transaction object
    ipAddress: string;
  }): Promise<string> {
    // Get key
    const privateKey = this.getKeyForSigning(params.keyId, params.userId);

    try {
      // Import viem dynamically
      const { privateKeyToAccount, signTransaction } = await import('viem/accounts');
      
      const account = privateKeyToAccount(`0x${privateKey.toString('hex')}`);
      const signedTx = await account.signTransaction(params.transaction as any);

      // Audit log
      this.log({
        keyId: params.keyId,
        userId: params.userId,
        action: 'sign',
        metadata: { chain: 'evm' },
        ipAddress: params.ipAddress,
      });

      return signedTx;
    } finally {
      // Clear key from memory
      privateKey.fill(0);
    }
  }

  /**
   * List keys for a user (public info only - NO private keys)
   */
  listKeys(userId: string): Array<{
    id: string;
    publicAddress: string;
    chain: string;
    createdAt: number;
    lastUsedAt: number | null;
  }> {
    const stmt = this.db.prepare(`
      SELECT id, publicAddress, chain, createdAt, lastUsedAt
      FROM keys WHERE userId = ?
    `);
    return stmt.all(userId) as any[];
  }

  /**
   * Delete a key
   */
  deleteKey(keyId: string, userId: string, ipAddress: string): boolean {
    const stmt = this.db.prepare('DELETE FROM keys WHERE id = ? AND userId = ?');
    const result = stmt.run(keyId, userId);

    if (result.changes > 0) {
      this.log({
        keyId,
        userId,
        action: 'delete',
        metadata: {},
        ipAddress,
      });
      return true;
    }
    return false;
  }

  /**
   * Write audit log
   */
  private log(params: {
    keyId: string | null;
    userId: string;
    action: AuditLog['action'];
    metadata: object;
    ipAddress: string;
  }) {
    const stmt = this.db.prepare(`
      INSERT INTO audit_logs (id, keyId, userId, action, metadata, ipAddress, timestamp)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      uuidv4(),
      params.keyId,
      params.userId,
      params.action,
      JSON.stringify(params.metadata),
      params.ipAddress,
      Date.now()
    );
  }

  /**
   * Get audit logs for a user
   */
  getAuditLogs(userId: string, limit = 100): AuditLog[] {
    const stmt = this.db.prepare(`
      SELECT * FROM audit_logs WHERE userId = ? ORDER BY timestamp DESC LIMIT ?
    `);
    return stmt.all(userId, limit) as AuditLog[];
  }

  /**
   * Close database connection
   */
  close() {
    this.db.close();
  }
}
