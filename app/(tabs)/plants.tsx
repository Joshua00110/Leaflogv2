import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, TextInput, Modal, Pressable, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { db, auth } from '../../firebaseConfig'; 
import { collection, onSnapshot, query, where, doc, updateDoc, Timestamp } from 'firebase/firestore';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import * as Notifications from 'expo-notifications';

interface ActionSchedule {
  frequency: number;
  hour: number;
  minute: number;
}

interface Plant {
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
  createdAt?: Timestamp;
  reminderHour?: number;
  reminderMinute?: number;
  status?: string;
}

interface Space {
  id: string;
  name: string;
}

// Add ACTION_CONFIG for consistent icon mapping
const ACTION_CONFIG: Record<string, { icon: string; color: string; label: string; field: keyof Plant }> = {
  Water: { icon: 'water', color: '#2E7D5E', label: 'Water', field: 'lastWatered' },
  Feed: { icon: 'nutrition-outline', color: '#5C6BC0', label: 'Feed', field: 'lastFeed' },
  Mist: { icon: 'cloud-outline', color: '#4A90E2', label: 'Mist', field: 'lastMist' },
  Prune: { icon: 'cut-outline', color: '#F59E0B', label: 'Prune', field: 'lastRotate' },
  Rotate: { icon: 'refresh-outline', color: '#EC4899', label: 'Rotate', field: 'lastRotate' },
  Clean: { icon: 'brush-outline', color: '#8B5CF6', label: 'Clean', field: 'lastClean' },
};

export default function PlantsScreen() {
  const [plants, setPlants] = useState<Plant[]>([]);
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [activeTab, setActiveTab] = useState('Today');
  const [searchQuery, setSearchQuery] = useState('');
  const router = useRouter();

  const [menuVisible, setMenuVisible] = useState(false);
  const [selectedPlant, setSelectedPlant] = useState<Plant | null>(null);

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    const spacesQuery = query(collection(db, "spaces"), where("userId", "==", user.uid));
    const unsubSpaces = onSnapshot(spacesQuery, (snapshot) => {
      const spaceList = snapshot.docs.map(doc => ({ id: doc.id, name: doc.data().name } as Space));
      setSpaces(spaceList);
    });

    const plantsQuery = query(collection(db, "plants"), where("userId", "==", user.uid));
    const unsubPlants = onSnapshot(plantsQuery, (snapshot) => {
      const plantList = snapshot.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data() 
      } as Plant));
      const activePlants = plantList.filter(p => !p.status || p.status !== 'retired');
      setPlants(activePlants);
    });
    
    return () => {
      unsubSpaces();
      unsubPlants();
    };
  }, []);

  // ----- NOTIFICATION HELPER -----
  const scheduleWateringReminder = async (plantId: string, plantName: string, dueDate: Date) => {
    const baseId = `plant-water-${plantId}`;
    const dueId = `${baseId}-due`;
    const reminder1Id = `${baseId}-reminder-1`;
    const reminder2Id = `${baseId}-reminder-2`;

    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    for (const notif of scheduled) {
      if (notif.identifier.startsWith(baseId)) {
        await Notifications.cancelScheduledNotificationAsync(notif.identifier);
      }
    }

    const now = new Date();

    const scheduleOne = async (identifier: string, triggerDate: Date, message: string) => {
      const secondsUntil = Math.floor((triggerDate.getTime() - now.getTime()) / 1000);
      if (secondsUntil <= 0) return;
      await Notifications.scheduleNotificationAsync({
        identifier,
        content: {
          title: "🌱 Plant Reminder",
          body: message,
          data: { plantId },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
          seconds: secondsUntil,
          repeats: false,
        },
      });
    };

    await scheduleOne(dueId, dueDate, `Time to water ${plantName}!`);
    
    const reminder1Date = new Date(dueDate);
    reminder1Date.setDate(reminder1Date.getDate() + 1);
    await scheduleOne(reminder1Id, reminder1Date, `${plantName} is still dry – please water me!`);

    const reminder2Date = new Date(dueDate);
    reminder2Date.setDate(reminder2Date.getDate() + 2);
    await scheduleOne(reminder2Id, reminder2Date, `I'm so thirsty, master! Water ${plantName} now!`);
  };

  // ----- HANDLE WATERING -----
  const handleWaterPlant = async (plant: Plant) => {
    if (!plant) return;
    try {
      const now = new Date();
      const schedule = plant.schedules?.Water || { frequency: 3, hour: 9, minute: 0 };
      const nextDate = new Date(now);
      nextDate.setDate(now.getDate() + schedule.frequency);
      nextDate.setHours(schedule.hour, schedule.minute, 0, 0);

      const plantRef = doc(db, "plants", plant.id);
      await updateDoc(plantRef, {
        lastWatered: Timestamp.fromDate(now),
        nextWateringDate: Timestamp.fromDate(nextDate),
      });

      await scheduleWateringReminder(plant.id, plant.name, nextDate);
      Alert.alert("Watered!", `${plant.name} has been watered 💧`);
    } catch (error) {
      console.error("Error watering plant:", error);
      Alert.alert("Error", "Could not log watering");
    }
  };

  const handleOpenMenu = (plant: Plant) => {
    setSelectedPlant(plant);
    setMenuVisible(true);
  };

  const handleMoveToRetired = async () => {
    if (!selectedPlant) return;
    Alert.alert(
      "Move to Retired",
      `Are you sure you want to move ${selectedPlant.name} to retired plants?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Move",
          style: "destructive",
          onPress: async () => {
            try {
              // CANCEL ALL NOTIFICATIONS FOR THIS PLANT
              const baseId = `plant-water-${selectedPlant.id}`;
              const scheduled = await Notifications.getAllScheduledNotificationsAsync();
              for (const notif of scheduled) {
                if (notif.identifier.startsWith(baseId)) {
                  await Notifications.cancelScheduledNotificationAsync(notif.identifier);
                }
              }

              const plantRef = doc(db, "plants", selectedPlant.id);
              await updateDoc(plantRef, { status: 'retired' });
              setMenuVisible(false);
            } catch (error) {
              Alert.alert("Error", "Could not move plant.");
              console.error(error);
            }
          }
        }
      ]
    );
  };

  const getSpaceName = (spaceId?: string) => {
    if (!spaceId) return "No Space";
    const space = spaces.find(s => s.id === spaceId);
    return space?.name || "Unknown Space";
  };

  // ✅ Time remaining function (already exists)
  const getTimeRemaining = (targetDate: Date): string => {
    const now = new Date();
    const diffMs = targetDate.getTime() - now.getTime();
    
    if (diffMs <= 0) return 'Now';
    
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    
    if (diffDays > 0) {
      if (diffHours > 0) {
        return `${diffDays}d ${diffHours}h`;
      } else {
        return `${diffDays}d`;
      }
    } else if (diffHours > 0) {
      if (diffMinutes > 0) {
        return `${diffHours}h ${diffMinutes}m`;
      } else {
        return `${diffHours}h`;
      }
    } else {
      return `${diffMinutes}m`;
    }
  };

  const getRelativeTime = (timestamp?: Timestamp): string => {
    if (!timestamp) return "Recently";
    const date = timestamp.toDate();
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);

    if (diffSec < 60) return "Just now";
    if (diffMin < 60) return `${diffMin} minute${diffMin > 1 ? 's' : ''} ago`;
    if (diffHour < 24) return `${diffHour} hour${diffHour > 1 ? 's' : ''} ago`;
    if (diffDay === 1) return "Yesterday";
    if (diffDay < 7) return `${diffDay} days ago`;
    return date.toLocaleDateString();
  };

  // ✅ UPDATED: Get next due date for any action with time remaining
  const getNextDueDisplay = (plant: Plant, action: string): string => {
    const schedule = plant.schedules?.[action];
    if (!schedule) return 'No schedule';
    
    const config = ACTION_CONFIG[action];
    if (!config) return 'No schedule';
    
    const lastField = config.field;
    const last = lastField ? plant[lastField] as Timestamp : undefined;
    
    // If no last date, show "Set first date"
    if (!last) return 'Set first date';
    
    const lastDate = last.toDate();
    
    // Compute next due date based on last date + frequency
    const nextDate = new Date(lastDate);
    nextDate.setDate(lastDate.getDate() + schedule.frequency);
    nextDate.setHours(schedule.hour, schedule.minute, 0, 0);
    
    // Use getTimeRemaining to show exact time remaining
    return getTimeRemaining(nextDate);
  };

  // Keep the original getNextDueDate for filtering
  const getNextDueDate = (plant: Plant): Date | null => {
    const schedule = plant.schedules?.Water;
    if (!schedule) return null;

    const baseDate = plant.lastWatered ? plant.lastWatered.toDate() : new Date();
    const next = new Date(baseDate);
    next.setDate(baseDate.getDate() + schedule.frequency);
    next.setHours(schedule.hour, schedule.minute, 0, 0);
    return next;
  };

  // Keep for backward compatibility
  const getNextWateringDisplay = (plant: Plant): string => {
    const nextDate = getNextDueDate(plant);
    if (!nextDate) return "No schedule";
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    nextDate.setHours(0, 0, 0, 0);
    const diffDays = Math.ceil((nextDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Tomorrow";
    return `in ${diffDays} days`;
  };

  // ----- FILTERING -----
  const getFilteredPlants = () => {
    let filtered = plants;

    if (searchQuery) {
      filtered = filtered.filter(plant => 
        plant.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        getSpaceName(plant.spaceId).toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (activeTab === 'Today') {
      filtered = filtered.filter(plant => {
        const nextDate = getNextDueDate(plant);
        if (!nextDate) return false;
        const nextDay = new Date(nextDate);
        nextDay.setHours(0, 0, 0, 0);
        return nextDay <= today;
      });
    } else if (activeTab === 'Upcoming') {
      filtered = filtered.filter(plant => {
        const nextDate = getNextDueDate(plant);
        if (!nextDate) return true;
        const nextDay = new Date(nextDate);
        nextDay.setHours(0, 0, 0, 0);
        return nextDay > today;
      });
    }

    return filtered;
  };

  const getTaskIcon = (task: string, size: number = 16, color: string = "#2E7D5E") => {
    switch(task) {
      case 'Water':
        return <Ionicons name="water" size={size} color={color} style={styles.miniIcon} />;
      case 'Feed':
        return <Ionicons name="nutrition-outline" size={size} color={color} style={styles.miniIcon} />;
      case 'Mist':
        return <Ionicons name="cloud-outline" size={size} color={color} style={styles.miniIcon} />;
      case 'Prune':
        return <Ionicons name="cut-outline" size={size} color={color} style={styles.miniIcon} />;
      case 'Repot':
        return <Ionicons name="flower-outline" size={size} color={color} style={styles.miniIcon} />;
      case 'Clean':
        return <Ionicons name="brush-outline" size={size} color={color} style={styles.miniIcon} />;
      default:
        return null;
    }
  };

  const filteredPlants = getFilteredPlants();

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* Header with Gradient */}
        <LinearGradient
          colors={['#1B4D3E', '#0F2F26']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.headerGradient}
        >
          <View style={styles.headerContent}>
            <View style={styles.headerTop}>
              <Text style={styles.title}>My Plants</Text>
              <TouchableOpacity 
                style={styles.archiveButton}
                onPress={() => router.push('/retired')}
              >
                <Ionicons name="archive-outline" size={20} color="#E7F0E9" />
                <Text style={styles.archiveText}>Archive</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.statsGrid}>
              <View style={styles.statBox}>
                <Text style={styles.statNumber}>{plants.length}</Text>
                <Text style={styles.statLabel}>Total Plants</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statBox}>
                <Text style={styles.statNumber}>
                  {plants.filter(p => {
                    const nextDate = getNextDueDate(p);
                    if (!nextDate) return false;
                    const nextDay = new Date(nextDate);
                    nextDay.setHours(0,0,0,0);
                    return nextDay <= new Date(new Date().setHours(0,0,0,0));
                  }).length}
                </Text>
                <Text style={styles.statLabel}>Need Water</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statBox}>
                <Text style={styles.statNumber}>
                  {plants.filter(p => !p.schedules?.Water).length}
                </Text>
                <Text style={styles.statLabel}>Unscheduled</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statBox}>
                <Text style={styles.statNumber}>
                  {plants.filter(p => {
                    const nextDate = getNextDueDate(p);
                    if (!nextDate) return false;
                    const nextDay = new Date(nextDate);
                    nextDay.setHours(0,0,0,0);
                    return nextDay > new Date(new Date().setHours(0,0,0,0));
                  }).length}
                </Text>
                <Text style={styles.statLabel}>Upcoming</Text>
              </View>
            </View>
          </View>
        </LinearGradient>

        <View style={styles.searchContainer}>
          <Ionicons name="search-outline" size={20} color="#94A3B8" />
          <TextInput 
            placeholder="Search plants or spaces..." 
            style={styles.searchInput}
            placeholderTextColor="#94A3B8"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery !== '' && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={20} color="#94A3B8" />
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.tabsWrapper}>
          <TouchableOpacity 
            style={[styles.tabButton, activeTab === 'Today' && styles.activeTab]}
            onPress={() => setActiveTab('Today')}
          >
            <Text style={[styles.tabText, activeTab === 'Today' && styles.activeTabText]}>Today</Text>
            {activeTab === 'Today' && <View style={styles.tabIndicator} />}
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.tabButton, activeTab === 'Upcoming' && styles.activeTab]}
            onPress={() => setActiveTab('Upcoming')}
          >
            <Text style={[styles.tabText, activeTab === 'Upcoming' && styles.activeTabText]}>Upcoming</Text>
            {activeTab === 'Upcoming' && <View style={styles.tabIndicator} />}
          </TouchableOpacity>
        </View>

        {plants.filter(p => {
          const nextDate = getNextDueDate(p);
          if (!nextDate) return false;
          const nextDay = new Date(nextDate);
          nextDay.setHours(0,0,0,0);
          return nextDay <= new Date(new Date().setHours(0,0,0,0));
        }).length > 0 && (
          <LinearGradient
            colors={['#FEF3C7', '#FDE68A']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.attentionBanner}
          >
            <View style={styles.attentionIcon}>
              <Ionicons name="alert-circle" size={24} color="#D97706" />
            </View>
            <View style={styles.attentionContent}>
              <Text style={styles.attentionTitle}>Watering Alert</Text>
              <Text style={styles.attentionText}>
                {plants.filter(p => {
                  const nextDate = getNextDueDate(p);
                  if (!nextDate) return false;
                  const nextDay = new Date(nextDate);
                  nextDay.setHours(0,0,0,0);
                  return nextDay <= new Date(new Date().setHours(0,0,0,0));
                }).length} plants need water today
              </Text>
            </View>
          </LinearGradient>
        )}

        {filteredPlants.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIconContainer}>
              <Ionicons name="leaf-outline" size={48} color="#2E7D5E" />
            </View>
            <Text style={styles.emptyTitle}>
              {activeTab === 'Today' ? 'No plants need water today' : 'No plants with upcoming watering'}
            </Text>
            <Text style={styles.emptyText}>
              {searchQuery ? 'Try a different search term' : 'Add your first plant to get started!'}
            </Text>
          </View>
        ) : (
          filteredPlants.map((plant) => (
            <TouchableOpacity 
              key={plant.id}
              style={styles.plantCard}
              activeOpacity={0.7}
              onPress={() => router.push({ pathname: "/plant/[id]", params: { id: plant.id } })}
            >
              <LinearGradient colors={['#FFFFFF', '#F8FAFC']} style={styles.plantCardGradient}>
                <View style={styles.plantCardContent}>
                  <View style={[styles.plantIconBox, { backgroundColor: '#E8F5E9' }]}>
                    <Ionicons name="leaf" size={32} color="#2E7D5E" />
                  </View>
                  
                  <View style={styles.plantInfo}>
                    <View style={styles.plantHeader}>
                      <Text style={styles.plantName}>{plant.name || "Unnamed Plant"}</Text>
                      <View style={styles.spaceBadge}>
                        <Ionicons name="location-outline" size={12} color="#64748B" />
                        <Text style={styles.spaceBadgeText}>{getSpaceName(plant.spaceId)}</Text>
                      </View>
                    </View>
                    
                    <View style={styles.tasksRow}>
                      {plant.tasks && plant.tasks.length > 0 ? (
                        plant.tasks.map((task, index) => (
                          <View key={index} style={styles.taskIconWrapper}>
                            {getTaskIcon(task, 16, "#2E7D5E")}
                          </View>
                        ))
                      ) : (
                        <>
                          <View style={styles.taskIconWrapper}>
                            <Ionicons name="water" size={16} color="#2E7D5E" />
                          </View>
                          <View style={styles.taskIconWrapper}>
                            <Ionicons name="nutrition-outline" size={16} color="#2E7D5E" />
                          </View>
                          <View style={styles.taskIconWrapper}>
                            <Ionicons name="cloud-outline" size={16} color="#2E7D5E" />
                          </View>
                        </>
                      )}
                    </View>

                    {/* ✅ UPDATED: Show all scheduled tasks with time remaining like in PlantDetails */}
                    <View style={styles.tasksScheduleContainer}>
                      {plant.schedules && Object.entries(plant.schedules).map(([action, schedule]) => {
                        const config = ACTION_CONFIG[action];
                        if (!config) return null;
                        
                        const lastTimestamp = plant[config.field] as Timestamp | undefined;
                        const nextDisplay = lastTimestamp ? getNextDueDisplay(plant, action) : 'Set first date';
                        
                        return (
                          <View key={action} style={[styles.taskBadge, { backgroundColor: config.color + '20' }]}>
                            <Ionicons name={config.icon as any} size={14} color={config.color} />
                            <Text style={[styles.taskText, { color: config.color }]}>
                              {config.label}: {nextDisplay}
                            </Text>
                          </View>
                        );
                      })}
                    </View>

                    <View style={styles.plantMeta}>
                      <View style={styles.metaItem}>
                        <Ionicons name="time-outline" size={14} color="#94A3B8" />
                        <Text style={styles.metaText}>
                          Added {getRelativeTime(plant.createdAt)}
                        </Text>
                      </View>
                    </View>
                  </View>

                  <View style={styles.cardActions}>
                    <TouchableOpacity 
                      style={styles.waterButton}
                      onPress={(e) => { e.stopPropagation(); handleWaterPlant(plant); }}
                    >
                      <LinearGradient colors={['#4A90E2', '#357ABD']} style={styles.waterButtonGradient}>
                        <Ionicons name="water" size={20} color="#FFFFFF" />
                      </LinearGradient>
                    </TouchableOpacity>
                    
                    <TouchableOpacity 
                      style={styles.menuButton}
                      onPress={(e) => { e.stopPropagation(); handleOpenMenu(plant); }}
                    >
                      <Ionicons name="ellipsis-horizontal-circle" size={24} color="#94A3B8" />
                    </TouchableOpacity>
                  </View>
                </View>
              </LinearGradient>
            </TouchableOpacity>
          ))
        )}

        <LinearGradient colors={['#2E7D5E', '#1B4D3E']} style={styles.tipCard}>
          <Ionicons name="bulb-outline" size={24} color="#FFE082" />
          <View style={styles.tipContent}>
            <Text style={styles.tipTitle}>Pro Tip</Text>
            <Text style={styles.tipText}>Most plants prefer morning watering to prevent fungal growth.</Text>
          </View>
        </LinearGradient>
      </ScrollView>

      <TouchableOpacity style={styles.fab} onPress={() => router.push('/add-plant')}>
        <LinearGradient colors={['#2E7D5E', '#1B4D3E']} style={styles.fabGradient}>
          <Ionicons name="add" size={32} color="#FFFFFF" />
        </LinearGradient>
      </TouchableOpacity>

      <Modal visible={menuVisible} transparent animationType="slide">
        <Pressable style={styles.modalOverlay} onPress={() => setMenuVisible(false)}>
          <BlurView intensity={20} style={styles.blurView}>
            <View style={styles.modalContent}>
              <View style={styles.modalHandle} />
              <View style={styles.modalHeader}>
                <View style={[styles.modalIcon, { backgroundColor: '#E8F5E9' }]}>
                  <Ionicons name="leaf" size={24} color="#2E7D5E" />
                </View>
                <View>
                  <Text style={styles.modalTitle}>{selectedPlant?.name}</Text>
                  <Text style={styles.modalSubtitle}>{getSpaceName(selectedPlant?.spaceId)}</Text>
                </View>
              </View>

              <TouchableOpacity style={styles.modalOption} onPress={() => { setMenuVisible(false); if (selectedPlant) router.push({ pathname: "/plant/[id]", params: { id: selectedPlant.id } }); }}>
                <View style={[styles.optionIcon, { backgroundColor: '#E8F5E9' }]}>
                  <Ionicons name="eye-outline" size={22} color="#2E7D5E" />
                </View>
                <View style={styles.optionTextContainer}>
                  <Text style={styles.optionTitle}>View Details</Text>
                  <Text style={styles.optionSubtitle}>See complete plant information</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity style={styles.modalOption} onPress={() => { setMenuVisible(false); if (selectedPlant) router.push({ pathname: "/plant/edit/[id]", params: { id: selectedPlant.id } }); }}>
                <View style={[styles.optionIcon, { backgroundColor: '#E8EAF6' }]}>
                  <Ionicons name="create-outline" size={22} color="#5C6BC0" />
                </View>
                <View style={styles.optionTextContainer}>
                  <Text style={styles.optionTitle}>Edit Plant</Text>
                  <Text style={styles.optionSubtitle}>Update plant details</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity style={[styles.modalOption, styles.deleteOption]} onPress={handleMoveToRetired}>
                <View style={[styles.optionIcon, { backgroundColor: '#FFEBEE' }]}>
                  <Ionicons name="archive-outline" size={22} color="#DC2626" />
                </View>
                <View style={styles.optionTextContainer}>
                  <Text style={[styles.optionTitle, { color: '#DC2626' }]}>Move to Retired</Text>
                  <Text style={[styles.optionSubtitle, { color: '#EF4444' }]}>Archive this plant</Text>
                </View>
              </TouchableOpacity>
            </View>
          </BlurView>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F7FA' },
  scrollContent: { paddingBottom: 100 },
  headerGradient: {
    paddingTop: 60,
    paddingBottom: 30,
    paddingHorizontal: 24,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  headerContent: { gap: 24 },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: 32, fontWeight: '700', color: '#FFFFFF', letterSpacing: -0.5 },
  archiveButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.15)', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, gap: 6 },
  archiveText: { color: '#E7F0E9', fontSize: 14, fontWeight: '500' },
  statsGrid: { 
  flexDirection: 'row', 
  backgroundColor: 'rgba(255,255,255,0.1)', 
  borderRadius: 20, 
  padding: 16, 
  alignItems: 'center',
  justifyContent: 'space-around'
},
  statBox: { flex: 1, alignItems: 'center',},
  statNumber: { fontSize: 24, fontWeight: '700', color: '#FFFFFF' },
  statLabel: { 
  fontSize: 11, 
  color: '#E7F0E9', 
  marginTop: 4,
  fontWeight: '400',
  opacity: 0.9,
  
  textAlign: 'center'
},
  statDivider: { width: 1, height: 30, backgroundColor: 'rgba(255,255,255,0.2)' },
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', marginHorizontal: 24, marginTop: -20, marginBottom: 20, paddingHorizontal: 16, paddingVertical: 12, borderRadius: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 4 },
  searchInput: { flex: 1, marginLeft: 12, fontSize: 16, color: '#1E293B' },
  tabsWrapper: { flexDirection: 'row', paddingHorizontal: 24, marginBottom: 20, gap: 24 },
  tabButton: { position: 'relative', paddingBottom: 8 },
  tabText: { fontSize: 18, fontWeight: '600', color: '#94A3B8' },
  activeTab: {},
  activeTabText: { color: '#2E7D5E' },
  tabIndicator: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 3, backgroundColor: '#2E7D5E', borderRadius: 3 },
  attentionBanner: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 24, marginBottom: 20, padding: 16, borderRadius: 16, gap: 12 },
  attentionIcon: { width: 44, height: 44, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.3)', justifyContent: 'center', alignItems: 'center' },
  attentionContent: { flex: 1 },
  attentionTitle: { fontSize: 16, fontWeight: '700', color: '#92400E', marginBottom: 2 },
  attentionText: { fontSize: 14, color: '#92400E', opacity: 0.8 },
  emptyState: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60, paddingHorizontal: 24 },
  emptyIconContainer: { width: 96, height: 96, borderRadius: 48, backgroundColor: '#E8F5E9', justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: '#1E293B', marginBottom: 8 },
  emptyText: { fontSize: 16, color: '#64748B', textAlign: 'center' },
  plantCard: { marginHorizontal: 24, marginBottom: 16, borderRadius: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 12, elevation: 4 },
  plantCardGradient: { borderRadius: 20, overflow: 'hidden' },
  plantCardContent: { flexDirection: 'row', padding: 16 },
  plantIconBox: { width: 70, height: 70, borderRadius: 18, justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  plantInfo: { flex: 1 },
  plantHeader: { marginBottom: 8 },
  plantName: { fontSize: 18, fontWeight: '700', color: '#1E293B', marginBottom: 4 },
  spaceBadge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  spaceBadgeText: { fontSize: 13, color: '#64748B' },
  tasksRow: { flexDirection: 'row', marginBottom: 8, gap: 8 },
  taskIconWrapper: { width: 24, height: 24, justifyContent: 'center', alignItems: 'center' },
  taskContainer: { marginBottom: 8 },
  tasksScheduleContainer: { marginTop: 8, gap: 6, marginBottom: 8 },
  taskBadge: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, gap: 4 },
  taskText: { fontSize: 13, fontWeight: '600' },
  plantMeta: { flexDirection: 'row', alignItems: 'center' },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontSize: 12, color: '#94A3B8' },
  cardActions: { justifyContent: 'space-between', alignItems: 'center' },
  waterButton: { width: 44, height: 44, borderRadius: 22, overflow: 'hidden', marginBottom: 8, shadowColor: '#4A90E2', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4, elevation: 3 },
  waterButtonGradient: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  menuButton: { padding: 4 },
  miniIcon: { opacity: 0.8 },
  tipCard: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 24, marginTop: 8, marginBottom: 20, padding: 16, borderRadius: 16, gap: 12 },
  tipContent: { flex: 1 },
  tipTitle: { fontSize: 14, fontWeight: '600', color: '#FFE082', marginBottom: 2 },
  tipText: { fontSize: 13, color: '#E7F0E9', lineHeight: 18 },
  fab: { position: 'absolute', bottom: 95, right: 25, backgroundColor: '#10B981', width: 60, height: 55, borderRadius: 24, justifyContent: 'center', alignItems: 'center', shadowColor: '#10B981', shadowOpacity: 0.4, shadowRadius: 15, elevation: 10, zIndex: 999 },
  fabGradient: { width: 64, height: 64, borderRadius: 32, justifyContent: 'center', alignItems: 'center' },
  modalOverlay: { flex: 1 },
  blurView: { flex: 1, justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 24, paddingBottom: 40 },
  modalHandle: { width: 40, height: 4, backgroundColor: '#E2E8F0', borderRadius: 2, alignSelf: 'center', marginBottom: 24 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 24, gap: 12 },
  modalIcon: { width: 48, height: 48, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  modalTitle: { fontSize: 20, fontWeight: '700', color: '#1E293B', marginBottom: 2 },
  modalSubtitle: { fontSize: 14, color: '#64748B' },
  modalOption: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  deleteOption: { borderBottomWidth: 0 },
  optionIcon: { width: 48, height: 48, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  optionTextContainer: { flex: 1 },
  optionTitle: { fontSize: 16, fontWeight: '600', color: '#1E293B', marginBottom: 2 },
  optionSubtitle: { fontSize: 13, color: '#64748B' },
});