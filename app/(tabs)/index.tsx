import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Modal,
  Pressable,
  FlatList,
  Alert,
  Dimensions,
  Animated,
  StatusBar,
  Easing,
  Image,
  Platform,
} from 'react-native';
import { db, auth } from '../../firebaseConfig';
import {
  collection,
  onSnapshot,
  query,
  where,
  doc,
  updateDoc,
  Timestamp,
} from 'firebase/firestore';
import { Link, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Notifications from 'expo-notifications';

const { height, width } = Dimensions.get('window');

interface Space {
  id: string;
  name: string;
  lightCondition: string;
}

interface Plant {
  id: string;
  lastFeed?: Timestamp;
  name: string;
  status?: string;
  spaceId: string;
  spaceName?: string;
  lastWatered?: Timestamp;
  nextWateringDate?: Timestamp;
  wateringFrequency?: number;
  lastFertilized?: Timestamp;
  fertilizerFrequency?: number;
  defaultFertilizer?: string;
  tasks?: string[];
  schedules?: Record<string, {
    frequency: number;
    hour: number;
    minute: number;
  }>;
}

export default function HomeDashboard() {
  const insets = useSafeAreaInsets();
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [totalPlants, setTotalPlants] = useState(0);
  const [plants, setPlants] = useState<Plant[]>([]);
  const router = useRouter();

  const [menuVisible, setMenuVisible] = useState(false);
  const [selectedSpace, setSelectedSpace] = useState<Space | null>(null);

  const [waterModalVisible, setWaterModalVisible] = useState(false);
  const [duePlants, setDuePlants] = useState<Plant[]>([]);
  const [selectedPlants, setSelectedPlants] = useState<Set<string>>(new Set());

  const [fertilizeModalVisible, setFertilizeModalVisible] = useState(false);
  const [fertilizeDuePlants, setFertilizeDuePlants] = useState<Plant[]>([]);
  const [selectedFertilizePlants, setSelectedFertilizePlants] = useState<Set<string>>(new Set());
  const user = auth.currentUser;

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;
  const headerFloatAnim = useRef(new Animated.Value(0)).current;
  const cardAnimations = useRef<{ [key: string]: Animated.Value }>({}).current;
  const actionButtonScale = useRef(new Animated.Value(1)).current;
  const fabAnim = useRef(new Animated.Value(0)).current;
  const modalSlideAnim = useRef(new Animated.Value(height)).current;
  
  // Leaf animation values
  const leaf1Anim = useRef(new Animated.Value(0)).current;
  const leaf2Anim = useRef(new Animated.Value(0)).current;
  const leaf3Anim = useRef(new Animated.Value(0)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Entrance animation
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
        easing: Easing.out(Easing.cubic),
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
        easing: Easing.out(Easing.back(1.2)),
      }),
      Animated.timing(headerFloatAnim, {
        toValue: 1,
        duration: 2000,
        useNativeDriver: true,
        easing: Easing.inOut(Easing.sin),
      }),
    ]).start();

    // FAB animation
    Animated.spring(fabAnim, {
      toValue: 1,
      friction: 5,
      tension: 40,
      useNativeDriver: true,
      delay: 500,
    }).start();

    // Leaf animations (infinite)
    Animated.loop(
      Animated.sequence([
        Animated.timing(leaf1Anim, {
          toValue: 1,
          duration: 3000,
          useNativeDriver: true,
          easing: Easing.inOut(Easing.sin),
        }),
        Animated.timing(leaf1Anim, {
          toValue: 0,
          duration: 3000,
          useNativeDriver: true,
          easing: Easing.inOut(Easing.sin),
        }),
      ])
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(leaf2Anim, {
          toValue: 1,
          duration: 4000,
          useNativeDriver: true,
          easing: Easing.inOut(Easing.sin),
        }),
        Animated.timing(leaf2Anim, {
          toValue: 0,
          duration: 4000,
          useNativeDriver: true,
          easing: Easing.inOut(Easing.sin),
        }),
      ])
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(leaf3Anim, {
          toValue: 1,
          duration: 3500,
          useNativeDriver: true,
          easing: Easing.inOut(Easing.sin),
        }),
        Animated.timing(leaf3Anim, {
          toValue: 0,
          duration: 3500,
          useNativeDriver: true,
          easing: Easing.inOut(Easing.sin),
        }),
      ])
    ).start();

    // Rotation animation for background elements
    Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 20000,
        useNativeDriver: true,
        easing: Easing.linear,
      })
    ).start();

    // Pulse animation for action buttons when there are due plants
    if (duePlants.length > 0 || fertilizeDuePlants.length > 0) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(actionButtonScale, {
            toValue: 1.05,
            duration: 800,
            useNativeDriver: true,
            easing: Easing.inOut(Easing.ease),
          }),
          Animated.timing(actionButtonScale, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
            easing: Easing.inOut(Easing.ease),
          }),
        ])
      ).start();
    }
  }, [duePlants.length, fertilizeDuePlants.length]);

  // Modal animation
  useEffect(() => {
    if (waterModalVisible || fertilizeModalVisible || menuVisible) {
      Animated.spring(modalSlideAnim, {
        toValue: 0,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(modalSlideAnim, {
        toValue: height,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [waterModalVisible, fertilizeModalVisible, menuVisible]);

  // Card animations
  useEffect(() => {
    spaces.forEach((space, index) => {
      if (!cardAnimations[space.id]) {
        cardAnimations[space.id] = new Animated.Value(0);
        Animated.sequence([
          Animated.delay(index * 100),
          Animated.spring(cardAnimations[space.id], {
            toValue: 1,
            friction: 8,
            tension: 40,
            useNativeDriver: true,
          }),
        ]).start();
      }
    });
  }, [spaces]);

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    const qSpaces = query(collection(db, 'spaces'), where('userId', '==', user.uid));
    const unsubSpaces = onSnapshot(qSpaces, (snapshot) => {
      setSpaces(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Space)));
    });

    const qPlants = query(collection(db, 'plants'), where('userId', '==', user.uid));
    const unsubPlants = onSnapshot(qPlants, (snapshot) => {
      const plantList = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Plant[];
      setPlants(plantList);
      setTotalPlants(plantList.length);
    });

    return () => {
      unsubSpaces();
      unsubPlants();
    };
  }, []);

  // Water due plants
  useEffect(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = plants.filter((p) => {
      if (!p.nextWateringDate) return false;
      const nextDate = p.nextWateringDate.toDate();
      nextDate.setHours(0, 0, 0, 0);
      return nextDate <= today;
    });
    setDuePlants(due);
  }, [plants]);

  // Fertilize due plants
  useEffect(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const due = plants.filter((p) => {
      if (p.status === 'retired') return false;
      if (!p.tasks?.includes('Feed')) return false;
      const schedule = p.schedules?.Feed;
      if (!schedule) return false;

      const last = p.lastFeed;
      if (!last) return true;
      
      const lastDate = last.toDate();
      const nextDate = new Date(lastDate);
      nextDate.setDate(lastDate.getDate() + schedule.frequency);
      nextDate.setHours(schedule.hour, schedule.minute, 0, 0);
      
      const nextDay = new Date(nextDate);
      nextDay.setHours(0, 0, 0, 0);
      
      return nextDay <= today;
    });

    setFertilizeDuePlants(due);
  }, [plants]);

  const handleOpenMenu = (space: Space) => {
    setSelectedSpace(space);
    setMenuVisible(true);
  };

  const getLightConditionColor = (condition: string) => {
    switch (condition.toLowerCase()) {
      case 'full sun': return '#FCD34D';
      case 'partial shade': return '#6EE7B7';
      case 'shade': return '#9CA3AF';
      default: return '#6EE7B7';
    }
  };

  const openWaterModal = () => {
    setSelectedPlants(new Set());
    setWaterModalVisible(true);
  };

  const togglePlantSelection = (plantId: string) => {
    setSelectedPlants((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(plantId)) newSet.delete(plantId);
      else newSet.add(plantId);
      return newSet;
    });
  };

  const snoozePlant = async (plantId: string, days: number = 2) => {
    try {
      const plantRef = doc(db, 'plants', plantId);
      const plant = plants.find((p) => p.id === plantId);
      if (!plant) return;

      let newNextDate: Date;
      if (plant.nextWateringDate) {
        newNextDate = new Date(plant.nextWateringDate.toDate());
      } else {
        newNextDate = new Date();
      }
      newNextDate.setDate(newNextDate.getDate() + days);
      newNextDate.setHours(0, 0, 0, 0);

      await updateDoc(plantRef, {
        nextWateringDate: Timestamp.fromDate(newNextDate),
      });
    } catch (error) {
      Alert.alert('Error', 'Could not snooze plant');
    }
  };

  const waterSinglePlant = async (plantId: string) => {
    try {
      const plant = plants.find((p) => p.id === plantId);
      if (!plant) return;

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const frequency = plant.wateringFrequency || 3;
      const nextDate = new Date(today);
      nextDate.setDate(today.getDate() + frequency);
      nextDate.setHours(0, 0, 0, 0);

      const plantRef = doc(db, 'plants', plantId);
      await updateDoc(plantRef, {
        lastWatered: Timestamp.fromDate(today),
        nextWateringDate: Timestamp.fromDate(nextDate),
      });

      Alert.alert('Success', `${plant.name} watered!`);
    } catch (error) {
      Alert.alert('Error', 'Could not water plant');
    }
  };

  const logWatering = async () => {
    if (selectedPlants.size === 0) {
      Alert.alert('No plants selected', 'Please select at least one plant.');
      return;
    }

    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const updates = Array.from(selectedPlants).map(async (plantId) => {
        const plant = plants.find((p) => p.id === plantId);
        if (!plant) return;

        const frequency = plant.wateringFrequency || 3;
        const nextDate = new Date(today);
        nextDate.setDate(today.getDate() + frequency);
        nextDate.setHours(0, 0, 0, 0);

        const plantRef = doc(db, 'plants', plantId);
        await updateDoc(plantRef, {
          lastWatered: Timestamp.fromDate(today),
          nextWateringDate: Timestamp.fromDate(nextDate),
        });
      });

      await Promise.all(updates);
      setWaterModalVisible(false);
      Alert.alert('Success', 'Watering logged!');
    } catch (error) {
      Alert.alert('Error', 'Could not log watering');
    }
  };

  const openFertilizeModal = () => {
    setSelectedFertilizePlants(new Set());
    setFertilizeModalVisible(true);
  };

  const toggleFertilizeSelection = (plantId: string) => {
    setSelectedFertilizePlants((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(plantId)) newSet.delete(plantId);
      else newSet.add(plantId);
      return newSet;
    });
  };

  // Check if a plant is thriving (watered on schedule)
  const isPlantThriving = (plant: Plant): boolean => {
    if (!plant.lastWatered) return false;
    
    const lastWatered = plant.lastWatered.toDate();
    const today = new Date();
    const schedule = plant.schedules?.Water;
    
    if (!schedule) return false;
    
    const daysSinceWatered = Math.floor((today.getTime() - lastWatered.getTime()) / (1000 * 60 * 60 * 24));
    
    return daysSinceWatered <= schedule.frequency;
  };

  // Helper function to get thriving percentage for a specific space
  const getSpaceThrivingPercentage = (spaceId: string): number => {
    const spacePlants = plants.filter(p => p.spaceId === spaceId);
    if (spacePlants.length === 0) return 0;
    
    const thrivingInSpace = spacePlants.filter(p => isPlantThriving(p)).length;
    return Math.round((thrivingInSpace / spacePlants.length) * 100);
  };

  const scheduleActionReminder = async (action: string, plantId: string, plantName: string, dueDate: Date) => {
    const baseId = `plant-${action.toLowerCase()}-${plantId}`;
    
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    for (const notif of scheduled) {
      if (notif.identifier.startsWith(baseId)) {
        await Notifications.cancelScheduledNotificationAsync(notif.identifier);
      }
    }

    const now = new Date();
    const secondsUntil = Math.floor((dueDate.getTime() - now.getTime()) / 1000);
    if (secondsUntil <= 0) return;

    await Notifications.scheduleNotificationAsync({
      identifier: `${baseId}-due`,
      content: {
        title: "🌱 Plant Reminder",
        body: `Time to ${action.toLowerCase()} ${plantName}!`,
        data: { plantId, action },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: secondsUntil,
        repeats: false,
      },
    });
  };

  const fertilizeSinglePlant = async (plantId: string) => {
    try {
      const plant = plants.find((p) => p.id === plantId);
      if (!plant) return;

      const now = new Date();
      now.setHours(0, 0, 0, 0);

      const plantRef = doc(db, 'plants', plantId);
      
      await updateDoc(plantRef, {
        lastFeed: Timestamp.fromDate(now),
      });

      const schedule = plant.schedules?.Feed;
      if (schedule) {
        const nextDate = new Date(now);
        nextDate.setDate(now.getDate() + schedule.frequency);
        nextDate.setHours(schedule.hour, schedule.minute, 0, 0);
        await scheduleActionReminder('Feed', plantId, plant.name, nextDate);
      }

      Alert.alert('Success', `${plant.name} fertilized!`);
    } catch (error) {
      Alert.alert('Error', 'Could not fertilize plant');
    }
  };

  const logFertilizing = async () => {
    if (selectedFertilizePlants.size === 0) {
      Alert.alert('No plants selected', 'Please select at least one plant.');
      return;
    }

    try {
      const now = new Date();
      now.setHours(0, 0, 0, 0);
      
      const updates = Array.from(selectedFertilizePlants).map(async (plantId) => {
        const plant = plants.find((p) => p.id === plantId);
        if (!plant) return;

        const plantRef = doc(db, 'plants', plantId);
        await updateDoc(plantRef, {
          lastFertilized: Timestamp.fromDate(now),
        });

        const schedule = plant.schedules?.Feed;
        if (schedule) {
          const nextDate = new Date(now);
          nextDate.setDate(now.getDate() + schedule.frequency);
          nextDate.setHours(schedule.hour, schedule.minute, 0, 0);
          await scheduleActionReminder('Feed', plantId, plant.name, nextDate);
        }
      });

      await Promise.all(updates);
      setFertilizeModalVisible(false);
      Alert.alert('Success', 'Fertilizing logged!');
    } catch (error) {
      Alert.alert('Error', 'Could not log fertilizing');
    }
  };

  const getSpaceName = (spaceId: string) => {
    const space = spaces.find((s) => s.id === spaceId);
    return space?.name || 'Unknown';
  };

  const headerFloat = headerFloatAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -5],
  });

  // Leaf animation interpolations
  const leaf1Rotate = leaf1Anim.interpolate({
    inputRange: [0, 1],
    outputRange: ['-2deg', '2deg'],
  });

  const leaf2Rotate = leaf2Anim.interpolate({
    inputRange: [0, 1],
    outputRange: ['3deg', '-1deg'],
  });

  const leaf3Rotate = leaf3Anim.interpolate({
    inputRange: [0, 1],
    outputRange: ['-1deg', '3deg'],
  });

  const rotate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <LinearGradient 
      colors={['#E8F5E9', '#C8E6C9', '#A5D6A7']} 
      style={styles.container}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      
      {/* Enhanced Decorative background elements with animations */}
      <Animated.View style={[styles.bgCircle1, { transform: [{ rotate }] }]} />
      <Animated.View style={[styles.bgCircle2, { transform: [{ rotate: rotateAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '-360deg'] }) }] }]} />
      <View style={styles.bgCircle3} />
      
      {/* Floating leaf decorations */}
      <Animated.View style={[styles.floatingLeaf1, { transform: [{ rotate: leaf1Rotate }, { translateY: leaf1Anim.interpolate({ inputRange: [0, 1], outputRange: [0, -10] }) }] }]}>
        <Text style={styles.leafEmoji}>🌿</Text>
      </Animated.View>
      <Animated.View style={[styles.floatingLeaf2, { transform: [{ rotate: leaf2Rotate }, { translateY: leaf2Anim.interpolate({ inputRange: [0, 1], outputRange: [0, -15] }) }] }]}>
        <Text style={styles.leafEmoji}>🌱</Text>
      </Animated.View>
      <Animated.View style={[styles.floatingLeaf3, { transform: [{ rotate: leaf3Rotate }, { translateY: leaf3Anim.interpolate({ inputRange: [0, 1], outputRange: [0, -12] }) }] }]}>
        <Text style={styles.leafEmoji}>🍃</Text>
      </Animated.View>

      <SafeAreaView style={styles.safeArea}>
        <Animated.ScrollView 
          contentContainerStyle={styles.scrollContent} 
          showsVerticalScrollIndicator={false}
          style={{ opacity: fadeAnim }}
        >
          <Animated.View style={{ transform: [{ translateY: headerFloat }] }}>
            <LinearGradient 
              colors={['rgba(27, 77, 62, 0.95)', 'rgba(15, 47, 38, 0.98)']} 
              style={styles.headerGradient}
            >
              <View style={styles.headerContent}>
                <View style={styles.headerTop}>
                  <View>
                    <Text style={styles.brandTitle}>leaflog</Text>
                    <Text style={styles.greeting}>Welcome back, plant parent 🌱</Text>
                  </View>
                  <TouchableOpacity style={styles.profileButton}>
                    <Ionicons name="person-circle-outline" size={40} color="#E7F0E9" />
                  </TouchableOpacity>
                </View>

                {/* Simple Stats - Total Plants and Spaces only */}
                <View style={styles.statsContainer}>
                  <View style={styles.statItem}>
                    <Text style={styles.statValue}>{plants.length}</Text>
                    <Text style={styles.statLabel}>Total Plants</Text>
                  </View>
                  <View style={styles.statDivider} />
                  <View style={styles.statItem}>
                    <Text style={styles.statValue}>{spaces.length}</Text>
                    <Text style={styles.statLabel}>Spaces</Text>
                  </View>
                </View>
              </View>
            </LinearGradient>
          </Animated.View>

          <View style={styles.quickActions}>
            <Animated.View style={{ transform: [{ scale: duePlants.length > 0 ? actionButtonScale : 1 }] }}>
              <TouchableOpacity style={styles.actionButton} onPress={openWaterModal}>
                <LinearGradient
                  colors={duePlants.length > 0 ? ['#E8F5E9', '#C8E6C9'] : ['#FFFFFF', '#F8FAFC']}
                  style={styles.actionIcon}
                >
                  <Ionicons name="water-outline" size={24} color="#2E7D5E" />
                </LinearGradient>
                <Text style={styles.actionText}>Water</Text>
                {duePlants.length > 0 && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{duePlants.length}</Text>
                  </View>
                )}
              </TouchableOpacity>
            </Animated.View>

            <Animated.View style={{ transform: [{ scale: fertilizeDuePlants.length > 0 ? actionButtonScale : 1 }] }}>
              <TouchableOpacity style={styles.actionButton} onPress={openFertilizeModal}>
                <LinearGradient
                  colors={fertilizeDuePlants.length > 0 ? ['#E8EAF6', '#C5CAE9'] : ['#FFFFFF', '#F8FAFC']}
                  style={styles.actionIcon}
                >
                  <Ionicons name="flower-outline" size={24} color="#5C6BC0" />
                </LinearGradient>
                <Text style={styles.actionText}>Fertilize</Text>
                {fertilizeDuePlants.length > 0 && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{fertilizeDuePlants.length}</Text>
                  </View>
                )}
              </TouchableOpacity>
            </Animated.View>
          </View>

          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionTitle}>Your Spaces</Text>
              <Text style={styles.sectionSubtitle}>Manage your botanical zones</Text>
            </View>
            <TouchableOpacity onPress={() => router.push('/add-space')}>
              <Ionicons name="add-circle-outline" size={28} color="#2E7D5E" />
            </TouchableOpacity>
          </View>

          {spaces.map((space, index) => {
            // Compute thriving percentage for this space (recomputed on every render)
            const spacePlants = plants.filter((p) => p.spaceId === space.id);
            let thrivingPercentage = 0;
            
            if (spacePlants.length > 0) {
              const thrivingInSpace = spacePlants.filter(p => isPlantThriving(p)).length;
              thrivingPercentage = Math.round((thrivingInSpace / spacePlants.length) * 100);
            }

            const cardScale = cardAnimations[space.id] || new Animated.Value(1);

            return (
              <Link key={space.id} href={{ pathname: '/space/[id]', params: { id: space.id, name: space.name } }} asChild>
                <TouchableOpacity activeOpacity={0.7}>
                  <Animated.View style={{ transform: [{ scale: cardScale }] }}>
                    <LinearGradient colors={['#FFFFFF', '#F8FAFC']} style={styles.spaceCard}>
                      <View style={styles.spaceCardContent}>
                        <View style={[styles.spaceIconLarge, { backgroundColor: getLightConditionColor(space.lightCondition) + '20' }]}>
                          <Ionicons name="leaf" size={32} color={getLightConditionColor(space.lightCondition)} />
                        </View>

                        <View style={styles.spaceDetails}>
                          <View style={styles.spaceHeader}>
                            <Text style={styles.spaceName}>{space.name}</Text>
                            <TouchableOpacity
                              onPress={() => handleOpenMenu(space)}
                              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                              <Ionicons name="ellipsis-horizontal-circle" size={24} color="#94A3B8" />
                            </TouchableOpacity>
                          </View>

                          <View style={styles.spaceMeta}>
                            <View style={[styles.metaItem, { marginRight: 16 }]}>
                              <Ionicons name="sunny-outline" size={14} color="#64748B" />
                              <Text style={styles.metaText}>{space.lightCondition}</Text>
                            </View>
                            <View style={styles.metaItem}>
                              <Ionicons name="leaf-outline" size={14} color="#64748B" />
                              <Text style={styles.metaText}>{spacePlants.length} plants</Text>
                            </View>
                          </View>

                          {/* Progress Bar - updates immediately when plants change */}
                          <View style={styles.progressContainer}>
                            <View style={styles.progressBar}>
                              <View style={[styles.progressFill, { width: `${thrivingPercentage}%` }]} />
                            </View>
                            <Text style={styles.progressText}>
                              {thrivingPercentage}% thriving
                            </Text>
                          </View>
                        </View>
                      </View>
                    </LinearGradient>
                  </Animated.View>
                </TouchableOpacity>
              </Link>
            );
          })}

          <TouchableOpacity style={styles.retiredSection} onPress={() => router.push('/retired')}>
            <View style={styles.retiredContent}>
              <View style={styles.retiredIconContainer}>
                <Ionicons name="archive-outline" size={24} color="#94A3B8" />
              </View>
              <View style={{ marginLeft: 12 }}>
                <Text style={styles.retiredTitle}>Retired Plants</Text>
                <Text style={styles.retiredSub}>Archive of past growth</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#94A3B8" />
          </TouchableOpacity>

          <LinearGradient colors={['#2E7D5E', '#1B4D3E']} style={styles.tipCard}>
            <Ionicons name="bulb-outline" size={24} color="#FFE082" />
            <View style={[styles.tipContent, { marginLeft: 16 }]}>
              <Text style={styles.tipTitle}>Plant Care Tip</Text>
              <Text style={styles.tipText}>
                Water your succulents only when the soil is completely dry to prevent root rot.
              </Text>
            </View>
          </LinearGradient>
        </Animated.ScrollView>

        <Link href="/add-space" asChild>
          <TouchableOpacity style={[styles.fab, { bottom: insets.bottom + 20 }]}>
            <Animated.View style={{ transform: [{ scale: fabAnim }] }}>
              <LinearGradient colors={['#2E7D5E', '#1B4D3E']} style={styles.fabGradient}>
                <Ionicons name="add" size={32} color="#FFFFFF" />
              </LinearGradient>
            </Animated.View>
          </TouchableOpacity>
        </Link>
      </SafeAreaView>

      {/* Water Modal */}
      <Modal visible={waterModalVisible} transparent animationType="none">
        <Pressable style={styles.modalOverlay} onPress={() => setWaterModalVisible(false)}>
          <Animated.View style={[styles.modalBackground, { transform: [{ translateY: modalSlideAnim }] }]}>
            <BlurView intensity={90} tint="light" style={styles.modalBlur}>
              <View style={styles.modalContent}>
                <View style={styles.modalHandle} />
                <Text style={styles.modalTitle}>Water Plants</Text>
                <Text style={styles.modalSubtitle}>
                  Select plants you watered today ({duePlants.length} due)
                </Text>

                <FlatList
                  data={duePlants}
                  keyExtractor={(item) => item.id}
                  style={styles.plantList}
                  renderItem={({ item }) => (
                    <View style={styles.modalPlantItem}>
                      <TouchableOpacity style={styles.checkboxContainer} onPress={() => togglePlantSelection(item.id)}>
                        <View style={[styles.checkbox, selectedPlants.has(item.id) ? styles.checkboxChecked : null]}>
                          {selectedPlants.has(item.id) && <Ionicons name="checkmark" size={16} color="#FFFFFF" />}
                        </View>
                        <View style={styles.plantInfo}>
                          <Text style={styles.plantName}>{item.name}</Text>
                          <Text style={styles.plantSpace}>{getSpaceName(item.spaceId)}</Text>
                        </View>
                      </TouchableOpacity>
                      <View style={styles.actionButtons}>
                        <TouchableOpacity style={[styles.waterSingleButton, { marginRight: 8 }]} onPress={() => waterSinglePlant(item.id)}>
                          <Ionicons name="water" size={18} color="#2E7D5E" />
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.snoozeButton} onPress={() => snoozePlant(item.id, 2)}>
                          <Text style={styles.snoozeText}>Snooze 2d</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  )}
                  ListEmptyComponent={<Text style={styles.emptyText}>All plants are watered! 🌿</Text>}
                />

                <View style={styles.modalActions}>
                  <TouchableOpacity style={[styles.modalButton, styles.cancelButton, { marginRight: 12 }]} onPress={() => setWaterModalVisible(false)}>
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.modalButton, styles.doneButton]} onPress={logWatering}>
                    <LinearGradient colors={['#2E7D5E', '#1B4D3E']} style={styles.doneButtonGradient}>
                      <Text style={styles.doneButtonText}>Done</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              </View>
            </BlurView>
          </Animated.View>
        </Pressable>
      </Modal>

      {/* Fertilize Modal */}
      <Modal visible={fertilizeModalVisible} transparent animationType="none">
        <Pressable style={styles.modalOverlay} onPress={() => setFertilizeModalVisible(false)}>
          <Animated.View style={[styles.modalBackground, { transform: [{ translateY: modalSlideAnim }] }]}>
            <BlurView intensity={90} tint="light" style={styles.modalBlur}>
              <View style={styles.modalContent}>
                <View style={styles.modalHandle} />
                <Text style={styles.modalTitle}>Fertilize Plants</Text>
                
                <Text style={styles.modalSubtitle}>
                  Select plants to fertilize ({fertilizeDuePlants.length} due)
                </Text>
                <FlatList
                  data={fertilizeDuePlants}
                  keyExtractor={(item) => item.id}
                  style={styles.plantList}
                  renderItem={({ item }) => (
                    <View style={styles.modalPlantItem}>
                      <TouchableOpacity style={styles.checkboxContainer} onPress={() => toggleFertilizeSelection(item.id)}>
                        <View style={[styles.checkbox, selectedFertilizePlants.has(item.id) ? styles.checkboxChecked : null]}>
                          {selectedFertilizePlants.has(item.id) && <Ionicons name="checkmark" size={16} color="#FFFFFF" />}
                        </View>
                        <View style={styles.plantInfo}>
                          <Text style={styles.plantName}>{item.name}</Text>
                          <Text style={styles.plantSpace}>{getSpaceName(item.spaceId)}</Text>
                          {item.lastFertilized && (
                            <Text style={styles.lastFed}>
                              Last fed: {item.lastFertilized.toDate().toLocaleDateString()}
                            </Text>
                          )}
                        </View>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.fertilizeSingleButton} onPress={() => fertilizeSinglePlant(item.id)}>
                        <Ionicons name="flower" size={18} color="#5C6BC0" />
                      </TouchableOpacity>
                    </View>
                  )}
                  ListEmptyComponent={<Text style={styles.emptyText}>All plants are up to date! 🌱</Text>}
                />

                <View style={styles.modalActions}>
                  <TouchableOpacity style={[styles.modalButton, styles.cancelButton, { marginRight: 12 }]} onPress={() => setFertilizeModalVisible(false)}>
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.modalButton, styles.doneButton]} onPress={logFertilizing}>
                    <LinearGradient colors={['#2E7D5E', '#1B4D3E']} style={styles.doneButtonGradient}>
                      <Text style={styles.doneButtonText}>Done</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              </View>
            </BlurView>
          </Animated.View>
        </Pressable>
      </Modal>

      {/* Space Menu Modal */}
      <Modal visible={menuVisible} transparent animationType="none">
        <Pressable style={styles.modalOverlay} onPress={() => setMenuVisible(false)}>
          <Animated.View style={[styles.modalBackground, { transform: [{ translateY: modalSlideAnim }] }]}>
            <BlurView intensity={90} tint="light" style={styles.modalBlur}>
              <View style={styles.modalContent}>
                <View style={styles.modalHandle} />
                <View style={styles.modalHeader}>
                  <View style={[styles.spaceIconSmall, { backgroundColor: getLightConditionColor(selectedSpace?.lightCondition || '') + '20' }]}>
                    <Ionicons name="leaf" size={24} color={getLightConditionColor(selectedSpace?.lightCondition || '')} />
                  </View>
                  <Text style={styles.modalTitle}>{selectedSpace?.name}</Text>
                </View>

                <TouchableOpacity style={styles.modalOption} onPress={() => { setMenuVisible(false); router.push({ pathname: '/add-plant', params: { spaceId: selectedSpace?.id } }); }}>
                  <View style={[styles.optionIcon, { backgroundColor: '#E8F5E9' }]}>
                    <Ionicons name="add-circle-outline" size={24} color="#2E7D5E" />
                  </View>
                  <View style={styles.optionTextContainer}>
                    <Text style={styles.optionTitle}>Add New Plant</Text>
                    <Text style={styles.optionSubtitle}>Add a plant to this space</Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity style={styles.modalOption} onPress={() => { setMenuVisible(false); router.push({ pathname: '/edit-space', params: { id: selectedSpace?.id, name: selectedSpace?.name, light: selectedSpace?.lightCondition } }); }}>
                  <View style={[styles.optionIcon, { backgroundColor: '#E8EAF6' }]}>
                    <Ionicons name="settings-outline" size={24} color="#5C6BC0" />
                  </View>
                  <View style={styles.optionTextContainer}>
                    <Text style={styles.optionTitle}>Space Settings</Text>
                    <Text style={styles.optionSubtitle}>Edit space details</Text>
                  </View>
                </TouchableOpacity>
              </View>
            </BlurView>
          </Animated.View>
        </Pressable>
      </Modal>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  scrollContent: { paddingBottom: 100 },
  bgCircle1: {
    position: 'absolute',
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: 'rgba(46, 125, 94, 0.1)',
    top: -100,
    right: -100,
  },
  bgCircle2: {
    position: 'absolute',
    width: 250,
    height: 250,
    borderRadius: 125,
    backgroundColor: 'rgba(27, 77, 62, 0.1)',
    bottom: -50,
    left: -100,
  },
  bgCircle3: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(165, 214, 167, 0.2)',
    top: '40%',
    right: -50,
  },
  floatingLeaf1: {
    position: 'absolute',
    top: 100,
    right: 30,
    zIndex: 10,
  },
  floatingLeaf2: {
    position: 'absolute',
    bottom: 150,
    left: 20,
    zIndex: 10,
  },
  floatingLeaf3: {
    position: 'absolute',
    top: '60%',
    right: 50,
    zIndex: 10,
  },
  leafEmoji: {
    fontSize: 24,
    opacity: 0.3,
  },
  headerGradient: {
    paddingTop: 60,
    paddingBottom: 30,
    paddingHorizontal: 24,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  headerContent: {},
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  brandTitle: {
    fontSize: 28,
    fontWeight: '300',
    color: '#E7F0E9',
    letterSpacing: 2,
    textTransform: 'lowercase',
    fontFamily: Platform.OS === 'ios' ? 'Didot' : 'serif',
  },
  greeting: { fontSize: 16, color: '#A8C5B5', marginTop: 4 },
  profileButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 20,
    padding: 16,
    alignItems: 'center',
  },
  statItem: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 32, fontWeight: '700', color: '#FFFFFF' },
  statLabel: { fontSize: 13, color: '#A8C5B5', marginTop: 4 },
  statDivider: { width: 1, height: 30, backgroundColor: 'rgba(255,255,255,0.2)' },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 24,
    marginTop: -20,
    marginBottom: 30,
  },
  actionButton: {
    alignItems: 'center',
    position: 'relative',
  },
  actionIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  actionText: { fontSize: 12, fontWeight: '600', color: '#334155', marginTop: 8 },
  badge: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: '#DC2626',
    borderRadius: 12,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  badgeText: { color: '#FFFFFF', fontSize: 10, fontWeight: 'bold' },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    marginBottom: 16,
  },
  sectionTitle: { fontSize: 20, fontWeight: '700', color: '#1E293B' },
  sectionSubtitle: { fontSize: 14, color: '#64748B', marginTop: 2 },
  seeAllText: { fontSize: 14, fontWeight: '600', color: '#2E7D5E' },
  spaceCard: {
    marginHorizontal: 24,
    marginBottom: 16,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  spaceCardContent: { flexDirection: 'row', padding: 16 },
  spaceIconLarge: {
    width: 70,
    height: 70,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  spaceDetails: { flex: 1 },
  spaceHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  spaceName: { fontSize: 18, fontWeight: '700', color: '#1E293B' },
  spaceMeta: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  metaItem: { flexDirection: 'row', alignItems: 'center' },
  metaText: { fontSize: 13, color: '#64748B', marginLeft: 4 },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  progressBar: { flex: 1, height: 6, backgroundColor: '#E2E8F0', borderRadius: 3 },
  progressFill: { height: 6, backgroundColor: '#2E7D5E', borderRadius: 3 },
  progressText: { fontSize: 12, color: '#64748B', marginLeft: 10, minWidth: 70 },
  retiredSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 24,
    marginTop: 8,
    marginBottom: 20,
    padding: 16,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 2,
  },
  retiredContent: { flexDirection: 'row', alignItems: 'center' },
  retiredIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  retiredTitle: { fontSize: 16, fontWeight: '600', color: '#1E293B' },
  retiredSub: { fontSize: 13, color: '#64748B', marginTop: 2 },
  tipCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 24,
    marginTop: 8,
    marginBottom: 20,
    padding: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  tipContent: { flex: 1 },
  tipTitle: { fontSize: 14, fontWeight: '600', color: '#FFE082', marginBottom: 4 },
  tipText: { fontSize: 13, color: '#E7F0E9', lineHeight: 18 },
  fab: {
    position: 'absolute',
    right: 25,
    width: 64,
    height: 64,
    borderRadius: 32,
    shadowColor: '#2E7D5E',
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
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' },
  modalBackground: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalBlur: {
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    overflow: 'hidden',
  },
  modalContent: {
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    padding: 24,
    paddingBottom: 40,
    maxHeight: height * 0.8,
  },
  modalHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#E2E8F0',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },
  modalTitle: { fontSize: 20, fontWeight: '700', color: '#1E293B', marginBottom: 4 },
  modalSubtitle: { fontSize: 14, color: '#64748B', marginBottom: 16 },
  plantList: { maxHeight: 300 },
  modalPlantItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  checkboxContainer: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#94A3B8',
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: { backgroundColor: '#2E7D5E', borderColor: '#2E7D5E' },
  plantInfo: { flex: 1 },
  plantName: { fontSize: 16, fontWeight: '600', color: '#1E293B' },
  plantSpace: { fontSize: 13, color: '#64748B' },
  lastFed: { fontSize: 12, color: '#94A3B8', marginTop: 2 },
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  waterSingleButton: {
    padding: 6,
    backgroundColor: '#E8F5E9',
    borderRadius: 20,
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  snoozeButton: { paddingHorizontal: 8, paddingVertical: 4, backgroundColor: '#F1F5F9', borderRadius: 12 },
  snoozeText: { fontSize: 12, fontWeight: '600', color: '#2E7D5E' },
  fertilizeSingleButton: {
    padding: 6,
    backgroundColor: '#E8EAF6',
    borderRadius: 20,
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  modalButton: { flex: 1, borderRadius: 30, overflow: 'hidden' },
  cancelButton: { backgroundColor: '#F1F5F9', paddingVertical: 14, alignItems: 'center' },
  cancelButtonText: { color: '#64748B', fontWeight: '600' },
  doneButton: { elevation: 2 },
  doneButtonGradient: { paddingVertical: 14, alignItems: 'center' },
  doneButtonText: { color: '#FFFFFF', fontWeight: '600' },
  emptyText: { textAlign: 'center', color: '#94A3B8', padding: 20 },
  seasonMessage: {
    alignItems: 'center',
    padding: 30,
  },
  messageTitle: { fontSize: 18, fontWeight: '700', color: '#1E293B' },
  messageText: { fontSize: 14, color: '#64748B', textAlign: 'center' },
  spaceIconSmall: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  modalHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 24 },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  optionIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  optionTextContainer: { flex: 1 },
  optionTitle: { fontSize: 16, fontWeight: '600', color: '#1E293B', marginBottom: 2 },
  optionSubtitle: { fontSize: 13, color: '#64748B' },
});