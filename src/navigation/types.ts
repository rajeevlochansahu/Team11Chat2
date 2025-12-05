export type RootStackParamList = {
  Splash: undefined;
  Login: undefined;
  LoggedIn: {
    healthId: string;
    mobileNumber: string;
    userId: string;
    patientName: string;
  };
  Chat: {
    healthId: string;
    mobileNumber: string;
    userId: string;
  };
};
