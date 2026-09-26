import { headers } from "next/headers";
import { env } from "cloudflare:workers";
import { and, eq, gte } from "drizzle-orm";
import { getDb } from "@/db";
import { cookedMeals } from "@/db/schema";
import { meals } from "@/lib/meals";

function apiKey() { return (env as unknown as { ANTHROPIC_API_KEY?: string }).ANTHROPIC_API_KEY; }

export async function GET() {
  if (!(await headers()).get("oai-authenticated-user-id")) return Response.json({ error: "Oturum gerekli." }, { status: 401 });
  return Response.json({ configured: Boolean(apiKey()) });
}

export async function POST(request: Request) {
  const id = (await headers()).get("oai-authenticated-user-id");
  if (!id) return Response.json({ error: "Oturum gerekli." }, { status: 401 });
  const body = await request.json() as { prompt?: string; context?: unknown };
  const key = apiKey();
  const prompt = String(body.prompt ?? "").trim().slice(0, 1000);
  if (!key) return Response.json({ error: "Claude bağlantısı henüz hazır değil." }, { status: 503 });
  if (!prompt) return Response.json({ error: "Bir soru yaz." }, { status: 400 });
  try {
    const recent = await getDb().select().from(cookedMeals).where(and(eq(cookedMeals.userId, id), gte(cookedMeals.cookedAt, new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())));
    const cookedNames = recent.map(row => meals.find(meal => meal.id === row.mealId)?.name).filter(Boolean);
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "content-type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({ model: "claude-sonnet-4-6", max_tokens: 600, system: "Sen Nottingham'da yaşayan birine yardımcı olan Türkçe kişisel danışmansın. Kısa, net ve uygulanabilir cevap ver. Fiyatları kesin veri gibi sunma; gerçek zamanlı bilgiye erişimin yok. Kullanıcının bütçe ve beslenme bağlamını dikkate al. Yemek önerilerinde son 7 gün yapılan yemekleri ve yakın benzerlerini kesinlikle tekrar önerme.", messages: [{ role: "user", content: `${prompt}\n\nBağlam: ${JSON.stringify(body.context ?? {}).slice(0, 3000)}\nSon 7 gün yapılan yemekler (tekrar önerme): ${cookedNames.join(", ") || "yok"}` }] }),
    });
    if (!response.ok) return Response.json({ error: response.status === 401 ? "Claude anahtarı geçersiz." : `Claude yanıt veremedi (${response.status}).` }, { status: 502 });
    const data = await response.json() as { content?: Array<{ type: string; text?: string }> };
    return Response.json({ answer: data.content?.filter(part => part.type === "text").map(part => part.text).join("\n") ?? "Yanıt alınamadı." });
  } catch { return Response.json({ error: "Claude bağlantısı kurulamadı." }, { status: 502 }); }
}
