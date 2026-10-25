/* eslint-disable import/prefer-default-export -- Named boundary handlers are shared by the website and isolated integration entrypoint. */
import { ResolvedVideoManifest, StudioOwner, VideoProjectSpec } from '../contracts';
import { assert } from '../validation';

import { resolveLibraryImage } from './backgroundLibrary';
import { AssetIndex } from './contentSources';
import { capability } from './crypto';
import { StudioEnv } from './runtime';

export const resolveBackground = async (
  env: StudioEnv,
  owner: StudioOwner,
  spec: VideoProjectSpec,
  index: AssetIndex,
): Promise<ResolvedVideoManifest['background']> => {
  let background: ResolvedVideoManifest['background'] = { type: 'color', url: '' };
  if (spec.background.type === 'library' && spec.background.value.startsWith('r2-')) {
    return resolveLibraryImage(env, spec.background.value);
  }
  if (spec.background.type === 'library') {
    const item = index.files[`background-${spec.background.value}`];
    assert(item, 'BACKGROUND_UNAVAILABLE');
    background = {
      type: 'video',
      url: `${env.STUDIO_ORIGIN}/api/video-studio/assets/${item.sha256}`,
    };
  }
  if (spec.background.type === 'upload') {
    const asset = await env.VIDEO_STUDIO_DB.prepare(
      "SELECT id,mime FROM studio_assets WHERE id=? AND owner=? AND status='ready' AND expires_at>?",
    )
      .bind(spec.background.value, owner.id, Date.now())
      .first<{ id: string; mime: string }>();
    assert(asset, 'BACKGROUND_EXPIRED');
    const token = await capability(
      env.STUDIO_SIGNING_SECRET,
      `asset:${asset.id}`,
      Date.now() + 3600000,
    );
    background = {
      type: asset.mime === 'video/mp4' ? 'video' : 'image',
      url: `${env.STUDIO_ORIGIN}/api/video-studio/file/${asset.id}?token=${token}`,
    };
  }

  return background;
};
