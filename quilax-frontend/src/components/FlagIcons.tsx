import React from 'react';
import { View, Image, StyleSheet } from 'react-native';

/**
 * Banderas PNG libres (flagcdn.com), embebidas en assets — no emoji.
 * Licencia: uso libre de iconos de banderas vía Flagpedia/flagcdn.
 */
const FLAG_ES = require('../../assets/flags/es.png');
const FLAG_GB = require('../../assets/flags/gb.png');
const FLAG_US = require('../../assets/flags/us.png');
const FLAG_FR = require('../../assets/flags/fr.png');
const FLAG_DE = require('../../assets/flags/de.png');
const FLAG_PT = require('../../assets/flags/pt.png');
const FLAG_NL = require('../../assets/flags/nl.png');
const FLAG_IT = require('../../assets/flags/it.png');

type FlagProps = { width?: number; height?: number };

function FlagImage({
  source,
  width = 18,
  height = 12,
}: FlagProps & { source: number }) {
  return (
    <Image
      source={source}
      style={[styles.flag, { width, height }]}
      resizeMode="cover"
      accessibilityIgnoresInvertColors
    />
  );
}

export function FlagES(props: FlagProps) {
  return <FlagImage source={FLAG_ES} {...props} />;
}

export function FlagGB(props: FlagProps) {
  return <FlagImage source={FLAG_GB} {...props} />;
}

export function FlagUS(props: FlagProps) {
  return <FlagImage source={FLAG_US} {...props} />;
}

export function FlagFR(props: FlagProps) {
  return <FlagImage source={FLAG_FR} {...props} />;
}

export function FlagDE(props: FlagProps) {
  return <FlagImage source={FLAG_DE} {...props} />;
}

export function FlagPT(props: FlagProps) {
  return <FlagImage source={FLAG_PT} {...props} />;
}

export function FlagNL(props: FlagProps) {
  return <FlagImage source={FLAG_NL} {...props} />;
}

export function FlagIT(props: FlagProps) {
  return <FlagImage source={FLAG_IT} {...props} />;
}

/** UI language flag(s). EN shows UK + USA. */
export function AppLanguageFlags({
  code,
  width = 20,
  height = 13,
}: FlagProps & { code: string }) {
  const c = code.toLowerCase().slice(0, 2);
  if (c === 'es') return <FlagES width={width} height={height} />;
  if (c === 'fr') return <FlagFR width={width} height={height} />;
  if (c === 'de') return <FlagDE width={width} height={height} />;
  if (c === 'pt') return <FlagPT width={width} height={height} />;
  if (c === 'nl') return <FlagNL width={width} height={height} />;
  if (c === 'it') return <FlagIT width={width} height={height} />;
  if (c === 'en') {
    return (
      <View style={styles.enRow}>
        <FlagGB width={width} height={height} />
        <FlagUS width={width} height={height} />
      </View>
    );
  }
  return <FlagES width={width} height={height} />;
}

type QuizFlagsProps = {
  code: 'es' | 'en' | 'fr' | 'de' | 'pt' | 'nl' | 'it';
  compact?: boolean;
};

/** ES → España; EN → UK + USA; demás → bandera del país. */
export function QuizContentFlags({ code, compact }: QuizFlagsProps) {
  const w = compact ? 16 : 18;
  const h = compact ? 11 : 12;
  if (code === 'es') return <FlagES width={w} height={h} />;
  if (code === 'fr') return <FlagFR width={w} height={h} />;
  if (code === 'de') return <FlagDE width={w} height={h} />;
  if (code === 'pt') return <FlagPT width={w} height={h} />;
  if (code === 'nl') return <FlagNL width={w} height={h} />;
  if (code === 'it') return <FlagIT width={w} height={h} />;
  return (
    <View style={styles.enRow}>
      <FlagGB width={w} height={h} />
      <FlagUS width={w} height={h} />
    </View>
  );
}

const styles = StyleSheet.create({
  flag: {
    borderRadius: 2,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(0,0,0,0.15)',
    overflow: 'hidden',
  },
  enRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
});
