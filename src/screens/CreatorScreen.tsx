import { useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { WebView } from 'react-native-webview';
import { categories, initiatives } from '../data';
import { PrimaryButton, ScreenHeader, StatusChip } from '../components';
import { createMapHtml } from '../mapHtml';
import { colors, fonts } from '../theme';

export function CreatorScreen({ onClose, onPublish, role }) {
  const [step, setStep] = useState(1);
  const [category, setCategory] = useState('Zieleń');
  const [title, setTitle] = useState(role === 'ngo' ? 'Warsztaty miejskiego ogrodnictwa' : 'Ogród sąsiedzki na pustej działce');
  const [description, setDescription] = useState('Posadzimy zioła i kwiaty, zbudujemy dwie ławki i przygotujemy miejsce spotkań dla sąsiadów.');
  const mapHtml = useMemo(() => createMapHtml([], { compact: true }), []);

  const goBack = () => step === 1 ? onClose() : setStep(step - 1);

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.screen}>
      <ScreenHeader kicker={`Krok ${step} z 3`} onBack={goBack} title={step === 1 ? 'Wybierz kategorię' : step === 2 ? 'Gdzie i kiedy?' : 'Zbierz ekipę'} />
      <View style={styles.progressRow}>{[1, 2, 3].map((number) => <View key={number} style={[styles.progressPart, number <= step && styles.progressPartActive]} />)}</View>

      {step === 1 && (
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.title}>Co chcesz zrobić?</Text>
          <Text style={styles.helper}>Wybierz typ działania, który najlepiej opisuje Twój pomysł.</Text>
          <View style={styles.search}><Ionicons color={colors.muted} name="search" size={20} /><Text style={styles.searchText}>Szukaj kategorii lub pomysłu</Text></View>
          <View style={styles.categoryGrid}>
            {categories.map(([label, icon], index) => {
              const selected = category === label;
              return (
                <Pressable key={label} onPress={() => setCategory(label)} style={[styles.category, selected && styles.categoryActive]}>
                  <View style={[styles.categoryIcon, { backgroundColor: index % 3 === 1 ? colors.violetSoft : index % 3 === 2 ? colors.mintSoft : colors.blueSoft }]}>
                    <Ionicons color={selected ? colors.signal : colors.ink} name={icon} size={21} />
                  </View>
                  <Text style={[styles.categoryText, selected && styles.categoryTextActive]}>{label}</Text>
                  {selected && <Ionicons color={colors.signal} name="checkmark-circle" size={18} />}
                </Pressable>
              );
            })}
          </View>
          <View style={styles.tip}><Ionicons color={colors.violet} name="sparkles" size={20} /><Text style={styles.tipText}>Popularne w pobliżu: ogrody społeczne i spacery sąsiedzkie</Text></View>
          <PrimaryButton onPress={() => setStep(2)} style={styles.next}>Dalej</PrimaryButton>
        </ScrollView>
      )}

      {step === 2 && (
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.title}>Wskaż miejsce na mapie</Text>
          <Text style={styles.helper}>Dotknij mapy, aby przesunąć awatar i wybrać punkt działania.</Text>
          <View style={styles.miniMap}>
            <WebView originWhitelist={['*']} source={{ html: mapHtml }} style={styles.webMap} />
          </View>
          <View style={styles.addressCard}>
            <Ionicons color={colors.signal} name="location" size={21} />
            <View><Text style={styles.addressTitle}>Skwer przy ul. Łąkowej 18</Text><Text style={styles.addressMeta}>Grzegórzki · Kraków</Text></View>
          </View>
          <Text style={styles.label}>Termin</Text>
          <View style={styles.dateRow}>
            <View style={styles.dateBox}><Text style={styles.dateSmall}>SOBOTA</Text><Text style={styles.dateLarge}>10 PAŹ</Text></View>
            <View style={styles.dateBox}><Text style={styles.dateSmall}>START</Text><Text style={styles.dateLarge}>11:00</Text></View>
          </View>
          <PrimaryButton onPress={() => setStep(3)} style={styles.next}>Dalej</PrimaryButton>
        </ScrollView>
      )}

      {step === 3 && (
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Text style={styles.title}>Opowiedz o inicjatywie</Text>
          <Text style={styles.helper}>Krótko: co robicie i dlaczego warto dołączyć?</Text>
          <Text style={styles.label}>Nazwa</Text>
          <TextInput maxLength={80} onChangeText={setTitle} style={styles.input} value={title} />
          <Text style={styles.label}>Opis</Text>
          <TextInput maxLength={240} multiline onChangeText={setDescription} style={[styles.input, styles.textArea]} textAlignVertical="top" value={description} />
          <Text style={styles.counter}>{description.length} / 240</Text>
          <Text style={styles.label}>Kogo lub czego potrzebujesz?</Text>
          <View style={styles.tags}><StatusChip tone="green">+ 8 osób</StatusChip><StatusChip tone="warning">+ Narzędzia</StatusChip><StatusChip tone="green">+ Rośliny</StatusChip></View>
          <View style={styles.summary}>
            <View style={styles.summaryMarker}><Ionicons color={colors.surface} name="leaf" size={22} /></View>
            <View style={styles.summaryCopy}>
              <Text style={styles.summaryType}>{category.toUpperCase()} · GRZEGÓRZKI</Text>
              <Text numberOfLines={2} style={styles.summaryTitle}>{title}</Text>
              <Text style={styles.summaryMeta}>sobota, 11:00 · otwarte dla sąsiadów</Text>
            </View>
          </View>
          <View style={styles.reward}><Ionicons color={colors.signal} name="checkmark-circle" size={25} /><Text style={styles.rewardText}>Po publikacji inicjatywa pojawi się na mapie jako wersja demonstracyjna.</Text></View>
          <PrimaryButton disabled={!title.trim() || !description.trim()} icon="send" onPress={() => onPublish({ ...initiatives[0], id: `draft-${Date.now()}`, title, shortTitle: title, description, type: role === 'ngo' ? 'Misja NGO' : 'Misja' })} style={styles.next}>
            Opublikuj inicjatywę
          </PrimaryButton>
        </ScrollView>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: colors.background, flex: 1 },
  progressRow: { flexDirection: 'row', gap: 7, paddingHorizontal: 16, paddingTop: 12 },
  progressPart: { backgroundColor: colors.border, borderRadius: 99, flex: 1, height: 5 },
  progressPartActive: { backgroundColor: colors.signal },
  content: { padding: 18, paddingBottom: 42 },
  title: { color: colors.ink, fontFamily: fonts.headingExtra, fontSize: 27, letterSpacing: -0.7, marginTop: 12 },
  helper: { color: colors.muted, fontFamily: fonts.body, fontSize: 14, lineHeight: 21, marginTop: 6 },
  search: { alignItems: 'center', backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 18, borderWidth: 1, flexDirection: 'row', gap: 10, height: 52, marginTop: 24, paddingHorizontal: 16 },
  searchText: { color: colors.muted, fontFamily: fonts.body, fontSize: 14 },
  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 16 },
  category: { alignItems: 'center', backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 18, borderWidth: 1, flexDirection: 'row', gap: 9, minHeight: 66, padding: 10, width: '48.5%' },
  categoryActive: { borderColor: colors.signal, borderWidth: 2 },
  categoryIcon: { alignItems: 'center', borderRadius: 21, height: 42, justifyContent: 'center', width: 42 },
  categoryText: { color: colors.ink, flex: 1, fontFamily: fonts.bodyBold, fontSize: 13 },
  categoryTextActive: { color: colors.deep },
  tip: { alignItems: 'center', backgroundColor: colors.violetSoft, borderRadius: 17, flexDirection: 'row', gap: 10, marginTop: 18, padding: 15 },
  tipText: { color: colors.ink, flex: 1, fontFamily: fonts.bodyMedium, fontSize: 12, lineHeight: 18 },
  next: { marginTop: 24 },
  miniMap: { borderColor: colors.border, borderRadius: 22, borderWidth: 1, height: 315, marginTop: 22, overflow: 'hidden' },
  webMap: { backgroundColor: '#E8EDF5', flex: 1 },
  addressCard: { alignItems: 'center', backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 18, borderWidth: 1, flexDirection: 'row', gap: 12, marginTop: 14, padding: 15 },
  addressTitle: { color: colors.ink, fontFamily: fonts.bodyBold, fontSize: 14 },
  addressMeta: { color: colors.muted, fontFamily: fonts.body, fontSize: 12, marginTop: 3 },
  label: { color: colors.ink, fontFamily: fonts.bodyBold, fontSize: 11, letterSpacing: 0.8, marginTop: 24, textTransform: 'uppercase' },
  dateRow: { flexDirection: 'row', gap: 12, marginTop: 10 },
  dateBox: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 17, borderWidth: 1, flex: 1, padding: 14 },
  dateSmall: { color: colors.muted, fontFamily: fonts.bodyBold, fontSize: 10, letterSpacing: 0.7 },
  dateLarge: { color: colors.ink, fontFamily: fonts.heading, fontSize: 17, marginTop: 4 },
  input: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 16, borderWidth: 1, color: colors.ink, fontFamily: fonts.body, fontSize: 15, marginTop: 8, minHeight: 54, paddingHorizontal: 15, paddingVertical: 14 },
  textArea: { minHeight: 118 },
  counter: { color: colors.muted, fontFamily: fonts.body, fontSize: 11, marginTop: 6, textAlign: 'right' },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  summary: { alignItems: 'center', backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 20, borderWidth: 1, flexDirection: 'row', gap: 14, marginTop: 24, padding: 15 },
  summaryMarker: { alignItems: 'center', backgroundColor: colors.signal, borderRadius: 29, height: 58, justifyContent: 'center', width: 58 },
  summaryCopy: { flex: 1 },
  summaryType: { color: colors.signal, fontFamily: fonts.bodyBold, fontSize: 10, letterSpacing: 0.5 },
  summaryTitle: { color: colors.ink, fontFamily: fonts.heading, fontSize: 16, lineHeight: 21, marginTop: 5 },
  summaryMeta: { color: colors.muted, fontFamily: fonts.body, fontSize: 11, marginTop: 4 },
  reward: { alignItems: 'center', backgroundColor: colors.blueSoft, borderRadius: 17, flexDirection: 'row', gap: 11, marginTop: 14, padding: 14 },
  rewardText: { color: colors.deep, flex: 1, fontFamily: fonts.bodyMedium, fontSize: 12, lineHeight: 18 },
});
