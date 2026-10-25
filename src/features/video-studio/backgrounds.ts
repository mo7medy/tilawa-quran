export interface StudioLibraryBackground {
  id: string;
  url: string;
  type?: 'image' | 'video';
  orientation?: 'portrait' | 'landscape';
  collection?: 'nature' | 'sakina';
  number?: number;
  width?: number;
  height?: number;
}
