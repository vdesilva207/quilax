import { View, Text, StyleSheet, ScrollView, Pressable, Modal } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Colors, Spacing } from '@/constants/theme';
import { useRouter } from 'expo-router';
import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import CustomIcon from '@/components/CustomIcon';

const PROVINCES_BY_COUNTRY = {
  ES: ['Andalucía', 'Aragón', 'Asturias (Principado de)', 'Baleares (Islas)', 'Canarias (Islas)', 'Cantabria', 'Castilla-La Mancha', 'Castilla y León', 'Cataluña', 'Ceuta (Ciudad Autónoma)', 'Comunidad Valenciana', 'Extremadura', 'Galicia', 'Madrid (Comunidad de)', 'Melilla (Ciudad Autónoma)', 'Murcia (Región de)', 'Navarra (Comunidad Foral de)', 'País Vasco', 'La Rioja'],
  US: ['Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado', 'Connecticut', 'Delaware', 'Florida', 'Georgia', 'Hawaii', 'Idaho', 'Illinois', 'Indiana', 'Iowa', 'Kansas', 'Kentucky', 'Louisiana', 'Maine', 'Maryland', 'Massachusetts', 'Michigan', 'Minnesota', 'Mississippi', 'Missouri', 'Montana', 'Nebraska', 'Nevada', 'New Hampshire', 'New Jersey', 'New Mexico', 'New York', 'North Carolina', 'North Dakota', 'Ohio', 'Oklahoma', 'Oregon', 'Pennsylvania', 'Rhode Island', 'South Carolina', 'South Dakota', 'Tennessee', 'Texas', 'Utah', 'Vermont', 'Virginia', 'Washington', 'West Virginia', 'Wisconsin', 'Wyoming'],
  MX: ['Ciudad de México', 'Jalisco', 'Nuevo León', 'Puebla', 'Veracruz', 'Guanajuato', 'Chiapas', 'Michoacán', 'Oaxaca', 'Guerrero', 'Hidalgo', 'San Luis Potosí', 'Sinaloa', 'Sonora', 'Coahuila', 'Tabasco', 'Yucatán', 'Quintana Roo', 'Chihuahua', 'Baja California', 'Tamaulipas', 'Durango', 'Aguascalientes', 'Querétaro', 'Morelos', 'Colima', 'Nayarit', 'Campeche', 'Tlaxcala', 'Zacatecas'],
  AR: ['Buenos Aires', 'Córdoba', 'Santa Fe', 'Mendoza', 'Tucumán', 'Entre Ríos', 'Salta', 'Misiones', 'Chaco', 'Corrientes', 'Santiago del Estero', 'San Juan', 'Jujuy', 'Río Negro', 'Neuquén', 'Chubut', 'Santa Cruz', 'La Pampa', 'Formosa', 'La Rioja', 'Catamarca', 'San Luis'],
  CO: ['Bogotá', 'Antioquia', 'Valle del Cauca', 'Cundinamarca', 'Santander', 'Norte de Santander', 'Bolívar', 'Atlántico', 'Boyacá', 'Caldas', 'Risaralda', 'Quindío', 'Huila', 'Tolima', 'Meta', 'Cauca', 'Nariño', 'Cesar', 'Magdalena', 'Córdoba', 'Sucre', 'Chocó', 'Amazonas', 'Guainía', 'Guaviare', 'Vaupés', 'Vichada', 'Caquetá', 'Putumayo'],
  PE: ['Lima', 'Arequipa', 'Cusco', 'La Libertad', 'Piura', 'Junín', 'Cajamarca', 'Lambayeque', 'Puno', 'Ancash', 'Ica', 'San Martín', 'Huánuco', 'Ucayali', 'Madre de Dios', 'Tacna', 'Moquegua', 'Pasco', 'Tumbes', 'Amazonas', 'Loreto', 'Ayacucho', 'Apurímac'],
  CL: ['Santiago', 'Valparaíso', 'Concepción', 'La Araucanía', 'Biobío', 'Antofagasta', 'Metropolitana', 'Coquimbo', 'Araucanía', 'Los Lagos', 'Los Ríos', 'Maule', 'Ñuble', 'O\'Higgins', 'Atacama', 'Magallanes', 'Tarapacá', 'Aysén'],
  BR: ['São Paulo', 'Rio de Janeiro', 'Minas Gerais', 'Bahia', 'Paraná', 'Rio Grande do Sul', 'Pernambuco', 'Ceará', 'Pará', 'Maranhão', 'Santa Catarina', 'Goiás', 'Paraíba', 'Espírito Santo', 'Rio Grande do Norte', 'Alagoas', 'Mato Grosso', 'Mato Grosso do Sul', 'Piauí', 'Distrito Federal', 'Amazonas', 'Sergipe', 'Rondônia', 'Tocantins', 'Acre', 'Amapá', 'Roraima'],
  FR: ['Île-de-France', 'Provence-Alpes-Côte d\'Azur', 'Auvergne-Rhône-Alpes', 'Hauts-de-France', 'Nouvelle-Aquitaine', 'Occitanie', 'Grand Est', 'Pays de la Loire', 'Bretagne', 'Normandie', 'Centre-Val de Loire', 'Bourgogne-Franche-Comté', 'Corse'],
  DE: ['Baviera', 'Berlín', 'Baden-Wurtemberg', 'Renania del Norte-Westfalia', 'Hesse', 'Sajonia', 'Baja Sajonia', 'Renania-Palatinado', 'Brandeburgo', 'Turingia', 'Sajonia-Anhalt', 'Schleswig-Holstein', 'Mecklemburgo-Pomerania Occidental', 'Hamburgo', 'Bremen', 'Sarre'],
  IT: ['Lombardía', 'Lacio', 'Campania', 'Sicilia', 'Véneto', 'Piamonte', 'Puglia', 'Emilia-Romaña', 'Toscana', 'Cerdeña', 'Liguria', 'Marcas', 'Abruzos', 'Calabria', 'Friuli-Venecia Julia', 'Umbría', 'Basilicata', 'Molise', 'Valle de Aosta', 'Trentino-Alto Adigio'],
  PT: ['Lisboa', 'Oporto', 'Setúbal', 'Braga', 'Aveiro', 'Coimbra', 'Leiría', 'Faro', 'Viseu', 'Vila Real', 'Castelo Branco', 'Guarda', 'Évora', 'Santarém', 'Portalegre', 'Beja', 'Viana do Castelo', 'Bragança'],
  GB: ['Inglaterra', 'Escocia', 'Gales', 'Irlanda del Norte'],
  CA: ['Ontario', 'Quebec', 'Columbia Británica', 'Alberta', 'Manitoba', 'Saskatchewan', 'Nueva Escocia', 'Nuevo Brunswick', 'Isla del Príncipe Eduardo', 'Terranova y Labrador', 'Yukon', 'Territorios del Noroeste', 'Nunavut'],
  AU: ['Nueva Gales del Sur', 'Victoria', 'Queensland', 'Australia Occidental', 'Australia del Sur', 'Tasmania', 'Territorio de la Capital Australiana', 'Territorio del Norte'],
  JP: ['Tokio', 'Osaka', 'Kioto', 'Hokkaido', 'Fukuoka', 'Aichi', 'Hyogo', 'Saitama', 'Chiba', 'Kanagawa', 'Hiroshima', 'Miyagi', 'Shizuoka', 'Gunma', 'Tochigi', 'Ibaraki', 'Gifu', 'Nagano', 'Niigata', 'Ishikawa', 'Fukui', 'Yamanashi', 'Nara', 'Wakayama', 'Tottori', 'Shimane', 'Okayama', 'Hiroshima', 'Yamaguchi', 'Kagawa', 'Ehime', 'Kochi', 'Fukuoka', 'Saga', 'Nagasaki', 'Kumamoto', 'Oita', 'Miyazaki', 'Kagoshima', 'Okinawa'],
  CN: ['Pekín', 'Shanghái', 'Guangdong', 'Zhejiang', 'Jiangsu', 'Shandong', 'Henan', 'Sichuan', 'Hubei', 'Hunan', 'Hebei', 'Fujian', 'Anhui', 'Liaoning', 'Jiangxi', 'Shaanxi', 'Chongqing', 'Tianjin', 'Yunnan', 'Guangxi', 'Guizhou', 'Gansu', 'Shanxi', 'Jilin', 'Heilongjiang', 'Mongolia Interior', 'Xinjiang', 'Tíbet', 'Hainan', 'Ningxia', 'Qinghai'],
  IN: ['Maharashtra', 'Delhi', 'Karnataka', 'Tamil Nadu', 'Gujarat', 'Uttar Pradesh', 'Bengala Occidental', 'Rajasthan', 'Andhra Pradesh', 'Telangana', 'Madhya Pradesh', 'Kerala', 'Punjab', 'Haryana', 'Jharkhand', 'Bihar', 'Odisha', 'Assam', 'Chhattisgarh', 'Uttarakhand', 'Himachal Pradesh', 'Jammu y Cachemira', 'Goa', 'Puducherry', 'Chandigarh', 'Dadra y Nagar Haveli', 'Daman y Diu', 'Lakshadweep', 'Andaman y Nicobar'],
  RU: ['Moscú', 'San Petersburgo', 'Óblast de Moscú', 'Krasnodar', 'Sverdlovsk', 'Tatarstán', 'Cheliábinsk', 'Nizhni Nóvgorod', 'Samara', 'Rostov', 'Bashkortostán', 'Krasnoyarsk', 'Novosibirsk', 'Perm', 'Vorónezh', 'Volgograd', 'Saratov', 'Irkutsk', 'Yaroslavl', 'Khabarovsk', 'Primorie', 'Arjángelsk', 'Vologda', 'Kaliningrado', 'Kaluga', 'Kursk', 'Leningrado', 'Lipetsk', 'Murmansk', 'Nizhni Nóvgorod', 'Oremburgo', 'Penza', 'Pskov', 'Riazán', 'Sajalín', 'Smolensk', 'Tambov', 'Tula', 'Tver', 'Uliánovsk', 'Vladimir', 'Vladimir'],
  KR: ['Seúl', 'Busán', 'Incheon', 'Daegu', 'Daejeon', 'Gwangju', 'Suwon', 'Ulsan', 'Changwon', 'Goyang', 'Seongnam', 'Uijeongbu', 'Cheongju', 'Jeonju', 'Cheongju', 'Pohang', 'Jeju', 'Gangneung', 'Chuncheon', 'Gyeongju', 'Andong', 'Jinju', 'Sacheon', 'Gimhae', 'Masan', 'Yangsan', 'Miryang', 'Geoje', 'Tongyeong', 'Yeosu', 'Suncheon', 'Mokpo', 'Gwangyang', 'Namhae', 'Hadong', 'Sacheon', 'Gimhae'],
};

const GENDER_OPTIONS = ['Masculino', 'Femenino', 'Otro', 'Prefiero no decirlo'];

export default function CompleteProfileScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const [selectedCountry, setSelectedCountry] = useState('ES');
  const [selectedProvince, setSelectedProvince] = useState('');
  const [selectedGender, setSelectedGender] = useState('');
  const [showProvinceModal, setShowProvinceModal] = useState(false);
  const [showGenderModal, setShowGenderModal] = useState(false);

  useEffect(() => {
    // Leer el país seleccionado de AsyncStorage
    const loadSelectedCountry = async () => {
      try {
        const countryData = await AsyncStorage.getItem('selectedCountry');
        if (countryData) {
          const country = JSON.parse(countryData);
          setSelectedCountry(country.code);
        }
      } catch (error) {
        console.error('Error loading country:', error);
      }
    };

    loadSelectedCountry();
  }, []);

  const handleProvinceSelect = (province: string) => {
    setSelectedProvince(province);
    setShowProvinceModal(false);
  };

  const handleGenderSelect = (gender: string) => {
    setSelectedGender(gender);
    setShowGenderModal(false);
  };

  const provinces = PROVINCES_BY_COUNTRY[selectedCountry as keyof typeof PROVINCES_BY_COUNTRY] || [];

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Completar Perfil</Text>
        <Text style={styles.subtitle}>Completa tu perfil para empezar a jugar</Text>
      </View>

      <View style={styles.form}>
        <Text style={styles.label}>Provincia/Región</Text>
        <Pressable style={styles.selectButton} onPress={() => setShowProvinceModal(true)}>
          <Text style={styles.selectButtonText}>
            {selectedProvince || 'Seleccionar provincia/región'}
          </Text>
        </Pressable>

        <Text style={styles.label}>Género</Text>
        <Pressable style={styles.selectButton} onPress={() => setShowGenderModal(true)}>
          <Text style={styles.selectButtonText}>
            {selectedGender || 'Seleccionar género'}
          </Text>
        </Pressable>

        <Pressable 
          style={[styles.button, (!selectedProvince || !selectedGender) && styles.disabledButton]}
          onPress={() => router.push('/(app)')}
          disabled={!selectedProvince || !selectedGender}
        >
          <Text style={styles.buttonText}>Comenzar</Text>
        </Pressable>
      </View>

      {/* Modal para seleccionar provincia */}
      <Modal
        visible={showProvinceModal}
        animationType="slide"
        onRequestClose={() => setShowProvinceModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Provincia/Región</Text>
            <Pressable onPress={() => setShowProvinceModal(false)}>
              <CustomIcon name="close" size={20} color={Colors.light.text} />
            </Pressable>
          </View>

          <ScrollView style={styles.modalContent}>
            {provinces.map((province) => (
              <Pressable
                key={province}
                style={styles.optionItem}
                onPress={() => handleProvinceSelect(province)}
              >
                <Text style={styles.optionText}>{province}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      </Modal>

      {/* Modal para seleccionar género */}
      <Modal
        visible={showGenderModal}
        animationType="slide"
        onRequestClose={() => setShowGenderModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Género</Text>
            <Pressable onPress={() => setShowGenderModal(false)}>
              <CustomIcon name="close" size={20} color={Colors.light.text} />
            </Pressable>
          </View>

          <View style={styles.modalContent}>
            {GENDER_OPTIONS.map((gender) => (
              <Pressable
                key={gender}
                style={styles.optionItem}
                onPress={() => handleGenderSelect(gender)}
              >
                <Text style={styles.optionText}>{gender}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  header: {
    padding: Spacing.six,
    alignItems: 'center',
    backgroundColor: Colors.light.backgroundElement,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.light.text,
    marginBottom: Spacing.two,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    textAlign: 'center',
  },
  form: {
    padding: Spacing.four,
    gap: Spacing.three,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.text,
    marginBottom: Spacing.one,
  },
  selectButton: {
    backgroundColor: Colors.light.backgroundElement,
    padding: Spacing.four,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.light.gradientStart,
    marginBottom: Spacing.three,
  },
  selectButtonText: {
    fontSize: 18,
    color: Colors.light.text,
    textAlign: 'center',
  },
  button: {
    backgroundColor: Colors.light.gradientStart,
    padding: Spacing.four,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: Spacing.two,
  },
  disabledButton: {
    backgroundColor: Colors.light.backgroundSelected,
    opacity: 0.5,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.six,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.backgroundSelected,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.light.text,
  },
  modalClose: {
    fontSize: 24,
    color: Colors.light.textSecondary,
  },
  modalContent: {
    flex: 1,
    padding: Spacing.four,
  },
  optionItem: {
    padding: Spacing.four,
    backgroundColor: Colors.light.backgroundElement,
    borderRadius: 12,
    marginBottom: Spacing.two,
  },
  optionText: {
    fontSize: 18,
    color: Colors.light.text,
    textAlign: 'center',
  },
});
