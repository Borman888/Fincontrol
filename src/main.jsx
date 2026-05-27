import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { createClient } from '@supabase/supabase-js';
import { Plus, Trash2, LogOut, Wallet, TrendingUp, TrendingDown, CalendarDays, BarChart3, Download, Upload } from 'lucide-react';
import './styles.css';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;
const categories = ['Зарплата','Подработка','Премия','Продукты','Квартира','Коммуналка','Транспорт','Авто','Здоровье','Одежда','Развлечения','Семья','Путешествия','Кредит','Прочее'];
const rub = n => new Intl.NumberFormat('ru-RU',{style:'currency',currency:'RUB',maximumFractionDigits:0}).format(Number(n||0));
const ym = d => (d || new Date().toISOString()).slice(0,7);
const today = () => new Date().toISOString().slice(0,10);

function localStore(userKey){
  const key = 'fincontrol-data-' + userKey;
  return {
    async list(){ return JSON.parse(localStorage.getItem(key)||'[]') },
    async save(row){ const rows = await this.list(); rows.unshift({ ...row, id: crypto.randomUUID(), created_at: new Date().toISOString() }); localStorage.setItem(key, JSON.stringify(rows)); return row; },
    async remove(id){ const rows=(await this.list()).filter(x=>x.id!==id); localStorage.setItem(key,JSON.stringify(rows)); }
  }
}

function App(){
  const [session,setSession]=useState(null); const [demo,setDemo]=useState(!supabase); const [loading,setLoading]=useState(true);
  useEffect(()=>{ if('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(()=>{}); },[]);
  useEffect(()=>{ (async()=>{ if(!supabase){ setLoading(false); return } const {data}=await supabase.auth.getSession(); setSession(data.session); setLoading(false); const {data:listener}=supabase.auth.onAuthStateChange((_e,s)=>setSession(s)); return ()=>listener?.subscription?.unsubscribe?.(); })(); },[]);
  if(loading) return <div className="center">Загрузка ФинКонтроль...</div>;
  if(!session && !demo) return <Auth onDemo={()=>setDemo(true)} />;
  return <Dashboard session={session} demo={demo} onExit={async()=>{ if(demo){setDemo(false);return} await supabase.auth.signOut(); }} />;
}

function Auth({onDemo}){
 const [email,setEmail]=useState(''); const [password,setPassword]=useState(''); const [mode,setMode]=useState('login'); const [msg,setMsg]=useState(''); const [busy,setBusy]=useState(false);
 async function submit(e){
   e.preventDefault(); setMsg(''); setBusy(true);
   try{
     if(!supabase){ setMsg('Supabase не подключен. Используйте демо-режим или добавьте переменные VITE_SUPABASE_URL и VITE_SUPABASE_ANON_KEY в Vercel.'); return; }
     if(mode==='login'){
       const {error}=await supabase.auth.signInWithPassword({email:email.trim(),password});
       setMsg(error ? 'Ошибка входа: '+error.message : 'Вход выполнен');
     } else {
       const {data,error}=await supabase.auth.signUp({email:email.trim(),password,options:{emailRedirectTo:window.location.origin}});
       if(error) setMsg('Ошибка регистрации: '+error.message);
       else if(data?.session) setMsg('Аккаунт создан, вход выполнен.');
       else setMsg('Аккаунт создан. Если включено подтверждение почты, откройте письмо от Supabase и подтвердите email.');
     }
   }catch(err){ setMsg('Техническая ошибка: '+(err?.message||String(err))); }
   finally{ setBusy(false); }
 }
 return <main className="auth"><section className="authCard"><div className="brand"><div className="logo">ФК</div><div><h1>ФинКонтроль</h1><p>Личные финансы без хаоса: доходы, расходы, планы и отчеты.</p></div></div><form onSubmit={submit}><label>Email<input value={email} onChange={e=>setEmail(e.target.value)} type="email" required placeholder="you@mail.ru"/></label><label>Пароль<input value={password} onChange={e=>setPassword(e.target.value)} type="password" required minLength="6" placeholder="минимум 6 символов"/></label><button disabled={busy} className="primary">{busy?'Подождите...':(mode==='login'?'Войти':'Зарегистрироваться')}</button></form><div className="row"><button onClick={()=>{setMsg('');setMode(mode==='login'?'signup':'login')}} className="ghost">{mode==='login'?'Создать аккаунт':'У меня уже есть аккаунт'}</button><button onClick={onDemo} className="ghost">Демо без Supabase</button></div>{msg&&<p className="message">{msg}</p>}</section></main>
}

function Dashboard({session,demo,onExit}){
 const userKey = demo ? 'demo' : session.user.id; const api = useMemo(()=> demo ? localStore(userKey) : null,[demo,userKey]);
 const [rows,setRows]=useState([]); const [month,setMonth]=useState(ym()); const [tab,setTab]=useState('fact'); const [form,setForm]=useState({type:'expense',date:today(),amount:'',category:'Продукты',title:'',note:'',is_plan:false});
 async function load(){ if(demo){ setRows(await api.list()); return } const {data,error}=await supabase.from('transactions').select('*').order('date',{ascending:false}); if(!error) setRows(data||[]); }
 useEffect(()=>{ load(); },[demo]);
 async function add(e){ e.preventDefault(); const payload={...form, amount:Number(form.amount), is_plan:tab==='plan', date:form.date||today()}; if(!payload.amount||!payload.title) return; if(demo) await api.save(payload); else await supabase.from('transactions').insert(payload); setForm({...form, amount:'', title:'', note:''}); load(); }
 async function del(id){ if(!confirm('Удалить операцию?')) return; if(demo) await api.remove(id); else await supabase.from('transactions').delete().eq('id',id); load(); }
 const filtered = rows.filter(r=>ym(r.date)===month && !!r.is_plan === (tab==='plan'));
 const fact = rows.filter(r=>ym(r.date)===month && !r.is_plan); const plan = rows.filter(r=>ym(r.date)===month && r.is_plan);
 const sum = (arr,type)=>arr.filter(r=>r.type===type).reduce((a,b)=>a+Number(b.amount||0),0);
 const income=sum(fact,'income'), expense=sum(fact,'expense'), planned=sum(plan,'expense');
 const cat = Object.entries(filtered.reduce((a,r)=>{ if(r.type==='expense') a[r.category]=(a[r.category]||0)+Number(r.amount); return a },{})).sort((a,b)=>b[1]-a[1]);
 function exportJson(){ const blob = new Blob([JSON.stringify(rows,null,2)],{type:'application/json'}); const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='fincontrol-backup.json'; a.click(); }
 async function importJson(e){ const file=e.target.files[0]; if(!file) return; const data=JSON.parse(await file.text()); for(const r of data){ const {id,created_at,...payload}=r; demo ? await api.save(payload) : await supabase.from('transactions').insert(payload); } load(); }
 return <main className="app"><header><div className="brand small"><div className="logo">ФК</div><div><h1>ФинКонтроль</h1><p>{demo?'Демо-режим: данные в браузере':'Облачная база Supabase'}</p></div></div><button className="icon" onClick={onExit}><LogOut size={18}/></button></header><section className="cards"><Card icon={<Wallet/>} title="Баланс" value={rub(income-expense)}/><Card icon={<TrendingUp/>} title="Доходы" value={rub(income)}/><Card icon={<TrendingDown/>} title="Расходы" value={rub(expense)}/><Card icon={<CalendarDays/>} title="План расходов" value={rub(planned)}/></section><section className="toolbar"><input type="month" value={month} onChange={e=>setMonth(e.target.value)}/><button onClick={()=>setTab('fact')} className={tab==='fact'?'active':''}>Факт</button><button onClick={()=>setTab('plan')} className={tab==='plan'?'active':''}>План</button><button onClick={exportJson}><Download size={16}/> JSON</button><label className="fileBtn"><Upload size={16}/> Импорт<input type="file" accept="application/json" onChange={importJson}/></label></section><section className="grid"><form className="panel form" onSubmit={add}><h2><Plus size={19}/> {tab==='plan'?'Плановая операция':'Новая операция'}</h2><div className="twocol"><label>Тип<select value={form.type} onChange={e=>setForm({...form,type:e.target.value})}><option value="expense">Расход</option><option value="income">Доход</option></select></label><label>Дата<input type="date" value={form.date} onChange={e=>setForm({...form,date:e.target.value})}/></label></div><label>Сумма<input inputMode="decimal" value={form.amount} onChange={e=>setForm({...form,amount:e.target.value})} placeholder="например 1500"/></label><label>Категория<select value={form.category} onChange={e=>setForm({...form,category:e.target.value})}>{categories.map(c=><option key={c}>{c}</option>)}</select></label><label>Название<input value={form.title} onChange={e=>setForm({...form,title:e.target.value})} placeholder="например продукты"/></label><label>Комментарий<textarea value={form.note} onChange={e=>setForm({...form,note:e.target.value})} placeholder="необязательно"/></label><button className="primary">Добавить</button></form><section className="panel"><h2><BarChart3 size={19}/> Отчет за месяц</h2><div className="progress"><span style={{width: Math.min(100, expense/(income||1)*100)+'%'}}/></div><p className="hint">Потрачено {income?Math.round(expense/income*100):0}% от доходов. Разница план/факт по расходам: <b>{rub(planned-expense)}</b></p><div className="cats">{cat.length?cat.map(([c,v])=><div key={c}><span>{c}</span><b>{rub(v)}</b></div>):<p className="hint">Нет данных за выбранный месяц.</p>}</div></section><section className="panel list"><h2>{tab==='plan'?'Плановые расходы':'Доходы и расходы'}</h2>{filtered.map(r=><article key={r.id} className={r.type}><div><b>{r.title}</b><span>{r.date} · {r.category}{r.note?' · '+r.note:''}</span></div><strong>{r.type==='income'?'+':'-'}{rub(r.amount)}</strong><button onClick={()=>del(r.id)}><Trash2 size={16}/></button></article>)}</section></section></main>
}
function Card({icon,title,value}){ return <div className="card">{icon}<span>{title}</span><b>{value}</b></div> }
createRoot(document.getElementById('root')).render(<App/>);
