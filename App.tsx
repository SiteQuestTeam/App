import { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, StatusBar, StyleSheet } from 'react-native';
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
import {
  createInitiative,
  createSession,
  getPlayer,
  listInitiatives,
  listRewards,
  prepareKck,
  redeemReward,
  submitKck,
  uploadInitiativePhoto,
  voteInitiative,
} from './src/api';
import type { Initiative, KckIncidentDraft, PlayerState, Reward, ScreenName } from './src/types';

const EMPTY_PLAYER: PlayerState = {
  id: '',
  nickname: 'Gracz Demo',
  pointsBalance: 0,
  totalPointsEarned: 0,
  rank: 'Nowy Gracz',
};

export default function App() {
  useManropeFonts({ Manrope_700Bold, Manrope_800ExtraBold });
  useInterFonts({ Inter_400Regular, Inter_500Medium, Inter_700Bold });
  const [accessReady, setAccessReady] = useState(false);
  const lastKnownLocationRef = useRef<Location.LocationObject | null>(null);
  const [playerLocation, setPlayerLocation] = useState<Location.LocationObject | null>(null);
  const [locationIssue, setLocationIssue] = useState<string | null>(null);
  const [screen, setScreen] = useState<ScreenName>('signin');
  const [selectedId, setSelectedId] = useState('');
  const [photoUri, setPhotoUri] = useState<string | undefined>();
  const [incidentPhotoUri, setIncidentPhotoUri] = useState<string | undefined>();
  const [cameraTarget, setCameraTarget] = useState<'initiative' | 'incident'>('initiative');
  const [initiatives, setInitiatives] = useState<Initiative[]>([]);
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [player, setPlayer] = useState<PlayerState>(EMPTY_PLAYER);

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

  const currentCoordinates = () => {
    if (!playerLocation?.coords) return null;
    return {
      latitude: playerLocation.coords.latitude,
      longitude: playerLocation.coords.longitude,
    };
  };

  const refreshInitiatives = async (playerId = player.id) => {
    if (!playerId) return;
    const next = await listInitiatives(playerId, currentCoordinates());
    setInitiatives(next);
    if (!selectedId && next[0]) setSelectedId(next[0].id);
  };

  const signIn = async (nickname: string) => {
    try {
      const session = await createSession(nickname);
      setPlayer(session);
      const [nextInitiatives, nextRewards] = await Promise.all([
        listInitiatives(session.id, currentCoordinates()),
        listRewards(),
      ]);
      setInitiatives(nextInitiatives);
      setRewards(nextRewards);
      if (nextInitiatives[0]) setSelectedId(nextInitiatives[0].id);
      setScreen('map');
    } catch (error) {
      Alert.alert('Nie udało się połączyć z API', error instanceof Error ? error.message : 'Spróbuj ponownie.');
    }
  };

  const navigateTo = (next: ScreenName) => {
    setScreen(next);
    if (next === 'map' || next === 'initiatives') {
      void refreshInitiatives();
    }
    if (next === 'rewards') {
      void listRewards().then(setRewards).catch(() => {});
    }
    if (next === 'profile' && player.id) {
      void getPlayer(player.id).then(setPlayer).catch(() => {});
    }
  };

  const openInitiative = (initiative: Initiative) => {
    setSelectedId(initiative.id);
    setScreen('detail');
  };

  const vote = async (id: string) => {
    const coordinates = currentCoordinates();
    if (!player.id || !coordinates) {
      Alert.alert('Brak GPS', 'Nie można oddać Głosu bez aktualnej lokalizacji.');
      return;
    }

    try {
      const result = await voteInitiative(id, player.id, coordinates);
      setInitiatives((current) => current.map((item) => item.id === id ? result.initiative : item));
      setPlayer(result.player);
    } catch (error) {
      Alert.alert('Nie udało się oddać Głosu', error instanceof Error ? error.message : 'Spróbuj ponownie.');
      void refreshInitiatives();
    }
  };

  const publishInitiative = async (initiative: Initiative) => {
    if (!player.id) throw new Error('Brak sesji Gracza.');

    const uploadedPhotoUri = initiative.brief.photoUri
      ? await uploadInitiativePhoto(initiative.brief.photoUri)
      : undefined;

    const result = await createInitiative({
      playerId: player.id,
      latitude: initiative.latitude,
      longitude: initiative.longitude,
      title: initiative.brief.title,
      shortTitle: initiative.shortTitle,
      category: initiative.brief.category,
      problem: initiative.brief.problem,
      proposedAction: initiative.brief.proposedAction,
      whyImportant: initiative.brief.whyImportant,
      resources: initiative.brief.resources,
      fixer: initiative.brief.fixer,
      place: initiative.brief.place,
      photoUri: uploadedPhotoUri,
    });

    setInitiatives((current) => [result.initiative, ...current.filter((item) => item.id !== result.initiative.id)]);
    setSelectedId(result.initiative.id);
    setPlayer(result.player);
    setPhotoUri(undefined);
    setScreen('detail');
  };

  const submitIncident = async (draft: KckIncidentDraft) => {
    if (!player.id) throw new Error('Brak sesji Gracza.');

    const prepared = await prepareKck(
      draft.photoUri,
      player.id,
      { latitude: draft.latitude, longitude: draft.longitude },
    );

    if (prepared?.status === 'RETAKE') {
      throw new Error(prepared.message || 'Zrób nowe zdjęcie usterki.');
    }
    if (!prepared?.draftId) {
      throw new Error('Backend nie utworzył szkicu zgłoszenia.');
    }

    const result = await submitKck(prepared.draftId, draft);
    if (result?.incidentId) {
      const nextPlayer = await getPlayer(player.id);
      setPlayer(nextPlayer);
    }
    return { incidentId: String(result?.incidentId || '') };
  };

  const renderScreen = () => {
    switch (screen) {
      case 'signin':
        return <SignInScreen nickname={player.nickname} onContinue={signIn} />;
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
        return (
          <RewardsScreen
            onNavigate={navigateTo}
            player={player}
            rewards={rewards}
            onRedeem={async (rewardId: string) => {
              const result = await redeemReward(rewardId, player.id);
              setPlayer(result.player);
            }}
          />
        );
      case 'profile':
        return <ProfileScreen onNavigate={navigateTo} player={player} />;
      case 'detail':
        return selected ? (
          <DetailScreen
            initiative={selected}
            onBack={() => navigateTo('map')}
            onVote={() => void vote(selected.id)}
            playerLocation={playerLocation}
          />
        ) : null;
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
            onSubmit={submitIncident}
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
