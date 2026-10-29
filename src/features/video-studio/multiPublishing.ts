import type { AutomationRun } from './automation';
import type { Publication, PublisherChannel, PublishingPlatform } from './publishing';

export type DistributionMode = 'independent' | 'shared';
export interface BufferConnection {
  id: string;
  name: string;
  accountId: string;
  disconnected: boolean;
  cooldownUntil: number;
  callsToday: number;
}
export interface PublishingDestination {
  id: string;
  connectionId: string;
  channelId: string;
  platform: PublishingPlatform;
  name: string;
  eligible: boolean;
  paused: boolean;
  disconnected: boolean;
  dailyCount: number;
  nextCount: number;
  effectiveDay: string;
  nextAt: number | null;
  required: number;
  generated: number;
  pending: number;
  published: number;
  failed: number;
}
export interface StudioAdminState {
  active: boolean;
  maintenance: boolean;
  enabled: boolean;
  day: string;
  mode: DistributionMode;
  nextMode: DistributionMode;
  effectiveDay: string;
  connections: BufferConnection[];
  destinations: PublishingDestination[];
  publications: (Publication & { destinationId: string })[];
  runs: (AutomationRun & { destinationIds: string[] })[];
  usage: {
    renders: number;
    renderLimit: number;
    storageBytes: number;
    storageLimit: number;
    aiCalls: number;
    aiLimit: number;
  };
  audit: {
    id: string;
    actor: string;
    action: string;
    subject: string;
    detail: string;
    createdAt: number;
  }[];
}
export interface ConnectionProbe {
  accountId: string;
  name: string;
  channels: PublisherChannel[];
}
