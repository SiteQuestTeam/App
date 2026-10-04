import { useState } from 'react';
import { Image, ScrollView, StyleSheet, Text, View } from 'react-native';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { PrimaryButton, ScreenHeader, StatusChip } from '../components';
import { colors, fonts } from '../theme';

function distanceMeters(a, b) {
  const R = 6371000;
  const toRad = (v) => (v * Math.PI) / 180;
  const dLat = toRad(b.latitude - a.latitude);
  const dLng = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

export function DetailScreen({ initiative, onBack, onVote }) {
  const [checking, setChecking] = useState(false);
  const [distance, setDistance] = useState<number | null>(initiative.id === 'tea' ? 35 : null);
  const [locationError, setLocationError] = useState(false);
  const passed = initiative.status === 'passed';
  const canVote = !passed && !initiative.hasVoted && distance !== null && distance <= 50;

  const checkLocation = async () => {
    setChecking(true);
    setLocationError(false);
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (!permission.granted) throw new Error('permission');
      const current = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      const meters = distanceMeters(
        { latitude: current.coords.latitude, longitude: current.coords.longitude },
        { latitude: initiative.latitude, longitude: initiative.longitude },
      );
      setDistance(meters);
    } catch {
      setLocationError(true);
    } finally {
      setChecking(false);
    }
  };

  const ctaText = passed ? 'Inicjatywa przeszła' : initiative.hasVoted ? 'Głos oddany' : canVote ? 'Oddaj Głos · +10 pkt' : distance === null ? 'Sprawdź odległość' : `Podejdź bliżej · ${Math.round(distance)} m`;

  const handlePress = async () => {
    if (canVote) onVote();
    else if (!passed && !initiative.hasVoted) await checkLocation();
  };

  return (
    <View style={styles.screen}>
      <ScreenHeader kicker="Inicjatywa" onBack={onBack} title="Szczegóły" />
      <ScrollView contentContainerStyle={styles.content}>
        {initiative.brief.photoUri ? <Image source={{ uri: initiative.brief.photoUri }} style={styles.photo} /> : (
          <View style={[styles.hero, { backgroundColor: passed ? colors.mintSoft : colors.blueSoft }]}>
            <View style={[styles.voteOrb, { backgroundColor: passed ? colors.resolved : initiative.color }]}>
              <Text style={styles.voteOrbText}>{passed ? '✓' : initiative.votes}</Text>
            </View>
            <Text style={styles.heroHint}>{passed ? 'PRÓG OSIĄGNIĘTY' : `${initiative.votes} Z ${initiative.threshold} GŁOSÓW`}</Text>
          </View>
        )}

        <StatusChip tone={passed ? 'green' : 'blue'} icon={passed ? 'checkmark-circle' : 'megaphone-outline'}>{passed ? 'Przeszła' : 'Zbiera głosy'}</StatusChip>
        <Text style={styles.title}>{initiative.brief.title}</Text>
        <Text style={styles.place}>{initiative.brief.place}</Text>

        <View style={styles.progressHeader}><Text style={styles.progressTitle}>Głosy</Text><Text style={styles.progressCount}>{initiative.votes}/{initiative.threshold}</Text></View>
        <View style={styles.progress}><View style={[styles.progressFill, { width: `${Math.min(100, initiative.votes / initiative.threshold * 100)}%`, backgroundColor: passed ? colors.resolved : colors.signal }]} /></View>

        <BriefSection icon="alert-circle-outline" label="Problem" text={initiative.brief.problem} />
        <BriefSection icon="hammer-outline" label="Proponowane działanie" text={initiative.brief.proposedAction} />
        <BriefSection icon="heart-outline" label="Dlaczego to ważne" text={initiative.brief.whyImportant} />

        <Text style={styles.sectionTitle}>Potrzebne zasoby</Text>
        <View style={styles.resources}>
          <Resource icon="people-outline" label="Ludzie" value={initiative.brief.resources.people} />
          <Resource icon="construct-outline" label="Sprzęt" value={initiative.brief.resources.equipment} />
          <Resource icon="car-outline" label="Transport" value={initiative.brief.resources.transport} />
        </View>

        <View style={styles.fixerCard}>
          <View style={styles.fixerIcon}><Ionicons color={colors.violet} name="build-outline" size={22} /></View>
          <View style={styles.fixerCopy}><Text style={styles.fixerLabel}>KTO NAPRAWI</Text><Text style={styles.fixerValue}>{initiative.brief.fixer}</Text><Text style={styles.fixerMeta}>Sugestia AI potwierdzona przez Gracza</Text></View>
        </View>

        {!passed && (
          <View style={styles.locationCard}>
            <Ionicons color={distance !== null && distance <= 50 ? colors.resolved : colors.signal} name="location" size={22} />
            <View style={styles.locationCopy}>
              <Text style={styles.locationTitle}>{distance !== null && distance <= 50 ? 'Jesteś w zasięgu Głosu' : 'Głos tylko na miejscu'}</Text>
              <Text style={styles.locationBody}>MVP wymaga około 50 m od Inicjatywy. {locationError ? 'Nie udało się pobrać GPS.' : distance !== null ? `Aktualnie: ~${Math.round(distance)} m.` : 'Sprawdź GPS przed oddaniem Głosu.'}</Text>
            </View>
          </View>
        )}

        <PrimaryButton disabled={passed || initiative.hasVoted} icon={passed ? 'checkmark' : initiative.hasVoted ? 'checkmark-circle' : 'megaphone'} onPress={handlePress} tone={passed ? 'green' : 'blue'} style={styles.cta}>
          {checking ? 'Sprawdzam GPS…' : ctaText}
        </PrimaryButton>
        {initiative.id === 'tea' && !passed && !initiative.hasVoted && <Text style={styles.demoHint}>Demo HackYeah: ta Inicjatywa startuje z 9/10 i mockowo jest w zasięgu, aby pokazać przejście do 10/10.</Text>}
      </ScrollView>
    </View>
  );
}

function BriefSection({ icon, label, text }) {
  return <View style={styles.section}><View style={styles.sectionHead}><Ionicons color={colors.signal} name={icon} size={19} /><Text style={styles.sectionTitleInline}>{label}</Text></View><Text style={styles.body}>{text}</Text></View>;
}

function Resource({ icon, label, value }) {
  return <View style={styles.resource}><Ionicons color={colors.signal} name={icon} size={20} /><View style={{ flex: 1 }}><Text style={styles.resourceLabel}>{label}</Text><Text style={styles.resourceValue}>{value}</Text></View></View>;
}

const styles = StyleSheet.create({
  screen: { backgroundColor: colors.background, flex: 1 }, content: { padding: 16, paddingBottom: 40 },
  photo: { borderRadius: 24, height: 230, marginBottom: 18, width: '100%' },
  hero: { alignItems: 'center', borderRadius: 24, height: 220, justifyContent: 'center', marginBottom: 18 }, voteOrb: { alignItems: 'center', borderColor: colors.surface, borderRadius: 43, borderWidth: 7, height: 86, justifyContent: 'center', width: 86 }, voteOrbText: { color: colors.surface, fontFamily: fonts.headingExtra, fontSize: 29 }, heroHint: { color: colors.ink, fontFamily: fonts.bodyBold, fontSize: 11, letterSpacing: 1, marginTop: 14 },
  title: { color: colors.ink, fontFamily: fonts.headingExtra, fontSize: 27, lineHeight: 34, marginTop: 14 }, place: { color: colors.muted, fontFamily: fonts.body, fontSize: 13, lineHeight: 19, marginTop: 7 },
  progressHeader: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginTop: 22 }, progressTitle: { color: colors.ink, fontFamily: fonts.bodyBold, fontSize: 13 }, progressCount: { color: colors.signal, fontFamily: fonts.heading, fontSize: 18 }, progress: { backgroundColor: colors.border, borderRadius: 99, height: 9, marginTop: 8, overflow: 'hidden' }, progressFill: { borderRadius: 99, height: '100%' },
  section: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 19, borderWidth: 1, marginTop: 14, padding: 16 }, sectionHead: { alignItems: 'center', flexDirection: 'row', gap: 8 }, sectionTitleInline: { color: colors.ink, fontFamily: fonts.bodyBold, fontSize: 13 }, body: { color: colors.muted, fontFamily: fonts.body, fontSize: 13, lineHeight: 20, marginTop: 8 }, sectionTitle: { color: colors.ink, fontFamily: fonts.heading, fontSize: 18, marginTop: 24 },
  resources: { gap: 9, marginTop: 10 }, resource: { alignItems: 'flex-start', backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 16, borderWidth: 1, flexDirection: 'row', gap: 11, padding: 14 }, resourceLabel: { color: colors.ink, fontFamily: fonts.bodyBold, fontSize: 12 }, resourceValue: { color: colors.muted, fontFamily: fonts.body, fontSize: 12, lineHeight: 18, marginTop: 2 },
  fixerCard: { alignItems: 'center', backgroundColor: colors.violetSoft, borderRadius: 20, flexDirection: 'row', gap: 13, marginTop: 18, padding: 16 }, fixerIcon: { alignItems: 'center', backgroundColor: colors.surface, borderRadius: 22, height: 44, justifyContent: 'center', width: 44 }, fixerCopy: { flex: 1 }, fixerLabel: { color: colors.violet, fontFamily: fonts.bodyBold, fontSize: 9, letterSpacing: 1 }, fixerValue: { color: colors.ink, fontFamily: fonts.heading, fontSize: 17, marginTop: 3 }, fixerMeta: { color: colors.muted, fontFamily: fonts.body, fontSize: 10, marginTop: 2 },
  locationCard: { alignItems: 'flex-start', backgroundColor: colors.blueSoft, borderRadius: 18, flexDirection: 'row', gap: 11, marginTop: 18, padding: 15 }, locationCopy: { flex: 1 }, locationTitle: { color: colors.ink, fontFamily: fonts.bodyBold, fontSize: 13 }, locationBody: { color: colors.muted, fontFamily: fonts.body, fontSize: 11, lineHeight: 17, marginTop: 3 },
  cta: { marginTop: 18 }, demoHint: { color: colors.muted, fontFamily: fonts.body, fontSize: 10, lineHeight: 15, marginTop: 9, textAlign: 'center' },
});
