import * as Location from 'expo-location';

export async function initLocation() {
  // Request foreground permissions
  const { status: foregroundStatus } = await Location.requestForegroundPermissionsAsync();
  if (foregroundStatus !== 'granted') {
    console.log('Permission to access location was denied');
    return null;
  }

  // Get current location
  const location = await Location.getCurrentPositionAsync({});
  //console.log('Current location:', location);

  // You can also start watching position if needed
  // const subscription = await Location.watchPositionAsync({ accuracy: Location.Accuracy.High }, (newLocation) => {
  //   console.log('Location updated:', newLocation);
  // });

  return location;
}