import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  Animated,
  Dimensions,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { db } from '../firebaseConfig';
import { doc, updateDoc, deleteDoc } from 'firebase/firestore';

const { width } = Dimensions.get('window');

export default function EditSpace() {
  const { id, name, light } = useLocalSearchParams();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [spaceName, setSpaceName] = useState(name as string);
  const [lightCondition, setLightCondition] = useState(light as string);

  // Animation
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handleUpdate = async () => {
    if (!spaceName) {
      Alert.alert('Error', 'Space name cannot be empty');
      return;
    }

    try {
      const spaceRef = doc(db, 'spaces', id as string);
      await updateDoc(spaceRef, {
        name: spaceName,
        lightCondition: lightCondition,
      });
      router.back();
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'Could not update space');
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Space',
      'Are you sure? This will not delete the plants inside, but they will lose their space connection.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteDoc(doc(db, 'spaces', id as string));
              router.replace('/(tabs)');
            } catch (error) {
              console.error('Delete failed:', error);
              Alert.alert('Error', 'Could not delete space.');
            }
          },
        },
      ]
    );
  };

  const lightOptions = ['Full Sun', 'Partial Shade', 'Low Light'];

  return (
    <View style={styles.container}>
      {/* Gradient Header */}
      <LinearGradient
        colors={['#1B4D3E', '#0F2F26']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.headerGradient, { paddingTop: insets.top + 20 }]}
      >
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={() => router.back()} style={styles.iconButton}>
            <Ionicons name="close" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Edit Space</Text>
          <TouchableOpacity onPress={handleUpdate} style={styles.saveButton}>
            <LinearGradient
              colors={['#2E7D5E', '#1B4D3E']}
              style={styles.saveGradient}
            >
              <Text style={styles.saveButtonText}>Save</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {/* Animated Form */}
      <Animated.View
        style={[
          styles.formContainer,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
            paddingBottom: insets.bottom + 20,
          },
        ]}
      >
        {/* Space Name Input */}
        <View style={styles.card}>
          <Text style={styles.label}>SPACE NAME</Text>
          <View style={styles.inputWrapper}>
            <Ionicons name="home-outline" size={20} color="#94A3B8" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              value={spaceName}
              onChangeText={setSpaceName}
              placeholder="e.g. Living Room"
              placeholderTextColor="#94A3B8"
            />
          </View>

          <Text style={[styles.label, { marginTop: 20 }]}>LIGHT CONDITION</Text>
          <View style={styles.optionsContainer}>
            {lightOptions.map((option) => (
              <TouchableOpacity
                key={option}
                style={[
                  styles.optionChip,
                  lightCondition === option && styles.optionChipActive,
                ]}
                onPress={() => setLightCondition(option)}
              >
                <Ionicons
                  name="sunny-outline"
                  size={16}
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
            ))}
          </View>
        </View>

        {/* Delete Button */}
        <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
          <Ionicons name="trash-outline" size={22} color="#DC2626" />
          <Text style={styles.deleteText}>Delete Space</Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  headerGradient: {
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  saveButton: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  saveGradient: {
    paddingHorizontal: 18,
    paddingVertical: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  formContainer: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    marginBottom: 20,
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
    borderRadius: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  inputIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 16,
    color: '#1E293B',
  },
  optionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  optionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 6,
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
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF5F5',
    borderRadius: 16,
    paddingVertical: 16,
    gap: 8,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  deleteText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#DC2626',
  },
});