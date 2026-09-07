import {
  getActiveSeason,
  closeSeason,
  createNextSeason,
} from "../services/season.service.js";

/**
 * ⏱️ Comprobar si la temporada terminó
 */
export async function checkSeasonExpiration() {
  const season = await getActiveSeason();

  if (!season) {
    await createNextSeason();
    return;
  }

  const now = new Date();

  if (now < season.endsAt) {
    return;
  }

  console.log("🏁 Temporada finalizada:", season.id);

  try {
    await closeSeason(season.id);

    const newSeason = await createNextSeason();

    console.log("🆕 Nueva temporada creada:", newSeason.id);
  } catch (err) {
    console.error("❌ Error cerrando temporada", err);
  }
}

/**
 * 🔁 Worker automático
 */
export function startSeasonWorker() {
  const enabled = process.env.SEASON_WORKER_ENABLED !== "0";
  if (!enabled) return;

  let running = false;
  setInterval(async () => {
    if (running) return;
    running = true;
    try {
      await checkSeasonExpiration();
    } catch (e) {
      console.error(e);
    } finally {
      running = false;
    }
  }, Number(process.env.SEASON_WORKER_INTERVAL_MS) || 300000);
}
