import { Router, type IRouter } from "express";
import { eq, asc, sql } from "drizzle-orm";
import { db, linksTable, profileTable } from "@workspace/db";
import {
  CreateLinkBody,
  UpdateLinkBody,
  UpdateLinkParams,
  DeleteLinkParams,
  RecordLinkClickParams,
  ReorderLinksBody,
  GetLinksResponse,
  UpdateLinkResponse,
  DeleteLinkResponse,
  RecordLinkClickResponse,
  ReorderLinksResponse,
} from "@workspace/api-zod";
import { randomUUID } from "crypto";
import { serializeDates } from "../lib/serialize";
import { requireAuth } from "../middlewares/auth";

const router: IRouter = Router();

router.get("/links", requireAuth, async (req, res): Promise<void> => {
  const userId = req.user!.userId;
  const links = await db.select().from(linksTable)
    .where(eq(linksTable.userId, userId))
    .orderBy(asc(linksTable.sortOrder));
  res.json(GetLinksResponse.parse(serializeDates(links)));
});

router.post("/links", requireAuth, async (req, res): Promise<void> => {
  const userId = req.user!.userId;
  const parsed = CreateLinkBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const maxOrderRows = await db
    .select({ maxOrder: sql<number>`COALESCE(MAX(${linksTable.sortOrder}), -1)` })
    .from(linksTable)
    .where(eq(linksTable.userId, userId));
  const maxOrder = maxOrderRows[0]?.maxOrder ?? -1;

  const [link] = await db
    .insert(linksTable)
    .values({
      id: randomUUID(),
      userId,
      ...parsed.data,
      isActive: parsed.data.isActive ?? true,
      sortOrder: maxOrder + 1,
    })
    .returning();

  res.status(201).json(link);
});

router.put("/links/reorder", requireAuth, async (req, res): Promise<void> => {
  const userId = req.user!.userId;
  const parsed = ReorderLinksBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  await Promise.all(
    parsed.data.ids.map((id, index) =>
      db.update(linksTable)
        .set({ sortOrder: index })
        .where(eq(linksTable.id, id))
    )
  );

  res.json(ReorderLinksResponse.parse({ success: true }));
});

router.put("/links/:id", requireAuth, async (req, res): Promise<void> => {
  const userId = req.user!.userId;
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = UpdateLinkParams.safeParse({ id: rawId });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateLinkBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const existing = await db.select({ userId: linksTable.userId })
    .from(linksTable).where(eq(linksTable.id, params.data.id)).limit(1);
  if (!existing.length || existing[0].userId !== userId) {
    res.status(404).json({ error: "Link not found" });
    return;
  }

  const [link] = await db
    .update(linksTable)
    .set(parsed.data)
    .where(eq(linksTable.id, params.data.id))
    .returning();

  res.json(UpdateLinkResponse.parse(serializeDates(link)));
});

router.delete("/links/:id", requireAuth, async (req, res): Promise<void> => {
  const userId = req.user!.userId;
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = DeleteLinkParams.safeParse({ id: rawId });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const existing = await db.select({ userId: linksTable.userId })
    .from(linksTable).where(eq(linksTable.id, params.data.id)).limit(1);
  if (!existing.length || existing[0].userId !== userId) {
    res.status(404).json({ error: "Link not found" });
    return;
  }

  await db.delete(linksTable).where(eq(linksTable.id, params.data.id));
  res.json(DeleteLinkResponse.parse({ success: true }));
});

router.post("/links/:id/click", async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = RecordLinkClickParams.safeParse({ id: rawId });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [link] = await db.select().from(linksTable).where(eq(linksTable.id, params.data.id)).limit(1);
  if (!link) {
    res.status(404).json({ error: "Link not found" });
    return;
  }

  const [updated] = await db
    .update(linksTable)
    .set({ clickCount: sql`${linksTable.clickCount} + 1` })
    .where(eq(linksTable.id, params.data.id))
    .returning();

  await db
    .update(profileTable)
    .set({ totalClicks: sql`${profileTable.totalClicks} + 1` })
    .where(eq(profileTable.userId, link.userId));

  res.json(RecordLinkClickResponse.parse({ success: true, clickCount: updated.clickCount }));
});

export default router;
