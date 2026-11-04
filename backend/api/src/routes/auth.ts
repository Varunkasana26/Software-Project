import { Router } from "express";
import rateLimit from "express-rate-limit";
import { login, logout, me, register } from "../controllers/authController";
import { optionalAuth } from "../middleware/auth";
import { validate } from "../middleware/validation";
import { authSchema } from "../validators/document";

const router = Router();
// Slows password guessing. Off in tests.
const limiter = rateLimit({ windowMs: 60_000, limit: 20, standardHeaders: true, legacyHeaders: false, skip: () => process.env.NODE_ENV === "test" });

router.post("/register", limiter, validate({ body: authSchema }), register);
router.post("/login", limiter, validate({ body: authSchema }), login);
router.post("/logout", logout);
router.get("/me", optionalAuth, me); // 200 with user: null when signed out, so the page load logs no error

export default router;
