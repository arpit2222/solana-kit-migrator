import { Router } from "express";
import { randomUUID } from "crypto";
import { db } from "@workspace/db";
import { sessionsTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import {
  MigrateCodeBody,
  MigrateCodeResponse,
  ListSessionsResponse,
  GetSessionParams,
  GetSessionResponse,
} from "@workspace/api-zod";
import { migrateCode } from "../lib/migrator.js";

const router = Router();

// POST /migrate
router.post("/migrate", async (req, res) => {
  const parsed = MigrateCodeBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }

  const { code, filename } = parsed.data;

  const result = migrateCode(code);
  const sessionId = randomUUID();

  await db.insert(sessionsTable).values({
    id: sessionId,
    filename: filename ?? null,
    originalCode: code,
    transformedCode: result.transformedCode,
    totalChanges: result.stats.totalChanges,
    automaticChanges: result.stats.automaticChanges,
    aiRequiredChanges: result.stats.aiRequiredChanges,
    coveragePercent: result.stats.coveragePercent,
    byCategory: result.stats.byCategory,
  });

  const response = MigrateCodeResponse.parse({
    transformedCode: result.transformedCode,
    transforms: result.transforms,
    stats: result.stats,
    sessionId,
  });

  res.json(response);
});

// GET /sessions
router.get("/sessions", async (_req, res) => {
  const rows = await db
    .select()
    .from(sessionsTable)
    .orderBy(desc(sessionsTable.createdAt))
    .limit(20);

  const sessions = rows.map((r) => ({
    id: r.id,
    createdAt: r.createdAt.toISOString(),
    filename: r.filename ?? undefined,
    originalCode: r.originalCode,
    transformedCode: r.transformedCode,
    stats: {
      totalChanges: r.totalChanges,
      automaticChanges: r.automaticChanges,
      aiRequiredChanges: r.aiRequiredChanges,
      coveragePercent: r.coveragePercent,
      byCategory: r.byCategory,
    },
  }));

  const response = ListSessionsResponse.parse({ sessions });
  res.json(response);
});

// GET /sessions/:id
router.get("/sessions/:id", async (req, res) => {
  const parsed = GetSessionParams.safeParse(req.params);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid session id" });
    return;
  }

  const rows = await db
    .select()
    .from(sessionsTable)
    .where(eq(sessionsTable.id, parsed.data.id))
    .limit(1);

  if (rows.length === 0) {
    res.status(404).json({ error: "Session not found" });
    return;
  }

  const r = rows[0];
  const response = GetSessionResponse.parse({
    id: r.id,
    createdAt: r.createdAt.toISOString(),
    filename: r.filename ?? undefined,
    originalCode: r.originalCode,
    transformedCode: r.transformedCode,
    stats: {
      totalChanges: r.totalChanges,
      automaticChanges: r.automaticChanges,
      aiRequiredChanges: r.aiRequiredChanges,
      coveragePercent: r.coveragePercent,
      byCategory: r.byCategory,
    },
  });

  res.json(response);
});

export default router;
