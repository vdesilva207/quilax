import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator, Alert, TextInput, Modal } from 'react-native';
import { useState, useEffect } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Spacing } from '@/constants/theme';
import { useRouter } from 'expo-router';
import { authFetch } from '@/lib/api';

interface Notification {
  id: number;
  title: string;
  message: string;
  type: string;
  createdAt: string;
}

interface UserMessage {
  id: number;
  userId: number;
  username: string;
  subject: string;
  message: string;
  status: string;
  createdAt: string;
}

interface AdminMessage {
  id: number;
  senderId: number;
  senderName: string;
  subject: string;
  message: string;
  createdAt: string;
}

export default function NotificationsScreen() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [userMessages, setUserMessages] = useState<UserMessage[]>([]);
  const [adminMessages, setAdminMessages] = useState<AdminMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [showGlobalModal, setShowGlobalModal] = useState(false);
  const [showUserModal, setShowUserModal] = useState(false);
  const [showAdminMessageModal, setShowAdminMessageModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'sent' | 'inbox' | 'admin'>('sent');
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [selectedUserId, setSelectedUserId] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    const loadAll = async () => {
      setLoading(true);
      await Promise.all([fetchNotifications(), fetchUserMessages(), fetchAdminMessages()]);
      setLoading(false);
    };
    loadAll();
  }, []);

  const fetchNotifications = async () => {
    try {
      const response = await authFetch('/admin/notifications');
      const data = await response.json();

      if (data.success) {
        setNotifications(data.notifications);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  };

  const fetchUserMessages = async () => {
    try {
      const response = await authFetch('/admin/messages/inbox');
      const data = await response.json();

      if (data.success) {
        setUserMessages(data.messages);
      }
    } catch (error) {
      console.error('Error fetching user messages:', error);
    }
  };

  const fetchAdminMessages = async () => {
    try {
      const response = await authFetch('/admin/messages/admin');
      const data = await response.json();

      if (data.success) {
        setAdminMessages(data.messages);
      }
    } catch (error) {
      console.error('Error fetching admin messages:', error);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleSendGlobal = async () => {
    if (!title || !message) {
      Alert.alert('Error', 'Título y mensaje son requeridos');
      return;
    }

    setSending(true);

    try {
      const response = await authFetch('/admin/notifications/global', {
        method: 'POST',
        body: JSON.stringify({ title, message, type: 'ANNOUNCEMENT' }),
      });

      const data = await response.json();

      if (data.success) {
        Alert.alert('Éxito', data.message);
        setShowGlobalModal(false);
        setTitle('');
        setMessage('');
        fetchNotifications();
      } else {
        Alert.alert('Error', data.error);
      }
    } catch (error) {
      Alert.alert('Error', 'Error al enviar notificación');
    } finally {
      setSending(false);
    }
  };

  const handleSendToUser = async () => {
    if (!title || !message || !selectedUserId) {
      Alert.alert('Error', 'Todos los campos son requeridos');
      return;
    }

    setSending(true);

    try {
      const response = await authFetch(`/admin/notifications/user/${selectedUserId}`, {
        method: 'POST',
        body: JSON.stringify({ title, message, type: 'ANNOUNCEMENT' }),
      });

      const data = await response.json();

      if (data.success) {
        Alert.alert('Éxito', 'Notificación enviada');
        setShowUserModal(false);
        setTitle('');
        setMessage('');
        setSelectedUserId('');
        fetchNotifications();
      } else {
        Alert.alert('Error', data.error);
      }
    } catch (error) {
      Alert.alert('Error', 'Error al enviar notificación');
    } finally {
      setSending(false);
    }
  };

  const handleSendToAdmin = async () => {
    if (!title || !message) {
      Alert.alert('Error', 'Título y mensaje son requeridos');
      return;
    }

    setSending(true);

    try {
      const response = await authFetch('/admin/messages/admin', {
        method: 'POST',
        body: JSON.stringify({ subject: title, message }),
      });

      const data = await response.json();

      if (data.success) {
        Alert.alert('Éxito', 'Mensaje enviado a administración');
        setShowAdminMessageModal(false);
        setTitle('');
        setMessage('');
        fetchAdminMessages();
      } else {
        Alert.alert('Error', data.error);
      }
    } catch (error) {
      Alert.alert('Error', 'Error al enviar mensaje');
    } finally {
      setSending(false);
    }
  };

  const handleMarkAsRead = async (messageId: number) => {
    try {
      await authFetch(`/admin/messages/inbox/${messageId}/read`, {
        method: 'POST',
      });
      fetchUserMessages();
    } catch (error) {
      console.error('Error marking message as read:', error);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={Colors.light.primary} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <LinearGradient
        colors={[Colors.light.gradientStart, Colors.light.gradientEnd, Colors.light.error]}
        style={styles.gradientHeader}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.headerContent}>
          <Text style={styles.title}>Notificaciones</Text>
          <Text style={styles.subtitle}>Gestión de notificaciones y mensajes</Text>
        </View>
      </LinearGradient>

      <View style={styles.content}>
        {/* Tabs */}
        <View style={styles.tabs}>
          <Pressable
            style={[styles.tab, activeTab === 'sent' && styles.activeTab]}
            onPress={() => setActiveTab('sent')}
          >
            <Text style={[styles.tabText, activeTab === 'sent' && styles.activeTabText]}>Enviadas</Text>
          </Pressable>
          <Pressable
            style={[styles.tab, activeTab === 'inbox' && styles.activeTab]}
            onPress={() => setActiveTab('inbox')}
          >
            <Text style={[styles.tabText, activeTab === 'inbox' && styles.activeTabText]}>Bandeja de Entrada</Text>
          </Pressable>
          <Pressable
            style={[styles.tab, activeTab === 'admin' && styles.activeTab]}
            onPress={() => setActiveTab('admin')}
          >
            <Text style={[styles.tabText, activeTab === 'admin' && styles.activeTabText]}>Mensajes Admin</Text>
          </Pressable>
        </View>

        {activeTab === 'sent' && (
          <>
            <View style={styles.actionButtons}>
              <Pressable
                style={styles.actionButton}
                onPress={() => setShowGlobalModal(true)}
              >
                <Text style={styles.actionButtonText}>Enviar Global</Text>
              </Pressable>
              <Pressable
                style={styles.actionButton}
                onPress={() => setShowUserModal(true)}
              >
                <Text style={styles.actionButtonText}>Enviar a Usuario</Text>
              </Pressable>
            </View>

            {notifications.map((notification) => (
              <View key={notification.id} style={styles.notificationCard}>
                <Text style={styles.notificationTitle}>{notification.title}</Text>
                <Text style={styles.notificationMessage}>{notification.message}</Text>
                <View style={styles.notificationFooter}>
                  <Text style={styles.notificationType}>{notification.type}</Text>
                  <Text style={styles.notificationDate}>{formatDate(notification.createdAt)}</Text>
                </View>
              </View>
            ))}

            {notifications.length === 0 && (
              <Text style={styles.emptyText}>No hay notificaciones enviadas</Text>
            )}
          </>
        )}

        {activeTab === 'inbox' && (
          <>
            {userMessages.map((msg) => (
              <View key={msg.id} style={[styles.messageCard, msg.status === 'UNREAD' && styles.unreadCard]}>
                <View style={styles.messageHeader}>
                  <Text style={styles.messageSender}>{msg.username}</Text>
                  <Text style={styles.messageDate}>{formatDate(msg.createdAt)}</Text>
                </View>
                <Text style={styles.messageSubject}>{msg.subject}</Text>
                <Text style={styles.messageContent}>{msg.message}</Text>
                {msg.status === 'UNREAD' && (
                  <Pressable
                    style={styles.markReadButton}
                    onPress={() => handleMarkAsRead(msg.id)}
                  >
                    <Text style={styles.markReadButtonText}>Marcar como leído</Text>
                  </Pressable>
                )}
              </View>
            ))}

            {userMessages.length === 0 && (
              <Text style={styles.emptyText}>No hay mensajes recibidos</Text>
            )}
          </>
        )}

        {activeTab === 'admin' && (
          <>
            <Text style={styles.emptyText}>
              Los mensajes a admin workers están en la pantalla Mensajes (inbox interno).
            </Text>
            <Pressable
              style={styles.sendAdminButton}
              onPress={() => {
                // kept for principal convenience: open compose still works as broadcast
                setShowAdminMessageModal(true);
              }}
            >
              <Text style={styles.sendAdminButtonText}>Enviar broadcast rápido a workers</Text>
            </Pressable>

            {adminMessages.map((msg) => (
              <View key={msg.id} style={styles.adminMessageCard}>
                <View style={styles.messageHeader}>
                  <Text style={styles.messageSender}>{msg.senderName}</Text>
                  <Text style={styles.messageDate}>{formatDate(msg.createdAt)}</Text>
                </View>
                <Text style={styles.messageSubject}>{msg.subject}</Text>
                <Text style={styles.messageContent}>{msg.message}</Text>
              </View>
            ))}

            {adminMessages.length === 0 && (
              <Text style={styles.emptyText}>No hay mensajes de administración</Text>
            )}
          </>
        )}
      </View>

      <Modal
        visible={showGlobalModal}
        animationType="slide"
        transparent={true}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Enviar Notificación Global</Text>
            <TextInput
              style={styles.input}
              placeholder="Título"
              value={title}
              onChangeText={setTitle}
            />
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Mensaje"
              value={message}
              onChangeText={setMessage}
              multiline
              numberOfLines={4}
            />
            <View style={styles.modalButtons}>
              <Pressable
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setShowGlobalModal(false)}
              >
                <Text style={styles.modalButtonText}>Cancelar</Text>
              </Pressable>
              <Pressable
                style={[styles.modalButton, styles.confirmButton]}
                onPress={handleSendGlobal}
                disabled={sending}
              >
                <Text style={styles.modalButtonText}>{sending ? 'Enviando...' : 'Enviar'}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showUserModal}
        animationType="slide"
        transparent={true}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Enviar Notificación a Usuario</Text>
            <TextInput
              style={styles.input}
              placeholder="ID de Usuario"
              value={selectedUserId}
              onChangeText={setSelectedUserId}
              keyboardType="number-pad"
            />
            <TextInput
              style={styles.input}
              placeholder="Título"
              value={title}
              onChangeText={setTitle}
            />
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Mensaje"
              value={message}
              onChangeText={setMessage}
              multiline
              numberOfLines={4}
            />
            <View style={styles.modalButtons}>
              <Pressable
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setShowUserModal(false)}
              >
                <Text style={styles.modalButtonText}>Cancelar</Text>
              </Pressable>
              <Pressable
                style={[styles.modalButton, styles.confirmButton]}
                onPress={handleSendToUser}
                disabled={sending}
              >
                <Text style={styles.modalButtonText}>{sending ? 'Enviando...' : 'Enviar'}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showAdminMessageModal}
        animationType="slide"
        transparent={true}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Enviar Mensaje a Administración</Text>
            <TextInput
              style={styles.input}
              placeholder="Asunto"
              value={title}
              onChangeText={setTitle}
            />
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Mensaje"
              value={message}
              onChangeText={setMessage}
              multiline
              numberOfLines={4}
            />
            <View style={styles.modalButtons}>
              <Pressable
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setShowAdminMessageModal(false)}
              >
                <Text style={styles.modalButtonText}>Cancelar</Text>
              </Pressable>
              <Pressable
                style={[styles.modalButton, styles.confirmButton]}
                onPress={handleSendToAdmin}
                disabled={sending}
              >
                <Text style={styles.modalButtonText}>{sending ? 'Enviando...' : 'Enviar'}</Text>
              </Pressable>
            </View>
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
  gradientHeader: {
    paddingTop: Spacing.six,
    paddingBottom: Spacing.four,
    paddingHorizontal: Spacing.six,
    alignItems: 'center',
  },
  headerContent: {
    alignItems: 'center',
  },
  title: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: Spacing.one,
  },
  subtitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  content: {
    padding: Spacing.six,
    gap: Spacing.four,
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: Colors.light.backgroundElement,
    borderRadius: 12,
    padding: Spacing.one,
  },
  tab: {
    flex: 1,
    padding: Spacing.three,
    borderRadius: 8,
    alignItems: 'center',
  },
  activeTab: {
    backgroundColor: Colors.light.primary,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.light.textSecondary,
  },
  activeTabText: {
    color: '#FFFFFF',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  actionButton: {
    flex: 1,
    backgroundColor: Colors.light.primary,
    padding: Spacing.four,
    borderRadius: 12,
    alignItems: 'center',
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  notificationCard: {
    backgroundColor: Colors.light.background,
    padding: Spacing.four,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.light.backgroundSelected,
  },
  notificationTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.light.text,
    marginBottom: Spacing.two,
  },
  notificationMessage: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    marginBottom: Spacing.three,
  },
  notificationFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  notificationType: {
    fontSize: 12,
    color: Colors.light.primary,
    fontWeight: '600',
  },
  notificationDate: {
    fontSize: 12,
    color: Colors.light.textSecondary,
  },
  messageCard: {
    backgroundColor: Colors.light.background,
    padding: Spacing.four,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.light.backgroundSelected,
    marginBottom: Spacing.three,
  },
  unreadCard: {
    borderColor: Colors.light.primary,
    borderLeftWidth: 6,
  },
  messageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.two,
  },
  messageSender: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.light.text,
  },
  messageDate: {
    fontSize: 12,
    color: Colors.light.textSecondary,
  },
  messageSubject: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.text,
    marginBottom: Spacing.two,
  },
  messageContent: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    marginBottom: Spacing.three,
  },
  markReadButton: {
    backgroundColor: Colors.light.primary,
    padding: Spacing.three,
    borderRadius: 8,
    alignItems: 'center',
  },
  markReadButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  sendAdminButton: {
    backgroundColor: Colors.light.primary,
    padding: Spacing.four,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: Spacing.three,
  },
  sendAdminButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  adminMessageCard: {
    backgroundColor: Colors.light.background,
    padding: Spacing.four,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.light.backgroundSelected,
    marginBottom: Spacing.three,
  },
  emptyText: {
    fontSize: 16,
    color: Colors.light.textSecondary,
    textAlign: 'center',
    marginTop: Spacing.six,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: Colors.light.background,
    padding: Spacing.six,
    borderRadius: 12,
    width: '90%',
    gap: Spacing.four,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.light.text,
  },
  input: {
    backgroundColor: Colors.light.backgroundSelected,
    padding: Spacing.four,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.light.backgroundSelected,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  modalButton: {
    flex: 1,
    padding: Spacing.four,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: Colors.light.backgroundSelected,
  },
  confirmButton: {
    backgroundColor: Colors.light.primary,
  },
  modalButtonText: {
    color: Colors.light.text,
    fontSize: 16,
    fontWeight: 'bold',
  },
});
