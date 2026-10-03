import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { WebView } from 'react-native-webview';
import { BottomNav, RoleSwitcher, StatusChip } from '../components';
import { initiatives, KRAKOW_CENTER } from '../data';
import { createMapHtml } from '../mapHtml';
import { colors, fonts, shadow } from '../theme';

export function MapScreen({ onNavigate, onOpenInitiative, onCreate, role, onRoleChange }) {
  const webView = useRef(null);
  const [selectedId, setSelectedId] = useState('garden');
  const [mapError, setMapError] = useState(false);
  const latestLocation = useRef(null);
  const acceptedLocation = useRef(null);
  const latestHeading = useRef(0);
  const appliedHeading = useRef(null);
  const movementStopTimer = useRef(null);
  const [query, setQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filter, setFilter] = useState('Wszystkie');
  const html = useMemo(() => createMapHtml(initiatives, { center: KRAKOW_CENTER }), []);
  const selected = initiatives.find((item) => item.id === selectedId) || initiatives[0];

  useEffect(() => {
    let active = true;
    let locationSubscription = null;
    let headingSubscription = null;

    const distanceMeters = (from, to) => {
      const earthRadius = 6371000;
      const toRad = (value) => (value * Math.PI) / 180;
      const dLat = toRad(to.coords.latitude - from.coords.latitude);
      const dLng = toRad(to.coords.longitude - from.coords.longitude);
      const lat1 = toRad(from.coords.latitude);
      const lat2 = toRad(to.coords.latitude);
      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
      return 2 * earthRadius * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    };

    const setMoving = (moving) => {
      webView.current?.injectJavaScript(
        `window.setPlayerMoving && window.setPlayerMoving(${moving ? 'true' : 'false'});true;`,
      );
    };

    const markMovement = () => {
      setMoving(true);
      if (movementStopTimer.current) clearTimeout(movementStopTimer.current);
      movementStopTimer.current = setTimeout(() => setMoving(false), 1600);
    };

    const pushLocationToMap = (location, centerMap = false) => {
      latestLocation.current = location;
      acceptedLocation.current = location;
      webView.current?.injectJavaScript(
        `window.movePlayer && window.movePlayer(${location.coords.longitude},${location.coords.latitude},${centerMap ? 'true' : 'false'});true;`,
      );
    };

    const acceptMeaningfulMovement = (nextLocation) => {
      const nextAccuracy = Number(nextLocation.coords.accuracy ?? Infinity);

      // Never place the avatar from a low-quality fix. Until a good fix arrives,
      // the map stays freely pannable and the avatar remains hidden.
      if (!Number.isFinite(nextAccuracy) || nextAccuracy > 35) return;

      latestLocation.current = nextLocation;
      const previous = acceptedLocation.current;
      if (!previous) {
        acceptedLocation.current = nextLocation;
        pushLocationToMap(nextLocation, true);
        return;
      }

      const accuracy = Math.max(
        Number(previous.coords.accuracy ?? nextAccuracy),
        nextAccuracy,
      );

      // Absorb GPS drift while standing still.
      const deadZoneMeters = Math.max(3, Math.min(8, accuracy * 0.35));
      const movedMeters = distanceMeters(previous, nextLocation);
      if (movedMeters < deadZoneMeters) return;

      acceptedLocation.current = nextLocation;
      pushLocationToMap(nextLocation, false);
      markMovement();
    };

    const pushHeadingToMap = (heading) => {
      if (!Number.isFinite(heading)) return;
      const normalized = ((heading % 360) + 360) % 360;
      latestHeading.current = normalized;

      const previous = appliedHeading.current;
      if (previous !== null) {
        const delta = Math.abs(((normalized - previous + 540) % 360) - 180);
        if (delta < 12) return;
      }

      appliedHeading.current = normalized;
      webView.current?.injectJavaScript(
        `window.setPlayerHeading && window.setPlayerHeading(${normalized});true;`,
      );
    };

    const startLocationTracking = async () => {
      try {
        const permission = await Location.requestForegroundPermissionsAsync();
        if (!permission.granted) return;

        locationSubscription = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.BestForNavigation,
            distanceInterval: 1,
            timeInterval: 1000,
          },
          (nextLocation) => {
            if (!active) return;
            acceptMeaningfulMovement(nextLocation);
          },
        );

        headingSubscription = await Location.watchHeadingAsync((heading) => {
          if (!active) return;
          const value = heading.trueHeading >= 0 ? heading.trueHeading : heading.magHeading;
          pushHeadingToMap(value);
        });
      } catch {
        // Keep the last known avatar position when GPS is temporarily unavailable.
        // The map remains usable and the avatar is never reset to a fallback coordinate.
      }
    };

    startLocationTracking();
    return () => {
      active = false;
      locationSubscription?.remove();
      headingSubscription?.remove();
      if (movementStopTimer.current) clearTimeout(movementStopTimer.current);
    };
  }, []);
  const searchResults = initiatives.filter((item) => {
    const matchesText = `${item.title} ${item.address} ${item.district}`.toLocaleLowerCase('pl').includes(query.toLocaleLowerCase('pl'));
    const matchesFilter = filter === 'Wszystkie' || item.type === filter;
    return matchesText && matchesFilter;
  });

  const selectFromSearch = (item) => {
    setSelectedId(item.id);
    setQuery('');
    webView.current?.injectJavaScript(`window.focusInitiative('${item.id}');true;`);
  };

  const handleMessage = (event) => {
    try {
      const message = JSON.parse(event.nativeEvent.data);
      if (message.type === 'initiative') setSelectedId(message.id);
    } catch {
      // Ignore messages that do not come from the map bridge.
    }
  };

  return (
    <View style={styles.screen}>
      {mapError ? (
        <View style={styles.mapFallback}>
          <Ionicons color={colors.signal} name="map" size={42} />
          <Text style={styles.fallbackTitle}>Mapa jest chwilowo niedostępna</Text>
          <Text style={styles.fallbackText}>Sprawdź połączenie z internetem. Pozostałe ekrany nadal działają.</Text>
        </View>
      ) : (
        <WebView
          ref={webView}
          allowFileAccess={false}
          javaScriptEnabled
          onError={() => setMapError(true)}
          onHttpError={() => setMapError(true)}
          onMessage={handleMessage}
          onLoadEnd={() => {
            const location = latestLocation.current;
            if (location) {
              webView.current?.injectJavaScript(
                `window.movePlayer && window.movePlayer(${location.coords.longitude},${location.coords.latitude},true);window.setPlayerHeading && window.setPlayerHeading(${latestHeading.current});true;`,
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

      <View style={styles.topOverlay} pointerEvents="box-none">
        <View style={styles.searchBar}>
          <Ionicons color={colors.muted} name="search" size={20} />
          <TextInput onChangeText={setQuery} placeholder="Szukaj ulicy lub działania" placeholderTextColor={colors.muted} style={styles.searchInput} value={query} />
          <Pressable onPress={() => setShowFilters(!showFilters)} style={[styles.filterButton, showFilters && styles.filterButtonActive]}><Ionicons color={showFilters ? colors.surface : colors.ink} name="options" size={20} /></Pressable>
        </View>
        {showFilters && (
          <View style={styles.filters}>
            {['Wszystkie', 'Misja', 'Rajd', 'Szare miejsce'].map((value) => (
              <Pressable key={value} onPress={() => setFilter(value)} style={[styles.filterChip, filter === value && styles.filterChipActive]}>
                <Text style={[styles.filterChipText, filter === value && styles.filterChipTextActive]}>{value}</Text>
              </Pressable>
            ))}
          </View>
        )}
        {query.length > 0 && (
          <View style={styles.searchResults}>
            {searchResults.length > 0 ? searchResults.slice(0, 3).map((item) => (
              <Pressable key={item.id} onPress={() => selectFromSearch(item)} style={styles.searchResult}>
                <View style={[styles.searchResultDot, { backgroundColor: item.color }]} />
                <View style={styles.searchResultCopy}><Text numberOfLines={1} style={styles.searchResultTitle}>{item.title}</Text><Text style={styles.searchResultMeta}>{item.address} · {item.distance}</Text></View>
                <Ionicons color={colors.muted} name="chevron-forward" size={18} />
              </Pressable>
            )) : <Text style={styles.noResults}>Brak pasujących działań.</Text>}
          </View>
        )}
        <View style={styles.overlayRow}>
          <RoleSwitcher compact role={role} onChange={onRoleChange} />
          <View style={styles.points}><View style={styles.pointsDot} /><Text style={styles.pointsText}>{role === 'ngo' ? 'PANEL NGO' : '860 PKT'}</Text></View>
        </View>
      </View>

      <View style={styles.mapActions}>
        <Pressable
          accessibilityLabel="Wycentruj mapę na swojej pozycji"
          onPress={() => webView.current?.injectJavaScript('window.focusPlayer && window.focusPlayer();true;')}
          style={styles.roundAction}
        >
          <Ionicons color={colors.signal} name="locate" size={22} />
        </Pressable>
      </View>

      <Pressable onPress={() => onOpenInitiative(selected)} style={({ pressed }) => [styles.quickCard, pressed && styles.pressed]}>
        <View style={[styles.quickMarker, { backgroundColor: selected.color }]}><Text style={styles.quickMarkerText}>{selected.marker}</Text></View>
        <View style={styles.quickCopy}>
          <View style={styles.quickTop}>
            <StatusChip tone={selected.type === 'Rajd' ? 'violet' : selected.type === 'Szare miejsce' ? 'grey' : 'blue'}>{selected.type}</StatusChip>
            <Text style={styles.quickDistance}>{selected.distance}</Text>
          </View>
          <Text numberOfLines={1} style={styles.quickTitle}>{selected.title}</Text>
          <Text style={styles.quickMeta}>{selected.date} · {selected.people} osób</Text>
        </View>
        <Ionicons color={colors.signal} name="chevron-forward" size={22} />
      </Pressable>

      <Pressable accessibilityLabel="Dodaj inicjatywę" onPress={onCreate} style={({ pressed }) => [styles.fab, role === 'ngo' && styles.fabNgo, pressed && styles.pressed]}>
        <Ionicons color={colors.surface} name="add" size={31} />
      </Pressable>
      <BottomNav active="map" onSelect={onNavigate} role={role} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: colors.background, flex: 1 },
  map: { backgroundColor: '#E8EDF5', flex: 1 },
  loader: { bottom: 0, left: 0, position: 'absolute', right: 0, top: 0 },
  mapFallback: { alignItems: 'center', flex: 1, justifyContent: 'center', padding: 40 },
  fallbackTitle: { color: colors.ink, fontFamily: fonts.heading, fontSize: 21, marginTop: 18, textAlign: 'center' },
  fallbackText: { color: colors.muted, fontFamily: fonts.body, fontSize: 14, lineHeight: 21, marginTop: 8, textAlign: 'center' },
  topOverlay: { left: 12, position: 'absolute', right: 12, top: 12, zIndex: 10 },
  searchBar: { alignItems: 'center', backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 18, borderWidth: 1, flexDirection: 'row', gap: 9, minHeight: 54, paddingLeft: 16, paddingRight: 6, ...shadow },
  searchInput: { color: colors.ink, flex: 1, fontFamily: fonts.body, fontSize: 14, height: 50 },
  filterButton: { alignItems: 'center', backgroundColor: colors.greySoft, borderRadius: 14, height: 42, justifyContent: 'center', width: 42 },
  filterButtonActive: { backgroundColor: colors.signal },
  filters: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 16, borderWidth: 1, flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginTop: 7, padding: 9, ...shadow },
  filterChip: { backgroundColor: colors.greySoft, borderRadius: 999, paddingHorizontal: 11, paddingVertical: 8 },
  filterChipActive: { backgroundColor: colors.signal },
  filterChipText: { color: colors.muted, fontFamily: fonts.bodyBold, fontSize: 11 },
  filterChipTextActive: { color: colors.surface },
  searchResults: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 16, borderWidth: 1, marginTop: 7, overflow: 'hidden', ...shadow },
  searchResult: { alignItems: 'center', borderBottomColor: colors.border, borderBottomWidth: StyleSheet.hairlineWidth, flexDirection: 'row', gap: 10, minHeight: 58, paddingHorizontal: 13 },
  searchResultDot: { borderRadius: 7, height: 14, width: 14 },
  searchResultCopy: { flex: 1 },
  searchResultTitle: { color: colors.ink, fontFamily: fonts.bodyBold, fontSize: 13 },
  searchResultMeta: { color: colors.muted, fontFamily: fonts.body, fontSize: 11, marginTop: 2 },
  noResults: { color: colors.muted, fontFamily: fonts.body, fontSize: 13, padding: 16, textAlign: 'center' },
  overlayRow: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginTop: 9 },
  points: { alignItems: 'center', backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 999, borderWidth: 1, flexDirection: 'row', gap: 7, minHeight: 38, paddingHorizontal: 13, ...shadow },
  pointsDot: { backgroundColor: colors.violet, borderRadius: 4, height: 8, width: 8 },
  pointsText: { color: colors.ink, fontFamily: fonts.bodyBold, fontSize: 11, letterSpacing: 0.5 },
  mapActions: { gap: 9, position: 'absolute', right: 14, top: 130, zIndex: 5 },
  roundAction: { alignItems: 'center', backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 23, borderWidth: 1, height: 46, justifyContent: 'center', width: 46, ...shadow },
  quickCard: { alignItems: 'center', backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 22, borderWidth: 1, bottom: 88, flexDirection: 'row', gap: 12, left: 12, padding: 13, position: 'absolute', right: 12, zIndex: 5, ...shadow },
  quickMarker: { alignItems: 'center', borderRadius: 24, height: 48, justifyContent: 'center', width: 48 },
  quickMarkerText: { color: colors.surface, fontFamily: fonts.headingExtra, fontSize: 17 },
  quickCopy: { flex: 1 },
  quickTop: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  quickDistance: { color: colors.muted, fontFamily: fonts.bodyBold, fontSize: 11 },
  quickTitle: { color: colors.ink, fontFamily: fonts.heading, fontSize: 16, marginTop: 6 },
  quickMeta: { color: colors.muted, fontFamily: fonts.body, fontSize: 11, marginTop: 3 },
  fab: { alignItems: 'center', backgroundColor: colors.signal, borderColor: colors.surface, borderRadius: 31, borderWidth: 5, bottom: 62, height: 62, justifyContent: 'center', left: '50%', marginLeft: -31, position: 'absolute', width: 62, zIndex: 6, ...shadow },
  fabNgo: { backgroundColor: colors.violet },
  pressed: { opacity: 0.8, transform: [{ scale: 0.99 }] },
});
