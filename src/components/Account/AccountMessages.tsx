/* eslint-disable react/no-multi-comp -- The wrapper selects the real backend or isolated preview. */
import { useState } from 'react';

import LiveMessages from './LiveMessages';
import MessageThread from './messages/MessageThread';
import MessageWorkspace from './messages/MessageWorkspace';
import { useAccountUi } from './useAccountUi';

const DemoMessages = (): JSX.Element => {
  const { t, role, state, dispatch, router } = useAccountUi();
  const [text, setText] = useState('');
  const [selected, setSelected] = useState(true);
  const conversation = {
    id: 'preview-conversation',
    name: role === 'student' ? state.teacher.publicProfile.displayName : state.student.name,
    photo: role === 'student' ? state.teacher.publicProfile.photoUrl : state.student.photo,
    role: role === 'student' ? ('teacher' as const) : ('student' as const),
    preview: state.messages[state.messages.length - 1]?.text,
  };
  return (
    <>
      <MessageWorkspace
        conversations={[conversation]}
        selectedId={selected ? conversation.id : ''}
        onSelect={() => setSelected(true)}
        onBack={() => setSelected(false)}
      >
        {selected && (
          <MessageThread
            header={{ conversation, onBack: () => setSelected(false) }}
            history={{
              messages:
                router.query.view === 'empty'
                  ? []
                  : state.messages.map((message) => ({
                      id: message.id,
                      mine: message.role === role,
                      body: message.text,
                      createdAt: message.createdAt,
                    })),
            }}
            composer={{
              value: text,
              onChange: setText,
              onSend: async (body) =>
                (await dispatch({ type: 'message', role, text: body })) !== false,
            }}
          />
        )}
      </MessageWorkspace>
      <small>{t('message-local')}</small>
    </>
  );
};

const AccountMessages = (): JSX.Element => {
  const { backend } = useAccountUi();
  return backend ? <LiveMessages /> : <DemoMessages />;
};

export default AccountMessages;
