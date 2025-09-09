import { NextRequest, NextResponse } from 'next/server';
import { ConversationManager } from '../../../../services/session/conversation-manager';
import { withSession } from '../../../../middleware/session-middleware';
import { UserSession, Message } from '../../../../types/session';

const conversationManager = new ConversationManager();

// GET /api/session/conversation - Get conversation history
export const GET = withSession(async (request: NextRequest, session: UserSession) => {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '20');
    const query = searchParams.get('query');

    let messages: Message[];
    
    if (query) {
      messages = await conversationManager.searchMessages(session.sessionId, query, limit);
    } else {
      messages = await conversationManager.getRecentMessages(session.sessionId, limit);
    }

    return NextResponse.json({
      success: true,
      data: {
        messages,
        totalMessages: session.conversationHistory.totalMessages,
        lastUpdated: session.conversationHistory.lastUpdated
      }
    });
  } catch (error) {
    console.error('Failed to get conversation history:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get conversation history' },
      { status: 500 }
    );
  }
});

// POST /api/session/conversation - Add message to conversation
export const POST = withSession(async (request: NextRequest, session: UserSession) => {
  try {
    const body = await request.json();
    const { role, content, image, metadata } = body;

    if (!role || !content) {
      return NextResponse.json(
        { success: false, error: 'Role and content are required' },
        { status: 400 }
      );
    }

    if (!['user', 'assistant'].includes(role)) {
      return NextResponse.json(
        { success: false, error: 'Role must be either "user" or "assistant"' },
        { status: 400 }
      );
    }

    const message = await conversationManager.addMessage(session.sessionId, {
      role,
      content,
      image,
      metadata
    });

    return NextResponse.json({
      success: true,
      data: message
    });
  } catch (error) {
    console.error('Failed to add message:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to add message' },
      { status: 500 }
    );
  }
});

// DELETE /api/session/conversation - Clear conversation history
export const DELETE = withSession(async (request: NextRequest, session: UserSession) => {
  try {
    await conversationManager.clearConversationHistory(session.sessionId);

    return NextResponse.json({
      success: true,
      message: 'Conversation history cleared successfully'
    });
  } catch (error) {
    console.error('Failed to clear conversation history:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to clear conversation history' },
      { status: 500 }
    );
  }
});