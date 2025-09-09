export interface UserSession {
  sessionId: string;
  userId?: string;
  sfmcCredentials?: EncryptedCredentials;
  preferences: UserPreferences;
  conversationHistory: ConversationHistory;
  createdAt: Date;
  lastActivity: Date;
  expiresAt: Date;
}

export interface EncryptedCredentials {
  encryptedData: string;
  encryptionVersion: string;
  createdAt: Date;
  expiresAt: Date;
}

export interface UserPreferences {
  defaultLanguage: CodeLanguage;
  debugLevel: DebugLevel;
  theme: 'light' | 'dark' | 'system';
  autoSave: boolean;
  codeFormatting: FormattingOptions;
}

export interface FormattingOptions {
  indentSize: number;
  insertFinalNewline: boolean;
  trimTrailingWhitespace: boolean;
}

export interface ConversationHistory {
  messages: Message[];
  messageIds?: string[];
  lastUpdated: Date;
  totalMessages: number;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  image?: string;
  timestamp: number;
  metadata?: MessageMetadata;
}

export interface MessageMetadata {
  language?: CodeLanguage;
  codeBlocks?: CodeBlock[];
  analysisResults?: any;
  generationTime?: number;
}

export interface CodeBlock {
  language: string;
  code: string;
  explanation?: string;
}

export type CodeLanguage = 'sql' | 'ampscript' | 'ssjs' | 'css' | 'html';
export type DebugLevel = 'basic' | 'advanced' | 'comprehensive';

export interface SessionConfig {
  redisUrl?: string;
  defaultTTL?: number;
  maxMessagesPerConversation?: number;
  encryptionKey?: string;
}

export interface SessionMetrics {
  totalSessions: number;
  activeSessions: number;
  averageSessionDuration: number;
  totalMessages: number;
  cacheHitRate: number;
}