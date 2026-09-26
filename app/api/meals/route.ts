import { headers } from "next/headers";
import { and, desc, eq, gte } from "drizzle-orm";
import { getDb } from "@/db";
import { cookedMeals } from "@/db/schema";
import { meals } from "@/lib/meals";

async function userId() { return (await headers()).get("oai-authenticated-user-id"); }
const sevenDaysAgo = () => new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

export async function GET() {
  const id = await userId();
  if (!id) return Response.json({ error: "Oturum gerekli." }, { status: 401 });
  try {
    const cooked = await getDb().select().from(cookedMeals).where(and(eq(cookedMeals.userId, id), gte(cookedMeals.cookedAt, sevenDaysAgo()))).orderBy(desc(cookedMeals.cookedAt));
    return Response.json({ cooked });
  } catch { return Response.json({ error: "Yemek geçmişi yüklenemedi." }, { status: 503 }); }
}

export async function POST(request: Request) {
  const id = await userId();
  if (!id) return Response.json({ error: "Oturum gerekli." }, { status: 401 });
  const body = await request.json() as { mealId?: string };
  if (!meals.some(meal => meal.id === body.mealId)) return Response.json({ error: "Geçersiz yemek." }, { status: 400 });
  try {
    const db = getDb();
    const existing = await db.select().from(cookedMeals).where(and(eq(cookedMeals.userId, id), eq(cookedMeals.mealId, body.mealId!), gte(cookedMeals.cookedAt, sevenDaysAgo()))).limit(1);
    if (existing.length) return Response.json({ cooked: existing[0] });
    const [cooked] = await db.insert(cookedMeals).values({ userId: id, mealId: body.mealId!, cookedAt: new Date().toISOString() }).returning();
    return Response.json({ cooked }, { status: 201 });
  } catch { return Response.json({ error: "Yemek kaydedilemedi." }, { status: 503 }); }
}

export async function DELETE(request: Request) {
  const id = await userId();
  if (!id) return Response.json({ error: "Oturum gerekli." }, { status: 401 });
  const entryId = Number(new URL(request.url).searchParams.get("id"));
  if (!Number.isInteger(entryId) || entryId <= 0) return Response.json({ error: "Geçersiz kayıt." }, { status: 400 });
  try {
    await getDb().delete(cookedMeals).where(and(eq(cookedMeals.id, entryId), eq(cookedMeals.userId, id)));
    return Response.json({ ok: true });
  } catch { return Response.json({ error: "Yemek kaydı silinemedi." }, { status: 503 }); }
}
