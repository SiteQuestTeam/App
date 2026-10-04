import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { WebView } from 'react-native-webview';
import { BottomNav, StatusChip } from '../components';
import { createMapHtml } from '../mapHtml';
import { colors, fonts, shadow } from '../theme';

type CreateAction = 'incident' | 'initiative';

export function MapScreen({ initiatives, onNavigate, onOpenInitiative, onCreate, onCreateIncident, player }) {
  const webView = useRef<any>(null);
  const latestLocation = useRef<any>(null);
  const createMenuProgress = useRef(new Animated.Value(0)).current;
  const incidentSelection = useRef(new Animated.Value(0)).current;
  const initiativeSelection = useRef(new Animated.Value(0)).current;
  const [selectedId, setSelectedId] = useState(initiatives[0]?.id);
  const [mapError, setMapError] = useState(false);
  const [locationIssue, setLocationIssue] = useState<string | null>(null);
  const [anchored, setAnchored] = useState(false);
  const [filter, setFilter] = useState<'all' | 'collecting' | 'passed'>('all');
  const [createMenuOpen, setCreateMenuOpen] = useState(false);
  const [createAction, setCreateAction] = useState<CreateAction | null>(null);

  const filtered = initiatives.filter((item) => filter === 'all' || item.status === filter);
  const htmlKey = filtered.map((item) => item.id + ':' + item.votes + ':' + item.status).join('|');
  const html = useMemo(() => createMapHtml(filtered), [htmlKey]);
  const selected = initiatives.find((item) => item.id === selectedId) || initiatives[0];

  useEffect(() => {
    Animated.spring(createMenuProgress, {
      toValue: createMenuOpen ? 1 : 0,
      useNativeDriver: true,
      damping: 18,
      stiffness: 240,
      mass: 0.8,
    }).start();

    if (!createMenuOpen) {
      setCreateAction(null);
      incidentSelection.setValue(0);
      initiativeSelection.setValue(0);
    }
  }, [createMenuOpen, createMenuProgress, incidentSelection, initiativeSelection]);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(incidentSelection, {
        toValue: createAction === 'incident' ? 1 : 0,
        duration: 180,
        useNativeDriver: false,
      }),
      Animated.timing(initiativeSelection, {
        toValue: createAction === 'initiative' ? 1 : 0,
        duration: 180,
        useNativeDriver: false,
      }),
    ]).start();
  }, [createAction, incidentSelection, initiativeSelection]);

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

  const selectCreateAction = (action: CreateAction) => {
    setCreateAction(action);
    setTimeout(() => {
      setCreateMenuOpen(false);
      if (action === 'incident') onCreateIncident?.();
      else onCreate();
    }, 190);
  };

  const incidentBg = incidentSelection.interpolate({
    inputRange: [0, 1],
    outputRange: ['rgba(255,255,255,0)', colors.signal],
  });
  const initiativeBg = initiativeSelection.interpolate({
    inputRange: [0, 1],
    outputRange: ['rgba(255,255,255,0)', colors.signal],
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
          styles.createBubble,
          {
            opacity: createMenuProgress,
            transform: [
              { translateY: createMenuProgress.interpolate({ inputRange: [0, 1], outputRange: [14, 0] }) },
              { scale: createMenuProgress.interpolate({ inputRange: [0, 1], outputRange: [0.94, 1] }) },
            ],
          },
        ]}
      >
        <View style={styles.createConnector} />
        <Pressable
          accessibilityLabel="Zgłoś usterkę"
          accessibilityRole="button"
          onPress={() => selectCreateAction('incident')}
          style={styles.createPill}
        >
          <Animated.View style={[styles.createPillFill, { backgroundColor: incidentBg }]} />
          <Ionicons color={createAction === 'incident' ? colors.surface : colors.signal} name="construct-outline" size={18} />
          <Text style={[styles.createPillText, createAction === 'incident' && styles.createPillTextActive]}>Zgłoś usterkę</Text>
        </Pressable>
        <View style={styles.createDivider} />
        <Pressable
          accessibilityLabel="Zgłoś inicjatywę"
          accessibilityRole="button"
          onPress={() => selectCreateAction('initiative')}
          style={styles.createPill}
        >
          <Animated.View style={[styles.createPillFill, { backgroundColor: initiativeBg }]} />
          <Ionicons color={createAction === 'initiative' ? colors.surface : colors.signal} name="sparkles-outline" size={18} />
          <Text style={[styles.createPillText, createAction === 'initiative' && styles.createPillTextActive]}>Zgłoś inicjatywę</Text>
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
  createBubble: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,.98)',
    borderColor: 'rgba(221,227,234,.92)',
    borderRadius: 30,
    borderWidth: 1,
    bottom: 118,
    flexDirection: 'row',
    left: 18,
    overflow: 'visible',
    position: 'absolute',
    right: 18,
    zIndex: 19,
    ...shadow,
  },
  createConnector: {
    backgroundColor: 'rgba(255,255,255,.98)',
    bottom: -10,
    height: 20,
    left: '50%',
    marginLeft: -10,
    position: 'absolute',
    transform: [{ rotate: '45deg' }],
    width: 20,
  },
  createPill: {
    alignItems: 'center',
    borderRadius: 28,
    flex: 1,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    minHeight: 56,
    overflow: 'hidden',
    paddingHorizontal: 12,
  },
  createPillFill: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 28,
  },
  createDivider: { backgroundColor: colors.border, height: 28, width: StyleSheet.hairlineWidth },
  createPillText: { color: colors.ink, fontFamily: fonts.bodyBold, fontSize: 12 },
  createPillTextActive: { color: colors.surface },
  fab: { alignItems: 'center', backgroundColor: colors.signal, borderColor: colors.surface, borderRadius: 31, borderWidth: 5, bottom: 62, height: 62, justifyContent: 'center', left: '50%', marginLeft: -31, position: 'absolute', width: 62, zIndex: 20, ...shadow },
  fabOpen: { backgroundColor: colors.deep },
  fabPressed: { opacity: 0.88, transform: [{ scale: 0.96 }] },
  locationIssue: { backgroundColor: '#FFF5DF', borderRadius: 999, bottom: 146, left: 12, paddingHorizontal: 11, paddingVertical: 8, position: 'absolute' },
  locationIssueText: { color: colors.warning, fontFamily: fonts.bodyBold, fontSize: 10 },
  quickCard: { alignItems: 'center', backgroundColor: 'rgba(255,255,255,.97)', borderColor: colors.border, borderRadius: 22, borderWidth: 1, bottom: 12, flexDirection: 'row', gap: 12, left: 12, padding: 13, position: 'absolute', right: 12, ...shadow },
  quickMarker: { alignItems: 'center', borderRadius: 26, height: 52, justifyContent: 'center', width: 52 },
  quickMarkerText: { color: colors.surface, fontFamily: fonts.headingExtra, fontSize: 18 },
  quickCopy: { flex: 1 },
  quickTitle: { color: colors.ink, fontFamily: fonts.heading, fontSize: 14, lineHeight: 18, marginTop: 5 },
  quickMeta: { color: colors.muted, fontFamily: fonts.body, fontSize: 10, marginTop: 3 },
});
