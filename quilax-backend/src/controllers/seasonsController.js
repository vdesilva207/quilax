import prisma from "../lib/prisma.js";
import {
  getActiveSeason,
  getSeasonRanking,
  getSeasonTop2000,
  closeSeason,
  createNextSeason,
} from "../services/season.service.js";

export async function getActiveSeasonController(req, res) {
  try {
    const season = await getActiveSeason();
    res.json(season);
  } catch (err) {
    console.error("❌ getActiveSeason error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}

export async function getSeasonsHistory(req, res) {
  try {
    const seasons = await prisma.season.findMany({
      orderBy: { startsAt: "desc" },
    });

    res.json(seasons);
  } catch (err) {
    console.error("❌ getSeasonsHistory error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}

export async function getSeasonRankingController(req, res) {
  try {
    const seasonId = Number(req.params.seasonId);
    if (!seasonId) return res.status(400).json({ error: "Invalid seasonId" });

    const ranking = await getSeasonRanking(seasonId, 100);
    res.json(ranking);
  } catch (err) {
    console.error("❌ getSeasonRanking error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}

export async function getSeasonTopController(req, res) {
  try {
    const seasonId = Number(req.params.seasonId);
    if (!seasonId) return res.status(400).json({ error: "Invalid seasonId" });

    const ranking = await getSeasonTop2000(seasonId);
    res.json(ranking);
  } catch (err) {
    console.error("❌ getSeasonTop error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}

export async function getSeasonWinners(req, res) {
  try {
    const seasonId = Number(req.params.seasonId);
    if (!seasonId) return res.status(400).json({ error: "Invalid seasonId" });

    const winners = await prisma.seasonWinner.findMany({
      where: { seasonId },
      orderBy: { position: "asc" },
      include: {
        user: {
          select: {
            id: true,
            email: true,
          },
        },
      },
    });

    res.json(winners);
  } catch (err) {
    console.error("❌ getSeasonWinners error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}

export async function closeSeasonController(req, res) {
  try {
    const seasonId = Number(req.params.seasonId);
    if (!seasonId) return res.status(400).json({ error: "Invalid seasonId" });

    const winners = await closeSeason(seasonId);
    const newSeason = await createNextSeason();

    res.json({
      closedSeason: seasonId,
      newSeason,
      winners: winners.slice(0, 10),
    });
  } catch (err) {
    console.error("❌ closeSeason error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}


