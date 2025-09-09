import { NextRequest, NextResponse } from 'next/server';
import { PreferencesManager } from '../../../../services/session/preferences-manager';
import { withSession } from '../../../../middleware/session-middleware';
import { UserSession, UserPreferences } from '../../../../types/session';

const preferencesManager = new PreferencesManager();

// GET /api/session/preferences - Get user preferences
export const GET = withSession(async (request: NextRequest, session: UserSession) => {
  try {
    const preferences = await preferencesManager.getUserPreferences(
      session.sessionId,
      session.userId
    );

    return NextResponse.json({
      success: true,
      data: preferences
    });
  } catch (error) {
    console.error('Failed to get preferences:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get preferences' },
      { status: 500 }
    );
  }
});

// PUT /api/session/preferences - Update user preferences
export const PUT = withSession(async (request: NextRequest, session: UserSession) => {
  try {
    const body = await request.json();
    const preferences: Partial<UserPreferences> = body;

    const updatedPreferences = await preferencesManager.updateUserPreferences(
      session.sessionId,
      preferences,
      session.userId
    );

    return NextResponse.json({
      success: true,
      data: updatedPreferences
    });
  } catch (error) {
    console.error('Failed to update preferences:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update preferences' },
      { status: 500 }
    );
  }
});

// POST /api/session/preferences/reset - Reset preferences to defaults
export const POST = withSession(async (request: NextRequest, session: UserSession) => {
  try {
    const defaultPreferences = await preferencesManager.resetPreferences(
      session.sessionId,
      session.userId
    );

    return NextResponse.json({
      success: true,
      data: defaultPreferences
    });
  } catch (error) {
    console.error('Failed to reset preferences:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to reset preferences' },
      { status: 500 }
    );
  }
});