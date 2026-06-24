import prisma from "../lib/prisma.js";
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
  // Temporarily disabled to prevent DB connection errors during development
  // setInterval(async () => {
  //   try {
  //     await checkSeasonExpiration();
  //   } catch (err) {
  //     console.error("Season worker error", err);
  //   }
  // }, 60000); // cada minuto
}