// This screen only appears when a student chooses Post UTME.
// It shows three tabs — Universities, Polytechnics, Colleges of Education.
// The student searches and selects their institution.
// After selecting, they move to Subject Select.

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';
import { COLORS } from '../constants/colors';
import { INSTITUTIONS } from '../constants/institutions';
import AppTextInput from '../components/AppTextInput';

// The three category tabs
const CATEGORIES = [
  { key: 'universities', label: 'Universities' },
  { key: 'polytechnics', label: 'Polytechnics' },
  { key: 'collegesOfEducation', label: 'COE' },
];

export default function InstitutionSelectScreen({ route, navigation }) {
  const { student } = route.params;
  const [activeCategory, setActiveCategory] = useState('universities');
  const [searchText, setSearchText] = useState('');

  // Get the list for whichever tab is currently active
  const getActiveList = () => {
    return INSTITUTIONS[activeCategory] || [];
  };

  // Filter the list based on what the student types in the search box
  const filteredList = getActiveList().filter((inst) => {
    const search = searchText.toLowerCase();
    return (
      inst.name.toLowerCase().includes(search) ||
      inst.abbreviation.toLowerCase().includes(search) ||
      inst.state.toLowerCase().includes(search)
    );
  });

  // When a student taps an institution
  const handleSelectInstitution = (institution) => {
    navigation.navigate('SubjectSelect', {
      student,
      examBody: 'POST_UTME',
      institution,
    });
  };

  return (
    <SafeAreaView style={styles.safeArea}>

      {/* ── HEADER ── */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Post UTME</Text>
        <Text style={styles.headerSubtitle}>Select your institution</Text>
      </View>

      {/* ── CATEGORY TABS ── */}
      <View style={styles.tabRow}>
        {CATEGORIES.map((cat) => (
          <TouchableOpacity
            key={cat.key}
            style={[
              styles.tab,
              activeCategory === cat.key && styles.activeTab,
            ]}
            onPress={() => {
              setActiveCategory(cat.key);
              setSearchText('');
            }}
          >
            <Text
              style={[
                styles.tabText,
                activeCategory === cat.key && styles.activeTabText,
              ]}
            >
              {cat.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ── SEARCH BOX ── */}
      <View style={styles.searchContainer}>
        <AppTextInput
          style={styles.searchBox}
          placeholder="Search by name, abbreviation or state..."
          placeholderTextColor={COLORS.textLight}
          value={searchText}
          onChangeText={setSearchText}
        />
      </View>

      {/* ── RESULTS COUNT ── */}
      <Text style={styles.resultCount}>
        {filteredList.length} institution{filteredList.length !== 1 ? 's' : ''} found
      </Text>

      {/* ── INSTITUTION LIST ── */}
      <FlatList
        data={filteredList}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.institutionCard}
            onPress={() => handleSelectInstitution(item)}
          >
            {/* Left colored bar shows abbreviation */}
            <View style={styles.cardLeft}>
              <Text style={styles.abbreviation}>{item.abbreviation}</Text>
            </View>

            {/* Right side shows full name and state */}
            <View style={styles.cardRight}>
              <Text style={styles.institutionName}>{item.name}</Text>
              <Text style={styles.stateName}>{item.state} State</Text>
            </View>

            {/* Arrow on the far right */}
            <Text style={styles.arrow}>›</Text>
          </TouchableOpacity>
        )}

        // Show this when the search finds nothing
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>🔍</Text>
            <Text style={styles.emptyText}>No institution found</Text>
            <Text style={styles.emptySubText}>Try a different search word</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    backgroundColor: COLORS.primary,
    padding: 20,
    paddingTop: 40,
  },
  backButton: {
    marginBottom: 10,
  },
  backText: {
    color: COLORS.textLight,
    fontSize: 14,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.white,
  },
  headerSubtitle: {
    fontSize: 13,
    color: COLORS.textLight,
    marginTop: 4,
  },
  tabRow: {
    flexDirection: 'row',
    backgroundColor: COLORS.primary,
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 8,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  activeTab: {
    backgroundColor: COLORS.secondary,
  },
  tabText: {
    fontSize: 12,
    color: COLORS.textLight,
    fontWeight: '600',
  },
  activeTabText: {
    color: COLORS.white,
  },
  searchContainer: {
    padding: 16,
    paddingBottom: 8,
  },
  searchBox: {
    backgroundColor: COLORS.white,
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
    color: COLORS.textDark,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  resultCount: {
    fontSize: 12,
    color: COLORS.textLight,
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 30,
  },
  institutionCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 1,
  },
  cardLeft: {
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    padding: 8,
    minWidth: 70,
    alignItems: 'center',
    marginRight: 12,
  },
  abbreviation: {
    color: COLORS.white,
    fontWeight: 'bold',
    fontSize: 11,
    textAlign: 'center',
  },
  cardRight: {
    flex: 1,
  },
  institutionName: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textDark,
  },
  stateName: {
    fontSize: 11,
    color: COLORS.textLight,
    marginTop: 3,
  },
  arrow: {
    fontSize: 22,
    color: COLORS.textLight,
    marginLeft: 8,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingTop: 60,
  },
  emptyIcon: {
    fontSize: 40,
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textDark,
  },
  emptySubText: {
    fontSize: 13,
    color: COLORS.textLight,
    marginTop: 6,
  },
});