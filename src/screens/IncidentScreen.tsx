import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { PrimaryButton, ScreenHeader } from '../components';
import { colors, fonts, shadow } from '../theme';
import type { KckCategory, KckIncidentDraft } from '../types';

const CATEGORIES: Array<{ value: KckCategory; label: string; icon: string }> = [
  { value: 'DAMAGE', label: 'Uszkodzenia', icon: 'construct-outline' },
  { value: 'POLLUTION', label: 'Zanieczyszczenia i odory', icon: 'trash-outline' },
  { value: 'GREENERY', label: 'Zieleń', icon: 'leaf-outline' },
  { value: 'ANIMALS', label: 'Zwierzęta', icon: 'paw-outline' },
  { value: 'OTHER', label: 'Pozostałe', icon: 'ellipsis-horizontal' },
];

const STAGES = [
  { id: 1, label: 'Zdjęcie' },
  { id: 2, label: 'Opis' },
  { id: 3, label: 'Lokalizacja' },
  { id: 4, label: 'Sprawdź' },
] as const;

const normalizeZipCode = (value: string) => {
  const digits = value.replace(/\D/g, '').slice(0, 5);
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}-${digits.slice(2)}`;
};

export function IncidentScreen({
  onBack,
  onCamera,
  photoUri,
  onSubmit,
}: {
  onBack: () => void;
  onCamera: () => void;
  photoUri?: string;
  onSubmit?: (draft: KckIncidentDraft) => Promise<{ incidentId: string }>;
}) {
  const scrollRef = useRef<ScrollView>(null);
  const [stage, setStage] = useState(photoUri ? 2 : 1);
  const [category, setCategory] = useState<KckCategory>('OTHER');
  const [summary, setSummary] = useState('');
  const [description, setDescription] = useState('');
  const [streetName, setStreetName] = useState('');
  const [buildingNumber, setBuildingNumber] = useState('');
  const [zipCode, setZipCode] = useState('');
  const [coordinates, setCoordinates] = useState<{ latitude: number; longitude: number } | null>(null);
  const [locationLoading, setLocationLoading] = useState(true);
  const [geocodingLoading, setGeocodingLoading] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [addressHint, setAddressHint] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const [incidentId, setIncidentId] = useState<string | null>(null);

  const loadLocationAndAddress = async () => {
    setLocationLoading(true);
    setGeocodingLoading(false);
    setLocationError(null);
    setAddressHint(null);

    try {
      const enabled = await Location.hasServicesEnabledAsync();
      if (!enabled) {
        setLocationError('Włącz GPS, aby automatycznie ustalić adres.');
        return;
      }

      const permission = await Location.requestForegroundPermissionsAsync();
      if (!permission.granted) {
        setLocationError('SideQuest potrzebuje dostępu do GPS dla zgłoszenia KCK.');
        return;
      }

      const result = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      const nextCoordinates = {
        latitude: result.coords.latitude,
        longitude: result.coords.longitude,
      };
      setCoordinates(nextCoordinates);
      setLocationLoading(false);
      setGeocodingLoading(true);

      try {
        const places = await Location.reverseGeocodeAsync(nextCoordinates);
        const address = places[0];

        if (!address) {
          setAddressHint('Nie znaleziono jednoznacznego adresu. Uzupełnij go ręcznie.');
          return;
        }

        const detectedStreet = address.street || address.name || '';
        const detectedNumber = address.streetNumber || '';
        const detectedZip = address.postalCode ? normalizeZipCode(address.postalCode) : '';

        if (detectedStreet) setStreetName(detectedStreet);
        if (detectedNumber) setBuildingNumber(detectedNumber);
        if (detectedZip) setZipCode(detectedZip);

        const autoFilled = [detectedStreet, detectedNumber, detectedZip].filter(Boolean).length;
        if (autoFilled === 3) {
          setAddressHint('Adres uzupełniony automatycznie na podstawie GPS.');
        } else {
          setAddressHint('Adres rozpoznany częściowo. Sprawdź brakujące pola.');
        }
      } catch {
        setAddressHint('GPS działa, ale nie udało się rozpoznać adresu. Uzupełnij go ręcznie.');
      } finally {
        setGeocodingLoading(false);
      }
    } catch {
      setLocationError('Nie udało się pobrać bieżącej pozycji GPS.');
    } finally {
      setLocationLoading(false);
    }
  };

  useEffect(() => {
    loadLocationAndAddress();
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ y: 0, animated: true });
  }, [stage]);

  const isZipValid = /^\d{2}-\d{3}$/.test(zipCode);
  const descriptionStageValid = Boolean(summary.trim() && description.trim());
  const locationStageValid = Boolean(
    coordinates
      && streetName.trim()
      && buildingNumber.trim()
      && isZipValid,
  );
  const isValid = Boolean(photoUri && descriptionStageValid && locationStageValid);

  const missingFields = useMemo(() => {
    const items: string[] = [];
    if (!photoUri) items.push('Zdjęcie na żywo');
    if (!summary.trim()) items.push('tytuł');
    if (!description.trim()) items.push('opis');
    if (!coordinates) items.push('GPS');
    if (!streetName.trim()) items.push('ulica');
    if (!buildingNumber.trim()) items.push('numer');
    if (!isZipValid) items.push('kod pocztowy');
    return items;
  }, [photoUri, coordinates, summary, description, streetName, buildingNumber, isZipValid]);

  const goToStage = (nextStage: number) => {
    if (nextStage < stage) {
      setStage(nextStage);
      return;
    }

    if (stage === 1 && !photoUri) return;
    if (stage === 2 && !descriptionStageValid) return;
    if (stage === 3 && !locationStageValid) return;

    setStage(nextStage);
  };

  const submit = async () => {
    if (!isValid || !photoUri || !coordinates || submitting) return;

    setSubmissionError(null);
    setSubmitting(true);

    const draft: KckIncidentDraft = {
      photoUri,
      category,
      summary: summary.trim(),
      description: description.trim(),
      streetName: streetName.trim(),
      buildingNumber: buildingNumber.trim(),
      zipCode,
      latitude: coordinates.latitude,
      longitude: coordinates.longitude,
    };

    try {
      if (!onSubmit) {
        setSubmissionError('Formularz jest kompletny, ale wysyłka do KCK nie jest jeszcze podpięta w tej wersji aplikacji.');
        return;
      }

      const result = await onSubmit(draft);
      if (!result?.incidentId) {
        setSubmissionError('KCK nie zwróciło numeru zgłoszenia. Zgłoszenie nie zostało potwierdzone.');
        return;
      }

      setIncidentId(String(result.incidentId));
    } catch {
      setSubmissionError('Nie udało się przekazać zgłoszenia do KCK. Zgłoszenie nie zostało wysłane.');
    } finally {
      setSubmitting(false);
    }
  };

  if (incidentId) {
    return (
      <View style={styles.screen}>
        <ScreenHeader kicker="KCK" title="Zgłoszenie wysłane" onBack={onBack} />
        <View style={styles.successContent}>
          <View style={styles.successIcon}>
            <Ionicons color={colors.resolved} name="checkmark-circle" size={48} />
          </View>
          <Text style={styles.successTitle}>Zgłoszenie przekazane do KCK</Text>
          <Text style={styles.successLabel}>Numer zgłoszenia</Text>
          <Text selectable style={styles.incidentId}>{incidentId}</Text>
          <Text style={styles.successBody}>
            Punkty mogą zostać naliczone dopiero po potwierdzonym przyjęciu zgłoszenia przez KCK.
          </Text>
          <PrimaryButton icon="map-outline" onPress={onBack}>Wróć do mapy</PrimaryButton>
        </View>
      </View>
    );
  }

  const renderStage = () => {
    if (stage === 1) {
      return (
        <>
          <Text style={styles.stageTitle}>Pokaż usterkę</Text>
          <Text style={styles.stageDescription}>
            Zrób wyraźne zdjęcie usterki, tak aby dobrze było widać problem.
          </Text>

          <View style={styles.photoCard}>
            {photoUri ? (
              <>
                <Image source={{ uri: photoUri }} style={styles.photo} />
                <Pressable onPress={onCamera} style={styles.retakeButton}>
                  <Ionicons color={colors.ink} name="camera-outline" size={18} />
                  <Text style={styles.retakeText}>Zrób ponownie</Text>
                </Pressable>
              </>
            ) : (
              <View style={styles.photoEmpty}>
                <View style={styles.photoEmptyIcon}>
                  <Ionicons color={colors.signal} name="camera-outline" size={30} />
                </View>
                <Text style={styles.photoEmptyTitle}>Zrób zdjęcie usterki</Text>
                <Text style={styles.photoEmptyBody}>Tylko aparat w aplikacji — bez wyboru z galerii.</Text>
                <PrimaryButton icon="camera" onPress={onCamera} style={styles.photoButton}>
                  Otwórz aparat
                </PrimaryButton>
              </View>
            )}
          </View>

          <PrimaryButton
            disabled={!photoUri}
            icon="arrow-forward"
            onPress={() => goToStage(2)}
            style={styles.nextButton}
          >
            Dalej
          </PrimaryButton>
        </>
      );
    }

    if (stage === 2) {
      return (
        <>
          <Text style={styles.stageTitle}>Co się stało?</Text>
          <Text style={styles.stageDescription}>
            Wybierz kategorię i sprawdź opis. Docelowo AI może uzupełnić te pola ze zdjęcia, ale zawsze pozostają edytowalne.
          </Text>

          <Text style={styles.fieldLabel}>Kategoria KCK</Text>
          <View style={styles.categories}>
            {CATEGORIES.map((item) => {
              const selected = category === item.value;
              return (
                <Pressable
                  key={item.value}
                  onPress={() => setCategory(item.value)}
                  style={[styles.categoryPill, selected && styles.categoryPillActive]}
                >
                  <Ionicons color={selected ? colors.surface : colors.signal} name={item.icon as any} size={16} />
                  <Text style={[styles.categoryText, selected && styles.categoryTextActive]}>{item.label}</Text>
                </Pressable>
              );
            })}
          </View>

          <Field
            label="Tytuł"
            value={summary}
            onChangeText={(value) => setSummary(value.slice(0, 60))}
            placeholder="Krótko: co jest uszkodzone?"
            counter={`${summary.length}/60`}
          />

          <Field
            label="Opis"
            value={description}
            onChangeText={(value) => setDescription(value.slice(0, 500))}
            placeholder="Opisz tylko to, co rzeczywiście widać."
            counter={`${description.length}/500`}
            multiline
          />

          <StageActions
            backLabel="Wstecz"
            nextDisabled={!descriptionStageValid}
            onBack={() => goToStage(1)}
            onNext={() => goToStage(3)}
          />
        </>
      );
    }

    if (stage === 3) {
      return (
        <>
          <Text style={styles.stageTitle}>Lokalizacja</Text>
          <Text style={styles.stageDescription}>
            GPS i reverse geocoding próbują uzupełnić adres automatycznie. Sprawdź go tylko wtedy, gdy coś się nie zgadza.
          </Text>

          <LocationStatus
            coordinates={coordinates}
            geocodingLoading={geocodingLoading}
            locationError={locationError}
            locationLoading={locationLoading}
          />

          {addressHint && (
            <View style={[styles.addressStatus, locationStageValid && styles.addressStatusReady]}>
              <Ionicons
                color={locationStageValid ? colors.resolved : colors.warning}
                name={locationStageValid ? 'checkmark-circle-outline' : 'information-circle-outline'}
                size={19}
              />
              <Text style={styles.addressStatusText}>{addressHint}</Text>
            </View>
          )}

          <Pressable
            disabled={locationLoading || geocodingLoading}
            onPress={loadLocationAndAddress}
            style={({ pressed }) => [styles.refreshLocation, pressed && styles.pressed]}
          >
            <Ionicons color={colors.signal} name="locate-outline" size={18} />
            <Text style={styles.refreshLocationText}>
              {locationLoading || geocodingLoading ? 'Ustalanie lokalizacji…' : 'Ustal ponownie'}
            </Text>
          </Pressable>

          <Field
            label="Ulica"
            value={streetName}
            onChangeText={setStreetName}
            placeholder="np. Stanisława Lema"
          />

          <View style={styles.addressRow}>
            <View style={styles.addressNumber}>
              <Field
                label="Numer"
                value={buildingNumber}
                onChangeText={setBuildingNumber}
                placeholder="np. 7"
              />
            </View>
            <View style={styles.addressZip}>
              <Field
                label="Kod pocztowy"
                value={zipCode}
                onChangeText={(value) => setZipCode(normalizeZipCode(value))}
                placeholder="31-571"
                keyboardType="number-pad"
                error={zipCode.length > 0 && !isZipValid ? 'Format: 00-000' : undefined}
              />
            </View>
          </View>

          <StageActions
            backLabel="Wstecz"
            nextDisabled={!locationStageValid}
            onBack={() => goToStage(2)}
            onNext={() => goToStage(4)}
          />
        </>
      );
    }

    return (
      <>
        <Text style={styles.stageTitle}>Sprawdź i wyślij</Text>
        <Text style={styles.stageDescription}>
          To ostatni krok. Nic nie trafi do KCK, dopóki nie naciśniesz „Wyślij do KCK”.
        </Text>

        <View style={styles.reviewPhotoCard}>
          {photoUri ? <Image source={{ uri: photoUri }} style={styles.reviewPhoto} /> : null}
          <View style={styles.reviewPhotoCopy}>
            <Text style={styles.reviewLabel}>Kategoria</Text>
            <Text style={styles.reviewStrong}>
              {CATEGORIES.find((item) => item.value === category)?.label}
            </Text>
            <Text numberOfLines={2} style={styles.reviewSummary}>{summary}</Text>
          </View>
        </View>

        <ReviewRow icon="document-text-outline" label="Opis" value={description} onEdit={() => goToStage(2)} />
        <ReviewRow
          icon="location-outline"
          label="Adres"
          value={`${streetName} ${buildingNumber}, ${zipCode}`}
          onEdit={() => goToStage(3)}
        />
        {coordinates && (
          <ReviewRow
            icon="navigate-outline"
            label="GPS"
            value={`${coordinates.latitude.toFixed(5)}, ${coordinates.longitude.toFixed(5)}`}
          />
        )}

        <View style={styles.privacyCard}>
          <Ionicons color={colors.signal} name="shield-checkmark-outline" size={20} />
          <Text style={styles.privacyText}>
            Zgłoszenie jest anonimowe. Nie wysyłamy imienia, nazwiska, e-maila ani telefonu.
          </Text>
        </View>

        {!isValid && (
          <Text style={styles.missingText}>
            Uzupełnij: {missingFields.join(', ')}.
          </Text>
        )}

        {submissionError && (
          <View style={styles.errorCard}>
            <Ionicons color={colors.error} name="alert-circle-outline" size={20} />
            <Text style={styles.errorText}>{submissionError}</Text>
          </View>
        )}

        <StageActions
          backLabel="Wstecz"
          hideNext
          onBack={() => goToStage(3)}
          onNext={() => {}}
        />

        <PrimaryButton
          disabled={!isValid || submitting}
          icon="send-outline"
          onPress={submit}
          style={styles.submitButton}
        >
          {submitting ? 'Wysyłanie…' : 'Wyślij do KCK'}
        </PrimaryButton>

        <Text style={styles.footerNote}>
          Punkty są przyznawane dopiero po otrzymaniu prawidłowego numeru incidentId z KCK.
        </Text>
      </>
    );
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.screen}
    >
      <ScreenHeader kicker="KCK" title="Zgłoś usterkę" onBack={onBack} />
      <StageProgress stage={stage} onSelect={goToStage} />
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {renderStage()}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function StageProgress({ stage, onSelect }: { stage: number; onSelect: (stage: number) => void }) {
  return (
    <View style={styles.progressWrap}>
      {STAGES.map((item, index) => {
        const active = stage === item.id;
        const done = stage > item.id;
        return (
          <View key={item.id} style={styles.progressItem}>
            <Pressable
              disabled={!done}
              onPress={() => onSelect(item.id)}
              style={[styles.progressCircle, (active || done) && styles.progressCircleActive]}
            >
              {done ? (
                <Ionicons color={colors.surface} name="checkmark" size={14} />
              ) : (
                <Text style={[styles.progressNumber, active && styles.progressNumberActive]}>{item.id}</Text>
              )}
            </Pressable>
            <Text numberOfLines={1} style={[styles.progressLabel, active && styles.progressLabelActive]}>
              {item.label}
            </Text>
            {index < STAGES.length - 1 && (
              <View style={[styles.progressLine, done && styles.progressLineActive]} />
            )}
          </View>
        );
      })}
    </View>
  );
}

function LocationStatus({
  coordinates,
  locationLoading,
  geocodingLoading,
  locationError,
}: {
  coordinates: { latitude: number; longitude: number } | null;
  locationLoading: boolean;
  geocodingLoading: boolean;
  locationError: string | null;
}) {
  const busy = locationLoading || geocodingLoading;
  return (
    <View style={styles.gpsCard}>
      <View style={[styles.statusIcon, coordinates && styles.statusIconReady]}>
        {busy
          ? <ActivityIndicator color={colors.signal} size="small" />
          : <Ionicons color={coordinates ? colors.resolved : colors.warning} name={coordinates ? 'location' : 'warning-outline'} size={20} />}
      </View>
      <View style={styles.statusCopy}>
        <Text style={styles.statusTitle}>
          {geocodingLoading ? 'Rozpoznawanie adresu…' : 'Lokalizacja GPS'}
        </Text>
        {locationLoading ? (
          <Text style={styles.statusText}>Pobieranie bieżącej pozycji…</Text>
        ) : coordinates ? (
          <Text style={styles.statusText}>
            {coordinates.latitude.toFixed(5)}, {coordinates.longitude.toFixed(5)}
          </Text>
        ) : (
          <Text style={[styles.statusText, styles.statusError]}>{locationError}</Text>
        )}
      </View>
      {coordinates && !busy ? <Ionicons color={colors.resolved} name="checkmark-circle" size={20} /> : null}
    </View>
  );
}

function StageActions({
  onBack,
  onNext,
  nextDisabled = false,
  backLabel,
  hideNext = false,
}: {
  onBack: () => void;
  onNext: () => void;
  nextDisabled?: boolean;
  backLabel: string;
  hideNext?: boolean;
}) {
  return (
    <View style={styles.stageActions}>
      <Pressable onPress={onBack} style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}>
        <Ionicons color={colors.ink} name="arrow-back" size={18} />
        <Text style={styles.backButtonText}>{backLabel}</Text>
      </Pressable>
      {!hideNext && (
        <Pressable
          disabled={nextDisabled}
          onPress={onNext}
          style={({ pressed }) => [
            styles.nextStageButton,
            nextDisabled && styles.nextStageButtonDisabled,
            pressed && !nextDisabled && styles.pressed,
          ]}
        >
          <Text style={styles.nextStageButtonText}>Dalej</Text>
          <Ionicons color={colors.surface} name="arrow-forward" size={18} />
        </Pressable>
      )}
    </View>
  );
}

function ReviewRow({
  icon,
  label,
  value,
  onEdit,
}: {
  icon: string;
  label: string;
  value: string;
  onEdit?: () => void;
}) {
  return (
    <View style={styles.reviewRow}>
      <View style={styles.reviewRowIcon}>
        <Ionicons color={colors.signal} name={icon as any} size={19} />
      </View>
      <View style={styles.reviewRowCopy}>
        <Text style={styles.reviewLabel}>{label}</Text>
        <Text style={styles.reviewValue}>{value}</Text>
      </View>
      {onEdit ? (
        <Pressable onPress={onEdit} style={styles.editButton}>
          <Text style={styles.editButtonText}>Edytuj</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function Field({
  label,
  value,
  onChangeText,
  placeholder,
  multiline = false,
  counter,
  keyboardType,
  error,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  multiline?: boolean;
  counter?: string;
  keyboardType?: 'default' | 'number-pad';
  error?: string;
}) {
  return (
    <View style={styles.field}>
      <View style={styles.fieldHeader}>
        <Text style={styles.fieldLabel}>{label}</Text>
        {counter ? <Text style={styles.counter}>{counter}</Text> : null}
      </View>
      <TextInput
        keyboardType={keyboardType}
        multiline={multiline}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#98A2B3"
        style={[styles.input, multiline && styles.textarea, error && styles.inputError]}
        textAlignVertical={multiline ? 'top' : 'center'}
        value={value}
      />
      {error ? <Text style={styles.inputErrorText}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: colors.background, flex: 1 },
  content: { padding: 16, paddingBottom: 38 },

  progressWrap: {
    alignItems: 'flex-start',
    backgroundColor: colors.surface,
    borderBottomColor: colors.border,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  progressItem: { alignItems: 'center', flex: 1, position: 'relative' },
  progressCircle: {
    alignItems: 'center',
    backgroundColor: colors.greySoft,
    borderRadius: 15,
    height: 30,
    justifyContent: 'center',
    width: 30,
    zIndex: 2,
  },
  progressCircleActive: { backgroundColor: colors.signal },
  progressNumber: { color: colors.muted, fontFamily: fonts.bodyBold, fontSize: 11 },
  progressNumberActive: { color: colors.surface },
  progressLabel: { color: colors.muted, fontFamily: fonts.bodyMedium, fontSize: 9, marginTop: 5 },
  progressLabelActive: { color: colors.signal, fontFamily: fonts.bodyBold },
  progressLine: {
    backgroundColor: colors.border,
    height: 2,
    left: '66%',
    position: 'absolute',
    top: 14,
    width: '68%',
  },
  progressLineActive: { backgroundColor: colors.signal },

  stageTitle: { color: colors.ink, fontFamily: fonts.headingExtra, fontSize: 24 },
  stageDescription: { color: colors.muted, fontFamily: fonts.body, fontSize: 13, lineHeight: 20, marginBottom: 18, marginTop: 6 },

  photoCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 24,
    borderWidth: 1,
    minHeight: 220,
    overflow: 'hidden',
    ...shadow,
  },
  photo: { height: 230, width: '100%' },
  retakeButton: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 999,
    borderWidth: 1,
    bottom: 12,
    flexDirection: 'row',
    gap: 7,
    paddingHorizontal: 12,
    paddingVertical: 8,
    position: 'absolute',
    right: 12,
  },
  retakeText: { color: colors.ink, fontFamily: fonts.bodyBold, fontSize: 11 },
  photoEmpty: { alignItems: 'center', justifyContent: 'center', minHeight: 220, padding: 24 },
  photoEmptyIcon: {
    alignItems: 'center',
    backgroundColor: colors.blueSoft,
    borderRadius: 26,
    height: 58,
    justifyContent: 'center',
    width: 58,
  },
  photoEmptyTitle: { color: colors.ink, fontFamily: fonts.heading, fontSize: 17, marginTop: 12 },
  photoEmptyBody: { color: colors.muted, fontFamily: fonts.body, fontSize: 12, marginTop: 5, textAlign: 'center' },
  photoButton: { marginTop: 18, minWidth: 190 },

  gpsCard: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 11,
    marginTop: 14,
    padding: 13,
  },
  statusIcon: {
    alignItems: 'center',
    backgroundColor: '#FFF5DF',
    borderRadius: 18,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  statusIconReady: { backgroundColor: colors.mintSoft },
  statusCopy: { flex: 1 },
  statusTitle: { color: colors.ink, fontFamily: fonts.bodyBold, fontSize: 12 },
  statusText: { color: colors.muted, fontFamily: fonts.body, fontSize: 11, marginTop: 2 },
  statusError: { color: colors.warning },

  categories: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 4 },
  categoryPill: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 7,
    minHeight: 42,
    paddingHorizontal: 12,
  },
  categoryPillActive: { backgroundColor: colors.signal, borderColor: colors.signal },
  categoryText: { color: colors.ink, fontFamily: fonts.bodyBold, fontSize: 11 },
  categoryTextActive: { color: colors.surface },

  field: { marginTop: 14 },
  fieldHeader: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginBottom: 7 },
  fieldLabel: { color: colors.ink, fontFamily: fonts.bodyBold, fontSize: 12 },
  counter: { color: colors.muted, fontFamily: fonts.body, fontSize: 10 },
  input: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 16,
    borderWidth: 1,
    color: colors.ink,
    fontFamily: fonts.body,
    fontSize: 15,
    minHeight: 52,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  textarea: { minHeight: 126, paddingTop: 14 },
  inputError: { borderColor: colors.error },
  inputErrorText: { color: colors.error, fontFamily: fonts.bodyMedium, fontSize: 10, marginTop: 5 },

  addressStatus: {
    alignItems: 'flex-start',
    backgroundColor: '#FFF5DF',
    borderRadius: 16,
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
    padding: 12,
  },
  addressStatusReady: { backgroundColor: colors.mintSoft },
  addressStatusText: { color: colors.muted, flex: 1, fontFamily: fonts.bodyMedium, fontSize: 11, lineHeight: 16 },
  refreshLocation: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    flexDirection: 'row',
    gap: 7,
    marginTop: 12,
    paddingVertical: 6,
  },
  refreshLocationText: { color: colors.signal, fontFamily: fonts.bodyBold, fontSize: 11 },
  addressRow: { flexDirection: 'row', gap: 10 },
  addressNumber: { flex: 0.75 },
  addressZip: { flex: 1.25 },

  stageActions: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'space-between',
    marginTop: 24,
  },
  backButton: {
    alignItems: 'center',
    borderColor: colors.border,
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 7,
    minHeight: 50,
    paddingHorizontal: 16,
  },
  backButtonText: { color: colors.ink, fontFamily: fonts.bodyBold, fontSize: 13 },
  nextStageButton: {
    alignItems: 'center',
    backgroundColor: colors.signal,
    borderRadius: 16,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    minHeight: 50,
    minWidth: 126,
    paddingHorizontal: 18,
  },
  nextStageButtonDisabled: { backgroundColor: '#CBD2DC' },
  nextStageButtonText: { color: colors.surface, fontFamily: fonts.bodyBold, fontSize: 13 },
  nextButton: { marginTop: 20 },
  pressed: { opacity: 0.8, transform: [{ scale: 0.99 }] },

  reviewPhotoCard: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 20,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    overflow: 'hidden',
    paddingRight: 14,
    ...shadow,
  },
  reviewPhoto: { height: 96, width: 96 },
  reviewPhotoCopy: { flex: 1, paddingVertical: 10 },
  reviewLabel: { color: colors.muted, fontFamily: fonts.bodyBold, fontSize: 9, letterSpacing: 0.7, textTransform: 'uppercase' },
  reviewStrong: { color: colors.signal, fontFamily: fonts.bodyBold, fontSize: 11, marginTop: 3 },
  reviewSummary: { color: colors.ink, fontFamily: fonts.heading, fontSize: 14, lineHeight: 18, marginTop: 5 },
  reviewRow: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
    padding: 13,
  },
  reviewRowIcon: {
    alignItems: 'center',
    backgroundColor: colors.blueSoft,
    borderRadius: 18,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  reviewRowCopy: { flex: 1 },
  reviewValue: { color: colors.ink, fontFamily: fonts.bodyMedium, fontSize: 12, lineHeight: 17, marginTop: 3 },
  editButton: { paddingHorizontal: 5, paddingVertical: 6 },
  editButtonText: { color: colors.signal, fontFamily: fonts.bodyBold, fontSize: 11 },

  privacyCard: {
    alignItems: 'flex-start',
    backgroundColor: colors.blueSoft,
    borderRadius: 16,
    flexDirection: 'row',
    gap: 9,
    marginTop: 14,
    padding: 12,
  },
  privacyText: { color: colors.muted, flex: 1, fontFamily: fonts.bodyMedium, fontSize: 11, lineHeight: 16 },

  missingText: { color: colors.warning, fontFamily: fonts.bodyMedium, fontSize: 11, lineHeight: 16, marginTop: 12 },
  errorCard: {
    alignItems: 'flex-start',
    backgroundColor: '#FFF0F2',
    borderRadius: 16,
    flexDirection: 'row',
    gap: 9,
    marginTop: 12,
    padding: 12,
  },
  errorText: { color: colors.error, flex: 1, fontFamily: fonts.bodyMedium, fontSize: 11, lineHeight: 16 },

  submitButton: { marginTop: 12 },
  footerNote: { color: colors.muted, fontFamily: fonts.body, fontSize: 10, lineHeight: 15, marginTop: 10, textAlign: 'center' },

  successContent: { alignItems: 'center', flex: 1, justifyContent: 'center', padding: 28 },
  successIcon: {
    alignItems: 'center',
    backgroundColor: colors.mintSoft,
    borderRadius: 38,
    height: 76,
    justifyContent: 'center',
    width: 76,
  },
  successTitle: { color: colors.ink, fontFamily: fonts.headingExtra, fontSize: 24, marginTop: 18, textAlign: 'center' },
  successLabel: { color: colors.muted, fontFamily: fonts.bodyBold, fontSize: 11, marginTop: 24, textTransform: 'uppercase' },
  incidentId: { color: colors.signal, fontFamily: fonts.headingExtra, fontSize: 28, marginTop: 4 },
  successBody: { color: colors.muted, fontFamily: fonts.body, fontSize: 12, lineHeight: 18, marginBottom: 24, marginTop: 14, textAlign: 'center' },
});
