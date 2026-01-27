/**
 * Key Vault Client
 * 
 * Client for communicating with the isolated Key Vault service
 * Used by the main web app to manage and use keys
 */

import jwt from 'jsonwebtoken';

const KEY_VAULT_URL = process.env.KEY_VAULT_URL || 'http://localhost:4000';
const KEY_VAULT_JWT_SECRET = process.env.KEY_VAULT_JWT_SECRET;

interface VaultKey {
  id: string;
  publicAddress: string;
  chain: 'solana' | 'evm';
  createdAt: number;
  lastUsedAt: number | null;
}

interface AuditLog {
  id: string;
  keyId: string;
  userId: string;
  action: string;
  metadata: string;
  ipAddress: string;
  timestamp: number;
}

/**
 * Generate a service token for vault communication
 */
function generateServiceToken(userId: string): string {
  if (!KEY_VAULT_JWT_SECRET) {
    throw new Error('KEY_VAULT_JWT_SECRET not configured');
  }

  return jwt.sign(
    { userId, serviceId: 'xeonen-web' },
    KEY_VAULT_JWT_SECRET,
    { expiresIn: '5m' } // Short-lived tokens
  );
}

/**
 * Make authenticated request to vault
 */
async function vaultRequest<T>(
  endpoint: string,
  userId: string,
  options: RequestInit = {}
): Promise<T> {
  const token = generateServiceToken(userId);

  const response = await fetch(`${KEY_VAULT_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      ...options.headers,
    },
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || `Vault request failed: ${response.status}`);
  }

  return data as T;
}

/**
 * Key Vault Client
 */
export const keyVaultClient = {
  /**
   * Store a new private key in the vault
   */
  async storeKey(params: {
    userId: string;
    privateKey: Buffer;
    publicAddress: string;
    chain: 'solana' | 'evm';
  }): Promise<{ id: string; publicAddress: string; chain: string }> {
    return vaultRequest('/keys', params.userId, {
      method: 'POST',
      body: JSON.stringify({
        privateKey: params.privateKey.toString('base64'),
        publicAddress: params.publicAddress,
        chain: params.chain,
      }),
    });
  },

  /**
   * List keys for a user
   */
  async listKeys(userId: string): Promise<VaultKey[]> {
    return vaultRequest('/keys', userId);
  },

  /**
   * Delete a key
   */
  async deleteKey(userId: string, keyId: string): Promise<{ success: boolean }> {
    return vaultRequest(`/keys/${keyId}`, userId, { method: 'DELETE' });
  },

  /**
   * Sign a Solana transaction
   */
  async signSolanaTransaction(params: {
    userId: string;
    keyId: string;
    transaction: Buffer;
  }): Promise<{ signature: string }> {
    return vaultRequest('/sign/solana', params.userId, {
      method: 'POST',
      body: JSON.stringify({
        keyId: params.keyId,
        transaction: params.transaction.toString('base64'),
      }),
    });
  },

  /**
   * Sign an EVM transaction
   */
  async signEvmTransaction(params: {
    userId: string;
    keyId: string;
    transaction: object;
  }): Promise<{ signedTransaction: string }> {
    return vaultRequest('/sign/evm', params.userId, {
      method: 'POST',
      body: JSON.stringify({
        keyId: params.keyId,
        transaction: params.transaction,
      }),
    });
  },

  /**
   * Get audit logs
   */
  async getAuditLogs(userId: string, limit = 100): Promise<AuditLog[]> {
    return vaultRequest(`/audit?limit=${limit}`, userId);
  },

  /**
   * Health check
   */
  async health(): Promise<{ status: string; timestamp: number }> {
    const response = await fetch(`${KEY_VAULT_URL}/health`);
    return response.json();
  },
};
