import { headers } from "next/headers";
import { and, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { incomes } from "@/db/schema";

async function userId() { return (await headers()).get("oai-authenticated-user-id"); }

export async function POST(request: Request) {
  const id = await userId();
  if (!id) return Response.json({ error: "Oturum gerekli." }, { status: 401 });
  const body = await request.json() as { amount?: number; source?: string; date?: string };
  const amount = Number(body.amount);
  const source = String(body.source ?? "").trim().slice(0, 100);
  const date = String(body.date ?? "");
  if (!Number.isFinite(amount) || amount <= 0 || amount > 100000 || !source || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return Response.json({ error: "Tutar, kaynak ve tarihi kontrol et." }, { status: 400 });
  try {
    const [item] = await getDb().insert(incomes).values({ userId: id, amount, source, date }).returning();
    return Response.json({ item }, { status: 201 });
  } catch { return Response.json({ error: "Gelen para kaydedilemedi." }, { status: 503 }); }
}

export async function DELETE(request: Request) {
  const id = await userId();
  if (!id) return Response.json({ error: "Oturum gerekli." }, { status: 401 });
  const entryId = Number(new URL(request.url).searchParams.get("id"));
  if (!Number.isInteger(entryId) || entryId <= 0) return Response.json({ error: "Geçersiz kayıt." }, { status: 400 });
  try {
    await getDb().delete(incomes).where(and(eq(incomes.id, entryId), eq(incomes.userId, id)));
    return Response.json({ ok: true });
  } catch { return Response.json({ error: "Kayıt silinemedi." }, { status: 503 }); }
}
