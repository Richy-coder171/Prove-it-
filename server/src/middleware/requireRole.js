export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({
        ok: false,
        error: {
          message: "You do not have access to this resource",
          code: "FORBIDDEN",
        },
      });
    }
    return next();
  };
}
