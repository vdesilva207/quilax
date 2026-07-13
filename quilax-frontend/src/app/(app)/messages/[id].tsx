import { View, Text, StyleSheet, ScrollView, Pressable, TextInput } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Colors, Spacing } from '@/constants/theme';
import { useLocalSearchParams, useRouter } from 'expo-router';
import CustomIcon from '@/components/CustomIcon';

export default function ChatScreen() {
  const { t } = useTranslation();
  const { id } = useLocalSearchParams();
  const router = useRouter();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <CustomIcon name="back" size={24} color={Colors.light.text} />
        </Pressable>
        <Text style={styles.username}>@usuario{id}</Text>
        <Pressable style={styles.menuButton}>
          <Text style={styles.menuButtonText}>⋮</Text>
        </Pressable>
      </View>

      <ScrollView style={styles.messagesContainer}>
        <View style={styles.messageReceived}>
          <Text style={styles.messageText}>¡Hola! ¿Cómo estás?</Text>
          <Text style={styles.messageTime}>10:30</Text>
        </View>
        
        <View style={styles.messageSent}>
          <Text style={styles.messageText}>¡Muy bien! ¿Y tú?</Text>
          <Text style={styles.messageTime}>10:31</Text>
        </View>
        
        <View style={styles.messageReceived}>
          <Text style={styles.messageText}>Todo bien. ¿Vamos a jugar un quiz?</Text>
          <Text style={styles.messageTime}>10:32</Text>
        </View>
      </ScrollView>

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="Escribe un mensaje..."
          placeholderTextColor={Colors.light.textSecondary}
        />
        <Pressable style={styles.sendButton}>
          <Text style={styles.sendButtonText}>➤</Text>
        </Pressable>
      </View>
    </View>
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
    justifyContent: 'space-between',
  },
  backButton: {
    padding: Spacing.two,
  },
  backButtonText: {
    fontSize: 24,
    color: Colors.light.text,
    fontWeight: 'bold',
  },
  username: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.light.text,
  },
  menuButton: {
    padding: Spacing.two,
  },
  menuButtonText: {
    fontSize: 24,
    color: Colors.light.text,
  },
  messagesContainer: {
    flex: 1,
    padding: Spacing.four,
    gap: Spacing.three,
  },
  messageReceived: {
    backgroundColor: Colors.light.backgroundElement,
    padding: Spacing.four,
    borderRadius: 8,
    alignSelf: 'flex-start',
    maxWidth: '70%',
  },
  messageSent: {
    backgroundColor: Colors.light.gradientStart,
    padding: Spacing.four,
    borderRadius: 8,
    alignSelf: 'flex-end',
    maxWidth: '70%',
  },
  messageText: {
    fontSize: 16,
    color: Colors.light.text,
  },
  messageTime: {
    fontSize: 12,
    color: Colors.light.textSecondary,
    marginTop: Spacing.one,
  },
  inputContainer: {
    flexDirection: 'row',
    padding: Spacing.four,
    backgroundColor: Colors.light.backgroundElement,
    gap: Spacing.two,
  },
  input: {
    flex: 1,
    backgroundColor: Colors.light.background,
    padding: Spacing.four,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.light.backgroundSelected,
    fontSize: 16,
  },
  sendButton: {
    backgroundColor: Colors.light.gradientStart,
    padding: Spacing.four,
    borderRadius: 8,
    paddingHorizontal: Spacing.six,
  },
  sendButtonText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
  },
});
