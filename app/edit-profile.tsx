import React, { useState, useEffect } from 'react';
import { 
  View, Text, StyleSheet, SafeAreaView, ScrollView, 
  TextInput, TouchableOpacity, Alert, KeyboardAvoidingView, Platform,
  ActivityIndicator, Modal, FlatList
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { auth } from '../firebaseConfig';
import { updateProfile, updateEmail, updatePassword, reauthenticateWithCredential, EmailAuthProvider } from 'firebase/auth';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Gardener-themed avatars
const GARDENER_AVATARS = [
  { id: '1', sticker: '🧑‍🌾', color: '#2E7D5E', name: 'Gardener' },
  { id: '2', sticker: '👨‍🌾', color: '#5C6BC0', name: 'Farmer' },
  { id: '3', sticker: '👩‍🌾', color: '#4A90E2', name: 'Gardener Girl' },
  { id: '4', sticker: '🌱', color: '#F59E0B', name: 'Seedling' },
  { id: '5', sticker: '👨🏻‍🌾', color: '#EC4899', name: 'Young Gardener' },
  { id: '6', sticker: '👩🏻‍🌾', color: '#8B5CF6', name: 'Young Gardener Girl' },
  { id: '7', sticker: '🧑', color: '#EF4444', name: 'Person' },
  { id: '8', sticker: '👨', color: '#10B981', name: 'Man' },
  { id: '9', sticker: '👩', color: '#3B82F6', name: 'Woman' },
  { id: '10', sticker: '🧔‍♂️', color: '#6366F1', name: 'Bearded Man' },
  { id: '11', sticker: '🧔‍♀️', color: '#14B8A6', name: 'Bearded Woman' },
  { id: '12', sticker: '👧', color: '#84CC16', name: 'Girl' },
  { id: '13', sticker: '👦', color: '#F97316', name: 'Boy' },
  { id: '14', sticker: '🧓', color: '#EAB308', name: 'Older Person' },
  { id: '15', sticker: '👴', color: '#854D0E', name: 'Old Man' },
  { id: '16', sticker: '👵', color: '#A855F7', name: 'Old Woman' },
  { id: '17', sticker: '👒', color: '#D946EF', name: 'Garden Hat' },
  { id: '18', sticker: '🧢', color: '#F43F5E', name: 'Cap' },
  { id: '19', sticker: '🧤', color: '#EC4899', name: 'Gloves' },
  { id: '20', sticker: '👑', color: '#F59E0B', name: 'Plant King' },
];

export default function EditProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const user = auth.currentUser;

  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState(user?.email || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedAvatar, setSelectedAvatar] = useState(GARDENER_AVATARS[0]);
  const [avatarModalVisible, setAvatarModalVisible] = useState(false);

  // Load user's current avatar and name when component mounts
  useEffect(() => {
    const loadUserData = () => {
      const currentUser = auth.currentUser;
      const fullDisplayName = currentUser?.displayName || '';
      
      console.log('Loading edit profile - Full name:', fullDisplayName);
      
      if (fullDisplayName && fullDisplayName.length > 0) {
        // Split by space to separate emoji from name
        const parts = fullDisplayName.split(' ');
        const emojiPart = parts[0]; // First part is the emoji
        const namePart = parts.slice(1).join(' '); // Rest is the name
        
        console.log('Emoji part:', emojiPart);
        console.log('Name part:', namePart);
        
        // Find which avatar matches the emoji
        const matchedAvatar = GARDENER_AVATARS.find(a => a.sticker === emojiPart);
        if (matchedAvatar) {
          setSelectedAvatar(matchedAvatar);
          console.log('Found matching avatar:', matchedAvatar.name);
        } else {
          setSelectedAvatar(GARDENER_AVATARS[0]);
        }
        
        // Set display name without emoji
        setDisplayName(namePart.trim());
      } else {
        setSelectedAvatar(GARDENER_AVATARS[0]);
        setDisplayName('');
      }
    };

    loadUserData();
  }, []);

  const handleUpdateProfile = async () => {
    if (!user) return;

    // Validation
    if (!displayName.trim()) {
      Alert.alert('Error', 'Display name cannot be empty');
      return;
    }

    if (!email.trim()) {
      Alert.alert('Error', 'Email cannot be empty');
      return;
    }

    if (newPassword && newPassword !== confirmPassword) {
      Alert.alert('Error', 'New passwords do not match');
      return;
    }

    if (newPassword && newPassword.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters');
      return;
    }

    setLoading(true);

    try {
      // Check if any changes require reauthentication
      const emailChanged = email !== user.email;
      const passwordChanged = newPassword !== '';

      if (emailChanged || passwordChanged) {
        if (!currentPassword) {
          Alert.alert('Error', 'Current password required to change email or password');
          setLoading(false);
          return;
        }

        // Reauthenticate user
        const credential = EmailAuthProvider.credential(user.email!, currentPassword);
        await reauthenticateWithCredential(user, credential);
      }

      // Create new display name with sticker
      const newDisplayName = `${selectedAvatar.sticker} ${displayName}`;
      
      console.log('=== SAVING PROFILE ===');
      console.log('Selected sticker:', selectedAvatar.sticker);
      console.log('Display name part:', displayName);
      console.log('Full new display name:', newDisplayName);

      // Update display name with sticker
      if (newDisplayName !== user.displayName) {
        await updateProfile(user, { displayName: newDisplayName });
        console.log('Profile updated successfully');
        
        // Force a refresh of the user object
        await user.reload();
        console.log('User reloaded. New display name:', auth.currentUser?.displayName);
      }

      // Update email
      if (emailChanged) {
        await updateEmail(user, email);
        console.log('Email updated');
      }

      // Update password
      if (passwordChanged) {
        await updatePassword(user, newPassword);
        console.log('Password updated');
      }

      Alert.alert('Success', 'Profile updated successfully');
      router.back();
      
    } catch (error: any) {
      console.error('Update error:', error);
      
      if (error.code === 'auth/wrong-password') {
        Alert.alert('Error', 'Current password is incorrect');
      } else if (error.code === 'auth/email-already-in-use') {
        Alert.alert('Error', 'Email is already in use');
      } else if (error.code === 'auth/requires-recent-login') {
        Alert.alert('Error', 'Please sign out and sign in again to make these changes');
      } else {
        Alert.alert('Error', error.message || 'Failed to update profile');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView 
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: insets.bottom + 20 }
          ]}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <LinearGradient
            colors={['#1B4D3E', '#0F2F26']}
            style={styles.header}
          >
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Edit Profile</Text>
            <TouchableOpacity 
              onPress={handleUpdateProfile} 
              disabled={loading}
              style={styles.saveButton}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.saveButtonText}>Save</Text>
              )}
            </TouchableOpacity>
          </LinearGradient>

          {/* Avatar Selection - Shows the user's current avatar */}
          <View style={styles.avatarSection}>
            <Text style={styles.avatarLabel}>Your Avatar</Text>
            <TouchableOpacity 
              style={[styles.selectedAvatar, { backgroundColor: selectedAvatar.color + '20' }]}
              onPress={() => setAvatarModalVisible(true)}
            >
              <Text style={[styles.avatarSticker, { color: selectedAvatar.color }]}>
                {selectedAvatar.sticker}
              </Text>
              <View style={styles.changeAvatarOverlay}>
                <Ionicons name="camera" size={20} color="#FFFFFF" />
                <Text style={styles.changeAvatarText}>Change</Text>
              </View>
            </TouchableOpacity>
            <Text style={styles.avatarName}>{selectedAvatar.name}</Text>
          </View>

          {/* Profile Info Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="person-outline" size={22} color="#2E7D5E" />
              <Text style={styles.sectionTitle}>Profile Information</Text>
            </View>
            
            <View style={styles.inputGroup}>
              <Text style={styles.label}>DISPLAY NAME</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="person-outline" size={20} color="#94A3B8" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  value={displayName}
                  onChangeText={setDisplayName}
                  placeholder="Enter your name"
                  placeholderTextColor="#94A3B8"
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>EMAIL ADDRESS</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="mail-outline" size={20} color="#94A3B8" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  value={email}
                  onChangeText={setEmail}
                  placeholder="Enter your email"
                  placeholderTextColor="#94A3B8"
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>
            </View>
          </View>

          {/* Change Password Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="lock-closed-outline" size={22} color="#2E7D5E" />
              <Text style={styles.sectionTitle}>Change Password</Text>
            </View>
            
            <Text style={styles.sectionNote}>
              Leave blank to keep current password
            </Text>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>CURRENT PASSWORD</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="lock-closed-outline" size={20} color="#94A3B8" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  value={currentPassword}
                  onChangeText={setCurrentPassword}
                  placeholder="Enter current password"
                  placeholderTextColor="#94A3B8"
                  secureTextEntry
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>NEW PASSWORD</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="lock-open-outline" size={20} color="#94A3B8" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  value={newPassword}
                  onChangeText={setNewPassword}
                  placeholder="Enter new password"
                  placeholderTextColor="#94A3B8"
                  secureTextEntry
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>CONFIRM NEW PASSWORD</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="checkmark-done-outline" size={20} color="#94A3B8" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  placeholder="Confirm new password"
                  placeholderTextColor="#94A3B8"
                  secureTextEntry
                />
              </View>
            </View>
          </View>

          {/* Security Note */}
          <View style={styles.noteContainer}>
            <Ionicons name="shield-checkmark-outline" size={20} color="#2E7D5E" />
            <Text style={styles.noteText}>
              Current password is required to change email or password for security reasons.
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Avatar Picker Modal */}
      <Modal visible={avatarModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Choose Your Gardener</Text>
            <FlatList
              data={GARDENER_AVATARS}
              numColumns={3}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.avatarOption,
                    { backgroundColor: item.color + '20' },
                    selectedAvatar.id === item.id && styles.avatarOptionSelected
                  ]}
                  onPress={() => {
                    setSelectedAvatar(item);
                    setAvatarModalVisible(false);
                  }}
                >
                  <Text style={[styles.avatarOptionSticker, { color: item.color }]}>
                    {item.sticker}
                  </Text>
                  <Text style={styles.avatarOptionName}>{item.name}</Text>
                </TouchableOpacity>
              )}
            />
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setAvatarModalVisible(false)}
            >
              <Text style={styles.modalCloseText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#a2c9abff',
  },
  scrollContent: {
    flexGrow: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  saveButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    minWidth: 60,
    alignItems: 'center',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  avatarSection: {
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 10,
  },
  avatarLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
    marginBottom: 12,
    letterSpacing: 0.5,
  },
  selectedAvatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    borderWidth: 3,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  avatarSticker: {
    fontSize: 64,
  },
  changeAvatarOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(46, 125, 94, 0.9)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderBottomLeftRadius: 60,
    borderBottomRightRadius: 60,
    gap: 4,
  },
  changeAvatarText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  avatarName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
    marginTop: 8,
  },
  section: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    marginHorizontal: 20,
    marginTop: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1E293B',
  },
  sectionNote: {
    fontSize: 13,
    color: '#64748B',
    marginBottom: 16,
    marginLeft: 4,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
    marginBottom: 6,
    letterSpacing: 0.5,
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
    fontSize: 15,
    color: '#1E293B',
  },
  noteContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginTop: 20,
    marginBottom: 10,
    padding: 16,
    backgroundColor: '#E8F5E9',
    borderRadius: 12,
    gap: 12,
  },
  noteText: {
    flex: 1,
    fontSize: 13,
    color: '#1E293B',
    lineHeight: 18,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    padding: 24,
    maxHeight: '80%',
  },
  modalHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#E2E8F0',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 20,
    textAlign: 'center',
  },
  avatarOption: {
    flex: 1,
    aspectRatio: 1,
    margin: 6,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  avatarOptionSelected: {
    borderColor: '#2E7D5E',
  },
  avatarOptionSticker: {
    fontSize: 32,
    marginBottom: 4,
  },
  avatarOptionName: {
    fontSize: 11,
    color: '#1E293B',
    textAlign: 'center',
  },
  modalCloseButton: {
    marginTop: 20,
    paddingVertical: 14,
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    alignItems: 'center',
  },
  modalCloseText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#64748B',
  },
});