import { EncryptionService } from '../encryption-service'

describe('EncryptionService', () => {
  let service: EncryptionService
  const originalEnv = process.env.ENCRYPTION_KEY

  beforeEach(() => {
    // Set a test encryption key
    process.env.ENCRYPTION_KEY = 'test-encryption-key-for-unit-tests'
    service = new EncryptionService()
  })

  afterEach(() => {
    // Restore original environment
    if (originalEnv) {
      process.env.ENCRYPTION_KEY = originalEnv
    } else {
      delete process.env.ENCRYPTION_KEY
    }
  })

  describe('initialization', () => {
    it('should initialize successfully with valid encryption key', () => {
      expect(service).toBeInstanceOf(EncryptionService)
    })

    it('should throw error when ENCRYPTION_KEY is not provided', () => {
      delete process.env.ENCRYPTION_KEY
      
      expect(() => new EncryptionService()).toThrow('ENCRYPTION_KEY environment variable is required')
    })

    it('should throw error when ENCRYPTION_KEY is empty', () => {
      process.env.ENCRYPTION_KEY = ''
      
      expect(() => new EncryptionService()).toThrow('ENCRYPTION_KEY environment variable is required')
    })
  })

  describe('encryption and decryption', () => {
    it('should encrypt and decrypt text successfully', async () => {
      const plaintext = 'Hello, World!'
      
      const encrypted = await service.encrypt(plaintext)
      expect(encrypted).toBeDefined()
      expect(encrypted).not.toBe(plaintext)
      expect(encrypted).toContain(':') // Should contain separators
      
      const decrypted = await service.decrypt(encrypted)
      expect(decrypted).toBe(plaintext)
    })

    it('should encrypt same text differently each time', async () => {
      const plaintext = 'Same text'
      
      const encrypted1 = await service.encrypt(plaintext)
      const encrypted2 = await service.encrypt(plaintext)
      
      expect(encrypted1).not.toBe(encrypted2)
      
      // Both should decrypt to same plaintext
      const decrypted1 = await service.decrypt(encrypted1)
      const decrypted2 = await service.decrypt(encrypted2)
      
      expect(decrypted1).toBe(plaintext)
      expect(decrypted2).toBe(plaintext)
    })

    it('should handle empty string encryption', async () => {
      const plaintext = ''
      
      const encrypted = await service.encrypt(plaintext)
      const decrypted = await service.decrypt(encrypted)
      
      expect(decrypted).toBe(plaintext)
    })

    it('should handle special characters and unicode', async () => {
      const plaintext = 'Special chars: !@#$%^&*()_+ 🚀 中文 العربية'
      
      const encrypted = await service.encrypt(plaintext)
      const decrypted = await service.decrypt(encrypted)
      
      expect(decrypted).toBe(plaintext)
    })

    it('should handle large text encryption', async () => {
      const plaintext = 'A'.repeat(10000) // 10KB of text
      
      const encrypted = await service.encrypt(plaintext)
      const decrypted = await service.decrypt(encrypted)
      
      expect(decrypted).toBe(plaintext)
    })
  })

  describe('decryption error handling', () => {
    it('should throw error for invalid encrypted data format', async () => {
      const invalidData = 'invalid-encrypted-data'
      
      await expect(service.decrypt(invalidData)).rejects.toMatchObject({
        message: 'Decryption failed'
      })
    })

    it('should throw error for malformed encrypted data', async () => {
      const malformedData = 'part1:part2' // Missing third part
      
      await expect(service.decrypt(malformedData)).rejects.toMatchObject({
        message: 'Decryption failed'
      })
    })

    it('should throw error for corrupted encrypted data', async () => {
      const plaintext = 'Test data'
      const encrypted = await service.encrypt(plaintext)
      
      // Corrupt the encrypted data
      const parts = encrypted.split(':')
      const corruptedData = parts[0] + ':' + parts[1] + ':' + 'corrupted'
      
      await expect(service.decrypt(corruptedData)).rejects.toMatchObject({
        message: 'Decryption failed'
      })
    })
  })

  describe('secure token generation', () => {
    it('should generate secure token with default length', () => {
      const token = service.generateSecureToken()
      
      expect(token).toBeDefined()
      expect(typeof token).toBe('string')
      expect(token.length).toBe(64) // 32 bytes = 64 hex chars
    })

    it('should generate secure token with custom length', () => {
      const length = 16
      const token = service.generateSecureToken(length)
      
      expect(token.length).toBe(length * 2) // hex encoding doubles length
    })

    it('should generate different tokens each time', () => {
      const token1 = service.generateSecureToken()
      const token2 = service.generateSecureToken()
      
      expect(token1).not.toBe(token2)
    })

    it('should generate tokens with only hex characters', () => {
      const token = service.generateSecureToken()
      
      expect(token).toMatch(/^[0-9a-f]+$/)
    })
  })

  describe('password hashing', () => {
    it('should hash password with generated salt', () => {
      const password = 'mySecurePassword123'
      
      const result = service.hashPassword(password)
      
      expect(result.hash).toBeDefined()
      expect(result.salt).toBeDefined()
      expect(typeof result.hash).toBe('string')
      expect(typeof result.salt).toBe('string')
      expect(result.hash.length).toBe(128) // 64 bytes = 128 hex chars
      expect(result.salt.length).toBe(32) // 16 bytes = 32 hex chars
    })

    it('should hash password with provided salt', () => {
      const password = 'mySecurePassword123'
      const salt = 'predefined-salt-value'
      
      const result = service.hashPassword(password, salt)
      
      expect(result.salt).toBe(salt)
      expect(result.hash).toBeDefined()
    })

    it('should generate same hash for same password and salt', () => {
      const password = 'mySecurePassword123'
      const salt = 'consistent-salt'
      
      const result1 = service.hashPassword(password, salt)
      const result2 = service.hashPassword(password, salt)
      
      expect(result1.hash).toBe(result2.hash)
      expect(result1.salt).toBe(result2.salt)
    })

    it('should generate different hashes for different passwords', () => {
      const password1 = 'password1'
      const password2 = 'password2'
      const salt = 'same-salt'
      
      const result1 = service.hashPassword(password1, salt)
      const result2 = service.hashPassword(password2, salt)
      
      expect(result1.hash).not.toBe(result2.hash)
    })

    it('should generate different salts when not provided', () => {
      const password = 'samePassword'
      
      const result1 = service.hashPassword(password)
      const result2 = service.hashPassword(password)
      
      expect(result1.salt).not.toBe(result2.salt)
      expect(result1.hash).not.toBe(result2.hash)
    })
  })

  describe('password verification', () => {
    it('should verify correct password', () => {
      const password = 'correctPassword123'
      const { hash, salt } = service.hashPassword(password)
      
      const isValid = service.verifyPassword(password, hash, salt)
      
      expect(isValid).toBe(true)
    })

    it('should reject incorrect password', () => {
      const correctPassword = 'correctPassword123'
      const incorrectPassword = 'wrongPassword456'
      const { hash, salt } = service.hashPassword(correctPassword)
      
      const isValid = service.verifyPassword(incorrectPassword, hash, salt)
      
      expect(isValid).toBe(false)
    })

    it('should reject password with wrong salt', () => {
      const password = 'testPassword'
      const { hash } = service.hashPassword(password)
      const wrongSalt = 'wrong-salt-value'
      
      const isValid = service.verifyPassword(password, hash, wrongSalt)
      
      expect(isValid).toBe(false)
    })

    it('should reject password with wrong hash', () => {
      const password = 'testPassword'
      const { salt } = service.hashPassword(password)
      const wrongHash = 'wrong-hash-value'
      
      const isValid = service.verifyPassword(password, wrongHash, salt)
      
      expect(isValid).toBe(false)
    })

    it('should handle empty password verification', () => {
      const password = ''
      const { hash, salt } = service.hashPassword(password)
      
      const isValid = service.verifyPassword(password, hash, salt)
      
      expect(isValid).toBe(true)
    })
  })

  describe('edge cases and security', () => {
    it('should handle very long passwords', () => {
      const longPassword = 'A'.repeat(1000)
      const { hash, salt } = service.hashPassword(longPassword)
      
      const isValid = service.verifyPassword(longPassword, hash, salt)
      
      expect(isValid).toBe(true)
    })

    it('should handle passwords with special characters', () => {
      const specialPassword = '!@#$%^&*()_+-=[]{}|;:,.<>?`~'
      const { hash, salt } = service.hashPassword(specialPassword)
      
      const isValid = service.verifyPassword(specialPassword, hash, salt)
      
      expect(isValid).toBe(true)
    })

    it('should handle unicode passwords', () => {
      const unicodePassword = '密码123🔐العربية'
      const { hash, salt } = service.hashPassword(unicodePassword)
      
      const isValid = service.verifyPassword(unicodePassword, hash, salt)
      
      expect(isValid).toBe(true)
    })
  })
})