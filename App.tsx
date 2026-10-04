import { useEffect, useMemo, useRef, useState } from 'react';
import { StatusBar, StyleSheet } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import { useFonts as useManropeFonts, Manrope_700Bold, Manrope_800ExtraBold } from '@expo-google-fonts/manrope';
import { useFonts as useInterFonts, Inter_400Regular, Inter_500Medium, Inter_700Bold } from '@expo-google-fonts/inter';
import { MapScreen } from './src/screens/MapScreen';
import { DetailScreen } from './src/screens/DetailScreen';
import { CreatorScreen } from './src/screens/CreatorScreen';
import { CameraScreen } from './src/screens/CameraScreen';
import { IncidentScreen } from './src/screens/IncidentScreen';
import { PermissionGateScreen } from './src/screens/PermissionGateScreen';
import { InitiativesScreen, ProfileScreen, RewardsScreen, SignInScreen } from './src/screens/TabScreens';
import { colors } from './src/theme';
import { initiatives as initialInitiatives } from './src/data';
import type { Initiative, PlayerState, ScreenName } from './src/types';

export default function App() {
  useManropeFonts({ Manrope_700Bold, Manrope_800ExtraBold });
  useInterFonts({ Inter_400Regular, Inter_500Medium, Inter_700Bold });
  const [accessReady, setAccessReady] = useState(false);
  const lastKnownLocationRef = useRef<Location.LocationObject | null>(null);
  const [playerLocation, setPlayerLocation] = useState<Location.LocationObject | null>(null);
  const [locationIssue, setLocationIssue] = useState<string | null>(null);
  const [screen, setScreen] = useState<ScreenName>('signin');
  const [selectedId, setSelectedId] = useState('tea');
  const [photoUri, setPhotoUri] = useState<string | undefined>();
  const [incidentPhotoUri, setIncidentPhotoUri] = useState<string | undefined>();
  const [cameraTarget, setCameraTarget] = useState<'initiative' | 'incident'>('initiative');
  const [initiatives, setInitiatives] = useState<Initiative[]>(initialInitiatives);
  const [player, setPlayer] = useState<PlayerState>({
    nickname: 'Gracz Demo',
    pointsBalance: 860,
    totalPointsEarned: 1460,
    rank: 'Sąsiedzki Inicjator',
  });

  useEffect(() => {
    if (!accessReady) return;

    let active = true;
    let subscription: Location.LocationSubscription | null = null;

    const restoreCachedLocation = async () => {
      try {
        const cached = await Location.getLastKnownPositionAsync({
          maxAge: 15 * 60_000,
          requiredAccuracy: 250,
        });

        if (active && cached) {
          lastKnownLocationRef.current = cached;
          setPlayerLocation((current) => current || cached);
        }

        return cached;
      } catch {
        return null;
      }
    };

    const startLocationTracking = async () => {
      const cached = await restoreCachedLocation();

      try {
        const permission = await Location.getForegroundPermissionsAsync();
        if (!permission.granted) {
          if (active) {
            setPlayerLocation(null);
            setLocationIssue('Brak dostępu do GPS');
          }
          return;
        }

        const servicesEnabled = await Location.hasServicesEnabledAsync();
        if (!servicesEnabled) {
          if (active) {
            setLocationIssue(cached ? 'GPS niedostępny — ostatnia znana lokalizacja' : 'Wyłączony GPS');
          }
          return;
        }

        if (active && cached) {
          setLocationIssue('Łączenie z GPS — ostatnia znana lokalizacja');
        }

        subscription = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.High,
            distanceInterval: 1,
            timeInterval: 1000,
          },
          (next) => {
            if (!active) return;
            lastKnownLocationRef.current = next;
            setPlayerLocation(next);
            setLocationIssue(null);
          },
        );
      } catch {
        if (active) {
          const fallback = lastKnownLocationRef.current || cached;
          if (fallback) {
            setPlayerLocation(fallback);
          }
          setLocationIssue(
            fallback
              ? 'Brak sygnału GPS — ostatnia znana lokalizacja'
              : 'Brak sygnału GPS',
          );
        }
      }
    };

    void startLocationTracking();

    return () => {
      active = false;
      subscription?.remove();
    };
  }, [accessReady]);

  const selected = useMemo(
    () => initiatives.find((item) => item.id === selectedId) || initiatives[0],
    [initiatives, selectedId],
  );

  const navigateTo = (next: ScreenName) => {
    setScreen(next);
  };

  const openInitiative = (initiative: Initiative) => {
    setSelectedId(initiative.id);
    setScreen('detail');
  };

  const vote = (id: string) => {
    const target = initiatives.find((item) => item.id === id);
    const willPass = Boolean(target && target.status !== 'passed' && !target.hasVoted && target.votes + 1 >= target.threshold);
    setInitiatives((current) => current.map((item) => {
      if (item.id !== id || item.hasVoted || item.status === 'passed') return item;
      const votes = Math.min(item.threshold, item.votes + 1);
      return {
        ...item,
        votes,
        marker: votes >= item.threshold ? '✓' : String(votes),
        status: votes >= item.threshold ? 'passed' : 'collecting',
        hasVoted: true,
        color: votes >= item.threshold ? colors.resolved : item.color,
      };
    }));
    setPlayer((current) => ({
      ...current,
      pointsBalance: current.pointsBalance + 10 + (willPass ? 50 : 0),
      totalPointsEarned: current.totalPointsEarned + 10 + (willPass ? 50 : 0),
    }));
  };

  const publishInitiative = (initiative: Initiative) => {
    setInitiatives((current) => [initiative, ...current]);
    setSelectedId(initiative.id);
    setPlayer((current) => ({
      ...current,
      pointsBalance: current.pointsBalance + 100,
      totalPointsEarned: current.totalPointsEarned + 100,
    }));
    setPhotoUri(undefined);
    setScreen('detail');
  };

  const renderScreen = () => {
    switch (screen) {
      case 'signin':
        return <SignInScreen nickname={player.nickname} onContinue={(nickname) => { setPlayer((p) => ({ ...p, nickname })); navigateTo('map'); }} />;
      case 'map':
        return (
          <MapScreen
            initiatives={initiatives}
            onCreate={() => setScreen('creator')}
            onCreateIncident={() => setScreen('incident')}
            onNavigate={navigateTo}
            onOpenInitiative={openInitiative}
            player={player}
            playerLocation={playerLocation}
            locationIssue={locationIssue}
          />
        );
      case 'initiatives':
        return (
          <InitiativesScreen
            initiatives={initiatives}
            locationIssue={locationIssue}
            onNavigate={navigateTo}
            onOpenInitiative={openInitiative}
            playerLocation={playerLocation}
          />
        );
      case 'rewards':
        return <RewardsScreen onNavigate={navigateTo} player={player} onRedeem={(cost) => setPlayer((p) => ({ ...p, pointsBalance: Math.max(0, p.pointsBalance - cost) }))} />;
      case 'profile':
        return <ProfileScreen onNavigate={navigateTo} player={player} />;
      case 'detail':
        return (
          <DetailScreen
            initiative={selected}
            onBack={() => navigateTo('map')}
            onVote={() => vote(selected.id)}
            playerLocation={playerLocation}
          />
        );
      case 'creator':
        return (
          <CreatorScreen
            photoUri={photoUri}
            onCamera={() => {
              setCameraTarget('initiative');
              setScreen('camera');
            }}
            onClose={() => navigateTo('map')}
            onPublish={publishInitiative}
          />
        );
      case 'incident':
        return (
          <IncidentScreen
            photoUri={incidentPhotoUri}
            onBack={() => {
              setIncidentPhotoUri(undefined);
              navigateTo('map');
            }}
            onCamera={() => {
              setCameraTarget('incident');
              setScreen('camera');
            }}
          />
        );
      case 'camera':
        return (
          <CameraScreen
            onBack={() => setScreen(cameraTarget === 'incident' ? 'incident' : 'creator')}
            onCapture={(uri) => {
              if (cameraTarget === 'incident') {
                setIncidentPhotoUri(uri);
                setScreen('incident');
              } else {
                setPhotoUri(uri);
                setScreen('creator');
              }
            }}
          />
        );
      default:
        return null;
    }
  };

  if (!accessReady) {
    return (
      <SafeAreaProvider>
        <StatusBar backgroundColor={colors.background} barStyle="dark-content" />
        <SafeAreaView edges={['top', 'bottom']} style={styles.permissionSafeArea}>
          <PermissionGateScreen onReady={() => setAccessReady(true)} />
        </SafeAreaView>
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <StatusBar backgroundColor={screen === 'camera' ? '#000' : colors.surface} barStyle={screen === 'camera' ? 'light-content' : 'dark-content'} />
      <SafeAreaView edges={screen === 'camera' ? [] : ['top', 'bottom']} style={styles.safeArea}>
        {renderScreen()}
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  safeArea: { backgroundColor: colors.surface, flex: 1 },
  permissionSafeArea: { backgroundColor: colors.background, flex: 1 },
});
