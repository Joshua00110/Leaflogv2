import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  SafeAreaView,
  Platform,
  Animated,
  Dimensions,
  Alert,
  StatusBar,
  Easing,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import * as Notifications from 'expo-notifications';

// Import local image
const plantImage = require('../assets/images/gardening.png'); // Adjust path as needed

// Set notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySoundInForeground: true,
  }),
});

const { width } = Dimensions.get('window');

export default function NotificationPermission() {
  const router = useRouter();

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const floatAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const bellAnim = useRef(new Animated.Value(0)).current;
  const leaf1Anim = useRef(new Animated.Value(0)).current;
  const leaf2Anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
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
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 1200,
        useNativeDriver: true,
        easing: Easing.elastic(1),
      }),
    ]).start();

    // Floating animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
          easing: Easing.inOut(Easing.sin),
        }),
        Animated.timing(floatAnim, {
          toValue: 0,
          duration: 2000,
          useNativeDriver: true,
          easing: Easing.inOut(Easing.sin),
        }),
      ])
    ).start();

    // Pulse animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 800,
          useNativeDriver: true,
          easing: Easing.inOut(Easing.sin),
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
          easing: Easing.inOut(Easing.sin),
        }),
      ])
    ).start();

    // Bell animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(bellAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(bellAnim, {
          toValue: -1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(bellAnim, {
          toValue: 0.5,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(bellAnim, {
          toValue: -0.5,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(bellAnim, {
          toValue: 0,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.delay(2000),
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
          duration: 2500,
          useNativeDriver: true,
          easing: Easing.inOut(Easing.sin),
        }),
        Animated.timing(leaf2Anim, {
          toValue: 0,
          duration: 2500,
          useNativeDriver: true,
          easing: Easing.inOut(Easing.sin),
        }),
      ])
    ).start();
  }, []);

  const rotate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['-3deg', '0deg'],
  });

  const float = floatAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -15],
  });

  const bellRotate = bellAnim.interpolate({
    inputRange: [-1, 0, 1],
    outputRange: ['-10deg', '0deg', '10deg'],
  });

  const leaf1Rotate = leaf1Anim.interpolate({
    inputRange: [0, 1],
    outputRange: ['-2deg', '4deg'],
  });

  const leaf2Rotate = leaf2Anim.interpolate({
    inputRange: [0, 1],
    outputRange: ['3deg', '-2deg'],
  });

  const handleNavigation = () => {
    router.replace('/auth');
  };

  const handlePermission = async () => {
    try {
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'default',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#2E7D5E',
        });
      }

      const { status } = await Notifications.requestPermissionsAsync();
      
      if (status === 'granted') {
        const token = (await Notifications.getExpoPushTokenAsync()).data;
        console.log('Push token:', token);
        
        await Notifications.scheduleNotificationAsync({
          content: {
            title: "🌱 Notifications Enabled!",
            body: "You'll now receive reminders for your plants.",
            data: { screen: 'home' },
          },
          trigger: null,
        });

        Alert.alert(
          "✨ Success!",
          "You'll now receive plant care reminders.",
          [{ text: "Continue", onPress: handleNavigation }]
        );
      } else {
        Alert.alert(
          "🔔 Notifications Disabled",
          "You can enable them later in Settings if you change your mind.",
          [{ text: "Continue", onPress: handleNavigation }]
        );
      }
    } catch (error) {
      console.warn('Notifications error:', error);
      handleNavigation();
    }
  };

  return (
    <LinearGradient 
      colors={['#E8F5E9', '#C8E6C9', '#A5D6A7']} 
      style={styles.container}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      
      {/* Decorative background elements */}
      <Animated.View style={[styles.bgCircle1, { transform: [{ scale: pulseAnim }] }]} />
      <View style={styles.bgCircle2} />
      <View style={styles.bgCircle3} />

      <SafeAreaView style={styles.safeArea}>
        {/* Animated Bell Icon */}
        <Animated.View style={[styles.bellContainer, { transform: [{ rotate: bellRotate }] }]}>
          <BlurView intensity={20} tint="light" style={styles.bellBlur}>
            <Text style={styles.bellIcon}>🔔</Text>
          </BlurView>
        </Animated.View>

        {/* Main Content Container */}
        <View style={styles.mainContent}>
          {/* Info Card */}
          <Animated.View
            style={[
              styles.infoCard,
              {
                opacity: fadeAnim,
                transform: [
                  { translateY: slideAnim },
                  { scale: scaleAnim },
                  { rotate },
                ],
              },
            ]}
          >
            <BlurView intensity={80} tint="light" style={styles.cardBlur}>
              <View style={styles.kickerContainer}>
                <View style={styles.kickerLine} />
                <Text style={styles.kicker}>🌱 PLANT REMINDERS</Text>
                <View style={styles.kickerLine} />
              </View>
              
              <Text style={styles.title}>Never Miss a Watering</Text>
              
              <View style={styles.benefitsContainer}>
                <View style={styles.benefitItem}>
                  <Text style={styles.benefitIcon}>💧</Text>
                  <Text style={styles.benefitText}>Watering</Text>
                </View>
                <View style={styles.benefitItem}>
                  <Text style={styles.benefitIcon}>🌿</Text>
                  <Text style={styles.benefitText}>Feeding</Text>
                </View>
                <View style={styles.benefitItem}>
                  <Text style={styles.benefitIcon}>✨</Text>
                  <Text style={styles.benefitText}>Care Tips</Text>
                </View>
              </View>

              <Text style={styles.description}>
                Get gentle reminders when your plants need attention
              </Text>

              {/* Decorative leaves */}
              <View style={styles.decorativeLeaves}>
                <Animated.Text 
                  style={[
                    styles.leafIcon,
                    { transform: [{ rotate: leaf1Rotate }] }
                  ]}
                >
                  🌿
                </Animated.Text>
                <Animated.Text 
                  style={[
                    styles.leafIcon,
                    { transform: [{ rotate: leaf2Rotate }] }
                  ]}
                >
                  🌱
                </Animated.Text>
              </View>
            </BlurView>
          </Animated.View>

          {/* Local Image with floating animation */}
          <Animated.View
            style={[
              styles.illustrationContainer,
              {
                opacity: fadeAnim,
                transform: [
                  { translateY: float },
                  { scale: scaleAnim },
                ],
              },
            ]}
          >
            <View style={styles.imageWrapper}>
              <Image
                source={plantImage}
                style={styles.image}
                resizeMode="contain"
              />
              
              {/* Floating water drops */}
              <Animated.View style={[styles.waterDrop1, { transform: [{ translateY: floatAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [0, -10],
              }) }] }]} />
              <Animated.View style={[styles.waterDrop2, { transform: [{ translateY: floatAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [0, -15],
              }) }] }]} />
            </View>
          </Animated.View>
        </View>

        {/* Footer with buttons and consent */}
        <Animated.View
          style={[
            styles.footer,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={handlePermission}
            style={styles.buttonWrapper}
          >
            <LinearGradient
              colors={['#2E7D5E', '#1B4D3E', '#0F2F26']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.primaryButton}
            >
              <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
                <Text style={styles.primaryButtonText}>🔔 Enable Notifications</Text>
              </Animated.View>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={handleNavigation}
            activeOpacity={0.7}
          >
            <Text style={styles.secondaryButtonText}>Maybe later</Text>
          </TouchableOpacity>

          {/* Consent Text */}
          <View style={styles.consentContainer}>
            <Text style={styles.consentIcon}>📋</Text>
            <Text style={styles.consentText}>
              By tapping "Enable", you agree to receive plant care reminders
            </Text>
          </View>

          {/* Privacy note */}
          <Text style={styles.privacyNote}>
            We respect your privacy • No spam
          </Text>
        </Animated.View>
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
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 20,
  },
  mainContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  bgCircle1: {
    position: 'absolute',
    width: 250,
    height: 250,
    borderRadius: 125,
    backgroundColor: 'rgba(46, 125, 94, 0.1)',
    top: -50,
    right: -80,
  },
  bgCircle2: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(27, 77, 62, 0.1)',
    bottom: 100,
    left: -60,
  },
  bgCircle3: {
    position: 'absolute',
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: 'rgba(165, 214, 167, 0.3)',
    top: '30%',
    right: -40,
  },
  bellContainer: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 10,
  },
  bellBlur: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  bellIcon: {
    fontSize: 24,
  },
  infoCard: {
    width: width * 0.85,
    borderRadius: 40,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10,
    marginBottom: 15,
  },
  cardBlur: {
    padding: 20,
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
  },
  kickerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  kickerLine: {
    width: 15,
    height: 1,
    backgroundColor: '#2E7D5E',
  },
  kicker: {
    fontSize: 11,
    fontWeight: '700',
    color: '#2E7D5E',
    letterSpacing: 0.8,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1B4D3E',
    marginBottom: 15,
    textAlign: 'center',
    fontFamily: Platform.OS === 'ios' ? 'Didot' : 'serif',
  },
  benefitsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 25,
    marginBottom: 15,
  },
  benefitItem: {
    alignItems: 'center',
    gap: 3,
  },
  benefitIcon: {
    fontSize: 22,
  },
  benefitText: {
    fontSize: 11,
    color: '#2E7D5E',
    fontWeight: '500',
  },
  description: {
    fontSize: 14,
    color: '#4A665A',
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: 12,
    paddingHorizontal: 5,
  },
  decorativeLeaves: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 15,
  },
  leafIcon: {
    fontSize: 18,
    opacity: 0.7,
  },
  illustrationContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    marginBottom: 10,
  },
  imageWrapper: {
    position: 'relative',
    width: width * 0.6,
    height: width * 0.6,
    maxHeight: 200,
    justifyContent: 'center',
    alignItems: 'center',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  waterDrop1: {
    position: 'absolute',
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#4A90E2',
    top: '20%',
    right: '20%',
    opacity: 0.4,
  },
  waterDrop2: {
    position: 'absolute',
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#4A90E2',
    bottom: '30%',
    left: '15%',
    opacity: 0.3,
  },
  footer: {
    width: '100%',
    paddingHorizontal: 25,
    alignItems: 'center',
    paddingBottom: 10,
  },
  buttonWrapper: {
    width: '100%',
    borderRadius: 30,
    overflow: 'hidden',
    shadowColor: '#2E7D5E',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
    marginBottom: 10,
  },
  primaryButton: {
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  secondaryButton: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 30,
    borderWidth: 2,
    borderColor: '#2E7D5E',
    width: '100%',
    alignItems: 'center',
    marginBottom: 15,
    backgroundColor: 'rgba(255,255,255,0.9)',
  },
  secondaryButtonText: {
    color: '#2E7D5E',
    fontSize: 15,
    fontWeight: '600',
  },
  consentContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(46, 125, 94, 0.1)',
    padding: 12,
    borderRadius: 20,
    marginBottom: 10,
    gap: 8,
    width: '100%',
  },
  consentIcon: {
    fontSize: 18,
  },
  consentText: {
    flex: 1,
    fontSize: 11,
    color: '#2E7D5E',
    lineHeight: 16,
  },
  privacyNote: {
    fontSize: 10,
    color: '#94A3B8',
    textAlign: 'center',
    fontStyle: 'italic',
  },
});