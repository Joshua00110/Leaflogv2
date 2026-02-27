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
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import * as Notifications from 'expo-notifications';

const { width } = Dimensions.get('window');

export default function NotificationPermission() {
  const router = useRouter();

  // Animation values (like fading in)
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;

  // Start animations when screen loads
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 8,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  // Go to auth screen (no permissions needed)
  const handleNavigation = () => {
    router.replace('/auth');
  };

  // Ask for notification permission, then go to auth
  const handlePermission = async () => {
    try {
      // Android needs a notification channel
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'default',
          importance: Notifications.AndroidImportance.MAX,
        });
      }
      // Ask user for permission
      const { status } = await Notifications.requestPermissionsAsync();
      console.log('Permission Status:', status);
    } catch (error) {
      console.warn('Notifications not supported. Moving to Auth.');
    } finally {
      handleNavigation(); // always go to auth screen
    }
  };

  return (
    <LinearGradient colors={['#F5F7FA', '#E8F0E8']} style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        {/* Card that fades in */}
        <Animated.View
          style={[
            styles.infoCard,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }, { scale: scaleAnim }],
            },
          ]}
        >
          <Text style={styles.kicker}>🌱 PLANT REMINDERS</Text>
          <Text style={styles.title}>Stay effortlessly on track</Text>
          <Text style={styles.description}>
            Turn on notifications so Leaflog can nudge you before chores pile up.
          </Text>
        </Animated.View>

        {/* Picture that slides in */}
        <Animated.View
          style={[
            styles.illustrationContainer,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <Image
            source={{
              uri: 'https://img.freepik.com/free-vector/watering-plant-concept-illustration_114360-2445.jpg',
            }}
            style={styles.image}
            resizeMode="contain"
          />
        </Animated.View>

        {/* Buttons that fade in */}
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
              colors={['#2E7D5E', '#1B4D3E']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.primaryButton}
            >
              <Text style={styles.primaryButtonText}>Enable Notifications</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={handleNavigation}
            activeOpacity={0.7}
          >
            <Text style={styles.secondaryButtonText}>Maybe later</Text>
          </TouchableOpacity>
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
    paddingVertical: 40,
  },
  infoCard: {
    backgroundColor: '#FFFFFF',
    width: width * 0.85,
    padding: 25,
    borderRadius: 30,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 4,
    marginTop: 20,
  },
  kicker: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2E7D5E',
    marginBottom: 8,
    letterSpacing: 1,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 12,
    textAlign: 'center',
  },
  description: {
    fontSize: 16,
    color: '#64748B',
    lineHeight: 22,
    textAlign: 'center',
  },
  illustrationContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  image: {
    width: width * 0.7,
    height: width * 0.7,
    maxHeight: 300,
  },
  footer: {
    width: '100%',
    paddingHorizontal: 30,
    alignItems: 'center',
  },
  buttonWrapper: {
    width: '100%',
    borderRadius: 30,
    overflow: 'hidden',
    shadowColor: '#2E7D5E',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
    marginBottom: 12,
  },
  primaryButton: {
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  secondaryButton: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 30,
    borderWidth: 1,
    borderColor: '#94A3B8',
    width: '100%',
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#2E7D5E',
    fontSize: 16,
    fontWeight: '600',
  },
});