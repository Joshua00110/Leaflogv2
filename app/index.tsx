import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  SafeAreaView,
  Dimensions,
  Animated,
  Easing,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

export default function LandingPage() {
  const router = useRouter();

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const buttonPulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Entrance animation sequence
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
    ]).start();

    // Button pulse animation (infinite loop)
    Animated.loop(
      Animated.sequence([
        Animated.timing(buttonPulse, {
          toValue: 1.05,
          duration: 1000,
          useNativeDriver: true,
          easing: Easing.inOut(Easing.ease),
        }),
        Animated.timing(buttonPulse, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
          easing: Easing.inOut(Easing.ease),
        }),
      ])
    ).start();
  }, []);

  return (
    <LinearGradient colors={['#F5F7FA', '#E8F0E8']} style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        {/* Brand Card with animation */}
        <Animated.View
          style={[
            styles.brandCard,
            {
              opacity: fadeAnim,
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          <Text style={styles.brandTitle}>leaflog</Text>
          <Text style={styles.brandSubtitle}>
            Simple coordination. Thriving plants.
          </Text>
        </Animated.View>

        {/* Illustration with animation (slight delay) */}
        <Animated.View
          style={[
            styles.illustrationContainer,
            {
              opacity: fadeAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [0, 1],
              }),
              transform: [
                {
                  translateY: fadeAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [50, 0],
                  }),
                },
              ],
            },
          ]}
        >
          <Image
            source={{
              uri: 'https://img.freepik.com/free-vector/houseplant-with-pot-illustration_33099-33873.jpg',
            }}
            style={styles.image}
            resizeMode="contain"
          />
        </Animated.View>

        {/* Footer with animated button */}
        <Animated.View
          style={[
            styles.footer,
            {
              opacity: fadeAnim,
              transform: [{ scale: buttonPulse }],
            },
          ]}
        >
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => router.push('/notifications')}
            style={styles.buttonWrapper}
          >
            <LinearGradient
              colors={['#2E7D5E', '#1B4D3E']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.button}
            >
              <Text style={styles.buttonText}>Get Started</Text>
            </LinearGradient>
          </TouchableOpacity>

          <Text style={styles.legalText}>
            By continuing you accept our Privacy Policy and Terms
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
    paddingVertical: 40,
  },
  brandCard: {
    backgroundColor: '#FFFFFF',
    width: width * 0.85,
    paddingVertical: 30,
    paddingHorizontal: 20,
    borderRadius: 30,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 4,
    marginTop: 20,
  },
  brandTitle: {
    fontSize: 42,
    fontWeight: '300',
    color: '#1B4D3E',
    letterSpacing: 2,
    textTransform: 'lowercase',
    marginBottom: 8,
  },
  brandSubtitle: {
    fontSize: 16,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 22,
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
    maxHeight: 350,
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
  },
  button: {
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  legalText: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 16,
    textAlign: 'center',
  },
});