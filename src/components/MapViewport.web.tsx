import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import { StyleSheet } from 'react-native';

export const MapViewport = forwardRef<any, any>(function MapViewport(
  { html, onError, onLoadEnd, onMessage, style },
  ref,
) {
  const iframeRef = useRef<any>(null);

  useImperativeHandle(ref, () => ({
    injectJavaScript(code: string) {
      iframeRef.current?.contentWindow?.postMessage(
        { type: 'sitequest-eval', code },
        '*',
      );
    },
  }), []);

  useEffect(() => {
    const handleWindowMessage = (event: MessageEvent) => {
      const iframeWindow = iframeRef.current?.contentWindow;
      if (!iframeWindow || event.source !== iframeWindow) return;

      const data = typeof event.data === 'string'
        ? event.data
        : JSON.stringify(event.data);

      onMessage?.({ nativeEvent: { data } });
    };

    window.addEventListener('message', handleWindowMessage);
    return () => window.removeEventListener('message', handleWindowMessage);
  }, [onMessage]);

  const flattenedStyle = StyleSheet.flatten(style) || {};

  return (
    <iframe
      ref={iframeRef}
      onError={onError}
      onLoad={onLoadEnd}
      srcDoc={html}
      title="Mapa SiteQuest"
      style={{
        ...flattenedStyle,
        border: 0,
        display: 'block',
        height: '100%',
        minHeight: 0,
        width: '100%',
      }}
    />
  );
});
