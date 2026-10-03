import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BottomNav, Brand, InitiativeRow, PrimaryButton, ScreenHeader, StatusChip } from '../components';
import { initiatives } from '../data';
import { colors, fonts } from '../theme';

function TabShell({ active, children, onNavigate, role, title, kicker }) {
  return (
    <View style={styles.screen}>
      <ScreenHeader kicker={kicker} title={title} />
      {children}
      <BottomNav active={active} onSelect={onNavigate} role={role} />
    </View>
  );
}

export function DiscoverScreen({ onNavigate, onOpenInitiative, role }) {
  return (
    <TabShell active="discover" kicker="Działania w Krakowie" onNavigate={onNavigate} role={role} title={role === 'ngo' ? 'Inicjatywy do wsparcia' : 'Odkrywaj w pobliżu'}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.filterRow}>
          <StatusChip icon="apps-outline" tone="blue">Wszystkie</StatusChip>
          <StatusChip icon="flag-outline" tone="blue">Misje</StatusChip>
          <StatusChip icon="people-outline" tone="violet">Rajdy</StatusChip>
          <StatusChip icon="binoculars-outline" tone="grey">Zwiady</StatusChip>
        </View>
        <Text style={styles.sectionTitle}>{initiatives.length} działań blisko Ciebie</Text>
        <View style={styles.list}>{initiatives.map((item) => <InitiativeRow item={item} key={item.id} onPress={() => onOpenInitiative(item)} />)}</View>
      </ScrollView>
    </TabShell>
  );
}

export function TeamScreen({ onNavigate, onOpenInitiative, onCreate, role }) {
  if (role === 'ngo') {
    return (
      <TabShell active="team" kicker="Wpływ organizacji" onNavigate={onNavigate} role={role} title="Panel NGO">
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.ngoHero}>
            <Text style={styles.ngoKicker}>FUNDACJA DOBRY KADR</Text>
            <Text style={styles.ngoTitle}>Działacie tam, gdzie jesteście potrzebni.</Text>
            <PrimaryButton icon="add" onPress={onCreate} style={styles.ngoButton} tone="violet">Nowa inicjatywa</PrimaryButton>
          </View>
          <View style={styles.statsRow}>
            <Stat value="3" label="aktywne" />
            <Stat value="86" label="uczestników" />
            <Stat value="2" label="efekty" />
          </View>
          <Text style={styles.sectionTitle}>Wasze działania</Text>
          <View style={styles.list}>{initiatives.slice(0, 2).map((item) => <InitiativeRow item={item} key={item.id} onPress={() => onOpenInitiative(item)} />)}</View>
        </ScrollView>
      </TabShell>
    );
  }

  return (
    <TabShell active="team" kicker="Twoje działania" onNavigate={onNavigate} role={role} title="Twoja ekipa">
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.teamHero}>
          <View style={styles.avatarStack}>
            {['A', 'K', 'M'].map((letter, index) => <View key={letter} style={[styles.teamAvatar, { left: index * 28, backgroundColor: index === 1 ? colors.violet : index === 2 ? colors.resolved : colors.signal }]}><Text style={styles.teamAvatarText}>{letter}</Text></View>)}
          </View>
          <Text style={styles.teamTitle}>Razem łatwiej ruszyć z miejsca</Text>
          <Text style={styles.teamBody}>Masz 2 nadchodzące działania i 12 poznanych sąsiadów.</Text>
        </View>
        <Text style={styles.sectionTitle}>Nadchodzące</Text>
        <View style={styles.list}>{initiatives.slice(0, 2).map((item) => <InitiativeRow joined item={item} key={item.id} onPress={() => onOpenInitiative(item)} />)}</View>
      </ScrollView>
    </TabShell>
  );
}

const PLAYER_POINTS = 860;

const rewards = [
  {
    id: 'coffee',
    points: 400,
    icon: 'cafe-outline',
    title: 'Kawa za działanie',
    description: 'Dowolna kawa lub herbata w partnerskiej kawiarni.',
    sponsor: 'Kawa na Rogu',
    sponsorType: 'Lokalna firma',
    tone: 'blue',
  },
  {
    id: 'culture',
    points: 800,
    icon: 'ticket-outline',
    title: 'Bilet na lokalne wydarzenie',
    description: 'Wejściówka na wybrane kino plenerowe, koncert lub warsztat.',
    sponsor: 'Stowarzyszenie Sąsiedzki Kraków',
    sponsorType: 'Organizacja',
    tone: 'violet',
  },
  {
    id: 'plants',
    points: 1200,
    icon: 'leaf-outline',
    title: 'Pakiet miejskiej zieleni',
    description: 'Zestaw sadzonek i nasion do balkonu albo ogrodu społecznego.',
    sponsor: 'Fundacja Zielony Puls',
    sponsorType: 'Fundacja',
    tone: 'green',
  },
  {
    id: 'sport',
    points: 1800,
    icon: 'fitness-outline',
    title: 'Wejście na obiekt sportowy',
    description: 'Jednorazowe wejście na wybrany miejski obiekt rekreacyjny.',
    sponsor: 'Jednostka miejska Kraków',
    sponsorType: 'Jednostka samorządowa',
    tone: 'warning',
  },
];

export function ProfileScreen({ onNavigate, onCamera, role, accountId, onAccountChange }) {
  const [profileTab, setProfileTab] = useState('profile');
  const nextReward = rewards.find((reward) => reward.points > PLAYER_POINTS) || rewards[rewards.length - 1];
  const previousThreshold = Math.max(0, ...rewards.filter((reward) => reward.points <= PLAYER_POINTS).map((reward) => reward.points));
  const progressRange = Math.max(1, nextReward.points - previousThreshold);
  const progressValue = Math.min(1, (PLAYER_POINTS - previousThreshold) / progressRange);

  const redeemReward = (reward) => {
    if (PLAYER_POINTS < reward.points) return;
    Alert.alert(
      'Nagroda gotowa do odbioru',
      `${reward.title}\n\nSponsor: ${reward.sponsor}\nW wersji demonstracyjnej nie pobieramy punktów.`,
    );
  };

  return (
    <TabShell active="profile" kicker="Wersja demonstracyjna" onNavigate={onNavigate} role={role} title={profileTab === 'rewards' ? 'Nagrody' : 'Profil'}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.profileTabs}>
          {[
            ['profile', 'Profil', 'person-outline'],
            ['rewards', 'Nagrody', 'gift-outline'],
          ].map(([value, label, icon]) => {
            const active = profileTab === value;
            return (
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                key={value}
                onPress={() => setProfileTab(value)}
                style={[styles.profileTab, active && styles.profileTabActive]}
              >
                <Ionicons color={active ? colors.surface : colors.muted} name={icon} size={17} />
                <Text style={[styles.profileTabText, active && styles.profileTabTextActive]}>{label}</Text>
              </Pressable>
            );
          })}
        </View>

        {profileTab === 'profile' ? (
          <>
            <View style={styles.profileCard}>
              <View style={styles.profileAvatar}><Text style={styles.profileInitial}>{role === 'ngo' ? 'F' : 'O'}</Text></View>
              <Text style={styles.profileName}>{role === 'ngo' ? 'Fundacja Dobry Kadr' : 'Ola z Grzegórzek'}</Text>
              <Text style={styles.profileMeta}>{role === 'ngo' ? 'Organizacja społeczna · Kraków' : 'Gracz · Grzegórzki · 860 pkt'}</Text>
              <View style={styles.accountBadge}>
                <Ionicons color={colors.signal} name="person-circle" size={17} />
                <Text style={styles.accountBadgeText}>{accountId === 'ngo-demo' ? 'Konto organizacji' : 'Konto mieszkańca'}</Text>
              </View>
            </View>

            <View style={styles.menuCard}>
              <ProfileRow icon="camera" label="Aparat na żywo" onPress={onCamera} />
              <ProfileRow icon="time" label="Historia działań" onPress={() => Alert.alert('Historia działań', 'Tutaj pojawią się potwierdzone Misje, Rajdy i Zwiady.')} />
              <ProfileRow icon="ribbon" label="Odznaki i rezultaty" onPress={() => Alert.alert('Odznaki i rezultaty', 'W wersji demonstracyjnej masz odznakę „Pierwszy krok”.')} />
              <ProfileRow
                icon="settings"
                label="Ustawienia konta"
                last
                onPress={() =>
                  Alert.alert(
                    'Zmień konto',
                    'Typ użytkownika wynika z wybranego konta. Wybierz konto demonstracyjne:',
                    [
                      { text: 'Ola z Grzegórzek', onPress: () => onAccountChange('player-demo') },
                      { text: 'Fundacja Dobry Kadr', onPress: () => onAccountChange('ngo-demo') },
                      { text: 'Anuluj', style: 'cancel' },
                    ],
                  )
                }
              />
            </View>
            <View style={styles.aboutCard}><Brand /><Text style={styles.aboutText}>Prototyp klikalnego frontendu. Dane i działania są przykładowe i nie są wysyłane do backendu.</Text></View>
          </>
        ) : role === 'ngo' ? (
          <View style={styles.rewardsNgoCard}>
            <View style={styles.rewardsNgoIcon}><Ionicons color={colors.violet} name="gift-outline" size={30} /></View>
            <Text style={styles.rewardsNgoTitle}>Nagrody są przypisane do kont mieszkańców</Text>
            <Text style={styles.rewardsNgoText}>Konta organizacji mogą w przyszłości sponsorować nagrody. W demo przełącz konto w Ustawieniach konta, aby zobaczyć katalog mieszkańca.</Text>
          </View>
        ) : (
          <>
            <View style={styles.rewardsHero}>
              <View style={styles.rewardsHeroTop}>
                <View>
                  <Text style={styles.rewardsEyebrow}>TWOJE PUNKTY</Text>
                  <Text style={styles.rewardsPoints}>{PLAYER_POINTS} <Text style={styles.rewardsPointsUnit}>pkt</Text></Text>
                </View>
                <View style={styles.rewardsGiftCircle}><Ionicons color={colors.surface} name="gift" size={28} /></View>
              </View>
              <Text style={styles.rewardsHeroTitle}>Działasz lokalnie. Partnerzy odwdzięczają się nagrodami.</Text>
              <Text style={styles.rewardsHeroBody}>Punkty zdobywasz za potwierdzone Misje, Rajdy i Zwiady. Nagrody finansują partnerzy społeczni i lokalni.</Text>

              <View style={styles.rewardProgressHeader}>
                <Text style={styles.rewardProgressLabel}>Do: {nextReward.title}</Text>
                <Text style={styles.rewardProgressValue}>{Math.max(0, nextReward.points - PLAYER_POINTS)} pkt</Text>
              </View>
              <View style={styles.rewardProgressTrack}>
                <View style={[styles.rewardProgressFill, { width: `${Math.round(progressValue * 100)}%` }]} />
              </View>
            </View>

            <View style={styles.rewardLegend}>
              <Text style={styles.rewardLegendTitle}>Nagrody sponsorują</Text>
              <View style={styles.rewardSponsorTypes}>
                {[
                  ['storefront-outline', 'Firmy lokalne'],
                  ['people-outline', 'Organizacje'],
                  ['heart-outline', 'Fundacje'],
                  ['business-outline', 'Samorząd'],
                ].map(([icon, label]) => (
                  <View key={label} style={styles.rewardSponsorType}>
                    <Ionicons color={colors.signal} name={icon} size={15} />
                    <Text style={styles.rewardSponsorTypeText}>{label}</Text>
                  </View>
                ))}
              </View>
            </View>

            <Text style={styles.sectionTitle}>Katalog nagród</Text>
            <View style={styles.rewardList}>
              {rewards.map((reward) => {
                const unlocked = PLAYER_POINTS >= reward.points;
                const accent =
                  reward.tone === 'violet' ? colors.violet :
                  reward.tone === 'green' ? colors.resolved :
                  reward.tone === 'warning' ? colors.warning :
                  colors.signal;

                return (
                  <Pressable
                    accessibilityRole="button"
                    disabled={!unlocked}
                    key={reward.id}
                    onPress={() => redeemReward(reward)}
                    style={({ pressed }) => [
                      styles.rewardCard,
                      unlocked && styles.rewardCardUnlocked,
                      pressed && unlocked && styles.rewardCardPressed,
                    ]}
                  >
                    <View style={[styles.rewardIcon, { backgroundColor: unlocked ? accent : colors.greySoft }]}>
                      <Ionicons color={unlocked ? colors.surface : colors.muted} name={reward.icon} size={24} />
                    </View>

                    <View style={styles.rewardCopy}>
                      <View style={styles.rewardTopLine}>
                        <View style={[styles.rewardPointsPill, unlocked && { backgroundColor: colors.blueSoft }]}>
                          <Ionicons color={unlocked ? colors.signal : colors.muted} name={unlocked ? 'checkmark-circle' : 'lock-closed'} size={14} />
                          <Text style={[styles.rewardPointsPillText, unlocked && { color: colors.signal }]}>{reward.points} pkt</Text>
                        </View>
                        {unlocked && <Text style={styles.rewardAvailable}>DOSTĘPNA</Text>}
                      </View>

                      <Text style={styles.rewardTitle}>{reward.title}</Text>
                      <Text style={styles.rewardDescription}>{reward.description}</Text>

                      <View style={styles.rewardSponsorRow}>
                        <View style={styles.rewardSponsorMark}><Text style={styles.rewardSponsorLetter}>{reward.sponsor[0]}</Text></View>
                        <View style={styles.rewardSponsorCopy}>
                          <Text style={styles.rewardSponsorName}>{reward.sponsor}</Text>
                          <Text style={styles.rewardSponsorTypeLabel}>{reward.sponsorType} · partner demo</Text>
                        </View>
                      </View>
                    </View>
                  </Pressable>
                );
              })}
            </View>

            <Text style={styles.rewardDisclaimer}>Nagrody i sponsorzy są danymi demonstracyjnymi. Docelowo dostępność, limit sztuk i zasady odbioru będą pochodziły z backendu.</Text>
          </>
        )}
      </ScrollView>
    </TabShell>
  );
}

function Stat({ value, label }) {
  return <View style={styles.stat}><Text style={styles.statValue}>{value}</Text><Text style={styles.statLabel}>{label}</Text></View>;
}

function ProfileRow({ icon, label, onPress, last }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={[styles.profileRow, last && styles.profileRowLast]}>
      <View style={styles.profileRowIcon}><Ionicons color={colors.signal} name={icon} size={20} /></View>
      <Text style={styles.profileRowLabel}>{label}</Text>
      <Ionicons color={colors.muted} name="chevron-forward" size={20} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: colors.background, flex: 1 },
  content: { padding: 16, paddingBottom: 30 },
  filterRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  sectionTitle: { color: colors.ink, fontFamily: fonts.heading, fontSize: 20, marginBottom: 14, marginTop: 24 },
  list: { gap: 12 },
  ngoHero: { backgroundColor: colors.ink, borderRadius: 24, padding: 22 },
  ngoKicker: { color: '#A997FF', fontFamily: fonts.bodyBold, fontSize: 11, letterSpacing: 1 },
  ngoTitle: { color: colors.surface, fontFamily: fonts.headingExtra, fontSize: 27, lineHeight: 33, marginTop: 12 },
  ngoButton: { marginTop: 22 },
  statsRow: { flexDirection: 'row', gap: 10, marginTop: 14 },
  stat: { alignItems: 'center', backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 17, borderWidth: 1, flex: 1, paddingVertical: 15 },
  statValue: { color: colors.ink, fontFamily: fonts.headingExtra, fontSize: 23 },
  statLabel: { color: colors.muted, fontFamily: fonts.body, fontSize: 11, marginTop: 2 },
  teamHero: { backgroundColor: colors.blueSoft, borderRadius: 24, padding: 22 },
  avatarStack: { height: 52, position: 'relative' },
  teamAvatar: { alignItems: 'center', borderColor: colors.surface, borderRadius: 26, borderWidth: 4, height: 52, justifyContent: 'center', position: 'absolute', width: 52 },
  teamAvatarText: { color: colors.surface, fontFamily: fonts.bodyBold, fontSize: 15 },
  teamTitle: { color: colors.ink, fontFamily: fonts.headingExtra, fontSize: 23, marginTop: 15 },
  teamBody: { color: colors.muted, fontFamily: fonts.body, fontSize: 14, lineHeight: 21, marginTop: 7 },
  profileCard: { alignItems: 'center', backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 24, borderWidth: 1, padding: 24 },
  profileAvatar: { alignItems: 'center', backgroundColor: colors.violet, borderRadius: 38, height: 76, justifyContent: 'center', width: 76 },
  profileInitial: { color: colors.surface, fontFamily: fonts.headingExtra, fontSize: 29 },
  profileName: { color: colors.ink, fontFamily: fonts.headingExtra, fontSize: 22, marginTop: 14 },
  profileMeta: { color: colors.muted, fontFamily: fonts.body, fontSize: 13, marginBottom: 20, marginTop: 5 },
  accountBadge: { alignItems: 'center', backgroundColor: colors.blueSoft, borderRadius: 999, flexDirection: 'row', gap: 7, marginTop: 2, paddingHorizontal: 12, paddingVertical: 8 },
  accountBadgeText: { color: colors.ink, fontFamily: fonts.bodyBold, fontSize: 11 },
  profileTabs: { backgroundColor: colors.greySoft, borderRadius: 16, flexDirection: 'row', gap: 4, marginBottom: 14, padding: 4 },
  profileTab: { alignItems: 'center', borderRadius: 13, flex: 1, flexDirection: 'row', gap: 7, justifyContent: 'center', minHeight: 44 },
  profileTabActive: { backgroundColor: colors.ink },
  profileTabText: { color: colors.muted, fontFamily: fonts.bodyBold, fontSize: 12 },
  profileTabTextActive: { color: colors.surface },
  rewardsHero: { backgroundColor: colors.ink, borderRadius: 24, padding: 20 },
  rewardsHeroTop: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  rewardsEyebrow: { color: '#A997FF', fontFamily: fonts.bodyBold, fontSize: 10, letterSpacing: 1 },
  rewardsPoints: { color: colors.surface, fontFamily: fonts.headingExtra, fontSize: 38, letterSpacing: -1.2, marginTop: 3 },
  rewardsPointsUnit: { color: '#AEB8CA', fontFamily: fonts.heading, fontSize: 16 },
  rewardsGiftCircle: { alignItems: 'center', backgroundColor: colors.violet, borderRadius: 27, height: 54, justifyContent: 'center', width: 54 },
  rewardsHeroTitle: { color: colors.surface, fontFamily: fonts.headingExtra, fontSize: 21, lineHeight: 27, marginTop: 17 },
  rewardsHeroBody: { color: '#C9D1DF', fontFamily: fonts.body, fontSize: 12, lineHeight: 18, marginTop: 7 },
  rewardProgressHeader: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginTop: 20 },
  rewardProgressLabel: { color: colors.surface, flex: 1, fontFamily: fonts.bodyBold, fontSize: 11 },
  rewardProgressValue: { color: '#A997FF', fontFamily: fonts.bodyBold, fontSize: 11, marginLeft: 10 },
  rewardProgressTrack: { backgroundColor: '#2B3444', borderRadius: 999, height: 8, marginTop: 8, overflow: 'hidden' },
  rewardProgressFill: { backgroundColor: colors.violet, borderRadius: 999, height: '100%' },
  rewardLegend: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 20, borderWidth: 1, marginTop: 14, padding: 16 },
  rewardLegendTitle: { color: colors.ink, fontFamily: fonts.bodyBold, fontSize: 12 },
  rewardSponsorTypes: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginTop: 11 },
  rewardSponsorType: { alignItems: 'center', backgroundColor: colors.blueSoft, borderRadius: 999, flexDirection: 'row', gap: 5, paddingHorizontal: 9, paddingVertical: 7 },
  rewardSponsorTypeText: { color: colors.deep, fontFamily: fonts.bodyMedium, fontSize: 10 },
  rewardList: { gap: 11 },
  rewardCard: { alignItems: 'flex-start', backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 20, borderWidth: 1, flexDirection: 'row', gap: 13, opacity: 0.66, padding: 14 },
  rewardCardUnlocked: { opacity: 1 },
  rewardCardPressed: { opacity: 0.82, transform: [{ scale: 0.995 }] },
  rewardIcon: { alignItems: 'center', borderRadius: 20, height: 48, justifyContent: 'center', width: 48 },
  rewardCopy: { flex: 1 },
  rewardTopLine: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  rewardPointsPill: { alignItems: 'center', backgroundColor: colors.greySoft, borderRadius: 999, flexDirection: 'row', gap: 4, paddingHorizontal: 8, paddingVertical: 5 },
  rewardPointsPillText: { color: colors.muted, fontFamily: fonts.bodyBold, fontSize: 10 },
  rewardAvailable: { color: colors.resolved, fontFamily: fonts.bodyBold, fontSize: 9, letterSpacing: 0.7 },
  rewardTitle: { color: colors.ink, fontFamily: fonts.heading, fontSize: 15, marginTop: 8 },
  rewardDescription: { color: colors.muted, fontFamily: fonts.body, fontSize: 11, lineHeight: 17, marginTop: 4 },
  rewardSponsorRow: { alignItems: 'center', borderTopColor: colors.border, borderTopWidth: StyleSheet.hairlineWidth, flexDirection: 'row', marginTop: 11, paddingTop: 10 },
  rewardSponsorMark: { alignItems: 'center', backgroundColor: colors.violetSoft, borderRadius: 14, height: 28, justifyContent: 'center', width: 28 },
  rewardSponsorLetter: { color: colors.violet, fontFamily: fonts.bodyBold, fontSize: 11 },
  rewardSponsorCopy: { flex: 1, marginLeft: 8 },
  rewardSponsorName: { color: colors.ink, fontFamily: fonts.bodyBold, fontSize: 10 },
  rewardSponsorTypeLabel: { color: colors.muted, fontFamily: fonts.body, fontSize: 9, marginTop: 1 },
  rewardDisclaimer: { color: colors.muted, fontFamily: fonts.body, fontSize: 10, lineHeight: 15, marginTop: 14, textAlign: 'center' },
  rewardsNgoCard: { alignItems: 'center', backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 24, borderWidth: 1, padding: 28 },
  rewardsNgoIcon: { alignItems: 'center', backgroundColor: colors.violetSoft, borderRadius: 30, height: 60, justifyContent: 'center', width: 60 },
  rewardsNgoTitle: { color: colors.ink, fontFamily: fonts.headingExtra, fontSize: 20, lineHeight: 26, marginTop: 16, textAlign: 'center' },
  rewardsNgoText: { color: colors.muted, fontFamily: fonts.body, fontSize: 12, lineHeight: 19, marginTop: 8, textAlign: 'center' },
    menuCard: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 20, borderWidth: 1, marginTop: 16, paddingHorizontal: 15 },
  profileRow: { alignItems: 'center', borderBottomColor: colors.border, borderBottomWidth: StyleSheet.hairlineWidth, flexDirection: 'row', minHeight: 66 },
  profileRowLast: { borderBottomWidth: 0 },
  profileRowIcon: { alignItems: 'center', backgroundColor: colors.blueSoft, borderRadius: 18, height: 36, justifyContent: 'center', width: 36 },
  profileRowLabel: { color: colors.ink, flex: 1, fontFamily: fonts.bodyMedium, fontSize: 14, marginLeft: 12 },
  aboutCard: { alignItems: 'flex-start', backgroundColor: colors.ink, borderRadius: 20, marginTop: 16, padding: 20 },
  aboutText: { color: '#C9D1DF', fontFamily: fonts.body, fontSize: 12, lineHeight: 18, marginTop: 16 },
});
