import { NextRequest, NextResponse } from 'next/server';
import { SessionManager } from '../services/session/session-manager';
import { UserSession } from '../types/session';

export interface SessionRequest extends NextRequest {
  session?: UserSession;
  sessionId?: string;
}

export class SessionMiddleware {
  private sessionManager: SessionManager;

  constructor() {
    this.sessionManager = new SessionManager();
  }

  async handleSession(request: SessionRequest): Promise<{ session: UserSession; sessionId: string }> {
    // Try to get session ID from cookie or header
    let sessionId = this.getSessionIdFromRequest(request);
    let session: UserSession | null = null;

    if (sessionId) {
      session = await this.sessionManager.getSession(sessionId);
    }

    // Create new session if none exists or session is invalid
    if (!session) {
      session = await this.sessionManager.createSession();
      sessionId = session.sessionId;
    }

    return { session, sessionId };
  }

  createSessionResponse(response: NextResponse, sessionId: string): NextResponse {
    // Set session cookie
    response.cookies.set('session-id', sessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 24 * 60 * 60 // 24 hours
    });

    return response;
  }

  private getSessionIdFromRequest(request: SessionRequest): string | null {
    // Try cookie first
    const cookieSessionId = request.cookies.get('session-id')?.value;
    if (cookieSessionId) {
      return cookieSessionId;
    }

    // Try Authorization header
    const authHeader = request.headers.get('authorization');
    if (authHeader && authHeader.startsWith('Session ')) {
      return authHeader.substring(8);
    }

    // Try X-Session-ID header
    const sessionHeader = request.headers.get('x-session-id');
    if (sessionHeader) {
      return sessionHeader;
    }

    return null;
  }

  async cleanup(): Promise<void> {
    await this.sessionManager.cleanup();
  }
}

// Middleware function for API routes
export async function withSession(
  handler: (request: SessionRequest, session: UserSession) => Promise<NextResponse>
) {
  return async (request: SessionRequest): Promise<NextResponse> => {
    const sessionMiddleware = new SessionMiddleware();
    
    try {
      const { session, sessionId } = await sessionMiddleware.handleSession(request);
      request.session = session;
      request.sessionId = sessionId;

      const response = await handler(request, session);
      
      return sessionMiddleware.createSessionResponse(response, sessionId);
    } catch (error) {
      console.error('Session middleware error:', error);
      return NextResponse.json(
        { error: 'Session handling failed' },
        { status: 500 }
      );
    } finally {
      await sessionMiddleware.cleanup();
    }
  };
}