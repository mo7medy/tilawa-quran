import type { ComponentProps, ReactNode } from 'react';

import ConversationHeader from './ConversationHeader';
import MessageComposer from './MessageComposer';
import MessageHistory from './MessageHistory';

const MessageThread = ({
  header,
  history,
  composer,
  notice,
}: {
  header: ComponentProps<typeof ConversationHeader>;
  history: ComponentProps<typeof MessageHistory>;
  composer: ComponentProps<typeof MessageComposer>;
  notice?: ReactNode;
}): JSX.Element => (
  <>
    <ConversationHeader {...header} />
    {notice}
    <MessageHistory {...history} />
    <MessageComposer {...composer} />
  </>
);

export default MessageThread;
