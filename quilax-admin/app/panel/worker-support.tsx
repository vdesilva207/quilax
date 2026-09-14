import { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Pressable } from 'react-native';
import { Colors, Spacing } from '@/constants/theme';
import { AppScreen, AppHeader, AppSection, AppCard } from '@/components/ui/AppScreen';
import adminService from '@/services/adminService';

type TicketStatus = 'OPEN' | 'IN_PROGRESS' | 'CLOSED';

type SupportTicket = {
  id: number;
  subject?: string;
  status: TicketStatus;
  createdAt: string;
  user?: { id: number; username?: string; email?: string };
  messages?: { id: number; message: string; createdAt: string }[];
};

const STATUS_FILTERS: { id: TicketStatus | 'ALL'; label: string }[] = [
  { id: 'ALL', label: 'Todos' },
  { id: 'OPEN', label: 'Abiertos' },
  { id: 'IN_PROGRESS', label: 'En curso' },
  { id: 'CLOSED', label: 'Cerrados' },
];

export default function WorkerSupportScreen() {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<TicketStatus | 'ALL'>('OPEN');

  const loadTickets = useCallback(async () => {
    setLoading(true);
    const result = await adminService.getWorkerSupportTickets(
      statusFilter === 'ALL' ? undefined : statusFilter,
    );
    if (result.success) {
      setTickets(result.data?.tickets ?? []);
    }
    setLoading(false);
  }, [statusFilter]);

  useEffect(() => {
    loadTickets();
  }, [loadTickets]);

  return (
    <AppScreen>
      <AppHeader title="Soporte" subtitle="Tickets de usuarios" />

      <AppSection title="Filtrar por estado" accentIndex={0}>
        <View style={styles.filterRow}>
          {STATUS_FILTERS.map((filter) => (
            <Pressable
              key={filter.id}
              style={[styles.filterChip, statusFilter === filter.id && styles.filterChipActive]}
              onPress={() => setStatusFilter(filter.id)}
            >
              <Text
                style={[
                  styles.filterChipText,
                  statusFilter === filter.id && styles.filterChipTextActive,
                ]}
              >
                {filter.label}
              </Text>
            </Pressable>
          ))}
        </View>
      </AppSection>

      <AppSection title={`${tickets.length} tickets`} accentIndex={1}>
        {loading ? (
          <ActivityIndicator color={Colors.light.primary} />
        ) : tickets.length === 0 ? (
          <AppCard tint="cool">
            <Text style={styles.emptyText}>No hay tickets con ese filtro.</Text>
          </AppCard>
        ) : (
          tickets.map((ticket) => (
            <AppCard key={ticket.id} tint="default">
              <View style={styles.ticketHeader}>
                <Text style={styles.ticketSubject}>{ticket.subject || `Ticket #${ticket.id}`}</Text>
                <View style={styles.statusPill}>
                  <Text style={styles.statusPillText}>{ticket.status}</Text>
                </View>
              </View>
              <Text style={styles.ticketUser}>
                {ticket.user?.username ? `@${ticket.user.username}` : ticket.user?.email || 'Usuario desconocido'}
              </Text>
              {ticket.messages?.[0]?.message ? (
                <Text style={styles.ticketMessage}>{ticket.messages[0].message}</Text>
              ) : null}
            </AppCard>
          ))
        )}
      </AppSection>

      <View style={styles.content}>
        <Text style={styles.text}>
          Consulta los tickets abiertos y su estado. Usa Mensajes para el contacto con usuarios.
        </Text>
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  content: { padding: Spacing.four },
  text: { fontSize: 13, color: Colors.light.textSecondary, lineHeight: 20 },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  filterChip: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(99,102,241,0.15)',
  },
  filterChipActive: {
    backgroundColor: Colors.light.primary,
    borderColor: Colors.light.primary,
  },
  filterChipText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.light.textSecondary,
  },
  filterChipTextActive: {
    color: '#FFFFFF',
  },
  emptyText: {
    color: Colors.light.textSecondary,
    fontSize: 15,
    textAlign: 'center',
  },
  ticketHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.two,
  },
  ticketSubject: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.light.text,
    flex: 1,
  },
  statusPill: {
    backgroundColor: '#EEF2FF',
    paddingHorizontal: Spacing.two,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(59,130,246,0.2)',
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.light.primary,
  },
  ticketUser: {
    fontSize: 13,
    color: Colors.light.textSecondary,
    marginBottom: Spacing.two,
  },
  ticketMessage: {
    fontSize: 14,
    color: Colors.light.text,
  },
});
