import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { db } from '../../firebaseConfig';
import { doc, onSnapshot, updateDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { Ionicons } from '@expo/vector-icons';
import * as Notifications from 'expo-notifications';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function PlantDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [plant, setPlant] = useState<any>(null);
  const [activeTab, setActiveTab] = useState('Care');

  useEffect(() => {
    if (!id) return;
    const unsub = onSnapshot(doc(db, "plants", id), (docSnap) => {
      if (docSnap.exists()) {
        setPlant({ id: docSnap.id, ...docSnap.data() });
      }
    });
    return () => unsub();
  }, [id]);

  const getWateringStatus = () => {
    if (!plant?.lastWatered) return { last: "Never", overdue: "0d", isOverdue: false, nextWatering: "Not scheduled" };

    const last = plant.lastWatered.toDate();
    const today = new Date();
    const frequency = plant.wateringFrequency || 3;

    let nextWateringDate: Date;
    if (plant.nextWateringDate) {
      nextWateringDate = plant.nextWateringDate.toDate();
    } else {
      nextWateringDate = new Date(last);
      nextWateringDate.setDate(last.getDate() + frequency);
      nextWateringDate.setHours(9, 0, 0, 0);
    }

    const diffTime = today.getTime() - last.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    const isOverdue = diffDays >= frequency;
    const overdueDays = isOverdue ? diffDays - frequency : 0;

    const nextDiffTime = nextWateringDate.getTime() - today.getTime();
    const nextDays = Math.ceil(nextDiffTime / (1000 * 60 * 60 * 24));

    return {
      last: diffDays === 0 ? "Today" : `${diffDays}d ago`,
      overdue: overdueDays === 0 ? (isOverdue ? "Due today" : "Upcoming") : `${overdueDays}d overdue`,
      isOverdue,
      dueIn: nextDays > 0 ? nextDays : 0,
      nextWatering: nextDays <= 0 ? "Today" : `in ${nextDays} day${nextDays > 1 ? 's' : ''}`,
      frequency,
    };
  };

  // ✅ CORRECTED notification helper using time interval
  const scheduleWateringReminder = async (plantId: string, plantName: string, nextDate: Date) => {
    const identifier = `plant-water-${plantId}`;

    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    for (const notif of scheduled) {
      if (notif.identifier === identifier) {
        await Notifications.cancelScheduledNotificationAsync(identifier);
      }
    }

    const now = new Date();
    const secondsUntil = Math.floor((nextDate.getTime() - now.getTime()) / 1000);
    if (secondsUntil <= 0) return; // already passed

    await Notifications.scheduleNotificationAsync({
      identifier,
      content: {
        title: "LeafLog Reminder! 🌿",
        body: `Your ${plantName} needs watering today.`,
        data: { plantId },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: secondsUntil,
        repeats: false,
      },
    });
  };

  const handleWaterPlant = async () => {
    if (!id || !plant) return;
    try {
      const now = new Date();
      const frequency = plant.wateringFrequency || 3;
      const nextDate = new Date(now);
      nextDate.setDate(now.getDate() + frequency);
      nextDate.setHours(9, 0, 0, 0); // 9 AM

      const plantRef = doc(db, "plants", id);
      await updateDoc(plantRef, {
        lastWatered: serverTimestamp(),
        nextWateringDate: Timestamp.fromDate(nextDate),
      });

      await scheduleWateringReminder(id, plant.name, nextDate);
      Alert.alert("Success!", "Watering logged. Reminder scheduled.");
    } catch (error) {
      console.error("Error updating watering: ", error);
    }
  };

  if (!plant) return null;

  const status = getWateringStatus();

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 20 }]}
      >
        {/* Header with Gradient */}
        <LinearGradient
          colors={['#1B4D3E', '#0F2F26']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.headerGradient}
        >
          <View style={styles.headerContent}>
            <View style={styles.topActions}>
              <TouchableOpacity onPress={() => router.back()} style={styles.iconButton}>
                <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.iconButton}>
                <Ionicons name="ellipsis-horizontal-circle" size={24} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            <View style={styles.plantIconContainer}>
              <LinearGradient
                colors={['#2E7D5E', '#1B4D3E']}
                style={styles.plantIconGradient}
              >
                <Ionicons name="leaf" size={60} color="#FFFFFF" />
              </LinearGradient>
            </View>

            <Text style={styles.plantName}>{plant.name}</Text>

            <View style={styles.tagContainer}>
              <View style={styles.tag}>
                <Ionicons name="location-outline" size={14} color="#E7F0E9" />
                <Text style={styles.tagText}>{plant.space || 'No Space'}</Text>
              </View>
              <View style={styles.tag}>
                <Ionicons name="calendar-outline" size={14} color="#E7F0E9" />
                <Text style={styles.tagText}>Water every {status.frequency} days</Text>
              </View>
            </View>
          </View>
        </LinearGradient>

        {/* Tabs */}
        <View style={styles.tabsWrapper}>
          {['Care', 'History', 'Details'].map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[styles.tabButton, activeTab === tab && styles.activeTabButton]}
              onPress={() => setActiveTab(tab)}
            >
              <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>
                {tab}
              </Text>
              {activeTab === tab && <View style={styles.tabIndicator} />}
            </TouchableOpacity>
          ))}
        </View>

        {/* Care Tab Content */}
        {activeTab === 'Care' && (
          <View style={styles.content}>
            <View style={styles.scheduleHeader}>
              <Text style={styles.sectionTitle}>Care Schedule</Text>
              <TouchableOpacity style={styles.editButton} onPress={() => router.push(`/plant/edit/${id}`)}>
                <Ionicons name="create-outline" size={18} color="#2E7D5E" />
                <Text style={styles.editButtonText}>Edit</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.cardsRow}>
              {/* Water Card */}
              <LinearGradient
                colors={['#FFFFFF', '#F8FAFC']}
                style={[styles.careCard, status.isOverdue && styles.careCardOverdue]}
              >
                <View style={styles.careCardHeader}>
                  <Ionicons name="water" size={24} color="#2E7D5E" />
                  <Text style={styles.careCardTitle}>Water</Text>
                </View>

                <View style={styles.careCardBody}>
                  <Text style={styles.statusLabel}>Last: {status.last}</Text>
                  <Text style={styles.statusLabel}>Next: {status.nextWatering}</Text>
                  <Text style={[styles.statusValue, status.isOverdue && styles.overdueText]}>
                    {status.overdue}
                  </Text>

                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={handleWaterPlant}
                  >
                    <LinearGradient
                      colors={['#2E7D5E', '#1B4D3E']}
                      style={styles.actionButtonGradient}
                    >
                      <Ionicons name="water" size={18} color="#FFFFFF" />
                      <Text style={styles.actionButtonText}>Log Watering</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              </LinearGradient>

              {/* Feed Card */}
              <LinearGradient
                colors={['#FFFFFF', '#F8FAFC']}
                style={[styles.careCard, styles.careCardDisabled]}
              >
                <View style={styles.careCardHeader}>
                  <Ionicons name="nutrition-outline" size={24} color="#94A3B8" />
                  <Text style={[styles.careCardTitle, { color: '#94A3B8' }]}>Feed</Text>
                </View>

                <View style={styles.careCardBody}>
                  <Text style={styles.statusLabel}>Last: Not logged</Text>
                  <Text style={styles.statusValue}>Disabled</Text>
                  <TouchableOpacity style={styles.disabledButton} disabled>
                    <Text style={styles.disabledButtonText}>Set up</Text>
                  </TouchableOpacity>
                </View>
              </LinearGradient>
            </View>

            <View style={styles.otherActions}>
              <Text style={styles.sectionTitle}>Other Actions</Text>
              <View style={styles.actionChips}>
                <TouchableOpacity style={styles.actionChip}>
                  <Ionicons name="cloud-outline" size={18} color="#2E7D5E" />
                  <Text style={styles.actionChipText}>Mist</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionChip}>
                  <Ionicons name="cut-outline" size={18} color="#2E7D5E" />
                  <Text style={styles.actionChipText}>Prune</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionChip}>
                  <Ionicons name="refresh-outline" size={18} color="#2E7D5E" />
                  <Text style={styles.actionChipText}>Rotate</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.notesCard}>
              <View style={styles.notesHeader}>
                <Ionicons name="document-text-outline" size={20} color="#2E7D5E" />
                <Text style={styles.notesTitle}>Special Notes</Text>
              </View>
              <Text style={styles.notesText}>
                {plant.notes || "No special notes yet. Add notes to remember care tips."}
              </Text>
            </View>
          </View>
        )}

        {activeTab === 'History' && (
          <View style={styles.content}>
            <Text style={styles.placeholderText}>History view coming soon...</Text>
          </View>
        )}

        {activeTab === 'Details' && (
          <View style={styles.content}>
            <Text style={styles.placeholderText}>Details view coming soon...</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F7FA' },
  scrollContent: { paddingBottom: 20 },
  headerGradient: {
    paddingTop: 60,
    paddingBottom: 30,
    paddingHorizontal: 24,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  headerContent: { alignItems: 'center', gap: 16 },
  topActions: { flexDirection: 'row', justifyContent: 'space-between', width: '100%' },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  plantIconContainer: { marginVertical: 8 },
  plantIconGradient: {
    width: 100,
    height: 100,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#FFFFFF',
    shadowColor: '#2E7D5E',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  plantName: { fontSize: 28, fontWeight: '700', color: '#FFFFFF', letterSpacing: -0.5 },
  tagContainer: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', justifyContent: 'center' },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  tagText: { fontSize: 13, color: '#E7F0E9', fontWeight: '500' },
  tabsWrapper: { flexDirection: 'row', justifyContent: 'center', paddingHorizontal: 24, marginTop: 16, marginBottom: 20, gap: 24 },
  tabButton: { position: 'relative', paddingBottom: 8 },
  tabText: { fontSize: 16, fontWeight: '600', color: '#94A3B8' },
  activeTabButton: {},
  activeTabText: { color: '#2E7D5E' },
  tabIndicator: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 3, backgroundColor: '#2E7D5E', borderRadius: 3 },
  content: { paddingHorizontal: 20, paddingTop: 8 },
  scheduleHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#1E293B' },
  editButton: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  editButtonText: { fontSize: 14, fontWeight: '600', color: '#2E7D5E' },
  cardsRow: { flexDirection: 'row', gap: 16, marginBottom: 24 },
  careCard: {
    flex: 1,
    borderRadius: 20,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  careCardOverdue: { borderWidth: 1, borderColor: '#EF4444' },
  careCardDisabled: { opacity: 0.6 },
  careCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  careCardTitle: { fontSize: 16, fontWeight: '600', color: '#1E293B' },
  careCardBody: { gap: 8 },
  statusLabel: { fontSize: 13, color: '#64748B' },
  statusValue: { fontSize: 15, fontWeight: '600', color: '#1E293B' },
  overdueText: { color: '#EF4444' },
  actionButton: { marginTop: 8, borderRadius: 12, overflow: 'hidden' },
  actionButtonGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, gap: 6 },
  actionButtonText: { fontSize: 14, fontWeight: '600', color: '#FFFFFF' },
  disabledButton: { backgroundColor: '#F1F5F9', borderRadius: 12, paddingVertical: 10, alignItems: 'center', marginTop: 8 },
  disabledButtonText: { fontSize: 14, fontWeight: '600', color: '#94A3B8' },
  otherActions: { marginBottom: 24 },
  actionChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  actionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 8,
  },
  actionChipText: { fontSize: 14, fontWeight: '500', color: '#1E293B' },
  notesCard: { backgroundColor: '#FFFFFF', borderRadius: 20, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  notesHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  notesTitle: { fontSize: 16, fontWeight: '600', color: '#1E293B' },
  notesText: { fontSize: 14, color: '#64748B', lineHeight: 20 },
  placeholderText: { fontSize: 16, color: '#94A3B8', textAlign: 'center', marginTop: 40 },
});