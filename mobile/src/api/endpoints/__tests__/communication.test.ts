/**
 * communicationApi endpoint unit tests.
 *
 * Verifies that each API function constructs the correct HTTP calls on the
 * apiClient mock — URL paths, HTTP methods, query params, and request bodies.
 */

import { communicationApi } from '../communication';
import type {
  SendMessagePayload,
  CreateAnnouncementPayload,
} from '../communication';

// ─── Mock apiClient ───────────────────────────────────────────────────────────
// Use jest.fn() directly inside the factory (no out-of-scope references).
// Access the mocks after import via jest.requireMock().

jest.mock('../../client', () => ({
  apiClient: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
  },
}));

jest.mock('../teacher', () => ({}));

// ─── Typed accessor for mocks ─────────────────────────────────────────────────

function getApiMocks() {
  const { apiClient } = jest.requireMock('../../client') as {
    apiClient: { get: jest.Mock; post: jest.Mock; put: jest.Mock };
  };
  return apiClient;
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('communicationApi', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    const api = getApiMocks();
    api.get.mockResolvedValue([]);
    api.post.mockResolvedValue({});
    api.put.mockResolvedValue(undefined);
  });

  // ── getMessageRecipients ─────────────────────────────────────────────────

  describe('getMessageRecipients', () => {
    it('calls GET /communication/mobile/recipients', async () => {
      await communicationApi.getMessageRecipients();
      expect(getApiMocks().get).toHaveBeenCalledWith('/communication/mobile/recipients');
    });
  });

  // ── getConversations ─────────────────────────────────────────────────────

  describe('getConversations', () => {
    it('calls GET /communication/mobile/conversations with page=1 and pageSize=20 by default', async () => {
      await communicationApi.getConversations();
      expect(getApiMocks().get).toHaveBeenCalledWith('/communication/mobile/conversations', {
        params: { page: 1, pageSize: 20 },
      });
    });

    it('passes the supplied page number', async () => {
      await communicationApi.getConversations(3);
      expect(getApiMocks().get).toHaveBeenCalledWith('/communication/mobile/conversations', {
        params: { page: 3, pageSize: 20 },
      });
    });
  });

  // ── getMessages ──────────────────────────────────────────────────────────

  describe('getMessages', () => {
    it('calls GET /communication/mobile/messages/:conversationId with pagination defaults', async () => {
      await communicationApi.getMessages('conv-abc');
      expect(getApiMocks().get).toHaveBeenCalledWith('/communication/mobile/messages/conv-abc', {
        params: { page: 1, pageSize: 50 },
      });
    });

    it('passes supplied page number', async () => {
      await communicationApi.getMessages('conv-abc', 2);
      expect(getApiMocks().get).toHaveBeenCalledWith('/communication/mobile/messages/conv-abc', {
        params: { page: 2, pageSize: 50 },
      });
    });
  });

  // ── sendMessage ──────────────────────────────────────────────────────────

  describe('sendMessage', () => {
    it('calls POST /communication/mobile/messages with the full payload', async () => {
      const payload: SendMessagePayload = {
        recipientId: 'user-parent-1',
        message: 'Hello, regarding Aarav.',
      };
      await communicationApi.sendMessage(payload);
      expect(getApiMocks().post).toHaveBeenCalledWith('/communication/mobile/messages', payload);
    });

    it('includes conversationId in payload when provided', async () => {
      const payload: SendMessagePayload = {
        conversationId: 'conv-123',
        recipientId: 'user-parent-1',
        message: 'Follow-up message',
      };
      await communicationApi.sendMessage(payload);
      expect(getApiMocks().post).toHaveBeenCalledWith(
        '/communication/mobile/messages',
        expect.objectContaining({ conversationId: 'conv-123' }),
      );
    });
  });

  // ── markRead ─────────────────────────────────────────────────────────────

  describe('markRead', () => {
    it('calls PUT /communication/mobile/messages/:messageId/read', async () => {
      await communicationApi.markRead('msg-xyz');
      expect(getApiMocks().put).toHaveBeenCalledWith('/communication/mobile/messages/msg-xyz/read');
    });
  });

  // ── getUnreadCount ───────────────────────────────────────────────────────

  describe('getUnreadCount', () => {
    it('calls GET /communication/mobile/unread-count', async () => {
      await communicationApi.getUnreadCount();
      expect(getApiMocks().get).toHaveBeenCalledWith('/communication/mobile/unread-count');
    });
  });

  // ── createAnnouncement ───────────────────────────────────────────────────

  describe('createAnnouncement', () => {
    it('calls POST /announcements with the payload', async () => {
      const payload: CreateAnnouncementPayload = {
        title: 'School Holiday',
        body: 'School will be closed on June 20.',
        priority: 'High',
        classId: null,
      };
      await communicationApi.createAnnouncement(payload);
      expect(getApiMocks().post).toHaveBeenCalledWith('/announcements', payload);
    });

    it('sends classId when targeting a specific class', async () => {
      const payload: CreateAnnouncementPayload = {
        title: 'Class Test',
        body: 'Unit test on Monday.',
        priority: 'Normal',
        classId: 'class-8a',
      };
      await communicationApi.createAnnouncement(payload);
      expect(getApiMocks().post).toHaveBeenCalledWith(
        '/announcements',
        expect.objectContaining({ classId: 'class-8a' }),
      );
    });
  });

  // ── getTeacherAnnouncements ───────────────────────────────────────────────

  describe('getTeacherAnnouncements', () => {
    it('calls GET /announcements with role=teacher and page=1 by default', async () => {
      await communicationApi.getTeacherAnnouncements();
      expect(getApiMocks().get).toHaveBeenCalledWith('/announcements', {
        params: { role: 'teacher', page: 1, pageSize: 20 },
      });
    });

    it('passes supplied page', async () => {
      await communicationApi.getTeacherAnnouncements(2);
      expect(getApiMocks().get).toHaveBeenCalledWith('/announcements', {
        params: { role: 'teacher', page: 2, pageSize: 20 },
      });
    });
  });
});
