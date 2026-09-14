import { View, Text, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { Colors, Spacing } from '@/constants/theme';
import { AppScreen, AppHeader } from '@/components/ui/AppScreen';
import { DistributionShareVisual } from '@/components/ui/DistributionShareVisual';
import { GradientButton } from '@/components/ui/GradientButton';
import { useState, useEffect, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '@/lib/api';
import { SHARE_COLORS } from '@/constants/gradients';

interface PositionRule {
  fromPosition: number;
  toPosition: number;
  percentage: number;
}

interface QuizDistribution {
  adminJackpotPercentage: number;
  adminProfitPercentage: number;
  creatorPercentage: number;
  positionRules: PositionRule[];
}

export default function QuizDistributionScreen() {
  const [distribution, setDistribution] = useState<QuizDistribution>({
    adminJackpotPercentage: 5,
    adminProfitPercentage: 5,
    creatorPercentage: 10,
    positionRules: [
      { fromPosition: 1, toPosition: 1, percentage: 40 },
      { fromPosition: 2, toPosition: 2, percentage: 20 },
      { fromPosition: 3, toPosition: 3, percentage: 12 },
      { fromPosition: 4, toPosition: 10, percentage: 8 },
    ],
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadCurrentDistribution();
  }, []);

  const loadCurrentDistribution = async () => {
    try {
      const token = await AsyncStorage.getItem('authToken');
      const response = await fetch(`${API_BASE_URL}/prize-config/config`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (data.success && data.config.quizDistribution) {
        setDistribution(data.config.quizDistribution);
      }
    } catch (error) {
      console.error('Error loading distribution:', error);
    } finally {
      setLoading(false);
    }
  };

  const totalPercentage =
    distribution.adminJackpotPercentage +
    distribution.adminProfitPercentage +
    distribution.creatorPercentage +
    distribution.positionRules.reduce((sum, rule) => sum + rule.percentage, 0);

  const canSave = Math.abs(totalPercentage - 100) < 0.1;

  const slices = useMemo(
    () => [
      {
        id: 'jackpot',
        label: 'Jackpot temporada',
        percentage: distribution.adminJackpotPercentage,
        hint: 'Bote de la temporada',
        color: SHARE_COLORS[1],
        onChangePercentage: (n: number) =>
          setDistribution((prev) => ({ ...prev, adminJackpotPercentage: n })),
      },
      {
        id: 'profit',
        label: 'Plataforma',
        percentage: distribution.adminProfitPercentage,
        hint: 'Beneficio Quilax',
        color: SHARE_COLORS[0],
        onChangePercentage: (n: number) =>
          setDistribution((prev) => ({ ...prev, adminProfitPercentage: n })),
      },
      {
        id: 'creator',
        label: 'Creador',
        percentage: distribution.creatorPercentage,
        hint: 'Quien hizo el quiz',
        color: SHARE_COLORS[2],
        onChangePercentage: (n: number) =>
          setDistribution((prev) => ({ ...prev, creatorPercentage: n })),
      },
      ...distribution.positionRules.map((rule, i) => ({
        id: `pos-${i}`,
        label:
          rule.fromPosition === rule.toPosition
            ? `Puesto ${rule.fromPosition}`
            : `Puestos ${rule.fromPosition}–${rule.toPosition}`,
        percentage: rule.percentage,
        color: SHARE_COLORS[(3 + i) % SHARE_COLORS.length],
        fromPosition: rule.fromPosition,
        toPosition: rule.toPosition,
        onChangePercentage: (n: number) =>
          setDistribution((prev) => ({
            ...prev,
            positionRules: prev.positionRules.map((r, idx) =>
              idx === i ? { ...r, percentage: n } : r
            ),
          })),
        onChangeFrom: (n: number) =>
          setDistribution((prev) => ({
            ...prev,
            positionRules: prev.positionRules.map((r, idx) =>
              idx === i ? { ...r, fromPosition: n } : r
            ),
          })),
        onChangeTo: (n: number) =>
          setDistribution((prev) => ({
            ...prev,
            positionRules: prev.positionRules.map((r, idx) =>
              idx === i ? { ...r, toPosition: n } : r
            ),
          })),
        onRemove: () =>
          setDistribution((prev) => ({
            ...prev,
            positionRules: prev.positionRules.filter((_, idx) => idx !== i),
          })),
      })),
    ],
    [distribution]
  );

  const handleAddPosition = () => {
    const last = distribution.positionRules[distribution.positionRules.length - 1];
    const next = last ? last.toPosition + 1 : 1;
    setDistribution((prev) => ({
      ...prev,
      positionRules: [...prev.positionRules, { fromPosition: next, toPosition: next, percentage: 0 }],
    }));
  };

  const handleSave = async () => {
    if (!canSave) {
      Alert.alert('Error', 'El reparto debe sumar exactamente 100%');
      return;
    }
    try {
      setSaving(true);
      const token = await AsyncStorage.getItem('authToken');
      const response = await fetch(`${API_BASE_URL}/prize-config/quiz-distribution`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ quizDistribution: distribution }),
      });
      const data = await response.json();
      if (data.success) Alert.alert('Listo', data.message || 'Reparto guardado');
      else Alert.alert('Error', data.error || 'No se pudo guardar');
    } catch {
      Alert.alert('Error', 'No se pudo guardar');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <AppScreen>
        <AppHeader title="Reparto Quiz" subtitle="Cómo se parte cada premio" />
        <ActivityIndicator style={{ marginTop: Spacing.six }} color={Colors.light.primary} />
      </AppScreen>
    );
  }

  return (
    <AppScreen>
      <AppHeader title="Reparto Quiz" subtitle="Qué se lleva cada uno en cada partida" />

      <View style={styles.body}>
        <Text style={styles.intro}>
          Aplica a todos los quizzes futuros. Edita los % hasta que la barra llegue a 100.
        </Text>

        <View style={{ paddingHorizontal: Spacing.four }}>
          <DistributionShareVisual
            slices={slices}
            total={totalPercentage}
            valid={canSave}
            onAddSlice={handleAddPosition}
            addLabel="Añadir rango de puestos"
          />
        </View>

        <GradientButton
          label={saving ? 'Guardando…' : 'Guardar reparto'}
          onPress={handleSave}
          disabled={!canSave || saving}
          style={{ marginTop: Spacing.two, marginHorizontal: Spacing.four }}
        />

        <Text style={styles.footnote}>
          Si faltan jugadores en puestos premiados, ese % se reparte entre el 1º y el creador.
        </Text>
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  body: { paddingBottom: Spacing.six },
  intro: {
    color: Colors.light.textSecondary,
    fontSize: 14,
    lineHeight: 20,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
    marginBottom: Spacing.two,
  },
  footnote: {
    color: Colors.light.textSecondary,
    fontSize: 12,
    lineHeight: 18,
    paddingHorizontal: Spacing.four,
    marginTop: Spacing.three,
  },
});
