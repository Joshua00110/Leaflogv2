import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { db, auth } from '../firebaseConfig';
import { collection, query, where, onSnapshot, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface Plant {
  id: string;
  name: string;
  space?: string;
  status: string;
}

export default function RetiredPlantsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [retiredPlants, setRetiredPlants] = useState<Plant[]>([]);

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    const q = query(
      collection(db, "plants"),
      where("userId", "==", user.uid),
      where("status", "==", "retired")
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const plants = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Plant));
      setRetiredPlants(plants);
    });

    return () => unsubscribe();
  }, []);

  const handleRestore = (plant: Plant) => {
    Alert.alert(
      "Restore Plant",
      `Move ${plant.name} back to active plants?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Restore",
          onPress: async () => {
            try {
              await updateDoc(doc(db, "plants", plant.id), { status: 'active' });
            } catch (error) {
              Alert.alert("Error", "Could not restore plant.");
            }
          }
        }
      ]
    );
  };

  const handlePermanentDelete = (plant: Plant) => {
    Alert.alert(
      "Permanently Delete",
      `This action cannot be undone. Delete ${plant.name} forever?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteDoc(doc(db, "plants", plant.id));
            } catch (error) {
              Alert.alert("Error", "Could not delete plant.");
            }
          }
        }
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}>
        <LinearGradient
          colors={['#1B4D3E', '#0F2F26']}
          style={styles.headerGradient}
        >
          <View style={styles.headerContent}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Retired Plants</Text>
            <View style={{ width: 40 }} />
          </View>
          <Text style={styles.headerSubtitle}>
            {retiredPlants.length} {retiredPlants.length === 1 ? 'plant' : 'plants'} archived
          </Text>
        </LinearGradient>

        <View style={styles.content}>
          {retiredPlants.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="archive-outline" size={60} color="#94A3B8" />
              <Text style={styles.emptyTitle}>No retired plants</Text>
              <Text style={styles.emptyText}>Plants you archive will appear here.</Text>
            </View>
          ) : (
            retiredPlants.map((plant) => (
              <View key={plant.id} style={styles.plantCard}>
                <View style={styles.plantInfo}>
                  <Text style={styles.plantName}>{plant.name}</Text>
                  <Text style={styles.plantSpace}>{plant.space || 'No space'}</Text>
                </View>
                <View style={styles.actions}>
                  <TouchableOpacity onPress={() => handleRestore(plant)} style={styles.actionButton}>
                    <Ionicons name="refresh-outline" size={22} color="#2E7D5E" />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => handlePermanentDelete(plant)} style={styles.actionButton}>
                    <Ionicons name="trash-outline" size={22} color="#DC2626" />
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#a2c9abff' },
  headerGradient: {
    paddingTop: 60,
    paddingBottom: 30,
    paddingHorizontal: 24,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#A8C5B5',
    textAlign: 'center',
  },
  content: {
    padding: 20,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1E293B',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    color: '#64748B',
    textAlign: 'center',
  },
  plantCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  plantInfo: {
    flex: 1,
  },
  plantName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 4,
  },
  plantSpace: {
    fontSize: 14,
    color: '#64748B',
  },
  actions: {
    flexDirection: 'row',
    gap: 16,
  },
  actionButton: {
    padding: 8,
  },
});