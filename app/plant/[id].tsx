import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView, Alert, Modal, Pressable } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { db, auth } from '../../firebaseConfig';
import { 
  doc, onSnapshot, updateDoc, serverTimestamp, Timestamp, 
  collection, query, orderBy, limit, getDocs, addDoc,
  where, QueryDocumentSnapshot
} from 'firebase/firestore';
import { Ionicons } from '@expo/vector-icons';
import * as Notifications from 'expo-notifications';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface TaskEvent {
  id: string;
  action: string;
  timestamp: Timestamp;
  date: string;
  time: string;
}

interface Space {
  id: string;
  name: string;
}

interface ActionSchedule {
  frequency: number;
  hour: number;
  minute: number;
}

interface PlantData {
  id: string;
  name: string;
  spaceId?: string;
  tasks?: string[];
  schedules?: Record<string, ActionSchedule>;
  lastWatered?: Timestamp;
  lastFeed?: Timestamp;
  lastMist?: Timestamp;
  lastRotate?: Timestamp;
  lastClean?: Timestamp;
  nextWateringDate?: Timestamp;
  wateringFrequency?: number;
  reminderHour?: number;
  reminderMinute?: number;
  notes?: string;
  environment?: string;
  status?: string;
}

const ACTION_CONFIG: Record<string, { 
  icon: string; 
  color: string; 
  label: string; 
  pastTense: string;
  field: keyof PlantData;
}> = {
  Water: { icon: 'water', color: '#2E7D5E', label: 'Water', pastTense: 'Watered', field: 'lastWatered' },
  Feed: { icon: 'nutrition-outline', color: '#5C6BC0', label: 'Feed', pastTense: 'Fed', field: 'lastFeed' },
  Mist: { icon: 'cloud-outline', color: '#4A90E2', label: 'Mist', pastTense: 'Misted', field: 'lastMist' },
  Prune: { icon: 'cut-outline', color: '#F59E0B', label: 'Prune', pastTense: 'Pruned', field: 'lastRotate' },
  Rotate: { icon: 'refresh-outline', color: '#EC4899', label: 'Rotate', pastTense: 'Rotated', field: 'lastRotate' },
  Clean: { icon: 'brush-outline', color: '#8B5CF6', label: 'Clean', pastTense: 'Cleaned', field: 'lastClean' },
};

export default function PlantDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [plant, setPlant] = useState<PlantData | null>(null);
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [activeTab, setActiveTab] = useState<'Care' | 'History'>('Care');
  const [taskHistory, setTaskHistory] = useState<TaskEvent[]>([]);
  const [menuVisible, setMenuVisible] = useState(false);

  // Fetch spaces
  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;
    const spacesQuery = query(collection(db, "spaces"), where("userId", "==", user.uid));
    const unsubSpaces = onSnapshot(spacesQuery, (snapshot) => {
      const spaceList: Space[] = snapshot.docs.map((doc) => ({ 
        id: doc.id, 
        name: doc.data().name 
      }));
      setSpaces(spaceList);
    });
    return () => unsubSpaces();
  }, []);

  // Listen to plant document
  useEffect(() => {
    if (!id) return;
    const unsub = onSnapshot(doc(db, "plants", id), (docSnap) => {
      if (docSnap.exists()) {
        setPlant({ id: docSnap.id, ...docSnap.data() } as PlantData);
      }
    });
    fetchTaskHistory();
    return () => unsub();
  }, [id]);

  const fetchTaskHistory = async () => {
    try {
      const historyRef = collection(db, "plants", id, "task_history");
      const q = query(historyRef, orderBy("timestamp", "desc"), limit(50));
      const querySnapshot = await getDocs(q);
      const history: TaskEvent[] = [];
      querySnapshot.forEach((doc: QueryDocumentSnapshot) => {
        const data = doc.data();
        const timestamp = data.timestamp as Timestamp;
        const date = timestamp.toDate();
        history.push({
          id: doc.id,
          action: data.action || 'Water',
          timestamp,
          date: date.toLocaleDateString(),
          time: date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        });
      });
      setTaskHistory(history);
    } catch (error) {
      console.error("Error fetching task history:", error);
    }
  };

  const logTaskAction = async (action: string): Promise<void> => {
    try {
      const historyRef = collection(db, "plants", id, "task_history");
      await addDoc(historyRef, {
        action,
        timestamp: Timestamp.fromDate(new Date()),
      });
    } catch (error) {
      console.error(`Error logging ${action}:`, error);
    }
  };

  const getSpaceName = (spaceId?: string): string => {
    if (!spaceId) return 'No Space';
    const space = spaces.find(s => s.id === spaceId);
    return space?.name || 'Unknown Space';
  };

  // ✅ FIXED: Get next due date for any action
  const getNextDue = (action: string): string => {
    if (!plant) return 'No schedule';
    
    const schedule = plant.schedules?.[action];
    if (!schedule) return 'No schedule';
    
    const lastField = ACTION_CONFIG[action]?.field;
    const last = lastField ? plant[lastField] as Timestamp : undefined;
    
    // Kung walang last date, ipakita na "Set first date"
    if (!last) return 'Set first date';
    
    const lastDate = last.toDate();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Compute next due date based on last date + frequency
    const nextDate = new Date(lastDate);
    nextDate.setDate(lastDate.getDate() + schedule.frequency);
    nextDate.setHours(schedule.hour, schedule.minute, 0, 0);
    
    // Compare dates only (ignore time)
    const nextDay = new Date(nextDate);
    nextDay.setHours(0, 0, 0, 0);
    
    const diffTime = nextDay.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Tomorrow';
    return `in ${diffDays} days`;
  };

  // OPTIMIZED: Schedule all notifications in parallel
  const scheduleActionReminder = async (action: string, plantId: string, plantName: string, dueDate: Date): Promise<void> => {
    const baseId = `plant-${action.toLowerCase()}-${plantId}`;
    
    // Cancel all previous notifications for this action in parallel
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    const toCancel = scheduled
      .filter(notif => notif.identifier.startsWith(baseId))
      .map(notif => Notifications.cancelScheduledNotificationAsync(notif.identifier));
    
    await Promise.all(toCancel);

    const now = new Date();
    const actionLabel = ACTION_CONFIG[action]?.label.toLowerCase() || action.toLowerCase();
    
    const notifications = [];
    
    // Main due notification
    const secondsUntil = Math.floor((dueDate.getTime() - now.getTime()) / 1000);
    if (secondsUntil > 0) {
      notifications.push(
        Notifications.scheduleNotificationAsync({
          identifier: `${baseId}-due`,
          content: {
            title: "🌱 Plant Reminder",
            body: `Time to ${actionLabel} ${plantName}!`,
            data: { plantId, action },
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
            seconds: secondsUntil,
            repeats: false,
          },
        })
      );
    }

    // Reminder 1 (1 day after due)
    const reminder1Date = new Date(dueDate);
    reminder1Date.setDate(reminder1Date.getDate() + 1);
    const secondsUntil1 = Math.floor((reminder1Date.getTime() - now.getTime()) / 1000);
    if (secondsUntil1 > 0) {
      notifications.push(
        Notifications.scheduleNotificationAsync({
          identifier: `${baseId}-reminder-1`,
          content: {
            title: "🌱 Plant Reminder",
            body: `${plantName} still needs ${actionLabel}!`,
            data: { plantId, action },
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
            seconds: secondsUntil1,
            repeats: false,
          },
        })
      );
    }

    // Reminder 2 (2 days after due)
    const reminder2Date = new Date(dueDate);
    reminder2Date.setDate(reminder2Date.getDate() + 2);
    const secondsUntil2 = Math.floor((reminder2Date.getTime() - now.getTime()) / 1000);
    if (secondsUntil2 > 0) {
      notifications.push(
        Notifications.scheduleNotificationAsync({
          identifier: `${baseId}-reminder-2`,
          content: {
            title: "🌱 Plant Reminder",
            body: `Don't forget to ${actionLabel} ${plantName}!`,
            data: { plantId, action },
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
            seconds: secondsUntil2,
            repeats: false,
          },
        })
      );
    }

    await Promise.all(notifications);
  };

  // OPTIMIZED: Handle actions with faster response
  const handleAction = async (action: string): Promise<void> => {
    if (!id || !plant) return;
    const config = ACTION_CONFIG[action];
    if (!config) return;
    
    try {
      const now = new Date();
      const plantRef = doc(db, "plants", id);
      const updateData: any = {};
      
      if (action === 'Water') {
        const schedule = plant.schedules?.Water || { frequency: 1, hour: 9, minute: 0 };
        const nextDate = new Date(now);
        nextDate.setDate(now.getDate() + schedule.frequency);
        nextDate.setHours(schedule.hour, schedule.minute, 0, 0);
        
        updateData.lastWatered = Timestamp.fromDate(now);
        updateData.nextWateringDate = Timestamp.fromDate(nextDate);
        
        // Update Firestore
        await updateDoc(plantRef, updateData);
        
        // Schedule reminder in background
        scheduleActionReminder(action, id, plant.name, nextDate)
          .catch(err => console.error("Background notification error:", err));
        
      } else {
        // For all other actions (Feed, Mist, etc.)
        updateData[config.field] = Timestamp.fromDate(now);
        await updateDoc(plantRef, updateData);
        
        // Schedule next reminder for this action
        const schedule = plant.schedules?.[action];
        if (schedule) {
          const nextDate = new Date(now);
          nextDate.setDate(now.getDate() + schedule.frequency);
          nextDate.setHours(schedule.hour, schedule.minute, 0, 0);
          
          scheduleActionReminder(action, id, plant.name, nextDate)
            .catch(err => console.error("Background notification error:", err));
        }
      }
      
      // Log to history in background
      logTaskAction(action).catch(err => console.error("Background history error:", err));
      
      Alert.alert("Success!", `${config.pastTense} logged.`);
      
    } catch (error) {
      console.error(`Error logging ${action}:`, error);
      Alert.alert("Error", `Could not log ${action}.`);
    }
  };

  const handleOpenMenu = () => {
    setMenuVisible(true);
  };

  const handleMoveToRetired = async () => {
    if (!id) return;
    Alert.alert(
      "Move to Retired",
      `Are you sure you want to move ${plant?.name} to retired plants?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Move",
          style: "destructive",
          onPress: async () => {
            try {
              const plantRef = doc(db, "plants", id);
              await updateDoc(plantRef, { status: 'retired' });
              
              // Cancel all notifications for this plant in background
              const baseId = `plant-water-${id}`;
              const scheduled = await Notifications.getAllScheduledNotificationsAsync();
              const toCancel = scheduled
                .filter(notif => notif.identifier.startsWith(baseId))
                .map(notif => Notifications.cancelScheduledNotificationAsync(notif.identifier));
              
              Promise.all(toCancel).catch(err => console.error("Error canceling notifications:", err));
              
              router.back();
            } catch (error) {
              Alert.alert("Error", "Could not move plant.");
              console.error(error);
            }
          }
        }
      ]
    );
    setMenuVisible(false);
  };

  if (!plant) return null;

  const displayActions = plant.tasks?.filter(action => ACTION_CONFIG[action]) || [];

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
              <TouchableOpacity onPress={handleOpenMenu} style={styles.iconButton}>
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
                <Text style={styles.tagText}>{getSpaceName(plant.spaceId)}</Text>
              </View>
              <View style={styles.tag}>
                <Ionicons name="calendar-outline" size={14} color="#E7F0E9" />
                <Text style={styles.tagText}>
                  {plant.schedules?.Water ? `Water every ${plant.schedules.Water.frequency} days` : 'No watering schedule'}
                </Text>
              </View>
            </View>
          </View>
        </LinearGradient>

        {/* Tabs */}
        <View style={styles.tabsWrapper}>
          {(['Care', 'History'] as const).map((tab) => (
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

            <View style={styles.cardsContainer}>
              {displayActions.map((action) => {
                const config = ACTION_CONFIG[action];
                const schedule = plant.schedules?.[action];
                const lastTimestamp = plant[config.field] as Timestamp | undefined;
                const lastDate = lastTimestamp ? lastTimestamp.toDate() : null;
                const lastDisplay = lastDate ? lastDate.toLocaleDateString() : 'Never';
                const nextDisplay = schedule ? getNextDue(action) : 'No schedule';

                return (
                  <LinearGradient
                    key={action}
                    colors={['#FFFFFF', '#F8FAFC']}
                    style={styles.careCard}
                  >
                    <View style={styles.careCardHeader}>
                      <Ionicons name={config.icon as any} size={24} color={config.color} />
                      <Text style={styles.careCardTitle}>{config.label}</Text>
                      {schedule && (
                        <View style={[styles.frequencyBadge, { backgroundColor: config.color + '20' }]}>
                          <Text style={[styles.frequencyText, { color: config.color }]}>
                            Every {schedule.frequency}d
                          </Text>
                        </View>
                      )}
                    </View>
                    <View style={styles.careCardBody}>
                      <Text style={styles.statusLabel}>Last: {lastDisplay}</Text>
                      {schedule && <Text style={styles.statusLabel}>Next: {nextDisplay}</Text>}
                      <TouchableOpacity style={styles.actionButton} onPress={() => handleAction(action)}>
                        <LinearGradient
                          colors={[config.color, config.color + 'CC']}
                          style={styles.actionButtonGradient}
                        >
                          <Ionicons name={config.icon as any} size={18} color="#FFFFFF" />
                          <Text style={styles.actionButtonText}>Log {config.label}</Text>
                        </LinearGradient>
                      </TouchableOpacity>
                    </View>
                  </LinearGradient>
                );
              })}
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

        {/* History Tab Content */}
        {activeTab === 'History' && (
          <View style={styles.content}>
            <Text style={styles.sectionTitle}>Care History</Text>
            <Text style={styles.historySubtitle}>All actions you've performed</Text>
            {taskHistory.length === 0 ? (
              <View style={styles.emptyHistory}>
                <Ionicons name="time-outline" size={48} color="#94A3B8" />
                <Text style={styles.emptyHistoryTitle}>No history yet</Text>
                <Text style={styles.emptyHistoryText}>
                  Perform care actions to see them here.
                </Text>
              </View>
            ) : (
              <View style={styles.historyList}>
                {taskHistory.map((event, index) => {
                  const config = ACTION_CONFIG[event.action] || ACTION_CONFIG.Water;
                  return (
                    <View key={event.id} style={styles.historyItem}>
                      <View style={[styles.historyIconContainer, { backgroundColor: config.color + '20' }]}>
                        <Ionicons name={config.icon as any} size={20} color={config.color} />
                      </View>
                      <View style={styles.historyDetails}>
                        <Text style={styles.historyEvent}>{config.pastTense}</Text>
                        <Text style={styles.historyTime}>
                          {event.date} at {event.time}
                        </Text>
                      </View>
                      {index === 0 && (
                        <View style={styles.latestBadge}>
                          <Text style={styles.latestBadgeText}>Latest</Text>
                        </View>
                      )}
                    </View>
                  );
                })}
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* Menu Modal */}
      <Modal visible={menuVisible} transparent animationType="slide">
        <Pressable style={styles.modalOverlay} onPress={() => setMenuVisible(false)}>
          <View style={styles.modalContent}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Options</Text>
            <TouchableOpacity style={styles.modalOption} onPress={handleMoveToRetired}>
              <Ionicons name="archive-outline" size={22} color="#DC2626" />
              <Text style={[styles.modalOptionText, { color: '#DC2626' }]}>Move to Retired</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.modalOption} onPress={() => setMenuVisible(false)}>
              <Ionicons name="close-outline" size={22} color="#64748B" />
              <Text style={styles.modalOptionText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>
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
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#1E293B', marginBottom: 8 },
  historySubtitle: { fontSize: 14, color: '#64748B', marginBottom: 20 },
  editButton: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  editButtonText: { fontSize: 14, fontWeight: '600', color: '#2E7D5E' },
  cardsContainer: { gap: 16, marginBottom: 24 },
  careCard: {
    borderRadius: 20,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  careCardHeader: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 8, 
    marginBottom: 12,
    flexWrap: 'wrap',
  },
  careCardTitle: { fontSize: 16, fontWeight: '600', color: '#1E293B' },
  frequencyBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    marginLeft: 'auto',
  },
  frequencyText: { fontSize: 11, fontWeight: '600' },
  careCardBody: { gap: 8 },
  statusLabel: { fontSize: 13, color: '#64748B' },
  actionButton: { marginTop: 8, borderRadius: 12, overflow: 'hidden' },
  actionButtonGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, gap: 6 },
  actionButtonText: { fontSize: 14, fontWeight: '600', color: '#FFFFFF' },
  notesCard: { backgroundColor: '#FFFFFF', borderRadius: 20, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  notesHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  notesTitle: { fontSize: 16, fontWeight: '600', color: '#1E293B' },
  notesText: { fontSize: 14, color: '#64748B', lineHeight: 20 },
  emptyHistory: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    marginTop: 20,
  },
  emptyHistoryTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1E293B',
    marginTop: 12,
    marginBottom: 4,
  },
  emptyHistoryText: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  historyList: {
    marginTop: 8,
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  historyIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  historyDetails: {
    flex: 1,
  },
  historyEvent: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 2,
  },
  historyTime: {
    fontSize: 13,
    color: '#64748B',
  },
  latestBadge: {
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  latestBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#2E7D5E',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    padding: 24,
    paddingBottom: 40,
  },
  modalHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#E2E8F0',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 20,
    textAlign: 'center',
  },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    gap: 12,
  },
  modalOptionText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1E293B',
  },
});