import { headers } from "next/headers";

export async function POST(request: Request) {
  if (!(await headers()).get("oai-authenticated-user-id")) return Response.json({ error: "Oturum gerekli." }, { status: 401 });
  const body = await request.json() as { apiKey?: string; prompt?: string; context?: unknown };
  const key = String(body.apiKey ?? "").trim();
  const prompt = String(body.prompt ?? "").trim().slice(0, 1000);
  if (!key || !prompt) return Response.json({ error: "Claude API anahtarı ve soru gerekli." }, { status: 400 });
  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "content-type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({ model: "claude-sonnet-4-6", max_tokens: 500, system: "Sen Nottingham'da yaşayan birine yardımcı olan Türkçe kişisel danışmansın. Kısa, net ve uygulanabilir cevap ver. Fiyatları kesin veri gibi sunma; gerçek zamanlı bilgiye erişimin yok. Kullanıcının bütçe ve beslenme bağlamını dikkate al.", messages: [{ role: "user", content: `${prompt}\n\nBağlam: ${JSON.stringify(body.context ?? {}).slice(0, 3000)}` }] }),
    });
    if (!response.ok) return Response.json({ error: response.status === 401 ? "Claude anahtarı geçersiz." : `Claude yanıt veremedi (${response.status}).` }, { status: 502 });
    const data = await response.json() as { content?: Array<{ type: string; text?: string }> };
    return Response.json({ answer: data.content?.filter(part => part.type === "text").map(part => part.text).join("\n") ?? "Yanıt alınamadı." });
  } catch { return Response.json({ error: "Claude bağlantısı kurulamadı." }, { status: 502 }); }
}
