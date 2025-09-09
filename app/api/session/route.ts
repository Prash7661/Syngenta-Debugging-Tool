import { NextRequest, NextResponse } from 'next/server';
import { SessionManager } from '../../../services/session/session-manager';
import { ConversationManager } from '../../../services/session/conversation-manager';
import { PreferencesManager } from '../../../services/session/preferences-manager';
import { withSession } from '../../../middleware/session-middleware';
import { UserSession } from '../../../types/session';

const sessionManager = new SessionManager();
const conversationManager = new ConversationManager();
const preferencesManager = new PreferencesManager();

// GET /api/session - Get current session info
export const GET = withSession(async (request: NextRequest, session: UserSession) => {
  try {
    return NextResponse.json({
      success: true,
      data: {
        sessionId: session.sessionId,
        userId: session.userId,
        preferences: session.preferences,
        conversationHistory: {
          totalMessages: session.conversationHistory.totalMessages,
          lastUpdated: session.conversationHistory.lastUpdated
        },
        createdAt: session.createdAt,
        lastActivity: session.lastActivity,
        expiresAt: session.expiresAt
      }
    });
  } catch (error) {
    console.error('Failed to get session:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get session' },
      { status: 500 }
    );
  }
});

// POST /api/session - Create new session or update existing
export const POST = withSession(async (request: NextRequest, session: UserSession) => {
  try {
    const body = await request.json();
    const { userId, preferences } = body;

    // Update session with new data
    if (userId) {
      session.userId = userId;
    }

    if (preferences) {
      session.preferences = await preferencesManager.updateUserPreferences(
        session.sessionId,
        preferences,
        session.userId
      );
    }

    await sessionManager.updateSession(session);

    return NextResponse.json({
      success: true,
      data: {
        sessionId: session.sessionId,
        userId: session.userId,
        preferences: session.preferences
      }
    });
  } catch (error) {
    console.error('Failed to update session:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update session' },
      { status: 500 }
    );
  }
});

// DELETE /api/session - Delete current session
export const DELETE = withSession(async (request: NextRequest, session: UserSession) => {
  try {
    await sessionManager.deleteSession(session.sessionId);
    
    const response = NextResponse.json({
      success: true,
      message: 'Session deleted successfully'
    });

    // Clear session cookie
    response.cookies.delete('session-id');
    
    return response;
  } catch (error) {
    console.error('Failed to delete session:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete session' },
      { status: 500 }
    );
  }
});