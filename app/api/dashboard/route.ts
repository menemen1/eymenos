import { headers } from "next/headers";
import { desc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { expenses, settings } from "@/db/schema";

async function userId() {
  return (await headers()).get("oai-authenticated-user-id");
}

export async function GET() {
  const id = await userId();
  if (!id) return Response.json({ error: "Oturum gerekli." }, { status: 401 });
  try {
    const db = getDb();
    const [profile] = await db.select().from(settings).where(eq(settings.userId, id));
    const items = await db.select().from(expenses).where(eq(expenses.userId, id)).orderBy(desc(expenses.date), desc(expenses.id)).limit(250);
    return Response.json({ settings: profile ?? { monthlyBudget: 900, rent: 0, dietary: "" }, expenses: items });
  } catch {
    return Response.json({ error: "Veriler şu an yüklenemedi." }, { status: 503 });
  }
}

export async function PUT(request: Request) {
  const id = await userId();
  if (!id) return Response.json({ error: "Oturum gerekli." }, { status: 401 });
  const body = await request.json() as { monthlyBudget?: number; rent?: number; dietary?: string };
  const monthlyBudget = Number(body.monthlyBudget);
  const rent = Number(body.rent);
  if (!Number.isFinite(monthlyBudget) || monthlyBudget < 0 || monthlyBudget > 1000000 || !Number.isFinite(rent) || rent < 0 || rent > 1000000) return Response.json({ error: "Geçerli tutar gir." }, { status: 400 });
  try {
    const db = getDb();
    await db.insert(settings).values({ userId: id, monthlyBudget, rent, dietary: String(body.dietary ?? "").slice(0, 200) }).onConflictDoUpdate({ target: settings.userId, set: { monthlyBudget, rent, dietary: String(body.dietary ?? "").slice(0, 200) } });
    return Response.json({ ok: true });
  } catch { return Response.json({ error: "Ayarlar kaydedilemedi." }, { status: 503 }); }
}
