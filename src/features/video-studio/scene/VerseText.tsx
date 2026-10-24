import { CSSProperties } from 'react';

import { ResolvedVideoManifest, StudioVerse } from '../contracts';
import { fontFamily } from '../typography';

import { QuranFont } from '@/types/QuranReader';

const VerseText = ({
  manifest: m,
  verse,
  style,
}: {
  manifest: ResolvedVideoManifest;
  verse: StudioVerse;
  style?: CSSProperties;
}): JSX.Element => {
  const s = m.spec;
  const scale = m.width / 1080;
  return (
    <div
      data-studio-text
      style={{
        boxSizing: 'border-box',
        maxHeight: m.height * 0.76,
        height: s.template === 'translation' ? m.height * 0.76 : undefined,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: s.template === 'translation' ? 'space-between' : 'center',
        width: m.width * 0.86,
        overflow: 'hidden',
        textAlign: s.alignment,
        padding: 24 * scale,
        borderRadius: 24 * scale,
        background: s.template === 'card' ? 'rgba(0,0,0,.65)' : 'transparent',
        ...style,
      }}
    >
      <div
        dir="rtl"
        style={{
          fontSize: s.fontSize * scale,
          lineHeight: s.lineHeight,
          whiteSpace: 'normal',
          flexShrink: 0,
        }}
      >
        {verse.words.map((word, i) => (
          <span
            // Canonical word order is immutable for the lifetime of this verse.
            // eslint-disable-next-line react/no-array-index-key
            key={`${verse.key}-${i}`}
            style={{
              display: 'inline-block',
              fontFamily:
                word.end && s.font === QuranFont.IndoPak
                  ? 'StudioHafs'
                  : fontFamily(s.font, word.page),
              fontPalette:
                s.font === QuranFont.TajweedV4 ? `--studio-page-${word.page}` : undefined,
            }}
          >
            {word.text}{' '}
          </span>
        ))}
      </div>
      {verse.translation && (
        <div
          dir="auto"
          style={{
            fontFamily: 'StudioTranslation, StudioTranslationFallback',
            fontSize: s.translationSize * scale,
            lineHeight: 1.5,
            flexShrink: 0,
            marginTop: (s.template === 'translation' ? 80 : 32) * scale,
          }}
        >
          {verse.translation}
        </div>
      )}
    </div>
  );
};
export default VerseText;
