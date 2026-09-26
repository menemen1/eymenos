"use client";
import { useEffect, useMemo, useState } from "react";
import { CalendarDays, ChefHat, CreditCard, Plus, Send, Settings2, Sparkles, Trash2, Wallet } from "lucide-react";

type Expense = { id: number; amount: number; category: string; note: string; date: string };
type Profile = { monthlyBudget: number; rent: number; dietary: string };
const gbp = (n: number) => new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(n);
const today = () => new Date().toLocaleDateString("en-CA", { timeZone: "Europe/London" });
const food = [
  ["Limonlu tavuk tabağı", "Fırın patates · yeşillik · yoğurt", 4.8, "30 dk"],
  ["Kremalı mantarlı makarna", "Mantar · ıspanak · parmesan", 3.4, "20 dk"],
  ["Nohutlu Akdeniz kasesi", "Nohut · domates · salatalık", 2.9, "15 dk"],
] as const;

export default function Home() {
  const [profile, setProfile] = useState<Profile>({ monthlyBudget: 900, rent: 0, dietary: "" });
  const [items, setItems] = useState<Expense[]>([]);
  const [status, setStatus] = useState("Yükleniyor...");
  const [error, setError] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("Market");
  const [note, setNote] = useState("");
  const [date, setDate] = useState(today());
  const [modal, setModal] = useState<"expense" | "settings" | null>(null);
  const [busy, setBusy] = useState(false);
  const [key, setKey] = useState("");
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [asking, setAsking] = useState(false);
  useEffect(() => { fetch("/api/dashboard").then(async r => { const d = await r.json() as any; if (!r.ok) throw new Error(d.error); setItems(d.expenses); setProfile(d.settings); setStatus(""); }).catch(e => { setError(e.message); setStatus(""); }); }, []);
  useEffect(() => {
    const context = (document as Document & { modelContext?: { registerTool: (tool: unknown, options: { signal: AbortSignal }) => void | Promise<void> } }).modelContext;
    if (!context?.registerTool) return;
    const lifecycle = new AbortController();
    try { void Promise.resolve(context.registerTool({
      name: "add_expense", title: "Harcama ekle", description: "Nottingham bütçesine bir harcama kaydeder ve paneli günceller.",
      inputSchema: { type: "object", properties: { amount: { type: "number", exclusiveMinimum: 0 }, category: { type: "string", enum: ["Market", "Yemek", "Ulaşım", "Sosyal", "Diğer"] }, note: { type: "string" }, date: { type: "string", description: "YYYY-MM-DD" } }, required: ["amount", "category", "date"], additionalProperties: false },
      annotations: { readOnlyHint: false, untrustedContentHint: false },
      async execute(input: unknown) {
        const value = input as { amount?: number; category?: string; note?: string; date?: string };
        if (!value || typeof value.amount !== "number" || value.amount <= 0 || !["Market", "Yemek", "Ulaşım", "Sosyal", "Diğer"].includes(value.category ?? "") || !/^\d{4}-\d{2}-\d{2}$/.test(value.date ?? "")) throw new Error("Geçerli tutar, kategori ve tarih gerekli.");
        const response = await fetch("/api/expenses", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(value) });
        const data = await response.json() as any; if (!response.ok) throw new Error(data.error ?? "Kaydedilemedi.");
        setItems(current => [data.item, ...current]); return { id: data.item.id, amount: data.item.amount, status: "saved" };
      },
    }, { signal: lifecycle.signal })).catch(() => {}); } catch {}
    return () => lifecycle.abort();
  }, []);
  const sums = useMemo(() => {
    const now = new Date(); const month = today().slice(0, 7);
    const spent = items.filter(x => x.date.startsWith(month)).reduce((n, x) => n + x.amount, 0);
    const dailySpent = items.filter(x => x.date === today()).reduce((n, x) => n + x.amount, 0);
    const flexible = Math.max(0, profile.monthlyBudget - profile.rent);
    const left = flexible - spent;
    const daysLeft = Math.max(1, new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate() - now.getDate() + 1);
    return { spent, dailySpent, flexible, left, daily: Math.max(0, left / daysLeft), percent: flexible ? Math.min(100, spent / flexible * 100) : 0 };
  }, [items, profile]);
  async function addExpense(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setError("");
    try { const r = await fetch("/api/expenses", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ amount: Number(amount), category, note, date }) }); const d = await r.json() as any; if (!r.ok) throw new Error(d.error); setItems(x => [d.item, ...x]); setAmount(""); setNote(""); setModal(null); }
    catch (e) { setError(e instanceof Error ? e.message : "Kaydedilemedi."); } finally { setBusy(false); }
  }
  async function saveSettings(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setError("");
    try { const r = await fetch("/api/dashboard", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify(profile) }); const d = await r.json() as any; if (!r.ok) throw new Error(d.error); setModal(null); }
    catch (e) { setError(e instanceof Error ? e.message : "Kaydedilemedi."); } finally { setBusy(false); }
  }
  async function remove(id: number) { try { const r = await fetch(`/api/expenses?id=${id}`, { method: "DELETE" }); if (!r.ok) throw new Error(); setItems(x => x.filter(item => item.id !== id)); } catch { setError("Silinemedi."); } }
  async function ask(prompt = question) {
    if (!key.trim() || !prompt.trim()) { setError("Claude API anahtarını ve sorunu gir."); return; }
    setAsking(true); setAnswer(""); setError("");
    try { const r = await fetch("/api/advice", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ apiKey: key.trim(), prompt, context: { city: "Nottingham", dailyBudget: sums.daily.toFixed(2), monthlyBudget: profile.monthlyBudget, rent: profile.rent, dietary: profile.dietary, recentExpenses: items.slice(0, 8).map(({ amount, category, date }) => ({ amount, category, date })) } }) }); const d = await r.json() as any; if (!r.ok) throw new Error(d.error); setQuestion(prompt); setAnswer(d.answer); }
    catch (e) { setError(e instanceof Error ? e.message : "Öneri alınamadı."); } finally { setAsking(false); }
  }
  return <div className="shell"><aside className="sidebar"><div className="brand"><div className="brand-icon">N<span>.</span></div><div><b>NOTTINGHAM</b><small>YOUR LIFE, CURATED</small></div></div><div className="nav"><span className="eyebrow">YAŞAM ALANI</span><a href="#genel">◈ &nbsp; Genel bakış</a><a href="#butce">◫ &nbsp; Bütçe</a><a href="#yemek">✦ &nbsp; Ne yesem?</a><a href="#danisman">✧ &nbsp; Claude danışman</a></div><div className="city">📍 &nbsp; <div><b>Nottingham, UK</b><small>Yeni şehrin, yeni düzenin.</small></div></div></aside>
  <main id="genel"><header className="header"><div><span className="eyebrow">KİŞİSEL YAŞAM PANELİ</span><h1>Günaydın, Eymen <span>✦</span></h1><p>Nottingham’daki gününe net bir bakış.</p></div><div className="header-actions"><div className="date"><CalendarDays size={17}/>{new Intl.DateTimeFormat("tr-TR", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/London" }).format(new Date())}</div><button className="icon-btn" aria-label="Ayarlar" onClick={() => setModal("settings")}><Settings2 size={19}/></button></div></header>
  {error && <div className="error" role="alert">{error}<button onClick={() => setError("")}>×</button></div>}
  <section id="butce"><div className="section-title"><div><span className="eyebrow">FİNANSAL GÖRÜNÜM</span><h2>Bugün nasıl gidiyor?</h2></div><button className="gold-btn" onClick={() => setModal("expense")}><Plus size={18}/> Harcama ekle</button></div><div className="metrics"><article className="metric highlight"><div className="metric-top"><span>Bugün harcayabileceğin</span><Wallet size={20}/></div><strong>{status || gbp(sums.daily)}</strong><small>Kalan bütçe / ayın kalan günleri</small><div className="gold-rule"/></article><article className="metric"><div className="metric-top"><span>Bu ay kalan</span><span>↗</span></div><strong>{status || gbp(sums.left)}</strong><small>Kira sonrası kullanılabilir bütçe</small></article><article className="metric"><div className="metric-top"><span>Bugün harcanan</span><CreditCard size={20}/></div><strong>{status || gbp(sums.dailySpent)}</strong><small>Kaydettiğin günlük harcamalar</small></article></div><div className="budget-bar"><div><span>Aylık harcama</span><strong>{gbp(sums.spent)} <em>/ {gbp(sums.flexible)}</em></strong></div><div className="track"><span style={{ width: `${sums.percent}%` }}/></div><small>%{Math.round(sums.percent)} kullanıldı</small></div></section>
  <div className="columns"><section className="card" id="yemek"><div className="section-title"><div><span className="eyebrow">SOFRANDA BUGÜN</span><h2>Ne yesem?</h2></div><ChefHat size={23}/></div><div className="food-photo"><img src="/dinner.png" alt="Sebze ve patates eşliğinde tavuk yemeği"/><div><span>BUGÜNÜN FİKRİ</span><strong>Limonlu tavuk tabağı</strong><small>Evde hazırlanabilecek, dengeli bir akşam yemeği.</small></div></div><div className="food-list">{food.map(f => <div className="food-row" key={f[0]}><div><b>{f[0]}</b><small>{f[1]} · {f[3]}</small></div><span>~{gbp(f[2])}</span></div>)}</div><button className="text-btn" onClick={() => { setQuestion("Bugün günlük bütçeme uygun, Nottingham'da marketten alabileceklerimle 3 yemek önerisi ver."); document.getElementById("danisman")?.scrollIntoView({ behavior: "smooth" }); }}>Claude’dan bana özel öneri al ↗</button></section><section className="card history"><div className="section-title"><div><span className="eyebrow">HARCAMA GEÇMİŞİ</span><h2>Son hareketler</h2></div></div>{items.length ? items.slice(0, 8).map(item => <div className="expense-row" key={item.id}><div className="expense-icon">{item.category === "Market" ? "◫" : item.category === "Yemek" ? "◈" : "✦"}</div><div className="expense-name"><b>{item.note || item.category}</b><small>{item.category} · {new Date(item.date + "T12:00:00").toLocaleDateString("tr-TR", { day: "numeric", month: "short" })}</small></div><strong>−{gbp(item.amount)}</strong><button aria-label="Harcamayı sil" onClick={() => remove(item.id)}><Trash2 size={15}/></button></div>) : <div className="empty"><CreditCard size={28}/><b>Henüz harcama yok</b><small>İlk harcamanı eklediğinde burada göreceksin.</small></div>}</section></div>
  <section className="advisor" id="danisman"><div className="advisor-heading"><div className="advisor-icon"><Sparkles size={24}/></div><div><span className="eyebrow">KİŞİSEL DANIŞMANIN</span><h2>Claude’a sor</h2><p>Bütçeni ve tercihlerini dikkate alan fikirler al.</p></div></div><div className="advisor-body"><label>Claude API anahtarın<input type="password" autoComplete="off" placeholder="sk-ant-..." value={key} onChange={e => setKey(e.target.value)}/><small>Anahtar yalnızca bu oturumda tutulur; sunucuda kaydedilmez.</small></label><div className="ask-row"><input aria-label="Claude’a soru sor" placeholder="Örn. Bu akşam £5 altında ne pişirebilirim?" value={question} onChange={e => setQuestion(e.target.value)} onKeyDown={e => { if (e.key === "Enter") void ask(); }}/><button className="gold-btn" onClick={() => ask()} disabled={asking}><Send size={16}/>{asking ? "Düşünüyor..." : "Sor"}</button></div><div className="chips"><button onClick={() => ask("Bugün günlük bütçeme uygun 3 yemek önerisi ver.")}>Bugün ne yesem?</button><button onClick={() => ask("Nottingham'da günlük harcamalarımı nasıl daha iyi yönetebilirim?")}>Bütçemi yorumla</button></div>{answer && <div className="answer" aria-live="polite">{answer}</div>}</div></section><footer>NOTTINGHAM <span>✦</span> YOUR LIFE, CURATED</footer></main>
  {modal && <div className="modal-backdrop" onMouseDown={e => { if (e.target === e.currentTarget) setModal(null); }}><div className="modal" role="dialog" aria-modal="true" aria-label={modal === "expense" ? "Harcama ekle" : "Bütçe ayarları"}><button className="modal-close" aria-label="Kapat" onClick={() => setModal(null)}>×</button><h2>{modal === "expense" ? "Yeni harcama" : "Bütçe ayarları"}</h2>{modal === "expense" ? <form onSubmit={addExpense}><label>Tutar (£)<input required type="number" min="0.01" step="0.01" value={amount} onChange={e => setAmount(e.target.value)}/></label><label>Kategori<select value={category} onChange={e => setCategory(e.target.value)}>{["Market", "Yemek", "Ulaşım", "Sosyal", "Diğer"].map(x => <option key={x}>{x}</option>)}</select></label><label>Açıklama<input value={note} onChange={e => setNote(e.target.value)} placeholder="Örn. Market alışverişi"/></label><label>Tarih<input required type="date" value={date} onChange={e => setDate(e.target.value)}/></label><button className="gold-btn" disabled={busy}>Harcama ekle</button></form> : <form onSubmit={saveSettings}><label>Aylık toplam bütçe (£)<input type="number" min="0" step="0.01" value={profile.monthlyBudget} onChange={e => setProfile({ ...profile, monthlyBudget: Number(e.target.value) })}/></label><label>Aylık kira (£)<input type="number" min="0" step="0.01" value={profile.rent} onChange={e => setProfile({ ...profile, rent: Number(e.target.value) })}/></label><label>Beslenme tercihi<input value={profile.dietary} onChange={e => setProfile({ ...profile, dietary: e.target.value })} placeholder="Örn. vejetaryen, helal"/></label><button className="gold-btn" disabled={busy}>Kaydet</button></form>}</div></div>}</div>;
}
