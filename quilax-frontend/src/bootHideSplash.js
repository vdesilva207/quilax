/** Side-effect: hide native splash before expo-router loads. Never preventAutoHide. */
import * as SplashScreen from 'expo-splash-screen';

const hide = () => {
  SplashScreen.hideAsync().catch(() => {});
};

hide();
setTimeout(hide, 300);
setTimeout(hide, 1200);
setTimeout(hide, 3000);
