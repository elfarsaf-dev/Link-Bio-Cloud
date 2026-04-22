import { Router, type IRouter } from "express";
import { eq, desc } from "drizzle-orm";
import { db, linksTable, profileTable } from "@workspace/db";
import { GetStatsResponse, ResetStatsResponse } from "@workspace/api-zod";
import { serializeDates } from "../lib/serialize";
import { requireAuth } from "../middlewares/auth";

const router: IRouter = Router();

router.get("/stats", requireAuth, async (req, res): Promise<void> => {
  const userId = req.user!.userId;

  const [links, profileRows] = await Promise.all([
    db.select().from(linksTable)
      .where(eq(linksTable.userId, userId))
      .orderBy(desc(linksTable.clickCount))
      .limit(5),
    db.select().from(profileTable).where(eq(profileTable.userId, userId)).limit(1),
  ]);

  const totalLinks = links.length;
  const profile = profileRows[0];
  const totalClicks = profile?.totalClicks ?? 0;

  res.json(
    GetStatsResponse.parse(serializeDates({ totalLinks, totalClicks, topLinks: links }))
  );
});

router.post("/stats/reset", requireAuth, async (req, res): Promise<void> => {
  const userId = req.user!.userId;

  await Promise.all([
    db.update(linksTable).set({ clickCount: 0 }).where(eq(linksTable.userId, userId)),
    db.update(profileTable).set({ totalClicks: 0 }).where(eq(profileTable.userId, userId)),
  ]);

  res.json(ResetStatsResponse.parse({ success: true }));
});

export default router;
