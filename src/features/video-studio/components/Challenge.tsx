/* eslint-disable @typescript-eslint/naming-convention -- Preserve standard HTTP headers, provider payloads and D1 column names at the boundary. */
import { useCallback, useEffect, useRef } from 'react';

import Script from 'next/script';

interface TurnstileApi {
  render: (element: HTMLElement, options: Record<string, unknown>) => string;
  remove: (id: string) => void;
}
const Challenge = ({
  siteKey,
  onToken,
}: {
  siteKey: string;
  onToken: (value: string) => void;
}): JSX.Element => {
  const ref = useRef<HTMLDivElement>(null);
  const widget = useRef<string>();
  const callback = useRef(onToken);
  callback.current = onToken;
  const mount = useCallback((): void => {
    const api = (window as unknown as { turnstile?: TurnstileApi }).turnstile;
    if (api && ref.current && !widget.current) {
      widget.current = api.render(ref.current, {
        sitekey: siteKey,
        action: 'video-studio',
        callback: (token: string) => callback.current(token),
        'expired-callback': () => callback.current(''),
        'error-callback': () => callback.current(''),
      });
    }
  }, [siteKey]);
  useEffect(() => {
    mount();
    return () => {
      const api = (window as unknown as { turnstile?: TurnstileApi }).turnstile;
      if (widget.current) api?.remove(widget.current);
      widget.current = undefined;
    };
  }, [mount]);
  return (
    <>
      <Script
        src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
        onReady={mount}
      />
      <div ref={ref} />
    </>
  );
};
export default Challenge;
