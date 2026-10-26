/* eslint-disable @typescript-eslint/naming-convention -- GraphQL union discriminator is a provider contract. */
/* eslint-disable no-await-in-loop -- Organizations are fetched sequentially within a bounded request budget. */
/* eslint-disable react-func/max-lines-per-function -- Bound the complete provider request and validation lifecycle together. */
/* eslint-disable no-restricted-syntax -- Native iterators run only in Workers, with a bounded organization count. */
/* eslint-disable no-underscore-dangle -- GraphQL requires __typename to discriminate mutation results. */
import { PublisherChannel } from '../publishing';
import { assert, StudioError } from '../validation';

export class BufferFailure extends StudioError {
  constructor(code: string, public uncertain = false, public retryAfter = 0) {
    super(code, 503);
  }
}
const query = async <T>(token: string, document: string, variables = {}): Promise<T> => {
  let response: Response;
  try {
    response = await fetch('https://api.buffer.com', {
      method: 'POST',
      redirect: 'manual',
      signal: AbortSignal.timeout(20000),
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: document, variables }),
    });
  } catch {
    throw new BufferFailure('BUFFER_UNCERTAIN', true);
  }
  if (response.status === 429) {
    const retry = Number(response.headers.get('retry-after'));
    throw new BufferFailure(
      'BUFFER_RATE_LIMIT',
      false,
      Math.max(60000, Math.min((retry || 900) * 1000, 86400000)),
    );
  }
  if ([401, 403].includes(response.status)) throw new BufferFailure('BUFFER_RECONNECT');
  if (!response.ok) throw new BufferFailure('BUFFER_UNCERTAIN', true);
  // Bound the response while streaming; provider errors and tokens are never returned or logged.
  const reader = response.body?.getReader();
  let text = '';
  const decoder = new TextDecoder();
  try {
    assert(reader, 'BUFFER_RESPONSE', 503);
    let size = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.length;
      assert(size <= 1048576, 'BUFFER_RESPONSE', 503);
      text += decoder.decode(value, { stream: true });
    }
    const result = JSON.parse(text) as { data?: T; errors?: unknown[] };
    if (result.errors?.length || !result.data) throw new Error();
    return result.data;
  } catch {
    throw new BufferFailure('BUFFER_UNCERTAIN', true);
  } finally {
    await reader?.cancel();
  }
};
interface ChannelWire {
  id: string;
  name: string;
  service: string;
  organizationId: string;
  allowedActions: string[];
  isDisconnected: boolean;
  isLocked: boolean;
  isQueuePaused: boolean;
  metadata: { defaultToReminders?: boolean } | null;
}
const channelFields = `id name service organizationId allowedActions isDisconnected isLocked isQueuePaused
  metadata { ... on TiktokMetadata { defaultToReminders } }`;
export const bufferChannels = async (token: string): Promise<PublisherChannel[]> => {
  const data = await query<{ account: { organizations: { id: string }[] } }>(
    token,
    'query { account { organizations { id } } }',
  );
  assert(
    Array.isArray(data.account?.organizations) && data.account.organizations.length <= 10,
    'BUFFER_RESPONSE',
    503,
  );
  const channels: PublisherChannel[] = [];
  for (const organization of data.account.organizations) {
    const result = await query<{ channels: ChannelWire[] }>(
      token,
      `query($input: ChannelsInput!) { channels(input: $input) { ${channelFields} } }`,
      { input: { organizationId: organization.id } },
    );
    assert(Array.isArray(result.channels), 'BUFFER_RESPONSE', 503);
    result.channels
      .filter((channel) => channel.service === 'tiktok')
      .forEach((channel) => {
        channels.push({
          id: channel.id,
          organizationId: organization.id,
          name: String(channel.name).slice(0, 150),
          eligible:
            !channel.isDisconnected &&
            !channel.isLocked &&
            !channel.isQueuePaused &&
            channel.metadata?.defaultToReminders === false &&
            channel.allowedActions.includes('scheduleUpdates'),
        });
      });
  }
  return channels;
};
export interface BufferPost {
  id: string;
  channelId: string;
  status: 'draft' | 'error' | 'needs_approval' | 'scheduled' | 'sending' | 'sent';
  externalLink: string | null;
}
const postFields = 'id channelId status externalLink';
export const createBufferPost = async (
  token: string,
  channelId: string,
  text: string,
  url: string,
): Promise<BufferPost> => {
  const result = await query<{ createPost: { __typename: string; post?: BufferPost } }>(
    token,
    `mutation($input: CreatePostInput!) { createPost(input: $input) {
      __typename ... on PostActionSuccess { post { ${postFields} } }
    } }`,
    {
      input: {
        channelId,
        text,
        schedulingType: 'automatic',
        mode: 'shareNow',
        aiAssisted: true,
        needsApproval: false,
        assets: [{ video: { url } }],
      },
    },
  );
  if (result.createPost?.__typename !== 'PostActionSuccess') {
    throw new BufferFailure('BUFFER_REJECTED');
  }
  if (!result.createPost.post?.id) throw new BufferFailure('BUFFER_UNCERTAIN', true);
  return result.createPost.post;
};
export const readBufferPost = async (token: string, id: string): Promise<BufferPost> => {
  const result = await query<{ post: BufferPost }>(
    token,
    `query($input: PostInput!) { post(input: $input) { ${postFields} } }`,
    { input: { id } },
  );
  assert(result.post?.id === id, 'BUFFER_RESPONSE', 503);
  return result.post;
};
