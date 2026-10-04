import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts, shadow } from './theme';

export function PrimaryButton({ children, icon, onPress, disabled = false, tone = 'blue', style }) {
  const backgroundColor = tone === 'violet' ? colors.violet : tone === 'green' ? colors.resolved : colors.signal;
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.primaryButton,
        { backgroundColor },
        disabled && styles.disabled,
        pressed && !disabled && styles.pressed,
        style,
      ]}
    >
      {icon && <Ionicons color={colors.surface} name={icon} size={20} />}
      <Text style={styles.primaryButtonText}>{children}</Text>
    </Pressable>
  );
}

export function IconButton({ icon, label, onPress, inverse = false, style }) {
  return (
    <Pressable accessibilityLabel={label} accessibilityRole="button" onPress={onPress} style={({ pressed }) => [
      styles.iconButton,
      inverse && styles.iconButtonInverse,
      pressed && styles.pressed,
      style,
    ]}>
      <Ionicons color={inverse ? colors.surface : colors.ink} name={icon} size={21} />
    </Pressable>
  );
}

export function ScreenHeader({ kicker, title, onBack, right }) {
  return (
    <View style={styles.screenHeader}>
      {onBack && <IconButton icon="arrow-back" label="Wróć" onPress={onBack} />}
      <View style={styles.headerCopy}>
        {kicker && <Text style={styles.kicker}>{kicker}</Text>}
        <Text numberOfLines={1} style={styles.headerTitle}>{title}</Text>
      </View>
      {right || <View style={styles.headerSpacer} />}
    </View>
  );
}

export function StatusChip({ children, tone = 'blue', icon }) {
  const palette = {
    blue: [colors.blueSoft, colors.deep],
    violet: [colors.violetSoft, colors.violet],
    green: [colors.mintSoft, '#147D59'],
    grey: [colors.greySoft, colors.greySpot],
    warning: ['#FFF5DF', colors.warning],
  }[tone] || [colors.blueSoft, colors.deep];
  return (
    <View style={[styles.chip, { backgroundColor: palette[0] }]}>
      {icon && <Ionicons color={palette[1]} name={icon} size={14} />}
      <Text style={[styles.chipText, { color: palette[1] }]}>{children}</Text>
    </View>
  );
}

export function BottomNav({ active, onSelect, onAdd }) {
  const items = [
    ['map', 'Mapa', 'map'],
    ['initiatives', 'Inicjatywy', 'location'],
    ['rewards', 'Nagrody', 'gift'],
    ['profile', 'Profil', 'person'],
  ];

  return (
    <View style={styles.bottomNav}>
      {items.slice(0, 2).map(([value, label, icon]) => {
        const selected = active === value;
        return (
          <Pressable key={value} onPress={() => onSelect(value)} style={styles.navItem}>
            <Ionicons color={selected ? colors.signal : colors.muted} name={selected ? icon : `${icon}-outline`} size={22} />
            <Text style={[styles.navLabel, selected && styles.navLabelActive]}>{label}</Text>
          </Pressable>
        );
      })}

      {onAdd && (
        <Pressable
          accessibilityLabel="Dodaj zgłoszenie"
          accessibilityRole="button"
          onPress={onAdd}
          style={({ pressed }) => [styles.navAddItem, pressed && styles.navAddItemPressed]}
        >
          <View style={styles.navAddButton}>
            <Ionicons color={colors.surface} name="add" size={27} />
          </View>
        </Pressable>
      )}

      {items.slice(2).map(([value, label, icon]) => {
        const selected = active === value;
        return (
          <Pressable key={value} onPress={() => onSelect(value)} style={styles.navItem}>
            <Ionicons color={selected ? colors.signal : colors.muted} name={selected ? icon : `${icon}-outline`} size={22} />
            <Text style={[styles.navLabel, selected && styles.navLabelActive]}>{label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function InitiativeRow({ item, onPress }) {
  const passed = item.status === 'passed';
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.initiativeRow, pressed && styles.pressed]}>
      <View style={[styles.markerBadge, { backgroundColor: passed ? colors.resolved : item.color }]}>
        <Text style={styles.markerLetter}>{passed ? '✓' : item.votes}</Text>
      </View>
      <View style={styles.rowCopy}>
        <View style={styles.rowTop}>
          <StatusChip tone={passed ? 'green' : 'blue'} icon={passed ? 'checkmark-circle' : 'megaphone-outline'}>
            {passed ? 'Przeszła' : 'Zbiera głosy'}
          </StatusChip>
          <Text style={styles.distance}>{item.distance || ''}</Text>
        </View>
        <Text style={styles.rowTitle}>{item.brief.title}</Text>
        <Text style={styles.rowMeta}>{item.brief.category} · {item.votes}/{item.threshold} Głosów</Text>
      </View>
      <Ionicons color={colors.muted} name="chevron-forward" size={20} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  primaryButton: { alignItems: 'center', borderRadius: 16, flexDirection: 'row', gap: 9, justifyContent: 'center', minHeight: 54, paddingHorizontal: 22 },
  primaryButtonText: { color: colors.surface, fontFamily: fonts.bodyBold, fontSize: 16 },
  disabled: { backgroundColor: '#CBD2DC', opacity: 0.75 },
  pressed: { opacity: 0.8, transform: [{ scale: 0.99 }] },
  iconButton: { alignItems: 'center', backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 22, borderWidth: 1, height: 44, justifyContent: 'center', width: 44 },
  iconButtonInverse: { backgroundColor: 'rgba(16,24,40,0.76)', borderColor: 'rgba(255,255,255,0.22)' },
  screenHeader: { alignItems: 'center', backgroundColor: colors.surface, borderBottomColor: colors.border, borderBottomWidth: StyleSheet.hairlineWidth, flexDirection: 'row', gap: 12, minHeight: 72, paddingHorizontal: 16, paddingVertical: 10 },
  headerCopy: { flex: 1 },
  kicker: { color: colors.signal, fontFamily: fonts.bodyBold, fontSize: 11, letterSpacing: 1.1, textTransform: 'uppercase' },
  headerTitle: { color: colors.ink, fontFamily: fonts.heading, fontSize: 19, marginTop: 2 },
  headerSpacer: { width: 44 },
  chip: { alignItems: 'center', alignSelf: 'flex-start', borderRadius: 999, flexDirection: 'row', gap: 5, minHeight: 28, paddingHorizontal: 10 },
  chipText: { fontFamily: fonts.bodyBold, fontSize: 11, letterSpacing: 0.2, textTransform: 'uppercase' },
  bottomNav: { alignItems: 'center', backgroundColor: colors.surface, borderTopColor: colors.border, borderTopWidth: StyleSheet.hairlineWidth, flexDirection: 'row', minHeight: 72, paddingBottom: 4, paddingHorizontal: 4 },
  navItem: { alignItems: 'center', flex: 1, gap: 3, justifyContent: 'center', minHeight: 56 },
  navAddItem: { alignItems: 'center', flex: 1, justifyContent: 'center', minHeight: 56 },
  navAddItemPressed: { opacity: 0.82, transform: [{ scale: 0.96 }] },
  navAddButton: {
    alignItems: 'center',
    backgroundColor: colors.signal,
    borderRadius: 22,
    height: 44,
    justifyContent: 'center',
    width: 44,
    ...shadow,
  },
  navLabel: { color: colors.muted, fontFamily: fonts.bodyMedium, fontSize: 11 },
  navLabelActive: { color: colors.signal, fontFamily: fonts.bodyBold },
  initiativeRow: { alignItems: 'center', backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 20, borderWidth: 1, flexDirection: 'row', gap: 13, padding: 14, ...shadow },
  markerBadge: { alignItems: 'center', borderColor: colors.surface, borderRadius: 27, borderWidth: 4, height: 54, justifyContent: 'center', width: 54 },
  markerLetter: { color: colors.surface, fontFamily: fonts.headingExtra, fontSize: 17 },
  rowCopy: { flex: 1 },
  rowTop: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  distance: { color: colors.muted, fontFamily: fonts.bodyBold, fontSize: 12 },
  rowTitle: { color: colors.ink, fontFamily: fonts.heading, fontSize: 16, lineHeight: 21, marginTop: 8 },
  rowMeta: { color: colors.muted, fontFamily: fonts.body, fontSize: 12, lineHeight: 18, marginTop: 4 },
});
