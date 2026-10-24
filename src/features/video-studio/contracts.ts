import { MushafLines, QuranFont } from '@/types/QuranReader';

export const STUDIO_VERSION = '1';
export const RENDER_VERSION = 'studio-1';
export const STUDIO_FONTS = [
  QuranFont.MadaniV1,
  QuranFont.MadaniV2,
  QuranFont.QPCHafs,
  QuranFont.IndoPak,
  QuranFont.TajweedV4,
] as const;
export type StudioFont = (typeof STUDIO_FONTS)[number];
export type StudioRatio = 'portrait' | 'square' | 'landscape';
export type StudioTemplate = 'center' | 'card' | 'translation';
export type JobStatus =
  | 'queued'
  | 'preparing'
  | 'rendering'
  | 'uploading'
  | 'completed'
  | 'cancel_requested'
  | 'cancelled'
  | 'failed'
  | 'expired';
export interface VideoProjectSpec {
  version: '1';
  title: string;
  chapterId: number;
  from: number;
  to: number;
  reciterId: number;
  translationId: number | null;
  font: StudioFont;
  mushafLines: MushafLines;
  fontSize: number;
  translationSize: number;
  lineHeight: number;
  color: string;
  alignment: 'center' | 'justify';
  background: {
    type: 'color' | 'library' | 'upload';
    value: string;
    opacity: number;
    position: number;
  };
  template: StudioTemplate;
  ratio: StudioRatio;
  quality: 720 | 1080;
}
export interface StudioWord {
  text: string;
  page: number;
  end: boolean;
}
export interface StudioVerse {
  key: string;
  words: StudioWord[];
  translation: string;
  startMs: number;
  endMs: number;
}
export interface StudioAsset {
  url: string;
  sha256: string;
  family?: string;
}
export interface ResolvedVideoManifest {
  version: '1';
  renderVersion: string;
  spec: VideoProjectSpec;
  verses: StudioVerse[];
  fonts: StudioAsset[];
  audio: { url: string; startMs: number; endMs: number };
  background: { type: 'color' | 'image' | 'video'; url: string };
  durationMs: number;
  width: number;
  height: number;
  fps: 30;
}
export interface VideoRenderJob {
  id: string;
  projectId: string;
  status: JobStatus;
  progress: number;
  attempt: number;
  error: string | null;
  createdAt: number;
  expiresAt: number;
  outputKey?: string;
}
export interface StudioProject {
  id: string;
  revision: number;
  spec: VideoProjectSpec;
  expiresAt: number;
  updatedAt: number;
}
export interface StudioOwner {
  id: string;
  registered: boolean;
  network: string;
}
export interface StudioQuota {
  remaining: number;
  limit: number;
  maxDurationMs: number;
  storageBytes: number;
  storageLimit: number;
  resetAt: number;
  available: boolean;
}
export interface StudioCatalog {
  chapters: { id: number; name: string; count: number }[];
  reciters: { id: number; name: string }[];
  translations: { id: number; name: string; language: string }[];
  backgrounds: { id: string; url: string }[];
  enabled: boolean;
  turnstileSiteKey: string;
}
export const defaultSpec: VideoProjectSpec = {
  version: '1',
  title: '',
  chapterId: 1,
  from: 1,
  to: 7,
  reciterId: 7,
  translationId: null,
  font: QuranFont.QPCHafs,
  mushafLines: MushafLines.FifteenLines,
  fontSize: 66,
  translationSize: 36,
  lineHeight: 1.8,
  color: '#ffffff',
  alignment: 'center',
  background: { type: 'color', value: '#102b30', opacity: 0.4, position: 50 },
  template: 'center',
  ratio: 'portrait',
  quality: 1080,
};
export const dimensions = (
  spec: Pick<VideoProjectSpec, 'quality' | 'ratio'>,
): { width: number; height: number } => {
  const short = spec.quality;
  const long = short === 1080 ? 1920 : 1280;
  return {
    width: spec.ratio === 'landscape' ? long : short,
    height: spec.ratio === 'portrait' ? long : short,
  };
};
