import crypto from 'crypto';
import { ErrorFactory } from '../../utils/errors/error-factory';
import { ErrorType } from '../../types/errors';

export class EncryptionService {
  private readonly algorithm = 'aes-256-gcm';
  private readonly keyLength = 32;
  private readonly ivLength = 16;
  private readonly tagLength = 16;
  private readonly encryptionKey: Buffer;

  constructor() {
    const key = process.env.ENCRYPTION_KEY;
    if (!key) {
      throw ErrorFactory.createApplicationError(
        ErrorType.INTERNAL_SERVER_ERROR,
        'ENCRYPTION_KEY environment variable is required',
        'ENCRYPTION_KEY_MISSING'
      );
    }
    
    // Derive a consistent key from the provided key
    this.encryptionKey = crypto.scryptSync(key, 'salt', this.keyLength);
  }

  async encrypt(plaintext: string): Promise<string> {
    try {
      const iv = crypto.randomBytes(this.ivLength);
      const cipher = crypto.createCipheriv(this.algorithm, this.encryptionKey, iv);
      cipher.setAAD(Buffer.from('session-data'));

      let encrypted = cipher.update(plaintext, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      const tag = cipher.getAuthTag();
      
      // Combine iv, tag, and encrypted data
      const result = iv.toString('hex') + ':' + tag.toString('hex') + ':' + encrypted;
      return result;
    } catch (error) {
      throw ErrorFactory.createApplicationError(
        ErrorType.INTERNAL_SERVER_ERROR,
        'Encryption failed',
        'ENCRYPTION_FAILED'
      );
    }
  }

  async decrypt(encryptedData: string): Promise<string> {
    try {
      const parts = encryptedData.split(':');
      if (parts.length !== 3) {
        throw new Error('Invalid encrypted data format');
      }

      const iv = Buffer.from(parts[0], 'hex');
      const tag = Buffer.from(parts[1], 'hex');
      const encrypted = parts[2];

      const decipher = crypto.createDecipheriv(this.algorithm, this.encryptionKey, iv);
      decipher.setAAD(Buffer.from('session-data'));
      decipher.setAuthTag(tag);

      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      return decrypted;
    } catch (error) {
      throw ErrorFactory.createApplicationError(
        ErrorType.INTERNAL_SERVER_ERROR,
        'Decryption failed',
        'DECRYPTION_FAILED'
      );
    }
  }

  generateSecureToken(length: number = 32): string {
    return crypto.randomBytes(length).toString('hex');
  }

  hashPassword(password: string, salt?: string): { hash: string; salt: string } {
    const actualSalt = salt || crypto.randomBytes(16).toString('hex');
    const hash = crypto.scryptSync(password, actualSalt, 64).toString('hex');
    return { hash, salt: actualSalt };
  }

  verifyPassword(password: string, hash: string, salt: string): boolean {
    const { hash: computedHash } = this.hashPassword(password, salt);
    return computedHash === hash;
  }
}