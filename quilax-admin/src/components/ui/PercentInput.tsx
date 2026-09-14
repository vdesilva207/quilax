import { useEffect, useState } from 'react';
import { TextInput, StyleSheet, type TextStyle } from 'react-native';
import { Colors } from '@/constants/theme';

/**
 * Input de % que permite decimales (p. ej. 12.5 o 12,5) sin “comerse” el punto al escribir.
 */
export function PercentInput({
  value,
  onChangeValue,
  style,
}: {
  value: number;
  onChangeValue: (n: number) => void;
  style?: TextStyle;
}) {
  const [draft, setDraft] = useState(formatPercent(value));
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (!focused) {
      setDraft(formatPercent(value));
    }
  }, [value, focused]);

  const handleChange = (raw: string) => {
    // Aceptar coma o punto como decimal
    let next = raw.replace(',', '.');
    // Solo dígitos y un punto
    next = next.replace(/[^\d.]/g, '');
    const parts = next.split('.');
    if (parts.length > 2) {
      next = `${parts[0]}.${parts.slice(1).join('')}`;
    }
    // Máx. 4 decimales
    if (parts[1] && parts[1].length > 4) {
      next = `${parts[0]}.${parts[1].slice(0, 4)}`;
    }

    setDraft(next);

    if (next === '' || next === '.') {
      onChangeValue(0);
      return;
    }
    // Mientras termina en "." (ej. "12.") no fuerces número aún en el draft;
    // sí actualiza el valor numérico parcial para la barra.
    const n = parseFloat(next);
    if (!Number.isNaN(n)) {
      onChangeValue(n);
    }
  };

  return (
    <TextInput
      style={[styles.input, style]}
      value={draft}
      onChangeText={handleChange}
      onFocus={() => setFocused(true)}
      onBlur={() => {
        setFocused(false);
        setDraft(formatPercent(value));
      }}
      keyboardType="decimal-pad"
      inputMode="decimal"
    />
  );
}

function formatPercent(n: number) {
  if (n == null || Number.isNaN(n)) return '0';
  // Evitar "12.5000"; mostrar decimales solo si los hay
  const rounded = Math.round(n * 10000) / 10000;
  return String(rounded);
}

const styles = StyleSheet.create({
  input: {
    backgroundColor: Colors.light.backgroundSelected,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 10,
    textAlign: 'center',
    fontWeight: '700',
    fontSize: 16,
    color: Colors.light.text,
  },
});
