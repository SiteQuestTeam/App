import { useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';

const HOME_SCREEN = 'home';
const CAMERA_SCREEN = 'camera';

function HomeScreen() {
  return (
    <View style={styles.centeredContent}>
      <Text style={styles.title}>Hello World</Text>
    </View>
  );
}

function CameraScreen() {
  const [permission, requestPermission] = useCameraPermissions();

  if (!permission) {
    return (
      <View style={styles.centeredContent}>
        <ActivityIndicator size="large" color="#2e7d32" />
        <Text style={styles.message}>Sprawdzanie dostępu do aparatu…</Text>
      </View>
    );
  }

  if (!permission.granted) {
    const handlePermissionPress = permission.canAskAgain
      ? requestPermission
      : Linking.openSettings;

    return (
      <View style={styles.centeredContent}>
        <Text style={styles.permissionTitle}>Brak dostępu do aparatu</Text>
        <Text style={styles.message}>
          {permission.canAskAgain
            ? 'Zezwól aplikacji na używanie aparatu, aby zobaczyć podgląd.'
            : 'Dostęp został zablokowany. Możesz go włączyć w ustawieniach telefonu.'}
        </Text>
        <Pressable
          accessibilityRole="button"
          onPress={handlePermissionPress}
          style={({ pressed }) => [styles.permissionButton, pressed && styles.pressed]}
        >
          <Text style={styles.permissionButtonText}>
            {permission.canAskAgain ? 'Zezwól na dostęp' : 'Otwórz ustawienia'}
          </Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.cameraContainer}>
      <CameraView facing="back" style={styles.camera} />
      <View pointerEvents="none" style={styles.cameraLabel}>
        <Text style={styles.cameraLabelText}>Podgląd aparatu</Text>
      </View>
    </View>
  );
}

function NavigationButton({ active, label, onPress }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.navigationButton,
        active && styles.navigationButtonActive,
        pressed && styles.pressed,
      ]}
    >
      <Text
        style={[
          styles.navigationButtonText,
          active && styles.navigationButtonTextActive,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export default function App() {
  const [screen, setScreen] = useState(HOME_SCREEN);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.screen}>
        <View style={styles.content}>
          {screen === HOME_SCREEN ? <HomeScreen /> : <CameraScreen />}
        </View>

        <View style={styles.navigation}>
          <NavigationButton
            active={screen === HOME_SCREEN}
            label="Home"
            onPress={() => setScreen(HOME_SCREEN)}
          />
          <NavigationButton
            active={screen === CAMERA_SCREEN}
            label="Aparat"
            onPress={() => setScreen(CAMERA_SCREEN)}
          />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  screen: {
    flex: 1,
  },
  content: {
    flex: 1,
    backgroundColor: '#f4f7f4',
  },
  centeredContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  title: {
    color: '#17231a',
    fontSize: 32,
    fontWeight: '600',
  },
  permissionTitle: {
    color: '#17231a',
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 12,
    textAlign: 'center',
  },
  message: {
    color: '#465149',
    fontSize: 16,
    lineHeight: 24,
    marginTop: 16,
    textAlign: 'center',
  },
  permissionButton: {
    backgroundColor: '#2e7d32',
    borderRadius: 12,
    marginTop: 24,
    paddingHorizontal: 24,
    paddingVertical: 14,
  },
  permissionButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  cameraContainer: {
    flex: 1,
    backgroundColor: '#000000',
  },
  camera: {
    flex: 1,
  },
  cameraLabel: {
    position: 'absolute',
    left: 16,
    top: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  cameraLabelText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
  },
  navigation: {
    flexDirection: 'row',
    gap: 12,
    padding: 12,
    backgroundColor: '#ffffff',
    borderTopColor: '#dce4dd',
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  navigationButton: {
    flex: 1,
    alignItems: 'center',
    borderRadius: 12,
    paddingVertical: 14,
  },
  navigationButtonActive: {
    backgroundColor: '#dff2e1',
  },
  navigationButtonText: {
    color: '#536158',
    fontSize: 16,
    fontWeight: '600',
  },
  navigationButtonTextActive: {
    color: '#1f6b28',
  },
  pressed: {
    opacity: 0.72,
  },
});
