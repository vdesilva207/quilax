import { View, Text, StyleSheet, ScrollView, Pressable, TextInput, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Spacing } from '@/constants/theme';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import CustomIcon from '@/components/CustomIcon';

export default function SupportTicketsScreen() {
  const router = useRouter();
  const [selectedTab, setSelectedTab] = useState<'list' | 'create'>('list');
  const [subject, setSubject] = useState('');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');

  const myTickets = [
    { id: 1, subject: 'Problema con pago', category: 'Pagos', status: 'En progreso', date: '01/06/2026' },
    { id: 2, subject: 'No puedo crear quiz', category: 'Quizzes', status: 'Abierto', date: '28/05/2026' },
    { id: 3, subject: 'Error al iniciar sesión', category: 'Técnico', status: 'Cerrado', date: '25/05/2026' },
  ];

  const categories = ['Cuenta', 'Pagos', 'Quizzes', 'Técnico', 'Otros'];

  const handleCreateTicket = () => {
    if (!subject || !category || !description) {
      Alert.alert('Error', 'Por favor completa todos los campos');
      return;
    }

    Alert.alert('Ticket Creado', 'Tu ticket ha sido creado correctamente. Te responderemos pronto.');
    setSelectedTab('list');
    setSubject('');
    setCategory('');
    setDescription('');
  };

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
          <Text style={styles.title}>Tickets de Soporte</Text>
        </View>
      </LinearGradient>

      <View style={styles.content}>
        <View style={styles.tabs}>
          <Pressable
            style={[styles.tab, selectedTab === 'list' && styles.tabActive]}
            onPress={() => setSelectedTab('list')}
          >
            <Text style={[styles.tabText, selectedTab === 'list' && styles.tabTextActive]}>Mis Tickets</Text>
          </Pressable>
          <Pressable
            style={[styles.tab, selectedTab === 'create' && styles.tabActive]}
            onPress={() => setSelectedTab('create')}
          >
            <Text style={[styles.tabText, selectedTab === 'create' && styles.tabTextActive]}>Crear Ticket</Text>
          </Pressable>
        </View>

        {selectedTab === 'list' ? (
          <View style={styles.section}>
            {myTickets.map((ticket) => (
              <Pressable key={ticket.id} style={styles.ticketItem}>
                <View style={styles.ticketHeader}>
                  <Text style={styles.ticketSubject}>{ticket.subject}</Text>
                  <Text style={[
                    styles.ticketStatus,
                    ticket.status === 'En progreso' ? styles.statusEnprogreso :
                    ticket.status === 'Abierto' ? styles.statusAbierto :
                    styles.statusCerrado
                  ]}>
                    {ticket.status}
                  </Text>
                </View>
                <View style={styles.ticketInfo}>
                  <Text style={styles.ticketCategory}>{ticket.category}</Text>
                  <Text style={styles.ticketDate}>{ticket.date}</Text>
                </View>
              </Pressable>
            ))}
          </View>
        ) : (
          <View style={styles.section}>
            <Text style={styles.label}>Categoría</Text>
            <View style={styles.categoriesContainer}>
              {categories.map((cat) => (
                <Pressable
                  key={cat}
                  style={[styles.categoryChip, category === cat && styles.categoryChipActive]}
                  onPress={() => setCategory(cat)}
                >
                  <Text style={[styles.categoryChipText, category === cat && styles.categoryChipTextActive]}>
                    {cat}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text style={styles.label}>Asunto</Text>
            <TextInput
              style={styles.input}
              placeholder="Describe brevemente tu problema"
              placeholderTextColor={Colors.light.textSecondary}
              value={subject}
              onChangeText={setSubject}
            />

            <Text style={styles.label}>Descripción</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Describe detalladamente tu problema..."
              placeholderTextColor={Colors.light.textSecondary}
              multiline
              numberOfLines={6}
              value={description}
              onChangeText={setDescription}
            />

            <Pressable style={styles.submitButton} onPress={handleCreateTicket}>
              <Text style={styles.submitButtonText}>Enviar Ticket</Text>
            </Pressable>
          </View>
        )}
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
  tabs: {
    flexDirection: 'row',
    marginBottom: Spacing.four,
    backgroundColor: Colors.light.backgroundElement,
    borderRadius: 8,
    padding: Spacing.one,
  },
  tab: {
    flex: 1,
    padding: Spacing.three,
    borderRadius: 6,
    alignItems: 'center',
  },
  tabActive: {
    backgroundColor: Colors.light.gradientStart,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.light.textSecondary,
  },
  tabTextActive: {
    color: '#FFFFFF',
  },
  section: {
    marginTop: Spacing.four,
  },
  ticketItem: {
    backgroundColor: Colors.light.backgroundElement,
    padding: Spacing.four,
    borderRadius: 12,
    marginBottom: Spacing.three,
  },
  ticketHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.two,
  },
  ticketSubject: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.text,
  },
  ticketStatus: {
    fontSize: 12,
    fontWeight: '600',
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
    borderRadius: 4,
  },
  statusAbierto: {
    backgroundColor: '#E3F2FD',
    color: '#1976D2',
  },
  statusEnprogreso: {
    backgroundColor: '#FFF3E0',
    color: '#F57C00',
  },
  statusCerrado: {
    backgroundColor: '#E8F5E9',
    color: '#388E3C',
  },
  ticketInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  ticketCategory: {
    fontSize: 14,
    color: Colors.light.textSecondary,
  },
  ticketDate: {
    fontSize: 14,
    color: Colors.light.textSecondary,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.text,
    marginBottom: Spacing.two,
  },
  categoriesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: Spacing.four,
  },
  categoryChip: {
    backgroundColor: Colors.light.backgroundElement,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: 20,
    marginRight: Spacing.two,
    marginBottom: Spacing.two,
  },
  categoryChipActive: {
    backgroundColor: Colors.light.gradientStart,
  },
  categoryChipText: {
    fontSize: 14,
    color: Colors.light.textSecondary,
  },
  categoryChipTextActive: {
    color: '#FFFFFF',
  },
  input: {
    backgroundColor: Colors.light.backgroundElement,
    padding: Spacing.four,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.light.backgroundSelected,
    fontSize: 16,
    marginBottom: Spacing.four,
  },
  textArea: {
    minHeight: 120,
    textAlignVertical: 'top',
  },
  submitButton: {
    backgroundColor: Colors.light.gradientStart,
    padding: Spacing.four,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: Spacing.two,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
