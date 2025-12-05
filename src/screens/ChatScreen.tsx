import React, {useState, useRef, useCallback, useEffect} from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Animated,
  Alert,
  PermissionsAndroid,
  Keyboard,
} from 'react-native';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {CommonActions} from '@react-navigation/native';
import type {RootStackParamList} from '../navigation/types';
import {
  useSocket,
  SocketConnectionState,
  IncomingChatMessage,
  SocketErrorPayload,
  ConsultationOfferPayload,
  SOCKET_CONFIG,
} from '../features/socket';
import { useSession } from '../features/session';
import Voice, {
  SpeechResultsEvent,
  SpeechErrorEvent,
} from '@react-native-voice/voice';

type Props = NativeStackScreenProps<RootStackParamList, 'Chat'>;

type Message = {
  id: string;
  text: string;
  sender: 'user' | 'doctor';
  timestamp: Date;
};

// Screen states
type ScreenState = 'loading_session' | 'session_error' | 'ready';

// Doctor Avatar Component
const DoctorAvatar = ({size = 44}: {size?: number}) => (
  <View style={[styles.doctorAvatar, {width: size, height: size, borderRadius: size / 2}]}>
    <Text style={[styles.doctorAvatarEmoji, {fontSize: size * 0.5}]}>👨‍⚕️</Text>
  </View>
);

// Typing Indicator with animated dots
const TypingIndicator = () => {
  const [dots, setDots] = useState('');
  
  useEffect(() => {
    const interval = setInterval(() => {
      setDots(prev => prev.length >= 3 ? '' : prev + '.');
    }, 500);
    return () => clearInterval(interval);
  }, []);

  return (
    <View style={styles.typingContainer}>
      <DoctorAvatar size={32} />
      <View style={styles.typingBubble}>
        <Text style={styles.typingText}>Dr. HridAI is typing{dots}</Text>
      </View>
    </View>
  );
};

// Animated Responding Indicator - shown while waiting for bot response
const RespondingIndicator = () => {
  const dot1Anim = useRef(new Animated.Value(0)).current;
  const dot2Anim = useRef(new Animated.Value(0)).current;
  const dot3Anim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Bouncing dots animation
    const createBounce = (animValue: Animated.Value, delay: number) => {
      return Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(animValue, {
            toValue: -8,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.timing(animValue, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }),
        ])
      );
    };

    // Pulse animation for the container
    const pulseAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.02,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );

    const bounce1 = createBounce(dot1Anim, 0);
    const bounce2 = createBounce(dot2Anim, 150);
    const bounce3 = createBounce(dot3Anim, 300);

    bounce1.start();
    bounce2.start();
    bounce3.start();
    pulseAnimation.start();

    return () => {
      bounce1.stop();
      bounce2.stop();
      bounce3.stop();
      pulseAnimation.stop();
    };
  }, [dot1Anim, dot2Anim, dot3Anim, pulseAnim]);

  return (
    <View style={styles.respondingContainer}>
      <DoctorAvatar size={36} />
      <Animated.View style={[styles.respondingBubble, { transform: [{ scale: pulseAnim }] }]}>
        <View style={styles.respondingContent}>
          <Text style={styles.respondingIcon}>🩺</Text>
          <Text style={styles.respondingText}>Dr. HridAI is analyzing</Text>
          <View style={styles.dotsContainer}>
            <Animated.View style={[styles.dot, { transform: [{ translateY: dot1Anim }] }]} />
            <Animated.View style={[styles.dot, { transform: [{ translateY: dot2Anim }] }]} />
            <Animated.View style={[styles.dot, { transform: [{ translateY: dot3Anim }] }]} />
          </View>
        </View>
        <View style={styles.respondingSubtextContainer}>
          <Text style={styles.respondingSubtext}>💓 Processing your health query</Text>
        </View>
      </Animated.View>
    </View>
  );
};

// Heart Rate Animation Component
const HeartRateIndicator = () => (
  <View style={styles.heartRateContainer}>
    <Text style={styles.heartRateIcon}>💓</Text>
    <Text style={styles.heartRateText}>~∿∿~</Text>
  </View>
);

const ChatScreen: React.FC<Props> = ({route, navigation}) => {
  const {healthId, mobileNumber, userId} = route.params;
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [typingUser, setTypingUser] = useState<string | null>(null);
  const [screenState, setScreenState] = useState<ScreenState>('loading_session');
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [isWaitingForResponse, setIsWaitingForResponse] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Session management
  const {
    isLoading: isSessionLoading,
    session,
    error: sessionError,
    hasExistingSession,
    getOrCreateSession,
    clearError: clearSessionError,
  } = useSession();

  // Voice recognition setup
  useEffect(() => {
    const onSpeechResults = (e: SpeechResultsEvent) => {
      console.log('[ChatScreen] Speech results:', e.value);
      if (e.value && e.value.length > 0) {
        const spokenText = e.value[0];
        setMessage(prev => prev ? `${prev} ${spokenText}` : spokenText);
      }
    };

    const onSpeechError = (e: SpeechErrorEvent) => {
      console.error('[ChatScreen] Speech error:', e.error);
      setIsListening(false);
      if (e.error?.message) {
        Alert.alert('Speech Error', e.error.message);
      }
    };

    const onSpeechEnd = () => {
      console.log('[ChatScreen] Speech ended');
      setIsListening(false);
    };

    Voice.onSpeechResults = onSpeechResults;
    Voice.onSpeechError = onSpeechError;
    Voice.onSpeechEnd = onSpeechEnd;

    return () => {
      Voice.destroy().then(Voice.removeAllListeners);
    };
  }, []);

  // Request microphone permission (Android)
  const requestMicrophonePermission = async (): Promise<boolean> => {
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
          {
            title: 'Microphone Permission',
            message: 'This app needs access to your microphone for voice input.',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          }
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      } catch (err) {
        console.error('[ChatScreen] Permission error:', err);
        return false;
      }
    }
    return true; // iOS handles permissions automatically
  };

  // Start/Stop voice recognition
  const toggleVoiceRecognition = async () => {
    if (isListening) {
      try {
        await Voice.stop();
        setIsListening(false);
      } catch (e) {
        console.error('[ChatScreen] Error stopping voice:', e);
      }
    } else {
      const hasPermission = await requestMicrophonePermission();
      if (!hasPermission) {
        Alert.alert(
          'Permission Required',
          'Microphone permission is required for voice input. Please enable it in your device settings.'
        );
        return;
      }
      try {
        setIsListening(true);
        await Voice.start('en-US');
      } catch (e) {
        console.error('[ChatScreen] Error starting voice:', e);
        setIsListening(false);
        Alert.alert('Error', 'Failed to start voice recognition. Please try again.');
      }
    }
  };

  // Initialize session on mount
  useEffect(() => {
    const initializeSession = async () => {
      console.log('[ChatScreen] Initializing session for user:', userId);
      setScreenState('loading_session');
      
      const sessionData = await getOrCreateSession({
        userId: userId,
        userJhhId: healthId,
      });

      if (sessionData && sessionData.session_token) {
        console.log('[ChatScreen] Session obtained:', sessionData.session_id);
        console.log('[ChatScreen] Is existing session:', hasExistingSession);
        setSessionToken(sessionData.session_token);
        setScreenState('ready');
      } else {
        console.error('[ChatScreen] Failed to get session');
        setScreenState('session_error');
      }
    };

    initializeSession();
  }, [userId, healthId, getOrCreateSession, hasExistingSession]);

  // Handle incoming messages from socket
  const handleIncomingMessage = useCallback((incomingMessage: IncomingChatMessage) => {
    console.log('[ChatScreen] Incoming message:', incomingMessage);
    
    // If message is from doctor/bot, stop waiting indicator
    if (incomingMessage.senderId !== userId) {
      setIsWaitingForResponse(false);
    }
    
    // Safely convert content to string - handle case where content might be an object
    let messageText: string;
    if (typeof incomingMessage.content === 'string') {
      messageText = incomingMessage.content;
    } else if (incomingMessage.content && typeof incomingMessage.content === 'object') {
      // If content is an object, convert it to a readable string
      messageText = Object.values(incomingMessage.content).filter(v => v).join('\n');
    } else {
      messageText = String(incomingMessage.content || '');
    }
    
    const newMessage: Message = {
      id: incomingMessage.id,
      text: messageText,
      sender: incomingMessage.senderId === userId ? 'user' : 'doctor',
      timestamp: new Date(incomingMessage.timestamp),
    };
    setMessages(prev => [...prev, newMessage]);
  }, [userId]);

  // Handle AI response from socket
  const handleAIResponse = useCallback((response: string) => {
    console.log('[ChatScreen] AI Response received:', response);
    setIsWaitingForResponse(false);
    const aiMessage: Message = {
      id: `ai_${Date.now()}`,
      text: response,
      sender: 'doctor',
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, aiMessage]);
  }, []);

  // Handle typing indicator
  const handleTyping = useCallback((typingUserId: string, typing: boolean) => {
    if (typingUserId !== userId) {
      setTypingUser(typing ? typingUserId : null);
    }
  }, [userId]);

  // Handle socket errors
  const handleSocketError = useCallback((error: SocketErrorPayload) => {
    console.error('[ChatScreen] Socket error:', error);
    const errorMessage: Message = {
      id: Date.now().toString(),
      text: `⚠️ Connection issue: ${error.message}. Please try again.`,
      sender: 'doctor',
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, errorMessage]);
  }, []);

  // Handle consultation offer events
  const handleConsultationOffer = useCallback((payload: ConsultationOfferPayload) => {
    console.log('[ChatScreen] Consultation offer received:', payload);
    setIsWaitingForResponse(false);
    
    // Build a friendly message for the user
    const consultationMessage: Message = {
      id: `consultation_${Date.now()}`,
      text: `🩺 **Connecting you to a specialist**\n\nBased on your symptoms and health information, I'm arranging a consultation with a qualified cardiologist for you.\n\n✅ Your case has been reviewed\n✅ A doctor will be connected shortly\n✅ Please stay on this screen\n\n💡 **Recommendations while you wait:**\n• Keep your health ID and medical history handy\n• Note down any specific questions you'd like to ask\n• Ensure you're in a quiet place for the consultation\n\n_A specialist will join this conversation soon to provide personalized guidance for your cardiac health._`,
      sender: 'doctor',
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, consultationMessage]);
  }, []);

  // Initialize socket connection with session token
  const {
    isConnected,
    connectionState,
    connectionInfo,
    connect,
    disconnect,
    sendTextMessage,
    sendTypingIndicator,
    error: socketError,
  } = useSocket({
    sessionToken: sessionToken || '',
    autoConnect: !!sessionToken,
    onMessage: handleIncomingMessage,
    onAIResponse: handleAIResponse,
    onTyping: handleTyping,
    onError: handleSocketError,
    onConsultationOffer: handleConsultationOffer,
  });

  // Add welcome message when connected
  useEffect(() => {
    if (isConnected && messages.length === 0) {
      setMessages([
        {
          id: '1',
          text: `Hello! I'm Dr. HridAI, your AI cardiologist assistant. 🩺\n\nI'm here to help you with:\n• Heart health questions\n• Understanding symptoms\n• Lifestyle recommendations\n• Medication guidance\n\nHow can I assist you with your cardiac health today?`,
          sender: 'doctor',
          timestamp: new Date(),
        },
      ]);
    }
  }, [isConnected, messages.length]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      disconnect();
    };
  }, [disconnect]);

  // Track keyboard visibility
  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      () => setIsKeyboardVisible(true)
    );
    const keyboardDidHideListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => setIsKeyboardVisible(false)
    );

    return () => {
      keyboardDidShowListener.remove();
      keyboardDidHideListener.remove();
    };
  }, []);

  // Handle connection loss - navigate back to Login screen
  useEffect(() => {
    // Only trigger if we had a session and connection failed after max reconnect attempts
    if (
      sessionToken &&
      connectionState === SocketConnectionState.ERROR &&
      connectionInfo.reconnectAttempts >= SOCKET_CONFIG.MAX_RECONNECT_ATTEMPTS
    ) {
      console.log('[ChatScreen] Connection lost after max reconnect attempts, navigating to Login');
      
      // Show alert to user before navigating
      Alert.alert(
        'Connection Lost',
        'Unable to maintain connection to the consultation service. Please log in again.',
        [
          {
            text: 'OK',
            onPress: () => {
              // Reset navigation stack and go to Login
              navigation.dispatch(
                CommonActions.reset({
                  index: 0,
                  routes: [{name: 'Login'}],
                })
              );
            },
          },
        ],
        {cancelable: false}
      );
    }
  }, [connectionState, connectionInfo.reconnectAttempts, sessionToken, navigation]);

  // Retry session initialization
  const retrySession = useCallback(async () => {
    clearSessionError();
    setScreenState('loading_session');
    
    const sessionData = await getOrCreateSession({
      userId: userId,
      userJhhId: healthId,
    });

    if (sessionData && sessionData.session_token) {
      setSessionToken(sessionData.session_token);
      setScreenState('ready');
    } else {
      setScreenState('session_error');
    }
  }, [userId, healthId, getOrCreateSession, clearSessionError]);

  // Handle text input change with typing indicator
  const handleTextChange = (text: string) => {
    setMessage(text);

    if (text.length > 0 && !isTyping) {
      setIsTyping(true);
      sendTypingIndicator(userId, true);
    }

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      sendTypingIndicator(userId, false);
    }, 2000);
  };

  const sendMessage = () => {
    if (!message.trim()) {
      return;
    }

    const messageText = message.trim();

    setIsTyping(false);
    sendTypingIndicator(userId, false);
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    const newMessage: Message = {
      id: Date.now().toString(),
      text: messageText,
      sender: 'user',
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, newMessage]);
    setMessage('');
    
    // Dismiss keyboard on send
    Keyboard.dismiss();
    
    // Start waiting for response animation
    setIsWaitingForResponse(true);

    console.log('[ChatScreen] Sending text_message:', messageText);
    const sent = sendTextMessage(messageText);
    if (!sent) {
      console.warn('[ChatScreen] Failed to send message through socket');
      setIsWaitingForResponse(false);
    }
  };

  const formatTime = (date: Date): string => {
    return date.toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'});
  };

  const renderMessage = ({item}: {item: Message}) => {
    const isDoctor = item.sender === 'doctor';

    return (
      <View style={[styles.messageRow, isDoctor ? styles.doctorRow : styles.patientRow]}>
        {isDoctor && <DoctorAvatar size={36} />}
        
        <View style={[styles.messageContent, isDoctor ? styles.doctorContent : styles.patientContent]}>
          {isDoctor && <Text style={styles.senderLabel}>Dr. HridAI</Text>}
          
          <View style={[styles.messageBubble, isDoctor ? styles.doctorBubble : styles.patientBubble]}>
            <Text style={[styles.messageText, isDoctor ? styles.doctorText : styles.patientText]}>
              {item.text}
            </Text>
          </View>
          
          <Text style={[styles.timestamp, isDoctor ? styles.doctorTimestamp : styles.patientTimestamp]}>
            {formatTime(item.timestamp)}
          </Text>
        </View>
      </View>
    );
  };

  // Get connection status
  const getConnectionStatus = () => {
    switch (connectionState) {
      case SocketConnectionState.CONNECTED:
        return { text: 'Online', color: '#28A745', icon: '🟢' };
      case SocketConnectionState.CONNECTING:
        return { text: 'Connecting...', color: '#FFC107', icon: '🟡' };
      case SocketConnectionState.RECONNECTING:
        return { text: 'Reconnecting...', color: '#FFC107', icon: '🟡' };
      case SocketConnectionState.ERROR:
        return { text: 'Offline', color: '#DC3545', icon: '🔴' };
      default:
        return { text: 'Offline', color: '#6C757D', icon: '⚪' };
    }
  };

  const connectionStatus = getConnectionStatus();

  // Loading session state
  if (screenState === 'loading_session') {
    return (
      <View style={styles.loadingContainer}>
        <View style={styles.loadingCard}>
          <Text style={styles.loadingIcon}>🩺</Text>
          <ActivityIndicator size="large" color="#DC3545" style={styles.loadingSpinner} />
          <Text style={styles.loadingTitle}>Preparing Your Consultation</Text>
          <Text style={styles.loadingSubtext}>Connecting you with Dr. HridAI...</Text>
          <HeartRateIndicator />
        </View>
      </View>
    );
  }

  // Session error state
  if (screenState === 'session_error') {
    return (
      <View style={styles.errorContainer}>
        <View style={styles.errorCard}>
          <Text style={styles.errorIcon}>⚠️</Text>
          <Text style={styles.errorTitle}>Connection Issue</Text>
          <Text style={styles.errorMessage}>
            {sessionError?.message || 'Unable to connect to the consultation service. Please check your connection and try again.'}
          </Text>
          <TouchableOpacity style={styles.retryButton} onPress={retrySession}>
            <Text style={styles.retryButtonText}>🔄 Try Again</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}>
      
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <DoctorAvatar size={50} />
          <View style={styles.headerInfo}>
            <Text style={styles.headerTitle}>Dr. HridAI</Text>
            <Text style={styles.headerSpecialty}>AI Cardiologist</Text>
            <View style={styles.statusContainer}>
              <View style={[styles.statusDot, { backgroundColor: connectionStatus.color }]} />
              <Text style={[styles.statusText, { color: connectionStatus.color }]}>
                {connectionStatus.text}
              </Text>
            </View>
          </View>
        </View>
        
        <View style={styles.headerRight}>
          <View style={styles.credentialBadge}>
            <Text style={styles.credentialIcon}>🏥</Text>
            <Text style={styles.credentialText}>Verified</Text>
          </View>
        </View>
      </View>

      {/* Patient Info Bar */}
      <View style={styles.patientBar}>
        <Text style={styles.patientBarText}>
          Patient ID: {userId} • Health ID: {healthId}
        </Text>
      </View>

      {/* Reconnect Banner */}
      {socketError && (
        <TouchableOpacity style={styles.reconnectBanner} onPress={() => connect()}>
          <Text style={styles.reconnectIcon}>⚡</Text>
          <Text style={styles.reconnectText}>Connection lost. Tap to reconnect</Text>
        </TouchableOpacity>
      )}

      {/* Typing Indicator */}
      {typingUser && <TypingIndicator />}

      {/* Waiting for Response Indicator */}
      {isWaitingForResponse && <RespondingIndicator />}

      {/* Messages */}
      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.messagesList}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({animated: true})}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View style={styles.consultationHeader}>
            <Text style={styles.consultationDate}>
              {new Date().toLocaleDateString('en-US', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </Text>
            <View style={styles.consultationDivider} />
          </View>
        }
      />

      {/* Quick Actions - hidden when keyboard is visible */}
      {!isKeyboardVisible && (
        <View style={styles.quickActions}>
          <TouchableOpacity style={styles.quickActionButton} onPress={() => setMessage('I have chest pain')}>
            <Text style={styles.quickActionText}>💔 Chest</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.quickActionButton} onPress={() => setMessage('I feel shortness of breath')}>
            <Text style={styles.quickActionText}>😮‍💨 Breath</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.quickActionButton} onPress={() => setMessage('My heart is racing')}>
            <Text style={styles.quickActionText}>💓 Racing</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Input Area */}
      <View style={styles.inputContainer}>
        <TouchableOpacity
          style={[
            styles.micButton,
            isListening && styles.micButtonActive,
            !isConnected && styles.micButtonDisabled,
          ]}
          onPress={toggleVoiceRecognition}
          activeOpacity={0.7}
          disabled={!isConnected}>
          <Text style={styles.micButtonText}>{isListening ? '⏹' : '🎤'}</Text>
        </TouchableOpacity>
        <View style={styles.inputWrapper}>
          <TextInput
            style={styles.input}
            placeholder={isListening ? "Listening..." : "Describe your symptoms..."}
            placeholderTextColor="#7A8FA6"
            value={message}
            onChangeText={handleTextChange}
            multiline
            maxLength={500}
            editable={isConnected && !isListening}
          />
        </View>
        <TouchableOpacity
          style={[
            styles.sendButton,
            message.trim() && isConnected && styles.sendButtonActive,
            !isConnected && styles.sendButtonDisabled,
          ]}
          onPress={sendMessage}
          activeOpacity={0.7}
          disabled={!isConnected || isListening}>
          <Text style={styles.sendButtonIcon}>📤</Text>
        </TouchableOpacity>
      </View>

      {/* Disclaimer */}
      <View style={styles.disclaimerBar}>
        <Text style={styles.disclaimerText}>
          ⚠️ This is AI-assisted guidance. For emergencies, call 112 immediately.
        </Text>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0D1B2A',
  },
  // Loading States
  loadingContainer: {
    flex: 1,
    backgroundColor: '#0D1B2A',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  loadingCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 24,
    padding: 40,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(220, 53, 69, 0.2)',
  },
  loadingIcon: {
    fontSize: 64,
    marginBottom: 20,
  },
  loadingSpinner: {
    marginBottom: 20,
  },
  loadingTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
  },
  loadingSubtext: {
    color: '#7A8FA6',
    fontSize: 14,
    marginBottom: 20,
  },
  heartRateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  heartRateIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  heartRateText: {
    fontSize: 18,
    color: '#DC3545',
    fontWeight: '300',
  },
  // Error States
  errorContainer: {
    flex: 1,
    backgroundColor: '#0D1B2A',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  errorCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 24,
    padding: 40,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(220, 53, 69, 0.3)',
  },
  errorIcon: {
    fontSize: 56,
    marginBottom: 16,
  },
  errorTitle: {
    color: '#DC3545',
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 12,
  },
  errorMessage: {
    color: '#7A8FA6',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 28,
    lineHeight: 22,
  },
  retryButton: {
    backgroundColor: '#DC3545',
    paddingVertical: 16,
    paddingHorizontal: 40,
    borderRadius: 24,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(220, 53, 69, 0.08)',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(220, 53, 69, 0.15)',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  doctorAvatar: {
    backgroundColor: '#1B3A4B',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#17A2B8',
  },
  doctorAvatarEmoji: {
    fontSize: 22,
  },
  headerInfo: {
    marginLeft: 14,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  headerSpecialty: {
    fontSize: 13,
    color: '#17A2B8',
    fontWeight: '500',
    marginTop: 2,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
  },
  headerRight: {
    alignItems: 'flex-end',
  },
  credentialBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(23, 162, 184, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(23, 162, 184, 0.3)',
  },
  credentialIcon: {
    fontSize: 12,
    marginRight: 4,
  },
  credentialText: {
    fontSize: 11,
    color: '#17A2B8',
    fontWeight: '600',
  },
  // Patient Bar
  patientBar: {
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  patientBarText: {
    fontSize: 11,
    color: '#6C8EAD',
    textAlign: 'center',
    fontWeight: '500',
  },
  // Reconnect Banner
  reconnectBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(220, 53, 69, 0.15)',
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  reconnectIcon: {
    fontSize: 14,
    marginRight: 8,
  },
  reconnectText: {
    fontSize: 13,
    color: '#DC3545',
    fontWeight: '600',
  },
  // Typing Indicator
  typingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: 'rgba(23, 162, 184, 0.05)',
  },
  typingBubble: {
    marginLeft: 10,
    backgroundColor: 'rgba(23, 162, 184, 0.15)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
  },
  typingText: {
    fontSize: 13,
    color: '#17A2B8',
    fontStyle: 'italic',
  },
  // Responding Indicator
  respondingContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: 'rgba(220, 53, 69, 0.05)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(220, 53, 69, 0.1)',
  },
  respondingBubble: {
    marginLeft: 12,
    backgroundColor: 'rgba(23, 162, 184, 0.12)',
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderRadius: 20,
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(23, 162, 184, 0.25)',
    maxWidth: '80%',
  },
  respondingContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  respondingIcon: {
    fontSize: 18,
    marginRight: 8,
  },
  respondingText: {
    fontSize: 14,
    color: '#17A2B8',
    fontWeight: '600',
  },
  dotsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 8,
    gap: 4,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#DC3545',
  },
  respondingSubtextContainer: {
    marginTop: 8,
  },
  respondingSubtext: {
    fontSize: 12,
    color: '#6C8EAD',
    fontStyle: 'italic',
  },
  // Messages
  messagesList: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  consultationHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  consultationDate: {
    fontSize: 12,
    color: '#6C8EAD',
    fontWeight: '500',
  },
  consultationDivider: {
    width: 100,
    height: 1,
    backgroundColor: 'rgba(108, 142, 173, 0.3)',
    marginTop: 10,
  },
  messageRow: {
    flexDirection: 'row',
    marginBottom: 16,
    alignItems: 'flex-end',
  },
  doctorRow: {
    justifyContent: 'flex-start',
  },
  patientRow: {
    justifyContent: 'flex-end',
  },
  messageContent: {
    maxWidth: '75%',
    marginHorizontal: 10,
  },
  doctorContent: {
    alignItems: 'flex-start',
  },
  patientContent: {
    alignItems: 'flex-end',
  },
  senderLabel: {
    fontSize: 11,
    color: '#17A2B8',
    fontWeight: '600',
    marginBottom: 4,
    marginLeft: 4,
  },
  messageBubble: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
  },
  doctorBubble: {
    backgroundColor: 'rgba(23, 162, 184, 0.12)',
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(23, 162, 184, 0.2)',
  },
  patientBubble: {
    backgroundColor: 'rgba(220, 53, 69, 0.1)',
    borderBottomRightRadius: 4,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 22,
  },
  doctorText: {
    color: '#E8E8E8',
  },
  patientText: {
    color: '#FFFFFF',
  },
  timestamp: {
    fontSize: 10,
    marginTop: 4,
    marginHorizontal: 4,
  },
  doctorTimestamp: {
    color: '#6C8EAD',
  },
  patientTimestamp: {
    color: '#6C8EAD',
  },
  // Quick Actions
  quickActions: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    gap: 8,
  },
  quickActionButton: {
    flex: 1,
    backgroundColor: 'rgba(220, 53, 69, 0.1)',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(220, 53, 69, 0.2)',
    alignItems: 'center',
  },
  quickActionText: {
    fontSize: 11,
    color: '#E8E8E8',
    fontWeight: '600',
  },
  // Input Area
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(220, 53, 69, 0.15)',
  },
  inputWrapper: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(160, 180, 200, 0.2)',
    marginRight: 12,
    maxHeight: 120,
  },
  input: {
    fontSize: 15,
    color: '#FFFFFF',
    paddingHorizontal: 20,
    paddingVertical: 12,
    maxHeight: 100,
  },
  sendButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(220, 53, 69, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(220, 53, 69, 0.4)',
  },
  sendButtonActive: {
    backgroundColor: '#DC3545',
    borderColor: '#DC3545',
  },
  sendButtonDisabled: {
    backgroundColor: 'rgba(108, 117, 125, 0.3)',
    borderColor: 'rgba(108, 117, 125, 0.3)',
  },
  sendButtonIcon: {
    fontSize: 22,
  },
  // Disclaimer
  disclaimerBar: {
    backgroundColor: 'rgba(220, 53, 69, 0.1)',
    paddingTop: 8,
    paddingBottom: 16,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(220, 53, 69, 0.2)',
  },
  disclaimerText: {
    fontSize: 10,
    color: '#DC3545',
    textAlign: 'center',
    fontWeight: '500',
  },
  micButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(0, 217, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  micButtonActive: {
    backgroundColor: '#FF4444',
  },
  micButtonDisabled: {
    backgroundColor: 'rgba(139, 157, 195, 0.3)',
  },
  micButtonText: {
    fontSize: 20,
  },
});

export default ChatScreen;
