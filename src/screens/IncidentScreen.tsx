import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PrimaryButton, ScreenHeader } from '../components';
import { colors, fonts } from '../theme';

export function IncidentScreen({ onBack }) {
  return (
    <View style={styles.screen}>
      <ScreenHeader kicker="KCK" title="Zgłoś usterkę" onBack={onBack} />
      <View style={styles.content}>
        <View style={styles.icon}>
          <Ionicons color={colors.signal} name="construct-outline" size={34} />
        </View>
        <Text style={styles.title}>Usterka miejska</Text>
        <Text style={styles.body}>
          Ta ścieżka jest oddzielona od Inicjatyw. Zgłoszenie będzie przygotowane ze Zdjęcia na żywo i GPS, a następnie wysłane do Krakowskiego Centrum Kontaktu.
        </Text>
        <PrimaryButton icon="camera-outline" onPress={onBack}>Wróć do mapy</PrimaryButton>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: colors.background, flex: 1 },
  content: { alignItems: 'center', flex: 1, justifyContent: 'center', padding: 28 },
  icon: { alignItems: 'center', backgroundColor: colors.blueSoft, borderRadius: 28, height: 72, justifyContent: 'center', width: 72 },
  title: { color: colors.ink, fontFamily: fonts.headingExtra, fontSize: 24, marginTop: 18 },
  body: { color: colors.muted, fontFamily: fonts.body, fontSize: 14, lineHeight: 21, marginBottom: 28, marginTop: 10, textAlign: 'center' },
});
