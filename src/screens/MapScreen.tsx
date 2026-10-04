import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { WebView } from 'react-native-webview';
import { BottomNav, StatusChip } from '../components';
import { createMapHtml } from '../mapHtml';
import { colors, fonts, shadow } from '../theme';

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

  const [selectedId, setSelectedId] = useState(initiatives[0]?.id);
  const [mapError, setMapError] = useState(false);
  const [locationIssue, setLocationIssue] = useState<string | null>(null);
  const [anchored, setAnchored] = useState(false);
  const [activityFilter, setActivityFilter] = useState<'scouting' | 'raid' | 'quest'>('scouting');
  const [createMenuOpen, setCreateMenuOpen] = useState(false);
  const [proximityNotice, setProximityNotice] = useState<string | null>(null);

  const filtered = initiatives;
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

  }, [createMenuOpen, createMenuProgress]);

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
              ['scouting', 'Zwiad'],
              ['raid', 'Rajd'],
              ['quest', 'Misja'],
            ].map(([value, label]) => (
              <Pressable
                key={value}
                onPress={() => setActivityFilter(value as 'scouting' | 'raid' | 'quest')}
                style={[styles.filter, activityFilter === value && styles.filterActive]}
              >
                <Text style={[styles.filterText, activityFilter === value && styles.filterTextActive]}>{label}</Text>
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
          styles.createChoices,
          {
            opacity: createMenuProgress,
            transform: [
              { translateY: createMenuProgress.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) },
              { scale: createMenuProgress.interpolate({ inputRange: [0, 1], outputRange: [0.96, 1] }) },
            ],
          },
        ]}
      >
        <Pressable
          accessibilityLabel="Zgłoś usterkę"
          accessibilityRole="button"
          onPress={() => {
            setCreateMenuOpen(false);
            onCreateIncident?.();
          }}
          style={({ pressed }) => [styles.createChoice, pressed && styles.createChoicePressed]}
        >
          {({ pressed }) => (
            <>
              <View style={[styles.createChoiceIcon, pressed && styles.createChoiceIconPressed]}>
                <Ionicons color={pressed ? colors.surface : colors.signal} name="construct-outline" size={20} />
              </View>
              <Text style={[styles.createChoiceText, pressed && styles.createChoiceTextPressed]}>Zgłoś usterkę</Text>
            </>
          )}
        </Pressable>

        <Pressable
          accessibilityLabel="Zgłoś inicjatywę"
          accessibilityRole="button"
          onPress={() => {
            setCreateMenuOpen(false);
            onCreate();
          }}
          style={({ pressed }) => [styles.createChoice, pressed && styles.createChoicePressed]}
        >
          {({ pressed }) => (
            <>
              <View style={[styles.createChoiceIcon, pressed && styles.createChoiceIconPressed]}>
                <Ionicons color={pressed ? colors.surface : colors.signal} name="bulb-outline" size={20} />
              </View>
              <Text style={[styles.createChoiceText, pressed && styles.createChoiceTextPressed]}>Zgłoś inicjatywę</Text>
            </>
          )}
        </Pressable>
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

  createChoices: {
    bottom: 132,
    flexDirection: 'row',
    gap: 10,
    left: 14,
    position: 'absolute',
    right: 14,
    zIndex: 19,
  },
  createChoice: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 24,
    borderWidth: 1,
    flex: 1,
    flexDirection: 'row',
    gap: 9,
    justifyContent: 'center',
    minHeight: 56,
    paddingHorizontal: 12,
    ...shadow,
  },
  createChoicePressed: {
    backgroundColor: colors.signal,
    borderColor: colors.signal,
    transform: [{ scale: 0.985 }],
  },
  createChoiceIcon: {
    alignItems: 'center',
    backgroundColor: colors.blueSoft,
    borderRadius: 17,
    height: 34,
    justifyContent: 'center',
    width: 34,
  },
  createChoiceIconPressed: {
    backgroundColor: 'rgba(255,255,255,.18)',
  },
  createChoiceText: {
    color: colors.ink,
    fontFamily: fonts.bodyBold,
    fontSize: 11,
    lineHeight: 14,
  },
  createChoiceTextPressed: {
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
