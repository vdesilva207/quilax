export function requireRole(...roles) {
  return (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      if (!roles || roles.length === 0) {
        return next();
      }

      if (!roles.includes(req.user.role)) {
        return res.status(403).json({ error: "Forbidden" });
      }

      next();
    } catch (err) {
      console.error("❌ requireRole error:", err);
      return res.status(500).json({ error: "Role validation failed" });
    }
  };
}