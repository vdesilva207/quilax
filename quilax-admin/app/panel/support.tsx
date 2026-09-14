import { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Spacing, titleTypeface } from '@/constants/theme';
import { AppScreen, AppHeader, AppSection, AppCard } from '@/components/ui/AppScreen';
import { GradientButton } from '@/components/ui/GradientButton';
import { brandGradientProps } from '@/constants/gradients';
import adminService from '@/services/adminService';

type TicketStatus = 'OPEN' | 'IN_PROGRESS' | 'CLOSED';

type SupportTicket = {
  id: number;
  subject?: string;
  description?: string;
  status: TicketStatus;
  priority?: string;
  category?: string;
  createdAt: string;
  user?: { id: number; username?: string; email?: string };
  messages?: { id: number; content?: string; message?: string; isFromAdmin?: boolean; createdAt: string }[];
};

const STATUS_FILTERS: { id: TicketStatus | 'ALL'; label: string }[] = [
  { id: 'OPEN', label: 'Abiertos' },
  { id: 'IN_PROGRESS', label: 'En curso' },
  { id: 'CLOSED', label: 'Cerrados' },
  { id: 'ALL', label: 'Todos' },
];

export default function SupportScreen() {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<TicketStatus | 'ALL'>('OPEN');
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [detail, setDetail] = useState<SupportTicket | null>(null);
  const [replyDrafts, setReplyDrafts] = useState<Record<number, string>>({});
  const [busyTicketId, setBusyTicketId] = useState<number | null>(null);

  const loadTickets = useCallback(async () => {
    setLoading(true);
    const result = await adminService.getSupportTickets(
      statusFilter === 'ALL' ? undefined : statusFilter,
    );
    if (result.success) {
      setTickets(result.data?.tickets ?? []);
    } else {
      Alert.alert('Error', result.error || 'No se pudieron cargar los tickets');
    }
    setLoading(false);
  }, [statusFilter]);

  useEffect(() => {
    loadTickets();
  }, [loadTickets]);

  const openTicket = async (ticketId: number) => {
    if (expandedId === ticketId) {
      setExpandedId(null);
      setDetail(null);
      return;
    }
    setExpandedId(ticketId);
    const result = await adminService.getSupportTicket(ticketId);
    if (result.success) {
      setDetail(result.data?.ticket || null);
    } else {
      Alert.alert('Error', result.error || 'No se pudo abrir el ticket');
    }
  };

  const handleRespond = async (ticketId: number) => {
    const message = (replyDrafts[ticketId] || '').trim();
    if (!message) {
      Alert.alert('Escribe una respuesta');
      return;
    }
    setBusyTicketId(ticketId);
    const result = await adminService.respondSupportTicket(ticketId, message);
    setBusyTicketId(null);

    if (result.success) {
      setReplyDrafts((prev) => ({ ...prev, [ticketId]: '' }));
      const refreshed = await adminService.getSupportTicket(ticketId);
      if (refreshed.success) setDetail(refreshed.data?.ticket || null);
      loadTickets();
    } else {
      Alert.alert('Error', result.error || 'No se pudo enviar');
    }
  };

  const handleClose = async (ticketId: number) => {
    setBusyTicketId(ticketId);
    const result = await adminService.closeSupportTicket(ticketId, 'Resuelto por admin');
    setBusyTicketId(null);
    if (result.success) {
      setExpandedId(null);
      setDetail(null);
      loadTickets();
    } else {
      Alert.alert('Error', result.error || 'No se pudo cerrar');
    }
  };

  return (
    <AppScreen>
      <AppHeader title="Soporte" subtitle="Consultas de usuarios" />

      <AppSection title="Filtrar" accentIndex={0}>
        <View style={styles.filterRow}>
          {STATUS_FILTERS.map((filter) =>
            statusFilter === filter.id ? (
              <Pressable key={filter.id} onPress={() => setStatusFilter(filter.id)}>
                <LinearGradient {...brandGradientProps} style={styles.filterChipActive}>
                  <Text style={styles.filterChipTextActive}>{filter.label}</Text>
                </LinearGradient>
              </Pressable>
            ) : (
              <Pressable
                key={filter.id}
                style={styles.filterChip}
                onPress={() => setStatusFilter(filter.id)}
              >
                <Text style={styles.filterChipText}>{filter.label}</Text>
              </Pressable>
            )
          )}
        </View>
      </AppSection>

      <AppSection title={`${tickets.length} tickets`} accentIndex={1}>
        {loading ? (
          <ActivityIndicator color={Colors.light.primary} />
        ) : tickets.length === 0 ? (
          <AppCard>
            <Text style={styles.emptyText}>No hay tickets con ese filtro.</Text>
          </AppCard>
        ) : (
          tickets.map((ticket) => {
            const isOpen = expandedId === ticket.id;
            const thread = isOpen ? detail : ticket;
            const msgs = thread?.messages || [];
            const isBusy = busyTicketId === ticket.id;

            return (
              <AppCard key={ticket.id}>
                <Pressable onPress={() => openTicket(ticket.id)}>
                  <View style={styles.ticketHeader}>
                    <Text style={styles.ticketSubject}>
                      {ticket.subject || `Ticket #${ticket.id}`}
                    </Text>
                    <View style={styles.statusPill}>
                      <Text style={styles.statusPillText}>{ticket.status}</Text>
                    </View>
                  </View>
                  <Text style={styles.ticketUser}>
                    {ticket.user?.username
                      ? `@${ticket.user.username}`
                      : ticket.user?.email || 'Usuario'}
                    {' · '}
                    {ticket.category || '—'}
                  </Text>
                  {!isOpen ? (
                    <Text style={styles.preview}>
                      {ticket.description?.slice(0, 120) ||
                        msgs[0]?.content ||
                        msgs[0]?.message ||
                        'Abrir conversación'}
                    </Text>
                  ) : null}
                </Pressable>

                {isOpen ? (
                  <View style={styles.thread}>
                    {!detail ? (
                      <ActivityIndicator color={Colors.light.primary} />
                    ) : (
                      <>
                        {(detail.messages || []).map((m) => (
                          <View
                            key={m.id}
                            style={[
                              styles.bubble,
                              m.isFromAdmin ? styles.bubbleAdmin : styles.bubbleUser,
                            ]}
                          >
                            <Text style={styles.bubbleWho}>
                              {m.isFromAdmin ? 'Admin' : 'Usuario'}
                            </Text>
                            <Text style={styles.bubbleText}>{m.content || m.message}</Text>
                          </View>
                        ))}

                        {ticket.status !== 'CLOSED' ? (
                          <>
                            <TextInput
                              style={styles.replyInput}
                              placeholder="Escribe una respuesta…"
                              placeholderTextColor={Colors.light.textSecondary}
                              value={replyDrafts[ticket.id] || ''}
                              onChangeText={(text) =>
                                setReplyDrafts((prev) => ({ ...prev, [ticket.id]: text }))
                              }
                              multiline
                            />
                            <GradientButton
                              label={isBusy ? 'Enviando…' : 'Responder'}
                              onPress={() => handleRespond(ticket.id)}
                              disabled={isBusy}
                            />
                            <Pressable
                              style={[styles.closeBtn, isBusy && styles.buttonDisabled]}
                              onPress={() => handleClose(ticket.id)}
                              disabled={isBusy}
                            >
                              <Text style={styles.closeBtnText}>Cerrar ticket</Text>
                            </Pressable>
                          </>
                        ) : null}
                      </>
                    )}
                  </View>
                ) : null}
              </AppCard>
            );
          })
        )}
      </AppSection>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  filterRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  filterChip: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(28,25,23,0.08)',
  },
  filterChipActive: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: 999,
  },
  filterChipText: { fontSize: 14, fontWeight: '600', color: Colors.light.textSecondary },
  filterChipTextActive: { fontSize: 14, fontWeight: '800', color: '#fff' },
  emptyText: { color: Colors.light.textSecondary },
  ticketHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
  },
  ticketSubject: {
    ...titleTypeface,
    flex: 1,
    fontSize: 16,
    fontWeight: '800',
    color: Colors.light.text,
  },
  statusPill: {
    backgroundColor: '#EFF6FF',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  statusPillText: { fontSize: 11, fontWeight: '700', color: Colors.light.primary },
  ticketUser: { marginTop: 6, fontSize: 13, color: Colors.light.textSecondary },
  preview: { marginTop: 8, fontSize: 13, color: Colors.light.textSecondary, lineHeight: 18 },
  thread: { marginTop: Spacing.three, gap: Spacing.two },
  bubble: { borderRadius: 12, padding: Spacing.three },
  bubbleAdmin: { backgroundColor: '#EEF2FF', alignSelf: 'flex-start', maxWidth: '95%' },
  bubbleUser: { backgroundColor: Colors.light.backgroundSelected, alignSelf: 'flex-end', maxWidth: '95%' },
  bubbleWho: { fontSize: 11, fontWeight: '700', color: Colors.light.textSecondary, marginBottom: 4 },
  bubbleText: { color: Colors.light.text, lineHeight: 20 },
  replyInput: {
    minHeight: 80,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(28,25,23,0.08)',
    padding: Spacing.three,
    textAlignVertical: 'top',
    backgroundColor: '#fff',
    color: Colors.light.text,
  },
  closeBtn: {
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#FEF2F2',
  },
  closeBtnText: { color: Colors.light.error, fontWeight: '700' },
  buttonDisabled: { opacity: 0.5 },
});
