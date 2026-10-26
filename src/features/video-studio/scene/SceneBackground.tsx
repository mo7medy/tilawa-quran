import { CSSProperties } from 'react';

import { AbsoluteFill, Img, useCurrentFrame, Video } from 'remotion';

import { ResolvedVideoManifest } from '../contracts';

import { backgroundLayers } from './backgroundTimeline';

const SceneBackground = ({ manifest: m }: { manifest: ResolvedVideoManifest }): JSX.Element => {
  const frame = useCurrentFrame();
  const style: CSSProperties = {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    objectPosition: `${m.spec.background.position}% center`,
  };
  if (m.background.type === 'video') {
    return <Video muted loop src={m.background.url} style={style} />;
  }
  if (m.background.type !== 'image') return null;
  const images = m.background.slides?.length ? m.background.slides : [{ url: m.background.url }];
  const layers = backgroundLayers(
    frame,
    m.fps,
    m.durationMs,
    images.length,
    !!m.spec.background.animate,
  );
  return (
    <AbsoluteFill aria-hidden>
      {layers.map((layer) => (
        <Img
          key={layer.index}
          alt=""
          src={images[layer.index].url}
          data-studio-background={layer.index}
          style={{
            ...style,
            position: 'absolute',
            opacity: layer.opacity,
            transform: `translateX(${layer.x}%) scale(${layer.scale})`,
          }}
        />
      ))}
    </AbsoluteFill>
  );
};
export default SceneBackground;
