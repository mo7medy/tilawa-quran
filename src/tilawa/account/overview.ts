import { rows, string } from '../backend/rows';
import type { Row } from '../backend/rows';

export interface RecentAccountConversation {
  id: string;
  peerId: string;
  peerName: string;
  preview: string;
  createdAt: string;
  unread: number;
}

export interface AccountOverviewRead {
  unreadMessages: number;
  unreadNotifications: number;
  recentConversations: RecentAccountConversation[];
}

export const readAccountOverview = (snapshot: Row = {}): AccountOverviewRead => ({
  unreadMessages: Math.max(0, Number(snapshot.unreadMessages) || 0),
  unreadNotifications: Math.max(0, Number(snapshot.unreadNotifications) || 0),
  recentConversations: rows(snapshot.recentConversations)
    .slice(0, 3)
    .map((item) => ({
      id: string(item.id),
      peerId: string(item.peerId),
      peerName: string(item.peerName),
      preview: string(item.preview),
      createdAt: string(item.createdAt),
      unread: Math.max(0, Number(item.unread) || 0),
    })),
});
