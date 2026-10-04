import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  AppState,
  Linking,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useCameraPermissions } from 'expo-camera';
import * as Location from 'expo-location';
import { colors, fonts, shadow } from '../theme';

type RequirementState = 'checking' | 'granted' | 'missing';

export function PermissionGateScreen({ onReady }: { onReady: () => void }) {
  const [cameraPermission, requestCameraPermission, getCameraPermission] = useCameraPermissions();
  const [locationState, setLocationState] = useState<RequirementState>('checking');
  const [cameraState, setCameraState] = useState<RequirementState>('checking');
  const [locationServicesEnabled, setLocationServicesEnabled] = useState<boolean | null>(null);
  const [checking, setChecking] = useState(true);
  const [canAskAgain, setCanAskAgain] = useState(true);
  const running = useRef(false);
  const initialCheckStarted = useRef(false);

  const checkRequirements = useCallback(async (requestMissing: boolean) => {
    if (running.current) return;
    running.current = true;
    setChecking(true);

    try {
      let locationPermission = await Location.getForegroundPermissionsAsync();
      if (requestMissing && !locationPermission.granted && locationPermission.canAskAgain) {
        locationPermission = await Location.requestForegroundPermissionsAsync();
      }

      let nextCameraPermission = await getCameraPermission();
      if (requestMissing && !nextCameraPermission.granted && nextCameraPermission.canAskAgain) {
        nextCameraPermission = await requestCameraPermission();
      }

      const servicesEnabled = await Location.hasServicesEnabledAsync();

      const locationGranted = locationPermission.granted && servicesEnabled;
      const cameraGranted = nextCameraPermission.granted;

      setLocationState(locationGranted ? 'granted' : 'missing');
      setCameraState(cameraGranted ? 'granted' : 'missing');
      setLocationServicesEnabled(servicesEnabled);
      setCanAskAgain(
        (!locationPermission.granted && locationPermission.canAskAgain)
        || (!nextCameraPermission.granted && nextCameraPermission.canAskAgain),
      );

      if (locationGranted && cameraGranted) {
        onReady();
      }
    } catch {
      setLocationState('missing');
      setCameraState((current) => current === 'granted' ? current : 'missing');
    } finally {
      running.current = false;
      setChecking(false);
    }
  }, [getCameraPermission, onReady, requestCameraPermission]);

  useEffect(() => {
    if (!cameraPermission || initialCheckStarted.current) return;
    initialCheckStarted.current = true;
    void checkRequirements(true);
  }, [cameraPermission, checkRequirements]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active' && initialCheckStarted.current) {
        void checkRequirements(false);
      }
    });

    return () => subscription.remove();
  }, [checkRequirements]);

  const locationGranted = locationState === 'granted';
  const cameraGranted = cameraState === 'granted';
  const allGranted = locationGranted && cameraGranted;

  return (
    <View style={styles.screen}>
      <View style={styles.brandMark}>
        <Ionicons color={colors.surface} name="location" size={31} />
      </View>

      <Text style={styles.brand}>SiteQuest</Text>
      <Text style={styles.title}>{checking ? 'Przygotowujemy aplikację' : 'Potrzebne dostępy'}</Text>
      <Text style={styles.subtitle}>
        {checking
          ? 'Sprawdzamy wymagane uprawnienia urządzenia.'
          : 'Do mapy, głosowania i zgłoszeń potrzebujemy lokalizacji oraz aparatu.'}
      </Text>

      <View style={styles.requirements}>
        <RequirementRow
          icon="navigate-outline"
          label="Lokalizacja"
          state={locationState}
          detail={locationServicesEnabled === false ? 'GPS jest wyłączony' : 'Mapa i głosowanie w promieniu 50 m'}
        />
        <RequirementRow
          icon="camera-outline"
          label="Aparat"
          state={cameraState}
          detail="Zdjęcia do inicjatyw i zgłoszeń"
        />
      </View>

      {checking ? (
        <View style={styles.loadingRow}>
          <ActivityIndicator color={colors.signal} size="small" />
          <Text style={styles.loadingText}>Sprawdzanie dostępów…</Text>
        </View>
      ) : !allGranted ? (
        <View style={styles.actions}>
          {canAskAgain && locationServicesEnabled !== false ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => void checkRequirements(true)}
              style={({ pressed }) => [styles.primaryAction, pressed && styles.pressed]}
            >
              <Text style={styles.primaryActionText}>Nadaj brakujące dostępy</Text>
            </Pressable>
          ) : (
            <Pressable
              accessibilityRole="button"
              onPress={() => void Linking.openSettings()}
              style={({ pressed }) => [styles.primaryAction, pressed && styles.pressed]}
            >
              <Text style={styles.primaryActionText}>Otwórz ustawienia</Text>
            </Pressable>
          )}

          <Pressable
            accessibilityRole="button"
            onPress={() => void checkRequirements(false)}
            style={({ pressed }) => [styles.retryAction, pressed && styles.pressed]}
          >
            <Ionicons color={colors.signal} name="refresh" size={17} />
            <Text style={styles.retryActionText}>Sprawdź ponownie</Text>
          </Pressable>
        </View>
      ) : null}

      <Text style={styles.privacy}>
        Dostępy są używane tylko do funkcji aplikacji: pozycji na mapie, głosowania na miejscu i wykonywania zdjęć.
      </Text>
    </View>
  );
}

function RequirementRow({
  icon,
  label,
  state,
  detail,
}: {
  icon: string;
  label: string;
  state: RequirementState;
  detail: string;
}) {
  const granted = state === 'granted';

  return (
    <View style={styles.requirement}>
      <View style={[styles.requirementIcon, granted && styles.requirementIconGranted]}>
        <Ionicons
          color={granted ? colors.resolved : colors.signal}
          name={icon as any}
          size={21}
        />
      </View>
      <View style={styles.requirementCopy}>
        <Text style={styles.requirementLabel}>{label}</Text>
        <Text style={styles.requirementDetail}>{detail}</Text>
      </View>
      {state === 'checking' ? (
        <ActivityIndicator color={colors.signal} size="small" />
      ) : (
        <Ionicons
          color={granted ? colors.resolved : colors.warning}
          name={granted ? 'checkmark-circle' : 'alert-circle'}
          size={23}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    alignItems: 'center',
    backgroundColor: colors.background,
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 32,
  },
  brandMark: {
    alignItems: 'center',
    backgroundColor: colors.signal,
    borderRadius: 30,
    height: 60,
    justifyContent: 'center',
    width: 60,
    ...shadow,
  },
  brand: {
    color: colors.signal,
    fontFamily: fonts.headingExtra,
    fontSize: 17,
    marginTop: 13,
  },
  title: {
    color: colors.ink,
    fontFamily: fonts.headingExtra,
    fontSize: 27,
    lineHeight: 33,
    marginTop: 24,
    textAlign: 'center',
  },
  subtitle: {
    color: colors.muted,
    fontFamily: fonts.body,
    fontSize: 13,
    lineHeight: 20,
    marginTop: 7,
    maxWidth: 360,
    textAlign: 'center',
  },
  requirements: {
    gap: 10,
    marginTop: 28,
    maxWidth: 430,
    width: '100%',
  },
  requirement: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 19,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 11,
    minHeight: 72,
    paddingHorizontal: 13,
    paddingVertical: 11,
  },
  requirementIcon: {
    alignItems: 'center',
    backgroundColor: colors.blueSoft,
    borderRadius: 18,
    height: 38,
    justifyContent: 'center',
    width: 38,
  },
  requirementIconGranted: {
    backgroundColor: colors.mintSoft,
  },
  requirementCopy: {
    flex: 1,
  },
  requirementLabel: {
    color: colors.ink,
    fontFamily: fonts.bodyBold,
    fontSize: 13,
  },
  requirementDetail: {
    color: colors.muted,
    fontFamily: fonts.body,
    fontSize: 10,
    lineHeight: 15,
    marginTop: 2,
  },
  loadingRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 9,
    marginTop: 22,
  },
  loadingText: {
    color: colors.muted,
    fontFamily: fonts.bodyMedium,
    fontSize: 11,
  },
  actions: {
    gap: 9,
    marginTop: 22,
    maxWidth: 430,
    width: '100%',
  },
  primaryAction: {
    alignItems: 'center',
    backgroundColor: colors.signal,
    borderRadius: 16,
    justifyContent: 'center',
    minHeight: 52,
    paddingHorizontal: 18,
  },
  primaryActionText: {
    color: colors.surface,
    fontFamily: fonts.bodyBold,
    fontSize: 14,
  },
  retryAction: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 7,
    justifyContent: 'center',
    minHeight: 42,
  },
  retryActionText: {
    color: colors.signal,
    fontFamily: fonts.bodyBold,
    fontSize: 11,
  },
  pressed: {
    opacity: 0.82,
    transform: [{ scale: 0.99 }],
  },
  privacy: {
    color: colors.muted,
    fontFamily: fonts.body,
    fontSize: 9,
    lineHeight: 14,
    marginTop: 22,
    maxWidth: 360,
    textAlign: 'center',
  },
});
