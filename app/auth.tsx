import React, { useState, useEffect, useRef } from 'react';
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
  Dimensions,
  StatusBar,
  Easing,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { auth, db } from '../firebaseConfig';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';

const { width, height } = Dimensions.get('window');

export default function AuthScreen() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const leaf1Anim = useRef(new Animated.Value(0)).current;
  const leaf2Anim = useRef(new Animated.Value(0)).current;
  const inputFocusAnim = useRef(new Animated.Value(0)).current;
  const buttonPulse = useRef(new Animated.Value(1)).current;

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
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 1200,
        useNativeDriver: true,
        easing: Easing.elastic(1),
      }),
    ]).start();

    // Leaf animations (continuous)
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

    // Button pulse animation
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

  const handleFocus = () => {
    Animated.spring(inputFocusAnim, {
      toValue: 1,
      friction: 5,
      useNativeDriver: true,
    }).start();
  };

  const handleBlur = () => {
    Animated.spring(inputFocusAnim, {
      toValue: 0,
      friction: 5,
      useNativeDriver: true,
    }).start();
  };

  const rotate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['-2deg', '0deg'],
  });

  const leaf1Rotate = leaf1Anim.interpolate({
    inputRange: [0, 1],
    outputRange: ['-3deg', '3deg'],
  });

  const leaf2Rotate = leaf2Anim.interpolate({
    inputRange: [0, 1],
    outputRange: ['4deg', '-2deg'],
  });

  const inputScale = inputFocusAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.02],
  });

  const handleAuth = async () => {
    if (!email || !password || (!isLogin && !name)) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        await setDoc(doc(db, 'users', userCredential.user.uid), {
          name: name,
          email: email,
          createdAt: new Date().toISOString(),
        });
      }
      router.replace('/(tabs)');
    } catch (error: any) {
      Alert.alert('Authentication Failed', error.message);
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
      <Animated.View style={[styles.bgCircle1, { transform: [{ scale: buttonPulse }] }]} />
      <View style={styles.bgCircle2} />
      <View style={styles.bgCircle3} />

      {/* Floating leaves decoration */}
      <Animated.View style={[styles.floatingLeaf1, { transform: [{ rotate: leaf1Rotate }] }]}>
        <Text style={styles.leafEmoji}>🌿</Text>
      </Animated.View>
      <Animated.View style={[styles.floatingLeaf2, { transform: [{ rotate: leaf2Rotate }] }]}>
        <Text style={styles.leafEmoji}>🌱</Text>
      </Animated.View>

      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Logo/Brand Section */}
            <Animated.View
              style={[
                styles.logoSection,
                {
                  opacity: fadeAnim,
                  transform: [{ translateY: slideAnim }, { rotate }],
                },
              ]}
            >
              <LinearGradient
                colors={['#2E7D5E', '#1B4D3E']}
                style={styles.logoCircle}
              >
                <Text style={styles.logoText}>🌱</Text>
              </LinearGradient>
              <Text style={styles.logoName}>leaflog</Text>
            </Animated.View>

            {/* Animated Header */}
            <Animated.View
              style={[
                styles.headerSection,
                {
                  opacity: fadeAnim,
                  transform: [{ translateY: slideAnim }],
                },
              ]}
            >
              <Text style={styles.title}>
                {isLogin ? 'Welcome Back!' : 'Join Leaflog'}
              </Text>
              <Text style={styles.subtitle}>
                {isLogin
                  ? 'Log in to continue your plant journey'
                  : 'Create an account to start tracking your plants'}
              </Text>
            </Animated.View>

            {/* Animated Form Card */}
            <Animated.View
              style={[
                styles.formCard,
                {
                  opacity: fadeAnim,
                  transform: [{ translateY: slideAnim }, { scale: scaleAnim }],
                },
              ]}
            >
              <BlurView intensity={80} tint="light" style={styles.cardBlur}>
                {!isLogin && (
                  <Animated.View style={{ transform: [{ scale: inputScale }] }}>
                    <View style={styles.inputWrapper}>
                      <Ionicons
                        name="person-outline"
                        size={20}
                        color="#2E7D5E"
                        style={styles.inputIcon}
                      />
                      <TextInput
                        style={styles.input}
                        placeholder="Full Name"
                        placeholderTextColor="#94A3B8"
                        value={name}
                        onChangeText={setName}
                        onFocus={handleFocus}
                        onBlur={handleBlur}
                      />
                    </View>
                  </Animated.View>
                )}

                <Animated.View style={{ transform: [{ scale: inputScale }] }}>
                  <View style={styles.inputWrapper}>
                    <Ionicons
                      name="mail-outline"
                      size={20}
                      color="#2E7D5E"
                      style={styles.inputIcon}
                    />
                    <TextInput
                      style={styles.input}
                      placeholder="Email Address"
                      placeholderTextColor="#94A3B8"
                      value={email}
                      onChangeText={setEmail}
                      autoCapitalize="none"
                      keyboardType="email-address"
                      onFocus={handleFocus}
                      onBlur={handleBlur}
                    />
                  </View>
                </Animated.View>

                <Animated.View style={{ transform: [{ scale: inputScale }] }}>
                  <View style={styles.inputWrapper}>
                    <Ionicons
                      name="lock-closed-outline"
                      size={20}
                      color="#2E7D5E"
                      style={styles.inputIcon}
                    />
                    <TextInput
                      style={styles.input}
                      placeholder="Password"
                      placeholderTextColor="#94A3B8"
                      value={password}
                      onChangeText={setPassword}
                      secureTextEntry={!showPassword}
                      onFocus={handleFocus}
                      onBlur={handleBlur}
                    />
                    <TouchableOpacity
                      onPress={() => setShowPassword(!showPassword)}
                      style={styles.eyeIcon}
                    >
                      <Ionicons
                        name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                        size={20}
                        color="#2E7D5E"
                      />
                    </TouchableOpacity>
                  </View>
                </Animated.View>

                {/* Forgot Password (only for login) */}
                {isLogin && (
                  <TouchableOpacity style={styles.forgotPassword}>
                    <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
                  </TouchableOpacity>
                )}

                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={handleAuth}
                  style={styles.buttonWrapper}
                >
                  <Animated.View style={{ transform: [{ scale: buttonPulse }] }}>
                    <LinearGradient
                      colors={['#2E7D5E', '#1B4D3E', '#0F2F26']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.primaryButton}
                    >
                      <Text style={styles.buttonText}>
                        {isLogin ? 'Log In' : 'Create Account'}
                      </Text>
                    </LinearGradient>
                  </Animated.View>
                </TouchableOpacity>

                {/* Divider */}
                <View style={styles.divider}>
                  <View style={styles.dividerLine} />
                  <Text style={styles.dividerText}>or</Text>
                  <View style={styles.dividerLine} />
                </View>

                {/* Social login placeholder */}
                <View style={styles.socialContainer}>
                  <TouchableOpacity style={styles.socialButton}>
                    <Ionicons name="logo-google" size={24} color="#DB4437" />
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.socialButton}>
                    <Ionicons name="logo-apple" size={24} color="#000000" />
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.socialButton}>
                    <Ionicons name="logo-facebook" size={24} color="#4267B2" />
                  </TouchableOpacity>
                </View>
              </BlurView>
            </Animated.View>

            {/* Toggle between login/signup */}
            <TouchableOpacity
              onPress={() => setIsLogin(!isLogin)}
              style={styles.toggleButton}
            >
              <Text style={styles.toggleText}>
                {isLogin
                  ? "Don't have an account? "
                  : 'Already have an account? '}
                <Text style={styles.toggleHighlight}>
                  {isLogin ? 'Sign up' : 'Log in'}
                </Text>
              </Text>
            </TouchableOpacity>

            {/* Terms and privacy */}
            <Text style={styles.termsText}>
              By continuing, you agree to our{' '}
              <Text style={styles.termsLink}>Terms of Service</Text> and{' '}
              <Text style={styles.termsLink}>Privacy Policy</Text>
            </Text>
          </ScrollView>
        </KeyboardAvoidingView>
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
    alignItems: 'center',
    paddingVertical: 50,
    paddingHorizontal: 20,
  },
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
    backgroundColor: 'rgba(165, 214, 167, 0.3)',
    top: '40%',
    right: -50,
  },
  floatingLeaf1: {
    position: 'absolute',
    top: 100,
    left: 20,
  },
  floatingLeaf2: {
    position: 'absolute',
    bottom: 150,
    right: 20,
  },
  leafEmoji: {
    fontSize: 30,
    opacity: 0.5,
  },
  logoSection: {
    alignItems: 'center',
    marginBottom: 20,
  },
  logoCircle: {
    width: 70,
    height: 70,
    borderRadius: 35,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
    shadowColor: '#2E7D5E',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  logoText: {
    fontSize: 35,
  },
  logoName: {
    fontSize: 24,
    fontWeight: '300',
    color: '#1B4D3E',
    letterSpacing: 2,
    textTransform: 'lowercase',
  },
  headerSection: {
    marginBottom: 25,
    alignItems: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#1B4D3E',
    marginBottom: 8,
    letterSpacing: -0.5,
    fontFamily: Platform.OS === 'ios' ? 'Didot' : 'serif',
  },
  subtitle: {
    fontSize: 15,
    color: '#4A665A',
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  formCard: {
    width: width * 0.9,
    borderRadius: 40,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10,
    marginBottom: 20,
  },
  cardBlur: {
    padding: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 15,
    paddingHorizontal: 15,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#E8F0E8',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 4,
    elevation: 2,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    paddingVertical: 15,
    fontSize: 15,
    color: '#1E293B',
  },
  eyeIcon: {
    padding: 8,
  },
  forgotPassword: {
    alignSelf: 'flex-end',
    marginBottom: 20,
  },
  forgotPasswordText: {
    color: '#2E7D5E',
    fontSize: 13,
    fontWeight: '500',
  },
  buttonWrapper: {
    width: '100%',
    borderRadius: 30,
    overflow: 'hidden',
    shadowColor: '#2E7D5E',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
    marginTop: 5,
  },
  primaryButton: {
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E2E8F0',
  },
  dividerText: {
    marginHorizontal: 10,
    color: '#94A3B8',
    fontSize: 14,
  },
  socialContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
  },
  socialButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  toggleButton: {
    padding: 16,
    marginBottom: 10,
  },
  toggleText: {
    color: '#4A665A',
    fontSize: 15,
    fontWeight: '500',
  },
  toggleHighlight: {
    color: '#2E7D5E',
    fontWeight: '700',
  },
  termsText: {
    fontSize: 11,
    color: '#94A3B8',
    textAlign: 'center',
    paddingHorizontal: 20,
    lineHeight: 16,
  },
  termsLink: {
    color: '#2E7D5E',
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
});