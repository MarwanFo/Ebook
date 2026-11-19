import React, { useEffect, useRef } from 'react';

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: HTMLElement | string,
        options: {
          sitekey: string;
          callback?: (token: string) => void;
          'expired-callback'?: () => void;
          'error-callback'?: (error: unknown) => void;
          theme?: 'light' | 'dark' | 'auto';
          size?: 'normal' | 'compact' | 'flexible';
        },
      ) => string;
      remove: (widgetId: string) => void;
      reset: (widgetId: string) => void;
    };
    onTurnstileLoaded?: () => void;
  }
}

interface TurnstileWidgetProps {
  onVerify: (token: string) => void;
  onExpire?: () => void;
}

export const TurnstileWidget: React.FC<TurnstileWidgetProps> = ({ onVerify, onExpire }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const siteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY;

  useEffect(() => {
    if (!siteKey || !containerRef.current) return;

    let isMounted = true;

    const renderWidget = () => {
      if (!window.turnstile || !containerRef.current || !isMounted) return;

      try {
        if (widgetIdRef.current) {
          window.turnstile.remove(widgetIdRef.current);
          widgetIdRef.current = null;
        }

        widgetIdRef.current = window.turnstile.render(containerRef.current, {
          sitekey: siteKey,
          callback: (token: string) => {
            if (isMounted) onVerify(token);
          },
          'expired-callback': () => {
            if (isMounted && onExpire) onExpire();
          },
          theme: 'auto',
          size: 'flexible',
        });
      } catch (err) {
        console.error('Failed to initialize Turnstile widget', err);
      }
    };

    if (window.turnstile) {
      renderWidget();
    } else {
      // Check if script tag is already in head
      const existingScript = document.getElementById('cf-turnstile-script');
      if (!existingScript) {
        const script = document.createElement('script');
        script.id = 'cf-turnstile-script';
        script.src =
          'https://challenges.cloudflare.com/turnstile/v0/api.js?onload=onTurnstileLoaded&render=explicit';
        script.async = true;
        script.defer = true;
        window.onTurnstileLoaded = () => {
          if (isMounted) renderWidget();
        };
        document.head.appendChild(script);
      } else {
        const previousOnload = window.onTurnstileLoaded;
        window.onTurnstileLoaded = () => {
          if (previousOnload) previousOnload();
          if (isMounted) renderWidget();
        };
      }
    }

    return () => {
      isMounted = false;
      if (widgetIdRef.current && window.turnstile) {
        try {
          window.turnstile.remove(widgetIdRef.current);
        } catch {
          // ignore cleanup errors
        }
        widgetIdRef.current = null;
      }
    };
  }, [siteKey, onVerify, onExpire]);

  if (!siteKey) {
    return null;
  }

  return (
    <div className="my-3 flex justify-center">
      <div ref={containerRef} className="w-full max-w-full overflow-hidden rounded-xl" />
    </div>
  );
};
