import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { COLORS } from '../constants/colors';
import { getActiveSeason, getParticipant } from '../services/competitionService';
import { getLeaderboardForTier } from '../services/leaderboardService';

export default function GeniusTableScreen({ route, navigation }) {
  const { student } = route.params;

  const [loading, setLoading] = useState(true);
  const [season, setSeason] = useState(null);
  const [participant, setParticipant] = useState(null);
  const [selectedTier, setSelectedTier] = useState(20);
  const [rows, setRows] = useState([]);
  const [loadingTable, setLoadingTable] = useState(false);
  const [countdown, setCountdown] = useState('');

  useEffect(() => {
    loadInitial();
  }, []);

  useEffect(() => {
    if (season) loadTable(selectedTier);
  }, [selectedTier, season]);

  useEffect(() => {
    if (!season) return;
    const interval = setInterval(() => updateCountdown(season.ends_at), 1000);
    updateCountdown(season.ends_at);
    return () => clearInterval(interval);
  }, [season]);

  const loadInitial = async () => {
    try {
      const activeSeason = await getActiveSeason();
      setSeason(activeSeason);

      if (activeSeason) {
        const myParticipant = await getParticipant(activeSeason.id, student.id);
        setParticipant(myParticipant);
        setSelectedTier(myParticipant ? myParticipant.current_tier : 20);
      }
      setLoading(false);
    } catch (error) {
      setLoading(false);
    }
  };

  const loadTable = async (tierNumber) => {
    setLoadingTable(true);
    try {
      const data = await getLeaderboardForTier(season.id, tierNumber);
      setRows(data);
    } catch (error) {
      setRows([]);
    } finally {
      setLoadingTable(false);
    }
  };

  const updateCountdown = (endsAt) => {
    const diff = new Date(endsAt).getTime() - Date.now();
    if (diff <= 0) {
      setCountdown('Competition has ended');
      return;
    }
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
    const minutes = Math.floor((diff / (1000 * 60)) % 60);
    setCountdown(`${days}d ${hours}h ${minutes}m remaining`);
  };

  const formatTime = (ms) => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}m ${seconds}s`;
  };

  if (loading) {
    return (
      <View style={styles.centerScreen}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  if (!season) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centerScreen}>
          <Text style={styles.emptyText}>There is no active Genius Competition right now.</Text>
          <TouchableOpacity style={styles.backButtonFull} onPress={() => navigation.goBack()}>
            <Text style={styles.backButtonFullText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Genius Table</Text>
        <Text style={styles.headerSubtitle}>{countdown}</Text>
      </View>

      {/* ── TIER SELECTOR — Tier 1 is highest, Tier 20 is lowest ── */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.tierScroll}
        contentContainerStyle={styles.tierScrollContent}
      >
        {Array.from({ length: 20 }, (_, i) => 20 - i).map((tier) => {
          const isSelected = selectedTier === tier;
          const isMine = participant?.current_tier === tier;
          return (
            <TouchableOpacity
              key={tier}
              style={[
                styles.tierChip,
                isSelected && styles.tierChipSelected,
                isMine && !isSelected && styles.tierChipMine,
              ]}
              onPress={() => setSelectedTier(tier)}
            >
              <Text style={[styles.tierChipText, isSelected && styles.tierChipTextSelected]}>
                Tier {tier}
              </Text>
              {isMine && <Text style={styles.tierChipMineLabel}>You</Text>}
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* ── TABLE HEADER ── */}
      <View style={styles.tableHeaderRow}>
        <Text style={[styles.tableHeaderCell, styles.rankCol]}>#</Text>
        <Text style={[styles.tableHeaderCell, styles.nameCol]}>Name</Text>
        <Text style={[styles.tableHeaderCell, styles.numCol]}>Pts</Text>
        <Text style={[styles.tableHeaderCell, styles.numCol]}>Att</Text>
        <Text style={[styles.tableHeaderCell, styles.numCol]}>✅</Text>
        <Text style={[styles.tableHeaderCell, styles.numCol]}>❌</Text>
      </View>

      {/* ── TABLE ROWS ── */}
      {loadingTable ? (
        <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 30 }} />
      ) : rows.length === 0 ? (
        <View style={styles.centerScreen}>
          <Text style={styles.emptyText}>No students in this tier yet.</Text>
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false}>
          {rows.map((row, index) => {
            const isMe = row.participant_id === participant?.id;
            return (
              <View key={row.participant_id} style={[styles.tableRow, isMe && styles.tableRowMine]}>
                <Text style={[styles.tableCell, styles.rankCol, styles.rankText]}>{index + 1}</Text>
                <View style={styles.nameCol}>
                  <Text style={styles.nameText} numberOfLines={1}>{row.full_name}</Text>
                  <Text style={styles.regText} numberOfLines={1}>{row.jamb_reg_number}</Text>
                </View>
                <Text style={[styles.tableCell, styles.numCol]}>{row.cumulative_points}</Text>
                <Text style={[styles.tableCell, styles.numCol]}>{row.total_attempts}</Text>
                <Text style={[styles.tableCell, styles.numCol, { color: COLORS.success }]}>
                  {row.total_correct}
                </Text>
                <Text style={[styles.tableCell, styles.numCol, { color: COLORS.error }]}>
                  {row.total_missed}
                </Text>
              </View>
            );
          })}
          <View style={{ height: 40 }} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.background },
  centerScreen: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 30 },
  emptyText: { fontSize: 14, color: COLORS.textLight, textAlign: 'center', marginBottom: 16 },
  backButtonFull: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 30,
  },
  backButtonFullText: { color: COLORS.white, fontWeight: 'bold' },
  header: { backgroundColor: COLORS.primary, padding: 20, paddingTop: 40 },
  backButton: { marginBottom: 10 },
  backText: { color: COLORS.textLight, fontSize: 14 },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: COLORS.white },
  headerSubtitle: { fontSize: 13, color: COLORS.secondary, marginTop: 4, fontWeight: '600' },
  tierScroll: { flexGrow: 0, backgroundColor: COLORS.white, paddingVertical: 10 },
  tierScrollContent: { paddingHorizontal: 12, gap: 8 },
  tierChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.white,
    alignItems: 'center',
  },
  tierChipSelected: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  tierChipMine: { borderColor: COLORS.secondary, borderWidth: 2 },
  tierChipText: { fontSize: 12, fontWeight: '600', color: COLORS.textDark },
  tierChipTextSelected: { color: COLORS.white },
  tierChipMineLabel: { fontSize: 9, color: COLORS.secondary, fontWeight: 'bold', marginTop: 1 },
  tableHeaderRow: {
    flexDirection: 'row',
    backgroundColor: COLORS.primary,
    paddingVertical: 10,
    paddingHorizontal: 10,
  },
  tableHeaderCell: { fontSize: 11, fontWeight: 'bold', color: COLORS.white },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    backgroundColor: COLORS.white,
  },
  tableRowMine: { backgroundColor: '#eef0ff' },
  tableCell: { fontSize: 12, color: COLORS.textDark, textAlign: 'center' },
  rankCol: { width: 30, fontWeight: 'bold' },
  rankText: { color: COLORS.primary },
  nameCol: { flex: 1, paddingRight: 6 },
  nameText: { fontSize: 13, fontWeight: '600', color: COLORS.textDark },
  regText: { fontSize: 10, color: COLORS.textLight, marginTop: 2 },
  numCol: { width: 40, textAlign: 'center', fontWeight: '600' },
});