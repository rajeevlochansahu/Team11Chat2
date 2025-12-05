import React, {useEffect, useRef} from 'react';
import {View, Text, StyleSheet, Animated, Dimensions, Easing} from 'react-native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import type {RootStackParamList} from '../navigation/types';
import {getPatientAuth} from '../features/auth';

const {width, height} = Dimensions.get('window');

type SplashScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'Splash'
>;

type Props = {
  navigation: SplashScreenNavigationProp;
};

// Animated Heart Component
const AnimatedHeart = () => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    // Heartbeat animation
    const heartbeat = Animated.loop(
      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 1.15,
          duration: 150,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 150,
          easing: Easing.in(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1.1,
          duration: 150,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 150,
          easing: Easing.in(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.delay(600),
      ]),
    );

    const glow = Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, {
          toValue: 0.8,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(glowAnim, {
          toValue: 0.3,
          duration: 800,
          useNativeDriver: true,
        }),
      ]),
    );

    heartbeat.start();
    glow.start();

    return () => {
      heartbeat.stop();
      glow.stop();
    };
  }, [scaleAnim, glowAnim]);

  return (
    <View style={heartStyles.container}>
      <Animated.View style={[heartStyles.glowOuter, {opacity: glowAnim}]} />
      <Animated.View style={[heartStyles.glowMiddle, {opacity: glowAnim}]} />
      <Animated.View
        style={[
          heartStyles.heartContainer,
          {transform: [{scale: scaleAnim}]},
        ]}>
        <Text style={heartStyles.heartEmoji}>❤️</Text>
      </Animated.View>
      <View style={heartStyles.ecgContainer}>
        <Text style={heartStyles.ecgText}>~∿∿~</Text>
      </View>
    </View>
  );
};

const heartStyles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 220,
    height: 220,
  },
  glowOuter: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(220, 53, 69, 0.15)',
  },
  glowMiddle: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(220, 53, 69, 0.25)',
  },
  heartContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  heartEmoji: {
    fontSize: 80,
  },
  ecgContainer: {
    marginTop: -10,
  },
  ecgText: {
    fontSize: 28,
    color: '#DC3545',
    fontWeight: '300',
    letterSpacing: 3,
  },
});

const SplashScreen: React.FC<Props> = ({navigation}) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const taglineFade = useRef(new Animated.Value(0)).current;
  const taglineSlide = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    // Start animations
    Animated.sequence([
      // Fade in logo and animation
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 800,
          useNativeDriver: true,
        }),
      ]),
      // Fade in tagline
      Animated.delay(200),
      Animated.parallel([
        Animated.timing(taglineFade, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(taglineSlide, {
          toValue: 0,
          duration: 600,
          useNativeDriver: true,
        }),
      ]),
    ]).start();

    // Check for existing login and navigate accordingly
    const checkAuthAndNavigate = async () => {
      try {
        const authData = await getPatientAuth();
        
        // Wait for animation to complete before navigating
        setTimeout(() => {
          if (authData) {
            // User is logged in, navigate to LoggedIn screen
            console.log('[SplashScreen] Found existing login, navigating to LoggedIn');
            navigation.replace('LoggedIn', {
              healthId: authData.healthId,
              mobileNumber: authData.mobileNumber,
              userId: authData.userId,
              patientName: authData.patientName,
            });
          } else {
            // No existing login, navigate to Login screen
            console.log('[SplashScreen] No existing login, navigating to Login');
            navigation.replace('Login');
          }
        }, 3500);
      } catch (error) {
        console.error('[SplashScreen] Error checking auth:', error);
        // On error, default to Login screen
        setTimeout(() => {
          navigation.replace('Login');
        }, 3500);
      }
    };

    checkAuthAndNavigate();
  }, [navigation, fadeAnim, slideAnim, taglineFade, taglineSlide]);

  return (
    <View style={styles.container}>
      {/* Background gradient circles */}
      <View style={styles.backgroundPattern}>
        <View style={styles.gradientCircle1} />
        <View style={styles.gradientCircle2} />
        <View style={styles.gradientCircle3} />
        <View style={styles.gradientCircle4} />
      </View>

      {/* Main content */}
      <Animated.View
        style={[
          styles.content,
          {
            opacity: fadeAnim,
            transform: [{translateY: slideAnim}],
          },
        ]}>
        {/* Animated Heart */}
        <View style={styles.animationContainer}>
          <AnimatedHeart />
        </View>

        {/* Logo */}
        <Text style={styles.logo}>HridAI</Text>

        {/* Tagline */}
        <Animated.View
          style={{
            opacity: taglineFade,
            transform: [{translateY: taglineSlide}],
          }}>
          <Text style={styles.tagline}>Your Cardiac Health Companion</Text>
          <View style={styles.divider} />
          <Text style={styles.subtitle}>AI-Powered Cardiology Assistant</Text>
        </Animated.View>
      </Animated.View>

      {/* Footer */}
      <Animated.View style={[styles.footer, {opacity: taglineFade}]}>
        <View style={styles.pulseIndicator}>
          <View style={styles.pulseDot} />
          <View style={styles.pulseLine} />
          <View style={styles.pulseWave}>
            <Text style={styles.pulseWaveText}>∿∿∿</Text>
          </View>
          <View style={styles.pulseLine} />
          <View style={styles.pulseDot} />
        </View>
        <Text style={styles.footerText}>Initializing Health AI...</Text>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0D1B2A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backgroundPattern: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  gradientCircle1: {
    position: 'absolute',
    top: -height * 0.15,
    right: -width * 0.25,
    width: width * 0.8,
    height: width * 0.8,
    borderRadius: width * 0.4,
    backgroundColor: 'rgba(220, 53, 69, 0.12)',
  },
  gradientCircle2: {
    position: 'absolute',
    bottom: height * 0.1,
    left: -width * 0.2,
    width: width * 0.6,
    height: width * 0.6,
    borderRadius: width * 0.3,
    backgroundColor: 'rgba(220, 53, 69, 0.08)',
  },
  gradientCircle3: {
    position: 'absolute',
    top: height * 0.35,
    right: -width * 0.15,
    width: width * 0.5,
    height: width * 0.5,
    borderRadius: width * 0.25,
    backgroundColor: 'rgba(23, 162, 184, 0.1)',
  },
  gradientCircle4: {
    position: 'absolute',
    bottom: height * 0.25,
    right: width * 0.1,
    width: width * 0.3,
    height: width * 0.3,
    borderRadius: width * 0.15,
    backgroundColor: 'rgba(220, 53, 69, 0.06)',
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  animationContainer: {
    width: 220,
    height: 220,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  logo: {
    fontSize: 64,
    fontWeight: '900',
    color: '#DC3545',
    letterSpacing: 4,
    textShadowColor: 'rgba(220, 53, 69, 0.5)',
    textShadowOffset: {width: 0, height: 0},
    textShadowRadius: 30,
    marginBottom: 16,
  },
  tagline: {
    fontSize: 18,
    color: '#E8E8E8',
    letterSpacing: 1.5,
    fontWeight: '500',
    textAlign: 'center',
    marginBottom: 16,
  },
  divider: {
    width: 80,
    height: 3,
    backgroundColor: '#17A2B8',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },
  subtitle: {
    fontSize: 13,
    color: '#17A2B8',
    letterSpacing: 3,
    textTransform: 'uppercase',
    fontWeight: '600',
    textAlign: 'center',
  },
  footer: {
    position: 'absolute',
    bottom: 60,
    alignItems: 'center',
  },
  pulseIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  pulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#DC3545',
  },
  pulseLine: {
    width: 30,
    height: 2,
    backgroundColor: 'rgba(220, 53, 69, 0.4)',
  },
  pulseWave: {
    marginHorizontal: 4,
  },
  pulseWaveText: {
    fontSize: 16,
    color: '#DC3545',
    fontWeight: '300',
  },
  footerText: {
    fontSize: 13,
    color: '#6C8EAD',
    letterSpacing: 1,
    fontWeight: '500',
  },
});

export default SplashScreen;
