import { ActivityIndicator, Image, StyleSheet, Text, View } from 'react-native';
import { colors, shadow } from '../theme';

type StartupStateScreenProps = {
  title?: string;
  body?: string;
};

const beaverGps = require('../../assets/images/beaver-gps.jpg');

export function StartupStateScreen({
  title,
  body,
}: StartupStateScreenProps) {

  return (
    <View style={styles.screen}>
      <View style={styles.content}>
        <View style={styles.artWrap}>
          <Image resizeMode="contain" source={beaverGps} style={styles.art} />
        </View>

        <Text style={styles.title}>{title || 'Ładowanie mapy…'}</Text>

        <Text style={styles.body}>
          {body || 'Ustalamy Twoją lokalizację i przygotowujemy mapę.'}
        </Text>

        <View style={styles.loadingRow}>
          <ActivityIndicator color={colors.signal} size="small" />
          <Text style={styles.loadingText}>Chwila…</Text>
        </View>
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
});
