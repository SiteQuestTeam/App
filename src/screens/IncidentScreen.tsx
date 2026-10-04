import { useEffect, useMemo, useState } from 'react';
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
  { value: 'POLLUTION', label: 'Zanieczyszczenia', icon: 'trash-outline' },
  { value: 'GREENERY', label: 'Zieleń', icon: 'leaf-outline' },
  { value: 'ANIMALS', label: 'Zwierzęta', icon: 'paw-outline' },
  { value: 'OTHER', label: 'Pozostałe', icon: 'ellipsis-horizontal' },
];

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
  const [category, setCategory] = useState<KckCategory>('OTHER');
  const [summary, setSummary] = useState('');
  const [description, setDescription] = useState('');
  const [streetName, setStreetName] = useState('');
  const [buildingNumber, setBuildingNumber] = useState('');
  const [zipCode, setZipCode] = useState('');
  const [coordinates, setCoordinates] = useState<{ latitude: number; longitude: number } | null>(null);
  const [locationLoading, setLocationLoading] = useState(true);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const [incidentId, setIncidentId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const getLocation = async () => {
      setLocationLoading(true);
      setLocationError(null);

      try {
        const enabled = await Location.hasServicesEnabledAsync();
        if (!enabled) {
          if (active) setLocationError('Włącz GPS, aby przygotować zgłoszenie.');
          return;
        }

        const permission = await Location.requestForegroundPermissionsAsync();
        if (!permission.granted) {
          if (active) setLocationError('SideQuest potrzebuje dostępu do GPS dla zgłoszenia KCK.');
          return;
        }

        const result = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
        });

        if (!active) return;
        setCoordinates({
          latitude: result.coords.latitude,
          longitude: result.coords.longitude,
        });
      } catch {
        if (active) setLocationError('Nie udało się pobrać pozycji GPS.');
      } finally {
        if (active) setLocationLoading(false);
      }
    };

    getLocation();
    return () => {
      active = false;
    };
  }, []);

  const isZipValid = /^\d{2}-\d{3}$/.test(zipCode);
  const isValid = Boolean(
    photoUri
      && coordinates
      && summary.trim()
      && description.trim()
      && streetName.trim()
      && buildingNumber.trim()
      && isZipValid,
  );

  const missingFields = useMemo(() => {
    const items: string[] = [];
    if (!photoUri) items.push('Zdjęcie na żywo');
    if (!coordinates) items.push('GPS');
    if (!summary.trim()) items.push('tytuł');
    if (!description.trim()) items.push('opis');
    if (!streetName.trim()) items.push('ulica');
    if (!buildingNumber.trim()) items.push('numer');
    if (!isZipValid) items.push('kod pocztowy');
    return items;
  }, [photoUri, coordinates, summary, description, streetName, buildingNumber, isZipValid]);

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
        setSubmissionError('Formularz jest kompletny. Wysłanie wymaga podpięcia endpointu /kck/submit.');
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

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.screen}
    >
      <ScreenHeader kicker="KCK" title="Zgłoś usterkę" onBack={onBack} />
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.infoCard}>
          <View style={styles.infoIcon}>
            <Ionicons color={colors.signal} name="shield-checkmark-outline" size={22} />
          </View>
          <View style={styles.infoCopy}>
            <Text style={styles.infoTitle}>Zgłoszenie anonimowe</Text>
            <Text style={styles.infoText}>
              Nie zbieramy imienia, nazwiska, e-maila ani telefonu. Ostateczne wysłanie nastąpi dopiero po Twoim potwierdzeniu.
            </Text>
          </View>
        </View>

        <Text style={styles.sectionKicker}>1 · Dowód i lokalizacja</Text>
        <View style={styles.photoCard}>
          {photoUri ? (
            <>
              <Image source={{ uri: photoUri }} style={styles.photo} />
              <View style={styles.photoOverlay}>
                <View style={styles.liveBadge}>
                  <View style={styles.liveDot} />
                  <Text style={styles.liveText}>ZDJĘCIE NA ŻYWO</Text>
                </View>
              </View>
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
                Zrób zdjęcie
              </PrimaryButton>
            </View>
          )}
        </View>

        <View style={styles.gpsCard}>
          <View style={[styles.statusIcon, coordinates && styles.statusIconReady]}>
            {locationLoading
              ? <ActivityIndicator color={colors.signal} size="small" />
              : <Ionicons color={coordinates ? colors.resolved : colors.warning} name={coordinates ? 'location' : 'warning-outline'} size={20} />}
          </View>
          <View style={styles.statusCopy}>
            <Text style={styles.statusTitle}>Lokalizacja GPS</Text>
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
        </View>

        <View style={styles.aiHint}>
          <Ionicons color={colors.violet} name="sparkles-outline" size={18} />
          <Text style={styles.aiHintText}>
            AI i AddressService mogą wstępnie uzupełnić pola poniżej. Zawsze możesz je poprawić przed wysłaniem.
          </Text>
        </View>

        <Text style={styles.sectionKicker}>2 · Dane zgłoszenia</Text>
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

        <Text style={styles.sectionKicker}>3 · Adres</Text>
        <Text style={styles.helperText}>
          Adres powinien zostać wyznaczony z GPS. Jeśli nie jest jednoznaczny, popraw go tutaj.
        </Text>

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

        <View style={styles.reviewCard}>
          <View style={styles.reviewHeader}>
            <Ionicons color={colors.signal} name="eye-outline" size={20} />
            <Text style={styles.reviewTitle}>Przed wysłaniem</Text>
          </View>
          <Text style={styles.reviewText}>
            Sprawdź zdjęcie, kategorię, tytuł, opis i adres. SideQuest nie wybiera wydziału ani urzędu.
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
      </ScrollView>
    </KeyboardAvoidingView>
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
  content: { padding: 16, paddingBottom: 36 },

  infoCard: {
    alignItems: 'flex-start',
    backgroundColor: colors.blueSoft,
    borderColor: '#D9E3FF',
    borderRadius: 20,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    padding: 14,
  },
  infoIcon: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 19,
    height: 38,
    justifyContent: 'center',
    width: 38,
  },
  infoCopy: { flex: 1 },
  infoTitle: { color: colors.ink, fontFamily: fonts.heading, fontSize: 14 },
  infoText: { color: colors.muted, fontFamily: fonts.body, fontSize: 12, lineHeight: 18, marginTop: 3 },

  sectionKicker: {
    color: colors.signal,
    fontFamily: fonts.bodyBold,
    fontSize: 11,
    letterSpacing: 1,
    marginBottom: 10,
    marginTop: 22,
    textTransform: 'uppercase',
  },

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
  photoOverlay: { left: 12, position: 'absolute', top: 12 },
  liveBadge: {
    alignItems: 'center',
    backgroundColor: 'rgba(16,24,40,.78)',
    borderRadius: 999,
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  liveDot: { backgroundColor: colors.error, borderRadius: 4, height: 8, width: 8 },
  liveText: { color: colors.surface, fontFamily: fonts.bodyBold, fontSize: 9, letterSpacing: 0.7 },
  retakeButton: {
    alignItems: 'center',
    alignSelf: 'flex-end',
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
    marginTop: 12,
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

  aiHint: {
    alignItems: 'flex-start',
    backgroundColor: colors.violetSoft,
    borderRadius: 16,
    flexDirection: 'row',
    gap: 9,
    marginTop: 12,
    padding: 12,
  },
  aiHintText: { color: colors.muted, flex: 1, fontFamily: fonts.bodyMedium, fontSize: 11, lineHeight: 16 },

  categories: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
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

  helperText: { color: colors.muted, fontFamily: fonts.body, fontSize: 11, lineHeight: 17, marginBottom: 1 },
  addressRow: { flexDirection: 'row', gap: 10 },
  addressNumber: { flex: 0.75 },
  addressZip: { flex: 1.25 },

  reviewCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 18,
    borderWidth: 1,
    marginTop: 22,
    padding: 14,
  },
  reviewHeader: { alignItems: 'center', flexDirection: 'row', gap: 8 },
  reviewTitle: { color: colors.ink, fontFamily: fonts.heading, fontSize: 14 },
  reviewText: { color: colors.muted, fontFamily: fonts.body, fontSize: 11, lineHeight: 17, marginTop: 7 },

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

  submitButton: { marginTop: 18 },
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
