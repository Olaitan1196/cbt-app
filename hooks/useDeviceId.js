import * as Device from 'expo-device';
import * as Application from 'expo-application';
import { Platform } from 'react-native';

// Returns a unique ID for this specific phone/tablet
export const getDeviceId = async () => {
  let deviceId = null;

  if (Platform.OS === 'android') {
    // Android ID — survives reinstall unless factory reset
    deviceId = await Application.getAndroidId();
  } else if (Platform.OS === 'ios') {
    // iOS Vendor ID
    deviceId = await Application.getIosIdForVendorAsync();
  }

  // Fallback: combine device name + model as rough fingerprint
  if (!deviceId) {
    deviceId = `${Device.deviceName}-${Device.modelName}`;
  }

  return deviceId;
};