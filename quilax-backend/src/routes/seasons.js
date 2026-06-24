import express from "express";
import {
  getActiveSeasonController,
  getSeasonsHistory,
  getSeasonRankingController,
  getSeasonTopController,
  getSeasonWinners,
  closeSeasonController,
} from "../controllers/seasonsController.js";
import {
  getAllSeasons,
  updateSeason,
  ensureSeasonsExist
} from "../services/prizeConfigService.js";

import { auth, roleMiddleware } from "../middleware/auth.js";

const router = express.Router();

/**
 * Temporada activa
 */
router.get("/active", getActiveSeasonController);

/**
 * Historial
 */
router.get("/history", getSeasonsHistory);

/**
 * Ranking temporada
 */
router.get("/:seasonId/ranking", getSeasonRankingController);

/**
 * Ranking top 2000
 */
router.get("/:seasonId/top", getSeasonTopController);

/**
 * Ganadores
 */
router.get("/:seasonId/winners", getSeasonWinners);

/**
 * Cerrar temporada (ADMIN)
 */
router.post(
  "/:seasonId/close",
  auth,
  roleMiddleware(["ADMIN"]),
  closeSeasonController
);

/**
 * Obtener todas las temporadas (ADMIN)
 */
router.get(
  "/admin/all",
  auth,
  roleMiddleware(["ADMIN"]),
  async (req, res) => {
    try {
      const seasons = await getAllSeasons();
      res.json({ success: true, seasons });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

/**
 * Actualizar temporada (ADMIN) - solo futuras
 */
router.put(
  "/:seasonId",
  auth,
  roleMiddleware(["ADMIN"]),
  async (req, res) => {
    try {
      const { name, color } = req.body;
      const updates = {};
      if (name !== undefined) updates.name = name;
      if (color !== undefined) updates.color = color;

      const season = await updateSeason(parseInt(req.params.seasonId), updates);
      res.json({ success: true, season });
    } catch (error) {
      res.status(400).json({ success: false, error: error.message });
    }
  }
);

/**
 * Asegurar que existan temporadas (ADMIN)
 */
router.post(
  "/ensure",
  auth,
  roleMiddleware(["ADMIN"]),
  async (req, res) => {
    try {
      const season = await ensureSeasonsExist();
      res.json({ success: true, season });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

export default router;
