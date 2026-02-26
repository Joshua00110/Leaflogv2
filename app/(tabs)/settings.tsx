import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, Switch, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { auth } from '../../firebaseConfig';
import { signOut } from 'firebase/auth';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Define props interface with optional rightElement
interface SettingItemProps {
  icon: string;
  title: string;
  subtitle?: string;
  onPress?: () => void;
  rightElement?: React.ReactNode; // Made optional
  danger?: boolean;
}

const SettingItem: React.FC<SettingItemProps> = ({ 
  icon, 
  title, 
  subtitle, 
  onPress, 
  rightElement, 
  danger = false 
}) => (
  <TouchableOpacity style={styles.itemRow} onPress={onPress} disabled={!onPress}>
    <View style={[styles.iconBox, { backgroundColor: danger ? '#FFEBEE' : '#E8F5E9' }]}>
      <Ionicons name={icon as any} size={22} color={danger ? '#DC2626' : '#2E7D5E'} />
    </View>
    <View style={styles.itemTextContainer}>
      <Text style={[styles.itemTitle, danger && { color: '#DC2626' }]}>{title}</Text>
      {subtitle && <Text style={styles.itemSub}>{subtitle}</Text>}
    </View>
    {rightElement && <View>{rightElement}</View>}
  </TouchableOpacity>
);

export default function SettingsScreen() {
  const router = useRouter();
  const user = auth.currentUser;
  const insets = useSafeAreaInsets();

  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [reminderTime, setReminderTime] = useState('09:00');

  const handleSignOut = async () => {
    Alert.alert(
      "Sign Out",
      "Are you sure you want to sign out?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Sign Out",
          style: "destructive",
          onPress: async () => {
            try {
              await signOut(auth);
              router.replace('/auth');
            } catch (error) {
              console.error("Error signing out: ", error);
            }
          }
        }
      ]
    );
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      "Delete Account",
      "This action is permanent and cannot be undone. All your data will be lost.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", style: "destructive", onPress: () => console.log("Delete account") }
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView 
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 20 }
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header with Gradient */}
        <LinearGradient
          colors={['#1B4D3E', '#0F2F26']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.headerGradient}
        >
          <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>Settings</Text>
            <Text style={styles.headerSubtitle}>Manage your preferences</Text>
          </View>
        </LinearGradient>

        {/* Profile Card */}
        <View style={styles.profileCard}>
          <View style={styles.avatarContainer}>
            <LinearGradient
              colors={['#2E7D5E', '#1B4D3E']}
              style={styles.avatarGradient}
            >
              <Text style={styles.avatarText}>
                {user?.email?.charAt(0).toUpperCase() || 'G'}
              </Text>
            </LinearGradient>
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.userName}>{user?.displayName || "Gardener"}</Text>
            <Text style={styles.userEmail}>{user?.email}</Text>
          </View>
          <TouchableOpacity style={styles.editProfileButton}>
            <Ionicons name="create-outline" size={18} color="#2E7D5E" />
            <Text style={styles.editProfileText}>Edit</Text>
          </TouchableOpacity>
        </View>

        {/* Account Section */}
        <Text style={styles.sectionHeader}>ACCOUNT</Text>
        <View style={styles.card}>
          <SettingItem
            icon="log-out-outline"
            title="Sign Out"
            subtitle="Leave Leaflog on this device"
            onPress={handleSignOut}
          />
        </View>

        {/* Preferences Section */}
        <Text style={styles.sectionHeader}>PREFERENCES</Text>
        <View style={styles.card}>
          <SettingItem
            icon="notifications-outline"
            title="Notifications"
            subtitle="Enable system reminders"
            rightElement={
              <Switch
                value={notificationsEnabled}
                onValueChange={setNotificationsEnabled}
                trackColor={{ false: '#E2E8F0', true: '#2E7D5E' }}
                thumbColor="#FFFFFF"
              />
            }
          />
          <View style={styles.divider} />
          <SettingItem
            icon="time-outline"
            title="Reminder time"
            subtitle="Choose when notifications are sent"
            onPress={() => console.log('Change reminder time')}
            rightElement={
              <View style={styles.valueRow}>
                <Text style={styles.valueText}>{reminderTime}</Text>
                <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
              </View>
            }
          />
        </View>

        {/* About Section - UPDATED with navigation to info folder */}
        <Text style={styles.sectionHeader}>ABOUT</Text>
        <View style={styles.card}>
          <View key="help">
            <SettingItem
              icon="document-text-outline"
              title="Help & Support"
              onPress={() => router.push('/info/help')}
              rightElement={<Ionicons name="chevron-forward" size={18} color="#94A3B8" />}
            />
            <View style={styles.divider} />
          </View>
          <View key="privacy">
            <SettingItem
              icon="document-text-outline"
              title="Privacy Policy"
              onPress={() => router.push('/info/privacy')}
              rightElement={<Ionicons name="chevron-forward" size={18} color="#94A3B8" />}
            />
            <View style={styles.divider} />
          </View>
          <View key="terms">
            <SettingItem
              icon="document-text-outline"
              title="Terms & Conditions"
              onPress={() => router.push('/info/terms')}
              rightElement={<Ionicons name="chevron-forward" size={18} color="#94A3B8" />}
            />
          </View>
        </View>

        {/* Danger Zone */}
        <Text style={styles.sectionHeader}>DANGER ZONE</Text>
        <View style={[styles.card, { backgroundColor: '#FFF5F5' }]}>
          <SettingItem
            icon="trash-outline"
            title="Delete Account"
            subtitle="Remove your data permanently"
            danger
            onPress={handleDeleteAccount}
            rightElement={<Ionicons name="chevron-forward" size={18} color="#DC2626" />}
          />
        </View>

        {/* App Version */}
        <Text style={styles.versionText}>Leaflog v1.0.0</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  scrollContent: {
    paddingBottom: 20,
  },
  headerGradient: {
    paddingTop: 60,
    paddingBottom: 30,
    paddingHorizontal: 24,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    marginBottom: 20,
  },
  headerContent: {
    gap: 4,
  },
  headerTitle: {
    fontSize: 34,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#A8C5B5',
  },
  profileCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    marginHorizontal: 20,
    marginBottom: 24,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  avatarContainer: {
    marginRight: 16,
  },
  avatarGradient: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    shadowColor: '#2E7D5E',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '600',
  },
  profileInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 2,
  },
  userEmail: {
    fontSize: 14,
    color: '#64748B',
  },
  editProfileButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 4,
  },
  editProfileText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2E7D5E',
  },
  sectionHeader: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748B',
    marginHorizontal: 20,
    marginBottom: 8,
    marginTop: 8,
    letterSpacing: 0.8,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    marginHorizontal: 20,
    marginBottom: 16,
    paddingVertical: 8,
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  itemTextContainer: {
    flex: 1,
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 2,
  },
  itemSub: {
    fontSize: 13,
    color: '#64748B',
  },
  divider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginLeft: 58,
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  valueText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1E293B',
  },
  versionText: {
    textAlign: 'center',
    fontSize: 13,
    color: '#94A3B8',
    marginTop: 20,
    marginBottom: 10,
  },
});