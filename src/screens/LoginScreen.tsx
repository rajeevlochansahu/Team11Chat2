import React, {useState} from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ScrollView,
  Modal,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import type {RootStackParamList} from '../navigation/types';
import {savePatientAuth} from '../features/auth';
import {sessionService} from '../features/session/services/sessionService';

type LoginScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'Login'
>;

type Props = {
  navigation: LoginScreenNavigationProp;
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

// Stethoscope decoration
const StethoscopeDecor = () => (
  <View style={styles.stethoscopeDecor}>
    <Text style={styles.stethoscopeEmoji}>🩺</Text>
  </View>
);

// Preset user credentials
const PRESET_USERS = [
  {
    id: 'anup',
    name: 'Anup',
    healthId: 'MQNE-5493',
    mobileNumber: '7021066279',
    userId: '176130',
  },
  {
    id: 'rajeev',
    name: 'Rajeev',
    healthId: 'RJVK-2847',
    mobileNumber: '9876543210',
    userId: '200001',
  },
  {
    id: 'pankaj',
    name: 'Pankaj',
    healthId: 'PNKJ-6521',
    mobileNumber: '8888777766',
    userId: '300002',
  },
  {
    id: 'pradip',
    name: 'Pradip',
    healthId: 'PRDP-4938',
    mobileNumber: '7777888899',
    userId: '400003',
  },
  {
    id: 'anupama',
    name: 'Anupama',
    healthId: 'ANPM-7625',
    mobileNumber: '9988776655',
    userId: '500004',
  },
  {
    id: 'manual',
    name: 'Enter Manually',
    healthId: '',
    mobileNumber: '',
    userId: '',
  },
];

const LoginScreen: React.FC<Props> = ({navigation}) => {
  const [selectedUser, setSelectedUser] = useState<
    (typeof PRESET_USERS)[0] | null
  >(null);
  const [healthId, setHealthId] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [userId, setUserId] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isStartingConsultation, setIsStartingConsultation] = useState(false);

  const handleSelectUser = (user: (typeof PRESET_USERS)[0]) => {
    setSelectedUser(user);
    setHealthId(user.healthId);
    setMobileNumber(user.mobileNumber);
    setUserId(user.userId);
    setIsDropdownOpen(false);
  };

  const validateMobileNumber = (number: string): boolean => {
    const mobileRegex = /^[0-9]{10}$/;
    return mobileRegex.test(number);
  };

  /**
   * Mock API call to start consultation
   * Attaches token and user details to the request
   */
  const callStartConsultationApi = async (
    token: string,
    userDetails: {
      healthId: string;
      mobileNumber: string;
      userId: string;
      patientName: string;
    },
  ): Promise<{success: boolean; error?: string}> => {
    console.log(
      '[LoginScreen] ========== START CONSULTATION API (MOCK) ==========',
    );
    console.log('[LoginScreen] Token:', token);
    console.log(
      '[LoginScreen] User Details:',
      JSON.stringify(userDetails, null, 2),
    );

    // Mock API request payload
    const requestPayload = {
      session_token: token,
      user_id: userDetails.userId,
      health_id: userDetails.healthId,
      mobile_number: userDetails.mobileNumber,
      patient_name: userDetails.patientName,
      consultation_type: 'cardiac',
      timestamp: new Date().toISOString(),
    };

    console.log(
      '[LoginScreen] Request Payload:',
      JSON.stringify(requestPayload, null, 2),
    );

    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Mock successful response
    const mockResponse = {
      success: true,
      consultation_id: `CONSULT_${Date.now()}`,
      message: 'Consultation started successfully',
    };

    console.log(
      '[LoginScreen] Mock Response:',
      JSON.stringify(mockResponse, null, 2),
    );
    console.log(
      '[LoginScreen] ===================================================',
    );

    return {success: true};
  };

  const handleContinue = async () => {
    if (!healthId.trim()) {
      Alert.alert('Error', 'Please enter your Health ID');
      return;
    }

    if (!mobileNumber.trim()) {
      Alert.alert('Error', 'Please enter your mobile number');
      return;
    }

    if (!validateMobileNumber(mobileNumber)) {
      Alert.alert('Error', 'Please enter a valid 10-digit mobile number');
      return;
    }

    if (!userId.trim()) {
      Alert.alert('Error', 'Please enter your User ID');
      return;
    }

    // Get patient name from selected user or use 'Patient' as default
    const patientName =
      selectedUser && selectedUser.id !== 'manual'
        ? selectedUser.name
        : 'Patient';

    setIsStartingConsultation(true);

    try {
      // Step 1: Get or create session to obtain token
      console.log('[LoginScreen] Getting/creating session for user:', userId);
      const sessionResult = await sessionService.getOrCreateSession(
        userId,
        healthId,
      );

      if (sessionResult.error || !sessionResult.data) {
        console.error(
          '[LoginScreen] Failed to get session:',
          sessionResult.error,
        );
        Alert.alert(
          'Session Error',
          sessionResult.error?.message ||
            'Failed to create session. Please try again.',
        );
        setIsStartingConsultation(false);
        return;
      }

      const sessionToken = sessionResult.data.session_token;
      console.log('[LoginScreen] Session token obtained:', sessionToken);

      // Step 2: Call mock start consultation API with token and user details
      const consultationResult = await callStartConsultationApi(sessionToken, {
        healthId,
        mobileNumber,
        userId,
        patientName,
      });

      if (!consultationResult.success) {
        Alert.alert(
          'Consultation Error',
          consultationResult.error ||
            'Failed to start consultation. Please try again.',
        );
        setIsStartingConsultation(false);
        return;
      }

      // Step 3: Save patient auth data for persistence
      await savePatientAuth({
        healthId,
        mobileNumber,
        userId,
        patientName,
        loginTimestamp: Date.now(),
      });

      setIsStartingConsultation(false);

      // Navigate to Chat screen
      navigation.navigate('Chat', {healthId, mobileNumber, userId});
    } catch (error) {
      console.error('[LoginScreen] Error starting consultation:', error);
      Alert.alert('Error', 'An unexpected error occurred. Please try again.');
      setIsStartingConsultation(false);
    }
  };

  const handleMobileChange = (text: string) => {
    const numericText = text.replace(/[^0-9]/g, '');
    if (numericText.length <= 10) {
      setMobileNumber(numericText);
    }
  };

  const isFormValid =
    healthId.trim() && mobileNumber.length === 10 && userId.trim();

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled">

        {/* Background Pattern */}
        <View style={styles.backgroundPattern}>
          <View style={styles.patternCircle1} />
          <View style={styles.patternCircle2} />
          <View style={styles.patternCircle3} />
        </View>

        <View style={styles.content}>
          {/* Header with Logo */}
          <View style={styles.header}>
            <HeartIcon />
            <Text style={styles.logo}>HridAI</Text>
            <Text style={styles.tagline}>Your Cardiac Health Companion</Text>
            <View style={styles.subtitleContainer}>
              <StethoscopeDecor />
              <Text style={styles.subtitle}>
                AI-Powered Cardiology Assistant
              </Text>
            </View>
          </View>

          {/* Medical Info Banner */}
          <View style={styles.infoBanner}>
            <Text style={styles.infoIcon}>🏥</Text>
            <Text style={styles.infoText}>
              Connect with our AI cardiologist for personalized heart health guidance
            </Text>
          </View>

          {/* Form Container */}
          <View style={styles.formContainer}>
            <View style={styles.formHeader}>
              <Text style={styles.formTitle}>Patient Login</Text>
              <View style={styles.formDivider} />
            </View>

            {/* User Selection Dropdown */}
            <Text style={styles.label}>
              <Text style={styles.labelIcon}>🩺 </Text>
              Quick Select Patient
            </Text>
            <TouchableOpacity
              style={styles.dropdownContainer}
              onPress={() => setIsDropdownOpen(true)}
              activeOpacity={0.7}>
              <View style={styles.dropdownLeftSection}>
                <View style={[
                  styles.dropdownAvatarContainer,
                  !selectedUser && styles.dropdownAvatarPlaceholder,
                ]}>
                  <Text style={styles.dropdownAvatar}>
                    {selectedUser
                      ? selectedUser.id === 'manual'
                        ? '✏️'
                        : selectedUser.name.charAt(0)
                      : '👤'}
                  </Text>
                </View>
                <View style={styles.dropdownTextContainer}>
                  <Text style={[
                    styles.dropdownValue,
                    !selectedUser && styles.dropdownPlaceholder,
                  ]}>
                    {selectedUser
                      ? selectedUser.id === 'manual'
                        ? 'Enter Manually'
                        : selectedUser.name
                      : 'Select a patient...'}
                  </Text>
                  {selectedUser && selectedUser.id !== 'manual' && (
                    <Text style={styles.dropdownSubtext}>
                      ID: {selectedUser.healthId}
                    </Text>
                  )}
                </View>
              </View>
              <View style={styles.dropdownArrowContainer}>
                <Text style={styles.dropdownArrow}>▼</Text>
              </View>
            </TouchableOpacity>

            {/* Custom Dropdown Modal */}
            <Modal
              visible={isDropdownOpen}
              transparent={true}
              animationType="fade"
              onRequestClose={() => setIsDropdownOpen(false)}>
              <Pressable
                style={styles.modalOverlay}
                onPress={() => setIsDropdownOpen(false)}>
                <View style={styles.modalContent}>
                  <View style={styles.modalHeader}>
                    <Text style={styles.modalTitle}>🩺 Select Patient</Text>
                    <TouchableOpacity
                      onPress={() => setIsDropdownOpen(false)}
                      style={styles.modalCloseButton}>
                      <Text style={styles.modalCloseText}>✕</Text>
                    </TouchableOpacity>
                  </View>
                  <View style={styles.modalDivider} />
                  <ScrollView style={styles.modalList}>
                    {PRESET_USERS.map((user, index) => (
                      <TouchableOpacity
                        key={user.id}
                        style={[
                          styles.modalOption,
                          selectedUser?.id === user.id && styles.modalOptionSelected,
                          index === PRESET_USERS.length - 1 && styles.modalOptionLast,
                        ]}
                        onPress={() => handleSelectUser(user)}
                        activeOpacity={0.7}>
                        <View style={[
                          styles.modalOptionAvatar,
                          user.id === 'manual' && styles.modalOptionAvatarManual,
                        ]}>
                          <Text style={styles.modalOptionAvatarText}>
                            {user.id === 'manual' ? '✏️' : user.name.charAt(0)}
                          </Text>
                        </View>
                        <View style={styles.modalOptionTextContainer}>
                          <Text style={styles.modalOptionName}>{user.name}</Text>
                          {user.id !== 'manual' && (
                            <Text style={styles.modalOptionDetails}>
                              Health ID: {user.healthId} • Mobile: {user.mobileNumber}
                            </Text>
                          )}
                        </View>
                        {selectedUser?.id === user.id && (
                          <Text style={styles.modalOptionCheck}>✓</Text>
                        )}
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              </Pressable>
            </Modal>

            {/* Health ID Input */}
            <Text style={styles.label}>
              <Text style={styles.labelIcon}>🆔 </Text>
              Health ID
            </Text>
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.inputFull}
                placeholder="Enter your Health ID (e.g., ABHA ID)"
                placeholderTextColor="#7A8FA6"
                value={healthId}
                onChangeText={setHealthId}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            {/* Mobile Number Input */}
            <Text style={styles.label}>
              <Text style={styles.labelIcon}>📱 </Text>
              Mobile Number
            </Text>
            <View style={styles.inputContainer}>
              <Text style={styles.countryCode}>+91</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter 10-digit mobile number"
                placeholderTextColor="#7A8FA6"
                value={mobileNumber}
                onChangeText={handleMobileChange}
                keyboardType="phone-pad"
                maxLength={10}
              />
            </View>

            {/* User ID Input */}
            <Text style={styles.label}>
              <Text style={styles.labelIcon}>👤 </Text>
              Patient ID
            </Text>
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.inputFull}
                placeholder="Enter your Patient ID"
                placeholderTextColor="#7A8FA6"
                value={userId}
                onChangeText={setUserId}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            {/* Continue Button */}
            <TouchableOpacity
              style={[
                styles.button,
                isFormValid && !isStartingConsultation ? styles.buttonActive : null,
                isStartingConsultation ? styles.buttonDisabled : null,
              ]}
              onPress={handleContinue}
              activeOpacity={0.8}
              disabled={isStartingConsultation}>
              {isStartingConsultation ? (
                <>
                  <ActivityIndicator
                    size="small"
                    color="#FFFFFF"
                    style={styles.buttonLoader}
                  />
                  <Text style={[styles.buttonText, styles.buttonTextActive]}>
                    Starting Consultation...
                  </Text>
                </>
              ) : (
                <>
                  <Text style={styles.buttonIcon}>💬</Text>
                  <Text
                    style={[
                      styles.buttonText,
                      isFormValid ? styles.buttonTextActive : null,
                    ]}>
                    Start Consultation
                  </Text>
                </>
              )}
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
            <Text style={styles.footerText}>
              By continuing, you agree to our Terms of Service and Privacy Policy
            </Text>
            <Text style={styles.disclaimerText}>
              ⚠️ For emergencies, please call 112 or visit the nearest hospital
            </Text>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
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
    justifyContent: 'center',
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
    fontSize: 56,
  },
  heartPulse: {
    marginTop: -8,
  },
  ecgLine: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ecgText: {
    fontSize: 24,
    color: '#DC3545',
    fontWeight: '300',
    letterSpacing: 2,
  },
  logo: {
    fontSize: 52,
    fontWeight: '800',
    color: '#DC3545',
    letterSpacing: 3,
    textShadowColor: 'rgba(220, 53, 69, 0.4)',
    textShadowOffset: {width: 0, height: 0},
    textShadowRadius: 20,
  },
  tagline: {
    fontSize: 15,
    color: '#E8E8E8',
    marginTop: 6,
    letterSpacing: 1,
    fontWeight: '500',
  },
  subtitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  stethoscopeDecor: {
    marginRight: 8,
  },
  stethoscopeEmoji: {
    fontSize: 16,
  },
  subtitle: {
    fontSize: 13,
    color: '#17A2B8',
    letterSpacing: 2,
    textTransform: 'uppercase',
    fontWeight: '600',
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(23, 162, 184, 0.15)',
    borderRadius: 12,
    padding: 14,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(23, 162, 184, 0.3)',
  },
  infoIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: '#B8D4E3',
    lineHeight: 18,
  },
  formContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(220, 53, 69, 0.2)',
    shadowColor: '#DC3545',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 8,
  },
  formHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  formTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 1,
  },
  formDivider: {
    width: 60,
    height: 3,
    backgroundColor: '#DC3545',
    borderRadius: 2,
    marginTop: 12,
  },
  dropdownContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(13, 27, 42, 0.8)',
    borderRadius: 14,
    padding: 12,
    marginBottom: 20,
    borderWidth: 1.5,
    borderColor: 'rgba(220, 53, 69, 0.4)',
  },
  dropdownLeftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  dropdownAvatarContainer: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(220, 53, 69, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    borderWidth: 1.5,
    borderColor: 'rgba(220, 53, 69, 0.4)',
  },
  dropdownAvatar: {
    fontSize: 18,
    color: '#DC3545',
    fontWeight: '700',
  },
  dropdownTextContainer: {
    flex: 1,
  },
  dropdownValue: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  dropdownSubtext: {
    fontSize: 12,
    color: '#17A2B8',
    marginTop: 2,
    fontWeight: '500',
  },
  dropdownArrowContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(220, 53, 69, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dropdownArrow: {
    fontSize: 10,
    color: '#DC3545',
  },
  dropdownAvatarPlaceholder: {
    backgroundColor: 'rgba(160, 180, 200, 0.15)',
    borderColor: 'rgba(160, 180, 200, 0.3)',
  },
  dropdownPlaceholder: {
    color: '#7A8FA6',
    fontWeight: '400',
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    width: '100%',
    maxHeight: '70%',
    backgroundColor: '#0D1B2A',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(220, 53, 69, 0.3)',
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 18,
    backgroundColor: 'rgba(220, 53, 69, 0.1)',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  modalCloseButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCloseText: {
    fontSize: 16,
    color: '#A0B4C8',
    fontWeight: '600',
  },
  modalDivider: {
    height: 1,
    backgroundColor: 'rgba(220, 53, 69, 0.2)',
  },
  modalList: {
    padding: 8,
  },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    marginBottom: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
  },
  modalOptionSelected: {
    backgroundColor: 'rgba(220, 53, 69, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(220, 53, 69, 0.4)',
  },
  modalOptionLast: {
    marginBottom: 8,
  },
  modalOptionAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(220, 53, 69, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
    borderWidth: 2,
    borderColor: 'rgba(220, 53, 69, 0.4)',
  },
  modalOptionAvatarManual: {
    backgroundColor: 'rgba(23, 162, 184, 0.2)',
    borderColor: 'rgba(23, 162, 184, 0.4)',
  },
  modalOptionAvatarText: {
    fontSize: 20,
    color: '#DC3545',
    fontWeight: '700',
  },
  modalOptionTextContainer: {
    flex: 1,
  },
  modalOptionName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  modalOptionDetails: {
    fontSize: 12,
    color: '#17A2B8',
    fontWeight: '500',
  },
  modalOptionCheck: {
    fontSize: 18,
    color: '#DC3545',
    fontWeight: '700',
    marginLeft: 8,
  },
  label: {
    fontSize: 13,
    color: '#A0B4C8',
    marginBottom: 10,
    letterSpacing: 0.5,
    fontWeight: '600',
  },
  labelIcon: {
    fontSize: 14,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(13, 27, 42, 0.8)',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: 'rgba(160, 180, 200, 0.2)',
    marginBottom: 20,
  },
  countryCode: {
    fontSize: 17,
    color: '#17A2B8',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderRightWidth: 1,
    borderRightColor: 'rgba(160, 180, 200, 0.2)',
    fontWeight: '600',
  },
  input: {
    flex: 1,
    fontSize: 17,
    color: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  inputFull: {
    flex: 1,
    fontSize: 17,
    color: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  button: {
    flexDirection: 'row',
    backgroundColor: 'rgba(220, 53, 69, 0.25)',
    borderRadius: 14,
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(220, 53, 69, 0.4)',
    marginTop: 8,
  },
  buttonActive: {
    backgroundColor: '#DC3545',
    borderColor: '#DC3545',
    shadowColor: '#DC3545',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 6,
  },
  buttonDisabled: {
    backgroundColor: 'rgba(220, 53, 69, 0.5)',
    borderColor: 'rgba(220, 53, 69, 0.5)',
  },
  buttonLoader: {
    marginRight: 10,
  },
  buttonIcon: {
    fontSize: 18,
    marginRight: 10,
  },
  buttonText: {
    fontSize: 17,
    fontWeight: '700',
    color: 'rgba(255, 255, 255, 0.6)',
    letterSpacing: 1,
  },
  buttonTextActive: {
    color: '#FFFFFF',
  },
  trustContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 28,
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
    marginTop: 32,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 11,
    color: '#5A7089',
    textAlign: 'center',
    lineHeight: 16,
  },
  disclaimerText: {
    fontSize: 11,
    color: '#DC3545',
    textAlign: 'center',
    marginTop: 12,
    fontWeight: '500',
  },
});

export default LoginScreen;
