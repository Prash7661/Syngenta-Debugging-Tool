import { createClient, RedisClientType } from 'redis';
import { UserPreferences, FormattingOptions } from '../../types/session';
import { ErrorFactory } from '../../utils/errors/error-factory';
import { Logger } from '../../utils/logging/logger';

export class PreferencesManager {
  private redisClient: RedisClientType;
  private logger: Logger;
  private readonly PREFERENCES_PREFIX = 'preferences:';
  private readonly USER_PREFERENCES_PREFIX = 'user_prefs:';
  private readonly DEFAULT_TTL = 30 * 24 * 60 * 60; // 30 days in seconds

  constructor() {
    this.redisClient = createClient({
      url: process.env.REDIS_URL || 'redis://localhost:6379'
    });
    this.logger = new Logger('PreferencesManager');
    this.initializeRedisConnection();
  }

  private async initializeRedisConnection(): Promise<void> {
    try {
      await this.redisClient.connect();
      this.logger.info('Redis connection established for PreferencesManager');
    } catch (error) {
      this.logger.error('Failed to connect to Redis', error);
      throw ErrorFactory.createInternalServerError('Redis connection failed');
    }
  }

  async getUserPreferences(sessionId: string, userId?: string): Promise<UserPreferences> {
    try {
      // Try to get session-specific preferences first
      const sessionPrefs = await this.getSessionPreferences(sessionId);
      
      // If user is logged in, try to get user-specific preferences
      if (userId) {
        const userPrefs = await this.getUserSpecificPreferences(userId);
        if (userPrefs) {
          // Merge user preferences with session preferences (user prefs take priority)
          return { ...sessionPrefs, ...userPrefs };
        }
      }

      return sessionPrefs;
    } catch (error) {
      this.logger.error(`Failed to get user preferences for session: ${sessionId}`, error);
      return this.getDefaultPreferences();
    }
  }

  async updateUserPreferences(sessionId: string, preferences: Partial<UserPreferences>, userId?: string): Promise<UserPreferences> {
    try {
      // Get current preferences
      const currentPrefs = await this.getUserPreferences(sessionId, userId);
      
      // Merge with new preferences
      const updatedPrefs: UserPreferences = {
        ...currentPrefs,
        ...preferences
      };

      // Validate preferences
      this.validatePreferences(updatedPrefs);

      // Store session preferences
      await this.storeSessionPreferences(sessionId, updatedPrefs);

      // If user is logged in, also store user-specific preferences
      if (userId) {
        await this.storeUserSpecificPreferences(userId, updatedPrefs);
      }

      this.logger.info(`Preferences updated for session: ${sessionId}`);
      return updatedPrefs;
    } catch (error) {
      this.logger.error(`Failed to update preferences for session: ${sessionId}`, error);
      throw ErrorFactory.createInternalServerError('Failed to update preferences');
    }
  }

  async resetPreferences(sessionId: string, userId?: string): Promise<UserPreferences> {
    try {
      const defaultPrefs = this.getDefaultPreferences();
      
      await this.storeSessionPreferences(sessionId, defaultPrefs);
      
      if (userId) {
        await this.deleteUserSpecificPreferences(userId);
      }

      this.logger.info(`Preferences reset for session: ${sessionId}`);
      return defaultPrefs;
    } catch (error) {
      this.logger.error(`Failed to reset preferences for session: ${sessionId}`, error);
      throw ErrorFactory.createInternalServerError('Failed to reset preferences');
    }
  }

  async exportPreferences(sessionId: string, userId?: string): Promise<string> {
    try {
      const preferences = await this.getUserPreferences(sessionId, userId);
      return JSON.stringify(preferences, null, 2);
    } catch (error) {
      this.logger.error(`Failed to export preferences for session: ${sessionId}`, error);
      throw ErrorFactory.createInternalServerError('Failed to export preferences');
    }
  }

  async importPreferences(sessionId: string, preferencesJson: string, userId?: string): Promise<UserPreferences> {
    try {
      const preferences: UserPreferences = JSON.parse(preferencesJson);
      this.validatePreferences(preferences);
      
      return await this.updateUserPreferences(sessionId, preferences, userId);
    } catch (error) {
      this.logger.error(`Failed to import preferences for session: ${sessionId}`, error);
      throw ErrorFactory.createValidationError('Invalid preferences format');
    }
  }

  private async getSessionPreferences(sessionId: string): Promise<UserPreferences> {
    try {
      const preferencesKey = `${this.PREFERENCES_PREFIX}${sessionId}`;
      const preferencesData = await this.redisClient.get(preferencesKey);

      if (!preferencesData) {
        return this.getDefaultPreferences();
      }

      return JSON.parse(preferencesData);
    } catch (error) {
      this.logger.error(`Failed to get session preferences: ${sessionId}`, error);
      return this.getDefaultPreferences();
    }
  }

  private async getUserSpecificPreferences(userId: string): Promise<UserPreferences | null> {
    try {
      const userPrefsKey = `${this.USER_PREFERENCES_PREFIX}${userId}`;
      const preferencesData = await this.redisClient.get(userPrefsKey);

      if (!preferencesData) {
        return null;
      }

      return JSON.parse(preferencesData);
    } catch (error) {
      this.logger.error(`Failed to get user-specific preferences: ${userId}`, error);
      return null;
    }
  }

  private async storeSessionPreferences(sessionId: string, preferences: UserPreferences): Promise<void> {
    try {
      const preferencesKey = `${this.PREFERENCES_PREFIX}${sessionId}`;
      const preferencesData = JSON.stringify(preferences);
      
      await this.redisClient.setEx(preferencesKey, this.DEFAULT_TTL, preferencesData);
    } catch (error) {
      this.logger.error(`Failed to store session preferences: ${sessionId}`, error);
      throw ErrorFactory.createInternalServerError('Preferences storage failed');
    }
  }

  private async storeUserSpecificPreferences(userId: string, preferences: UserPreferences): Promise<void> {
    try {
      const userPrefsKey = `${this.USER_PREFERENCES_PREFIX}${userId}`;
      const preferencesData = JSON.stringify(preferences);
      
      // User preferences have longer TTL
      await this.redisClient.setEx(userPrefsKey, this.DEFAULT_TTL * 3, preferencesData);
    } catch (error) {
      this.logger.error(`Failed to store user-specific preferences: ${userId}`, error);
      throw ErrorFactory.createInternalServerError('User preferences storage failed');
    }
  }

  private async deleteUserSpecificPreferences(userId: string): Promise<void> {
    try {
      const userPrefsKey = `${this.USER_PREFERENCES_PREFIX}${userId}`;
      await this.redisClient.del(userPrefsKey);
    } catch (error) {
      this.logger.error(`Failed to delete user-specific preferences: ${userId}`, error);
    }
  }

  private validatePreferences(preferences: UserPreferences): void {
    const validLanguages = ['sql', 'ampscript', 'ssjs', 'css', 'html'];
    const validDebugLevels = ['basic', 'advanced', 'comprehensive'];
    const validThemes = ['light', 'dark', 'system'];

    if (!validLanguages.includes(preferences.defaultLanguage)) {
      throw ErrorFactory.createValidationError(`Invalid default language: ${preferences.defaultLanguage}`);
    }

    if (!validDebugLevels.includes(preferences.debugLevel)) {
      throw ErrorFactory.createValidationError(`Invalid debug level: ${preferences.debugLevel}`);
    }

    if (!validThemes.includes(preferences.theme)) {
      throw ErrorFactory.createValidationError(`Invalid theme: ${preferences.theme}`);
    }

    if (typeof preferences.autoSave !== 'boolean') {
      throw ErrorFactory.createValidationError('autoSave must be a boolean');
    }

    if (preferences.codeFormatting) {
      this.validateFormattingOptions(preferences.codeFormatting);
    }
  }

  private validateFormattingOptions(formatting: FormattingOptions): void {
    if (formatting.indentSize && (formatting.indentSize < 1 || formatting.indentSize > 8)) {
      throw ErrorFactory.createValidationError('indentSize must be between 1 and 8');
    }

    if (formatting.insertFinalNewline !== undefined && typeof formatting.insertFinalNewline !== 'boolean') {
      throw ErrorFactory.createValidationError('insertFinalNewline must be a boolean');
    }

    if (formatting.trimTrailingWhitespace !== undefined && typeof formatting.trimTrailingWhitespace !== 'boolean') {
      throw ErrorFactory.createValidationError('trimTrailingWhitespace must be a boolean');
    }
  }

  private getDefaultPreferences(): UserPreferences {
    return {
      defaultLanguage: 'ampscript',
      debugLevel: 'advanced',
      theme: 'system',
      autoSave: true,
      codeFormatting: {
        indentSize: 2,
        insertFinalNewline: true,
        trimTrailingWhitespace: true
      }
    };
  }

  async cleanup(): Promise<void> {
    try {
      await this.redisClient.quit();
      this.logger.info('Redis connection closed for PreferencesManager');
    } catch (error) {
      this.logger.error('Failed to close Redis connection', error);
    }
  }
}