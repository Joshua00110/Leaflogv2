import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, Switch, Alert, Animated, Dimensions, StatusBar, Easing } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { auth } from '../../firebaseConfig';
import { signOut } from 'firebase/auth';
import { useRouter, useFocusEffect } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Notifications from 'expo-notifications';

const { width, height } = Dimensions.get('window');

// Define props interface with optional rightElement
interface SettingItemProps {
  icon: string;
  title: string;
  subtitle?: string;
  onPress?: () => void;
  rightElement?: React.ReactNode;
  danger?: boolean;
  index?: number;
  animated?: boolean;
  fadeAnim?: any;
  slideAnim?: any;
}

const SettingItem: React.FC<SettingItemProps> = ({ 
  icon, 
  title, 
  subtitle, 
  onPress, 
  rightElement, 
  danger = false,
  index = 0,
  animated = false,
  fadeAnim,
  slideAnim,
}) => {
  const itemAnim = useRef(new Animated.Value(0)).current;
  
  useEffect(() => {
    if (animated) {
      Animated.spring(itemAnim, {
        toValue: 1,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
        delay: index * 50,
      }).start();
    } else {
      itemAnim.setValue(1);
    }
  }, [animated]);

  return (
    <Animated.View style={{
      opacity: animated ? fadeAnim : 1,
      transform: [
        { translateX: animated ? slideAnim : 0 },
        { scale: itemAnim }
      ]
    }}>
      <TouchableOpacity style={styles.itemRow} onPress={onPress} disabled={!onPress}>
        <View style={[styles.iconBox, { backgroundColor: danger ? '#FFEBEE' : '#E8F5E9' }]}>
          <Ionicons name={icon as any} size={22} color={danger ? '#DC2626' : '#2E7D5E'} />
        </View>
        <View style={styles.itemTextContainer}>
          <Text style={[styles.itemTitle, danger && { color: '#DC2626' }]}>{title}</Text>
          {subtitle && <Text style={styles.itemSub}>{subtitle}</Text>}
        </View>
        {rightElement && <View>{rightElement}</View>}
      </TouchableOpacity>
    </Animated.View>
  );
};

export default function SettingsScreen() {
  const router = useRouter();
  const user = auth.currentUser;
  const insets = useSafeAreaInsets();

  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [avatarSticker, setAvatarSticker] = useState('🌱');
  const [cleanName, setCleanName] = useState('Gardener');

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;
  const headerFloatAnim = useRef(new Animated.Value(0)).current;
  const cardAnim = useRef(new Animated.Value(0)).current;
  const sectionAnims = useRef([...Array(5)].map(() => new Animated.Value(0))).current;
  const avatarPulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Entrance animations
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

    // Card entrance animation
    Animated.spring(cardAnim, {
      toValue: 1,
      friction: 8,
      tension: 40,
      useNativeDriver: true,
      delay: 200,
    }).start();

    // Section animations (staggered)
    Animated.stagger(100, sectionAnims.map(anim => 
      Animated.spring(anim, {
        toValue: 1,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      })
    )).start();

    // Avatar pulse animation (continuous subtle pulse)
    Animated.loop(
      Animated.sequence([
        Animated.timing(avatarPulseAnim, {
          toValue: 1.05,
          duration: 2000,
          useNativeDriver: true,
          easing: Easing.inOut(Easing.sin),
        }),
        Animated.timing(avatarPulseAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
          easing: Easing.inOut(Easing.sin),
        }),
      ])
    ).start();

  }, []);

  // Update avatar and clean name
  const updateDisplayInfo = useCallback(() => {
    const currentUser = auth.currentUser;
    const fullDisplayName = currentUser?.displayName || '';
    
    console.log('Full display name:', fullDisplayName);
    
    if (fullDisplayName && fullDisplayName.length > 0) {
      const parts = fullDisplayName.split(' ');
      const emojiPart = parts[0];
      const namePart = parts.slice(1).join(' ');
      
      setAvatarSticker(emojiPart);
      setCleanName(namePart.trim() || 'Gardener');
    } else {
      setAvatarSticker('🌱');
      setCleanName('Gardener');
    }
  }, []);

  // Initial load
  useEffect(() => {
    updateDisplayInfo();
  }, [updateDisplayInfo]);

  // Refresh when screen focuses
  useFocusEffect(
    useCallback(() => {
      updateDisplayInfo();
    }, [updateDisplayInfo])
  );

  // Check notification permissions
  useEffect(() => {
    const checkNotificationPermissions = async () => {
      const { status } = await Notifications.getPermissionsAsync();
      setNotificationsEnabled(status === 'granted');
    };
    checkNotificationPermissions();
  }, []);

  const handleNotificationToggle = async (value: boolean) => {
    if (value) {
      const { status } = await Notifications.requestPermissionsAsync();
      if (status === 'granted') {
        setNotificationsEnabled(true);
      } else {
        Alert.alert(
          "Permission Required",
          "Please enable notifications in your device settings to receive reminders."
        );
        setNotificationsEnabled(false);
      }
    } else {
      setNotificationsEnabled(false);
      await Notifications.cancelAllScheduledNotificationsAsync();
    }
  };

  const handleSignOut = async () => {
    Alert.alert(
      "Sign Out",
      "Are you sure you want to sign out?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Sign Out",
          style: "destructive",
          onPress: async () => {
            try {
              await signOut(auth);
              router.replace('/auth');
            } catch (error) {
              console.error("Error signing out: ", error);
            }
          }
        }
      ]
    );
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      "Delete Account",
      "This action is permanent and cannot be undone. All your data will be lost.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", style: "destructive", onPress: () => console.log("Delete account") }
      ]
    );
  };

  const headerFloat = headerFloatAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -5],
  });

  return (
    <LinearGradient colors={['#a2c9abff', '#E8F0E8']} style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      
      {/* Decorative background elements */}
      <View style={styles.bgCircle1} />
      <View style={styles.bgCircle2} />
      <View style={styles.bgCircle3} />

      <SafeAreaView style={styles.safeArea}>
        <Animated.ScrollView 
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: insets.bottom + 30 }
          ]}
          showsVerticalScrollIndicator={false}
          style={{ opacity: fadeAnim }}
        >
          {/* Header with Gradient and floating animation */}
          <Animated.View style={{ transform: [{ translateY: headerFloat }] }}>
            <LinearGradient
              colors={['#1B4D3E', '#0F2F26', '#0A1F18']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.headerGradient}
            >
              <BlurView intensity={20} tint="dark" style={styles.headerBlur}>
                <View style={styles.headerContent}>
                  <Text style={styles.headerTitle}>Settings</Text>
                  <Text style={styles.headerSubtitle}>Manage your preferences</Text>
                </View>
              </BlurView>
            </LinearGradient>
          </Animated.View>

          {/* Profile Card with enhanced design */}
          <Animated.View style={[
            styles.profileCardWrapper,
            {
              opacity: fadeAnim,
              transform: [
                { scale: scaleAnim },
                { translateY: slideAnim }
              ]
            }
          ]}>
            <LinearGradient
              colors={['#FFFFFF', '#F8FAFC']}
              style={styles.profileCard}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <View style={styles.avatarContainer}>
                <Animated.View style={{ transform: [{ scale: avatarPulseAnim }] }}>
                  <LinearGradient
                    colors={['#2E7D5E', '#1B4D3E', '#0F2F26']}
                    style={styles.avatarGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    <Text style={styles.avatarSticker}>{avatarSticker}</Text>
                  </LinearGradient>
                </Animated.View>
              </View>
              <View style={styles.profileInfo}>
                <Text style={styles.userName}>{cleanName}</Text>
                <Text style={styles.userEmail}>{user?.email}</Text>
              </View>
              <TouchableOpacity 
                style={styles.editProfileButton}
                onPress={() => router.push('/edit-profile')}
              >
                <LinearGradient
                  colors={['#E8F5E9', '#C8E6C9']}
                  style={styles.editButtonGradient}
                >
                  <Ionicons name="create-outline" size={18} color="#2E7D5E" />
                  <Text style={styles.editProfileText}>Edit</Text>
                </LinearGradient>
              </TouchableOpacity>
            </LinearGradient>
          </Animated.View>

          {/* Account Section with animation */}
          <Animated.View style={{ 
            opacity: sectionAnims[0],
            transform: [{ translateX: slideAnim }]
          }}>
            <Text style={styles.sectionHeader}>ACCOUNT</Text>
            <View style={styles.card}>
              <SettingItem
                icon="log-out-outline"
                title="Sign Out"
                subtitle="Leave Leaflog on this device"
                onPress={handleSignOut}
                animated={true}
                fadeAnim={fadeAnim}
                slideAnim={slideAnim}
                index={0}
              />
            </View>
          </Animated.View>

          {/* Preferences Section with animation */}
          <Animated.View style={{ 
            opacity: sectionAnims[1],
            transform: [{ translateX: slideAnim }]
          }}>
            <Text style={styles.sectionHeader}>PREFERENCES</Text>
            <View style={styles.card}>
              <SettingItem
                icon="notifications-outline"
                title="Notifications"
                subtitle="Enable system reminders"
                animated={true}
                fadeAnim={fadeAnim}
                slideAnim={slideAnim}
                index={1}
                rightElement={
                  <Switch
                    value={notificationsEnabled}
                    onValueChange={handleNotificationToggle}
                    trackColor={{ false: '#E2E8F0', true: '#2E7D5E' }}
                    thumbColor="#FFFFFF"
                  />
                }
              />
            </View>
          </Animated.View>

          {/* About Section with animation */}
          <Animated.View style={{ 
            opacity: sectionAnims[2],
            transform: [{ translateX: slideAnim }]
          }}>
            <Text style={styles.sectionHeader}>ABOUT</Text>
            <View style={styles.card}>
              <View key="help">
                <SettingItem
                  icon="document-text-outline"
                  title="Help & Support"
                  onPress={() => router.push('/info/help')}
                  rightElement={<Ionicons name="chevron-forward" size={18} color="#94A3B8" />}
                  animated={true}
                  fadeAnim={fadeAnim}
                  slideAnim={slideAnim}
                  index={2}
                />
                <View style={styles.divider} />
              </View>
              <View key="privacy">
                <SettingItem
                  icon="document-text-outline"
                  title="Privacy Policy"
                  onPress={() => router.push('/info/privacy')}
                  rightElement={<Ionicons name="chevron-forward" size={18} color="#94A3B8" />}
                  animated={true}
                  fadeAnim={fadeAnim}
                  slideAnim={slideAnim}
                  index={3}
                />
                <View style={styles.divider} />
              </View>
              <View key="terms">
                <SettingItem
                  icon="document-text-outline"
                  title="Terms & Conditions"
                  onPress={() => router.push('/info/terms')}
                  rightElement={<Ionicons name="chevron-forward" size={18} color="#94A3B8" />}
                  animated={true}
                  fadeAnim={fadeAnim}
                  slideAnim={slideAnim}
                  index={4}
                />
              </View>
            </View>
          </Animated.View>

          {/* Danger Zone with animation */}
          <Animated.View style={{ 
            opacity: sectionAnims[3],
            transform: [{ translateX: slideAnim }]
          }}>
            <Text style={styles.sectionHeader}>DANGER ZONE</Text>
            <View style={[styles.card, { backgroundColor: '#fcfff5ff' }]}>
              <SettingItem
                icon="trash-outline"
                title="Delete Account"
                subtitle="Remove your data permanently"
                danger
                onPress={handleDeleteAccount}
                rightElement={<Ionicons name="chevron-forward" size={18} color="#DC2626" />}
                animated={true}
                fadeAnim={fadeAnim}
                slideAnim={slideAnim}
                index={5}
              />
            </View>
          </Animated.View>

          {/* App Version with animation */}
          <Animated.View style={{ 
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }]
          }}>
            <Text style={styles.versionText}>Leaflog v1.0.0</Text>
          </Animated.View>
        </Animated.ScrollView>
      </SafeAreaView>
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
  scrollContent: {
    paddingBottom: 20,
  },
  bgCircle1: {
    position: 'absolute',
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: 'rgba(46, 125, 94, 0.05)',
    top: -100,
    right: -100,
  },
  bgCircle2: {
    position: 'absolute',
    width: 250,
    height: 250,
    borderRadius: 125,
    backgroundColor: 'rgba(27, 77, 62, 0.05)',
    bottom: -50,
    left: -100,
  },
  bgCircle3: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(165, 214, 167, 0.1)',
    top: '40%',
    right: -50,
  },
  headerGradient: {
    paddingTop: 60,
    paddingBottom: 30,
    paddingHorizontal: 24,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    marginBottom: 20,
    overflow: 'hidden',
  },
  headerBlur: {
    padding: 20,
    borderRadius: 30,
  },
  headerContent: {
    gap: 4,
  },
  headerTitle: {
    fontSize: 34,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#A8C5B5',
  },
  profileCardWrapper: {
    marginHorizontal: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  profileCard: {
    borderRadius: 20,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarContainer: {
    marginRight: 16,
  },
  avatarGradient: {
    width: 70,
    height: 70,
    borderRadius: 35,
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
  avatarSticker: {
    color: '#FFFFFF',
    fontSize: 36,
    textAlign: 'center',
    textAlignVertical: 'center',
    includeFontPadding: false,
  },
  profileInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 2,
  },
  userEmail: {
    fontSize: 14,
    color: '#64748B',
  },
  editProfileButton: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  editButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 4,
  },
  editProfileText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2E7D5E',
  },
  sectionHeader: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748B',
    marginHorizontal: 20,
    marginBottom: 8,
    marginTop: 16,
    letterSpacing: 0.8,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    marginHorizontal: 20,
    marginBottom: 16,
    paddingVertical: 8,
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  itemTextContainer: {
    flex: 1,
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 2,
  },
  itemSub: {
    fontSize: 13,
    color: '#64748B',
  },
  divider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginLeft: 58,
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  valueText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1E293B',
  },
  versionText: {
    textAlign: 'center',
    fontSize: 13,
    color: '#94A3B8',
    marginTop: 10,
    marginBottom: 20,
  },
});