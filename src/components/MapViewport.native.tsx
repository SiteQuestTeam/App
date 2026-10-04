import { forwardRef } from 'react';
import { WebView } from 'react-native-webview';

export const MapViewport = forwardRef<any, any>(function MapViewport(
  { html, onError, onLoadEnd, onMessage, style },
  ref,
) {
  return (
    <WebView
      ref={ref}
      javaScriptEnabled
      onError={onError}
      onHttpError={onError}
      onLoadEnd={onLoadEnd}
      onMessage={onMessage}
      originWhitelist={['*']}
      source={{ html }}
      style={style}
    />
  );
});
