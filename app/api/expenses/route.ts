import { headers } from "next/headers";
import { eq, and } from "drizzle-orm";
import { getDb } from "@/db";
import { expenses } from "@/db/schema";

export async function POST(request: Request) {
  const id = (await headers()).get("oai-authenticated-user-id");
  if (!id) return Response.json({ error: "Oturum gerekli." }, { status: 401 });
  const body = await request.json() as { amount?: number; category?: string; note?: string; date?: string };
  const amount = Number(body.amount);
  const category = String(body.category ?? "");
  const date = String(body.date ?? "");
  if (!Number.isFinite(amount) || amount <= 0 || amount > 100000 || !["Market", "Yemek", "Ulaşım", "Sosyal", "Diğer"].includes(category) || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return Response.json({ error: "Harcama bilgilerini kontrol et." }, { status: 400 });
  try {
    const [item] = await getDb().insert(expenses).values({ userId: id, amount, category, note: String(body.note ?? "").slice(0, 160), date }).returning();
    return Response.json({ item }, { status: 201 });
  } catch { return Response.json({ error: "Harcama kaydedilemedi." }, { status: 503 }); }
}

export async function DELETE(request: Request) {
  const id = (await headers()).get("oai-authenticated-user-id");
  if (!id) return Response.json({ error: "Oturum gerekli." }, { status: 401 });
  const itemId = Number(new URL(request.url).searchParams.get("id"));
  if (!Number.isInteger(itemId) || itemId <= 0) return Response.json({ error: "Geçersiz kayıt." }, { status: 400 });
  try {
    await getDb().delete(expenses).where(and(eq(expenses.id, itemId), eq(expenses.userId, id)));
    return Response.json({ ok: true });
  } catch { return Response.json({ error: "Kayıt silinemedi." }, { status: 503 }); }
}
