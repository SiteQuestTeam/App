import { useRef, useState } from 'react';
import { ActivityIndicator, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { IconButton, PrimaryButton } from '../components';
import { colors, fonts } from '../theme';

export function CameraScreen({ onBack, onCapture }) {
  const cameraRef = useRef<any>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [capturing, setCapturing] = useState(false);

  if (!permission) {
    return <View style={styles.messageScreen}><ActivityIndicator color={colors.signal} size="large" /><Text style={styles.body}>Sprawdzanie dostępu do aparatu…</Text></View>;
  }

  if (!permission.granted) {
    return (
      <View style={styles.messageScreen}>
        <IconButton icon="arrow-back" label="Wróć" onPress={onBack} style={styles.backStandalone} />
        <Text style={styles.title}>Aparat potrzebuje dostępu</Text>
        <Text style={styles.body}>{permission.canAskAgain ? 'Zezwól aplikacji korzystać z kamery, aby wykonać Zdjęcie na żywo.' : 'Włącz dostęp do kamery w ustawieniach telefonu.'}</Text>
        <PrimaryButton icon="camera" onPress={permission.canAskAgain ? requestPermission : Linking.openSettings} style={styles.permissionButton}>
          {permission.canAskAgain ? 'Zezwól na dostęp' : 'Otwórz ustawienia'}
        </PrimaryButton>
      </View>
    );
  }

  const takePhoto = async () => {
    if (capturing || !cameraRef.current) return;
    try {
      setCapturing(true);
      const result = await cameraRef.current.takePictureAsync({ quality: 0.75, skipProcessing: false });
      if (result?.uri) onCapture(result.uri);
    } finally {
      setCapturing(false);
    }
  };

  return (
    <View style={styles.screen}>
      <CameraView ref={cameraRef} facing="back" style={styles.camera} />
      <IconButton icon="arrow-back" inverse label="Wróć" onPress={onBack} style={styles.back} />
      <View style={styles.liveBadge}><View style={styles.liveDot} /><Text style={styles.liveText}>ZDJĘCIE NA ŻYWO</Text></View>
      <View style={styles.guide} />
      <View style={styles.cameraBottom}>
        <Text style={styles.cameraHint}>Zdjęcie trafi bezpośrednio do mockowego asystenta AI</Text>
        <Pressable accessibilityRole="button" disabled={capturing} onPress={takePhoto} style={styles.shutter}>
          {capturing ? <ActivityIndicator color={colors.surface} /> : <View style={styles.shutterInner} />}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: '#000', flex: 1 },
  camera: { flex: 1 },
  back: { left: 16, position: 'absolute', top: 16 },
  backStandalone: { left: 16, position: 'absolute', top: 16 },
  liveBadge: { alignItems: 'center', backgroundColor: 'rgba(16,24,40,.78)', borderRadius: 999, flexDirection: 'row', gap: 7, paddingHorizontal: 12, paddingVertical: 8, position: 'absolute', right: 16, top: 20 },
  liveDot: { backgroundColor: colors.error, borderRadius: 4, height: 8, width: 8 },
  liveText: { color: colors.surface, fontFamily: fonts.bodyBold, fontSize: 10, letterSpacing: 0.8 },
  guide: { borderColor: 'rgba(255,255,255,.42)', borderRadius: 24, borderWidth: 2, bottom: 190, left: 24, position: 'absolute', right: 24, top: 110 },
  cameraBottom: { alignItems: 'center', backgroundColor: 'rgba(16,24,40,.84)', bottom: 0, left: 0, paddingBottom: 24, paddingTop: 16, position: 'absolute', right: 0 },
  cameraHint: { color: colors.surface, fontFamily: fonts.bodyMedium, fontSize: 12, marginBottom: 14 },
  shutter: { alignItems: 'center', borderColor: colors.surface, borderRadius: 36, borderWidth: 4, height: 72, justifyContent: 'center', width: 72 },
  shutterInner: { backgroundColor: colors.surface, borderRadius: 27, height: 54, width: 54 },
  messageScreen: { alignItems: 'center', backgroundColor: colors.background, flex: 1, justifyContent: 'center', padding: 30 },
  title: { color: colors.ink, fontFamily: fonts.headingExtra, fontSize: 27, marginTop: 18, textAlign: 'center' },
  body: { color: colors.muted, fontFamily: fonts.body, fontSize: 15, lineHeight: 23, marginTop: 12, textAlign: 'center' },
  permissionButton: { marginTop: 25 },
});
