import { View, Text, StyleSheet, ScrollView, Pressable, TextInput } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Colors, Spacing } from '@/constants/theme';
import { useRouter } from 'expo-router';
import CustomIcon from '@/components/CustomIcon';
import { useState } from 'react';

export default function EditProfileScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const [quizNotifications, setQuizNotifications] = useState(true);
  const [messageNotifications, setMessageNotifications] = useState(true);
  const [followerNotifications, setFollowerNotifications] = useState(true);

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <CustomIcon name="back" size={24} color={Colors.light.text} />
        </Pressable>
        <Text style={styles.title}>Editar Perfil</Text>
      </View>

      <View style={styles.form}>
        <View style={styles.section}>
          <View style={styles.sectionTitleContainer}>
            <CustomIcon name="camera" size={20} color={Colors.light.text} />
            <Text style={styles.sectionTitle}>Editar Foto de Perfil</Text>
          </View>
          <View style={styles.photoArea}>
            <CustomIcon name="user" size={60} color={Colors.light.textSecondary} />
            <Text style={styles.photoText}>Toca para cambiar foto</Text>
          </View>
          <View style={styles.photoActions}>
            <Pressable style={styles.photoButton}>
              <CustomIcon name="camera" size={16} color="#FFFFFF" />
              <Text style={styles.photoButtonText}>Cambiar Foto</Text>
            </Pressable>
            <Pressable style={styles.photoButtonSecondary}>
              <CustomIcon name="close" size={16} color={Colors.light.error} />
              <Text style={styles.photoButtonTextSecondary}>Borrar</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionTitleContainer}>
            <CustomIcon name="edit" size={20} color={Colors.light.text} />
            <Text style={styles.sectionTitle}>Editar Nombre</Text>
          </View>
          <TextInput
            style={styles.input}
            placeholder="Nombre único"
            placeholderTextColor={Colors.light.textSecondary}
          />
        </View>

        <View style={styles.section}>
          <View style={styles.sectionTitleContainer}>
            <CustomIcon name="edit" size={20} color={Colors.light.text} />
            <Text style={styles.sectionTitle}>Editar Biografía</Text>
          </View>
          <TextInput
            style={styles.textArea}
            placeholder="Escribe tu biografía..."
            placeholderTextColor={Colors.light.textSecondary}
            multiline
            numberOfLines={4}
          />
        </View>

        <View style={styles.section}>
          <View style={styles.sectionTitleContainer}>
            <CustomIcon name="photo" size={20} color={Colors.light.text} />
            <Text style={styles.sectionTitle}>Gestión de Fotos Posteadas</Text>
          </View>
          <View style={styles.postedPhotoCard}>
            <View style={styles.postedPhotoPreview}>
              <CustomIcon name="photo" size={40} color={Colors.light.textSecondary} />
            </View>
            <View style={styles.postedPhotoInfo}>
              <Text style={styles.postedPhotoDescription}>Foto de mi victoria en el quiz de historia</Text>
              <Text style={styles.postedPhotoDate}>Hace 3 días</Text>
            </View>
            <Pressable style={styles.deletePhotoButton}>
              <CustomIcon name="close" size={16} color={Colors.light.error} />
            </Pressable>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionTitleContainer}>
            <CustomIcon name="notification" size={20} color={Colors.light.text} />
            <Text style={styles.sectionTitle}>Gestión de Notificaciones</Text>
          </View>
          <View style={styles.notificationOption}>
            <Text style={styles.notificationText}>Quizzes</Text>
            <Pressable 
              style={[styles.toggle, quizNotifications ? styles.toggleOn : styles.toggleOff]}
              onPress={() => setQuizNotifications(!quizNotifications)}
            >
              <View style={[styles.toggleKnob, quizNotifications ? styles.toggleKnobOn : styles.toggleKnobOff]} />
            </Pressable>
          </View>
          <View style={styles.notificationOption}>
            <Text style={styles.notificationText}>Mensajes</Text>
            <Pressable 
              style={[styles.toggle, messageNotifications ? styles.toggleOn : styles.toggleOff]}
              onPress={() => setMessageNotifications(!messageNotifications)}
            >
              <View style={[styles.toggleKnob, messageNotifications ? styles.toggleKnobOn : styles.toggleKnobOff]} />
            </Pressable>
          </View>
          <View style={styles.notificationOption}>
            <Text style={styles.notificationText}>Seguidores</Text>
            <Pressable 
              style={[styles.toggle, followerNotifications ? styles.toggleOn : styles.toggleOff]}
              onPress={() => setFollowerNotifications(!followerNotifications)}
            >
              <View style={[styles.toggleKnob, followerNotifications ? styles.toggleKnobOn : styles.toggleKnobOff]} />
            </Pressable>
          </View>
        </View>

        <Pressable style={styles.saveButton}>
          <CustomIcon name="check" size={20} color="#FFFFFF" />
          <Text style={styles.saveButtonText}>Guardar Cambios</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.four,
    backgroundColor: Colors.light.backgroundElement,
    gap: Spacing.three,
  },
  backButton: {
    padding: Spacing.two,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.light.text,
  },
  form: {
    padding: Spacing.four,
    gap: Spacing.four,
  },
  section: {
    gap: Spacing.three,
  },
  sectionTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.light.text,
  },
  photoArea: {
    backgroundColor: Colors.light.backgroundElement,
    padding: Spacing.six,
    borderRadius: 8,
    alignItems: 'center',
    minHeight: 150,
    borderWidth: 2,
    borderColor: Colors.light.backgroundSelected,
    borderStyle: 'dashed',
    gap: Spacing.two,
  },
  photoText: {
    color: Colors.light.textSecondary,
    fontSize: 16,
  },
  photoActions: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  photoButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.light.gradientStart,
    padding: Spacing.three,
    borderRadius: 8,
    gap: Spacing.two,
  },
  photoButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  photoButtonSecondary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.light.backgroundElement,
    padding: Spacing.three,
    borderRadius: 8,
    gap: Spacing.two,
  },
  photoButtonTextSecondary: {
    color: Colors.light.error,
    fontSize: 14,
    fontWeight: '600',
  },
  input: {
    backgroundColor: Colors.light.background,
    padding: Spacing.four,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.light.backgroundSelected,
    fontSize: 16,
  },
  textArea: {
    backgroundColor: Colors.light.background,
    padding: Spacing.four,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.light.backgroundSelected,
    fontSize: 16,
    minHeight: 100,
  },
  postedPhotoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.light.backgroundElement,
    padding: Spacing.three,
    borderRadius: 8,
    gap: Spacing.three,
  },
  postedPhotoPreview: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: Colors.light.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  postedPhotoInfo: {
    flex: 1,
  },
  postedPhotoDescription: {
    fontSize: 14,
    color: Colors.light.text,
    marginBottom: Spacing.one,
  },
  postedPhotoDate: {
    fontSize: 12,
    color: Colors.light.textSecondary,
  },
  deletePhotoButton: {
    padding: Spacing.two,
  },
  notificationOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.light.backgroundElement,
    padding: Spacing.three,
    borderRadius: 8,
    minHeight: 44,
  },
  notificationText: {
    fontSize: 16,
    color: Colors.light.text,
  },
  toggle: {
    width: 50,
    height: 28,
    borderRadius: 14,
    padding: 2,
    justifyContent: 'center',
  },
  toggleOn: {
    backgroundColor: Colors.light.gradientStart,
  },
  toggleOff: {
    backgroundColor: '#E5E5E5',
  },
  toggleKnob: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 3,
  },
  toggleKnobOn: {
    alignSelf: 'flex-end',
  },
  toggleKnobOff: {
    alignSelf: 'flex-start',
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.light.gradientStart,
    padding: Spacing.four,
    borderRadius: 8,
    gap: Spacing.two,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
});
