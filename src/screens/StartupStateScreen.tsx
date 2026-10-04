import { ActivityIndicator, Image, Linking, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, shadow } from '../theme';

type StartupStateScreenProps = {
  mode: 'loading' | 'gps';
  title?: string;
  body?: string;
  onRetry?: () => void;
};

const beaverGps = require('../../assets/images/beaver-gps.jpg');

export function StartupStateScreen({
  mode,
  title,
  body,
  onRetry,
}: StartupStateScreenProps) {
  const isLoading = mode === 'loading';

  const openSettings = async () => {
    if (Platform.OS === 'android') {
      try {
        await Linking.sendIntent('android.settings.LOCATION_SOURCE_SETTINGS');
        return;
      } catch {
        // Fall through to the app settings if the device does not expose this intent.
      }
    }

    await Linking.openSettings();
  };

  return (
    <View style={styles.screen}>
      <View style={styles.content}>
        <View style={styles.artWrap}>
          <Image resizeMode="contain" source={beaverGps} style={styles.art} />
        </View>

        <Text style={styles.title}>
          {title || (isLoading ? 'Ładowanie mapy…' : 'Brak sygnału GPS')}
        </Text>

        <Text style={styles.body}>
          {body || (
            isLoading
              ? 'Ustalamy Twoją lokalizację i przygotowujemy mapę.'
              : 'Bóbr nie wie, gdzie jesteś. Włącz lokalizację, aby korzystać z mapy i działać na miejscu.'
          )}
        </Text>

        {isLoading ? (
          <View style={styles.loadingRow}>
            <ActivityIndicator color={colors.signal} size="small" />
            <Text style={styles.loadingText}>Chwila…</Text>
          </View>
        ) : (
          <View style={styles.actions}>
            <Pressable
              accessibilityRole="button"
              onPress={onRetry}
              style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}
            >
              <Ionicons color={colors.surface} name="refresh" size={19} />
              <Text style={styles.primaryButtonText}>Spróbuj ponownie</Text>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              onPress={openSettings}
              style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}
            >
              <Ionicons color={colors.signal} name="settings-outline" size={19} />
              <Text style={styles.secondaryButtonText}>Otwórz ustawienia</Text>
            </Pressable>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    alignItems: 'center',
    backgroundColor: colors.background,
    flex: 1,
    justifyContent: 'center',
    width: '100%',
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
    maxWidth: 390,
    paddingHorizontal: 24,
    paddingVertical: 20,
    width: '100%',
  },
  artWrap: {
    alignItems: 'center',
    aspectRatio: 0.75,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 28,
    borderWidth: 1,
    justifyContent: 'center',
    maxWidth: 260,
    overflow: 'hidden',
    width: '72%',
    ...shadow,
  },
  art: {
    height: '100%',
    width: '100%',
  },
  title: {
    alignSelf: 'stretch',
    color: colors.ink,
    fontSize: 29,
    fontWeight: '800',
    lineHeight: 35,
    marginTop: 22,
    textAlign: 'center',
  },
  body: {
    alignSelf: 'stretch',
    color: colors.muted,
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 21,
    marginTop: 9,
    textAlign: 'center',
  },
  loadingRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 9,
    marginTop: 22,
  },
  loadingText: {
    color: colors.signal,
    fontSize: 13,
    fontWeight: '700',
  },
  actions: {
    alignSelf: 'stretch',
    gap: 10,
    marginTop: 25,
  },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: colors.signal,
    borderRadius: 17,
    flexDirection: 'row',
    gap: 9,
    justifyContent: 'center',
    minHeight: 54,
    paddingHorizontal: 18,
    ...shadow,
  },
  primaryButtonText: {
    color: colors.surface,
    fontSize: 15,
    fontWeight: '800',
  },
  secondaryButton: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 17,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 9,
    justifyContent: 'center',
    minHeight: 52,
    paddingHorizontal: 18,
  },
  secondaryButtonText: {
    color: colors.signal,
    fontSize: 14,
    fontWeight: '800',
  },
  pressed: {
    opacity: 0.82,
    transform: [{ scale: 0.99 }],
  },
});
