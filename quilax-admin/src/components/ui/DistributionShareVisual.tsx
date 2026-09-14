import { View, Text, StyleSheet, Pressable, TextInput } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Spacing, titleTypeface } from '@/constants/theme';
import { SHARE_COLORS, brandGradientProps } from '@/constants/gradients';
import { PercentInput } from '@/components/ui/PercentInput';
import CustomIcon from '@/components/CustomIcon';

export type ShareSlice = {
  id: string;
  label: string;
  percentage: number;
  hint?: string;
  color?: string;
  /** Si hay callback, el % se edita en el chip */
  onChangePercentage?: (n: number) => void;
  fromPosition?: number;
  toPosition?: number;
  onChangeFrom?: (n: number) => void;
  onChangeTo?: (n: number) => void;
  onRemove?: () => void;
};

type Props = {
  slices: ShareSlice[];
  total: number;
  valid: boolean;
  onAddSlice?: () => void;
  addLabel?: string;
};

/**
 * Barra 0–100% + chips editables (una sola lista de porcentajes).
 */
export function DistributionShareVisual({
  slices,
  total,
  valid,
  onAddSlice,
  addLabel = 'Añadir rango',
}: Props) {
  const positive = slices.filter((s) => s.percentage > 0);
  const remaining = Math.max(0, 100 - total);

  return (
    <View style={styles.wrap}>
      <LinearGradient
        {...brandGradientProps}
        style={[styles.hero, !valid && styles.heroIncomplete]}
      >
        <Text style={styles.heroLabel}>Reparto total</Text>
        <Text style={styles.heroValue}>{total.toFixed(1)}%</Text>
        <Text style={styles.heroStatus}>
          {valid
            ? 'Listo · suma 100%'
            : `Ajusta · ${total > 100 ? 'sobra' : 'faltan'} ${Math.abs(100 - total).toFixed(1)}%`}
        </Text>
      </LinearGradient>

      <View style={[styles.barTrack, !valid && styles.barTrackIncomplete]}>
        {positive.map((s, i) => (
          <View
            key={s.id}
            style={[
              styles.barSeg,
              {
                width: `${Math.max(0, s.percentage)}%`,
                backgroundColor: s.color || SHARE_COLORS[i % SHARE_COLORS.length],
              },
            ]}
          />
        ))}
        {remaining > 0.05 ? (
          <View style={[styles.barGap, { width: `${remaining}%` }]} />
        ) : null}
      </View>

      <View style={styles.chips}>
        {slices.map((s, i) => {
          const color = s.color || SHARE_COLORS[i % SHARE_COLORS.length];
          const editable = typeof s.onChangePercentage === 'function';
          const hasRange =
            typeof s.onChangeFrom === 'function' && typeof s.onChangeTo === 'function';

          return (
            <View key={s.id} style={[styles.chip, { borderColor: `${color}55` }]}>
              <View style={styles.chipTop}>
                <View style={[styles.dot, { backgroundColor: color }]} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.chipLabel}>{s.label}</Text>
                  {s.hint && !hasRange ? (
                    <Text style={styles.chipHint}>{s.hint}</Text>
                  ) : null}
                </View>
                {s.onRemove ? (
                  <Pressable onPress={s.onRemove} hitSlop={8} style={styles.removeBtn}>
                    <CustomIcon name="close" size={18} color={Colors.light.error} />
                  </Pressable>
                ) : null}
              </View>

              {hasRange ? (
                <View style={styles.rangeRow}>
                  <Text style={styles.rangeLabel}>Desde</Text>
                  <TextInput
                    style={styles.rangeInput}
                    value={String(s.fromPosition ?? 1)}
                    onChangeText={(v) => s.onChangeFrom?.(parseInt(v, 10) || 0)}
                    keyboardType="number-pad"
                  />
                  <Text style={styles.rangeLabel}>Hasta</Text>
                  <TextInput
                    style={styles.rangeInput}
                    value={String(s.toPosition ?? 1)}
                    onChangeText={(v) => s.onChangeTo?.(parseInt(v, 10) || 0)}
                    keyboardType="number-pad"
                  />
                </View>
              ) : null}

              {(() => {
                const from = s.fromPosition ?? 1;
                const to = s.toPosition ?? from;
                const count = to - from + 1;
                if (hasRange && count > 1 && s.percentage > 0) {
                  const each = s.percentage / count;
                  const eachLabel = Number.isInteger(each)
                    ? String(each)
                    : String(Number(each.toFixed(4)));
                  return (
                    <Text style={styles.eachHint}>
                      Cada uno: {eachLabel}%
                    </Text>
                  );
                }
                return null;
              })()}

              <View style={styles.pctRow}>
                {editable ? (
                  <>
                    <PercentInput
                      value={s.percentage}
                      onChangeValue={s.onChangePercentage!}
                      style={styles.pctInput}
                    />
                    <Text style={[styles.pctSym, { color }]}>%</Text>
                  </>
                ) : (
                  <Text style={[styles.chipPct, { color }]}>
                    {Number.isInteger(s.percentage)
                      ? s.percentage
                      : Number(s.percentage.toFixed(4))}
                    %
                  </Text>
                )}
              </View>
            </View>
          );
        })}
      </View>

      {onAddSlice ? (
        <Pressable style={styles.addBtn} onPress={onAddSlice}>
          <CustomIcon name="plus" size={18} color={Colors.light.primary} />
          <Text style={styles.addBtnText}>{addLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: Spacing.three, marginBottom: Spacing.three },
  hero: {
    borderRadius: 18,
    paddingVertical: Spacing.four,
    paddingHorizontal: Spacing.four,
    alignItems: 'center',
  },
  heroIncomplete: { opacity: 0.88 },
  heroLabel: { color: 'rgba(255,255,255,0.85)', fontSize: 13, fontWeight: '600' },
  heroValue: {
    ...titleTypeface,
    color: '#fff',
    fontSize: 48,
    fontWeight: '800',
    letterSpacing: -1,
    marginVertical: 4,
  },
  heroStatus: { color: 'rgba(255,255,255,0.92)', fontSize: 14, fontWeight: '600' },
  barTrack: {
    height: 18,
    borderRadius: 999,
    overflow: 'hidden',
    flexDirection: 'row',
    backgroundColor: Colors.light.backgroundSelected,
  },
  barTrackIncomplete: { borderWidth: 1, borderColor: 'rgba(28,25,23,0.08)' },
  barSeg: { height: '100%' },
  barGap: { height: '100%', backgroundColor: 'transparent' },
  chips: { gap: Spacing.two },
  chip: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    gap: 10,
  },
  chipTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  dot: { width: 12, height: 12, borderRadius: 6 },
  chipLabel: {
    ...titleTypeface,
    fontSize: 15,
    fontWeight: '700',
    color: Colors.light.text,
  },
  chipHint: { fontSize: 12, color: Colors.light.textSecondary, marginTop: 2 },
  removeBtn: { padding: 4 },
  rangeRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  rangeLabel: { fontSize: 12, color: Colors.light.textSecondary, fontWeight: '600' },
  rangeInput: {
    width: 52,
    backgroundColor: Colors.light.backgroundSelected,
    borderRadius: 8,
    paddingVertical: 8,
    textAlign: 'center',
    fontWeight: '700',
  },
  eachHint: {
    fontSize: 13,
    color: Colors.light.textSecondary,
    fontWeight: '600',
  },
  pctRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 6 },
  pctInput: { width: 88, minWidth: 88 },
  pctSym: { ...titleTypeface, fontSize: 18, fontWeight: '800' },
  chipPct: { ...titleTypeface, fontSize: 20, fontWeight: '800' },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
  },
  addBtnText: { color: Colors.light.primary, fontWeight: '700' },
});
