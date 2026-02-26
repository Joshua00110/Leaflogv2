import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert } from 'react-native';
import { useLocalSearchParams, useRouter, Link } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { db, auth } from '../../firebaseConfig';
import { collection, query, where, onSnapshot, doc, updateDoc, Timestamp } from 'firebase/firestore';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Notifications from 'expo-notifications';

interface Plant {
  id: string;
  name: string;
  spaceId: string;
  tasks?: string[];
  lastWatered?: Timestamp | string;
  lastFeed?: Timestamp | string;
  lastMist?: Timestamp | string;
  lastRotate?: Timestamp | string;
  lastClean?: Timestamp | string;
  wateringFrequency?: number;
  reminderHour?: number;
  reminderMinute?: number;
}

export default function SpaceDetail() {
  const { id, name } = useLocalSearchParams<{ id: string; name: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [plants, setPlants] = useState<Plant[]>([]);
  const [layout, setLayout] = useState<'Compact' | 'Detailed'>('Compact');
  const [search, setSearch] = useState('');

  useEffect(() => {
    const user = auth.currentUser;
    if (!user || !id) return;

    const q = query(
      collection(db, "plants"),
      where("userId", "==", user.uid),
      where("spaceId", "==", id)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const plantList = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          name: data.name || 'Unnamed Plant',
          spaceId: data.spaceId,
          tasks: data.tasks || [],
          lastWatered: data.lastWatered,
          lastFeed: data.lastFeed,
          lastMist: data.lastMist,
          lastRotate: data.lastRotate,
          lastClean: data.lastClean,
          wateringFrequency: data.wateringFrequency || 3,
          reminderHour: data.reminderHour ?? 9,
          reminderMinute: data.reminderMinute ?? 0,
        } as Plant;
      });
      setPlants(plantList);
    });

    return () => unsubscribe();
  }, [id]);

  const filteredPlants = plants.filter(plant =>
    plant.name?.toLowerCase().includes(search.toLowerCase())
  );

  // ----- NOTIFICATION HELPER (copy from PlantsScreen) -----
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

  // ----- HANDLE WATERING (NEW!) -----
  const handleWaterPlant = async (plant: Plant) => {
    if (!plant) return;
    
    try {
      const now = new Date();
      const frequency = plant.wateringFrequency || 3;
      const reminderHour = plant.reminderHour ?? 9;
      const reminderMinute = plant.reminderMinute ?? 0;
      
      const nextDate = new Date(now);
      nextDate.setDate(now.getDate() + frequency);
      nextDate.setHours(reminderHour, reminderMinute, 0, 0);

      const plantRef = doc(db, "plants", plant.id);
      await updateDoc(plantRef, {
        lastWatered: Timestamp.fromDate(now),
        nextWateringDate: Timestamp.fromDate(nextDate),
      });

      await scheduleWateringReminder(plant.id, plant.name, nextDate);
      
      Alert.alert("✅ Watered!", `${plant.name} has been watered. Next reminder scheduled.`);
    } catch (error) {
      console.error("Error watering plant:", error);
      Alert.alert("Error", "Could not log watering");
    }
  };

  // Helper to format timestamp safely
  const formatDate = useCallback((timestamp?: Timestamp | string): string => {
    if (!timestamp) return 'Not logged yet';
    
    if (timestamp instanceof Timestamp) {
      try {
        const date = timestamp.toDate();
        const today = new Date();
        const diffTime = today.getTime() - date.getTime();
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays === 0) return 'Today';
        if (diffDays === 1) return 'Yesterday';
        if (diffDays < 7) return `${diffDays} days ago`;
        return date.toLocaleDateString();
      } catch (e) {
        return 'Invalid date';
      }
    }
    
    if (typeof timestamp === 'string') return timestamp;
    return 'Not logged yet';
  }, []);

  const getTaskIcon = useCallback((task: string, size: number = 16, color: string = "#2D4B2D") => {
    switch(task) {
      case 'Water':
        return <Ionicons name="water" size={size} color={color} style={styles.miniIcon} />;
      case 'Feed':
        return <MaterialCommunityIcons name="food-apple" size={size} color={color} style={styles.miniIcon} />;
      case 'Mist':
        return <Ionicons name="cloud" size={size} color={color} style={styles.miniIcon} />;
      case 'Prune':
        return <Ionicons name="cut" size={size} color={color} style={styles.miniIcon} />;
      case 'Repot':
        return <MaterialCommunityIcons name="flower-poppy" size={size} color={color} style={styles.miniIcon} />;
      case 'Clean':
        return <Ionicons name="brush" size={size} color={color} style={styles.miniIcon} />;
      default:
        return null;
    }
  }, []);

  const getTaskLogItem = useCallback((task: string, plant: Plant) => {
    switch(task) {
      case 'Water':
        return (
          <View style={styles.logRow} key={`${plant.id}-${task}`}>
            <Ionicons name="water" size={14} color="#1A3C1A" />
            <Text style={styles.logLabel}>
              Water: <Text style={styles.logStatus}>{formatDate(plant.lastWatered)}</Text>
            </Text>
          </View>
        );
      case 'Feed':
        return (
          <View style={styles.logRow} key={`${plant.id}-${task}`}>
            <MaterialCommunityIcons name="food-apple" size={14} color="#1A3C1A" />
            <Text style={styles.logLabel}>
              Feed: <Text style={styles.logStatus}>{formatDate(plant.lastFeed)}</Text>
            </Text>
          </View>
        );
      case 'Mist':
        return (
          <View style={styles.logRow} key={`${plant.id}-${task}`}>
            <Ionicons name="cloud" size={14} color="#1A3C1A" />
            <Text style={styles.logLabel}>
              Mist: <Text style={styles.logStatus}>{formatDate(plant.lastMist)}</Text>
            </Text>
          </View>
        );
      case 'Prune':
        return (
          <View style={styles.logRow} key={`${plant.id}-${task}`}>
            <Ionicons name="cut" size={14} color="#1A3C1A" />
            <Text style={styles.logLabel}>
              Prune: <Text style={styles.logStatus}>{formatDate(plant.lastRotate)}</Text>
            </Text>
          </View>
        );
      case 'Repot':
        return (
          <View style={styles.logRow} key={`${plant.id}-${task}`}>
            <MaterialCommunityIcons name="flower-poppy" size={14} color="#1A3C1A" />
            <Text style={styles.logLabel}>
              Repot: <Text style={styles.logStatus}>{formatDate(plant.lastClean)}</Text>
            </Text>
          </View>
        );
      case 'Clean':
        return (
          <View style={styles.logRow} key={`${plant.id}-${task}`}>
            <Ionicons name="brush" size={14} color="#1A3C1A" />
            <Text style={styles.logLabel}>
              Clean: <Text style={styles.logStatus}>{formatDate(plant.lastClean)}</Text>
            </Text>
          </View>
        );
      default:
        return null;
    }
  }, [formatDate]);

  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 100 }]}
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

            <Text style={styles.spaceTitle}>{name || "Space Details"}</Text>

            <View style={styles.tagContainer}>
              <View style={styles.tag}>
                <Ionicons name="leaf-outline" size={14} color="#E7F0E9" />
                <Text style={styles.tagText}>
                  Home Space • {plants.length} {plants.length === 1 ? 'plant' : 'plants'}
                </Text>
              </View>
              <View style={styles.tag}>
                <Ionicons name="sunny-outline" size={14} color="#E7F0E9" />
                <Text style={styles.tagText}>Full sun</Text>
              </View>
            </View>
          </View>
        </LinearGradient>

        <View style={styles.content}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Your Plants</Text>
            <TouchableOpacity>
              <Text style={styles.seeAllText}>See All</Text>
            </TouchableOpacity>
          </View>

          {/* Layout Toggle & Search */}
          <View style={styles.controlsRow}>
            <View style={styles.pillContainer}>
              <TouchableOpacity
                style={[styles.pill, layout === 'Compact' && styles.activePill]}
                onPress={() => setLayout('Compact')}
              >
                <Ionicons
                  name="grid-outline"
                  size={16}
                  color={layout === 'Compact' ? '#2E7D5E' : '#94A3B8'}
                />
                <Text style={[styles.pillText, layout === 'Compact' && styles.activePillText]}>
                  Compact
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.pill, layout === 'Detailed' && styles.activePill]}
                onPress={() => setLayout('Detailed')}
              >
                <Ionicons
                  name="list-outline"
                  size={16}
                  color={layout === 'Detailed' ? '#2E7D5E' : '#94A3B8'}
                />
                <Text style={[styles.pillText, layout === 'Detailed' && styles.activePillText]}>
                  Detailed
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.searchContainer}>
              <Ionicons name="search-outline" size={20} color="#94A3B8" />
              <TextInput
                placeholder="Search plants"
                placeholderTextColor="#94A3B8"
                style={styles.searchInput}
                value={search}
                onChangeText={setSearch}
              />
              {search !== '' && (
                <TouchableOpacity onPress={() => setSearch('')}>
                  <Ionicons name="close-circle" size={20} color="#94A3B8" />
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Plant Cards */}
          {filteredPlants.length === 0 ? (
            <View style={styles.emptyState}>
              <View style={styles.emptyIconContainer}>
                <Ionicons name="leaf-outline" size={48} color="#2E7D5E" />
              </View>
              <Text style={styles.emptyTitle}>No plants found</Text>
              <Text style={styles.emptyText}>
                {search ? 'Try a different search term' : 'Add your first plant to this space'}
              </Text>
            </View>
          ) : (
            filteredPlants.map((plant) => (
              <Link key={plant.id} href={{ pathname: "/plant/[id]", params: { id: plant.id } }} asChild>
                <TouchableOpacity activeOpacity={0.7}>
                  <LinearGradient
                    colors={['#FFFFFF', '#F8FAFC']}
                    style={styles.plantCard}
                  >
                    <View style={styles.plantCardContent}>
                      <View style={styles.imagePlaceholder}>
                        <MaterialCommunityIcons name="cactus" size={40} color="#2E7D5E" />
                      </View>

                      <View style={styles.plantDetails}>
                        <View style={styles.plantHeaderRow}>
                          <Text style={styles.plantName}>{plant.name}</Text>
                          <TouchableOpacity
                            style={styles.waterButton}
                            onPress={(e) => {
                              e.stopPropagation();
                              handleWaterPlant(plant); // 👈 NOW WORKS!
                            }}
                          >
                            <LinearGradient
                              colors={['#4A90E2', '#357ABD']}
                              style={styles.waterButtonGradient}
                            >
                              <Ionicons name="water" size={18} color="#FFFFFF" />
                            </LinearGradient>
                          </TouchableOpacity>
                        </View>

                        {/* Tasks Section */}
                        {layout === 'Compact' ? (
                          <View style={styles.iconRow}>
                            {plant.tasks && plant.tasks.length > 0 ? (
                              plant.tasks.map((task) => (
                                <View key={`${plant.id}-${task}`}>
                                  {getTaskIcon(task, 16, "#2E7D5E")}
                                </View>
                              ))
                            ) : (
                              <>
                                <Ionicons name="water" size={16} color="#2D4B2D" style={styles.miniIcon} />
                                <MaterialCommunityIcons name="food-apple" size={16} color="#2D4B2D" style={styles.miniIcon} />
                                <Ionicons name="cloud" size={16} color="#2D4B2D" style={styles.miniIcon} />
                                <Ionicons name="refresh" size={16} color="#2D4B2D" style={styles.miniIcon} />
                              </>
                            )}
                          </View>
                        ) : (
                          <View style={styles.logContainer}>
                            {plant.tasks && plant.tasks.length > 0 ? (
                              plant.tasks.map((task) => (
                                getTaskLogItem(task, plant)
                              ))
                            ) : (
                              <>
                                <View style={styles.logRow} key={`${plant.id}-water-default`}>
                                  <Ionicons name="water" size={14} color="#1A3C1A" />
                                  <Text style={styles.logLabel}>
                                    Water: <Text style={styles.logStatus}>{formatDate(plant.lastWatered)}</Text>
                                  </Text>
                                </View>
                                <View style={styles.logRow} key={`${plant.id}-feed-default`}>
                                  <MaterialCommunityIcons name="food-apple" size={14} color="#1A3C1A" />
                                  <Text style={styles.logLabel}>
                                    Feed: <Text style={styles.logStatus}>{formatDate(plant.lastFeed)}</Text>
                                  </Text>
                                </View>
                                <View style={styles.logRow} key={`${plant.id}-mist-default`}>
                                  <Ionicons name="cloud" size={14} color="#1A3C1A" />
                                  <Text style={styles.logLabel}>
                                    Mist: <Text style={styles.logStatus}>{formatDate(plant.lastMist)}</Text>
                                  </Text>
                                </View>
                              </>
                            )}
                          </View>
                        )}
                      </View>
                    </View>
                  </LinearGradient>
                </TouchableOpacity>
              </Link>
            ))
          )}
        </View>
      </ScrollView>

      {/* Floating Action Button */}
      <TouchableOpacity
        style={[styles.fab, { bottom: insets.bottom + 20 }]}
        onPress={() =>
          router.push({
            pathname: '/add-plant',
            params: { spaceId: id },
          })
        }
        activeOpacity={0.8}
      >
        <LinearGradient colors={['#2E7D5E', '#1B4D3E']} style={styles.fabGradient}>
          <Ionicons name="add" size={32} color="#FFFFFF" />
        </LinearGradient>
      </TouchableOpacity>
    </View>
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
  headerContent: { gap: 16 },
  topActions: { flexDirection: 'row', justifyContent: 'space-between' },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  spaceTitle: {
    fontSize: 32,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  tagContainer: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  tagText: {
    fontSize: 13,
    color: '#E7F0E9',
    fontWeight: '500',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1E293B',
  },
  seeAllText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2E7D5E',
  },
  controlsRow: {
    gap: 16,
    marginBottom: 20,
  },
  pillContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 30,
    padding: 4,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignSelf: 'flex-start',
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 25,
    gap: 6,
  },
  activePill: {
    backgroundColor: '#E8F5E9',
  },
  pillText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#94A3B8',
  },
  activePillText: {
    color: '#2E7D5E',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 16,
    color: '#1E293B',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyIconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#E8F5E9',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    color: '#64748B',
    textAlign: 'center',
  },
  plantCard: {
    marginBottom: 16,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  plantCardContent: {
    flexDirection: 'row',
    padding: 16,
  },
  imagePlaceholder: {
    width: 70,
    height: 90,
    backgroundColor: '#F0F7F0',
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  plantDetails: {
    flex: 1,
  },
  plantHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  plantName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1E293B',
  },
  waterButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    overflow: 'hidden',
    shadowColor: '#4A90E2',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  waterButtonGradient: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconRow: {
    flexDirection: 'row',
    marginTop: 8,
    gap: 12,
  },
  miniIcon: {
    opacity: 0.8,
  },
  logContainer: {
    marginTop: 8,
    gap: 4,
  },
  logRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  logLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
  },
  logStatus: {
    fontWeight: '400',
    color: '#64748B',
  },
  fab: {
    position: 'absolute',
    right: 20,
    width: 64,
    height: 64,
    borderRadius: 32,
    shadowColor: '#2E7D5E',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
    zIndex: 999,
  },
  fabGradient: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
});