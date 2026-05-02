import { Router } from "express";
import { randomUUID } from "crypto";
import {
  MigrateCodeBody,
  MigrateCodeResponse,
  ListSessionsResponse,
  GetSessionParams,
  GetSessionResponse,
} from "@workspace/api-zod";
import { migrateCode } from "../lib/migrator.js";

const router = Router();

// In-memory session cache (last 50 sessions, resets on server restart)
const sessionCache = new Map<string, {
  id: string;
  createdAt: string;
  filename?: string;
  originalCode: string;
  transformedCode: string;
  stats: {
    totalChanges: number;
    automaticChanges: number;
    aiRequiredChanges: number;
    coveragePercent: number;
    byCategory: Record<string, number>;
  };
}>();
const MAX_SESSIONS = 50;

// POST /migrate
router.post("/migrate", (req, res) => {
  const parsed = MigrateCodeBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }

  const { code, filename } = parsed.data;
  const result = migrateCode(code);
  const sessionId = randomUUID();

  const session = {
    id: sessionId,
    createdAt: new Date().toISOString(),
    filename: filename ?? undefined,
    originalCode: code,
    transformedCode: result.transformedCode,
    stats: result.stats,
  };

  // Keep cache bounded
  if (sessionCache.size >= MAX_SESSIONS) {
    const oldest = sessionCache.keys().next().value;
    if (oldest) sessionCache.delete(oldest);
  }
  sessionCache.set(sessionId, session);

  const response = MigrateCodeResponse.parse({
    transformedCode: result.transformedCode,
    transforms: result.transforms,
    stats: result.stats,
    sessionId,
  });

  res.json(response);
});

// GET /sessions
router.get("/sessions", (_req, res) => {
  const sessions = Array.from(sessionCache.values())
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 20);

  const response = ListSessionsResponse.parse({ sessions });
  res.json(response);
});

// GET /sessions/:id
router.get("/sessions/:id", (req, res) => {
  const parsed = GetSessionParams.safeParse(req.params);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid session id" });
    return;
  }

  const session = sessionCache.get(parsed.data.id);
  if (!session) {
    res.status(404).json({ error: "Session not found" });
    return;
  }

  const response = GetSessionResponse.parse(session);
  res.json(response);
});

export default router;
