import { useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Image,
  PanResponder,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { PrimaryButton, ScreenHeader, StatusChip } from '../components';
import { colors, fonts, shadow } from '../theme';

const SWIPE_THRESHOLD = 92;
const SCREEN_WIDTH = Dimensions.get('window').width;

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

  if (initiative.status === 'passed') {
    return <PassedInitiativeDetail initiative={initiative} onBack={onBack} />;
  }

  return (
    <VotingInitiativeCard
      checking={checking}
      distance={distance}
      initiative={initiative}
      locationError={locationError}
      onBack={onBack}
      onCheckLocation={async () => {
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
          return meters;
        } catch {
          setLocationError(true);
          return null;
        } finally {
          setChecking(false);
        }
      }}
      onVote={onVote}
    />
  );
}

function VotingInitiativeCard({
  initiative,
  onBack,
  onVote,
  distance,
  checking,
  locationError,
  onCheckLocation,
}) {
  const position = useRef(new Animated.ValueXY()).current;
  const [expanded, setExpanded] = useState(false);
  const [gestureMessage, setGestureMessage] = useState<string | null>(null);

  const canVote = !initiative.hasVoted && distance !== null && distance <= 50;

  const resetCard = () => {
    Animated.spring(position, {
      toValue: { x: 0, y: 0 },
      useNativeDriver: true,
      friction: 6,
      tension: 65,
    }).start();
  };

  const dismissLeft = () => {
    Animated.timing(position, {
      toValue: { x: -SCREEN_WIDTH * 1.25, y: 0 },
      duration: 230,
      useNativeDriver: true,
    }).start(onBack);
  };

  const completeVote = () => {
    setGestureMessage(null);
    Animated.timing(position, {
      toValue: { x: SCREEN_WIDTH * 1.25, y: 0 },
      duration: 230,
      useNativeDriver: true,
    }).start(() => {
      onVote();
      onBack();
    });
  };

  const approve = async () => {
    if (initiative.hasVoted || checking) {
      resetCard();
      return;
    }

    if (canVote) {
      completeVote();
      return;
    }

    setGestureMessage('Sprawdzam, czy jesteś w zasięgu Głosu…');
    const meters = await onCheckLocation();

    if (meters !== null && meters <= 50) {
      completeVote();
      return;
    }

    setGestureMessage(
      meters === null
        ? 'Nie udało się sprawdzić GPS. Spróbuj ponownie.'
        : `Podejdź bliżej — Głos możesz oddać w promieniu 50 m. Teraz: ~${Math.round(meters)} m.`,
    );
    resetCard();
  };

  const panResponder = PanResponder.create({
      onMoveShouldSetPanResponder: (_, gesture) => {
        const horizontal = Math.abs(gesture.dx) > 12 && Math.abs(gesture.dx) > Math.abs(gesture.dy);
        const pullDown = !expanded && gesture.dy > 14 && Math.abs(gesture.dy) > Math.abs(gesture.dx);
        return horizontal || pullDown;
      },
      onPanResponderMove: (_, gesture) => {
        const horizontal = Math.abs(gesture.dx) >= Math.abs(gesture.dy);
        position.setValue({
          x: horizontal ? gesture.dx : 0,
          y: !expanded && !horizontal && gesture.dy > 0 ? Math.min(gesture.dy, 78) : 0,
        });
      },
      onPanResponderRelease: (_, gesture) => {
        if (gesture.dx > SWIPE_THRESHOLD && Math.abs(gesture.dx) > Math.abs(gesture.dy)) {
          void approve();
          return;
        }

        if (gesture.dx < -SWIPE_THRESHOLD && Math.abs(gesture.dx) > Math.abs(gesture.dy)) {
          dismissLeft();
          return;
        }

        if (!expanded && gesture.dy > 54 && Math.abs(gesture.dy) > Math.abs(gesture.dx)) {
          setExpanded(true);
          setGestureMessage(null);
        }

        resetCard();
      },
      onPanResponderTerminate: resetCard,
    });

  const rotate = position.x.interpolate({
    inputRange: [-SCREEN_WIDTH, 0, SCREEN_WIDTH],
    outputRange: ['-8deg', '0deg', '8deg'],
  });

  const approveOpacity = position.x.interpolate({
    inputRange: [0, SWIPE_THRESHOLD, SCREEN_WIDTH],
    outputRange: [0, 0.85, 1],
    extrapolate: 'clamp',
  });

  const rejectOpacity = position.x.interpolate({
    inputRange: [-SCREEN_WIDTH, -SWIPE_THRESHOLD, 0],
    outputRange: [1, 0.85, 0],
    extrapolate: 'clamp',
  });

  return (
    <View style={styles.screen}>
      <ScreenHeader kicker="Inicjatywa" onBack={onBack} title="Głosowanie" />

      <View style={styles.tinderStage}>
        <Animated.View
          {...panResponder.panHandlers}
          style={[
            styles.tinderCard,
            {
              transform: [
                { translateX: position.x },
                { translateY: position.y },
                { rotate },
              ],
            },
          ]}
        >
          <Animated.View pointerEvents="none" style={[styles.swipeBadge, styles.swipeBadgeReject, { opacity: rejectOpacity }]}>
            <Ionicons color={colors.error} name="close" size={26} />
            <Text style={[styles.swipeBadgeText, styles.swipeBadgeTextReject]}>POMIŃ</Text>
          </Animated.View>

          <Animated.View pointerEvents="none" style={[styles.swipeBadge, styles.swipeBadgeApprove, { opacity: approveOpacity }]}>
            <Ionicons color={colors.resolved} name="heart" size={24} />
            <Text style={[styles.swipeBadgeText, styles.swipeBadgeTextApprove]}>GŁOS</Text>
          </Animated.View>

          <ScrollView
            bounces={expanded}
            contentContainerStyle={styles.cardScroll}
            scrollEnabled={expanded}
            showsVerticalScrollIndicator={false}
          >
            <InitiativeHero initiative={initiative} />

            <View style={styles.cardBody}>
              <View style={styles.topMetaRow}>
                <StatusChip tone="blue" icon="megaphone-outline">Zbiera głosy</StatusChip>
                <View style={styles.distancePill}>
                  <Ionicons color={colors.signal} name="location-outline" size={14} />
                  <Text style={styles.distancePillText}>{initiative.distance || 'w pobliżu'}</Text>
                </View>
              </View>

              <Text style={styles.tinderTitle}>{initiative.brief.title}</Text>
              <Text style={styles.tinderPlace}>{initiative.brief.place}</Text>

              <View style={styles.voteSummary}>
                <View>
                  <Text style={styles.voteSummaryLabel}>GŁOSY</Text>
                  <Text style={styles.voteSummaryCount}>{initiative.votes}/{initiative.threshold}</Text>
                </View>
                <View style={styles.voteSummaryCopy}>
                  <Text numberOfLines={expanded ? undefined : 2} style={styles.problemPreview}>
                    {initiative.brief.problem}
                  </Text>
                </View>
              </View>

              <View style={styles.progress}>
                <View
                  style={[
                    styles.progressFill,
                    {
                      width: `${Math.min(100, initiative.votes / initiative.threshold * 100)}%`,
                      backgroundColor: colors.signal,
                    },
                  ]}
                />
              </View>

              {!expanded ? (
                <Pressable
                  onPress={() => setExpanded(true)}
                  style={({ pressed }) => [styles.pullMore, pressed && styles.pressed]}
                >
                  <View style={styles.pullHandle} />
                  <Ionicons color={colors.muted} name="chevron-down" size={17} />
                  <Text style={styles.pullMoreText}>Przeciągnij w dół, aby zobaczyć więcej</Text>
                </Pressable>
              ) : (
                <View style={styles.expandedContent}>
                  <View style={styles.expandedDivider} />
                  <BriefSection icon="hammer-outline" label="Proponowane działanie" text={initiative.brief.proposedAction} />
                  <BriefSection icon="heart-outline" label="Dlaczego to ważne" text={initiative.brief.whyImportant} />

                  <Text style={styles.sectionTitle}>Potrzebne zasoby</Text>
                  <View style={styles.resources}>
                    <Resource icon="people-outline" label="Ludzie" value={initiative.brief.resources.people} />
                    <Resource icon="construct-outline" label="Sprzęt" value={initiative.brief.resources.equipment} />
                    <Resource icon="car-outline" label="Transport" value={initiative.brief.resources.transport} />
                  </View>

                  <View style={styles.fixerCard}>
                    <View style={styles.fixerIcon}>
                      <Ionicons color={colors.violet} name="build-outline" size={21} />
                    </View>
                    <View style={styles.fixerCopy}>
                      <Text style={styles.fixerLabel}>KTO NAPRAWI</Text>
                      <Text style={styles.fixerValue}>{initiative.brief.fixer}</Text>
                      <Text style={styles.fixerMeta}>Sugestia AI potwierdzona przez Gracza</Text>
                    </View>
                  </View>

                  <View style={styles.locationCard}>
                    <Ionicons
                      color={distance !== null && distance <= 50 ? colors.resolved : colors.signal}
                      name="location"
                      size={21}
                    />
                    <View style={styles.locationCopy}>
                      <Text style={styles.locationTitle}>
                        {distance !== null && distance <= 50 ? 'Jesteś w zasięgu Głosu' : 'Głos tylko na miejscu'}
                      </Text>
                      <Text style={styles.locationBody}>
                        {locationError
                          ? 'Nie udało się pobrać GPS.'
                          : distance !== null
                            ? `Aktualnie: ~${Math.round(distance)} m. Głos wymaga maks. około 50 m.`
                            : 'Swipe w prawo sprawdzi GPS przed oddaniem Głosu.'}
                      </Text>
                    </View>
                  </View>

                  <Pressable
                    onPress={() => setExpanded(false)}
                    style={({ pressed }) => [styles.collapseButton, pressed && styles.pressed]}
                  >
                    <Ionicons color={colors.signal} name="chevron-up" size={16} />
                    <Text style={styles.collapseButtonText}>Zwiń szczegóły</Text>
                  </Pressable>
                </View>
              )}
            </View>
          </ScrollView>
        </Animated.View>
      </View>

      <View style={styles.tinderFooter}>
        {gestureMessage ? (
          <View style={styles.gestureMessage}>
            <Ionicons color={colors.signal} name="information-circle-outline" size={17} />
            <Text style={styles.gestureMessageText}>{gestureMessage}</Text>
          </View>
        ) : (
          <Text style={styles.swipeHint}>W lewo pomijasz · w prawo oddajesz Głos</Text>
        )}

        <View style={styles.actionRow}>
          <Pressable
            accessibilityLabel="Pomiń inicjatywę"
            accessibilityRole="button"
            onPress={dismissLeft}
            style={({ pressed }) => [styles.actionBubble, styles.rejectBubble, pressed && styles.actionBubblePressed]}
          >
            <Ionicons color={colors.error} name="close" size={34} />
          </Pressable>

          <Pressable
            accessibilityLabel="Oddaj Głos"
            accessibilityRole="button"
            disabled={checking || initiative.hasVoted}
            onPress={() => void approve()}
            style={({ pressed }) => [
              styles.actionBubble,
              styles.approveBubble,
              (checking || initiative.hasVoted) && styles.actionBubbleDisabled,
              pressed && styles.actionBubblePressed,
            ]}
          >
            {checking ? (
              <Text style={styles.checkingText}>GPS</Text>
            ) : (
              <Ionicons color={colors.resolved} name={initiative.hasVoted ? 'checkmark' : 'heart'} size={31} />
            )}
          </Pressable>
        </View>
      </View>
    </View>
  );
}

function InitiativeHero({ initiative }) {
  if (initiative.brief.photoUri) {
    return (
      <View style={styles.tinderHero}>
        <Image source={{ uri: initiative.brief.photoUri }} style={styles.tinderPhoto} />
        <View style={styles.heroShade} />
        <View style={styles.heroCategory}>
          <Ionicons color={colors.surface} name="sparkles-outline" size={14} />
          <Text style={styles.heroCategoryText}>{initiative.brief.category}</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.tinderHero, styles.tinderHeroFallback, { backgroundColor: colors.blueSoft }]}>
      <View style={[styles.voteOrb, { backgroundColor: initiative.color }]}>
        <Text style={styles.voteOrbText}>{initiative.votes}</Text>
      </View>
      <Text style={styles.heroHint}>{initiative.brief.category.toUpperCase()}</Text>
    </View>
  );
}

function PassedInitiativeDetail({ initiative, onBack }) {
  return (
    <View style={styles.screen}>
      <ScreenHeader kicker="Inicjatywa" onBack={onBack} title="Szczegóły" />
      <ScrollView contentContainerStyle={styles.content}>
        {initiative.brief.photoUri ? (
          <Image source={{ uri: initiative.brief.photoUri }} style={styles.photo} />
        ) : (
          <View style={[styles.hero, { backgroundColor: colors.mintSoft }]}>
            <View style={[styles.voteOrb, { backgroundColor: colors.resolved }]}>
              <Text style={styles.voteOrbText}>✓</Text>
            </View>
            <Text style={styles.heroHint}>PRÓG OSIĄGNIĘTY</Text>
          </View>
        )}

        <StatusChip tone="green" icon="checkmark-circle">Przeszła</StatusChip>
        <Text style={styles.title}>{initiative.brief.title}</Text>
        <Text style={styles.place}>{initiative.brief.place}</Text>

        <View style={styles.progressHeader}>
          <Text style={styles.progressTitle}>Głosy</Text>
          <Text style={styles.progressCount}>{initiative.votes}/{initiative.threshold}</Text>
        </View>
        <View style={styles.progress}>
          <View style={[styles.progressFill, { width: '100%', backgroundColor: colors.resolved }]} />
        </View>

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
          <View style={styles.fixerIcon}>
            <Ionicons color={colors.violet} name="build-outline" size={22} />
          </View>
          <View style={styles.fixerCopy}>
            <Text style={styles.fixerLabel}>KTO NAPRAWI</Text>
            <Text style={styles.fixerValue}>{initiative.brief.fixer}</Text>
            <Text style={styles.fixerMeta}>Sugestia AI potwierdzona przez Gracza</Text>
          </View>
        </View>

        <PrimaryButton disabled icon="checkmark" onPress={() => {}} tone="green" style={styles.cta}>
          Inicjatywa przeszła
        </PrimaryButton>
      </ScrollView>
    </View>
  );
}

function BriefSection({ icon, label, text }) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHead}>
        <Ionicons color={colors.signal} name={icon} size={19} />
        <Text style={styles.sectionTitleInline}>{label}</Text>
      </View>
      <Text style={styles.body}>{text}</Text>
    </View>
  );
}

function Resource({ icon, label, value }) {
  return (
    <View style={styles.resource}>
      <Ionicons color={colors.signal} name={icon} size={20} />
      <View style={{ flex: 1 }}>
        <Text style={styles.resourceLabel}>{label}</Text>
        <Text style={styles.resourceValue}>{value}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: colors.background, flex: 1 },
  content: { padding: 16, paddingBottom: 40 },

  tinderStage: { flex: 1, paddingHorizontal: 14, paddingTop: 12 },
  tinderCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 28,
    borderWidth: 1,
    flex: 1,
    overflow: 'hidden',
    ...shadow,
  },
  cardScroll: { flexGrow: 1 },
  tinderHero: { height: 238, overflow: 'hidden', position: 'relative' },
  tinderPhoto: { height: '100%', width: '100%' },
  heroShade: {
    backgroundColor: 'rgba(16,24,40,.14)',
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  heroCategory: {
    alignItems: 'center',
    backgroundColor: 'rgba(16,24,40,.76)',
    borderRadius: 999,
    flexDirection: 'row',
    gap: 6,
    left: 14,
    paddingHorizontal: 11,
    paddingVertical: 7,
    position: 'absolute',
    top: 14,
  },
  heroCategoryText: { color: colors.surface, fontFamily: fonts.bodyBold, fontSize: 10, letterSpacing: 0.5 },
  tinderHeroFallback: { alignItems: 'center', justifyContent: 'center' },

  swipeBadge: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,.94)',
    borderRadius: 16,
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 13,
    paddingVertical: 9,
    position: 'absolute',
    top: 22,
    zIndex: 20,
  },
  swipeBadgeReject: { left: 18, transform: [{ rotate: '-7deg' }] },
  swipeBadgeApprove: { right: 18, transform: [{ rotate: '7deg' }] },
  swipeBadgeText: { fontFamily: fonts.heading, fontSize: 14, letterSpacing: 0.8 },
  swipeBadgeTextReject: { color: colors.error },
  swipeBadgeTextApprove: { color: colors.resolved },

  cardBody: { padding: 18, paddingBottom: 16 },
  topMetaRow: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  distancePill: {
    alignItems: 'center',
    backgroundColor: colors.blueSoft,
    borderRadius: 999,
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 6,
  },
  distancePillText: { color: colors.signal, fontFamily: fonts.bodyBold, fontSize: 10 },
  tinderTitle: { color: colors.ink, fontFamily: fonts.headingExtra, fontSize: 25, lineHeight: 31, marginTop: 12 },
  tinderPlace: { color: colors.muted, fontFamily: fonts.body, fontSize: 12, lineHeight: 17, marginTop: 5 },

  voteSummary: { alignItems: 'flex-start', flexDirection: 'row', gap: 16, marginTop: 17 },
  voteSummaryLabel: { color: colors.muted, fontFamily: fonts.bodyBold, fontSize: 9, letterSpacing: 0.8 },
  voteSummaryCount: { color: colors.signal, fontFamily: fonts.headingExtra, fontSize: 24, marginTop: 1 },
  voteSummaryCopy: { flex: 1 },
  problemPreview: { color: colors.ink, fontFamily: fonts.bodyMedium, fontSize: 13, lineHeight: 19 },

  progress: { backgroundColor: colors.border, borderRadius: 99, height: 8, marginTop: 13, overflow: 'hidden' },
  progressFill: { borderRadius: 99, height: '100%' },

  pullMore: { alignItems: 'center', marginTop: 14, paddingBottom: 2, paddingTop: 5 },
  pullHandle: { backgroundColor: colors.border, borderRadius: 99, height: 4, marginBottom: 5, width: 42 },
  pullMoreText: { color: colors.muted, fontFamily: fonts.bodyMedium, fontSize: 10, marginTop: 2 },
  expandedContent: { paddingTop: 3 },
  expandedDivider: { backgroundColor: colors.border, height: StyleSheet.hairlineWidth, marginBottom: 2, marginTop: 13 },

  actionRow: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 48 },
  actionBubble: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 34,
    borderWidth: 1,
    height: 68,
    justifyContent: 'center',
    width: 68,
    ...shadow,
  },
  rejectBubble: { borderColor: '#F6C7CD' },
  approveBubble: { borderColor: '#BDE8D7' },
  actionBubblePressed: { opacity: 0.78, transform: [{ scale: 0.95 }] },
  actionBubbleDisabled: { opacity: 0.45 },
  checkingText: { color: colors.signal, fontFamily: fonts.bodyBold, fontSize: 11 },

  tinderFooter: { paddingBottom: 14, paddingHorizontal: 16, paddingTop: 9 },
  swipeHint: { color: colors.muted, fontFamily: fonts.bodyMedium, fontSize: 10, marginBottom: 8, textAlign: 'center' },
  gestureMessage: {
    alignItems: 'center',
    backgroundColor: colors.blueSoft,
    borderRadius: 14,
    flexDirection: 'row',
    gap: 7,
    marginBottom: 8,
    minHeight: 34,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  gestureMessageText: { color: colors.deep, flex: 1, fontFamily: fonts.bodyMedium, fontSize: 10, lineHeight: 14 },

  pressed: { opacity: 0.78 },
  collapseButton: { alignItems: 'center', flexDirection: 'row', gap: 6, justifyContent: 'center', paddingVertical: 14 },
  collapseButtonText: { color: colors.signal, fontFamily: fonts.bodyBold, fontSize: 11 },

  photo: { borderRadius: 24, height: 230, marginBottom: 18, width: '100%' },
  hero: { alignItems: 'center', borderRadius: 24, height: 220, justifyContent: 'center', marginBottom: 18 },
  voteOrb: {
    alignItems: 'center',
    borderColor: colors.surface,
    borderRadius: 43,
    borderWidth: 7,
    height: 86,
    justifyContent: 'center',
    width: 86,
  },
  voteOrbText: { color: colors.surface, fontFamily: fonts.headingExtra, fontSize: 29 },
  heroHint: { color: colors.ink, fontFamily: fonts.bodyBold, fontSize: 11, letterSpacing: 1, marginTop: 14 },

  title: { color: colors.ink, fontFamily: fonts.headingExtra, fontSize: 27, lineHeight: 34, marginTop: 14 },
  place: { color: colors.muted, fontFamily: fonts.body, fontSize: 13, lineHeight: 19, marginTop: 7 },
  progressHeader: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginTop: 22 },
  progressTitle: { color: colors.ink, fontFamily: fonts.bodyBold, fontSize: 13 },
  progressCount: { color: colors.signal, fontFamily: fonts.heading, fontSize: 18 },

  section: {
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderRadius: 19,
    borderWidth: 1,
    marginTop: 13,
    padding: 15,
  },
  sectionHead: { alignItems: 'center', flexDirection: 'row', gap: 8 },
  sectionTitleInline: { color: colors.ink, fontFamily: fonts.bodyBold, fontSize: 13 },
  body: { color: colors.muted, fontFamily: fonts.body, fontSize: 13, lineHeight: 20, marginTop: 8 },
  sectionTitle: { color: colors.ink, fontFamily: fonts.heading, fontSize: 17, marginTop: 19 },

  resources: { gap: 8, marginTop: 9 },
  resource: {
    alignItems: 'flex-start',
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 11,
    padding: 13,
  },
  resourceLabel: { color: colors.ink, fontFamily: fonts.bodyBold, fontSize: 12 },
  resourceValue: { color: colors.muted, fontFamily: fonts.body, fontSize: 12, lineHeight: 18, marginTop: 2 },

  fixerCard: {
    alignItems: 'center',
    backgroundColor: colors.violetSoft,
    borderRadius: 20,
    flexDirection: 'row',
    gap: 13,
    marginTop: 15,
    padding: 15,
  },
  fixerIcon: { alignItems: 'center', backgroundColor: colors.surface, borderRadius: 22, height: 44, justifyContent: 'center', width: 44 },
  fixerCopy: { flex: 1 },
  fixerLabel: { color: colors.violet, fontFamily: fonts.bodyBold, fontSize: 9, letterSpacing: 1 },
  fixerValue: { color: colors.ink, fontFamily: fonts.heading, fontSize: 17, marginTop: 3 },
  fixerMeta: { color: colors.muted, fontFamily: fonts.body, fontSize: 10, marginTop: 2 },

  locationCard: {
    alignItems: 'flex-start',
    backgroundColor: colors.blueSoft,
    borderRadius: 18,
    flexDirection: 'row',
    gap: 11,
    marginTop: 14,
    padding: 14,
  },
  locationCopy: { flex: 1 },
  locationTitle: { color: colors.ink, fontFamily: fonts.bodyBold, fontSize: 13 },
  locationBody: { color: colors.muted, fontFamily: fonts.body, fontSize: 11, lineHeight: 17, marginTop: 3 },

  cta: { marginTop: 18 },
});
