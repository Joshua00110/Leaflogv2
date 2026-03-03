import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  Animated,
  Easing,
  Dimensions,
  StatusBar,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { db, auth } from '../firebaseConfig';
import { collection, addDoc } from 'firebase/firestore';
import { BlurView } from 'expo-blur';

const { width, height } = Dimensions.get('window');

export default function AddSpace() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [spaceName, setSpaceName] = useState('');
  const [lightCondition, setLightCondition] = useState('Full Sun');

  const lightOptions = ['Full Sun', 'Partial Shade', 'Low Light'];

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;
  const headerFloatAnim = useRef(new Animated.Value(0)).current;
  const inputScaleAnim = useRef(new Animated.Value(1)).current;
  
  // Background animation values
  const floatAnim1 = useRef(new Animated.Value(0)).current;
  const floatAnim2 = useRef(new Animated.Value(0)).current;
  const floatAnim3 = useRef(new Animated.Value(0)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(0)).current;
  
  // Particle animations
  const particleAnims = useRef<Animated.Value[]>([]).current;
  const particleCount = 4;

  // Chip animation refs
  const chipAnims = useRef<{ [key: string]: Animated.Value }>({}).current;

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

    // Initialize chip animations
    lightOptions.forEach((option, index) => {
      if (!chipAnims[option]) {
        chipAnims[option] = new Animated.Value(0);
        Animated.sequence([
          Animated.delay(index * 100),
          Animated.spring(chipAnims[option], {
            toValue: 1,
            friction: 8,
            tension: 40,
            useNativeDriver: true,
          }),
        ]).start();
      }
    });
  }, []);

  const handleSave = async () => {
    if (!spaceName.trim()) {
      Alert.alert('Error', 'Space name cannot be empty');
      return;
    }

    try {
      const user = auth.currentUser;
      if (!user) {
        Alert.alert('Error', 'You must be logged in');
        return;
      }

      await addDoc(collection(db, 'spaces'), {
        name: spaceName.trim(),
        lightCondition,
        userId: user.uid,
        createdAt: new Date(),
      });

      router.back();
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Could not create space');
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
          <Animated.ScrollView
            contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 20 }]}
            showsVerticalScrollIndicator={false}
            style={{ opacity: fadeAnim }}
          >
            {/* Header with Gradient */}
            <Animated.View style={{ transform: [{ translateY: headerFloat }] }}>
              <LinearGradient
                colors={['#1B4D3E', '#0F2F26']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[styles.headerGradient, { paddingTop: insets.top + 20 }]}
              >
                <View style={styles.headerContent}>
                  <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="close" size={24} color="#FFFFFF" />
                  </TouchableOpacity>
                  <Text style={styles.headerTitle}>Add New Space</Text>
                  <TouchableOpacity onPress={handleSave} style={styles.saveButton}>
                    <LinearGradient 
                      colors={['#4A90E2', '#357ABD']} 
                      style={styles.saveGradient}
                    >
                      <Ionicons name="checkmark" size={22} color="#FFFFFF" />
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              </LinearGradient>
            </Animated.View>

            {/* Main Card */}
            <Animated.View 
              style={[
                styles.card,
                {
                  transform: [{ scale: scaleAnim }],
                  opacity: fadeAnim,
                }
              ]}
            >
              <View style={styles.cardHeader}>
                <View style={styles.cardIcon}>
                  <Ionicons name="home-outline" size={24} color="#2E7D5E" />
                </View>
                <Text style={styles.cardTitle}>Space Details</Text>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>SPACE NAME</Text>
                <Animated.View 
                  style={[
                    styles.inputWrapper,
                    {
                      transform: [{ scale: inputScaleAnim }],
                    }
                  ]}
                >
                  <Ionicons name="home-outline" size={20} color="#94A3B8" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. Living Room, Garden, Office"
                    placeholderTextColor="#94A3B8"
                    value={spaceName}
                    onChangeText={setSpaceName}
                    onFocus={() => {
                      Animated.spring(inputScaleAnim, {
                        toValue: 1.02,
                        tension: 40,
                        friction: 7,
                        useNativeDriver: true,
                      }).start();
                    }}
                    onBlur={() => {
                      Animated.spring(inputScaleAnim, {
                        toValue: 1,
                        tension: 40,
                        friction: 7,
                        useNativeDriver: true,
                      }).start();
                    }}
                  />
                </Animated.View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>LIGHT CONDITION</Text>
                <View style={styles.optionsContainer}>
                  {lightOptions.map((option) => {
                    const chipScale = chipAnims[option] || new Animated.Value(1);
                    return (
                      <Animated.View
                        key={option}
                        style={{
                          transform: [{ scale: chipScale }],
                        }}
                      >
                        <TouchableOpacity
                          style={[
                            styles.optionChip,
                            lightCondition === option && styles.optionChipActive,
                          ]}
                          onPress={() => setLightCondition(option)}
                          activeOpacity={0.7}
                        >
                          <Ionicons
                            name={
                              option === 'Full Sun' ? 'sunny' :
                              option === 'Partial Shade' ? 'partly-sunny' :
                              'moon'
                            }
                            size={18}
                            color={lightCondition === option ? '#FFFFFF' : '#64748B'}
                          />
                          <Text
                            style={[
                              styles.optionText,
                              lightCondition === option && styles.optionTextActive,
                            ]}
                          >
                            {option}
                          </Text>
                        </TouchableOpacity>
                      </Animated.View>
                    );
                  })}
                </View>
              </View>

              <View style={styles.tipContainer}>
                <View style={styles.tipIcon}>
                  <Ionicons name="bulb-outline" size={20} color="#F59E0B" />
                </View>
                <Text style={styles.tipText}>
                  Choose the light condition that best matches where this space is located.
                </Text>
              </View>
            </Animated.View>
          </Animated.ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
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
  scrollContent: {
    flexGrow: 1,
  },
  headerGradient: {
    paddingBottom: 30,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  saveButton: {
    borderRadius: 22,
    overflow: 'hidden',
  },
  saveGradient: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    margin: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    gap: 12,
  },
  cardIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: '#E8F5E9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1E293B',
  },
  inputGroup: {
    marginBottom: 24,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
    marginBottom: 8,
    letterSpacing: 0.8,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    paddingVertical: 16,
    fontSize: 16,
    color: '#1E293B',
  },
  optionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  optionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 30,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  optionChipActive: {
    backgroundColor: '#2E7D5E',
    borderColor: '#2E7D5E',
  },
  optionText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#64748B',
  },
  optionTextActive: {
    color: '#FFFFFF',
  },
  tipContainer: {
    flexDirection: 'row',
    backgroundColor: '#FEF3C7',
    borderRadius: 16,
    padding: 16,
    gap: 12,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  tipIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  tipText: {
    flex: 1,
    fontSize: 14,
    color: '#92400E',
    lineHeight: 20,
  },
});