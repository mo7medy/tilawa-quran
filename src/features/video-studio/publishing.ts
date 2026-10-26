export type PublishingPlatform = 'tiktok' | 'instagram';
export interface PublisherChannel {
  platform: PublishingPlatform;
  id: string;
  organizationId: string;
  name: string;
  eligible: boolean;
}
export type PublicationStatus =
  | 'queued'
  | 'sending'
  | 'pending'
  | 'published'
  | 'review'
  | 'failed'
  | 'unknown'
  | 'cancelled';
export interface Publication {
  platform: PublishingPlatform;
  id: string;
  runId: string;
  caption: string;
  status: PublicationStatus;
  error: string | null;
  externalUrl: string | null;
}
export interface PublishingState {
  canReuseToken: boolean;
  connection: { channelName: string; enabled: boolean } | null;
  publications: Publication[];
}
