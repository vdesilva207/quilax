import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator, Alert, TextInput, Modal } from 'react-native';
import { useState, useEffect, useCallback } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Spacing } from '@/constants/theme';
import { authFetch } from '@/lib/api';
import { getStoredAuthUser } from '@/lib/secureStorage';

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
  recipientId: number | null;
  recipientName: string | null;
  isBroadcast: boolean;
  subject: string;
  message: string;
  createdAt: string;
}

interface WorkerOption {
  id: number;
  username: string;
  email: string;
}

export default function MessagesScreen() {
  const [role, setRole] = useState<string | null>(null);
  const isPrincipal = role === 'ADMIN';
  const [userMessages, setUserMessages] = useState<UserMessage[]>([]);
  const [adminMessages, setAdminMessages] = useState<AdminMessage[]>([]);
  const [workers, setWorkers] = useState<WorkerOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'inbox' | 'admin'>('inbox');
  const [showCompose, setShowCompose] = useState(false);
  const [showReply, setShowReply] = useState(false);
  const [replyTarget, setReplyTarget] = useState<UserMessage | null>(null);
  const [replyText, setReplyText] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [recipientId, setRecipientId] = useState<string>('all');
  const [sending, setSending] = useState(false);

  const fetchUserMessages = useCallback(async () => {
    try {
      const response = await authFetch('/admin/messages/inbox');
      const data = await response.json();
      if (data.success) setUserMessages(data.messages);
    } catch (error) {
      console.error('Error fetching user messages:', error);
    }
  }, []);

  const fetchAdminMessages = useCallback(async () => {
    try {
      const response = await authFetch('/admin/messages/admin');
      const data = await response.json();
      if (data.success) setAdminMessages(data.messages);
    } catch (error) {
      console.error('Error fetching admin messages:', error);
    }
  }, []);

  const fetchWorkers = useCallback(async () => {
    if (!isPrincipal) return;
    try {
      const response = await authFetch('/admin/messages/workers');
      const data = await response.json();
      if (data.success) setWorkers(data.workers || []);
    } catch (error) {
      console.error('Error fetching workers:', error);
    }
  }, [isPrincipal]);

  useEffect(() => {
    getStoredAuthUser().then((user) => setRole(user?.role || 'ADMIN'));
  }, []);

  useEffect(() => {
    if (role == null) return;
    (async () => {
      setLoading(true);
      await Promise.all([fetchUserMessages(), fetchAdminMessages(), fetchWorkers()]);
      setLoading(false);
    })();
  }, [role, fetchUserMessages, fetchAdminMessages, fetchWorkers]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const statusLabel = (status: string) => {
    if (status === 'RESPONDED') return 'Respondido';
    if (status === 'READ') return 'Leído';
    return 'No leído';
  };

  const handleMarkAsRead = async (messageId: number) => {
    try {
      await authFetch(`/admin/messages/inbox/${messageId}/read`, { method: 'POST' });
      fetchUserMessages();
    } catch (error) {
      console.error('Error marking message as read:', error);
    }
  };

  const openReply = (msg: UserMessage) => {
    setReplyTarget(msg);
    setReplyText('');
    setShowReply(true);
  };

  const handleReply = async () => {
    if (!replyTarget || !replyText.trim()) {
      Alert.alert('Error', 'Escribe una respuesta');
      return;
    }
    setSending(true);
    try {
      const response = await authFetch(`/admin/messages/inbox/${replyTarget.id}/reply`, {
        method: 'POST',
        body: JSON.stringify({ reply: replyText.trim() }),
      });
      const data = await response.json();
      if (data.success) {
        Alert.alert('Listo', 'Respuesta enviada. Marcado como respondido para todos los admins.');
        setShowReply(false);
        setReplyTarget(null);
        setReplyText('');
        fetchUserMessages();
      } else {
        Alert.alert('Error', data.error || 'No se pudo responder');
      }
    } catch {
      Alert.alert('Error', 'Error al enviar la respuesta');
    } finally {
      setSending(false);
    }
  };

  const handleSendInternal = async () => {
    if (!subject.trim() || !message.trim()) {
      Alert.alert('Error', 'Asunto y mensaje son requeridos');
      return;
    }
    setSending(true);
    try {
      const body: { subject: string; message: string; recipientId?: number } = {
        subject: subject.trim(),
        message: message.trim(),
      };
      if (recipientId !== 'all') {
        body.recipientId = parseInt(recipientId, 10);
      }
      const response = await authFetch('/admin/messages/admin', {
        method: 'POST',
        body: JSON.stringify(body),
      });
      const data = await response.json();
      if (data.success) {
        Alert.alert('Éxito', data.message || 'Mensaje enviado');
        setShowCompose(false);
        setSubject('');
        setMessage('');
        setRecipientId('all');
        fetchAdminMessages();
      } else {
        Alert.alert('Error', data.error || 'No se pudo enviar');
      }
    } catch {
      Alert.alert('Error', 'Error al enviar mensaje');
    } finally {
      setSending(false);
    }
  };

  if (loading || role == null) {
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
          <Text style={styles.title}>Mensajes</Text>
          <Text style={styles.subtitle}>Bandeja de mensajes</Text>
        </View>
      </LinearGradient>

      <View style={styles.content}>
        <View style={styles.tabs}>
          <Pressable
            style={[styles.tab, activeTab === 'inbox' && styles.activeTab]}
            onPress={() => setActiveTab('inbox')}
          >
            <Text style={[styles.tabText, activeTab === 'inbox' && styles.activeTabText]}>
              Mensajes users
            </Text>
          </Pressable>
          <Pressable
            style={[styles.tab, activeTab === 'admin' && styles.activeTab]}
            onPress={() => setActiveTab('admin')}
          >
            <Text style={[styles.tabText, activeTab === 'admin' && styles.activeTabText]}>
              Inbox interno
            </Text>
          </Pressable>
        </View>

        {activeTab === 'inbox' && (
          <>
            {userMessages.map((msg) => (
              <View
                key={msg.id}
                style={[
                  styles.messageCard,
                  msg.status === 'UNREAD' && styles.unreadCard,
                  msg.status === 'RESPONDED' && styles.respondedCard,
                ]}
              >
                <View style={styles.messageHeader}>
                  <Text style={styles.messageSender}>{msg.username}</Text>
                  <Text style={styles.messageDate}>{formatDate(msg.createdAt)}</Text>
                </View>
                <Text style={styles.statusBadge}>{statusLabel(msg.status)}</Text>
                <Text style={styles.messageSubject}>{msg.subject}</Text>
                <Text style={styles.messageContent}>{msg.message}</Text>
                <View style={styles.rowActions}>
                  {msg.status === 'UNREAD' && (
                    <Pressable style={styles.secondaryBtn} onPress={() => handleMarkAsRead(msg.id)}>
                      <Text style={styles.secondaryBtnText}>Marcar leído</Text>
                    </Pressable>
                  )}
                  {msg.status !== 'RESPONDED' && (
                    <Pressable style={styles.primaryBtn} onPress={() => openReply(msg)}>
                      <Text style={styles.primaryBtnText}>Responder</Text>
                    </Pressable>
                  )}
                </View>
              </View>
            ))}
            {userMessages.length === 0 && (
              <Text style={styles.emptyText}>No hay mensajes de usuarios</Text>
            )}
          </>
        )}

        {activeTab === 'admin' && (
          <>
            {isPrincipal && (
              <Pressable style={styles.composeBtn} onPress={() => setShowCompose(true)}>
                <Text style={styles.composeBtnText}>Enviar mensaje interno</Text>
              </Pressable>
            )}
            {adminMessages.map((msg) => (
              <View key={msg.id} style={styles.adminMessageCard}>
                <View style={styles.messageHeader}>
                  <Text style={styles.messageSender}>{msg.senderName}</Text>
                  <Text style={styles.messageDate}>{formatDate(msg.createdAt)}</Text>
                </View>
                <Text style={styles.audience}>
                  {msg.isBroadcast
                    ? 'Para: todos'
                    : `Para: ${msg.recipientName || 'destinatario'}`}
                </Text>
                <Text style={styles.messageSubject}>{msg.subject}</Text>
                <Text style={styles.messageContent}>{msg.message}</Text>
              </View>
            ))}
            {adminMessages.length === 0 && (
              <Text style={styles.emptyText}>No hay mensajes internos</Text>
            )}
          </>
        )}
      </View>

      <Modal visible={showCompose} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Mensaje interno</Text>
            <Text style={styles.label}>Destinatario</Text>
            <View style={styles.recipientList}>
              <Pressable
                style={[styles.recipientChip, recipientId === 'all' && styles.recipientChipActive]}
                onPress={() => setRecipientId('all')}
              >
                <Text
                  style={[
                    styles.recipientChipText,
                    recipientId === 'all' && styles.recipientChipTextActive,
                  ]}
                >
                  Todos
                </Text>
              </Pressable>
              {workers.map((w) => (
                <Pressable
                  key={w.id}
                  style={[
                    styles.recipientChip,
                    recipientId === String(w.id) && styles.recipientChipActive,
                  ]}
                  onPress={() => setRecipientId(String(w.id))}
                >
                  <Text
                    style={[
                      styles.recipientChipText,
                      recipientId === String(w.id) && styles.recipientChipTextActive,
                    ]}
                  >
                    {w.username || w.email}
                  </Text>
                </Pressable>
              ))}
            </View>
            <TextInput
              style={styles.input}
              placeholder="Asunto"
              value={subject}
              onChangeText={setSubject}
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
                onPress={() => setShowCompose(false)}
              >
                <Text style={styles.modalButtonText}>Cancelar</Text>
              </Pressable>
              <Pressable
                style={[styles.modalButton, styles.confirmButton]}
                onPress={handleSendInternal}
                disabled={sending}
              >
                <Text style={[styles.modalButtonText, styles.modalButtonTextOnPrimary]}>
                  {sending ? 'Enviando…' : 'Enviar'}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={showReply} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Responder a {replyTarget?.username}</Text>
            <Text style={styles.replyContext}>{replyTarget?.subject}</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Tu respuesta"
              value={replyText}
              onChangeText={setReplyText}
              multiline
              numberOfLines={5}
            />
            <View style={styles.modalButtons}>
              <Pressable
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setShowReply(false)}
              >
                <Text style={styles.modalButtonText}>Cancelar</Text>
              </Pressable>
              <Pressable
                style={[styles.modalButton, styles.confirmButton]}
                onPress={handleReply}
                disabled={sending}
              >
                <Text style={[styles.modalButtonText, styles.modalButtonTextOnPrimary]}>
                  {sending ? 'Enviando…' : 'Responder'}
                </Text>
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
    fontSize: 40,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: Spacing.one,
  },
  subtitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'center',
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
  messageCard: {
    backgroundColor: Colors.light.backgroundElement,
    borderRadius: 12,
    padding: Spacing.four,
    marginBottom: Spacing.three,
    gap: Spacing.one,
  },
  unreadCard: {
    borderWidth: 2,
    borderColor: Colors.light.primary,
  },
  respondedCard: {
    opacity: 0.85,
  },
  adminMessageCard: {
    backgroundColor: Colors.light.backgroundElement,
    borderRadius: 12,
    padding: Spacing.four,
    marginBottom: Spacing.three,
    gap: Spacing.one,
  },
  messageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  messageSender: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.light.text,
  },
  messageDate: {
    fontSize: 12,
    color: Colors.light.textSecondary,
  },
  statusBadge: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.light.primary,
  },
  audience: {
    fontSize: 12,
    color: Colors.light.textSecondary,
    fontWeight: '600',
  },
  messageSubject: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.text,
  },
  messageContent: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    lineHeight: 20,
  },
  rowActions: {
    flexDirection: 'row',
    gap: Spacing.two,
    marginTop: Spacing.two,
  },
  primaryBtn: {
    backgroundColor: Colors.light.primary,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderRadius: 8,
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  secondaryBtn: {
    backgroundColor: Colors.light.backgroundSelected,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderRadius: 8,
  },
  secondaryBtnText: {
    color: Colors.light.text,
    fontWeight: '600',
    fontSize: 13,
  },
  composeBtn: {
    backgroundColor: Colors.light.primary,
    padding: Spacing.four,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: Spacing.two,
  },
  composeBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  emptyText: {
    textAlign: 'center',
    color: Colors.light.textSecondary,
    marginTop: Spacing.four,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    padding: Spacing.four,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: Spacing.five,
    gap: Spacing.three,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.light.text,
  },
  replyContext: {
    fontSize: 14,
    color: Colors.light.textSecondary,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.light.textSecondary,
  },
  recipientList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  recipientChip: {
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderRadius: 999,
    backgroundColor: Colors.light.backgroundElement,
  },
  recipientChipActive: {
    backgroundColor: Colors.light.primary,
  },
  recipientChipText: {
    fontSize: 13,
    color: Colors.light.text,
  },
  recipientChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  input: {
    borderWidth: 1,
    borderColor: Colors.light.backgroundSelected,
    borderRadius: 10,
    padding: Spacing.three,
    fontSize: 15,
    backgroundColor: Colors.light.backgroundElement,
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: Spacing.two,
    marginTop: Spacing.two,
  },
  modalButton: {
    flex: 1,
    padding: Spacing.three,
    borderRadius: 10,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: Colors.light.backgroundSelected,
  },
  confirmButton: {
    backgroundColor: Colors.light.primary,
  },
  modalButtonText: {
    fontWeight: '700',
    color: Colors.light.text,
  },
  modalButtonTextOnPrimary: {
    color: '#FFFFFF',
  },
});
