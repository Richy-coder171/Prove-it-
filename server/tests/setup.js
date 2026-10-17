process.env.NODE_ENV = "test";
process.env.MONGODB_URI = "mongodb://127.0.0.1:27017/proveit_test";
process.env.JWT_SECRET = "test-session-secret-that-is-long-enough-12345";
process.env.BADGE_SIGNING_SECRET =
  "test-badge-secret-that-is-long-enough-67890";
process.env.CLIENT_ORIGIN = "http://localhost:5173";
process.env.COOKIE_SECURE = "false";
