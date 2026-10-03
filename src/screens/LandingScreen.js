import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Brand, PrimaryButton, RoleSwitcher, StatusChip } from '../components';
import { colors, fonts } from '../theme';

const steps = [
  ['01', 'Odkrywaj blisko', 'Zobacz działania i Szare miejsca w swoim sąsiedztwie.', 'map'],
  ['02', 'Dołącz lub zacznij', 'Wybierz Misję, Rajd albo opublikuj własny pomysł.', 'flash'],
  ['03', 'Zmieniaj miasto', 'Działaj z ludźmi, dokumentuj efekt i buduj zaufanie.', 'people'],
];

export function LandingScreen({ onStart, role, onRoleChange }) {
  return (
    <ScrollView bounces={false} contentContainerStyle={styles.content} style={styles.screen}>
      <View style={styles.hero}>
        <View style={styles.topbar}>
          <Brand inverse />
          <RoleSwitcher compact role={role} onChange={onRoleChange} />
        </View>
        <StatusChip tone="violet" icon="location">Kraków · działania blisko Ciebie</StatusChip>
        <Text style={styles.heroTitle}>Twoje miasto.{`\n`}Twój następny krok.</Text>
        <Text style={styles.heroBody}>
          Znajdź lokalną Misję, zbierz ekipę na Rajd albo pokaż miejsce, które może zmienić się na lepsze.
        </Text>
        <PrimaryButton icon="navigate" onPress={onStart} style={styles.heroButton}>
          Otwórz mapę działań
        </PrimaryButton>

        <View style={styles.mapPreview}>
          <View style={styles.roadOne} />
          <View style={styles.roadTwo} />
          <View style={styles.previewZone} />
          <View style={[styles.previewMarker, styles.previewMarkerOne]}><Text style={styles.markerText}>M</Text></View>
          <View style={[styles.previewMarker, styles.previewMarkerTwo]}><Text style={styles.markerText}>R</Text></View>
          <View style={styles.previewPlayer}><Ionicons color={colors.surface} name="person" size={20} /></View>
          <Text style={styles.previewCaption}>3 działania w pobliżu</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.kicker}>Jak działa SiteQuest?</Text>
        <Text style={styles.sectionTitle}>Od odkrycia do realnej zmiany</Text>
        <View style={styles.steps}>
          {steps.map(([number, title, copy, icon]) => (
            <View key={number} style={styles.stepCard}>
              <View style={styles.stepIcon}><Ionicons color={colors.signal} name={icon} size={23} /></View>
              <Text style={styles.stepNumber}>{number}</Text>
              <Text style={styles.stepTitle}>{title}</Text>
              <Text style={styles.stepBody}>{copy}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={[styles.section, styles.impactSection]}>
        <View style={styles.impactIcon}><Ionicons color={colors.resolved} name="checkmark" size={28} /></View>
        <Text style={styles.kicker}>Zaufanie przez jasność</Text>
        <Text style={styles.sectionTitle}>Widzisz efekt, nie obietnicę</Text>
        <Text style={styles.sectionBody}>
          Każde działanie ma czytelny status, miejsce, termin i potrzebne role. Rozwiązane miejsca zostają oznaczone dopiero po potwierdzonym rezultacie.
        </Text>
        <Pressable onPress={onStart} style={styles.inlineLink}>
          <Text style={styles.inlineLinkText}>Zobacz działania na mapie</Text>
          <Ionicons color={colors.signal} name="arrow-forward" size={18} />
        </Pressable>
      </View>

      <View style={styles.footer}>
        <Brand inverse />
        <Text style={styles.footerText}>Mapa działań · realna obecność · lokalny wpływ</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: colors.background },
  content: { flexGrow: 1 },
  hero: { backgroundColor: colors.ink, minHeight: 700, overflow: 'hidden', paddingBottom: 30, paddingHorizontal: 20, paddingTop: 18 },
  topbar: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginBottom: 58 },
  heroTitle: { color: colors.surface, fontFamily: fonts.headingExtra, fontSize: 46, letterSpacing: -1.8, lineHeight: 52, marginTop: 24 },
  heroBody: { color: '#C9D1DF', fontFamily: fonts.body, fontSize: 17, lineHeight: 26, marginTop: 18, maxWidth: 520 },
  heroButton: { alignSelf: 'flex-start', marginTop: 28 },
  mapPreview: { backgroundColor: '#202C40', borderColor: '#344054', borderRadius: 26, borderWidth: 1, height: 210, marginTop: 42, overflow: 'hidden', position: 'relative' },
  roadOne: { backgroundColor: '#344054', height: 38, left: -30, position: 'absolute', top: 85, transform: [{ rotate: '-9deg' }], width: '120%' },
  roadTwo: { backgroundColor: '#344054', height: 30, left: 150, position: 'absolute', top: -15, transform: [{ rotate: '72deg' }], width: 270 },
  previewZone: { backgroundColor: 'rgba(47,107,255,.12)', borderColor: colors.signal, borderRadius: 65, borderWidth: 2, height: 110, left: '50%', marginLeft: -55, marginTop: -55, position: 'absolute', top: '50%', width: 110 },
  previewMarker: { alignItems: 'center', borderColor: colors.surface, borderRadius: 24, borderWidth: 4, height: 48, justifyContent: 'center', position: 'absolute', width: 48 },
  previewMarkerOne: { backgroundColor: colors.signal, left: 38, top: 38 },
  previewMarkerTwo: { backgroundColor: colors.violet, right: 38, top: 66 },
  markerText: { color: colors.surface, fontFamily: fonts.headingExtra, fontSize: 16 },
  previewPlayer: { alignItems: 'center', backgroundColor: colors.signal, borderColor: colors.surface, borderRadius: 25, borderWidth: 4, height: 50, justifyContent: 'center', left: '50%', marginLeft: -25, marginTop: -25, position: 'absolute', top: '50%', width: 50 },
  previewCaption: { bottom: 14, color: '#C9D1DF', fontFamily: fonts.bodyBold, fontSize: 12, left: 16, position: 'absolute' },
  section: { paddingHorizontal: 20, paddingVertical: 52 },
  kicker: { color: colors.signal, fontFamily: fonts.bodyBold, fontSize: 12, letterSpacing: 1.1, textTransform: 'uppercase' },
  sectionTitle: { color: colors.ink, fontFamily: fonts.headingExtra, fontSize: 30, letterSpacing: -1, lineHeight: 37, marginTop: 10 },
  sectionBody: { color: colors.muted, fontFamily: fonts.body, fontSize: 16, lineHeight: 25, marginTop: 14 },
  steps: { gap: 14, marginTop: 28 },
  stepCard: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 22, borderWidth: 1, padding: 20 },
  stepIcon: { alignItems: 'center', backgroundColor: colors.blueSoft, borderRadius: 25, height: 50, justifyContent: 'center', width: 50 },
  stepNumber: { color: colors.violet, fontFamily: fonts.bodyBold, fontSize: 11, letterSpacing: 1, marginTop: 18 },
  stepTitle: { color: colors.ink, fontFamily: fonts.heading, fontSize: 21, marginTop: 4 },
  stepBody: { color: colors.muted, fontFamily: fonts.body, fontSize: 15, lineHeight: 22, marginTop: 7 },
  impactSection: { backgroundColor: colors.mintSoft },
  impactIcon: { alignItems: 'center', backgroundColor: colors.surface, borderRadius: 28, height: 56, justifyContent: 'center', marginBottom: 22, width: 56 },
  inlineLink: { alignItems: 'center', flexDirection: 'row', gap: 8, marginTop: 24 },
  inlineLinkText: { color: colors.signal, fontFamily: fonts.bodyBold, fontSize: 15 },
  footer: { backgroundColor: colors.ink, paddingHorizontal: 20, paddingVertical: 34 },
  footerText: { color: '#98A2B3', fontFamily: fonts.body, fontSize: 12, marginTop: 18 },
});
