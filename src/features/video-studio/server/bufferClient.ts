/* eslint-disable @typescript-eslint/naming-convention -- GraphQL union discriminator is a provider contract. */
/* eslint-disable no-await-in-loop -- Organizations are fetched sequentially within a bounded request budget. */
/* eslint-disable react-func/max-lines-per-function -- Bound the complete provider request and validation lifecycle together. */
/* eslint-disable no-restricted-syntax -- Native iterators run only in Workers, with a bounded organization count. */
/* eslint-disable no-underscore-dangle -- GraphQL requires __typename to discriminate mutation results. */
import { PublisherChannel, PublishingPlatform } from '../publishing';
import { assert } from '../validation';

import { BufferFailure, bufferQuery } from './bufferTransport';

export { BufferFailure } from './bufferTransport';

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
  metadata { ... on TiktokMetadata { defaultToReminders }
    ... on InstagramMetadata { defaultToReminders } }`;
export const bufferChannels = async (
  token: string,
  beforeRequest?: () => Promise<void>,
): Promise<PublisherChannel[]> => {
  const data = await bufferQuery<{ account: { organizations: { id: string }[] } }>(
    token,
    'query { account { organizations { id } } }',
    {},
    beforeRequest,
  );
  assert(
    Array.isArray(data.account?.organizations) && data.account.organizations.length <= 10,
    'BUFFER_RESPONSE',
    503,
  );
  const channels: PublisherChannel[] = [];
  for (const organization of data.account.organizations) {
    const result = await bufferQuery<{ channels: ChannelWire[] }>(
      token,
      `query($input: ChannelsInput!) { channels(input: $input) { ${channelFields} } }`,
      { input: { organizationId: organization.id } },
      beforeRequest,
    );
    assert(Array.isArray(result.channels), 'BUFFER_RESPONSE', 503);
    result.channels
      .filter((channel) => ['tiktok', 'instagram'].includes(channel.service))
      .forEach((channel) => {
        channels.push({
          platform: channel.service as PublishingPlatform,
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
  platform?: PublishingPlatform,
  beforeRequest?: () => Promise<void>,
): Promise<BufferPost> => {
  const result = await bufferQuery<{ createPost: { __typename: string; post?: BufferPost } }>(
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
        ...(platform === 'instagram'
          ? { metadata: { instagram: { type: 'reel', shouldShareToFeed: true } } }
          : {}),
      },
    },
    beforeRequest,
  );
  if (result.createPost?.__typename !== 'PostActionSuccess') {
    throw new BufferFailure('BUFFER_REJECTED');
  }
  if (!result.createPost.post?.id) throw new BufferFailure('BUFFER_UNCERTAIN', true);
  return result.createPost.post;
};
export const readBufferPost = async (
  token: string,
  id: string,
  beforeRequest?: () => Promise<void>,
): Promise<BufferPost> => {
  const result = await bufferQuery<{ post: BufferPost }>(
    token,
    `query($input: PostInput!) { post(input: $input) { ${postFields} } }`,
    { input: { id } },
    beforeRequest,
  );
  assert(result.post?.id === id, 'BUFFER_RESPONSE', 503);
  return result.post;
};

export const bufferAccount = async (
  token: string,
  beforeRequest?: () => Promise<void>,
): Promise<{ id: string; name: string }> => {
  const result = await bufferQuery<{ account: { id: string; name: string } }>(
    token,
    'query { account { id name } }',
    {},
    beforeRequest,
  );
  assert(
    typeof result.account?.id === 'string' &&
      result.account.id.length > 0 &&
      result.account.id.length <= 200,
    'BUFFER_RESPONSE',
    503,
  );
  return { id: result.account.id, name: String(result.account.name ?? '').slice(0, 150) };
};
