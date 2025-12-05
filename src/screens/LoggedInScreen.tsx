import React, {useState} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import type {RouteProp} from '@react-navigation/native';
import type {RootStackParamList} from '../navigation/types';
import {clearPatientAuth} from '../features/auth';

type LoggedInScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'LoggedIn'
>;

type LoggedInScreenRouteProp = RouteProp<RootStackParamList, 'LoggedIn'>;

type Props = {
  navigation: LoggedInScreenNavigationProp;
  route: LoggedInScreenRouteProp;
};

// Heart Icon Component
const HeartIcon = () => (
  <View style={styles.heartContainer}>
    <Text style={styles.heartIcon}>❤️</Text>
    <View style={styles.heartPulse}>
      <View style={styles.ecgLine}>
        <Text style={styles.ecgText}>~∿∿~</Text>
      </View>
    </View>
  </View>
);

// Verified Badge Component
const VerifiedBadge = () => (
  <View style={styles.verifiedBadge}>
    <Text style={styles.verifiedIcon}>✓</Text>
    <Text style={styles.verifiedText}>Verified Patient</Text>
  </View>
);

const LoggedInScreen: React.FC<Props> = ({navigation, route}) => {
  const {healthId, mobileNumber, userId, patientName} = route.params;
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleContinueChat = () => {
    navigation.navigate('Chat', {healthId, mobileNumber, userId});
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout? You will need to login again to continue.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            setIsLoggingOut(true);
            await clearPatientAuth();
            setIsLoggingOut(false);
            navigation.replace('Login');
          },
        },
      ],
    );
  };

  const handleSwitchPatient = () => {
    Alert.alert(
      'Switch Patient',
      'This will log out the current patient and allow you to login with a different account.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Switch',
          onPress: async () => {
            setIsLoggingOut(true);
            await clearPatientAuth();
            setIsLoggingOut(false);
            navigation.replace('Login');
          },
        },
      ],
    );
  };

  if (isLoggingOut) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#DC3545" />
        <Text style={styles.loadingText}>Logging out...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      contentContainerStyle={styles.scrollContent}
      style={styles.container}>
      {/* Background Pattern */}
      <View style={styles.backgroundPattern}>
        <View style={styles.patternCircle1} />
        <View style={styles.patternCircle2} />
        <View style={styles.patternCircle3} />
      </View>

      <View style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <HeartIcon />
          <Text style={styles.logo}>HridAI</Text>
          <Text style={styles.tagline}>Your Cardiac Health Companion</Text>
        </View>

        {/* Welcome Back Card */}
        <View style={styles.welcomeCard}>
          <View style={styles.welcomeHeader}>
            <Text style={styles.welcomeIcon}>👋</Text>
            <Text style={styles.welcomeTitle}>Welcome Back!</Text>
          </View>
          <Text style={styles.welcomeSubtitle}>
            You're already logged in. Continue your health consultation or
            switch to a different patient.
          </Text>
        </View>

        {/* Patient Details Card */}
        <View style={styles.patientCard}>
          <View style={styles.patientHeader}>
            <View style={styles.avatarContainer}>
              <Text style={styles.avatarText}>
                {patientName.charAt(0).toUpperCase()}
              </Text>
            </View>
            <View style={styles.patientInfo}>
              <Text style={styles.patientName}>{patientName}</Text>
              <VerifiedBadge />
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.detailsContainer}>
            <View style={styles.detailRow}>
              <View style={styles.detailIconContainer}>
                <Text style={styles.detailIcon}>🆔</Text>
              </View>
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>Health ID</Text>
                <Text style={styles.detailValue}>{healthId}</Text>
              </View>
            </View>

            <View style={styles.detailRow}>
              <View style={styles.detailIconContainer}>
                <Text style={styles.detailIcon}>📱</Text>
              </View>
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>Mobile Number</Text>
                <Text style={styles.detailValue}>+91 {mobileNumber}</Text>
              </View>
            </View>

            <View style={styles.detailRow}>
              <View style={styles.detailIconContainer}>
                <Text style={styles.detailIcon}>👤</Text>
              </View>
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>Patient ID</Text>
                <Text style={styles.detailValue}>{userId}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionsContainer}>
          {/* Continue Consultation Button */}
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={handleContinueChat}
            activeOpacity={0.8}>
            <Text style={styles.primaryButtonIcon}>💬</Text>
            <Text style={styles.primaryButtonText}>Continue Consultation</Text>
          </TouchableOpacity>

          {/* Switch Patient Button */}
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={handleSwitchPatient}
            activeOpacity={0.8}>
            <Text style={styles.secondaryButtonIcon}>🔄</Text>
            <Text style={styles.secondaryButtonText}>Login as Different Patient</Text>
          </TouchableOpacity>

          {/* Logout Button */}
          <TouchableOpacity
            style={styles.logoutButton}
            onPress={handleLogout}
            activeOpacity={0.8}>
            <Text style={styles.logoutButtonIcon}>🚪</Text>
            <Text style={styles.logoutButtonText}>Logout</Text>
          </TouchableOpacity>
        </View>

        {/* Trust Indicators */}
        <View style={styles.trustContainer}>
          <View style={styles.trustItem}>
            <Text style={styles.trustIcon}>🔒</Text>
            <Text style={styles.trustText}>HIPAA Compliant</Text>
          </View>
          <View style={styles.trustItem}>
            <Text style={styles.trustIcon}>🛡️</Text>
            <Text style={styles.trustText}>End-to-End Encrypted</Text>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.disclaimerText}>
            ⚠️ For emergencies, please call 112 or visit the nearest hospital
          </Text>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0D1B2A',
  },
  scrollContent: {
    flexGrow: 1,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#0D1B2A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#7A8FA6',
  },
  backgroundPattern: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  patternCircle1: {
    position: 'absolute',
    top: -100,
    right: -100,
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: 'rgba(220, 53, 69, 0.08)',
  },
  patternCircle2: {
    position: 'absolute',
    bottom: 100,
    left: -80,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(220, 53, 69, 0.05)',
  },
  patternCircle3: {
    position: 'absolute',
    top: '40%',
    right: -50,
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: 'rgba(23, 162, 184, 0.06)',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingVertical: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  heartContainer: {
    alignItems: 'center',
    marginBottom: 12,
  },
  heartIcon: {
    fontSize: 48,
  },
  heartPulse: {
    marginTop: -8,
  },
  ecgLine: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ecgText: {
    fontSize: 20,
    color: '#DC3545',
    fontWeight: '300',
    letterSpacing: 2,
  },
  logo: {
    fontSize: 42,
    fontWeight: '800',
    color: '#DC3545',
    letterSpacing: 3,
    textShadowColor: 'rgba(220, 53, 69, 0.4)',
    textShadowOffset: {width: 0, height: 0},
    textShadowRadius: 20,
  },
  tagline: {
    fontSize: 14,
    color: '#E8E8E8',
    marginTop: 6,
    letterSpacing: 1,
    fontWeight: '500',
  },
  welcomeCard: {
    backgroundColor: 'rgba(40, 167, 69, 0.1)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(40, 167, 69, 0.3)',
  },
  welcomeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  welcomeIcon: {
    fontSize: 28,
    marginRight: 10,
  },
  welcomeTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#28A745',
  },
  welcomeSubtitle: {
    fontSize: 14,
    color: '#B8D4E3',
    lineHeight: 20,
  },
  patientCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 24,
    padding: 24,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(220, 53, 69, 0.2)',
    shadowColor: '#DC3545',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 8,
  },
  patientHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  avatarContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(220, 53, 69, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(220, 53, 69, 0.4)',
  },
  avatarText: {
    fontSize: 28,
    fontWeight: '700',
    color: '#DC3545',
  },
  patientInfo: {
    marginLeft: 16,
    flex: 1,
  },
  patientName: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 6,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(40, 167, 69, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  verifiedIcon: {
    fontSize: 12,
    color: '#28A745',
    fontWeight: '700',
    marginRight: 4,
  },
  verifiedText: {
    fontSize: 11,
    color: '#28A745',
    fontWeight: '600',
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(160, 180, 200, 0.15)',
    marginBottom: 20,
  },
  detailsContainer: {
    gap: 16,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(23, 162, 184, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  detailIcon: {
    fontSize: 20,
  },
  detailContent: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 12,
    color: '#6C8EAD',
    fontWeight: '500',
    marginBottom: 2,
  },
  detailValue: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  actionsContainer: {
    gap: 12,
    marginBottom: 24,
  },
  primaryButton: {
    flexDirection: 'row',
    backgroundColor: '#DC3545',
    borderRadius: 14,
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#DC3545',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 6,
  },
  primaryButtonIcon: {
    fontSize: 20,
    marginRight: 10,
  },
  primaryButtonText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  secondaryButton: {
    flexDirection: 'row',
    backgroundColor: 'rgba(23, 162, 184, 0.15)',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(23, 162, 184, 0.4)',
  },
  secondaryButtonIcon: {
    fontSize: 18,
    marginRight: 10,
  },
  secondaryButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#17A2B8',
    letterSpacing: 0.5,
  },
  logoutButton: {
    flexDirection: 'row',
    backgroundColor: 'rgba(108, 117, 125, 0.15)',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(108, 117, 125, 0.3)',
  },
  logoutButtonIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  logoutButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6C757D',
  },
  trustContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 20,
    gap: 24,
  },
  trustItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  trustIcon: {
    fontSize: 14,
    marginRight: 6,
  },
  trustText: {
    fontSize: 12,
    color: '#6C8EAD',
    fontWeight: '500',
  },
  footer: {
    alignItems: 'center',
  },
  disclaimerText: {
    fontSize: 11,
    color: '#DC3545',
    textAlign: 'center',
    fontWeight: '500',
  },
});

export default LoggedInScreen;

