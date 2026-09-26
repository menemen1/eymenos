import { headers } from "next/headers";
import { desc, eq, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { expenses, incomes, settings } from "@/db/schema";

async function userId() {
  return (await headers()).get("oai-authenticated-user-id");
}

export async function GET() {
  const id = await userId();
  if (!id) return Response.json({ error: "Oturum gerekli." }, { status: 401 });
  try {
    const db = getDb();
    const [profile] = await db.select().from(settings).where(eq(settings.userId, id));
    const [items, incoming, [expenseTotal], [incomeTotal]] = await Promise.all([
      db.select().from(expenses).where(eq(expenses.userId, id)).orderBy(desc(expenses.date), desc(expenses.id)).limit(250),
      db.select().from(incomes).where(eq(incomes.userId, id)).orderBy(desc(incomes.date), desc(incomes.id)).limit(250),
      db.select({ total: sql<number>`coalesce(sum(${expenses.amount}), 0)` }).from(expenses).where(eq(expenses.userId, id)),
      db.select({ total: sql<number>`coalesce(sum(${incomes.amount}), 0)` }).from(incomes).where(eq(incomes.userId, id)),
    ]);
    const currentSettings = profile ?? { monthlyBudget: 900, rent: 0, dietary: "", openingBalance: 0 };
    return Response.json({ settings: currentSettings, expenses: items, incomes: incoming, balance: currentSettings.openingBalance + Number(incomeTotal?.total ?? 0) - Number(expenseTotal?.total ?? 0) });
  } catch {
    return Response.json({ error: "Veriler şu an yüklenemedi." }, { status: 503 });
  }
}

export async function PUT(request: Request) {
  const id = await userId();
  if (!id) return Response.json({ error: "Oturum gerekli." }, { status: 401 });
  const body = await request.json() as { monthlyBudget?: number; rent?: number; dietary?: string; openingBalance?: number };
  const monthlyBudget = Number(body.monthlyBudget);
  const rent = Number(body.rent);
  const openingBalance = Number(body.openingBalance);
  if (!Number.isFinite(monthlyBudget) || monthlyBudget < 0 || monthlyBudget > 1000000 || !Number.isFinite(rent) || rent < 0 || rent > 1000000 || !Number.isFinite(openingBalance) || openingBalance < -1000000 || openingBalance > 1000000) return Response.json({ error: "Geçerli tutar gir." }, { status: 400 });
  try {
    const db = getDb();
    await db.insert(settings).values({ userId: id, monthlyBudget, rent, openingBalance, dietary: String(body.dietary ?? "").slice(0, 200) }).onConflictDoUpdate({ target: settings.userId, set: { monthlyBudget, rent, openingBalance, dietary: String(body.dietary ?? "").slice(0, 200) } });
    return Response.json({ ok: true });
  } catch { return Response.json({ error: "Ayarlar kaydedilemedi." }, { status: 503 }); }
}
