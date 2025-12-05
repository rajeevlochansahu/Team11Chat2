import AsyncStorage from '@react-native-async-storage/async-storage';

const AUTH_STORAGE_KEY = '@hridai_patient_auth';

export interface PatientAuthData {
  healthId: string;
  mobileNumber: string;
  userId: string;
  patientName: string;
  loginTimestamp: number;
}

/**
 * Save patient authentication data to persistent storage
 */
export const savePatientAuth = async (data: PatientAuthData): Promise<boolean> => {
  try {
    const jsonValue = JSON.stringify(data);
    await AsyncStorage.setItem(AUTH_STORAGE_KEY, jsonValue);
    console.log('[AuthStorage] Patient auth data saved successfully');
    return true;
  } catch (error) {
    console.error('[AuthStorage] Error saving patient auth data:', error);
    return false;
  }
};

/**
 * Retrieve patient authentication data from persistent storage
 */
export const getPatientAuth = async (): Promise<PatientAuthData | null> => {
  try {
    const jsonValue = await AsyncStorage.getItem(AUTH_STORAGE_KEY);
    if (jsonValue !== null) {
      const data = JSON.parse(jsonValue) as PatientAuthData;
      console.log('[AuthStorage] Patient auth data retrieved successfully');
      return data;
    }
    console.log('[AuthStorage] No patient auth data found');
    return null;
  } catch (error) {
    console.error('[AuthStorage] Error retrieving patient auth data:', error);
    return null;
  }
};

/**
 * Clear patient authentication data from persistent storage (logout)
 */
export const clearPatientAuth = async (): Promise<boolean> => {
  try {
    await AsyncStorage.removeItem(AUTH_STORAGE_KEY);
    console.log('[AuthStorage] Patient auth data cleared successfully');
    return true;
  } catch (error) {
    console.error('[AuthStorage] Error clearing patient auth data:', error);
    return false;
  }
};

/**
 * Check if a patient is currently logged in
 */
export const isPatientLoggedIn = async (): Promise<boolean> => {
  try {
    const data = await getPatientAuth();
    return data !== null;
  } catch (error) {
    console.error('[AuthStorage] Error checking login status:', error);
    return false;
  }
};

