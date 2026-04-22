import { Router, type IRouter } from "express";
import { eq, asc } from "drizzle-orm";
import { db, profileTable, linksTable } from "@workspace/db";
import { serializeDates } from "../lib/serialize";

const router: IRouter = Router();

router.get("/public/:username", async (req, res): Promise<void> => {
  const { username } = req.params;

  const [profile] = await db
    .select()
    .from(profileTable)
    .where(eq(profileTable.username, username.toLowerCase()))
    .limit(1);

  if (!profile) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  const links = await db
    .select()
    .from(linksTable)
    .where(eq(linksTable.userId, profile.userId))
    .orderBy(asc(linksTable.sortOrder));

  const activeLinks = links.filter(l => l.isActive);

  res.json({
    profile: serializeDates(profile),
    links: serializeDates(activeLinks),
  });
});

export default router;
