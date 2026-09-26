"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowDownLeft, ArrowUpRight, CalendarDays, ChefHat, Check, CreditCard, Plus, RotateCcw, Send, Settings2, Sparkles, Trash2, Wallet } from "lucide-react";
import { meals } from "@/lib/meals";

type Expense = { id: number; amount: number; category: string; note: string; date: string };
type Income = { id: number; amount: number; source: string; date: string };
type Cooked = { id: number; mealId: string; cookedAt: string };
type Profile = { monthlyBudget: number; rent: number; dietary: string; openingBalance: number };
type Modal = "expense" | "income" | "settings" | null;
const gbp = (value: number) => new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(value);
const today = () => new Date().toLocaleDateString("en-CA", { timeZone: "Europe/London" });
const apiJson = async (url: string, init?: RequestInit) => {
  const response = await fetch(url, init);
  const data = await response.json() as Record<string, any>;
  if (!response.ok) throw new Error(String(data.error ?? "İşlem tamamlanamadı."));
  return data;
};

export default function Home() {
  const [profile, setProfile] = useState<Profile>({ monthlyBudget: 900, rent: 0, dietary: "", openingBalance: 0 });
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [incomes, setIncomes] = useState<Income[]>([]);
  const [balance, setBalance] = useState(0);
  const [cooked, setCooked] = useState<Cooked[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [modal, setModal] = useState<Modal>(null);
  const [busy, setBusy] = useState(false);
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("Market");
  const [note, setNote] = useState("");
  const [source, setSource] = useState("");
  const [date, setDate] = useState(today());
  const [claudeReady, setClaudeReady] = useState(false);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [asking, setAsking] = useState(false);

  async function loadDashboard() {
    const data = await apiJson("/api/dashboard", { cache: "no-store" });
    setProfile(data.settings as Profile);
    setExpenses(data.expenses as Expense[]);
    setIncomes(data.incomes as Income[]);
    setBalance(Number(data.balance));
    setLoading(false);
  }
  async function loadMeals() {
    const data = await apiJson("/api/meals", { cache: "no-store" });
    setCooked(data.cooked as Cooked[]);
  }
  useEffect(() => {
    void Promise.all([loadDashboard(), loadMeals(), apiJson("/api/advice").then(data => setClaudeReady(Boolean(data.configured)))]).catch(cause => {
      setError(cause instanceof Error ? cause.message : "Veriler yüklenemedi."); setLoading(false);
    });
  }, []);

  useEffect(() => {
    const context = (document as Document & { modelContext?: { registerTool: (tool: unknown, options: { signal: AbortSignal }) => void | Promise<void> } }).modelContext;
    if (!context?.registerTool) return;
    const lifecycle = new AbortController();
    const register = (tool: unknown) => { try { void Promise.resolve(context.registerTool(tool, { signal: lifecycle.signal })).catch(() => {}); } catch {} };
    register({
      name: "add_expense", title: "Harcama ekle", description: "Bütçeye bir harcama kaydeder ve bakiyeyi günceller.",
      inputSchema: { type: "object", properties: { amount: { type: "number", exclusiveMinimum: 0 }, category: { type: "string", enum: ["Market", "Yemek", "Ulaşım", "Sosyal", "Diğer"] }, note: { type: "string" }, date: { type: "string", description: "YYYY-MM-DD" } }, required: ["amount", "category", "date"], additionalProperties: false },
      annotations: { readOnlyHint: false, untrustedContentHint: false },
      async execute(input: unknown) {
        const value = input as { amount?: number; category?: string; note?: string; date?: string };
        if (!value || typeof value.amount !== "number" || value.amount <= 0 || !["Market", "Yemek", "Ulaşım", "Sosyal", "Diğer"].includes(value.category ?? "") || !/^\d{4}-\d{2}-\d{2}$/.test(value.date ?? "")) throw new Error("Tutar, kategori ve tarih gerekli.");
        const data = await apiJson("/api/expenses", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(value) });
        await loadDashboard(); return { id: data.item.id, status: "saved" };
      },
    });
    register({
      name: "add_income", title: "Gelen para ekle", description: "Gelen parayı kaydeder ve bakiyeyi artırır.",
      inputSchema: { type: "object", properties: { amount: { type: "number", exclusiveMinimum: 0 }, source: { type: "string" }, date: { type: "string", description: "YYYY-MM-DD" } }, required: ["amount", "source", "date"], additionalProperties: false },
      annotations: { readOnlyHint: false, untrustedContentHint: false },
      async execute(input: unknown) {
        const value = input as { amount?: number; source?: string; date?: string };
        if (!value || typeof value.amount !== "number" || value.amount <= 0 || !value.source?.trim() || !/^\d{4}-\d{2}-\d{2}$/.test(value.date ?? "")) throw new Error("Tutar, kaynak ve tarih gerekli.");
        const data = await apiJson("/api/incomes", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(value) });
        await loadDashboard(); return { id: data.item.id, status: "saved" };
      },
    });
    return () => lifecycle.abort();
  }, []);

  const summary = useMemo(() => {
    const [year, month, day] = today().split("-").map(Number);
    const monthKey = `${year}-${String(month).padStart(2, "0")}`;
    const monthlyExpenses = expenses.filter(item => item.date.startsWith(monthKey));
    const spent = monthlyExpenses.reduce((sum, item) => sum + item.amount, 0);
    const received = incomes.filter(item => item.date.startsWith(monthKey)).reduce((sum, item) => sum + item.amount, 0);
    const todaySpent = expenses.filter(item => item.date === today()).reduce((sum, item) => sum + item.amount, 0);
    const flexible = Math.max(0, profile.monthlyBudget - profile.rent);
    const budgetLeft = flexible - spent;
    const daysLeft = Math.max(1, new Date(year, month, 0).getDate() - day + 1);
    const daily = Math.max(0, Math.min(budgetLeft, balance) / daysLeft);
    const categories = ["Market", "Yemek", "Ulaşım", "Sosyal", "Diğer"].map(name => ({ name, amount: monthlyExpenses.filter(item => item.category === name).reduce((sum, item) => sum + item.amount, 0) }));
    return { spent, received, todaySpent, flexible, budgetLeft, daily, categories, percent: flexible ? Math.min(100, spent / flexible * 100) : 0 };
  }, [expenses, incomes, profile, balance]);
  const cookedIds = new Set(cooked.map(item => item.mealId));
  const availableMeals = meals.filter(meal => !cookedIds.has(meal.id));
  const activity = [
    ...expenses.map(item => ({ type: "expense" as const, id: item.id, amount: item.amount, label: item.note || item.category, detail: item.category, date: item.date })),
    ...incomes.map(item => ({ type: "income" as const, id: item.id, amount: item.amount, label: item.source, detail: "Gelen para", date: item.date })),
  ].sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id).slice(0, 10);

  async function addEntry(event: React.FormEvent) {
    event.preventDefault(); if (!modal || modal === "settings") return;
    setBusy(true); setError(""); setNotice("");
    try {
      const url = modal === "expense" ? "/api/expenses" : "/api/incomes";
      const body = modal === "expense" ? { amount: Number(amount), category, note, date } : { amount: Number(amount), source, date };
      await apiJson(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
      await loadDashboard(); setModal(null); setAmount(""); setNote(""); setSource(""); setNotice(modal === "expense" ? "Harcama kaydedildi." : "Gelen para bakiyene eklendi.");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Kaydedilemedi."); }
    finally { setBusy(false); }
  }
  async function saveSettings(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setError("");
    try {
      await apiJson("/api/dashboard", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify(profile) });
      await loadDashboard(); setModal(null); setNotice("Bütçe ayarları kaydedildi.");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Kaydedilemedi."); }
    finally { setBusy(false); }
  }
  async function removeEntry(type: "expense" | "income", id: number) {
    try { await apiJson(`/api/${type === "expense" ? "expenses" : "incomes"}?id=${id}`, { method: "DELETE" }); await loadDashboard(); setNotice("Kayıt silindi."); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Silinemedi."); }
  }
  async function markCooked(mealId: string) {
    setError("");
    try { const data = await apiJson("/api/meals", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ mealId }) }); setCooked(current => [data.cooked as Cooked, ...current.filter(item => item.mealId !== mealId)]); setNotice("Yemek kaydedildi; 7 gün önerilmeyecek."); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Kaydedilemedi."); }
  }
  async function undoCooked(id: number) {
    try { await apiJson(`/api/meals?id=${id}`, { method: "DELETE" }); setCooked(current => current.filter(item => item.id !== id)); setNotice("Yemek yeniden önerilere eklendi."); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Geri alınamadı."); }
  }
  async function ask(prompt = question) {
    if (!prompt.trim()) { setError("Bir soru yaz."); return; }
    setAsking(true); setAnswer(""); setError("");
    try {
      const data = await apiJson("/api/advice", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ prompt, context: { city: "Nottingham", balance: balance.toFixed(2), dailyBudget: summary.daily.toFixed(2), monthlyBudget: profile.monthlyBudget, rent: profile.rent, dietary: profile.dietary, monthlySpent: summary.spent.toFixed(2) } }) });
      setQuestion(prompt); setAnswer(String(data.answer));
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Claude yanıt veremedi."); }
    finally { setAsking(false); }
  }

  return <div className="shell">
    <aside className="sidebar">
      <div className="brand"><div className="brand-icon">N<span>.</span></div><div><b>NOTTINGHAM</b><small>YOUR LIFE, CURATED</small></div></div>
      <nav className="nav" aria-label="Bölümler"><span className="eyebrow">YAŞAM ALANI</span><a href="#genel">◈ &nbsp; Genel bakış</a><a href="#butce">◫ &nbsp; Bütçe</a><a href="#yemek">✦ &nbsp; Ne yesem?</a><a href="#danisman">✧ &nbsp; Claude danışman</a></nav>
      <div className="city">📍 &nbsp; <div><b>Nottingham, UK</b><small>Yeni şehrin, yeni düzenin.</small></div></div>
    </aside>
    <main id="genel">
      <header className="header"><div><span className="eyebrow">KİŞİSEL YAŞAM PANELİ</span><h1>Günaydın, Eymen <span>✦</span></h1><p>Nottingham’daki gününe net bir bakış.</p></div><div className="header-actions"><div className="date"><CalendarDays size={17}/>{new Intl.DateTimeFormat("tr-TR", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/London" }).format(new Date())}</div><button className="icon-btn" aria-label="Bütçe ayarları" onClick={() => setModal("settings")}><Settings2 size={19}/></button></div></header>
      {error && <div className="banner error" role="alert">{error}<button onClick={() => setError("")} aria-label="Hata mesajını kapat">×</button></div>}
      {notice && <div className="banner notice" role="status">{notice}<button onClick={() => setNotice("")} aria-label="Bilgi mesajını kapat">×</button></div>}
      <section id="butce"><div className="section-title"><div><span className="eyebrow">FİNANSAL GÖRÜNÜM</span><h2>Paran nerede duruyor?</h2></div><div className="title-actions"><button className="outline-btn" onClick={() => setModal("income")}><ArrowDownLeft size={17}/> Gelen para</button><button className="primary-btn" onClick={() => setModal("expense")}><Plus size={18}/> Harcama ekle</button></div></div>
        <div className="metrics"><article className="metric highlight"><div className="metric-top"><span>Güncel bakiye</span><Wallet size={20}/></div><strong>{loading ? "—" : gbp(balance)}</strong><small>Başlangıç bakiyesi + gelen para − harcamalar</small><div className="accent-rule"/></article><article className="metric"><div className="metric-top"><span>Bugün harcayabileceğin</span><ArrowUpRight size={20}/></div><strong>{loading ? "—" : gbp(summary.daily)}</strong><small>Bütçe ve bakiyene göre günlük pay</small></article><article className="metric"><div className="metric-top"><span>Bu ay gelen para</span><ArrowDownLeft size={20}/></div><strong>{loading ? "—" : gbp(summary.received)}</strong><small>Kaydettiğin para girişleri</small></article></div>
        <div className="budget-bar"><div><span>Aylık harcama</span><strong>{gbp(summary.spent)} <em>/ {gbp(summary.flexible)}</em></strong></div><div className="track"><span style={{ width: `${summary.percent}%` }}/></div><small>%{Math.round(summary.percent)} kullanıldı</small></div>
        <div className="budget-detail"><div><span>Aylık bütçe</span><strong>{gbp(profile.monthlyBudget)}</strong></div><div><span>Kira için ayırdığın</span><strong>−{gbp(profile.rent)}</strong></div><div><span>Bu ay harcanan</span><strong>−{gbp(summary.spent)}</strong></div><div className="budget-total"><span>Aylık sınırdan kalan</span><strong>{gbp(summary.budgetLeft)}</strong></div></div>
      </section>
      <div className="columns"><section className="card" id="yemek"><div className="section-title"><div><span className="eyebrow">SOFRANDA BUGÜN</span><h2>Ne yesem?</h2></div><ChefHat size={23}/></div><div className="food-photo"><img src="/dinner.png" alt="Sebze ve patates eşliğinde yemek"/><div><span>BU HAFTANIN MENÜSÜ</span><strong>{availableMeals.length} yemek fikri</strong><small>Yaptıklarını işaretle; 7 gün tekrar önermeyelim.</small></div></div><div className="meal-count">{meals.length} seçenekten {availableMeals.length} tanesi önerilerde</div><div className="food-list">{availableMeals.length ? availableMeals.map(meal => <div className="food-row" key={meal.id}><div><b>{meal.name}</b><small>{meal.detail} · {meal.minutes} dk</small></div><span>~{gbp(meal.cost)}</span><button className="cooked-btn" onClick={() => markCooked(meal.id)}><Check size={14}/> Yaptım</button></div>) : <div className="empty compact"><ChefHat size={25}/><b>Bu haftanın menüsünü tamamladın</b><small>Yemekler 7 gün sonra yeniden önerilere dönecek.</small></div>}</div>{cooked.length > 0 && <div className="cooked-log"><h3>Son 7 gün yaptıkların</h3>{cooked.map(item => <div key={item.id}><span>{meals.find(meal => meal.id === item.mealId)?.name ?? item.mealId}</span><button onClick={() => undoCooked(item.id)} aria-label="Yemek kaydını geri al"><RotateCcw size={14}/> Geri al</button></div>)}</div>}</section>
        <section className="card history"><div className="section-title"><div><span className="eyebrow">HESAP HAREKETLERİ</span><h2>Son hareketler</h2></div></div>{activity.length ? activity.map(item => <div className="entry-row" key={`${item.type}-${item.id}`}><div className={`entry-icon ${item.type}`}>{item.type === "income" ? <ArrowDownLeft size={18}/> : <CreditCard size={18}/>}</div><div className="entry-name"><b>{item.label}</b><small>{item.detail} · {new Date(item.date + "T12:00:00").toLocaleDateString("tr-TR", { day: "numeric", month: "short" })}</small></div><strong className={item.type}>{item.type === "income" ? "+" : "−"}{gbp(item.amount)}</strong><button className="delete-btn" aria-label="Kaydı sil" onClick={() => removeEntry(item.type, item.id)}><Trash2 size={15}/></button></div>) : <div className="empty"><CreditCard size={28}/><b>Henüz hareket yok</b><small>Para girişi veya harcama eklediğinde burada göreceksin.</small></div>}<div className="category-section"><h3>Bu ay nereye gitti?</h3>{summary.categories.map(item => <div className="category-row" key={item.name}><span>{item.name}</span><div className="category-track"><span style={{ width: `${summary.spent ? item.amount / summary.spent * 100 : 0}%` }}/></div><strong>{gbp(item.amount)}</strong></div>)}</div></section></div>
      <section className="advisor" id="danisman"><div className="advisor-heading"><div className="advisor-icon"><Sparkles size={24}/></div><div><span className="eyebrow">KİŞİSEL DANIŞMANIN</span><h2>Claude’a sor</h2><p>Bütçeni ve son yedi günde yaptığın yemekleri dikkate alır.</p><span className="connection">{claudeReady ? "● Claude bağlı" : "Claude bağlantısı hazırlanıyor"}</span></div></div><div className="advisor-body"><div className="ask-row"><input aria-label="Claude’a soru sor" placeholder="Örn. Bu akşam £5 altında ne pişirebilirim?" value={question} onChange={e => setQuestion(e.target.value)} onKeyDown={e => { if (e.key === "Enter") void ask(); }}/><button className="primary-btn" onClick={() => ask()} disabled={asking || !claudeReady}><Send size={16}/>{asking ? "Düşünüyor..." : "Sor"}</button></div><div className="chips"><button onClick={() => ask("Bugün günlük bütçeme uygun, son 7 gün yaptıklarımı tekrar etmeyen 3 yemek önerisi ver.")} disabled={!claudeReady}>Bugün ne yesem?</button><button onClick={() => ask("Güncel bakiyemi ve aylık bütçemi değerlendir; kısa bir harcama önerisi ver.")} disabled={!claudeReady}>Bütçemi yorumla</button></div>{answer && <div className="answer" aria-live="polite">{answer}</div>}</div></section><footer>NOTTINGHAM <span>✦</span> YOUR LIFE, CURATED</footer>
    </main>
    {modal && <div className="modal-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) setModal(null); }}><div className="modal" role="dialog" aria-modal="true" aria-label={modal === "expense" ? "Harcama ekle" : modal === "income" ? "Gelen para ekle" : "Bütçe ayarları"}><button className="modal-close" aria-label="Kapat" onClick={() => setModal(null)}>×</button><h2>{modal === "expense" ? "Yeni harcama" : modal === "income" ? "Gelen para" : "Bütçe ayarları"}</h2>{modal === "settings" ? <form onSubmit={saveSettings}><label>Aylık harcama bütçesi (£)<input type="number" min="0" max="1000000" step="0.01" value={profile.monthlyBudget} onChange={event => setProfile({ ...profile, monthlyBudget: Number(event.target.value) })}/></label><label>Aylık kira (£)<input type="number" min="0" max="1000000" step="0.01" value={profile.rent} onChange={event => setProfile({ ...profile, rent: Number(event.target.value) })}/></label><label>Başlangıç bakiyesi (£)<input type="number" min="-1000000" max="1000000" step="0.01" value={profile.openingBalance} onChange={event => setProfile({ ...profile, openingBalance: Number(event.target.value) })}/><small>İlk kullanımdaki hesap bakiyeni yaz. Sonraki girişleri “Gelen para” ile ekle.</small></label><label>Beslenme tercihi<input value={profile.dietary} onChange={event => setProfile({ ...profile, dietary: event.target.value })} placeholder="Örn. vejetaryen, helal"/></label><button className="primary-btn" disabled={busy}>Kaydet</button></form> : <form onSubmit={addEntry}><label>Tutar (£)<input required type="number" min="0.01" max="100000" step="0.01" value={amount} onChange={event => setAmount(event.target.value)}/></label>{modal === "expense" ? <><label>Kategori<select value={category} onChange={event => setCategory(event.target.value)}>{["Market", "Yemek", "Ulaşım", "Sosyal", "Diğer"].map(value => <option key={value}>{value}</option>)}</select></label><label>Açıklama<input value={note} onChange={event => setNote(event.target.value)} placeholder="Örn. Market alışverişi"/></label></> : <label>Kimden / nereden?<input required value={source} onChange={event => setSource(event.target.value)} placeholder="Örn. Babam"/></label>}<label>Tarih<input required type="date" value={date} onChange={event => setDate(event.target.value)}/></label><button className="primary-btn" disabled={busy}>{modal === "expense" ? "Harcama ekle" : "Bakiyeye ekle"}</button></form>}</div></div>}
  </div>;
}
