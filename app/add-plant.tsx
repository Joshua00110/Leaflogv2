import React, { useState, useRef, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TextInput, 
  TouchableOpacity, 
  ScrollView, 
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Modal,
  FlatList,
  Animated,
  Easing,
  Dimensions,
  StatusBar,
  Pressable
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { db, auth } from '../firebaseConfig'; 
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';

const { width, height } = Dimensions.get('window');

const CATEGORIES = [
  'Succulent', 'Fern', 'Flowering', 'Foliage', 'Cactus',
  'Herb', 'Tree', 'Tropical', 'Air Plant', 'General'
];

const CARE_ACTIONS = ['Water', 'Feed', 'Clean', 'Mist', 'Prune', 'Repot'];

interface ActionSchedule {
  frequency: number;
  hour: number;
  minute: number;
}

// Define proper icon types
type IconName = React.ComponentProps<typeof Ionicons>['name'];

// Action config with proper icon typing
const ACTION_CONFIG: Record<string, { icon: IconName; color: string }> = {
  Water: { icon: 'water', color: '#2E7D5E' },
  Feed: { icon: 'nutrition-outline', color: '#5C6BC0' },
  Mist: { icon: 'cloud-outline', color: '#4A90E2' },
  Clean: { icon: 'brush-outline', color: '#8B5CF6' },
  Prune: { icon: 'cut-outline', color: '#F59E0B' },
  Repot: { icon: 'flower-outline', color: '#EC4899' },
};

export default function AddPlant() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const spaceId = typeof params.spaceId === 'string' ? params.spaceId : null;

  const [name, setName] = useState('');
  const [species, setSpecies] = useState('');
  const [category, setCategory] = useState('General');
  const [careActions, setCareActions] = useState<string[]>(['Water']);
  const [notes, setNotes] = useState('');
  const [environment, setEnvironment] = useState('Indoor');

  // Schedules for each selected action
  const [schedules, setSchedules] = useState<Record<string, ActionSchedule>>({});

  // Modals
  const [categoryModalVisible, setCategoryModalVisible] = useState(false);
  const [scheduleModalVisible, setScheduleModalVisible] = useState(false);
  const [editingAction, setEditingAction] = useState<string | null>(null);

  // Frequency & time picker for schedule modal
  const [tempFrequency, setTempFrequency] = useState(7);
  const [tempHour, setTempHour] = useState(9);
  const [tempMinute, setTempMinute] = useState(0);
  const [frequencyModalVisible, setFrequencyModalVisible] = useState(false);
  const [hourModalVisible, setHourModalVisible] = useState(false);
  const [minuteModalVisible, setMinuteModalVisible] = useState(false);

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;
  const headerFloatAnim = useRef(new Animated.Value(0)).current;
  
  // Background animation values
  const floatAnim1 = useRef(new Animated.Value(0)).current;
  const floatAnim2 = useRef(new Animated.Value(0)).current;
  const floatAnim3 = useRef(new Animated.Value(0)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(0)).current;
  
  // Card animation refs
  const cardAnims = useRef<{ [key: string]: Animated.Value }>({}).current;
  
  // Particle animations
  const particleAnims = useRef<Animated.Value[]>([]).current;
  const particleCount = 4;

  const frequencyOptions = [1, 2, 3, 5, 7, 10, 14, 21, 30];
  const hourOptions = Array.from({ length: 24 }, (_, i) => i);
  const minuteOptions = Array.from({ length: 60 }, (_, i) => i);

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
  }, []);

  // Animate chips when they appear
  useEffect(() => {
    CARE_ACTIONS.forEach((action, index) => {
      if (!cardAnims[action]) {
        cardAnims[action] = new Animated.Value(0);
        Animated.sequence([
          Animated.delay(index * 50),
          Animated.spring(cardAnims[action], {
            toValue: 1,
            friction: 8,
            tension: 40,
            useNativeDriver: true,
          }),
        ]).start();
      }
    });
  }, []);

  const toggleAction = (action: string) => {
    setCareActions(prev => {
      const newActions = prev.includes(action)
        ? prev.filter(a => a !== action)
        : [...prev, action];

      // If adding action, set a default schedule
      if (!prev.includes(action) && newActions.includes(action)) {
        setSchedules(prevSched => ({
          ...prevSched,
          [action]: { frequency: 7, hour: 9, minute: 0 }
        }));
      } else {
        // If removing action, delete its schedule
        setSchedules(prevSched => {
          const newSched = { ...prevSched };
          delete newSched[action];
          return newSched;
        });
      }
      return newActions;
    });
  };

  const openScheduleModal = (action: string) => {
    const schedule = schedules[action] || { frequency: 7, hour: 9, minute: 0 };
    setEditingAction(action);
    setTempFrequency(schedule.frequency);
    setTempHour(schedule.hour);
    setTempMinute(schedule.minute);
    setScheduleModalVisible(true);
  };

  const saveSchedule = () => {
    if (!editingAction) return;
    setSchedules(prev => ({
      ...prev,
      [editingAction]: { frequency: tempFrequency, hour: tempHour, minute: tempMinute }
    }));
    setScheduleModalVisible(false);
    setEditingAction(null);
  };

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert("Required", "Plant name is required");
      return;
    }

    try {
      const user = auth.currentUser;
      if (!user) {
        Alert.alert("Error", "You must be logged in to add a plant.");
        return;
      }

      const plantData = {
        name: name.trim(),
        species: species.trim() || '',
        category,
        spaceId: spaceId,
        userId: user.uid,
        tasks: careActions,
        schedules,
        notes: notes.trim() || '',
        environment,
        status: 'active',
        createdAt: serverTimestamp()
      };

      await addDoc(collection(db, "plants"), plantData);
      router.back();
    } catch (e) {
      console.error("Error adding plant: ", e);
      Alert.alert("Failed to save plant", "Please check your internet and try again.");
    }
  };

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

      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
          style={{ flex: 1 }}
        >
          {/* Header with Gradient */}
          <Animated.View style={{ transform: [{ translateY: headerFloat }] }}>
            <LinearGradient 
              colors={['#1B4D3E', '#0F2F26']} 
              style={styles.header}
            >
              <TouchableOpacity onPress={() => router.back()} style={styles.headerButton}>
                <Ionicons name="close" size={28} color="#FFFFFF" />
              </TouchableOpacity>
              <Text style={styles.headerTitle}>Add New Plant</Text>
              <TouchableOpacity onPress={handleSave} style={styles.headerButton}>
                <LinearGradient
                  colors={['#4A90E2', '#357ABD']}
                  style={styles.saveButtonGradient}
                >
                  <Ionicons name="checkmark" size={24} color="#FFFFFF" />
                </LinearGradient>
              </TouchableOpacity>
            </LinearGradient>
          </Animated.View>

          <Animated.ScrollView 
            style={[styles.form, { opacity: fadeAnim }]} 
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
          >
            {/* Basic Info Card */}
            <Animated.View style={[styles.card, { transform: [{ scale: scaleAnim }] }]}>
              <Text style={styles.cardTitle}>Basic Information</Text>
              <View style={styles.inputGroup}>
                <Text style={styles.fieldLabel}>PLANT NAME <Text style={styles.required}>*</Text></Text>
                <View style={styles.inputWrapper}>
                  <Ionicons name="leaf-outline" size={20} color="#94A3B8" style={styles.inputIcon} />
                  <TextInput 
                    style={styles.textInput} 
                    placeholder="e.g. Snake Plant" 
                    placeholderTextColor="#94A3B8"
                    value={name} onChangeText={setName} 
                  />
                </View>
              </View>
              <View style={styles.inputGroup}>
                <Text style={styles.fieldLabel}>SPECIES</Text>
                <View style={styles.inputWrapper}>
                  <Ionicons name="fitness-outline" size={20} color="#94A3B8" style={styles.inputIcon} />
                  <TextInput 
                    style={styles.textInput} 
                    placeholder="e.g. Sansevieria" 
                    placeholderTextColor="#94A3B8"
                    value={species} onChangeText={setSpecies} 
                  />
                </View>
              </View>
              <View style={styles.inputGroup}>
                <Text style={styles.fieldLabel}>CATEGORY</Text>
                <TouchableOpacity style={styles.inputWrapper} onPress={() => setCategoryModalVisible(true)}>
                  <Ionicons name="apps-outline" size={20} color="#94A3B8" style={styles.inputIcon} />
                  <Text style={[styles.textInput, styles.pickerText]}>{category}</Text>
                  <Ionicons name="chevron-down" size={20} color="#94A3B8" />
                </TouchableOpacity>
              </View>
            </Animated.View>

            {/* Care Actions Card */}
            <Animated.View style={[styles.card, { transform: [{ scale: scaleAnim }] }]}>
              <Text style={styles.cardTitle}>Care Actions</Text>
              <Text style={styles.cardSubtitle}>Tap to select tasks you track</Text>
              
              <View style={styles.chipGrid}>
                {CARE_ACTIONS.map((task, index) => {
                  const chipScale = cardAnims[task] || new Animated.Value(1);
                  const config = ACTION_CONFIG[task] || { icon: 'leaf-outline', color: '#2E7D5E' };
                  
                  return (
                    <Animated.View
                      key={task}
                      style={{
                        transform: [{ scale: chipScale }],
                      }}
                    >
                      <TouchableOpacity 
                        style={[styles.chip, careActions.includes(task) && styles.chipActive]}
                        onPress={() => toggleAction(task)}
                        activeOpacity={0.7}
                      >
                        <Ionicons 
                          name={config.icon} 
                          size={16} 
                          color={careActions.includes(task) ? '#FFFFFF' : config.color} 
                        />
                        <Text style={[styles.chipText, careActions.includes(task) && styles.chipTextActive]}>
                          {task}
                        </Text>
                      </TouchableOpacity>
                    </Animated.View>
                  );
                })}
              </View>

              {/* Schedule configuration for selected actions */}
              {careActions.length > 0 && (
                <Animated.View style={[styles.schedulesContainer, { opacity: fadeAnim }]}>
                  <Text style={styles.sectionSubtitle}>Set schedules for each action:</Text>
                  {careActions.map((action, index) => {
                    const sched = schedules[action] || { frequency: 7, hour: 9, minute: 0 };
                    const config = ACTION_CONFIG[action] || { icon: 'calendar-outline', color: '#2E7D5E' };
                    
                    return (
                      <Animated.View 
                        key={action} 
                        style={[
                          styles.scheduleRow,
                          {
                            opacity: fadeAnim,
                            transform: [{
                              translateY: slideAnim.interpolate({
                                inputRange: [0, 50],
                                outputRange: [index * 5, 50],
                              }),
                            }],
                          }
                        ]}
                      >
                        <View style={[styles.scheduleIcon, { backgroundColor: config.color + '15' }]}>
                          <Ionicons 
                            name={config.icon} 
                            size={18} 
                            color={config.color} 
                          />
                        </View>
                        <Text style={styles.scheduleAction}>{action}</Text>
                        <TouchableOpacity 
                          onPress={() => openScheduleModal(action)} 
                          style={[styles.scheduleButton, { borderColor: config.color + '30' }]}
                        >
                          <Text style={[styles.scheduleButtonText, { color: config.color }]}>
                            Every {sched.frequency}d at {sched.hour.toString().padStart(2,'0')}:{sched.minute.toString().padStart(2,'0')}
                          </Text>
                          <Ionicons name="create-outline" size={16} color={config.color} />
                        </TouchableOpacity>
                      </Animated.View>
                    );
                  })}
                </Animated.View>
              )}
            </Animated.View>

            {/* Environment Card */}
            <Animated.View style={[styles.card, { transform: [{ scale: scaleAnim }] }]}>
              <Text style={styles.cardTitle}>Environment</Text>
              <View style={styles.environmentRow}>
                <TouchableOpacity 
                  style={[styles.environmentOption, environment === 'Indoor' && styles.environmentOptionActive]}
                  onPress={() => setEnvironment('Indoor')}
                  activeOpacity={0.7}
                >
                  <View style={[styles.environmentIcon, environment === 'Indoor' && styles.environmentIconActive]}>
                    <Ionicons name="home-outline" size={24} color={environment === 'Indoor' ? '#2E7D5E' : '#64748B'} />
                  </View>
                  <Text style={[styles.environmentText, environment === 'Indoor' && styles.environmentTextActive]}>Indoor</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.environmentOption, environment === 'Outdoor' && styles.environmentOptionActive]}
                  onPress={() => setEnvironment('Outdoor')}
                  activeOpacity={0.7}
                >
                  <View style={[styles.environmentIcon, environment === 'Outdoor' && styles.environmentIconActive]}>
                    <Ionicons name="sunny-outline" size={24} color={environment === 'Outdoor' ? '#2E7D5E' : '#64748B'} />
                  </View>
                  <Text style={[styles.environmentText, environment === 'Outdoor' && styles.environmentTextActive]}>Outdoor</Text>
                </TouchableOpacity>
              </View>
            </Animated.View>

            {/* Notes Card */}
            <Animated.View style={[styles.card, { transform: [{ scale: scaleAnim }] }]}>
              <Text style={styles.cardTitle}>Notes</Text>
              <View style={styles.inputGroup}>
                <View style={[styles.inputWrapper, styles.textAreaWrapper]}>
                  <TextInput 
                    style={[styles.textInput, styles.textArea]} 
                    placeholder="Add care tips, reminders, or notes..." 
                    placeholderTextColor="#94A3B8"
                    multiline numberOfLines={4}
                    value={notes} onChangeText={setNotes}
                  />
                </View>
              </View>
            </Animated.View>
          </Animated.ScrollView>

          {/* Category Modal */}
          <Modal visible={categoryModalVisible} transparent animationType="slide">
            <Pressable style={styles.modalOverlay} onPress={() => setCategoryModalVisible(false)}>
              <BlurView intensity={20} style={styles.blurView}>
                <Animated.View style={[styles.modalContent]}>
                  <View style={styles.modalHandle} />
                  <Text style={styles.modalTitle}>Select Category</Text>
                  <FlatList
                    data={CATEGORIES}
                    keyExtractor={(item) => item}
                    renderItem={({ item }) => (
                      <TouchableOpacity
                        style={styles.categoryItem}
                        onPress={() => { setCategory(item); setCategoryModalVisible(false); }}
                        activeOpacity={0.7}
                      >
                        <Text style={styles.categoryItemText}>{item}</Text>
                        {category === item && (
                          <View style={styles.checkIcon}>
                            <Ionicons name="checkmark-circle" size={24} color="#2E7D5E" />
                          </View>
                        )}
                      </TouchableOpacity>
                    )}
                    ItemSeparatorComponent={() => <View style={styles.separator} />}
                  />
                </Animated.View>
              </BlurView>
            </Pressable>
          </Modal>

          {/* Schedule Modal */}
          <Modal visible={scheduleModalVisible} transparent animationType="slide">
            <Pressable style={styles.modalOverlay} onPress={() => setScheduleModalVisible(false)}>
              <BlurView intensity={20} style={styles.blurView}>
                <Animated.View style={[styles.modalContent]}>
                  <View style={styles.modalHandle} />
                  <Text style={styles.modalTitle}>Set Schedule for {editingAction}</Text>
                  
                  {/* Frequency */}
                  <Text style={styles.modalLabel}>Frequency (days)</Text>
                  <TouchableOpacity 
                    style={styles.modalPicker} 
                    onPress={() => setFrequencyModalVisible(true)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.modalPickerIcon}>
                      <Ionicons name="calendar-outline" size={20} color="#2E7D5E" />
                    </View>
                    <Text style={styles.modalPickerText}>Every {tempFrequency} day{tempFrequency > 1 ? 's' : ''}</Text>
                    <Ionicons name="chevron-down" size={20} color="#64748B" />
                  </TouchableOpacity>

                  {/* Time - Hour */}
                  <Text style={styles.modalLabel}>Hour</Text>
                  <TouchableOpacity 
                    style={styles.modalPicker} 
                    onPress={() => setHourModalVisible(true)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.modalPickerIcon}>
                      <Ionicons name="time-outline" size={20} color="#2E7D5E" />
                    </View>
                    <Text style={styles.modalPickerText}>{tempHour.toString().padStart(2,'0')} : 00</Text>
                    <Ionicons name="chevron-down" size={20} color="#64748B" />
                  </TouchableOpacity>

                  {/* Time - Minute */}
                  <Text style={styles.modalLabel}>Minute</Text>
                  <TouchableOpacity 
                    style={styles.modalPicker} 
                    onPress={() => setMinuteModalVisible(true)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.modalPickerIcon}>
                      <Ionicons name="time-outline" size={20} color="#2E7D5E" />
                    </View>
                    <Text style={styles.modalPickerText}>{tempMinute.toString().padStart(2,'0')} minutes</Text>
                    <Ionicons name="chevron-down" size={20} color="#64748B" />
                  </TouchableOpacity>

                  <View style={styles.modalActions}>
                    <TouchableOpacity 
                      style={styles.modalCancel} 
                      onPress={() => setScheduleModalVisible(false)}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.modalCancelText}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={styles.modalSave} 
                      onPress={saveSchedule}
                      activeOpacity={0.7}
                    >
                      <LinearGradient
                        colors={['#2E7D5E', '#1B4D3E']}
                        style={styles.modalSaveGradient}
                      >
                        <Text style={styles.modalSaveText}>Save</Text>
                      </LinearGradient>
                    </TouchableOpacity>
                  </View>
                </Animated.View>
              </BlurView>
            </Pressable>
          </Modal>

          {/* Frequency Picker Modal */}
          <Modal visible={frequencyModalVisible} transparent animationType="slide">
            <Pressable style={styles.modalOverlay} onPress={() => setFrequencyModalVisible(false)}>
              <BlurView intensity={20} style={styles.blurView}>
                <Animated.View style={[styles.modalContent]}>
                  <View style={styles.modalHandle} />
                  <Text style={styles.modalTitle}>Select Frequency</Text>
                  <FlatList
                    data={frequencyOptions}
                    keyExtractor={(item) => item.toString()}
                    renderItem={({ item }) => (
                      <TouchableOpacity
                        style={styles.categoryItem}
                        onPress={() => { setTempFrequency(item); setFrequencyModalVisible(false); }}
                        activeOpacity={0.7}
                      >
                        <Text style={styles.categoryItemText}>Every {item} day{item > 1 ? 's' : ''}</Text>
                        {tempFrequency === item && (
                          <View style={styles.checkIcon}>
                            <Ionicons name="checkmark-circle" size={24} color="#2E7D5E" />
                          </View>
                        )}
                      </TouchableOpacity>
                    )}
                    ItemSeparatorComponent={() => <View style={styles.separator} />}
                  />
                </Animated.View>
              </BlurView>
            </Pressable>
          </Modal>

          {/* Hour Picker Modal */}
          <Modal visible={hourModalVisible} transparent animationType="slide">
            <Pressable style={styles.modalOverlay} onPress={() => setHourModalVisible(false)}>
              <BlurView intensity={20} style={styles.blurView}>
                <Animated.View style={[styles.modalContent]}>
                  <View style={styles.modalHandle} />
                  <Text style={styles.modalTitle}>Select Hour</Text>
                  <FlatList
                    data={hourOptions}
                    keyExtractor={(item) => item.toString()}
                    renderItem={({ item }) => (
                      <TouchableOpacity
                        style={styles.categoryItem}
                        onPress={() => { setTempHour(item); setHourModalVisible(false); }}
                        activeOpacity={0.7}
                      >
                        <Text style={styles.categoryItemText}>{item.toString().padStart(2,'0')}:00</Text>
                        {tempHour === item && (
                          <View style={styles.checkIcon}>
                            <Ionicons name="checkmark-circle" size={24} color="#2E7D5E" />
                          </View>
                        )}
                      </TouchableOpacity>
                    )}
                    ItemSeparatorComponent={() => <View style={styles.separator} />}
                  />
                </Animated.View>
              </BlurView>
            </Pressable>
          </Modal>

          {/* Minute Picker Modal */}
          <Modal visible={minuteModalVisible} transparent animationType="slide">
            <Pressable style={styles.modalOverlay} onPress={() => setMinuteModalVisible(false)}>
              <BlurView intensity={20} style={styles.blurView}>
                <Animated.View style={[styles.modalContent]}>
                  <View style={styles.modalHandle} />
                  <Text style={styles.modalTitle}>Select Minute</Text>
                  <FlatList
                    data={minuteOptions}
                    keyExtractor={(item) => item.toString()}
                    renderItem={({ item }) => (
                      <TouchableOpacity
                        style={styles.categoryItem}
                        onPress={() => { setTempMinute(item); setMinuteModalVisible(false); }}
                        activeOpacity={0.7}
                      >
                        <Text style={styles.categoryItemText}>{item.toString().padStart(2,'0')}</Text>
                        {tempMinute === item && (
                          <View style={styles.checkIcon}>
                            <Ionicons name="checkmark-circle" size={24} color="#2E7D5E" />
                          </View>
                        )}
                      </TouchableOpacity>
                    )}
                    ItemSeparatorComponent={() => <View style={styles.separator} />}
                  />
                </Animated.View>
              </BlurView>
            </Pressable>
          </Modal>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#a2c9abff' 
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
    backgroundColor: 'rgba(46, 125, 94, 0.03)',
    top: -100,
    right: -100,
  },
  bgCircle2: {
    position: 'absolute',
    width: 400,
    height: 400,
    borderRadius: 200,
    backgroundColor: 'rgba(27, 77, 62, 0.03)',
    bottom: -150,
    left: -150,
  },
  bgCircle3: {
    position: 'absolute',
    width: 250,
    height: 250,
    borderRadius: 125,
    backgroundColor: 'rgba(165, 214, 167, 0.05)',
    top: '30%',
    right: -50,
  },
  particle: {
    position: 'absolute',
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#2E7D5E',
    opacity: 0.2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  headerButton: { 
    width: 48, 
    height: 48, 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  headerTitle: { 
    fontSize: 20, 
    fontWeight: '600', 
    color: '#FFFFFF' 
  },
  saveButtonGradient: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  form: { 
    flex: 1, 
    paddingHorizontal: 20, 
    paddingTop: 20 
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  cardTitle: { 
    fontSize: 18, 
    fontWeight: '700', 
    color: '#1E293B', 
    marginBottom: 4 
  },
  cardSubtitle: { 
    fontSize: 14, 
    color: '#64748B', 
    marginBottom: 16 
  },
  sectionSubtitle: { 
    fontSize: 14, 
    fontWeight: '600', 
    color: '#1E293B', 
    marginTop: 12, 
    marginBottom: 12 
  },
  inputGroup: { 
    marginBottom: 16 
  },
  fieldLabel: { 
    fontSize: 12, 
    fontWeight: '600', 
    color: '#64748B', 
    marginBottom: 8, 
    letterSpacing: 0.5 
  },
  required: { 
    color: '#DC2626' 
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  inputIcon: { 
    marginRight: 8 
  },
  textInput: { 
    flex: 1, 
    paddingVertical: 14, 
    fontSize: 16, 
    color: '#1E293B' 
  },
  pickerText: { 
    color: '#1E293B' 
  },
  textAreaWrapper: { 
    alignItems: 'flex-start' 
  },
  textArea: { 
    height: 100, 
    textAlignVertical: 'top' 
  },
  chipGrid: { 
    flexDirection: 'row', 
    flexWrap: 'wrap', 
    marginHorizontal: -4 
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    margin: 4,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  chipActive: { 
    backgroundColor: '#2E7D5E', 
    borderColor: '#2E7D5E' 
  },
  chipText: { 
    fontSize: 14, 
    fontWeight: '500', 
    color: '#64748B', 
    marginLeft: 6 
  },
  chipTextActive: { 
    color: '#FFFFFF' 
  },
  schedulesContainer: { 
    marginTop: 16, 
    borderTopWidth: 1, 
    borderTopColor: '#E2E8F0', 
    paddingTop: 16 
  },
  scheduleRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    marginBottom: 12,
    gap: 8,
  },
  scheduleIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scheduleAction: { 
    fontSize: 15, 
    fontWeight: '600', 
    color: '#1E293B', 
    width: 70 
  },
  scheduleButton: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    flex: 1, 
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
  },
  scheduleButtonText: { 
    fontSize: 13, 
    fontWeight: '500',
  },
  environmentRow: { 
    flexDirection: 'row', 
    gap: 16,
    marginTop: 8,
  },
  environmentOption: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    gap: 8,
  },
  environmentOptionActive: { 
    borderColor: '#2E7D5E', 
    backgroundColor: '#E8F5E9' 
  },
  environmentIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
  },
  environmentIconActive: {
    backgroundColor: '#FFFFFF',
  },
  environmentText: { 
    fontSize: 16, 
    fontWeight: '500', 
    color: '#64748B' 
  },
  environmentTextActive: { 
    color: '#2E7D5E' 
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
    maxHeight: '80%',
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
    marginBottom: 20 
  },
  modalTitle: { 
    fontSize: 20, 
    fontWeight: '700', 
    color: '#1E293B', 
    marginBottom: 20, 
    textAlign: 'center' 
  },
  modalLabel: { 
    fontSize: 14, 
    fontWeight: '600', 
    color: '#64748B', 
    marginBottom: 8 
  },
  modalPicker: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16,
    gap: 12,
  },
  modalPickerIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#E8F5E9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalPickerText: { 
    fontSize: 16, 
    color: '#1E293B', 
    flex: 1 
  },
  modalActions: { 
    flexDirection: 'row', 
    gap: 12, 
    marginTop: 8 
  },
  modalCancel: { 
    flex: 1, 
    backgroundColor: '#F1F5F9', 
    paddingVertical: 14, 
    borderRadius: 12, 
    alignItems: 'center' 
  },
  modalCancelText: { 
    fontSize: 16, 
    fontWeight: '600', 
    color: '#64748B' 
  },
  modalSave: { 
    flex: 1, 
    borderRadius: 12, 
    overflow: 'hidden' 
  },
  modalSaveGradient: {
    paddingVertical: 14,
    alignItems: 'center',
  },
  modalSaveText: { 
    fontSize: 16, 
    fontWeight: '600', 
    color: '#FFFFFF' 
  },
  categoryItem: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    paddingVertical: 16, 
    paddingHorizontal: 8 
  },
  categoryItemText: { 
    fontSize: 16, 
    color: '#1E293B' 
  },
  checkIcon: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  separator: { 
    height: 1, 
    backgroundColor: '#F1F5F9' 
  },
});