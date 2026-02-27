import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TextInput, 
  TouchableOpacity, 
  ScrollView, 
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Modal,
  FlatList
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { db, auth } from '../firebaseConfig'; 
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const CATEGORIES = [
  'Succulent', 'Fern', 'Flowering', 'Foliage', 'Cactus',
  'Herb', 'Tree', 'Tropical', 'Air Plant', 'General'
];

const CARE_ACTIONS = ['Water', 'Feed', 'Clean', 'Mist', 'Prune', 'Repot'];

interface ActionSchedule {
  frequency: number;
  hour: number;
  minute: number;
}

export default function AddPlant() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const spaceId = typeof params.spaceId === 'string' ? params.spaceId : null;

  const [name, setName] = useState('');
  const [species, setSpecies] = useState('');
  const [category, setCategory] = useState('General');
  const [careActions, setCareActions] = useState<string[]>(['Water']);
  const [notes, setNotes] = useState('');
  const [environment, setEnvironment] = useState('Indoor');

  // Schedules for each selected action
  const [schedules, setSchedules] = useState<Record<string, ActionSchedule>>({});

  // Modals
  const [categoryModalVisible, setCategoryModalVisible] = useState(false);
  const [scheduleModalVisible, setScheduleModalVisible] = useState(false);
  const [editingAction, setEditingAction] = useState<string | null>(null);

  // Frequency & time picker for schedule modal
  const [tempFrequency, setTempFrequency] = useState(7);
  const [tempHour, setTempHour] = useState(9);
  const [tempMinute, setTempMinute] = useState(0);
  const [frequencyModalVisible, setFrequencyModalVisible] = useState(false);
  const [hourModalVisible, setHourModalVisible] = useState(false);
  const [minuteModalVisible, setMinuteModalVisible] = useState(false);

  const frequencyOptions = [1, 2, 3, 5, 7, 10, 14, 21, 30];
  const hourOptions = Array.from({ length: 24 }, (_, i) => i);
  const minuteOptions = Array.from({ length: 60 }, (_, i) => i);

  const toggleAction = (action: string) => {
    setCareActions(prev => {
      const newActions = prev.includes(action)
        ? prev.filter(a => a !== action)
        : [...prev, action];

      // If adding action, set a default schedule
      if (!prev.includes(action) && newActions.includes(action)) {
        setSchedules(prevSched => ({
          ...prevSched,
          [action]: { frequency: 7, hour: 9, minute: 0 }
        }));
      } else {
        // If removing action, delete its schedule
        setSchedules(prevSched => {
          const newSched = { ...prevSched };
          delete newSched[action];
          return newSched;
        });
      }
      return newActions;
    });
  };

  const openScheduleModal = (action: string) => {
    const schedule = schedules[action] || { frequency: 7, hour: 9, minute: 0 };
    setEditingAction(action);
    setTempFrequency(schedule.frequency);
    setTempHour(schedule.hour);
    setTempMinute(schedule.minute);
    setScheduleModalVisible(true);
  };

  const saveSchedule = () => {
    if (!editingAction) return;
    setSchedules(prev => ({
      ...prev,
      [editingAction]: { frequency: tempFrequency, hour: tempHour, minute: tempMinute }
    }));
    setScheduleModalVisible(false);
    setEditingAction(null);
  };

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert("Required", "Plant name is required");
      return;
    }

    try {
      const user = auth.currentUser;
      if (!user) {
        Alert.alert("Error", "You must be logged in to add a plant.");
        return;
      }

      const plantData = {
        name: name.trim(),
        species: species.trim() || '',
        category,
        spaceId: spaceId,
        userId: user.uid,
        tasks: careActions,
        schedules,
        notes: notes.trim() || '',
        environment,
        status: 'active',
        createdAt: serverTimestamp()
      };

      await addDoc(collection(db, "plants"), plantData);
      router.back();
    } catch (e) {
      console.error("Error adding plant: ", e);
      Alert.alert("Failed to save plant", "Please check your internet and try again.");
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
        style={{ flex: 1 }}
      >
        {/* Header */}
        <LinearGradient colors={['#1B4D3E', '#0F2F26']} style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.headerButton}>
            <Ionicons name="close" size={28} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Add New Plant</Text>
          <TouchableOpacity onPress={handleSave} style={styles.headerButton}>
            <LinearGradient colors={['#2E7D5E', '#1B4D3E']} style={styles.saveButton}>
              <Text style={styles.saveButtonText}>Add</Text>
            </LinearGradient>
          </TouchableOpacity>
        </LinearGradient>

        <ScrollView style={styles.form} showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}>

          {/* Basic Info Card */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Basic Information</Text>
            <View style={styles.inputGroup}>
              <Text style={styles.fieldLabel}>PLANT NAME <Text style={styles.required}>*</Text></Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="leaf-outline" size={20} color="#94A3B8" style={styles.inputIcon} />
                <TextInput 
                  style={styles.textInput} 
                  placeholder="e.g. Snake Plant" 
                  placeholderTextColor="#94A3B8"
                  value={name} onChangeText={setName} 
                />
              </View>
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.fieldLabel}>SPECIES</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="fitness-outline" size={20} color="#94A3B8" style={styles.inputIcon} />
                <TextInput 
                  style={styles.textInput} 
                  placeholder="e.g. Sansevieria" 
                  placeholderTextColor="#94A3B8"
                  value={species} onChangeText={setSpecies} 
                />
              </View>
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.fieldLabel}>CATEGORY</Text>
              <TouchableOpacity style={styles.inputWrapper} onPress={() => setCategoryModalVisible(true)}>
                <Ionicons name="apps-outline" size={20} color="#94A3B8" style={styles.inputIcon} />
                <Text style={[styles.textInput, styles.pickerText]}>{category}</Text>
                <Ionicons name="chevron-down" size={20} color="#94A3B8" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Care Actions Card */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Care Actions</Text>
            <Text style={styles.cardSubtitle}>Tap to select tasks you track</Text>
            
            <View style={styles.chipGrid}>
              {CARE_ACTIONS.map(task => (
                <TouchableOpacity 
                  key={task} 
                  style={[styles.chip, careActions.includes(task) && styles.chipActive]}
                  onPress={() => toggleAction(task)}
                >
                  <Ionicons 
                    name={task === 'Water' ? 'water' : 'leaf-outline'} 
                    size={16} 
                    color={careActions.includes(task) ? '#FFFFFF' : '#64748B'} 
                  />
                  <Text style={[styles.chipText, careActions.includes(task) && styles.chipTextActive]}>
                    {task}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Schedule configuration for selected actions */}
            {careActions.length > 0 && (
              <View style={styles.schedulesContainer}>
                <Text style={styles.sectionSubtitle}>Set schedules for each action:</Text>
                {careActions.map(action => {
                  const sched = schedules[action] || { frequency: 7, hour: 9, minute: 0 };
                  return (
                    <View key={action} style={styles.scheduleRow}>
                      <Text style={styles.scheduleAction}>{action}</Text>
                      <TouchableOpacity onPress={() => openScheduleModal(action)} style={styles.scheduleButton}>
                        <Text style={styles.scheduleButtonText}>
                          Every {sched.frequency}d at {sched.hour.toString().padStart(2,'0')}:{sched.minute.toString().padStart(2,'0')}
                        </Text>
                        <Ionicons name="create-outline" size={18} color="#2E7D5E" />
                      </TouchableOpacity>
                    </View>
                  );
                })}
              </View>
            )}
          </View>

          {/* Environment Card */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Environment</Text>
            <View style={styles.environmentRow}>
              <TouchableOpacity 
                style={[styles.environmentOption, environment === 'Indoor' && styles.environmentOptionActive]}
                onPress={() => setEnvironment('Indoor')}
              >
                <Ionicons name="home-outline" size={24} color={environment === 'Indoor' ? '#2E7D5E' : '#64748B'} />
                <Text style={[styles.environmentText, environment === 'Indoor' && styles.environmentTextActive]}>Indoor</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.environmentOption, environment === 'Outdoor' && styles.environmentOptionActive]}
                onPress={() => setEnvironment('Outdoor')}
              >
                <Ionicons name="sunny-outline" size={24} color={environment === 'Outdoor' ? '#2E7D5E' : '#64748B'} />
                <Text style={[styles.environmentText, environment === 'Outdoor' && styles.environmentTextActive]}>Outdoor</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Notes Card */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Notes</Text>
            <View style={styles.inputGroup}>
              <View style={[styles.inputWrapper, styles.textAreaWrapper]}>
                <TextInput 
                  style={[styles.textInput, styles.textArea]} 
                  placeholder="Add care tips, reminders, or notes..." 
                  placeholderTextColor="#94A3B8"
                  multiline numberOfLines={4}
                  value={notes} onChangeText={setNotes}
                />
              </View>
            </View>
          </View>
        </ScrollView>

        {/* Category Modal */}
        <Modal visible={categoryModalVisible} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHandle} />
              <Text style={styles.modalTitle}>Select Category</Text>
              <FlatList
                data={CATEGORIES}
                keyExtractor={(item) => item}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.categoryItem}
                    onPress={() => { setCategory(item); setCategoryModalVisible(false); }}
                  >
                    <Text style={styles.categoryItemText}>{item}</Text>
                    {category === item && <Ionicons name="checkmark-circle" size={24} color="#2E7D5E" />}
                  </TouchableOpacity>
                )}
                ItemSeparatorComponent={() => <View style={styles.separator} />}
              />
            </View>
          </View>
        </Modal>

        {/* Schedule Modal */}
        <Modal visible={scheduleModalVisible} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHandle} />
              <Text style={styles.modalTitle}>Set Schedule for {editingAction}</Text>
              
              {/* Frequency */}
              <Text style={styles.modalLabel}>Frequency (days)</Text>
              <TouchableOpacity style={styles.modalPicker} onPress={() => setFrequencyModalVisible(true)}>
                <Text style={styles.modalPickerText}>Every {tempFrequency} day{tempFrequency > 1 ? 's' : ''}</Text>
                <Ionicons name="chevron-down" size={20} color="#64748B" />
              </TouchableOpacity>

              {/* Time - Hour */}
              <Text style={styles.modalLabel}>Hour</Text>
              <TouchableOpacity style={styles.modalPicker} onPress={() => setHourModalVisible(true)}>
                <Text style={styles.modalPickerText}>{tempHour.toString().padStart(2,'0')} : 00</Text>
                <Ionicons name="chevron-down" size={20} color="#64748B" />
              </TouchableOpacity>

              {/* Time - Minute */}
              <Text style={styles.modalLabel}>Minute</Text>
              <TouchableOpacity style={styles.modalPicker} onPress={() => setMinuteModalVisible(true)}>
                <Text style={styles.modalPickerText}>{tempMinute.toString().padStart(2,'0')} minutes</Text>
                <Ionicons name="chevron-down" size={20} color="#64748B" />
              </TouchableOpacity>

              <View style={styles.modalActions}>
                <TouchableOpacity style={styles.modalCancel} onPress={() => setScheduleModalVisible(false)}>
                  <Text style={styles.modalCancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.modalSave} onPress={saveSchedule}>
                  <Text style={styles.modalSaveText}>Save</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* Frequency Picker Modal */}
        <Modal visible={frequencyModalVisible} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHandle} />
              <Text style={styles.modalTitle}>Select Frequency</Text>
              <FlatList
                data={frequencyOptions}
                keyExtractor={(item) => item.toString()}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.categoryItem}
                    onPress={() => { setTempFrequency(item); setFrequencyModalVisible(false); }}
                  >
                    <Text style={styles.categoryItemText}>Every {item} day{item > 1 ? 's' : ''}</Text>
                    {tempFrequency === item && <Ionicons name="checkmark-circle" size={24} color="#2E7D5E" />}
                  </TouchableOpacity>
                )}
                ItemSeparatorComponent={() => <View style={styles.separator} />}
              />
            </View>
          </View>
        </Modal>

        {/* Hour Picker Modal */}
        <Modal visible={hourModalVisible} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHandle} />
              <Text style={styles.modalTitle}>Select Hour</Text>
              <FlatList
                data={hourOptions}
                keyExtractor={(item) => item.toString()}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.categoryItem}
                    onPress={() => { setTempHour(item); setHourModalVisible(false); }}
                  >
                    <Text style={styles.categoryItemText}>{item.toString().padStart(2,'0')}:00</Text>
                    {tempHour === item && <Ionicons name="checkmark-circle" size={24} color="#2E7D5E" />}
                  </TouchableOpacity>
                )}
                ItemSeparatorComponent={() => <View style={styles.separator} />}
              />
            </View>
          </View>
        </Modal>

        {/* Minute Picker Modal */}
        <Modal visible={minuteModalVisible} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHandle} />
              <Text style={styles.modalTitle}>Select Minute</Text>
              <FlatList
                data={minuteOptions}
                keyExtractor={(item) => item.toString()}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.categoryItem}
                    onPress={() => { setTempMinute(item); setMinuteModalVisible(false); }}
                  >
                    <Text style={styles.categoryItemText}>{item.toString().padStart(2,'0')}</Text>
                    {tempMinute === item && <Ionicons name="checkmark-circle" size={24} color="#2E7D5E" />}
                  </TouchableOpacity>
                )}
                ItemSeparatorComponent={() => <View style={styles.separator} />}
              />
            </View>
          </View>
        </Modal>

      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F7FA' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 20,
  },
  headerButton: { width: 48, height: 48, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 20, fontWeight: '600', color: '#FFFFFF' },
  saveButton: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20 },
  saveButtonText: { color: '#FFFFFF', fontWeight: '600', fontSize: 16 },
  form: { flex: 1, paddingHorizontal: 20, paddingTop: 20 },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardTitle: { fontSize: 18, fontWeight: '700', color: '#1E293B', marginBottom: 4 },
  cardSubtitle: { fontSize: 14, color: '#64748B', marginBottom: 16 },
  sectionSubtitle: { fontSize: 14, fontWeight: '600', color: '#1E293B', marginTop: 12, marginBottom: 8 },
  inputGroup: { marginBottom: 16 },
  fieldLabel: { fontSize: 12, fontWeight: '600', color: '#64748B', marginBottom: 8, letterSpacing: 0.5 },
  required: { color: '#DC2626' },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  inputIcon: { marginRight: 8 },
  textInput: { flex: 1, paddingVertical: 14, fontSize: 16, color: '#1E293B' },
  pickerText: { color: '#1E293B' },
  textAreaWrapper: { alignItems: 'flex-start' },
  textArea: { height: 100, textAlignVertical: 'top' },
  chipGrid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -4 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    margin: 4,
    backgroundColor: '#FFFFFF',
  },
  chipActive: { backgroundColor: '#2E7D5E', borderColor: '#2E7D5E' },
  chipText: { fontSize: 14, fontWeight: '500', color: '#64748B', marginLeft: 6 },
  chipTextActive: { color: '#FFFFFF' },
  schedulesContainer: { marginTop: 16, borderTopWidth: 1, borderTopColor: '#E2E8F0', paddingTop: 16 },
  scheduleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  scheduleAction: { fontSize: 16, fontWeight: '600', color: '#1E293B', width: 80 },
  scheduleButton: { flexDirection: 'row', alignItems: 'center', flex: 1, justifyContent: 'flex-end', gap: 8 },
  scheduleButtonText: { fontSize: 14, color: '#2E7D5E', fontWeight: '500' },
  environmentRow: { flexDirection: 'row', gap: 16 },
  environmentOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    gap: 8,
  },
  environmentOptionActive: { borderColor: '#2E7D5E', backgroundColor: '#E8F5E9' },
  environmentText: { fontSize: 16, fontWeight: '500', color: '#64748B' },
  environmentTextActive: { color: '#2E7D5E' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    padding: 24,
    maxHeight: '80%',
  },
  modalHandle: { width: 40, height: 4, backgroundColor: '#E2E8F0', borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 20, fontWeight: '700', color: '#1E293B', marginBottom: 20, textAlign: 'center' },
  modalLabel: { fontSize: 14, fontWeight: '600', color: '#64748B', marginBottom: 8 },
  modalPicker: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16,
  },
  modalPickerText: { fontSize: 16, color: '#1E293B' },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 8 },
  modalCancel: { flex: 1, backgroundColor: '#F1F5F9', paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  modalCancelText: { fontSize: 16, fontWeight: '600', color: '#64748B' },
  modalSave: { flex: 1, backgroundColor: '#2E7D5E', paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  modalSaveText: { fontSize: 16, fontWeight: '600', color: '#FFFFFF' },
  categoryItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 16, paddingHorizontal: 8 },
  categoryItemText: { fontSize: 16, color: '#1E293B' },
  separator: { height: 1, backgroundColor: '#F1F5F9' },
});