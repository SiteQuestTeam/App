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
        <View style={styles.filterRow}><StatusChip tone="blue">Wszystkie</StatusChip><StatusChip tone="violet">Rajdy</StatusChip><StatusChip tone="grey">Szare miejsca</StatusChip></View>
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

export function ProfileScreen({ onNavigate, onCamera, role, accountId, onAccountChange }) {
  return (
    <TabShell active="profile" kicker="Wersja demonstracyjna" onNavigate={onNavigate} role={role} title="Profil">
      <ScrollView contentContainerStyle={styles.content}>
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
  menuCard: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 20, borderWidth: 1, marginTop: 16, paddingHorizontal: 15 },
  profileRow: { alignItems: 'center', borderBottomColor: colors.border, borderBottomWidth: StyleSheet.hairlineWidth, flexDirection: 'row', minHeight: 66 },
  profileRowLast: { borderBottomWidth: 0 },
  profileRowIcon: { alignItems: 'center', backgroundColor: colors.blueSoft, borderRadius: 18, height: 36, justifyContent: 'center', width: 36 },
  profileRowLabel: { color: colors.ink, flex: 1, fontFamily: fonts.bodyMedium, fontSize: 14, marginLeft: 12 },
  aboutCard: { alignItems: 'flex-start', backgroundColor: colors.ink, borderRadius: 20, marginTop: 16, padding: 20 },
  aboutText: { color: '#C9D1DF', fontFamily: fonts.body, fontSize: 12, lineHeight: 18, marginTop: 16 },
});
