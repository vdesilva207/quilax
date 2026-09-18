import 'react-native-gesture-handler';
import './src/bootHideSplash';
// Must run before expo-router loads any screen Text — remaps Sora weights on Android.
import './src/lib/installSoraFontFix';
import 'expo-router/entry';
