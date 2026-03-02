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
  StatusBar,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Platform } from 'react-native';
const { width, height } = Dimensions.get('window');

export default function LandingPage() {
  const router = useRouter();

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const slideUpAnim = useRef(new Animated.Value(50)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const floatAnim = useRef(new Animated.Value(0)).current;
  const leaf1Anim = useRef(new Animated.Value(0)).current;
  const leaf2Anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Entrance animation sequence
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
      Animated.timing(slideUpAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
        easing: Easing.out(Easing.back(1.5)),
      }),
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 1200,
        useNativeDriver: true,
        easing: Easing.elastic(1),
      }),
    ]).start();

    // Floating animation for plant (infinite)
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

  const spin = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['-5deg', '0deg'],
  });

  const float = floatAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -15],
  });

  const leaf1Rotate = leaf1Anim.interpolate({
    inputRange: [0, 1],
    outputRange: ['-2deg', '2deg'],
  });

  const leaf2Rotate = leaf2Anim.interpolate({
    inputRange: [0, 1],
    outputRange: ['3deg', '-1deg'],
  });

  return (
    <LinearGradient 
      colors={['#E8F5E9', '#C8E6C9', '#A5D6A7']} 
      style={styles.container}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      
      {/* Decorative background elements */}
      <View style={styles.bgCircle1} />
      <View style={styles.bgCircle2} />
      
      <SafeAreaView style={styles.safeArea}>
        {/* Brand Card with enhanced animation */}
        <Animated.View
          style={[
            styles.brandCard,
            {
              opacity: fadeAnim,
              transform: [
                { scale: scaleAnim },
                { translateY: slideUpAnim },
                { rotate: spin },
              ],
            },
          ]}
        >
          <BlurView intensity={20} tint="light" style={styles.blurContainer}>
            <Text style={styles.brandTitle}>leaflog</Text>
            <View style={styles.titleUnderline} />
            <Text style={styles.brandSubtitle}>
              Simple coordination.{'\n'}Thriving plants.
            </Text>
            
            {/* Decorative leaf icons */}
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

        {/* Enhanced Illustration with floating animation */}
        <Animated.View
          style={[
            styles.illustrationContainer,
            {
              opacity: fadeAnim,
              transform: [
                {
                  translateY: floatAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, -15],
                  }),
                },
              ],
            },
          ]}
        >
          <View style={styles.imageWrapper}>
            <Image
              source={{
                uri: 'https://img.freepik.com/free-vector/houseplant-with-pot-illustration_33099-33873.jpg',
              }}
              style={styles.image}
              resizeMode="contain"
            />
            
            {/* Decorative dots around the plant */}
            <View style={styles.dot1} />
            <View style={styles.dot2} />
            <View style={styles.dot3} />
          </View>
        </Animated.View>

        {/* Enhanced Footer with button */}
        <Animated.View
          style={[
            styles.footer,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideUpAnim }],
            },
          ]}
        >
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => router.push('/notifications')}
            style={styles.buttonWrapper}
          >
            <LinearGradient
              colors={['#2E7D5E', '#1B4D3E', '#0F2F26']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.button}
            >
              <Text style={styles.buttonText}>Get Started</Text>
              <Animated.View style={styles.buttonArrow}>
                <Text style={styles.arrowText}>→</Text>
              </Animated.View>
            </LinearGradient>
          </TouchableOpacity>

          <View style={styles.legalContainer}>
            <Text style={styles.legalText}>
              By continuing you accept our{' '}
              <Text style={styles.legalLink}>Privacy Policy</Text> and{' '}
              <Text style={styles.legalLink}>Terms</Text>
            </Text>
          </View>
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
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  bgCircle1: {
    position: 'absolute',
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: 'rgba(46, 125, 94, 0.1)',
    top: -50,
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
  brandCard: {
    width: width * 0.9,
    borderRadius: 40,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10,
  },
  blurContainer: {
    paddingVertical: 35,
    paddingHorizontal: 25,
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
  },
  brandTitle: {
    fontSize: 52,
    fontWeight: '200',
    color: '#1B4D3E',
    letterSpacing: 4,
    textTransform: 'lowercase',
    marginBottom: 10,
    fontFamily: Platform.OS === 'ios' ? 'Didot' : 'serif',
  },
  titleUnderline: {
    width: 60,
    height: 2,
    backgroundColor: '#2E7D5E',
    marginBottom: 15,
    borderRadius: 1,
  },
  brandSubtitle: {
    fontSize: 18,
    color: '#2E7D5E',
    textAlign: 'center',
    lineHeight: 26,
    fontWeight: '400',
    letterSpacing: 0.5,
    marginBottom: 15,
  },
  decorativeLeaves: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 5,
    gap: 15,
  },
  leafIcon: {
    fontSize: 24,
  },
  illustrationContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    marginVertical: 20,
  },
  imageWrapper: {
    position: 'relative',
    width: width * 0.8,
    height: width * 0.8,
    maxHeight: 350,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  dot1: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#2E7D5E',
    top: '20%',
    right: '10%',
    opacity: 0.3,
  },
  dot2: {
    position: 'absolute',
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#1B4D3E',
    bottom: '30%',
    left: '5%',
    opacity: 0.2,
  },
  dot3: {
    position: 'absolute',
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#A5D6A7',
    top: '60%',
    right: '15%',
    opacity: 0.4,
  },
  footer: {
    width: '100%',
    alignItems: 'center',
  },
  buttonWrapper: {
    width: '100%',
    borderRadius: 35,
    overflow: 'hidden',
    shadowColor: '#2E7D5E',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
    elevation: 8,
  },
  button: {
    paddingVertical: 20,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '600',
    letterSpacing: 1,
    marginRight: 10,
  },
  buttonArrow: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  arrowText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '300',
  },
  legalContainer: {
    marginTop: 20,
    paddingHorizontal: 20,
  },
  legalText: {
    fontSize: 13,
    color: '#4A665A',
    textAlign: 'center',
    lineHeight: 18,
  },
  legalLink: {
    color: '#1B4D3E',
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
});