// This screen appears after the student selects an exam body
// or after they select an institution for Post UTME.
// The student picks the subject they want to practise.
// After picking a subject, they move to Topic Filter screen.

import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  SafeAreaView,
  ActivityIndicator,
  Alert,
} from "react-native";
import { COLORS } from "../constants/colors";
import { SUBJECTS } from "../constants/subjects";
import { downloadAndCacheQuestions } from "../database/localCache";

export default function SubjectSelectScreen({ route, navigation }) {
  const { student, examBody, institution } = route.params;
  const [searchText, setSearchText] = useState("");
  const [downloadingSubject, setDownloadingSubject] = useState(null);

  // Get the subject list for the selected exam body
  const subjectList = SUBJECTS[examBody] || [];

  // Filter subjects based on what student types
  const filteredSubjects = subjectList.filter((subject) =>
    subject.toLowerCase().includes(searchText.toLowerCase()),
  );

  // When student taps a subject
  const handleSelectSubject = async (subject) => {
    if (downloadingSubject) return; // ignore taps while a download is in progress

    setDownloadingSubject(subject);

    try {
      await downloadAndCacheQuestions(examBody, subject);
      setDownloadingSubject(null);
      navigation.navigate("TopicFilter", {
        student,
        examBody,
        institution,
        subject,
      });
    } catch (error) {
      setDownloadingSubject(null);
      Alert.alert(
        "Could not load questions",
        "Please check your internet connection and try again.",
      );
    }
  };

  // Show the right title depending on exam body
  const getHeaderTitle = () => {
    if (examBody === "POST_UTME" && institution) {
      return institution.abbreviation + " Post UTME";
    }
    return examBody;
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
        <Text style={styles.headerTitle}>{getHeaderTitle()}</Text>
        <Text style={styles.headerSubtitle}>Select a subject to practise</Text>
      </View>

      {/* ── SEARCH BOX ── */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchBox}
          placeholder="Search subject..."
          placeholderTextColor={COLORS.textLight}
          value={searchText}
          onChangeText={setSearchText}
        />
      </View>

      {/* ── SUBJECT COUNT ── */}
      <Text style={styles.resultCount}>
        {filteredSubjects.length} subject
        {filteredSubjects.length !== 1 ? "s" : ""} available
      </Text>

      {/* ── SUBJECT LIST ── */}
      <FlatList
        data={filteredSubjects}
        keyExtractor={(item) => item}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.subjectCard}
            onPress={() => handleSelectSubject(item)}
            disabled={downloadingSubject !== null}
          >
            {/* Subject Icon — first letter of subject name */}
            <View style={styles.subjectIcon}>
              <Text style={styles.subjectIconText}>
                {item.charAt(0)}
              </Text>
            </View>

            {/* Subject Name */}
            <Text style={styles.subjectName}>{item}</Text>

            {/* Arrow, or spinner if this subject is downloading */}
            {downloadingSubject === item ? (
              <ActivityIndicator size="small" color={COLORS.primary} />
            ) : (
              <Text style={styles.arrow}>›</Text>
            )}
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>📚</Text>
            <Text style={styles.emptyText}>No subject found</Text>
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
    fontWeight: "bold",
    color: COLORS.white,
  },
  headerSubtitle: {
    fontSize: 13,
    color: COLORS.textLight,
    marginTop: 4,
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
  subjectCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    elevation: 1,
  },
  subjectIcon: {
    width: 42,
    height: 42,
    borderRadius: 10,
    backgroundColor: COLORS.primary,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 14,
  },
  subjectIconText: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: "bold",
  },
  subjectName: {
    flex: 1,
    fontSize: 15,
    color: COLORS.textDark,
    fontWeight: "500",
  },
  arrow: {
    fontSize: 22,
    color: COLORS.textLight,
  },
  emptyContainer: {
    alignItems: "center",
    paddingTop: 60,
  },
  emptyIcon: {
    fontSize: 40,
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.textDark,
  },
  emptySubText: {
    fontSize: 13,
    color: COLORS.textLight,
    marginTop: 6,
  },
});
