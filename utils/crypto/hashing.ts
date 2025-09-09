// Hashing utilities for data integrity and security

import crypto from 'crypto'

export class HashingUtils {
  // Generate SHA-256 hash
  static sha256(data: string): string {
    return crypto.createHash('sha256').update(data).digest('hex')
  }

  // Generate SHA-512 hash
  static sha512(data: string): string {
    return crypto.createHash('sha512').update(data).digest('hex')
  }

  // Generate MD5 hash (for non-security purposes only)
  static md5(data: string): string {
    return crypto.createHash('md5').update(data).digest('hex')
  }

  // Generate bcrypt-style hash for passwords
  static async hashPassword(password: string, saltRounds: number = 12): Promise<string> {
    // Note: In a real implementation, you'd use bcrypt library
    // This is a simplified version using Node.js crypto
    const salt = crypto.randomBytes(16).toString('hex')
    const hash = crypto.pbkdf2Sync(password, salt, Math.pow(2, saltRounds), 64, 'sha512').toString('hex')
    return `${salt}:${hash}`
  }

  // Verify password against hash
  static async verifyPassword(password: string, hash: string): Promise<boolean> {
    try {
      const [salt, storedHash] = hash.split(':')
      const computedHash = crypto.pbkdf2Sync(password, salt, Math.pow(2, 12), 64, 'sha512').toString('hex')
      return crypto.timingSafeEqual(Buffer.from(storedHash, 'hex'), Buffer.from(computedHash, 'hex'))
    } catch {
      return false
    }
  }

  // Generate content hash for caching
  static generateContentHash(content: string): string {
    return this.sha256(content).substring(0, 16)
  }

  // Generate file hash
  static generateFileHash(buffer: Buffer): string {
    return crypto.createHash('sha256').update(buffer).digest('hex')
  }

  // Generate ETag for HTTP caching
  static generateETag(content: string): string {
    const hash = this.sha256(content).substring(0, 16)
    return `"${hash}"`
  }

  // Generate fingerprint for error tracking
  static generateFingerprint(error: {
    type: string
    message: string
    stack?: string
  }): string {
    const data = `${error.type}:${error.message}`
    return this.sha256(data).substring(0, 12)
  }

  // Generate cache key
  static generateCacheKey(prefix: string, ...parts: string[]): string {
    const combined = parts.join(':')
    const hash = this.sha256(combined).substring(0, 12)
    return `${prefix}:${hash}`
  }

  // Generate session fingerprint
  static generateSessionFingerprint(userAgent: string, ip: string): string {
    const data = `${userAgent}:${ip}`
    return this.sha256(data).substring(0, 16)
  }

  // Generate API request signature
  static generateRequestSignature(
    method: string,
    url: string,
    body: string,
    timestamp: number,
    secret: string
  ): string {
    const data = `${method}:${url}:${body}:${timestamp}`
    return crypto.createHmac('sha256', secret).update(data).digest('hex')
  }

  // Verify API request signature
  static verifyRequestSignature(
    method: string,
    url: string,
    body: string,
    timestamp: number,
    signature: string,
    secret: string,
    maxAge: number = 300000 // 5 minutes
  ): boolean {
    // Check timestamp to prevent replay attacks
    const now = Date.now()
    if (Math.abs(now - timestamp) > maxAge) {
      return false
    }

    const expectedSignature = this.generateRequestSignature(method, url, body, timestamp, secret)
    return crypto.timingSafeEqual(
      Buffer.from(signature, 'hex'),
      Buffer.from(expectedSignature, 'hex')
    )
  }

  // Generate deterministic ID from content
  static generateDeterministicId(content: string, prefix: string = ''): string {
    const hash = this.sha256(content).substring(0, 16)
    return prefix ? `${prefix}_${hash}` : hash
  }

  // Generate short hash for URLs
  static generateShortHash(data: string, length: number = 8): string {
    return this.sha256(data).substring(0, length)
  }

  // Generate checksum for data integrity
  static generateChecksum(data: string): string {
    return this.sha256(data)
  }

  // Verify data integrity using checksum
  static verifyChecksum(data: string, expectedChecksum: string): boolean {
    const actualChecksum = this.generateChecksum(data)
    return crypto.timingSafeEqual(
      Buffer.from(actualChecksum, 'hex'),
      Buffer.from(expectedChecksum, 'hex')
    )
  }

  // Generate hash for rate limiting keys
  static generateRateLimitKey(identifier: string, window: string): string {
    return `rate_limit:${this.sha256(`${identifier}:${window}`).substring(0, 12)}`
  }

  // Generate hash for circuit breaker keys
  static generateCircuitBreakerKey(service: string, operation: string): string {
    return `circuit_breaker:${this.sha256(`${service}:${operation}`).substring(0, 12)}`
  }

  // Generate consistent hash for load balancing
  static generateConsistentHash(key: string, buckets: number): number {
    const hash = parseInt(this.sha256(key).substring(0, 8), 16)
    return hash % buckets
  }

  // Generate bloom filter hash
  static generateBloomFilterHashes(item: string, numHashes: number): number[] {
    const hashes: number[] = []
    let hash1 = this.fnv1aHash(item)
    let hash2 = this.djb2Hash(item)

    for (let i = 0; i < numHashes; i++) {
      hashes.push(Math.abs((hash1 + i * hash2) % (1 << 31)))
    }

    return hashes
  }

  // FNV-1a hash function
  private static fnv1aHash(str: string): number {
    let hash = 2166136261
    for (let i = 0; i < str.length; i++) {
      hash ^= str.charCodeAt(i)
      hash *= 16777619
    }
    return hash >>> 0
  }

  // DJB2 hash function
  private static djb2Hash(str: string): number {
    let hash = 5381
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) + hash + str.charCodeAt(i)) & 0xffffffff
    }
    return hash >>> 0
  }
}