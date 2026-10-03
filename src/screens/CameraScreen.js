import { ActivityIndicator, Linking, StyleSheet, Text, View } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { IconButton, PrimaryButton } from '../components';
import { colors, fonts } from '../theme';

export function CameraScreen({ onBack }) {
  const [permission, requestPermission] = useCameraPermissions();

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

  return (
    <View style={styles.screen}>
      <CameraView facing="back" style={styles.camera} />
      <IconButton icon="arrow-back" inverse label="Wróć" onPress={onBack} style={styles.back} />
      <View style={styles.liveBadge}><View style={styles.liveDot} /><Text style={styles.liveText}>ZDJĘCIE NA ŻYWO</Text></View>
      <View style={styles.guide}><View style={styles.cornerOne} /><View style={styles.cornerTwo} /><View style={styles.cornerThree} /><View style={styles.cornerFour} /></View>
      <View style={styles.cameraBottom}><Text style={styles.cameraHint}>Skieruj aparat na miejsce działania</Text><View style={styles.shutter}><View style={styles.shutterInner} /></View></View>
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
  guide: { borderColor: 'rgba(255,255,255,.25)', borderRadius: 24, borderWidth: 1, bottom: 180, left: 24, position: 'absolute', right: 24, top: 110 },
  cornerOne: { borderLeftColor: colors.surface, borderLeftWidth: 3, borderTopColor: colors.surface, borderTopLeftRadius: 15, borderTopWidth: 3, height: 36, left: -1, position: 'absolute', top: -1, width: 36 },
  cornerTwo: { borderRightColor: colors.surface, borderRightWidth: 3, borderTopColor: colors.surface, borderTopRightRadius: 15, borderTopWidth: 3, height: 36, position: 'absolute', right: -1, top: -1, width: 36 },
  cornerThree: { borderBottomColor: colors.surface, borderBottomLeftRadius: 15, borderBottomWidth: 3, borderLeftColor: colors.surface, borderLeftWidth: 3, bottom: -1, height: 36, left: -1, position: 'absolute', width: 36 },
  cornerFour: { borderBottomColor: colors.surface, borderBottomRightRadius: 15, borderBottomWidth: 3, borderRightColor: colors.surface, borderRightWidth: 3, bottom: -1, height: 36, position: 'absolute', right: -1, width: 36 },
  cameraBottom: { alignItems: 'center', backgroundColor: 'rgba(16,24,40,.84)', bottom: 0, left: 0, paddingBottom: 24, paddingTop: 16, position: 'absolute', right: 0 },
  cameraHint: { color: colors.surface, fontFamily: fonts.bodyMedium, fontSize: 13, marginBottom: 14 },
  shutter: { alignItems: 'center', borderColor: colors.surface, borderRadius: 36, borderWidth: 4, height: 72, justifyContent: 'center', width: 72 },
  shutterInner: { backgroundColor: colors.surface, borderRadius: 27, height: 54, width: 54 },
  messageScreen: { alignItems: 'center', backgroundColor: colors.background, flex: 1, justifyContent: 'center', padding: 30 },
  title: { color: colors.ink, fontFamily: fonts.headingExtra, fontSize: 27, marginTop: 18, textAlign: 'center' },
  body: { color: colors.muted, fontFamily: fonts.body, fontSize: 15, lineHeight: 23, marginTop: 12, textAlign: 'center' },
  permissionButton: { marginTop: 25 },
});
