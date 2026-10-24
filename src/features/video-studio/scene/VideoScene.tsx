/* eslint-disable @next/next/no-img-element -- This shared Remotion scene also runs outside Next; source files are already decoder-verified. */
/* eslint-disable react-func/max-lines-per-function -- Font loading, verification and cleanup form one cancellable effect. */
import { useEffect, useLayoutEffect, useRef, useState } from 'react';

import {
  AbsoluteFill,
  Audio,
  cancelRender,
  continueRender,
  delayRender,
  useCurrentFrame,
  Video,
} from 'remotion';

import { ResolvedVideoManifest } from '../contracts';

import VerseText from './VerseText';

export interface SceneProps extends Record<string, unknown> {
  manifest: ResolvedVideoManifest;
  onReady?: (ready: boolean, error?: string) => void;
}
// Both Player and the server renderer use this scene, including its full-range overflow check.
const VideoScene = ({ manifest: m, onReady }: SceneProps): JSX.Element => {
  const frame = useCurrentFrame();
  const checks = useRef<HTMLDivElement>(null);
  const [handle] = useState(() => delayRender('studio-assets'));
  const [fontsReady, setFontsReady] = useState(false);
  const verse =
    [...m.verses].reverse().find((v) => (frame * 1000) / m.fps >= v.startMs) ?? m.verses[0];
  useEffect(() => {
    let disposed = false;
    const loaded: FontFace[] = [];
    const load = async (): Promise<void> => {
      await Promise.all(
        m.fonts.map(async (asset) => {
          const response = await fetch(asset.url);
          if (!response.ok) throw new Error('FONT_UNAVAILABLE');
          const bytes = await response.arrayBuffer();
          const digest = Array.from(
            new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)),
            (x) => x.toString(16).padStart(2, '0'),
          ).join('');
          if (digest !== asset.sha256) throw new Error('FONT_VERSION_MISMATCH');
          const font = await new FontFace(asset.family, bytes).load();
          if (!disposed) {
            document.fonts.add(font);
            loaded.push(font);
          }
        }),
      );
      await document.fonts.ready;
      if (!disposed) setFontsReady(true);
    };
    load().catch(() => {
      if (!disposed) {
        onReady?.(false, 'FONT_UNAVAILABLE');
        if (!onReady) cancelRender(new Error('FONT_UNAVAILABLE'));
        continueRender(handle);
      }
    });
    return () => {
      disposed = true;
      loaded.forEach((font) => document.fonts.delete(font));
      continueRender(handle);
    };
  }, [m, handle, onReady]);
  useLayoutEffect(() => {
    if (!fontsReady) return;
    const elements = checks.current?.querySelectorAll<HTMLElement>('[data-studio-text]');
    const overflow = Array.from(elements ?? []).some(
      (el) => el.scrollHeight > el.clientHeight + 1 || el.scrollWidth > el.clientWidth + 1,
    );
    onReady?.(!overflow, overflow ? 'TEXT_OVERFLOW' : undefined);
    if (overflow && !onReady) cancelRender(new Error('TEXT_OVERFLOW'));
    continueRender(handle);
  }, [fontsReady, m, handle, onReady]);
  const s = m.spec;
  return (
    <AbsoluteFill
      style={{
        background: s.background.type === 'color' ? s.background.value : '#102b30',
        color: s.color,
        overflow: 'hidden',
      }}
    >
      {m.background.type === 'image' && (
        <img
          alt=""
          src={m.background.url}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            objectPosition: `${s.background.position}% center`,
          }}
        />
      )}
      {m.background.type === 'video' && (
        <Video
          muted
          loop
          src={m.background.url}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            objectPosition: `${s.background.position}% center`,
          }}
        />
      )}
      <style>
        {m.fonts
          .filter((f) => f.family?.includes('tajweed'))
          .map(
            (f) =>
              `@font-palette-values --studio-page-${f.family.split('-').pop()} {font-family:'${
                f.family
              }';base-palette:1;}`,
          )
          .join('\n')}
      </style>
      <AbsoluteFill
        style={{
          background: `rgba(0,0,0,${s.background.opacity})`,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {fontsReady && verse && <VerseText manifest={m} verse={verse} />}
      </AbsoluteFill>
      <div
        ref={checks}
        aria-hidden
        style={{ position: 'absolute', inset: 0, opacity: 0, pointerEvents: 'none' }}
      >
        {fontsReady &&
          m.verses.map((v) => (
            <VerseText key={v.key} manifest={m} verse={v} style={{ position: 'absolute' }} />
          ))}
      </div>
      <Audio
        src={m.audio.url}
        startFrom={Math.round((m.audio.startMs * m.fps) / 1000)}
        endAt={Math.round((m.audio.endMs * m.fps) / 1000)}
      />
    </AbsoluteFill>
  );
};
export default VideoScene;
