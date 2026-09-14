import { Redirect } from 'expo-router';

/** Fusionado en Temporadas → pestaña Reparto jackpot */
export default function SeasonJackpotDistributionRedirect() {
  return <Redirect href="/panel/seasons" />;
}
