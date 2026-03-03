import React, { useEffect, useState, useRef } from 'react';
import { 
  View, Text, StyleSheet, SafeAreaView, TouchableOpacity, 
  ScrollView, Alert, Modal, Pressable, Animated, Easing, 
  Dimensions, StatusBar, Platform, LayoutChangeEvent 
} from 'react-native';
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
import { BlurView } from 'expo-blur';

const { width, height } = Dimensions.get('window');

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

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const headerFloatAnim = useRef(new Animated.Value(0)).current;
  const tabIndicatorAnim = useRef(new Animated.Value(0)).current;
  
  // Background animation values
  const floatAnim1 = useRef(new Animated.Value(0)).current;
  const floatAnim2 = useRef(new Animated.Value(0)).current;
  const floatAnim3 = useRef(new Animated.Value(0)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(0)).current;
  
  // Leaf animation values
  const leaf1Anim = useRef(new Animated.Value(0)).current;
  const leaf2Anim = useRef(new Animated.Value(0)).current;
  const leaf3Anim = useRef(new Animated.Value(0)).current;
  
  // Card animation refs
  const cardAnims = useRef<{ [key: string]: Animated.Value }>({}).current;
  
  // Particle animations
  const particleAnims = useRef<Animated.Value[]>([]).current;
  const particleCount = 4;

  // Tab indicator measurements
  const [tabWidths, setTabWidths] = useState({ Care: 0, History: 0 });
  const [tabIndicatorWidth, setTabIndicatorWidth] = useState(120);

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
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
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

    // Leaf animations
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

  // Animate tab indicator when active tab changes
  useEffect(() => {
    // Calculate target position based on active tab
    const targetValue = activeTab === 'Care' ? 0 : tabWidths.Care + 24; // 24 is the gap between tabs
    Animated.spring(tabIndicatorAnim, {
      toValue: targetValue,
      tension: 50,
      friction: 7,
      useNativeDriver: true,
    }).start();
  }, [activeTab, tabWidths]);

  // Listen to plant document
  useEffect(() => {
    if (!id) return;
    const unsub = onSnapshot(doc(db, "plants", id), (docSnap) => {
      if (docSnap.exists()) {
        setPlant({ id: docSnap.id, ...docSnap.data() } as PlantData);
      }
    });
    return () => unsub();
  }, [id]);

  // Fetch history when tab changes or plant loads
  useEffect(() => {
    if (id) {
      fetchTaskHistory();
    }
  }, [id, activeTab]); // Re-fetch when tab changes to History

  // Animate cards when they appear
  useEffect(() => {
    if (plant?.tasks) {
      plant.tasks.forEach((action, index) => {
        if (!cardAnims[action]) {
          cardAnims[action] = new Animated.Value(0);
          Animated.sequence([
            Animated.delay(index * 100),
            Animated.spring(cardAnims[action], {
              toValue: 1,
              friction: 8,
              tension: 40,
              useNativeDriver: true,
            }),
          ]).start();
        }
      });
    }
  }, [plant?.tasks]);

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
      // Refresh history after logging
      fetchTaskHistory();
    } catch (error) {
      console.error(`Error logging ${action}:`, error);
    }
  };

  const getSpaceName = (spaceId?: string): string => {
    if (!spaceId) return 'No Space';
    const space = spaces.find(s => s.id === spaceId);
    return space?.name || 'Unknown Space';
  };

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

  const getNextDue = (action: string): string => {
    if (!plant) return 'No schedule';
    
    const schedule = plant.schedules?.[action];
    if (!schedule) return 'No schedule';
    
    const lastField = ACTION_CONFIG[action]?.field;
    const last = lastField ? plant[lastField] as Timestamp : undefined;
    
    if (!last) return 'Set first date';
    
    const lastDate = last.toDate();
    
    const nextDate = new Date(lastDate);
    nextDate.setDate(lastDate.getDate() + schedule.frequency);
    nextDate.setHours(schedule.hour, schedule.minute, 0, 0);
    
    return getTimeRemaining(nextDate);
  };

  const scheduleActionReminder = async (action: string, plantId: string, plantName: string, dueDate: Date): Promise<void> => {
    const baseId = `plant-${action.toLowerCase()}-${plantId}`;
    
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    const toCancel = scheduled
      .filter(notif => notif.identifier.startsWith(baseId))
      .map(notif => Notifications.cancelScheduledNotificationAsync(notif.identifier));
    
    await Promise.all(toCancel);

    const now = new Date();
    const actionLabel = ACTION_CONFIG[action]?.label.toLowerCase() || action.toLowerCase();
    
    const notifications = [];
    
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
        
        await updateDoc(plantRef, updateData);
        
        scheduleActionReminder(action, id, plant.name, nextDate)
          .catch(err => console.error("Background notification error:", err));
        
      } else {
        updateData[config.field] = Timestamp.fromDate(now);
        await updateDoc(plantRef, updateData);
        
        const schedule = plant.schedules?.[action];
        if (schedule) {
          const nextDate = new Date(now);
          nextDate.setDate(now.getDate() + schedule.frequency);
          nextDate.setHours(schedule.hour, schedule.minute, 0, 0);
          
          scheduleActionReminder(action, id, plant.name, nextDate)
            .catch(err => console.error("Background notification error:", err));
        }
      }
      
      await logTaskAction(action);
      
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
              const baseId = `plant-water-${id}`;
              const scheduled = await Notifications.getAllScheduledNotificationsAsync();
              for (const notif of scheduled) {
                if (notif.identifier.startsWith(baseId)) {
                  await Notifications.cancelScheduledNotificationAsync(notif.identifier);
                }
              }

              const plantRef = doc(db, "plants", id);
              await updateDoc(plantRef, { status: 'retired' });
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

  // Handle tab layout measurement
  const onCareTabLayout = (event: LayoutChangeEvent) => {
    const { width } = event.nativeEvent.layout;
    setTabWidths(prev => ({ ...prev, Care: width }));
    setTabIndicatorWidth(width);
  };

  const onHistoryTabLayout = (event: LayoutChangeEvent) => {
    const { width } = event.nativeEvent.layout;
    setTabWidths(prev => ({ ...prev, History: width }));
  };

  if (!plant) return null;

  const displayActions = plant.tasks?.filter(action => ACTION_CONFIG[action]) || [];

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

  return (
    <LinearGradient 
      colors={['#E8F5E9', '#C8E6C9', '#A5D6A7']} 
      style={styles.container}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      
      {/* Enhanced Decorative background elements */}
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

      <SafeAreaView style={styles.safeArea}>
        <Animated.ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 20 }]}
          style={{ opacity: fadeAnim }}
        >
          {/* Header with Gradient */}
          <Animated.View style={{ transform: [{ translateY: headerFloat }] }}>
            <LinearGradient
              colors={['rgba(27, 77, 62, 0.95)', 'rgba(15, 47, 38, 0.98)']}
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

                <Animated.View 
                  style={[
                    styles.plantIconContainer,
                    {
                      transform: [{ scale: scaleAnim }],
                    }
                  ]}
                >
                  <LinearGradient
                    colors={['#2E7D5E', '#1B4D3E']}
                    style={styles.plantIconGradient}
                  >
                    <Ionicons name="leaf" size={60} color="#FFFFFF" />
                  </LinearGradient>
                </Animated.View>

                <Animated.Text style={[styles.plantName, { opacity: fadeAnim }]}>
                  {plant.name}
                </Animated.Text>

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
          </Animated.View>

          {/* Tabs with Working Indicator */}
          <View style={styles.tabsContainer}>
            <View style={styles.tabsWrapper}>
              <TouchableOpacity
                style={[styles.tabButton, activeTab === 'Care' && styles.activeTabButton]}
                onPress={() => setActiveTab('Care')}
                onLayout={onCareTabLayout}
              >
                <Text style={[styles.tabText, activeTab === 'Care' && styles.activeTabText]}>
                  Care Schedule
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.tabButton, activeTab === 'History' && styles.activeTabButton]}
                onPress={() => setActiveTab('History')}
                onLayout={onHistoryTabLayout}
              >
                <Text style={[styles.tabText, activeTab === 'History' && styles.activeTabText]}>
                  History
                </Text>
              </TouchableOpacity>
            </View>
            <Animated.View 
              style={[
                styles.tabIndicator,
                {
                  width: tabIndicatorWidth,
                  transform: [{
                    translateX: tabIndicatorAnim,
                  }],
                }
              ]} 
            />
          </View>

          {/* Care Tab Content */}
          {activeTab === 'Care' && (
            <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
              <View style={styles.scheduleHeader}>
                <Text style={styles.sectionTitle}>Care Schedule</Text>
                <TouchableOpacity 
                  style={styles.editButton} 
                  onPress={() => router.push(`/plant/edit/${id}`)}
                  activeOpacity={0.7}
                >
                  <Ionicons name="create-outline" size={16} color="#2E7D5E" />
                  <Text style={styles.editButtonText}>Edit Schedule</Text>
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
                  
                  const cardScale = cardAnims[action] || new Animated.Value(1);

                  return (
                    <Animated.View
                      key={action}
                      style={{
                        transform: [{ scale: cardScale }],
                      }}
                    >
                      <LinearGradient
                        colors={['#FFFFFF', '#F8FAFC']}
                        style={styles.careCard}
                      >
                        <View style={styles.careCardHeader}>
                          <View style={[styles.iconCircle, { backgroundColor: config.color + '15' }]}>
                            <Ionicons name={config.icon as any} size={24} color={config.color} />
                          </View>
                          <View style={styles.careCardTitleContainer}>
                            <Text style={styles.careCardTitle}>{config.label}</Text>
                            {schedule && (
                              <View style={[styles.frequencyBadge, { backgroundColor: config.color + '10' }]}>
                                <Text style={[styles.frequencyText, { color: config.color }]}>
                                  Every {schedule.frequency} days
                                </Text>
                              </View>
                            )}
                          </View>
                        </View>
                        
                        <View style={styles.careCardBody}>
                          <View style={styles.statusGrid}>
                            <View style={styles.statusItem}>
                              <View style={styles.statusIconContainer}>
                                <Ionicons name="time-outline" size={14} color="#64748B" />
                              </View>
                              <View>
                                <Text style={styles.statusLabelSmall}>Last</Text>
                                <Text style={styles.statusValue}>{lastDisplay}</Text>
                              </View>
                            </View>
                            
                            {schedule && (
                              <View style={styles.statusItem}>
                                <View style={styles.statusIconContainer}>
                                  <Ionicons name="calendar-outline" size={14} color="#64748B" />
                                </View>
                                <View>
                                  <Text style={styles.statusLabelSmall}>Next</Text>
                                  <Text style={[styles.statusValue, nextDisplay === 'Now' && styles.statusUrgent]}>
                                    {nextDisplay}
                                  </Text>
                                </View>
                              </View>
                            )}
                          </View>

                          <TouchableOpacity 
                            style={styles.actionButton} 
                            onPress={() => handleAction(action)}
                            activeOpacity={0.8}
                          >
                            <LinearGradient
                              colors={[config.color, config.color + 'DD']}
                              start={{ x: 0, y: 0 }}
                              end={{ x: 1, y: 0 }}
                              style={styles.actionButtonGradient}
                            >
                              <Ionicons name={config.icon as any} size={18} color="#FFFFFF" />
                              <Text style={styles.actionButtonText}>Log {config.label}</Text>
                            </LinearGradient>
                          </TouchableOpacity>
                        </View>
                      </LinearGradient>
                    </Animated.View>
                  );
                })}
              </View>

              <View style={styles.notesCard}>
                <View style={styles.notesHeader}>
                  <View style={styles.notesIconCircle}>
                    <Ionicons name="document-text-outline" size={20} color="#2E7D5E" />
                  </View>
                  <Text style={styles.notesTitle}>Special Notes</Text>
                </View>
                <Text style={styles.notesText}>
                  {plant.notes || "No special notes yet. Add notes to remember care tips."}
                </Text>
              </View>
            </Animated.View>
          )}

          {/* History Tab Content */}
          {activeTab === 'History' && (
            <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
              <View style={styles.historyHeader}>
                <Text style={styles.sectionTitle}>Care History</Text>
                <Text style={styles.historyCount}>{taskHistory.length} events</Text>
              </View>
              
              {taskHistory.length === 0 ? (
                <View style={styles.emptyHistory}>
                  <View style={styles.emptyIconContainer}>
                    <Ionicons name="time-outline" size={48} color="#94A3B8" />
                  </View>
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
                      <Animated.View
                        key={event.id}
                        style={{
                          opacity: fadeAnim,
                          transform: [{
                            translateY: slideAnim.interpolate({
                              inputRange: [0, 50],
                              outputRange: [index * 5, 50],
                            }),
                          }],
                        }}
                      >
                        <View style={styles.historyItem}>
                          <View style={[styles.historyIconContainer, { backgroundColor: config.color + '15' }]}>
                            <Ionicons name={config.icon as any} size={20} color={config.color} />
                          </View>
                          <View style={styles.historyDetails}>
                            <Text style={styles.historyEvent}>{config.pastTense}</Text>
                            <Text style={styles.historyTime}>
                              {event.date} • {event.time}
                            </Text>
                          </View>
                          {index === 0 && (
                            <View style={[styles.latestBadge, { backgroundColor: config.color + '10' }]}>
                              <Text style={[styles.latestBadgeText, { color: config.color }]}>Latest</Text>
                            </View>
                          )}
                        </View>
                      </Animated.View>
                    );
                  })}
                </View>
              )}
            </Animated.View>
          )}
        </Animated.ScrollView>
      </SafeAreaView>

      {/* Menu Modal */}
      <Modal visible={menuVisible} transparent animationType="slide">
        <Pressable style={styles.modalOverlay} onPress={() => setMenuVisible(false)}>
          <BlurView intensity={20} style={styles.blurView}>
            <Animated.View style={[styles.modalContent]}>
              <View style={styles.modalHandle} />
              <Text style={styles.modalTitle}>Plant Options</Text>
              <TouchableOpacity 
                style={styles.modalOption} 
                onPress={handleMoveToRetired}
                activeOpacity={0.7}
              >
                <View style={[styles.optionIcon, { backgroundColor: '#FFEBEE' }]}>
                  <Ionicons name="archive-outline" size={22} color="#DC2626" />
                </View>
                <View style={styles.optionTextContainer}>
                  <Text style={[styles.optionTitle, { color: '#DC2626' }]}>Move to Retired</Text>
                  <Text style={styles.optionSubtitle}>Archive this plant</Text>
                </View>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.modalOption} 
                onPress={() => setMenuVisible(false)}
                activeOpacity={0.7}
              >
                <View style={[styles.optionIcon, { backgroundColor: '#F1F5F9' }]}>
                  <Ionicons name="close-outline" size={22} color="#64748B" />
                </View>
                <View style={styles.optionTextContainer}>
                  <Text style={styles.optionTitle}>Cancel</Text>
                  <Text style={styles.optionSubtitle}>Close this menu</Text>
                </View>
              </TouchableOpacity>
            </Animated.View>
          </BlurView>
        </Pressable>
      </Modal>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
  },
  safeArea: {
    flex: 1,
  },
  // Background elements
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
    width: 400,
    height: 400,
    borderRadius: 200,
    backgroundColor: 'rgba(27, 77, 62, 0.1)',
    bottom: -150,
    left: -150,
  },
  bgCircle3: {
    position: 'absolute',
    width: 250,
    height: 250,
    borderRadius: 125,
    backgroundColor: 'rgba(165, 214, 167, 0.2)',
    top: '30%',
    right: -50,
  },
  floatingLeaf1: {
    position: 'absolute',
    top: 120,
    right: 40,
    zIndex: 10,
  },
  floatingLeaf2: {
    position: 'absolute',
    bottom: 200,
    left: 30,
    zIndex: 10,
  },
  floatingLeaf3: {
    position: 'absolute',
    top: '50%',
    right: 60,
    zIndex: 10,
  },
  leafEmoji: {
    fontSize: 28,
    opacity: 0.25,
  },
  particle: {
    position: 'absolute',
    width: 4,
    height: 4,
    borderRadius: 2,
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
    alignItems: 'center', 
    gap: 16 
  },
  topActions: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    width: '100%' 
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
  plantIconContainer: { 
    marginVertical: 8 
  },
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
  plantName: { 
    fontSize: 28, 
    fontWeight: '700', 
    color: '#FFFFFF', 
    letterSpacing: -0.5 
  },
  tagContainer: { 
    flexDirection: 'row', 
    gap: 8, 
    flexWrap: 'wrap', 
    justifyContent: 'center' 
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
    fontWeight: '500' 
  },
  tabsContainer: {
    paddingHorizontal: 20,
    marginTop: 16,
    marginBottom: 20,
  },
  tabsWrapper: { 
    flexDirection: 'row', 
    gap: 24,
    borderBottomWidth: 2,
    borderBottomColor: '#E2E8F0',
  },
  tabButton: { 
    paddingBottom: 12,
    paddingHorizontal: 4,
  },
  tabText: { 
    fontSize: 16, 
    fontWeight: '600', 
    color: '#94A3B8' 
  },
  activeTabButton: {},
  activeTabText: { 
    color: '#2E7D5E' 
  },
  tabIndicator: { 
    position: 'absolute', 
    bottom: -2,
    left: 20,
    height: 3, 
    backgroundColor: '#2E7D5E', 
    borderRadius: 3,
  },
  content: { 
    paddingHorizontal: 20, 
    paddingTop: 8 
  },
  scheduleHeader: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    marginBottom: 16 
  },
  sectionTitle: { 
    fontSize: 18, 
    fontWeight: '700', 
    color: '#1E293B',
  },
  editButton: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 4,
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  editButtonText: { 
    fontSize: 13, 
    fontWeight: '600', 
    color: '#2E7D5E' 
  },
  cardsContainer: { 
    gap: 16, 
    marginBottom: 24 
  },
  careCard: {
    borderRadius: 20,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  careCardHeader: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 12, 
    marginBottom: 16,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  careCardTitleContainer: {
    flex: 1,
  },
  careCardTitle: { 
    fontSize: 18, 
    fontWeight: '600', 
    color: '#1E293B',
    marginBottom: 4,
  },
  frequencyBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 20,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  frequencyText: { 
    fontSize: 12, 
    fontWeight: '500',
  },
  careCardBody: { 
    gap: 16,
  },
  statusGrid: {
    flexDirection: 'row',
    gap: 20,
  },
  statusItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  statusIconContainer: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusLabelSmall: {
    fontSize: 11,
    color: '#94A3B8',
    marginBottom: 2,
  },
  statusValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
  },
  statusUrgent: {
    color: '#DC2626',
  },
  actionButton: { 
    borderRadius: 12, 
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  actionButtonGradient: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center', 
    paddingVertical: 12, 
    gap: 8,
  },
  actionButtonText: { 
    fontSize: 15, 
    fontWeight: '600', 
    color: '#FFFFFF' 
  },
  notesCard: { 
    backgroundColor: '#FFFFFF', 
    borderRadius: 20, 
    padding: 16, 
    shadowColor: '#000', 
    shadowOffset: { width: 0, height: 4 }, 
    shadowOpacity: 0.1, 
    shadowRadius: 12, 
    elevation: 4,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
    marginBottom: 20,
  },
  notesHeader: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 8, 
    marginBottom: 12 
  },
  notesIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#E8F5E9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  notesTitle: { 
    fontSize: 16, 
    fontWeight: '600', 
    color: '#1E293B' 
  },
  notesText: { 
    fontSize: 14, 
    color: '#64748B', 
    lineHeight: 20,
    paddingLeft: 44,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  historyCount: {
    fontSize: 14,
    color: '#94A3B8',
    fontWeight: '500',
  },
  emptyHistory: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    marginTop: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
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
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.02)',
  },
  historyIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
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
    marginBottom: 4,
  },
  historyTime: {
    fontSize: 13,
    color: '#64748B',
  },
  latestBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  latestBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
  },
  blurView: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    padding: 24,
    paddingBottom: 40,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 20,
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
  optionIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  optionTextContainer: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  optionSubtitle: {
    fontSize: 13,
    color: '#64748B',
  },
});