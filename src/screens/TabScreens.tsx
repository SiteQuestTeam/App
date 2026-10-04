import { useMemo, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BottomNav, InitiativeRow, PrimaryButton, StatusChip } from '../components';
import { rewards } from '../data';
import { colors, fonts } from '../theme';

export function SignInScreen({ nickname, onContinue }) {
  const [value, setValue] = useState(nickname === 'Gracz Demo' ? '' : nickname);
  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 12 : 0}
      style={styles.signInKeyboard}
    >
      <ScrollView
        contentContainerStyle={styles.signInScreen}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.signInContent}>
          <View style={styles.signInMark}><Ionicons color={colors.surface} name="location" size={30} /></View>
          <Text style={styles.signInBrand}>SiteQuest</Text>
          <Text style={styles.signInTitle}>Jak mamy Cię nazywać?</Text>
          <Text style={styles.signInText}>MVP używa wyłącznie pseudonimu — bez hasła, maila i dodatkowych danych.</Text>
          <TextInput
            autoCapitalize="words"
            maxLength={24}
            onChangeText={setValue}
            placeholder="Twój pseudonim"
            placeholderTextColor={colors.muted}
            returnKeyType="done"
            style={styles.signInInput}
            value={value}
            onSubmitEditing={() => {
              if (value.trim()) onContinue(value.trim());
            }}
          />
          <PrimaryButton disabled={!value.trim()} icon="arrow-forward" onPress={() => onContinue(value.trim())} style={styles.signInButton}>Zaczynam</PrimaryButton>
          <Text style={styles.signInFoot}>W pełnej wersji logowanie może zostać rozszerzone o mObywatel; nie jest to część MVP.</Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Shell({ active, onNavigate, children }) {
  return <View style={styles.screen}><View style={styles.body}>{children}</View><BottomNav active={active} onSelect={onNavigate} /></View>;
}

const INITIATIVES_LIST_RADIUS_METERS = 500;

function distanceMeters(
  from: { latitude: number; longitude: number },
  to: { latitude: number; longitude: number },
) {
  const earthRadius = 6371000;
  const toRadians = (value: number) => value * Math.PI / 180;
  const lat1 = toRadians(from.latitude);
  const lat2 = toRadians(to.latitude);
  const dLat = toRadians(to.latitude - from.latitude);
  const dLng = toRadians(to.longitude - from.longitude);
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return earthRadius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function InitiativesScreen({
  initiatives,
  onNavigate,
  onOpenInitiative,
  playerLocation,
  locationIssue,
}) {
  const nearbyInitiatives = useMemo(() => {
    if (!playerLocation?.coords) return [];

    const playerCoords = {
      latitude: playerLocation.coords.latitude,
      longitude: playerLocation.coords.longitude,
    };

    return initiatives
      .map((initiative) => {
        const distance = distanceMeters(
          playerCoords,
          { latitude: initiative.latitude, longitude: initiative.longitude },
        );
        return {
          ...initiative,
          distance: `~${Math.round(distance)} m`,
          actualDistanceMeters: distance,
        };
      })
      .filter((initiative) => initiative.actualDistanceMeters <= INITIATIVES_LIST_RADIUS_METERS)
      .sort((a, b) => a.actualDistanceMeters - b.actualDistanceMeters);
  }, [initiatives, playerLocation]);

  return (
    <Shell active="initiatives" onNavigate={onNavigate}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.eyebrow}>DO 500 M</Text>
        <Text style={styles.title}>Inicjatywy</Text>
        <Text style={styles.subtitle}>Przeglądaj Inicjatywy w promieniu 500 m. Głos można oddać wyłącznie będąc maksymalnie 50 m od miejsca.</Text>
        <View style={styles.stats}>
          <MiniStat label="Zbiera głosy" value={nearbyInitiatives.filter((i) => i.status === 'collecting').length} />
          <MiniStat label="Przeszły" value={nearbyInitiatives.filter((i) => i.status === 'passed').length} />
        </View>

        {locationIssue ? (
          <View style={styles.rangeInfo}>
            <Ionicons color={colors.warning} name="location-outline" size={19} />
            <Text style={styles.rangeInfoText}>{locationIssue}</Text>
          </View>
        ) : nearbyInitiatives.length === 0 && playerLocation?.coords ? (
          <View style={styles.rangeInfo}>
            <Ionicons color={colors.signal} name="navigate-outline" size={19} />
            <Text style={styles.rangeInfoText}>Brak Inicjatyw w promieniu 500 m.</Text>
          </View>
        ) : !playerLocation?.coords ? (
          <View style={styles.rangeInfo}>
            <Ionicons color={colors.signal} name="locate-outline" size={19} />
            <Text style={styles.rangeInfoText}>Ustalam bieżącą pozycję…</Text>
          </View>
        ) : (
          <View style={styles.list}>
            {nearbyInitiatives.map((item) => (
              <InitiativeRow
                item={item}
                key={item.id}
                onPress={() => onOpenInitiative(item)}
              />
            ))}
          </View>
        )}
      </ScrollView>
    </Shell>
  );
}

export function RewardsScreen({ onNavigate, player, onRedeem }) {
  const [redeemed, setRedeemed] = useState<string[]>([]);
  const redeem = (reward) => {
    if (player.pointsBalance < reward.points || redeemed.includes(reward.id)) return;
    onRedeem(reward.points);
    setRedeemed((r) => [...r, reward.id]);
    Alert.alert('Nagroda odebrana', `${reward.title} — mock MVP.`);
  };

  return (
    <Shell active="rewards" onNavigate={onNavigate}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.eyebrow}>PORTFEL</Text>
        <Text style={styles.title}>Nagrody</Text>
        <View style={styles.wallet}>
          <View><Text style={styles.walletLabel}>DOSTĘPNE PUNKTY</Text><Text style={styles.walletPoints}>{player.pointsBalance}</Text></View>
          <View style={styles.walletIcon}><Ionicons color={colors.surface} name="gift" size={28} /></View>
          <Text style={styles.walletText}>Wydawanie Punktów nie obniża Rangi. Ranga liczy wszystkie Punkty zdobyte kiedykolwiek.</Text>
        </View>
        <View style={styles.list}>
          {rewards.map((reward) => {
            const available = player.pointsBalance >= reward.points && !redeemed.includes(reward.id);
            return (
              <View key={reward.id} style={styles.rewardCard}>
                <View style={styles.rewardTop}><View style={styles.rewardIcon}><Ionicons color={colors.signal} name={reward.icon} size={23} /></View><StatusChip tone={available ? 'green' : 'grey'}>{reward.points} pkt</StatusChip></View>
                <Text style={styles.rewardTitle}>{reward.title}</Text><Text style={styles.rewardDesc}>{reward.description}</Text>
                <Text style={styles.sponsor}>Sponsor: {reward.sponsor}</Text>
                <PrimaryButton disabled={!available} onPress={() => redeem(reward)} style={styles.rewardButton}>{redeemed.includes(reward.id) ? 'Odebrano' : available ? 'Odbierz' : 'Za mało Punktów'}</PrimaryButton>
              </View>
            );
          })}
        </View>
        <Text style={styles.demo}>Nagrody i Sponsorzy są lokalnymi danymi demonstracyjnymi.</Text>
      </ScrollView>
    </Shell>
  );
}

export function ProfileScreen({ onNavigate, player }) {
  const progress = Math.min(1, player.totalPointsEarned / 2000);
  return (
    <Shell active="profile" onNavigate={onNavigate}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.eyebrow}>GRACZ</Text>
        <Text style={styles.title}>Profil</Text>
        <View style={styles.profileCard}>
          <View style={styles.avatar}><Text style={styles.avatarText}>{player.nickname[0]}</Text></View>
          <Text style={styles.profileName}>{player.nickname}</Text>
          <StatusChip tone="violet" icon="shield-checkmark-outline">{player.rank}</StatusChip>
          <View style={styles.profileNumbers}>
            <MiniStat label="Saldo" value={player.pointsBalance} />
            <MiniStat label="Zdobyte łącznie" value={player.totalPointsEarned} />
          </View>
        </View>
        <View style={styles.rankCard}>
          <View style={styles.rankHeader}><Text style={styles.rankTitle}>Postęp Rangi</Text><Text style={styles.rankValue}>{player.totalPointsEarned} / 2000</Text></View>
          <View style={styles.rankTrack}><View style={[styles.rankFill, { width: `${Math.round(progress * 100)}%` }]} /></View>
          <Text style={styles.rankBody}>Mock: kolejny próg Rangi przy 2000 Punktów zdobytych łącznie.</Text>
        </View>
        <View style={styles.infoCard}><Ionicons color={colors.signal} name="information-circle-outline" size={22} /><Text style={styles.infoText}>MVP nie używa XP, kredytów ani osobnego konta NGO. Gracz ma Punkty, Rangę i Nagrody.</Text></View>
      </ScrollView>
    </Shell>
  );
}

function MiniStat({ label, value }) {
  return <View style={styles.stat}><Text style={styles.statValue}>{value}</Text><Text style={styles.statLabel}>{label}</Text></View>;
}

const styles = StyleSheet.create({
  signInKeyboard: { backgroundColor: colors.background, flex: 1 },
  signInScreen: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 26, paddingVertical: 28 },
  signInContent: { alignSelf: 'center', maxWidth: 520, width: '100%' },
  signInMark: { alignItems: 'center', backgroundColor: colors.signal, borderRadius: 29, height: 58, justifyContent: 'center', width: 58 },
  signInBrand: { color: colors.signal, fontFamily: fonts.headingExtra, fontSize: 18, marginTop: 14 },
  signInTitle: { color: colors.ink, fontFamily: fonts.headingExtra, fontSize: 30, lineHeight: 36, marginTop: 24 },
  signInText: { color: colors.muted, fontFamily: fonts.body, fontSize: 14, lineHeight: 21, marginTop: 8 },
  signInInput: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 17, borderWidth: 1, color: colors.ink, fontFamily: fonts.body, fontSize: 16, marginTop: 24, minHeight: 56, paddingHorizontal: 16 },
  signInButton: { marginTop: 12 },
  signInFoot: { color: colors.muted, fontFamily: fonts.body, fontSize: 10, lineHeight: 15, marginTop: 14, textAlign: 'center' },
  screen: { backgroundColor: colors.background, flex: 1 }, body: { flex: 1 }, content: { padding: 18, paddingBottom: 32 },
  eyebrow: { color: colors.signal, fontFamily: fonts.bodyBold, fontSize: 10, letterSpacing: 1.1, marginTop: 8 }, title: { color: colors.ink, fontFamily: fonts.headingExtra, fontSize: 30, marginTop: 4 }, subtitle: { color: colors.muted, fontFamily: fonts.body, fontSize: 13, lineHeight: 20, marginTop: 7 },
  stats: { flexDirection: 'row', gap: 10, marginTop: 18 }, stat: { alignItems: 'center', backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 17, borderWidth: 1, flex: 1, padding: 14 }, statValue: { color: colors.ink, fontFamily: fonts.headingExtra, fontSize: 22 }, statLabel: { color: colors.muted, fontFamily: fonts.body, fontSize: 10, marginTop: 3, textAlign: 'center' },
  list: { gap: 12, marginTop: 18 },
  rangeInfo: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 9,
    marginTop: 18,
    padding: 14,
  },
  rangeInfoText: { color: colors.muted, flex: 1, fontFamily: fonts.bodyMedium, fontSize: 11, lineHeight: 17 },
  wallet: { backgroundColor: colors.ink, borderRadius: 24, marginTop: 18, padding: 20, position: 'relative' }, walletLabel: { color: '#A997FF', fontFamily: fonts.bodyBold, fontSize: 10, letterSpacing: 1 }, walletPoints: { color: colors.surface, fontFamily: fonts.headingExtra, fontSize: 42, marginTop: 4 }, walletIcon: { alignItems: 'center', backgroundColor: colors.violet, borderRadius: 27, height: 54, justifyContent: 'center', position: 'absolute', right: 20, top: 20, width: 54 }, walletText: { color: '#C9D1DF', fontFamily: fonts.body, fontSize: 11, lineHeight: 17, marginTop: 12, paddingRight: 12 },
  rewardCard: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 20, borderWidth: 1, padding: 16 }, rewardTop: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' }, rewardIcon: { alignItems: 'center', backgroundColor: colors.blueSoft, borderRadius: 20, height: 44, justifyContent: 'center', width: 44 }, rewardTitle: { color: colors.ink, fontFamily: fonts.heading, fontSize: 17, marginTop: 12 }, rewardDesc: { color: colors.muted, fontFamily: fonts.body, fontSize: 12, lineHeight: 18, marginTop: 4 }, sponsor: { color: colors.violet, fontFamily: fonts.bodyBold, fontSize: 10, marginTop: 10 }, rewardButton: { marginTop: 13, minHeight: 46 }, demo: { color: colors.muted, fontFamily: fonts.body, fontSize: 10, marginTop: 16, textAlign: 'center' },
  profileCard: { alignItems: 'center', backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 24, borderWidth: 1, marginTop: 18, padding: 24 }, avatar: { alignItems: 'center', backgroundColor: colors.violet, borderRadius: 38, height: 76, justifyContent: 'center', width: 76 }, avatarText: { color: colors.surface, fontFamily: fonts.headingExtra, fontSize: 29 }, profileName: { color: colors.ink, fontFamily: fonts.headingExtra, fontSize: 22, marginBottom: 10, marginTop: 13 }, profileNumbers: { flexDirection: 'row', gap: 10, marginTop: 18, width: '100%' },
  rankCard: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 20, borderWidth: 1, marginTop: 14, padding: 17 }, rankHeader: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' }, rankTitle: { color: colors.ink, fontFamily: fonts.bodyBold, fontSize: 13 }, rankValue: { color: colors.violet, fontFamily: fonts.bodyBold, fontSize: 11 }, rankTrack: { backgroundColor: colors.greySoft, borderRadius: 99, height: 8, marginTop: 11, overflow: 'hidden' }, rankFill: { backgroundColor: colors.violet, borderRadius: 99, height: '100%' }, rankBody: { color: colors.muted, fontFamily: fonts.body, fontSize: 11, lineHeight: 17, marginTop: 9 },
  infoCard: { alignItems: 'flex-start', backgroundColor: colors.blueSoft, borderRadius: 18, flexDirection: 'row', gap: 10, marginTop: 14, padding: 15 }, infoText: { color: colors.deep, flex: 1, fontFamily: fonts.bodyMedium, fontSize: 11, lineHeight: 17 },
});
