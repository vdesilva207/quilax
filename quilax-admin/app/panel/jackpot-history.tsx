import { Redirect } from 'expo-router';

/** Fusionado en Temporadas → pestaña Historial jackpot */
export default function JackpotHistoryRedirect() {
  return <Redirect href="/panel/seasons" />;
}
