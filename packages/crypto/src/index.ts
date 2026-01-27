/**
 * @xeonen/crypto - Secure encryption utilities for private key management
 * 
 * SECURITY CRITICAL - DO NOT MODIFY WITHOUT SECURITY REVIEW
 * 
 * Uses AES-256-GCM for authenticated encryption
 * - 256-bit key
 * - 96-bit IV (recommended for GCM)
 * - 128-bit auth tag
 */

import crypto from 'crypto';

// Constants
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // 96 bits - recommended for GCM
const AUTH_TAG_LENGTH = 16; // 128 bits
const KEY_LENGTH = 32; // 256 bits
const SALT_LENGTH = 32;
const PBKDF2_ITERATIONS = 100000;

export interface EncryptedData {
  /** Base64 encoded ciphertext */
  ciphertext: string;
  /** Base64 encoded IV */
  iv: string;
  /** Base64 encoded auth tag */
  authTag: string;
  /** Base64 encoded salt (if password-derived) */
  salt?: string;
  /** Algorithm identifier */
  alg: 'aes-256-gcm';
  /** Version for future upgrades */
  v: 1;
}

/**
 * Generate a cryptographically secure random key
 */
export function generateKey(): Buffer {
  return crypto.randomBytes(KEY_LENGTH);
}

/**
 * Derive a key from a password using PBKDF2
 */
export function deriveKeyFromPassword(password: string, salt?: Buffer): { key: Buffer; salt: Buffer } {
  const useSalt = salt || crypto.randomBytes(SALT_LENGTH);
  const key = crypto.pbkdf2Sync(password, useSalt, PBKDF2_ITERATIONS, KEY_LENGTH, 'sha256');
  return { key, salt: useSalt };
}

/**
 * Encrypt data using AES-256-GCM
 * 
 * @param plaintext - Data to encrypt (string or Buffer)
 * @param key - 256-bit encryption key
 * @returns Encrypted data object
 */
export function encrypt(plaintext: string | Buffer, key: Buffer): EncryptedData {
  if (key.length !== KEY_LENGTH) {
    throw new Error(`Invalid key length: expected ${KEY_LENGTH} bytes, got ${key.length}`);
  }

  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH });
  
  const data = Buffer.isBuffer(plaintext) ? plaintext : Buffer.from(plaintext, 'utf8');
  const encrypted = Buffer.concat([cipher.update(data), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return {
    ciphertext: encrypted.toString('base64'),
    iv: iv.toString('base64'),
    authTag: authTag.toString('base64'),
    alg: 'aes-256-gcm',
    v: 1,
  };
}

/**
 * Decrypt data using AES-256-GCM
 * 
 * @param encrypted - Encrypted data object
 * @param key - 256-bit decryption key
 * @returns Decrypted plaintext as Buffer
 */
export function decrypt(encrypted: EncryptedData, key: Buffer): Buffer {
  if (key.length !== KEY_LENGTH) {
    throw new Error(`Invalid key length: expected ${KEY_LENGTH} bytes, got ${key.length}`);
  }

  if (encrypted.alg !== 'aes-256-gcm') {
    throw new Error(`Unsupported algorithm: ${encrypted.alg}`);
  }

  const iv = Buffer.from(encrypted.iv, 'base64');
  const authTag = Buffer.from(encrypted.authTag, 'base64');
  const ciphertext = Buffer.from(encrypted.ciphertext, 'base64');

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH });
  decipher.setAuthTag(authTag);

  try {
    return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  } catch (error) {
    throw new Error('Decryption failed: invalid key or corrupted data');
  }
}

/**
 * Encrypt with password (includes salt in output)
 */
export function encryptWithPassword(plaintext: string | Buffer, password: string): EncryptedData {
  const { key, salt } = deriveKeyFromPassword(password);
  const encrypted = encrypt(plaintext, key);
  encrypted.salt = salt.toString('base64');
  return encrypted;
}

/**
 * Decrypt with password
 */
export function decryptWithPassword(encrypted: EncryptedData, password: string): Buffer {
  if (!encrypted.salt) {
    throw new Error('Missing salt for password-based decryption');
  }
  const salt = Buffer.from(encrypted.salt, 'base64');
  const { key } = deriveKeyFromPassword(password, salt);
  return decrypt(encrypted, key);
}

/**
 * Securely compare two buffers in constant time (timing-attack safe)
 */
export function secureCompare(a: Buffer, b: Buffer): boolean {
  if (a.length !== b.length) {
    return false;
  }
  return crypto.timingSafeEqual(a, b);
}

/**
 * Generate a secure random hex string
 */
export function randomHex(bytes: number): string {
  return crypto.randomBytes(bytes).toString('hex');
}

/**
 * Hash data with SHA-256
 */
export function sha256(data: string | Buffer): Buffer {
  return crypto.createHash('sha256').update(data).digest();
}

/**
 * HMAC-SHA256
 */
export function hmacSha256(data: string | Buffer, key: Buffer): Buffer {
  return crypto.createHmac('sha256', key).update(data).digest();
}

// Re-export types
export type { EncryptedData as EncryptedKey };
