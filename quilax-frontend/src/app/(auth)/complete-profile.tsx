import { View, Text, StyleSheet, Pressable, Modal, ScrollView, ActivityIndicator, Alert, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';
import CustomIcon from '@/components/CustomIcon';
import { useAuth } from '@/context/AuthContext';
import { Colors, Spacing, bodyTypeface, titleTypeface } from '@/constants/theme';
import { authFormStyles } from '@/constants/authForm';
import { MobileModalFrame } from '@/components/ui/MobileModalFrame';
import {
  AuthFlowLayout,
  AuthPrimaryButton,
} from '@/components/ui/AuthFlowLayout';

const PROVINCES_BY_COUNTRY: Record<string, string[]> = {
  ES: ['Andalucía', 'Aragón', 'Asturias (Principado de)', 'Baleares (Islas)', 'Canarias (Islas)', 'Cantabria', 'Castilla-La Mancha', 'Castilla y León', 'Cataluña', 'Ceuta (Ciudad Autónoma)', 'Comunidad Valenciana', 'Extremadura', 'Galicia', 'Madrid (Comunidad de)', 'Melilla (Ciudad Autónoma)', 'Murcia (Región de)', 'Navarra (Comunidad Foral de)', 'País Vasco', 'La Rioja'],
  US: ['Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado', 'Connecticut', 'Delaware', 'Florida', 'Georgia', 'Hawaii', 'Idaho', 'Illinois', 'Indiana', 'Iowa', 'Kansas', 'Kentucky', 'Louisiana', 'Maine', 'Maryland', 'Massachusetts', 'Michigan', 'Minnesota', 'Mississippi', 'Missouri', 'Montana', 'Nebraska', 'Nevada', 'New Hampshire', 'New Jersey', 'New Mexico', 'New York', 'North Carolina', 'North Dakota', 'Ohio', 'Oklahoma', 'Oregon', 'Pennsylvania', 'Rhode Island', 'South Carolina', 'South Dakota', 'Tennessee', 'Texas', 'Utah', 'Vermont', 'Virginia', 'Washington', 'West Virginia', 'Wisconsin', 'Wyoming'],
  MX: ['Ciudad de México', 'Jalisco', 'Nuevo León', 'Puebla', 'Veracruz', 'Guanajuato', 'Chiapas', 'Michoacán', 'Oaxaca', 'Guerrero', 'Hidalgo', 'San Luis Potosí', 'Sinaloa', 'Sonora', 'Coahuila', 'Tabasco', 'Yucatán', 'Quintana Roo', 'Chihuahua', 'Baja California', 'Tamaulipas', 'Durango', 'Aguascalientes', 'Querétaro', 'Morelos', 'Colima', 'Nayarit', 'Campeche', 'Tlaxcala', 'Zacatecas'],
  AR: ['Buenos Aires', 'Córdoba', 'Santa Fe', 'Mendoza', 'Tucumán', 'Entre Ríos', 'Salta', 'Misiones', 'Chaco', 'Corrientes', 'Santiago del Estero', 'San Juan', 'Jujuy', 'Río Negro', 'Neuquén', 'Chubut', 'Santa Cruz', 'La Pampa', 'Formosa', 'La Rioja', 'Catamarca', 'San Luis'],
  CO: ['Bogotá', 'Antioquia', 'Valle del Cauca', 'Cundinamarca', 'Santander', 'Norte de Santander', 'Bolívar', 'Atlántico', 'Boyacá', 'Caldas', 'Risaralda', 'Quindío', 'Huila', 'Tolima', 'Meta', 'Cauca', 'Nariño', 'Cesar', 'Magdalena', 'Córdoba', 'Sucre', 'Chocó', 'Amazonas', 'Guainía', 'Guaviare', 'Vaupés', 'Vichada', 'Caquetá', 'Putumayo'],
  PE: ['Lima', 'Arequipa', 'Cusco', 'La Libertad', 'Piura', 'Junín', 'Cajamarca', 'Lambayeque', 'Puno', 'Ancash', 'Ica', 'San Martín', 'Huánuco', 'Ucayali', 'Madre de Dios', 'Tacna', 'Moquegua', 'Pasco', 'Tumbes', 'Amazonas', 'Loreto', 'Ayacucho', 'Apurímac'],
  CL: ['Santiago', 'Valparaíso', 'Concepción', 'La Araucanía', 'Biobío', 'Antofagasta', 'Metropolitana', 'Coquimbo', 'Los Lagos', 'Los Ríos', 'Maule', 'Ñuble', "O'Higgins", 'Atacama', 'Magallanes', 'Tarapacá', 'Aysén'],
  BR: ['São Paulo', 'Rio de Janeiro', 'Minas Gerais', 'Bahia', 'Paraná', 'Rio Grande do Sul', 'Pernambuco', 'Ceará', 'Pará', 'Maranhão', 'Santa Catarina', 'Goiás', 'Paraíba', 'Espírito Santo', 'Rio Grande do Norte', 'Alagoas', 'Mato Grosso', 'Mato Grosso do Sul', 'Piauí', 'Distrito Federal', 'Amazonas', 'Sergipe', 'Rondônia', 'Tocantins', 'Acre', 'Amapá', 'Roraima'],
  FR: ["Île-de-France", "Provence-Alpes-Côte d'Azur", 'Auvergne-Rhône-Alpes', 'Hauts-de-France', 'Nouvelle-Aquitaine', 'Occitanie', 'Grand Est', 'Pays de la Loire', 'Bretagne', 'Normandie', 'Centre-Val de Loire', 'Bourgogne-Franche-Comté', 'Corse'],
  DE: ['Baviera', 'Berlín', 'Baden-Wurtemberg', 'Renania del Norte-Westfalia', 'Hesse', 'Sajonia', 'Baja Sajonia', 'Renania-Palatinado', 'Brandeburgo', 'Turingia', 'Sajonia-Anhalt', 'Schleswig-Holstein', 'Mecklemburgo-Pomerania Occidental', 'Hamburgo', 'Bremen', 'Sarre'],
  IT: ['Lombardía', 'Lacio', 'Campania', 'Sicilia', 'Véneto', 'Piamonte', 'Puglia', 'Emilia-Romaña', 'Toscana', 'Cerdeña', 'Liguria', 'Marcas', 'Abruzos', 'Calabria', 'Friuli-Venecia Julia', 'Umbría', 'Basilicata', 'Molise', 'Valle de Aosta', 'Trentino-Alto Adigio'],
  PT: ['Lisboa', 'Oporto', 'Setúbal', 'Braga', 'Aveiro', 'Coimbra', 'Leiría', 'Faro', 'Viseu', 'Vila Real', 'Castelo Branco', 'Guarda', 'Évora', 'Santarém', 'Portalegre', 'Beja', 'Viana do Castelo', 'Bragança'],
  GB: ['Inglaterra', 'Escocia', 'Gales', 'Irlanda del Norte'],
  CA: ['Ontario', 'Quebec', 'Columbia Británica', 'Alberta', 'Manitoba', 'Saskatchewan', 'Nueva Escocia', 'Nuevo Brunswick', 'Isla del Príncipe Eduardo', 'Terranova y Labrador', 'Yukon', 'Territorios del Noroeste', 'Nunavut'],
  AU: ['New South Wales', 'Victoria', 'Queensland', 'Western Australia', 'South Australia', 'Tasmania', 'Australian Capital Territory', 'Northern Territory'],
  NZ: ['Auckland', 'Wellington', 'Canterbury', 'Waikato', 'Bay of Plenty', 'Otago', 'Manawatū-Whanganui', "Hawke's Bay", 'Taranaki', 'Northland', 'Southland', 'Nelson', 'Marlborough', 'Gisborne', 'West Coast'],
  IE: ['Dublin', 'Cork', 'Galway', 'Limerick', 'Waterford', 'Kerry', 'Mayo', 'Donegal', 'Wicklow', 'Kildare'],
  NL: ['Noord-Holland', 'Zuid-Holland', 'Noord-Brabant', 'Gelderland', 'Utrecht', 'Overijssel', 'Limburg', 'Friesland', 'Groningen', 'Drenthe', 'Flevoland', 'Zeeland'],
  BE: ['Bruxelles-Capitale', 'Anvers', 'Flandre orientale', 'Flandre occidentale', 'Limbourg', 'Brabant flamand', 'Hainaut', 'Liège', 'Namur', 'Brabant wallon', 'Luxembourg'],
  AT: ['Wien', 'Niederösterreich', 'Oberösterreich', 'Steiermark', 'Tirol', 'Kärnten', 'Salzburg', 'Vorarlberg', 'Burgenland'],
  CH: ['Zürich', 'Bern', 'Vaud', 'Aargau', 'St. Gallen', 'Genève', 'Lucerne', 'Ticino', 'Valais', 'Basel-Stadt', 'Basel-Landschaft'],
  PL: ['Mazowieckie', 'Śląskie', 'Wielkopolskie', 'Małopolskie', 'Dolnośląskie', 'Łódzkie', 'Pomorskie', 'Lubelskie', 'Podkarpackie', 'Kujawsko-Pomorskie'],
  SE: ['Stockholm', 'Västra Götaland', 'Skåne', 'Uppsala', 'Östergötland', 'Jönköping', 'Halland', 'Örebro'],
  NO: ['Oslo', 'Viken', 'Vestland', 'Trøndelag', 'Rogaland', 'Innlandet', 'Agder', 'Troms og Finnmark'],
  DK: ['Hovedstaden', 'Midtjylland', 'Syddanmark', 'Sjælland', 'Nordjylland'],
  FI: ['Uusimaa', 'Pirkanmaa', 'Varsinais-Suomi', 'Pohjois-Pohjanmaa', 'Keski-Suomi'],
};

const GENDER_OPTIONS = [
  { id: 'male', key: 'common.gender.male' },
  { id: 'female', key: 'common.gender.female' },
  { id: 'other', key: 'common.gender.other' },
  { id: 'prefer_not_to_say', key: 'common.gender.preferNotToSay' },
] as const;

export default function CompleteProfileScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { user, updateUser } = useAuth() as any;
  const [selectedCountry, setSelectedCountry] = useState(
    String(user?.country || 'ES').toUpperCase().slice(0, 2) || 'ES'
  );
  const [selectedProvince, setSelectedProvince] = useState(user?.province || '');
  const [selectedGender, setSelectedGender] = useState(user?.gender || '');
  const [showProvinceModal, setShowProvinceModal] = useState(false);
  const [showGenderModal, setShowGenderModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (user?.country) {
      setSelectedCountry(String(user.country).toUpperCase().slice(0, 2));
    }
    if (user?.province) setSelectedProvince(user.province);
    if (user?.gender) setSelectedGender(user.gender);
  }, [user?.country, user?.province, user?.gender]);

  useEffect(() => {
    (async () => {
      if (user?.country) return;
      try {
        const countryData = await AsyncStorage.getItem('selectedCountry');
        if (!countryData) return;
        try {
          const country = JSON.parse(countryData);
          setSelectedCountry(String(country.code || country).toUpperCase().slice(0, 2) || 'ES');
        } catch {
          const nameToCode: Record<string, string> = {
            España: 'ES', Portugal: 'PT', Francia: 'FR', Alemania: 'DE', Italia: 'IT', 'Reino Unido': 'GB',
          };
          setSelectedCountry(nameToCode[countryData] || 'ES');
        }
      } catch (error) {
        console.error('Error loading country:', error);
      }
    })();
  }, [user?.country]);

  const provinces = PROVINCES_BY_COUNTRY[selectedCountry] || [];
  const hasProvinceList = provinces.length > 0;

  const handleFinish = async () => {
    const province = selectedProvince.trim();
    if (!province) {
      Alert.alert(t('common.error'), t('auth.completeProfileScreen.provinceRequired'));
      return;
    }
    if (!selectedGender) {
      Alert.alert(t('common.error'), t('auth.completeProfileScreen.genderRequired'));
      return;
    }
    setSubmitting(true);
    try {
      await AsyncStorage.setItem('userProvince', province);
      await AsyncStorage.setItem('userGender', selectedGender);
      const result = await updateUser({
        ...(user?.fullName ? { fullName: user.fullName } : {}),
        country: selectedCountry,
        province,
        gender: selectedGender,
      });
      if (!result?.success) {
        throw new Error(result?.error || 'save_failed');
      }
      try {
        const { timezoneFromSpanishRegion } = await import('@/utils/timezone');
        const fromRegion = timezoneFromSpanishRegion(province);
        const device =
          typeof Intl !== 'undefined'
            ? Intl.DateTimeFormat().resolvedOptions().timeZone
            : null;
        const tz = fromRegion || device;
        if (tz) {
          const apiClient = (await import('@/lib/api')).default;
          await apiClient.put('/profile/timezone', { timezone: tz }).catch(() => null);
        }
      } catch {
        /* ignore */
      }
      router.replace('/(app)');
    } catch (error) {
      console.error('Error completando perfil:', error);
      Alert.alert(t('common.error'), t('auth.completeProfileScreen.saveError'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <AuthFlowLayout
        title={t('auth.completeProfileScreen.title')}
        subtitle={t('auth.completeProfileScreen.subtitle')}
        showBack
      >
        <Text style={authFormStyles.label}>{t('auth.completeProfileScreen.provinceLabel')}</Text>
        {hasProvinceList ? (
          <Pressable style={styles.select} onPress={() => setShowProvinceModal(true)}>
            <Text style={styles.selectText}>
              {selectedProvince || t('auth.completeProfileScreen.provincePlaceholder')}
            </Text>
          </Pressable>
        ) : (
          <TextInput
            style={authFormStyles.input}
            value={selectedProvince}
            onChangeText={setSelectedProvince}
            placeholder={t('auth.completeProfileScreen.provincePlaceholder')}
            placeholderTextColor={Colors.light.textSecondary}
            autoCapitalize="words"
            maxLength={80}
          />
        )}

        <Text style={authFormStyles.label}>{t('auth.completeProfileScreen.genderLabel')}</Text>
        <Pressable style={styles.select} onPress={() => setShowGenderModal(true)}>
          <Text style={styles.selectText}>
            {selectedGender
              ? t(GENDER_OPTIONS.find((g) => g.id === selectedGender)?.key || '')
              : t('auth.completeProfileScreen.genderPlaceholder')}
          </Text>
        </Pressable>

        {submitting ? (
          <ActivityIndicator color={Colors.light.primary} style={{ marginTop: Spacing.three }} />
        ) : (
          <AuthPrimaryButton
            label={t('auth.completeProfileScreen.start')}
            onPress={handleFinish}
            disabled={!selectedProvince.trim() || !selectedGender}
          />
        )}
      </AuthFlowLayout>

      <Modal
        visible={showProvinceModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowProvinceModal(false)}
      >
        <MobileModalFrame onBackdropPress={() => setShowProvinceModal(false)}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('auth.completeProfileScreen.provinceLabel')}</Text>
              <Pressable onPress={() => setShowProvinceModal(false)} hitSlop={8}>
                <CustomIcon name="close" size={20} color={Colors.light.text} />
              </Pressable>
            </View>
            <ScrollView contentContainerStyle={styles.modalBody}>
              {provinces.map((province) => (
                <Pressable
                  key={province}
                  style={styles.option}
                  onPress={() => {
                    setSelectedProvince(province);
                    setShowProvinceModal(false);
                  }}
                >
                  <Text style={styles.optionText}>{province}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </MobileModalFrame>
      </Modal>

      <Modal
        visible={showGenderModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowGenderModal(false)}
      >
        <MobileModalFrame onBackdropPress={() => setShowGenderModal(false)}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('auth.completeProfileScreen.genderLabel')}</Text>
              <Pressable onPress={() => setShowGenderModal(false)} hitSlop={8}>
                <CustomIcon name="close" size={20} color={Colors.light.text} />
              </Pressable>
            </View>
            <View style={styles.modalBody}>
              {GENDER_OPTIONS.map((gender) => (
                <Pressable
                  key={gender.id}
                  style={styles.option}
                  onPress={() => {
                    setSelectedGender(gender.id);
                    setShowGenderModal(false);
                  }}
                >
                  <Text style={styles.optionText}>{t(gender.key)}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        </MobileModalFrame>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  select: {
    backgroundColor: Colors.light.backgroundElement,
    paddingVertical: 14,
    paddingHorizontal: Spacing.three,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.light.backgroundSelected,
    marginBottom: Spacing.two,
  },
  selectText: {
    ...bodyTypeface,
    fontSize: 16,
    fontWeight: '500',
    color: Colors.light.text,
  },
  modalSheet: {
    width: '100%',
    maxHeight: '85%',
    backgroundColor: Colors.light.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    zIndex: 2,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.four,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.backgroundSelected,
  },
  modalTitle: {
    ...titleTypeface,
    fontSize: 18,
    fontWeight: '700',
    color: Colors.light.text,
    flex: 1,
    paddingRight: Spacing.two,
  },
  modalBody: {
    padding: Spacing.four,
    gap: Spacing.two,
    paddingBottom: Spacing.six,
  },
  option: {
    padding: Spacing.three,
    backgroundColor: Colors.light.backgroundElement,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.light.backgroundSelected,
  },
  optionText: {
    ...bodyTypeface,
    fontSize: 16,
    fontWeight: '500',
    color: Colors.light.text,
    textAlign: 'center',
  },
});
