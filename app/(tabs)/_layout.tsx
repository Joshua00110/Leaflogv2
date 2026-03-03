import React, { useEffect, useRef } from 'react';
import { Tabs, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { View, StyleSheet, Animated, Easing, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { auth } from '../../firebaseConfig';

const { width } = Dimensions.get('window');

export default function TabLayout() {
  const router = useRouter();

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const pulseAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) {
      router.replace('/auth');
    }

    // Entrance animation
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
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();

    // Pulse animation for FAB
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
  }, []);

  const pulse = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.05],
  });

  return (
    <Animated.View 
      style={[
        styles.container,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        }
      ]}
    >
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarStyle: styles.tabBar,
          tabBarBackground: () => (
            <BlurView intensity={80} tint="light" style={StyleSheet.absoluteFill}>
              <LinearGradient
                colors={['rgba(255,255,255,0.9)', 'rgba(248,250,252,0.95)']}
                style={StyleSheet.absoluteFill}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              />
            </BlurView>
          ),
          tabBarActiveTintColor: '#2E7D5E',
          tabBarInactiveTintColor: '#94A3B8',
          tabBarShowLabel: true,
          tabBarLabelStyle: styles.tabLabel,
          tabBarItemStyle: styles.tabItem,
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: 'Spaces',
            tabBarIcon: ({ color, focused }) => (
              <Animated.View 
                style={[
                  styles.iconContainer, 
                  focused && styles.activeIconContainer,
                  {
                    transform: [{ scale: focused ? scaleAnim : 1 }],
                  }
                ]}
              >
                {focused && (
                  <LinearGradient
                    colors={['#E8F5E9', '#C8E6C9']}
                    style={styles.iconGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  />
                )}
                <Ionicons 
                  name={focused ? "grid" : "grid-outline"} 
                  size={22} 
                  color={focused ? '#2E7D5E' : color} 
                />
              </Animated.View>
            ),
          }}
        />
        <Tabs.Screen
          name="plants"
          options={{
            title: 'Plants',
            tabBarIcon: ({ color, focused }) => (
              <Animated.View 
                style={[
                  styles.iconContainer, 
                  focused && styles.activeIconContainer,
                  {
                    transform: [{ scale: focused ? scaleAnim : 1 }],
                  }
                ]}
              >
                {focused && (
                  <LinearGradient
                    colors={['#E8F5E9', '#C8E6C9']}
                    style={styles.iconGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  />
                )}
                <Ionicons 
                  name={focused ? "leaf" : "leaf-outline"} 
                  size={22} 
                  color={focused ? '#2E7D5E' : color} 
                />
              </Animated.View>
            ),
          }}
        />
        <Tabs.Screen
          name="add"
          options={{
            title: '',
            tabBarIcon: ({ focused }) => (
              <Animated.View style={{ transform: [{ scale: focused ? pulse : 1 }] }}>
                <LinearGradient
                  colors={focused ? ['#2E7D5E', '#1B4D3E'] : ['#E2E8F0', '#CBD5E1']}
                  style={styles.fabButton}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <Ionicons 
                    name="add" 
                    size={28} 
                    color={focused ? '#FFFFFF' : '#64748B'} 
                  />
                </LinearGradient>
              </Animated.View>
            ),
          }}
        />
        <Tabs.Screen
          name="settings"
          options={{
            title: 'Settings',
            tabBarIcon: ({ color, focused }) => (
              <Animated.View 
                style={[
                  styles.iconContainer, 
                  focused && styles.activeIconContainer,
                  {
                    transform: [{ scale: focused ? scaleAnim : 1 }],
                  }
                ]}
              >
                {focused && (
                  <LinearGradient
                    colors={['#E8F5E9', '#C8E6C9']}
                    style={styles.iconGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  />
                )}
                <Ionicons 
                  name={focused ? "person" : "person-outline"} 
                  size={22} 
                  color={focused ? '#2E7D5E' : color} 
                />
              </Animated.View>
            ),
          }}
        />
      </Tabs>

      {/* Decorative floating leaf at the bottom */}
      <Animated.View 
        style={[
          styles.floatingLeaf,
          {
            transform: [
              { 
                translateX: pulseAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, 10],
                })
              },
              {
                translateY: pulseAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, -5],
                })
              },
              {
                rotate: pulseAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: ['-2deg', '2deg'],
                })
              }
            ],
            opacity: 0.2,
          }
        ]}
      >
        <Ionicons name="leaf" size={24} color="#2E7D5E" />
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  tabBar: {
    position: 'absolute',
    bottom: 0,
    left: 20,
    right: 20,
    height: 70,
    backgroundColor: 'transparent',
    borderRadius: 35,
    borderTopWidth: 0,
    elevation: 0,
    shadowColor: '#2E7D5E',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    paddingHorizontal: 10,
    paddingBottom: 8,
    paddingTop: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
    letterSpacing: 0.3,
  },
  tabItem: {
    paddingVertical: 4,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    position: 'relative',
  },
  iconGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 20,
  },
  activeIconContainer: {
    shadowColor: '#2E7D5E',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  fabButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: -20,
    shadowColor: '#2E7D5E',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  floatingLeaf: {
    position: 'absolute',
    bottom: 30,
    right: 30,
    zIndex: -1,
  },
});