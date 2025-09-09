// Encryption utilities for secure data handling

import crypto from 'crypto'

export class EncryptionUtils {
  private static readonly ALGORITHM = 'aes-256-gcm'
  private static readonly KEY_LENGTH = 32
  private static readonly IV_LENGTH = 16
  private static readonly TAG_LENGTH = 16

  // Generate a random encryption key
  static generateKey(): string {
    return crypto.randomBytes(this.KEY_LENGTH).toString('hex')
  }

  // Generate a random salt
  static generateSalt(): string {
    return crypto.randomBytes(16).toString('hex')
  }

  // Generate a random IV
  static generateIV(): Buffer {
    return crypto.randomBytes(this.IV_LENGTH)
  }

  // Encrypt data using AES-256-GCM
  static encrypt(data: string, key?: string): {
    encrypted: string
    iv: string
    tag: string
    key?: string
  } {
    try {
      const encryptionKey = key ? Buffer.from(key, 'hex') : crypto.randomBytes(this.KEY_LENGTH)
      const iv = this.generateIV()
      
      const cipher = crypto.createCipher(this.ALGORITHM, encryptionKey)
      cipher.setAAD(Buffer.from('sfmc-dev-suite', 'utf8'))
      
      let encrypted = cipher.update(data, 'utf8', 'hex')
      encrypted += cipher.final('hex')
      
      const tag = cipher.getAuthTag()
      
      return {
        encrypted,
        iv: iv.toString('hex'),
        tag: tag.toString('hex'),
        key: key ? undefined : encryptionKey.toString('hex')
      }
    } catch (error) {
      throw new Error(`Encryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  // Decrypt data using AES-256-GCM
  static decrypt(encrypted: string, key: string, iv: string, tag: string): string {
    try {
      const encryptionKey = Buffer.from(key, 'hex')
      const ivBuffer = Buffer.from(iv, 'hex')
      const tagBuffer = Buffer.from(tag, 'hex')
      
      const decipher = crypto.createDecipher(this.ALGORITHM, encryptionKey)
      decipher.setAAD(Buffer.from('sfmc-dev-suite', 'utf8'))
      decipher.setAuthTag(tagBuffer)
      
      let decrypted = decipher.update(encrypted, 'hex', 'utf8')
      decrypted += decipher.final('utf8')
      
      return decrypted
    } catch (error) {
      throw new Error(`Decryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  // Encrypt SFMC credentials
  static encryptCredentials(credentials: {
    clientId: string
    clientSecret: string
    subdomain: string
  }): {
    clientId: string
    encryptedClientSecret: string
    subdomain: string
    iv: string
    tag: string
    key: string
  } {
    const result = this.encrypt(credentials.clientSecret)
    
    return {
      clientId: credentials.clientId,
      encryptedClientSecret: result.encrypted,
      subdomain: credentials.subdomain,
      iv: result.iv,
      tag: result.tag,
      key: result.key!
    }
  }

  // Decrypt SFMC credentials
  static decryptCredentials(encryptedCredentials: {
    clientId: string
    encryptedClientSecret: string
    subdomain: string
    iv: string
    tag: string
    key: string
  }): {
    clientId: string
    clientSecret: string
    subdomain: string
  } {
    const clientSecret = this.decrypt(
      encryptedCredentials.encryptedClientSecret,
      encryptedCredentials.key,
      encryptedCredentials.iv,
      encryptedCredentials.tag
    )
    
    return {
      clientId: encryptedCredentials.clientId,
      clientSecret,
      subdomain: encryptedCredentials.subdomain
    }
  }

  // Encrypt JWT tokens
  static encryptToken(token: string, key?: string): {
    encryptedToken: string
    iv: string
    tag: string
    key?: string
  } {
    const result = this.encrypt(token, key)
    
    return {
      encryptedToken: result.encrypted,
      iv: result.iv,
      tag: result.tag,
      key: result.key
    }
  }

  // Decrypt JWT tokens
  static decryptToken(encryptedToken: string, key: string, iv: string, tag: string): string {
    return this.decrypt(encryptedToken, key, iv, tag)
  }

  // Generate a secure session ID
  static generateSessionId(): string {
    const timestamp = Date.now().toString(36)
    const randomBytes = crypto.randomBytes(16).toString('hex')
    return `sess_${timestamp}_${randomBytes}`
  }

  // Generate a secure request ID
  static generateRequestId(): string {
    const timestamp = Date.now()
    const randomString = crypto.randomBytes(6).toString('base64url')
    return `req_${timestamp}_${randomString}`
  }

  // Create HMAC signature
  static createHMAC(data: string, secret: string): string {
    return crypto.createHmac('sha256', secret).update(data).digest('hex')
  }

  // Verify HMAC signature
  static verifyHMAC(data: string, signature: string, secret: string): boolean {
    const expectedSignature = this.createHMAC(data, secret)
    return crypto.timingSafeEqual(
      Buffer.from(signature, 'hex'),
      Buffer.from(expectedSignature, 'hex')
    )
  }

  // Generate API key
  static generateApiKey(): string {
    return crypto.randomBytes(32).toString('base64url')
  }

  // Mask sensitive data for logging
  static maskSensitiveData(data: string, visibleChars: number = 4): string {
    if (data.length <= visibleChars * 2) {
      return '*'.repeat(data.length)
    }
    
    const start = data.substring(0, visibleChars)
    const end = data.substring(data.length - visibleChars)
    const masked = '*'.repeat(data.length - (visibleChars * 2))
    
    return `${start}${masked}${end}`
  }

  // Secure random string generation
  static generateSecureRandom(length: number = 32): string {
    return crypto.randomBytes(length).toString('base64url').substring(0, length)
  }

  // Key derivation using PBKDF2
  static deriveKey(password: string, salt: string, iterations: number = 100000): string {
    return crypto.pbkdf2Sync(password, salt, iterations, this.KEY_LENGTH, 'sha256').toString('hex')
  }

  // Constant-time string comparison
  static constantTimeCompare(a: string, b: string): boolean {
    if (a.length !== b.length) {
      return false
    }
    
    return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b))
  }
}