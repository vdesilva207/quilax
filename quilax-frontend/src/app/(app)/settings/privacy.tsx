import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Spacing } from '@/constants/theme';
import { useRouter } from 'expo-router';
import CustomIcon from '@/components/CustomIcon';

export default function PrivacyPolicyScreen() {
  const router = useRouter();

  return (
    <ScrollView style={styles.container}>
      <LinearGradient
        colors={[Colors.light.gradientStart, Colors.light.gradientEnd]}
        style={styles.gradientHeader}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <CustomIcon name="back" size={24} color={Colors.light.text} />
          </Pressable>
          <Text style={styles.title}>Política de Privacidad</Text>
        </View>
      </LinearGradient>

      <View style={styles.content}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>1. Información que Recopilamos</Text>
          <Text style={styles.text}>
            Recopilamos información personal que nos proporcionas directamente, como tu nombre, email, fecha de nacimiento y información de pago. También recopilamos información sobre tu uso de la aplicación.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>2. Cómo Usamos tu Información</Text>
          <Text style={styles.text}>
            Usamos tu información para proporcionar y mejorar nuestros servicios, procesar pagos, enviar notificaciones importantes, y proteger la seguridad de la plataforma.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>3. Compartición de Información</Text>
          <Text style={styles.text}>
            No vendemos tu información personal. Solo compartimos tu información con terceros cuando es necesario para proporcionar nuestros servicios, como procesadores de pago, o cuando lo requiere la ley.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>4. Seguridad de Datos</Text>
          <Text style={styles.text}>
            Implementamos medidas de seguridad robustas para proteger tu información personal, incluyendo encriptación de datos y protocolos de seguridad estándar de la industria.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>5. Tus Derechos</Text>
          <Text style={styles.text}>
            Tienes derecho a acceder, corregir o eliminar tu información personal. También puedes optar por no recibir ciertas comunicaciones de nuestra parte.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>6. Cookies y Tecnologías Similares</Text>
          <Text style={styles.text}>
            Utilizamos cookies y tecnologías similares para mejorar tu experiencia en la aplicación, analizar el uso y personalizar el contenido.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>7. Información de Menores</Text>
          <Text style={styles.text}>
            Nuestros servicios no están destinados a menores de 18 años. No recopilamos conscientemente información personal de menores.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>8. Cambios a esta Política</Text>
          <Text style={styles.text}>
            Podemos actualizar esta política de privacidad de vez en cuando. Te notificaremos sobre cualquier cambio importante publicando la nueva política en la aplicación.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>9. Contacto</Text>
          <Text style={styles.text}>
            Si tienes preguntas sobre esta política de privacidad o sobre cómo manejamos tu información personal, por favor contáctanos a través de la sección de Ayuda y Soporte.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>10. Cumplimiento Legal</Text>
          <Text style={styles.text}>
            Cumplimos con el Reglamento General de Protección de Datos (GDPR) y otras leyes de protección de datos aplicables.
          </Text>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Última actualización: Junio 2026</Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  gradientHeader: {
    paddingTop: Spacing.six,
    paddingBottom: Spacing.four,
    paddingHorizontal: Spacing.six,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    padding: Spacing.two,
  },
  backButtonText: {
    fontSize: 24,
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  content: {
    padding: Spacing.four,
  },
  section: {
    marginBottom: Spacing.four,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.light.text,
    marginBottom: Spacing.two,
  },
  text: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    lineHeight: 20,
  },
  footer: {
    marginTop: Spacing.four,
    padding: Spacing.four,
    borderTopWidth: 1,
    borderTopColor: Colors.light.backgroundSelected,
  },
  footerText: {
    fontSize: 12,
    color: Colors.light.textSecondary,
    textAlign: 'center',
  },
});
