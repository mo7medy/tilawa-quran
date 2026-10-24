import { Composition, registerRoot } from 'remotion';
import VideoScene from '../../src/features/video-studio/scene/VideoScene';
import type { SceneProps } from '../../src/features/video-studio/scene/VideoScene';

const Root = (): JSX.Element => (
  <Composition
    id="QuranVideo"
    component={VideoScene}
    width={1080}
    height={1920}
    fps={30}
    durationInFrames={30}
    calculateMetadata={({ props }: { props: SceneProps }) => ({
      width: props.manifest.width,
      height: props.manifest.height,
      fps: props.manifest.fps,
      durationInFrames: Math.ceil((props.manifest.durationMs * props.manifest.fps) / 1000),
    })}
  />
);
registerRoot(Root);
