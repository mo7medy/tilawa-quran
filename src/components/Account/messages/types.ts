export interface ConversationItem {
  id: string;
  name: string;
  photo?: string;
  role: 'student' | 'teacher';
  preview?: string;
  updatedAt?: string;
  status?: string;
  blocked?: boolean;
  ownBlocked?: boolean;
  requestedByMe?: boolean;
  profileHref?: string;
}

export interface ThreadMessage {
  id: string;
  body: string;
  createdAt?: string;
  mine: boolean;
}
