import { useState } from 'react';
import { ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { IconButton, PrimaryButton, ScreenHeader, StatusChip } from '../components';
import { colors, fonts } from '../theme';

export function DetailScreen({ initiative, onBack, role }) {
  const [joined, setJoined] = useState(false);
  const progress = Math.min(initiative.people / initiative.capacity, 1);

  return (
    <View style={styles.screen}>
      <ScreenHeader
        kicker={`${initiative.type} w pobliżu`}
        onBack={onBack}
        right={<IconButton icon="share-social-outline" label="Udostępnij" onPress={() => Share.share({ message: `${initiative.title} — ${initiative.date}` })} />}
        title="Szczegóły działania"
      />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={[styles.hero, { backgroundColor: initiative.type === 'Rajd' ? colors.violetSoft : colors.blueSoft }]}>
          <View style={styles.cityBlockOne} />
          <View style={styles.cityBlockTwo} />
          <View style={[styles.heroMarker, { backgroundColor: initiative.color }]}>
            <Text style={styles.heroMarkerText}>{initiative.marker}</Text>
          </View>
          <View style={styles.heroCopy}>
            <StatusChip icon={initiative.type === 'Rajd' ? 'people-outline' : initiative.type === 'Zwiad' ? 'binoculars-outline' : 'flag-outline'} tone={initiative.type === 'Rajd' ? 'violet' : initiative.type === 'Zwiad' ? 'grey' : 'blue'}>{initiative.type}</StatusChip>
            <Text style={styles.heroDistance}>{initiative.distance} od Ciebie</Text>
          </View>
        </View>

        <StatusChip tone={initiative.type === 'Zwiad' ? 'grey' : 'green'} icon={initiative.type === 'Zwiad' ? 'binoculars-outline' : 'people'}>
          {initiative.status}
        </StatusChip>
        <Text style={styles.title}>{initiative.title}</Text>
        <Text style={styles.location}>{initiative.address.toUpperCase()} · {initiative.district.toUpperCase()}</Text>

        <View style={styles.organizerRow}>
          <View style={styles.organizerAvatar}><Text style={styles.organizerLetter}>{initiative.organizer[0]}</Text></View>
          <View style={styles.organizerCopy}>
            <Text style={styles.organizerName}>{initiative.organizer}</Text>
            <Text style={styles.organizerMeta}>Organizator · {initiative.people} osób w ekipie</Text>
          </View>
          <Ionicons color={colors.violet} name="people" size={24} />
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>O działaniu</Text>
          <Text style={styles.body}>{initiative.description}</Text>
        </View>

        <View style={styles.dateCard}>
          <View style={styles.dateIcon}><Ionicons color={colors.signal} name="calendar" size={23} /></View>
          <View>
            <Text style={styles.dateText}>{initiative.date}</Text>
            <Text style={styles.dateMeta}>{initiative.address}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Przyda się</Text>
          <View style={styles.needs}>
            {initiative.needs.map((need, index) => <StatusChip key={need} tone={index === 1 ? 'warning' : 'green'}>{need}</StatusChip>)}
          </View>
        </View>

        <View style={styles.progressHeader}>
          <Text style={styles.label}>Ekipa</Text>
          <Text style={styles.progressCount}>{initiative.people + (joined ? 1 : 0)} / {initiative.capacity} osób</Text>
        </View>
        <View style={styles.progress}><View style={[styles.progressFill, { width: `${Math.min(progress * 100 + (joined ? 2 : 0), 100)}%` }]} /></View>

        {role === 'ngo' ? (
          <PrimaryButton icon="create" onPress={() => setJoined(!joined)} tone="violet" style={styles.cta}>
            {joined ? 'Zapisano do panelu NGO' : 'Wspieraj jako NGO'}
          </PrimaryButton>
        ) : (
          <PrimaryButton icon={joined ? 'checkmark' : 'people'} onPress={() => setJoined(!joined)} style={styles.cta}>
            {joined ? 'Jesteś w ekipie' : `Dołączam · +${initiative.points} pkt`}
          </PrimaryButton>
        )}
        <Text style={styles.disclaimer}>Punkty trafiają na konto po potwierdzeniu udziału na miejscu.</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: colors.background, flex: 1 },
  content: { padding: 16, paddingBottom: 40 },
  hero: { borderRadius: 24, height: 230, marginBottom: 18, overflow: 'hidden', position: 'relative' },
  cityBlockOne: { backgroundColor: '#C9D5E5', borderRadius: 18, bottom: 32, height: 120, left: -10, position: 'absolute', transform: [{ rotate: '-8deg' }], width: 180 },
  cityBlockTwo: { backgroundColor: '#B5C5DA', borderRadius: 18, height: 170, position: 'absolute', right: -15, top: 28, transform: [{ rotate: '7deg' }], width: 170 },
  heroMarker: { alignItems: 'center', borderColor: colors.surface, borderRadius: 37, borderWidth: 6, height: 74, justifyContent: 'center', left: '50%', marginLeft: -37, marginTop: -48, position: 'absolute', top: '50%', width: 74 },
  heroMarkerText: { color: colors.surface, fontFamily: fonts.headingExtra, fontSize: 25 },
  heroCopy: { alignItems: 'center', bottom: 14, flexDirection: 'row', justifyContent: 'space-between', left: 14, position: 'absolute', right: 14 },
  heroDistance: { color: colors.ink, fontFamily: fonts.bodyBold, fontSize: 12 },
  title: { color: colors.ink, fontFamily: fonts.headingExtra, fontSize: 30, letterSpacing: -0.9, lineHeight: 36, marginTop: 14 },
  location: { color: colors.signal, fontFamily: fonts.bodyBold, fontSize: 11, letterSpacing: 0.6, marginTop: 9 },
  organizerRow: { alignItems: 'center', borderBottomColor: colors.border, borderBottomWidth: 1, flexDirection: 'row', marginTop: 24, paddingBottom: 20 },
  organizerAvatar: { alignItems: 'center', backgroundColor: colors.violet, borderRadius: 23, height: 46, justifyContent: 'center', width: 46 },
  organizerLetter: { color: colors.surface, fontFamily: fonts.headingExtra, fontSize: 18 },
  organizerCopy: { flex: 1, marginLeft: 12 },
  organizerName: { color: colors.ink, fontFamily: fonts.bodyBold, fontSize: 14 },
  organizerMeta: { color: colors.muted, fontFamily: fonts.body, fontSize: 12, marginTop: 3 },
  section: { marginTop: 25 },
  label: { color: colors.ink, fontFamily: fonts.bodyBold, fontSize: 12, letterSpacing: 0.8, textTransform: 'uppercase' },
  body: { color: colors.ink, fontFamily: fonts.body, fontSize: 16, lineHeight: 24, marginTop: 9 },
  dateCard: { alignItems: 'center', backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 18, borderWidth: 1, flexDirection: 'row', gap: 14, marginTop: 24, padding: 15 },
  dateIcon: { alignItems: 'center', backgroundColor: colors.blueSoft, borderRadius: 22, height: 44, justifyContent: 'center', width: 44 },
  dateText: { color: colors.ink, fontFamily: fonts.bodyBold, fontSize: 14 },
  dateMeta: { color: colors.muted, fontFamily: fonts.body, fontSize: 12, marginTop: 3 },
  needs: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 11 },
  progressHeader: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginTop: 26 },
  progressCount: { color: colors.muted, fontFamily: fonts.bodyBold, fontSize: 12 },
  progress: { backgroundColor: colors.border, borderRadius: 999, height: 8, marginTop: 10, overflow: 'hidden' },
  progressFill: { backgroundColor: colors.signal, borderRadius: 999, height: '100%' },
  cta: { marginTop: 28 },
  disclaimer: { color: colors.muted, fontFamily: fonts.body, fontSize: 11, lineHeight: 17, marginTop: 10, textAlign: 'center' },
});
