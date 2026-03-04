import React, { useEffect, useState, useCallback, useRef } from 'react';
import { 
  View, Text, StyleSheet, ScrollView, TouchableOpacity, 
  TextInput, Alert, Animated, Easing, Dimensions, StatusBar, Modal, Pressable, FlatList
} from 'react-native';
import { useLocalSearchParams, useRouter, Link } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { db, auth } from '../../firebaseConfig';
import { collection, query, where, onSnapshot, doc, updateDoc, Timestamp, getDocs } from 'firebase/firestore';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Notifications from 'expo-notifications';
import { BlurView } from 'expo-blur';

const { width, height } = Dimensions.get('window');

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

interface Space {
  id: string;
  name: string;
  lightCondition?: string;
}

export default function SpaceDetail() {
  const { id, name } = useLocalSearchParams<{ id: string; name: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [plants, setPlants] = useState<Plant[]>([]);
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [layout, setLayout] = useState<'Compact' | 'Detailed'>('Compact');
  const [search, setSearch] = useState('');
  
  // Menu states
  const [spaceMenuVisible, setSpaceMenuVisible] = useState(false);
  const [plantMenuVisible, setPlantMenuVisible] = useState(false);
  const [transferModalVisible, setTransferModalVisible] = useState(false);
  const [selectedPlant, setSelectedPlant] = useState<Plant | null>(null);
  const [availableSpaces, setAvailableSpaces] = useState<Space[]>([]);

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const headerFloatAnim = useRef(new Animated.Value(0)).current;
  const searchScale = useRef(new Animated.Value(1)).current;
  const fabAnim = useRef(new Animated.Value(0)).current;
  
  // Background animation values
  const floatAnim1 = useRef(new Animated.Value(0)).current;
  const floatAnim2 = useRef(new Animated.Value(0)).current;
  const floatAnim3 = useRef(new Animated.Value(0)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(0)).current;
  
  // Particle animations
  const particleAnims = useRef<Animated.Value[]>([]).current;
  const particleCount = 4;

  useEffect(() => {
    // Initialize particle animations
    for (let i = 0; i < particleCount; i++) {
      particleAnims[i] = new Animated.Value(0);
    }

    // Entrance animations
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
        easing: Easing.out(Easing.cubic),
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
      Animated.timing(headerFloatAnim, {
        toValue: 1,
        duration: 2000,
        useNativeDriver: true,
        easing: Easing.inOut(Easing.sin),
      }),
      Animated.spring(fabAnim, {
        toValue: 1,
        tension: 40,
        friction: 5,
        useNativeDriver: true,
        delay: 400,
      }),
    ]).start();

    // Background floating animations
    Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim1, {
          toValue: 1,
          duration: 3000,
          useNativeDriver: true,
          easing: Easing.inOut(Easing.sin),
        }),
        Animated.timing(floatAnim1, {
          toValue: 0,
          duration: 3000,
          useNativeDriver: true,
          easing: Easing.inOut(Easing.sin),
        }),
      ])
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim2, {
          toValue: 1,
          duration: 4000,
          useNativeDriver: true,
          easing: Easing.inOut(Easing.sin),
        }),
        Animated.timing(floatAnim2, {
          toValue: 0,
          duration: 4000,
          useNativeDriver: true,
          easing: Easing.inOut(Easing.sin),
        }),
      ])
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim3, {
          toValue: 1,
          duration: 5000,
          useNativeDriver: true,
          easing: Easing.inOut(Easing.sin),
        }),
        Animated.timing(floatAnim3, {
          toValue: 0,
          duration: 5000,
          useNativeDriver: true,
          easing: Easing.inOut(Easing.sin),
        }),
      ])
    ).start();

    // Rotation animation
    Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 20000,
        useNativeDriver: true,
        easing: Easing.linear,
      })
    ).start();

    // Pulse animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
          easing: Easing.inOut(Easing.sin),
        }),
        Animated.timing(pulseAnim, {
          toValue: 0,
          duration: 2000,
          useNativeDriver: true,
          easing: Easing.inOut(Easing.sin),
        }),
      ])
    ).start();

    // Particle animations
    particleAnims.forEach((anim, index) => {
      Animated.loop(
        Animated.sequence([
          Animated.delay(index * 800),
          Animated.timing(anim, {
            toValue: 1,
            duration: 4000 + index * 500,
            useNativeDriver: true,
            easing: Easing.inOut(Easing.sin),
          }),
          Animated.timing(anim, {
            toValue: 0,
            duration: 4000 + index * 500,
            useNativeDriver: true,
            easing: Easing.inOut(Easing.sin),
          }),
        ])
      ).start();
    });

    const user = auth.currentUser;
    if (!user || !id) return;

    // Fetch spaces for transfer options
    const spacesQuery = query(
      collection(db, "spaces"),
      where("userId", "==", user.uid)
    );
    const unsubSpaces = onSnapshot(spacesQuery, (snapshot) => {
      const spaceList = snapshot.docs.map(doc => ({
        id: doc.id,
        name: doc.data().name,
        lightCondition: doc.data().lightCondition
      })) as Space[];
      setSpaces(spaceList);
      setAvailableSpaces(spaceList.filter(s => s.id !== id));
    });

    const q = query(
      collection(db, "plants"),
      where("userId", "==", user.uid),
      where("spaceId", "==", id),
      where("status", "!=", "retired")
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

    return () => {
      unsubSpaces();
      unsubscribe();
    };
  }, [id]);

  const filteredPlants = plants.filter(plant =>
    plant.name?.toLowerCase().includes(search.toLowerCase())
  );

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

  // ----- HANDLE TRANSFER PLANT -----
  const handleTransferPlant = async (targetSpaceId: string) => {
    if (!selectedPlant) return;
    
    try {
      const targetSpace = spaces.find(s => s.id === targetSpaceId);
      const plantRef = doc(db, "plants", selectedPlant.id);
      await updateDoc(plantRef, {
        spaceId: targetSpaceId
      });
      
      setTransferModalVisible(false);
      setPlantMenuVisible(false);
      Alert.alert(
        "✅ Plant Transferred", 
        `${selectedPlant.name} has been moved to ${targetSpace?.name || 'another space'}.`
      );
    } catch (error) {
      console.error("Error transferring plant:", error);
      Alert.alert("Error", "Could not transfer plant");
    }
  };

  // ----- HANDLE PLANT MENU -----
  const openPlantMenu = (plant: Plant, e: any) => {
    e.stopPropagation();
    setSelectedPlant(plant);
    setPlantMenuVisible(true);
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

  // Animation interpolations
  const headerFloat = headerFloatAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -5],
  });

  const float1 = floatAnim1.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 15],
  });

  const float2 = floatAnim2.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -15],
  });

  const float3 = floatAnim3.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 20],
  });

  const rotate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const pulse = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.2, 0.5],
  });

  // Space menu options handlers
  const handleEditSpace = () => {
    setSpaceMenuVisible(false);
    router.push({ pathname: '/edit-space', params: { id, name } });
  };

  const handleWaterAll = () => {
    setSpaceMenuVisible(false);
    Alert.alert(
      "Water All Plants",
      `Water all ${plants.length} plants in ${name}?`,
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Water All", 
          onPress: () => {
            plants.forEach(plant => handleWaterPlant(plant));
            Alert.alert("Success", `All plants in ${name} have been watered!`);
          }
        }
      ]
    );
  };

  const handleSpaceStats = () => {
    setSpaceMenuVisible(false);
    const wateredToday = plants.filter(p => {
      if (!p.lastWatered) return false;
      const lastWatered = p.lastWatered instanceof Timestamp ? p.lastWatered.toDate() : new Date(p.lastWatered);
      const today = new Date();
      return lastWatered.toDateString() === today.toDateString();
    }).length;

    Alert.alert(
      "Space Statistics",
      `${name}\n\n` +
      `Total Plants: ${plants.length}\n` +
      `Watered Today: ${wateredToday}\n` +
      `Need Water: ${plants.filter(p => !p.lastWatered).length}\n` +
      `Completion: ${Math.round((wateredToday / plants.length) * 100 || 0)}%`
    );
  };

  const handleDeleteSpace = () => {
    setSpaceMenuVisible(false);
    Alert.alert(
      "Delete Space",
      `Are you sure you want to delete "${name}"? This will not delete the plants inside.`,
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Delete", 
          style: "destructive",
          onPress: () => {
            // Implement space deletion logic here
            Alert.alert("Success", `${name} has been deleted.`);
            router.back();
          }
        }
      ]
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      
      {/* Animated Background Elements */}
      <Animated.View style={[styles.bgCircle1, { transform: [{ translateY: float1 }, { rotate }] }]} />
      <Animated.View style={[styles.bgCircle2, { transform: [{ translateY: float2 }, { scale: pulse }] }]} />
      <Animated.View style={[styles.bgCircle3, { transform: [{ translateY: float3 }, { rotate }] }]} />
      
      {/* Animated Particles */}
      {particleAnims.map((anim, index) => {
        const particleX = anim.interpolate({
          inputRange: [0, 1],
          outputRange: [index * 40, width + index * 40],
        });
        const particleY = anim.interpolate({
          inputRange: [0, 0.5, 1],
          outputRange: [height * 0.3, height * 0.4, height * 0.3],
        });
        const particleScale = anim.interpolate({
          inputRange: [0, 0.5, 1],
          outputRange: [0.2, 0.6, 0.2],
        });
        
        return (
          <Animated.View
            key={index}
            style={[
              styles.particle,
              {
                transform: [
                  { translateX: particleX },
                  { translateY: particleY },
                  { scale: particleScale },
                ],
                opacity: anim.interpolate({
                  inputRange: [0, 0.5, 1],
                  outputRange: [0, 0.2, 0],
                }),
              },
            ]}
          />
        );
      })}

      <LinearGradient
        colors={['rgba(46, 125, 94, 0.05)', 'rgba(27, 77, 62, 0.02)']}
        style={StyleSheet.absoluteFill}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 100 }]}
      >
        {/* Header with Gradient */}
        <Animated.View style={{ transform: [{ translateY: headerFloat }] }}>
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
                {/* Three-dot menu button */}
                <TouchableOpacity 
                  style={styles.iconButton}
                  onPress={() => setSpaceMenuVisible(true)}
                >
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
        </Animated.View>

        <View style={styles.content}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Your Plants</Text>
            <TouchableOpacity>
              <Text style={styles.seeAllText}>See All</Text>
            </TouchableOpacity>
          </View>

          {/* Layout Toggle & Search */}
          <View style={styles.controlsRow}>
            <Animated.View style={[styles.pillContainer, { opacity: fadeAnim }]}>
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
            </Animated.View>

            <Animated.View 
              style={[
                styles.searchContainer,
                {
                  transform: [{ scale: searchScale }],
                  opacity: fadeAnim,
                }
              ]}
            >
              <Ionicons name="search-outline" size={20} color="#94A3B8" />
              <TextInput
                placeholder="Search plants"
                placeholderTextColor="#94A3B8"
                style={styles.searchInput}
                value={search}
                onChangeText={setSearch}
                onFocus={() => {
                  Animated.spring(searchScale, {
                    toValue: 1.02,
                    tension: 40,
                    friction: 7,
                    useNativeDriver: true,
                  }).start();
                }}
                onBlur={() => {
                  Animated.spring(searchScale, {
                    toValue: 1,
                    tension: 40,
                    friction: 7,
                    useNativeDriver: true,
                  }).start();
                }}
              />
              {search !== '' && (
                <TouchableOpacity onPress={() => setSearch('')}>
                  <Ionicons name="close-circle" size={20} color="#94A3B8" />
                </TouchableOpacity>
              )}
            </Animated.View>
          </View>

          {/* Plant Cards */}
          {filteredPlants.length === 0 ? (
            <Animated.View style={[styles.emptyState, { opacity: fadeAnim }]}>
              <View style={styles.emptyIconContainer}>
                <Ionicons name="leaf-outline" size={48} color="#2E7D5E" />
              </View>
              <Text style={styles.emptyTitle}>No plants found</Text>
              <Text style={styles.emptyText}>
                {search ? 'Try a different search term' : 'Add your first plant to this space'}
              </Text>
            </Animated.View>
          ) : (
            filteredPlants.map((plant, index) => (
              <Animated.View
                key={plant.id}
                style={{
                  opacity: fadeAnim,
                  transform: [{
                    translateY: slideAnim.interpolate({
                      inputRange: [0, 50],
                      outputRange: [index * 10, 50],
                    }),
                  }],
                }}
              >
                <Link href={{ pathname: "/plant/[id]", params: { id: plant.id } }} asChild>
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
                            <View style={styles.plantActions}>
                              <TouchableOpacity
                                style={styles.waterButton}
                                onPress={(e) => {
                                  e.stopPropagation();
                                  handleWaterPlant(plant);
                                }}
                              >
                                <LinearGradient
                                  colors={['#4A90E2', '#357ABD']}
                                  style={styles.waterButtonGradient}
                                >
                                  <Ionicons name="water" size={18} color="#FFFFFF" />
                                </LinearGradient>
                              </TouchableOpacity>
                              
                              {/* Three-dot menu for each plant */}
                              <TouchableOpacity
                                style={styles.plantMenuButton}
                                onPress={(e) => openPlantMenu(plant, e)}
                              >
                                <Ionicons name="ellipsis-horizontal-circle" size={24} color="#94A3B8" />
                              </TouchableOpacity>
                            </View>
                          </View>

                          {/* Tasks Section */}
                          {layout === 'Compact' ? (
                            <View style={styles.iconRow}>
                              {plant.tasks && plant.tasks.length > 0 ? (
                                plant.tasks.map((task) => (
                                  <View key={`${plant.id}-${task}`} style={styles.taskIconWrapper}>
                                    {getTaskIcon(task, 16, "#2E7D5E")}
                                  </View>
                                ))
                              ) : (
                                <>
                                  <View style={styles.taskIconWrapper}>
                                    <Ionicons name="water" size={16} color="#2D4B2D" />
                                  </View>
                                  <View style={styles.taskIconWrapper}>
                                    <MaterialCommunityIcons name="food-apple" size={16} color="#2D4B2D" />
                                  </View>
                                  <View style={styles.taskIconWrapper}>
                                    <Ionicons name="cloud" size={16} color="#2D4B2D" />
                                  </View>
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
                                  <View style={styles.logRow}>
                                    <Ionicons name="water" size={14} color="#1A3C1A" />
                                    <Text style={styles.logLabel}>
                                      Water: <Text style={styles.logStatus}>{formatDate(plant.lastWatered)}</Text>
                                    </Text>
                                  </View>
                                  <View style={styles.logRow}>
                                    <MaterialCommunityIcons name="food-apple" size={14} color="#1A3C1A" />
                                    <Text style={styles.logLabel}>
                                      Feed: <Text style={styles.logStatus}>{formatDate(plant.lastFeed)}</Text>
                                    </Text>
                                  </View>
                                  <View style={styles.logRow}>
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
              </Animated.View>
            ))
          )}
        </View>
      </ScrollView>

      {/* Floating Action Button */}
      <Animated.View
        style={[
          styles.fab,
          {
            bottom: insets.bottom + 20,
            transform: [
              {
                scale: fabAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, 1],
                }),
              },
            ],
            opacity: fabAnim,
          },
        ]}
      >
        <TouchableOpacity
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
      </Animated.View>

      {/* Space Menu Modal */}
      <Modal visible={spaceMenuVisible} transparent animationType="slide">
        <Pressable style={styles.modalOverlay} onPress={() => setSpaceMenuVisible(false)}>
          <BlurView intensity={50} tint="light" style={styles.modalBlur}>
            <View style={styles.modalContent}>
              <View style={styles.modalHandle} />
              <Text style={styles.modalTitle}>Space Options</Text>
              
              <TouchableOpacity 
                style={styles.modalOption}
                onPress={handleEditSpace}
              >
                <View style={[styles.optionIcon, { backgroundColor: '#E8F5E9' }]}>
                  <Ionicons name="create-outline" size={22} color="#2E7D5E" />
                </View>
                <View style={styles.optionTextContainer}>
                  <Text style={styles.optionTitle}>Edit Space</Text>
                  <Text style={styles.optionSubtitle}>Rename or update light conditions</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.modalOption}
                onPress={handleWaterAll}
              >
                <View style={[styles.optionIcon, { backgroundColor: '#E8F5E9' }]}>
                  <Ionicons name="water" size={22} color="#4A90E2" />
                </View>
                <View style={styles.optionTextContainer}>
                  <Text style={styles.optionTitle}>Water All Plants</Text>
                  <Text style={styles.optionSubtitle}>Water every plant in this space</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.modalOption}
                onPress={handleSpaceStats}
              >
                <View style={[styles.optionIcon, { backgroundColor: '#E8F5E9' }]}>
                  <Ionicons name="stats-chart" size={22} color="#F59E0B" />
                </View>
                <View style={styles.optionTextContainer}>
                  <Text style={styles.optionTitle}>Space Statistics</Text>
                  <Text style={styles.optionSubtitle}>View care progress and metrics</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.modalOption, styles.deleteOption]}
                onPress={handleDeleteSpace}
              >
                <View style={[styles.optionIcon, { backgroundColor: '#FFEBEE' }]}>
                  <Ionicons name="trash-outline" size={22} color="#DC2626" />
                </View>
                <View style={styles.optionTextContainer}>
                  <Text style={[styles.optionTitle, { color: '#DC2626' }]}>Delete Space</Text>
                  <Text style={[styles.optionSubtitle, { color: '#EF4444' }]}>Remove this space (plants kept)</Text>
                </View>
              </TouchableOpacity>
            </View>
          </BlurView>
        </Pressable>
      </Modal>

      {/* Plant Menu Modal */}
      {/* Plant Menu Modal */}
<Modal visible={plantMenuVisible} transparent animationType="slide">
  <Pressable style={styles.modalOverlay} onPress={() => setPlantMenuVisible(false)}>
    <BlurView intensity={50} tint="light" style={styles.modalBlur}>
      <View style={styles.modalContent}>
        <View style={styles.modalHandle} />
        <Text style={styles.modalTitle}>{selectedPlant?.name || 'Plant Options'}</Text>
        
        <TouchableOpacity 
          style={styles.modalOption}
          onPress={() => {
            setPlantMenuVisible(false);
            if (selectedPlant && selectedPlant.id) {
              router.push({ 
                pathname: "/plant/[id]", 
                params: { id: selectedPlant.id } 
              });
            }
          }}
        >
          <View style={[styles.optionIcon, { backgroundColor: '#E8F5E9' }]}>
            <Ionicons name="eye-outline" size={22} color="#2E7D5E" />
          </View>
          <View style={styles.optionTextContainer}>
            <Text style={styles.optionTitle}>View Details</Text>
            <Text style={styles.optionSubtitle}>See complete plant information</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.modalOption}
          onPress={() => {
            setPlantMenuVisible(false);
            if (selectedPlant && selectedPlant.id) {
              router.push({ 
                pathname: "/plant/edit/[id]", 
                params: { id: selectedPlant.id } 
              });
            }
          }}
        >
          <View style={[styles.optionIcon, { backgroundColor: '#E8EAF6' }]}>
            <Ionicons name="create-outline" size={22} color="#5C6BC0" />
          </View>
          <View style={styles.optionTextContainer}>
            <Text style={styles.optionTitle}>Edit Plant</Text>
            <Text style={styles.optionSubtitle}>Update plant details</Text>
          </View>
        </TouchableOpacity>

        {/* TRANSFER PLANT OPTION */}
        <TouchableOpacity 
          style={styles.modalOption}
          onPress={() => {
            setPlantMenuVisible(false);
            if (selectedPlant && selectedPlant.id) {
              setTransferModalVisible(true);
            }
          }}
        >
          <View style={[styles.optionIcon, { backgroundColor: '#E8F5E9' }]}>
            <Ionicons name="swap-horizontal" size={22} color="#F59E0B" />
          </View>
          <View style={styles.optionTextContainer}>
            <Text style={styles.optionTitle}>Transfer Plant</Text>
            <Text style={styles.optionSubtitle}>Move to another space</Text>
          </View>
        </TouchableOpacity>
      </View>
    </BlurView>
  </Pressable>
</Modal>

      {/* Transfer Plant Modal */}
      <Modal visible={transferModalVisible} transparent animationType="slide">
        <Pressable style={styles.modalOverlay} onPress={() => setTransferModalVisible(false)}>
          <BlurView intensity={50} tint="light" style={styles.modalBlur}>
            <View style={styles.modalContent}>
              <View style={styles.modalHandle} />
              <Text style={styles.modalTitle}>Transfer {selectedPlant?.name}</Text>
              <Text style={styles.modalSubtitle}>Choose a destination space</Text>

              {availableSpaces.length === 0 ? (
                <View style={styles.emptySpaces}>
                  <Ionicons name="folder-open-outline" size={48} color="#94A3B8" />
                  <Text style={styles.emptySpacesText}>No other spaces available</Text>
                  <Text style={styles.emptySpacesSubtext}>Create a new space first</Text>
                </View>
              ) : (
                <FlatList
                  data={availableSpaces}
                  keyExtractor={(item) => item.id}
                  style={styles.spacesList}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={styles.spaceItem}
                      onPress={() => handleTransferPlant(item.id)}
                    >
                      <View style={[styles.spaceIcon, { backgroundColor: '#E8F5E9' }]}>
                        <Ionicons name="leaf" size={24} color="#2E7D5E" />
                      </View>
                      <View style={styles.spaceItemInfo}>
                        <Text style={styles.spaceItemName}>{item.name}</Text>
                        <Text style={styles.spaceItemDetail}>
                          {item.lightCondition || 'No light condition set'}
                        </Text>
                      </View>
                      <Ionicons name="chevron-forward" size={20} color="#94A3B8" />
                    </TouchableOpacity>
                  )}
                />
              )}

              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setTransferModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </BlurView>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#a2c9abff' 
  },
  // Background elements
  bgCircle1: {
    position: 'absolute',
    width: 250,
    height: 250,
    borderRadius: 125,
    backgroundColor: 'rgba(46, 125, 94, 0.03)',
    top: -100,
    right: -100,
  },
  bgCircle2: {
    position: 'absolute',
    width: 350,
    height: 350,
    borderRadius: 175,
    backgroundColor: 'rgba(27, 77, 62, 0.03)',
    bottom: -150,
    left: -150,
  },
  bgCircle3: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(165, 214, 167, 0.05)',
    top: '20%',
    right: -50,
  },
  particle: {
    position: 'absolute',
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: '#2E7D5E',
    opacity: 0.2,
  },
  scrollContent: { 
    paddingBottom: 20 
  },
  headerGradient: {
    paddingTop: 60,
    paddingBottom: 30,
    paddingHorizontal: 24,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  headerContent: { 
    gap: 16 
  },
  topActions: { 
    flexDirection: 'row', 
    justifyContent: 'space-between' 
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
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
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
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
    shadowColor: '#2E7D5E',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
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
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
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
    shadowColor: '#2E7D5E',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
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
  plantActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  waterButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    overflow: 'hidden',
    shadowColor: '#4A90E2',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  waterButtonGradient: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  plantMenuButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconRow: {
    flexDirection: 'row',
    marginTop: 8,
    gap: 8,
  },
  taskIconWrapper: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  miniIcon: {
    opacity: 0.8,
  },
  logContainer: {
    marginTop: 8,
    gap: 6,
  },
  logRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'flex-start',
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
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalBlur: {
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    overflow: 'hidden',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
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
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 4,
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#64748B',
    marginBottom: 20,
    textAlign: 'center',
  },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  deleteOption: {
    borderBottomWidth: 0,
  },
  optionIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  optionTextContainer: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 2,
  },
  optionSubtitle: {
    fontSize: 13,
    color: '#64748B',
  },
  // Transfer modal specific styles
  spacesList: {
    maxHeight: 300,
    marginBottom: 16,
  },
  spaceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  spaceIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  spaceItemInfo: {
    flex: 1,
  },
  spaceItemName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 2,
  },
  spaceItemDetail: {
    fontSize: 13,
    color: '#64748B',
  },
  emptySpaces: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptySpacesText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
    marginTop: 12,
  },
  emptySpacesSubtext: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 4,
  },
  cancelButton: {
    backgroundColor: '#F1F5F9',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#64748B',
  },
});