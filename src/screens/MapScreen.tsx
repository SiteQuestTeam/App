import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { WebView } from 'react-native-webview';
import { BottomNav, StatusChip } from '../components';
import { createMapHtml } from '../mapHtml';
import { colors, fonts, shadow } from '../theme';

type CreateAction = 'incident' | 'initiative';

const HOLD_FILL_MS = 620;
const INITIATIVE_OPEN_RADIUS_METERS = 50;

const distanceMeters = (
  from: { latitude: number; longitude: number },
  to: { latitude: number; longitude: number },
) => {
  const earthRadius = 6371000;
  const toRadians = (value: number) => value * Math.PI / 180;
  const lat1 = toRadians(from.latitude);
  const lat2 = toRadians(to.latitude);
  const dLat = toRadians(to.latitude - from.latitude);
  const dLng = toRadians(to.longitude - from.longitude);
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return earthRadius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

export function MapScreen({ initiatives, onNavigate, onOpenInitiative, onCreate, onCreateIncident, player }) {
  const webView = useRef<any>(null);
  const latestLocation = useRef<any>(null);
  const createMenuProgress = useRef(new Animated.Value(0)).current;
  const incidentHold = useRef(new Animated.Value(0)).current;
  const initiativeHold = useRef(new Animated.Value(0)).current;
  const activeHold = useRef<CreateAction | null>(null);
  const holdCompleted = useRef(false);
  const holdAnimation = useRef<Animated.CompositeAnimation | null>(null);

  const [selectedId, setSelectedId] = useState(initiatives[0]?.id);
  const [mapError, setMapError] = useState(false);
  const [locationIssue, setLocationIssue] = useState<string | null>(null);
  const [anchored, setAnchored] = useState(false);
  const [filter, setFilter] = useState<'all' | 'collecting' | 'passed'>('all');
  const [createMenuOpen, setCreateMenuOpen] = useState(false);
  const [heldAction, setHeldAction] = useState<CreateAction | null>(null);
  const [proximityNotice, setProximityNotice] = useState<string | null>(null);

  const filtered = initiatives.filter((item) => filter === 'all' || item.status === filter);
  const htmlKey = filtered.map((item) => item.id + ':' + item.votes + ':' + item.status).join('|');
  const html = useMemo(() => createMapHtml(filtered), [htmlKey]);
  const selected = initiatives.find((item) => item.id === selectedId) || initiatives[0];

  useEffect(() => {
    Animated.spring(createMenuProgress, {
      toValue: createMenuOpen ? 1 : 0,
      useNativeDriver: true,
      damping: 18,
      stiffness: 250,
      mass: 0.82,
    }).start();

    if (!createMenuOpen) {
      activeHold.current = null;
      setHeldAction(null);
      incidentHold.setValue(0);
      initiativeHold.setValue(0);
    }
  }, [createMenuOpen, createMenuProgress, incidentHold, initiativeHold]);

  useEffect(() => {
    let active = true;
    let subscription: any = null;

    const start = async () => {
      try {
        const enabled = await Location.hasServicesEnabledAsync();
        if (!enabled) {
          setLocationIssue('Wyłączony GPS');
          return;
        }

        const permission = await Location.requestForegroundPermissionsAsync();
        if (!permission.granted) {
          setLocationIssue('Brak dostępu do GPS');
          return;
        }

        const first = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        if (!active) return;

        latestLocation.current = first;
        setLocationIssue(null);
        webView.current?.injectJavaScript(
          'window.movePlayer && window.movePlayer(' + first.coords.longitude + ',' + first.coords.latitude + ',true);true;',
        );

        subscription = await Location.watchPositionAsync(
          { accuracy: Location.Accuracy.High, distanceInterval: 2, timeInterval: 1500 },
          (next) => {
            if (!active) return;
            latestLocation.current = next;
            webView.current?.injectJavaScript(
              'window.movePlayer && window.movePlayer(' + next.coords.longitude + ',' + next.coords.latitude + ',false);true;',
            );
          },
        );
      } catch {
        if (active) setLocationIssue('Brak sygnału GPS');
      }
    };

    start();
    return () => {
      active = false;
      subscription?.remove();
    };
  }, []);

  const handleMessage = (event) => {
    try {
      const message = JSON.parse(event.nativeEvent.data);

      if (message.type === 'initiative') {
        const initiative = initiatives.find((item) => item.id === message.id);
        if (!initiative) return;

        setSelectedId(initiative.id);

        const location = latestLocation.current;
        if (!location?.coords) {
          setProximityNotice('Włącz GPS, aby otworzyć tę Inicjatywę z mapy.');
          return;
        }

        const distance = distanceMeters(
          {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
          },
          {
            latitude: initiative.latitude,
            longitude: initiative.longitude,
          },
        );

        if (distance <= INITIATIVE_OPEN_RADIUS_METERS) {
          setProximityNotice(null);
          onOpenInitiative(initiative);
        } else {
          setProximityNotice(`Podejdź bliżej — Inicjatywę otworzysz w promieniu 50 m. Teraz: ~${Math.round(distance)} m.`);
        }
      }

      if (message.type === 'anchor') setAnchored(Boolean(message.active));
    } catch {}
  };

  const resetHold = (action: CreateAction) => {
    const value = action === 'incident' ? incidentHold : initiativeHold;
    Animated.timing(value, {
      toValue: 0,
      duration: 150,
      easing: Easing.out(Easing.quad),
      useNativeDriver: false,
    }).start();
  };

  const beginHold = (action: CreateAction) => {
    holdAnimation.current?.stop();
    activeHold.current = action;
    holdCompleted.current = false;
    setHeldAction(action);

    const activeValue = action === 'incident' ? incidentHold : initiativeHold;
    const inactiveValue = action === 'incident' ? initiativeHold : incidentHold;
    inactiveValue.setValue(0);
    activeValue.setValue(0);

    holdAnimation.current = Animated.timing(activeValue, {
      toValue: 1,
      duration: HOLD_FILL_MS,
      easing: Easing.inOut(Easing.cubic),
      useNativeDriver: false,
    });
    holdAnimation.current.start(({ finished }) => {
      if (finished && activeHold.current === action) {
        holdCompleted.current = true;
      }
    });
  };

  const finishHold = (action: CreateAction) => {
    if (activeHold.current !== action) return;

    holdAnimation.current?.stop();
    const canOpen = holdCompleted.current;
    activeHold.current = null;
    holdCompleted.current = false;
    setHeldAction(null);

    if (!canOpen) {
      resetHold(action);
      return;
    }

    setCreateMenuOpen(false);
    if (action === 'incident') onCreateIncident?.();
    else onCreate();
  };

  const cancelHold = (action: CreateAction) => {
    if (activeHold.current !== action) return;
    holdAnimation.current?.stop();
    activeHold.current = null;
    holdCompleted.current = false;
    setHeldAction(null);
    resetHold(action);
  };

  const incidentFillWidth = incidentHold.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });
  const initiativeFillWidth = initiativeHold.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <View style={styles.screen}>
      <View style={styles.mapArea}>
        {mapError ? (
          <View style={styles.fallback}>
            <Ionicons color={colors.signal} name="map" size={42} />
            <Text style={styles.fallbackTitle}>Mapa jest chwilowo niedostępna</Text>
          </View>
        ) : (
          <WebView
            ref={webView}
            javaScriptEnabled
            onError={() => setMapError(true)}
            onHttpError={() => setMapError(true)}
            onMessage={handleMessage}
            onLoadEnd={() => {
              const loc = latestLocation.current;
              if (loc) {
                webView.current?.injectJavaScript(
                  'window.movePlayer && window.movePlayer(' + loc.coords.longitude + ',' + loc.coords.latitude + ',true);true;',
                );
              }
            }}
            originWhitelist={['*']}
            renderLoading={() => <ActivityIndicator color={colors.signal} size="large" style={styles.loader} />}
            source={{ html }}
            startInLoadingState
            style={styles.map}
          />
        )}

        <View style={styles.top} pointerEvents="box-none">
          <View style={styles.wallet}>
            <View style={styles.walletDot} />
            <Text style={styles.walletText}>{player.pointsBalance} PKT</Text>
            <Text style={styles.rankText}>{player.rank}</Text>
          </View>

          <View style={styles.filters}>
            {[
              ['all', 'Wszystkie'],
              ['collecting', 'Zbiera głosy'],
              ['passed', 'Przeszły'],
            ].map(([value, label]) => (
              <Pressable
                key={value}
                onPress={() => setFilter(value as 'all' | 'collecting' | 'passed')}
                style={[styles.filter, filter === value && styles.filterActive]}
              >
                <Text style={[styles.filterText, filter === value && styles.filterTextActive]}>{label}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={styles.actions}>
          <Pressable
            onPress={() => webView.current?.injectJavaScript('window.focusPlayer && window.focusPlayer();true;')}
            style={[styles.roundAction, anchored && styles.roundActionActive]}
          >
            <Ionicons color={anchored ? colors.surface : colors.signal} name={locationIssue ? 'warning-outline' : 'locate'} size={22} />
          </Pressable>
        </View>

        {locationIssue && (
          <View style={styles.locationIssue}>
            <Text style={styles.locationIssueText}>{locationIssue}</Text>
          </View>
        )}

        {proximityNotice && (
          <Pressable onPress={() => setProximityNotice(null)} style={styles.proximityNotice}>
            <Ionicons color={colors.deep} name="walk-outline" size={17} />
            <Text style={styles.proximityNoticeText}>{proximityNotice}</Text>
          </Pressable>
        )}

        {selected && (
          <Pressable onPress={() => onOpenInitiative(selected)} style={styles.quickCard}>
            <View style={[styles.quickMarker, { backgroundColor: selected.status === 'passed' ? colors.resolved : selected.color }]}>
              <Text style={styles.quickMarkerText}>{selected.status === 'passed' ? '✓' : selected.votes}</Text>
            </View>
            <View style={styles.quickCopy}>
              <StatusChip tone={selected.status === 'passed' ? 'green' : 'blue'}>
                {selected.status === 'passed' ? 'Przeszła' : 'Zbiera głosy'}
              </StatusChip>
              <Text numberOfLines={2} style={styles.quickTitle}>{selected.brief.title}</Text>
              <Text style={styles.quickMeta}>{selected.votes}/{selected.threshold} Głosów · {selected.distance}</Text>
            </View>
            <Ionicons color={colors.muted} name="chevron-forward" size={20} />
          </Pressable>
        )}
      </View>

      <Animated.View
        pointerEvents={createMenuOpen ? 'auto' : 'none'}
        style={[
          styles.actionMenu,
          {
            opacity: createMenuProgress,
            transform: [
              { translateY: createMenuProgress.interpolate({ inputRange: [0, 1], outputRange: [14, 0] }) },
              { scale: createMenuProgress.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1] }) },
            ],
          },
        ]}
      >
        <Animated.View
          pointerEvents="none"
          style={[
            styles.actionBridge,
            {
              opacity: createMenuProgress,
              transform: [
                { scale: createMenuProgress.interpolate({ inputRange: [0, 1], outputRange: [0.55, 1] }) },
              ],
            },
          ]}
        >
          <View style={styles.actionBridgeCore} />
          <View style={styles.actionBridgeLeft} />
          <View style={styles.actionBridgeRight} />
        </Animated.View>

        <Animated.View
          style={[
            styles.actionItemWrap,
            styles.actionItemLeftWrap,
            {
              transform: [
                { translateX: createMenuProgress.interpolate({ inputRange: [0, 1], outputRange: [88, 0] }) },
                { translateY: createMenuProgress.interpolate({ inputRange: [0, 1], outputRange: [18, 0] }) },
                { scale: createMenuProgress.interpolate({ inputRange: [0, 1], outputRange: [0.72, 1] }) },
              ],
            },
          ]}
        >
          <Pressable
            accessibilityHint="Przytrzymaj do pełnego wypełnienia i puść, aby otworzyć formularz"
            accessibilityLabel="Zgłoś usterkę"
            accessibilityRole="button"
            hitSlop={10}
            onPressIn={() => beginHold('incident')}
            onPressOut={() => finishHold('incident')}
            onTouchCancel={() => cancelHold('incident')}
            style={({ pressed }) => [styles.actionItem, styles.actionItemLeft, pressed && styles.actionItemPressed]}
          >
            <Animated.View style={[styles.actionFill, styles.actionFillLeft, { width: incidentFillWidth }]} />
            <View style={[styles.actionIcon, heldAction === 'incident' && styles.actionIconHeld]}>
              <Ionicons
                color={heldAction === 'incident' ? colors.surface : colors.signal}
                name="construct-outline"
                size={19}
              />
            </View>
            <Text
              numberOfLines={2}
              style={[styles.actionLabel, heldAction === 'incident' && styles.actionLabelHeld]}
            >
              Zgłoś usterkę
            </Text>
          </Pressable>
        </Animated.View>

        <Animated.View
          style={[
            styles.actionItemWrap,
            styles.actionItemRightWrap,
            {
              transform: [
                { translateX: createMenuProgress.interpolate({ inputRange: [0, 1], outputRange: [-88, 0] }) },
                { translateY: createMenuProgress.interpolate({ inputRange: [0, 1], outputRange: [18, 0] }) },
                { scale: createMenuProgress.interpolate({ inputRange: [0, 1], outputRange: [0.72, 1] }) },
              ],
            },
          ]}
        >
          <Pressable
            accessibilityHint="Przytrzymaj do pełnego wypełnienia i puść, aby otworzyć formularz"
            accessibilityLabel="Zgłoś inicjatywę"
            accessibilityRole="button"
            hitSlop={10}
            onPressIn={() => beginHold('initiative')}
            onPressOut={() => finishHold('initiative')}
            onTouchCancel={() => cancelHold('initiative')}
            style={({ pressed }) => [styles.actionItem, styles.actionItemRight, pressed && styles.actionItemPressed]}
          >
            <Animated.View style={[styles.actionFill, styles.actionFillRight, { width: initiativeFillWidth }]} />
            <View style={[styles.actionIcon, heldAction === 'initiative' && styles.actionIconHeld]}>
              <Ionicons
                color={heldAction === 'initiative' ? colors.surface : colors.signal}
                name="bulb-outline"
                size={19}
              />
            </View>
            <Text
              numberOfLines={2}
              style={[styles.actionLabel, heldAction === 'initiative' && styles.actionLabelHeld]}
            >
              Zgłoś inicjatywę
            </Text>
          </Pressable>
        </Animated.View>
      </Animated.View>

      <Pressable
        accessibilityLabel={createMenuOpen ? 'Zamknij menu zgłoszenia' : 'Dodaj zgłoszenie'}
        accessibilityRole="button"
        onPress={() => setCreateMenuOpen((open) => !open)}
        style={({ pressed }) => [styles.fab, createMenuOpen && styles.fabOpen, pressed && styles.fabPressed]}
      >
        <Animated.View
          style={{
            transform: [
              { scale: createMenuProgress.interpolate({ inputRange: [0, 1], outputRange: [1, 0.9] }) },
            ],
          }}
        >
          <Ionicons color={colors.surface} name="add" size={32} />
        </Animated.View>
      </Pressable>

      <BottomNav active="map" onSelect={onNavigate} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: colors.background, flex: 1 },
  mapArea: { flex: 1, overflow: 'hidden' },
  map: { flex: 1 },
  loader: { bottom: 0, left: 0, position: 'absolute', right: 0, top: 0 },
  fallback: { alignItems: 'center', backgroundColor: colors.background, flex: 1, justifyContent: 'center' },
  fallbackTitle: { color: colors.ink, fontFamily: fonts.heading, fontSize: 19, marginTop: 12 },
  top: { left: 12, position: 'absolute', right: 12, top: 12 },
  wallet: { alignItems: 'center', alignSelf: 'flex-start', backgroundColor: 'rgba(255,255,255,.95)', borderRadius: 999, flexDirection: 'row', gap: 6, paddingHorizontal: 12, paddingVertical: 9, ...shadow },
  walletDot: { backgroundColor: colors.signal, borderRadius: 5, height: 10, width: 10 },
  walletText: { color: colors.ink, fontFamily: fonts.bodyBold, fontSize: 12 },
  rankText: { color: colors.muted, fontFamily: fonts.body, fontSize: 9 },
  filters: { flexDirection: 'row', gap: 6, marginTop: 9 },
  filter: { backgroundColor: 'rgba(255,255,255,.94)', borderColor: colors.border, borderRadius: 999, borderWidth: 1, paddingHorizontal: 11, paddingVertical: 8 },
  filterActive: { backgroundColor: colors.ink, borderColor: colors.ink },
  filterText: { color: colors.ink, fontFamily: fonts.bodyBold, fontSize: 10 },
  filterTextActive: { color: colors.surface },
  actions: { alignItems: 'flex-end', bottom: 146, gap: 9, position: 'absolute', right: 12 },
  roundAction: { alignItems: 'center', backgroundColor: colors.surface, borderRadius: 25, height: 50, justifyContent: 'center', width: 50, ...shadow },
  roundActionActive: { backgroundColor: colors.signal },

  actionMenu: {
    bottom: 101,
    height: 98,
    left: 10,
    position: 'absolute',
    right: 10,
    zIndex: 19,
  },
  actionBridge: {
    bottom: -4,
    height: 58,
    left: '50%',
    marginLeft: -82,
    position: 'absolute',
    width: 164,
  },
  actionBridgeCore: {
    backgroundColor: colors.surface,
    borderRadius: 42,
    bottom: -18,
    height: 76,
    left: '50%',
    marginLeft: -38,
    position: 'absolute',
    width: 76,
    ...shadow,
  },
  actionBridgeLeft: {
    backgroundColor: colors.surface,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 10,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    bottom: 12,
    height: 34,
    left: 7,
    position: 'absolute',
    transform: [{ rotate: '-16deg' }],
    width: 78,
  },
  actionBridgeRight: {
    backgroundColor: colors.surface,
    borderBottomLeftRadius: 10,
    borderBottomRightRadius: 28,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    bottom: 12,
    height: 34,
    position: 'absolute',
    right: 7,
    transform: [{ rotate: '16deg' }],
    width: 78,
  },
  actionItemWrap: {
    height: 64,
    position: 'absolute',
    top: 2,
    width: '44%',
    zIndex: 2,
  },
  actionItemLeftWrap: { left: 4 },
  actionItemRightWrap: { right: 4 },
  actionItem: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: 'rgba(221,227,234,.9)',
    borderWidth: 1,
    flexDirection: 'row',
    gap: 9,
    height: 62,
    overflow: 'hidden',
    paddingHorizontal: 13,
    width: '100%',
    ...shadow,
  },
  actionItemLeft: {
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 14,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
  },
  actionItemRight: {
    borderBottomLeftRadius: 14,
    borderBottomRightRadius: 30,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
  },
  actionItemPressed: {
    transform: [{ scale: 0.985 }],
  },
  actionFill: {
    backgroundColor: colors.signal,
    bottom: 0,
    position: 'absolute',
    top: 0,
  },
  actionFillLeft: {
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 14,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    right: 0,
  },
  actionFillRight: {
    borderBottomLeftRadius: 14,
    borderBottomRightRadius: 30,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    left: 0,
  },
  actionIcon: {
    alignItems: 'center',
    backgroundColor: colors.blueSoft,
    borderRadius: 18,
    height: 36,
    justifyContent: 'center',
    width: 36,
    zIndex: 2,
  },
  actionIconHeld: {
    backgroundColor: 'rgba(255,255,255,.18)',
  },
  actionLabel: {
    color: colors.ink,
    flex: 1,
    fontFamily: fonts.bodyBold,
    fontSize: 11,
    lineHeight: 14,
    zIndex: 2,
  },
  actionLabelHeld: {
    color: colors.surface,
  },

  fab: { alignItems: 'center', backgroundColor: colors.signal, borderColor: colors.surface, borderRadius: 31, borderWidth: 5, bottom: 62, height: 62, justifyContent: 'center', left: '50%', marginLeft: -31, position: 'absolute', width: 62, zIndex: 20, ...shadow },
  fabOpen: { backgroundColor: colors.signal, borderColor: colors.surface },
  fabPressed: { opacity: 0.9, transform: [{ scale: 0.96 }] },
  locationIssue: { backgroundColor: '#FFF5DF', borderRadius: 999, bottom: 146, left: 12, paddingHorizontal: 11, paddingVertical: 8, position: 'absolute' },
  locationIssueText: { color: colors.warning, fontFamily: fonts.bodyBold, fontSize: 10 },
  proximityNotice: {
    alignItems: 'center',
    backgroundColor: 'rgba(238,243,255,.98)',
    borderColor: '#C9D7FF',
    borderRadius: 18,
    borderWidth: 1,
    bottom: 82,
    flexDirection: 'row',
    gap: 8,
    left: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
    position: 'absolute',
    right: 16,
    zIndex: 18,
    ...shadow,
  },
  proximityNoticeText: { color: colors.deep, flex: 1, fontFamily: fonts.bodyBold, fontSize: 11, lineHeight: 15 },
  quickCard: { alignItems: 'center', backgroundColor: 'rgba(255,255,255,.97)', borderColor: colors.border, borderRadius: 22, borderWidth: 1, bottom: 12, flexDirection: 'row', gap: 12, left: 12, padding: 13, position: 'absolute', right: 12, ...shadow },
  quickMarker: { alignItems: 'center', borderRadius: 26, height: 52, justifyContent: 'center', width: 52 },
  quickMarkerText: { color: colors.surface, fontFamily: fonts.headingExtra, fontSize: 18 },
  quickCopy: { flex: 1 },
  quickTitle: { color: colors.ink, fontFamily: fonts.heading, fontSize: 14, lineHeight: 18, marginTop: 5 },
  quickMeta: { color: colors.muted, fontFamily: fonts.body, fontSize: 10, marginTop: 3 },
});
