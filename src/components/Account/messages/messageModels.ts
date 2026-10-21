import type { ConversationItem } from './types';

import type { AccountPreviewState } from '@/tilawa/account/types';
import { object, rows, string } from '@/tilawa/backend/rows';
import type { Row } from '@/tilawa/backend/rows';

const conversationItems = (
  snapshot: Row | undefined,
  state: AccountPreviewState,
  userId: string | undefined,
  unknownName: string,
): ConversationItem[] =>
  rows(snapshot?.conversations).map((conversation) => {
    const role = conversation.teacher_id === userId ? 'student' : 'teacher';
    const peerId = string(role === 'teacher' ? conversation.teacher_id : conversation.student_id);
    const teacher = state.teachers?.find(
      (person) => person.publicProfile.id === peerId,
    )?.publicProfile;
    const person = rows(snapshot?.people).find((item) => item.id === peerId);
    const last = state.messages
      .filter((item) => item.conversationId === conversation.id)
      .sort((a, b) => (a.createdAt ?? '').localeCompare(b.createdAt ?? ''))
      .pop();
    return {
      id: string(conversation.id),
      name:
        (role === 'teacher' ? teacher?.displayName : '') ||
        string(person?.display_name) ||
        unknownName,
      photo: (role === 'teacher' ? teacher?.photoUrl : '') || string(person?.avatar_url),
      role,
      preview: last?.text,
      updatedAt: last?.createdAt,
      status: string(conversation.request_status),
      blocked: !!conversation.blocked || !!object(conversation.own_state).blocked,
      ownBlocked: !!object(conversation.own_state).blocked,
      requestedByMe: conversation.requested_by === userId,
      profileHref: role === 'teacher' && peerId ? `/teachers/${peerId}` : undefined,
    };
  });

export default conversationItems;
