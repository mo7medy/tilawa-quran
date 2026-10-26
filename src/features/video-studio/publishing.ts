export interface PublisherChannel {
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
  id: string;
  runId: string;
  caption: string;
  status: PublicationStatus;
  error: string | null;
  externalUrl: string | null;
}
export interface PublishingState {
  connection: { channelName: string; enabled: boolean } | null;
  publications: Publication[];
}
