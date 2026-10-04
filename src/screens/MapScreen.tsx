import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { WebView } from 'react-native-webview';
import { BottomNav, StatusChip } from '../components';
import { createMapHtml } from '../mapHtml';
import { colors, fonts, shadow } from '../theme';

type CreateAction = 'incident' | 'initiative';

const HOLD_MIN_MS = 260;
const HOLD_FILL_MS = 720;

export function MapScreen({ initiatives, onNavigate, onOpenInitiative, onCreate, onCreateIncident, player }) {
  const webView = useRef<any>(null);
  const latestLocation = useRef<any>(null);
  const createMenuProgress = useRef(new Animated.Value(0)).current;
  const incidentHold = useRef(new Animated.Value(0)).current;
  const initiativeHold = useRef(new Animated.Value(0)).current;
  const activeHold = useRef<CreateAction | null>(null);
  const holdStartedAt = useRef(0);
  const holdAnimation = useRef<Animated.CompositeAnimation | null>(null);

  const [selectedId, setSelectedId] = useState(initiatives[0]?.id);
  const [mapError, setMapError] = useState(false);
  const [locationIssue, setLocationIssue] = useState<string | null>(null);
  const [anchored, setAnchored] = useState(false);
  const [filter, setFilter] = useState<'all' | 'collecting' | 'passed'>('all');
  const [createMenuOpen, setCreateMenuOpen] = useState(false);
  const [heldAction, setHeldAction] = useState<CreateAction | null>(null);

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
      if (message.type === 'initiative') setSelectedId(message.id);
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
    holdStartedAt.current = Date.now();
    setHeldAction(action);

    const activeValue = action === 'incident' ? incidentHold : initiativeHold;
    const inactiveValue = action === 'incident' ? initiativeHold : incidentHold;
    inactiveValue.setValue(0);
    activeValue.setValue(0);

    holdAnimation.current = Animated.timing(activeValue, {
      toValue: 1,
      duration: HOLD_FILL_MS,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    });
    holdAnimation.current.start();
  };

  const finishHold = (action: CreateAction) => {
    if (activeHold.current !== action) return;

    holdAnimation.current?.stop();
    const heldFor = Date.now() - holdStartedAt.current;
    activeHold.current = null;
    setHeldAction(null);

    if (heldFor < HOLD_MIN_MS) {
      resetHold(action);
      return;
    }

    const value = action === 'incident' ? incidentHold : initiativeHold;
    Animated.timing(value, {
      toValue: 1,
      duration: 90,
      easing: Easing.out(Easing.quad),
      useNativeDriver: false,
    }).start(() => {
      setCreateMenuOpen(false);
      if (action === 'incident') onCreateIncident?.();
      else onCreate();
    });
  };

  const cancelHold = (action: CreateAction) => {
    if (activeHold.current !== action) return;
    holdAnimation.current?.stop();
    activeHold.current = null;
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
          styles.createCluster,
          {
            opacity: createMenuProgress,
            transform: [
              { translateY: createMenuProgress.interpolate({ inputRange: [0, 1], outputRange: [18, 0] }) },
              { scale: createMenuProgress.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1] }) },
            ],
          },
        ]}
      >
        <View pointerEvents="none" style={styles.connectorLayer}>
          <View style={styles.leftCurve} />
          <View style={styles.rightCurve} />
          <View style={styles.connectorStem} />
          <View style={styles.connectorNode} />
        </View>

        <Pressable
          accessibilityHint="Przytrzymaj, następnie puść aby otworzyć formularz"
          accessibilityLabel="Zgłoś usterkę"
          accessibilityRole="button"
          hitSlop={8}
          onPressIn={() => beginHold('incident')}
          onPressOut={() => finishHold('incident')}
          onTouchCancel={() => cancelHold('incident')}
          style={({ pressed }) => [styles.createPill, pressed && styles.createPillPressed]}
        >
          <Animated.View style={[styles.createPillFill, { width: incidentFillWidth }]} />
          <View style={[styles.createIcon, heldAction === 'incident' && styles.createIconHeld]}>
            <Ionicons color={heldAction === 'incident' ? colors.surface : colors.signal} name="construct-outline" size={17} />
          </View>
          <Text style={[styles.createPillText, heldAction === 'incident' && styles.createPillTextHeld]}>Zgłoś usterkę</Text>
        </Pressable>

        <Pressable
          accessibilityHint="Przytrzymaj, następnie puść aby otworzyć formularz"
          accessibilityLabel="Zgłoś inicjatywę"
          accessibilityRole="button"
          hitSlop={8}
          onPressIn={() => beginHold('initiative')}
          onPressOut={() => finishHold('initiative')}
          onTouchCancel={() => cancelHold('initiative')}
          style={({ pressed }) => [styles.createPill, pressed && styles.createPillPressed]}
        >
          <Animated.View style={[styles.createPillFill, { width: initiativeFillWidth }]} />
          <View style={[styles.createIcon, heldAction === 'initiative' && styles.createIconHeld]}>
            <Ionicons color={heldAction === 'initiative' ? colors.surface : colors.signal} name="sparkles-outline" size={17} />
          </View>
          <Text style={[styles.createPillText, heldAction === 'initiative' && styles.createPillTextHeld]}>Zgłoś inicjatywę</Text>
        </Pressable>
      </Animated.View>

      <Pressable
        accessibilityLabel={createMenuOpen ? 'Zamknij menu zgłoszenia' : 'Dodaj zgłoszenie'}
        accessibilityRole="button"
        onPress={() => setCreateMenuOpen((open) => !open)}
        style={({ pressed }) => [styles.fab, createMenuOpen && styles.fabOpen, pressed && styles.fabPressed]}
      >
        <Animated.View style={{ transform: [{ rotate: createMenuProgress.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '45deg'] }) }] }}>
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

  createCluster: {
    bottom: 137,
    flexDirection: 'row',
    gap: 64,
    justifyContent: 'center',
    left: 14,
    position: 'absolute',
    right: 14,
    zIndex: 19,
  },
  connectorLayer: {
    bottom: -42,
    height: 54,
    left: '50%',
    marginLeft: -100,
    position: 'absolute',
    width: 200,
  },
  leftCurve: {
    borderBottomColor: colors.signal,
    borderBottomLeftRadius: 34,
    borderBottomWidth: 3,
    borderLeftColor: colors.signal,
    borderLeftWidth: 3,
    bottom: 12,
    height: 34,
    left: 0,
    position: 'absolute',
    width: 96,
  },
  rightCurve: {
    borderBottomColor: colors.signal,
    borderBottomRightRadius: 34,
    borderBottomWidth: 3,
    borderRightColor: colors.signal,
    borderRightWidth: 3,
    bottom: 12,
    height: 34,
    position: 'absolute',
    right: 0,
    width: 96,
  },
  connectorStem: {
    backgroundColor: colors.signal,
    bottom: 0,
    height: 18,
    left: '50%',
    marginLeft: -1.5,
    position: 'absolute',
    width: 3,
  },
  connectorNode: {
    backgroundColor: colors.signal,
    borderColor: colors.surface,
    borderRadius: 5,
    borderWidth: 2,
    bottom: 10,
    height: 10,
    left: '50%',
    marginLeft: -5,
    position: 'absolute',
    width: 10,
  },
  createPill: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,.98)',
    borderColor: colors.border,
    borderRadius: 27,
    borderWidth: 1,
    flex: 1,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    maxWidth: 166,
    minHeight: 54,
    overflow: 'hidden',
    paddingHorizontal: 12,
    ...shadow,
  },
  createPillPressed: {
    transform: [{ scale: 0.985 }],
  },
  createPillFill: {
    backgroundColor: colors.signal,
    bottom: 0,
    left: 0,
    position: 'absolute',
    top: 0,
  },
  createIcon: {
    alignItems: 'center',
    backgroundColor: colors.blueSoft,
    borderRadius: 16,
    height: 30,
    justifyContent: 'center',
    width: 30,
  },
  createIconHeld: {
    backgroundColor: 'rgba(255,255,255,.18)',
  },
  createPillText: {
    color: colors.ink,
    fontFamily: fonts.bodyBold,
    fontSize: 12,
  },
  createPillTextHeld: {
    color: colors.surface,
  },

  fab: { alignItems: 'center', backgroundColor: colors.signal, borderColor: colors.surface, borderRadius: 31, borderWidth: 5, bottom: 62, height: 62, justifyContent: 'center', left: '50%', marginLeft: -31, position: 'absolute', width: 62, zIndex: 20, ...shadow },
  fabOpen: { backgroundColor: colors.deep },
  fabPressed: { opacity: 0.9, transform: [{ scale: 0.96 }] },
  locationIssue: { backgroundColor: '#FFF5DF', borderRadius: 999, bottom: 146, left: 12, paddingHorizontal: 11, paddingVertical: 8, position: 'absolute' },
  locationIssueText: { color: colors.warning, fontFamily: fonts.bodyBold, fontSize: 10 },
  quickCard: { alignItems: 'center', backgroundColor: 'rgba(255,255,255,.97)', borderColor: colors.border, borderRadius: 22, borderWidth: 1, bottom: 12, flexDirection: 'row', gap: 12, left: 12, padding: 13, position: 'absolute', right: 12, ...shadow },
  quickMarker: { alignItems: 'center', borderRadius: 26, height: 52, justifyContent: 'center', width: 52 },
  quickMarkerText: { color: colors.surface, fontFamily: fonts.headingExtra, fontSize: 18 },
  quickCopy: { flex: 1 },
  quickTitle: { color: colors.ink, fontFamily: fonts.heading, fontSize: 14, lineHeight: 18, marginTop: 5 },
  quickMeta: { color: colors.muted, fontFamily: fonts.body, fontSize: 10, marginTop: 3 },
});
