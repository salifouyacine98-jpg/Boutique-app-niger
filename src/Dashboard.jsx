import { useState, useEffect, useCallback } from 'react'
import { supabase } from './supabaseClient'

function fmt(n) {
  n = Math.round(n || 0)
  return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
}
function todayStr() {
  return new Date().toISOString().slice(0, 10)
}

export default function Dashboard({ session }) {
  const userId = session.user.id
  const [screen, setScreen] = useState('home')
  const [boutique, setBoutique] = useState(null)
  const [produits, setProduits] = useState([])
  const [ventes, setVentes] = useState([])
  const [clients, setClients] = useState([])
  const [fournisseurs, setFournisseurs] = useState([])
  const [loadingData, setLoadingData] = useState(true)
  const [toastMsg, setToastMsg] = useState('')
  const [toastShow, setToastShow] = useState(false)
  const [panier, setPanier] = useState({})
  const [dernierRecu, setDernierRecu] = useState(null)
  const [statsPeriod, setStatsPeriod] = useState('jour')
  const [stockSearch, setStockSearch] = useState('')
  const [venteSearch, setVenteSearch] = useState('')
  const [modal, setModal] = useState(null)
  const [editingProduit, setEditingProduit] = useState(null)
  const [reglementClient, setReglementClient] = useState(null)

  function toast(msg) {
    setToastMsg(msg)
    setToastShow(true)
    setTimeout(() => setToastShow(false), 1800)
  }

  const loadAll = useCallback(async () => {
    setLoadingData(true)
    let { data: boutiqueData } = await supabase.from('boutiques').select('*').eq('user_id', userId).maybeSingle()
    if (!boutiqueData) {
      const { data: created } = await supabase.from('boutiques').insert({ user_id: userId, name: 'Ma Boutique', loc: 'Niger', phone: '' }).select().maybeSingle()
      boutiqueData = created
    }
    setBoutique(boutiqueData)
    if (boutiqueData) {
      const boutiqueId = boutiqueData.id
      const [{ data: p }, { data: v }, { data: c }, { data: f }] = await Promise.all([
        supabase.from('produits').select('*').eq('boutique_id', boutiqueId).order('name'),
        supabase.from('ventes').select('*').eq('boutique_id', boutiqueId).order('created_at', { ascending: false }),
        supabase.from('clients').select('*').eq('boutique_id', boutiqueId).order('name'),
        supabase.from('fournisseurs').select('*').eq('boutique_id', boutiqueId).order('name'),
      ])
      setProduits(p || [])
      setVentes(v || [])
      setClients(c || [])
      setFournisseurs(f || [])
    }
    setLoadingData(false)
  }, [userId])

  useEffect(() => { loadAll() }, [loadAll])

  if (loadingData) return <div className="loading-state">Chargement de ta boutique...</div>

  const ctx = {
    boutique, setBoutique, produits, setProduits, ventes, setVentes,
    clients, setClients, fournisseurs, setFournisseurs,
    panier, setPanier, dernierRecu, setDernierRecu,
    statsPeriod, setStatsPeriod, stockSearch, setStockSearch,
    venteSearch, setVenteSearch, modal, setModal,
    editingProduit, setEditingProduit, reglementClient, setReglementClient,
    toast, loadAll, userId, screen, setScreen,
  }

  return (
    <>
      <Screens ctx={ctx} />
      <NavBar screen={screen} setScreen={setScreen} />
      <Modals ctx={ctx} />
      <div className={`toast ${toastShow ? 'show' : ''}`}>{toastMsg}</div>
    </>
  )
}

function NavBar({ screen, setScreen }) {
  return (
    <div className="nav-bar">
      <button className={`nav-item ${screen==='home'?'active':''}`} onClick={() => setScreen('home')}><span className="nav-icon">🏠</span><span className="nav-lbl">Accueil</span></button>
      <button className={`nav-item ${screen==='stock'?'active':''}`} onClick={() => setScreen('stock')}><span className="nav-icon">📦</span><span className="nav-lbl">Stock</span></button>
      <div className="nav-center"><div className="nav-fab" onClick={() => setScreen('vente')}>🛒</div></div>
      <button className={`nav-item ${screen==='stats'?'active':''}`} onClick={() => setScreen('stats')}><span className="nav-icon">📊</span><span className="nav-lbl">Stats</span></button>
      <button className={`nav-item ${screen==='plus'?'active':''}`} onClick={() => setScreen('plus')}><span className="nav-icon">⚙️</span><span className="nav-lbl">Plus</span></button>
    </div>
  )
}

function Screens({ ctx }) {
  switch (ctx.screen) {
    case 'home': return <HomeScreen ctx={ctx} />
    case 'stock': return <StockScreen ctx={ctx} />
    case 'vente': return <VenteScreen ctx={ctx} />
    case 'recu': return <RecuScreen ctx={ctx} />
    case 'stats': return <StatsScreen ctx={ctx} />
    case 'clients': return <ClientsScreen ctx={ctx} />
    case 'fournisseurs': return <FournisseursScreen ctx={ctx} />
    case 'plus': return <PlusScreen ctx={ctx} />
    default: return <HomeScreen ctx={ctx} />
  }
}

function HomeScreen({ ctx }) {
  const { boutique, produits, ventes, clients, fournisseurs, setScreen, setModal, setEditingProduit } = ctx
  const today = todayStr()
  const ventesAuj = ventes.filter(v => v.created_at.slice(0,10) === today)
  const caAuj = ventesAuj.reduce((s,v) => s+Number(v.total), 0)
  const yesterday = new Date(Date.now()-86400000).toISOString().slice(0,10)
  const caHier = ventes.filter(v => v.created_at.slice(0,10) === yesterday).reduce((s,v) => s+Number(v.total), 0)
  const stockBas = produits.filter(p => p.qty <= p.alert)
  const totalCredits = clients.reduce((s,c) => s+Number(c.dette||0), 0)
  const dateLabel = new Date().toLocaleDateString('fr-FR', { weekday:'long', day:'numeric', month:'long', year:'numeric' })
  return (
    <div className="screen">
      <div className="header vert">
        <div className="header-row">
          <div style={{flex:1}}>
            <div style={{fontSize:16,fontWeight:700}}>{boutique?.name||'Ma Boutique'}</div>
            <div style={{fontSize:11,opacity:.75}}>{boutique?.loc||'Niger'}</div>
          </div>
          <button className="header-icon-btn" onClick={() => setScreen('plus')}>⚙️</button>
        </div>
        <div className="home-ca-label">Chiffre d'affaires aujourd'hui</div>
        <div className="home-ca">{fmt(caAuj)} <span>FCFA</span></div>
        <div className="home-ca-date">{dateLabel.charAt(0).toUpperCase()+dateLabel.slice(1)}</div>
        <div className="pills-row">
          {caHier>0 && <div className="pill" style={{color:caAuj>=caHier?'#8DFFD0':'#FFB0B0'}}>{caAuj>=caHier?'▲':'▼'} {Math.round(((caAuj-caHier)/caHier)*100)}% vs hier</div>}
          {stockBas.length>0 && <div className="pill" style={{color:'#FFD080'}}>⚠ {stockBas.length} produit(s) bas</div>}
        </div>
      </div>
      <div className="quick-grid">
        <div className="quick-card" onClick={() => setScreen('vente')}><div className="qc-icon green">🛒</div><div className="qc-label">Ventes</div><div className="qc-val">{ventesAuj.length} vente(s) aujourd'hui</div></div>
        <div className="quick-card" onClick={() => setScreen('stock')}><div className="qc-icon orange">📦</div><div className="qc-label">Stock</div><div className="qc-val">{produits.length} référence(s)</div></div>
        <div className="quick-card" onClick={() => setScreen('clients')}><div className="qc-icon blue">👥</div><div className="qc-label">Crédits clients</div><div className="qc-val">{fmt(totalCredits)} FCFA dus</div></div>
        <div className="quick-card" onClick={() => setScreen('fournisseurs')}><div className="qc-icon red">🚚</div><div className="qc-label">Fournisseurs</div><div className="qc-val">{fournisseurs.length} enregistré(s)</div></div>
      </div>
      <div className="section-title">⚠️ Alertes stock</div>
      <div className="card-list">
        {stockBas.length===0 ? (
          <div className="empty-state"><div className="ico">✅</div><div className="txt">Tous tes stocks sont à un bon niveau.</div></div>
        ) : stockBas.slice(0,5).sort((a,b)=>a.qty-b.qty).map(p => (
          <div className="alert-item" key={p.id} onClick={() => { setEditingProduit(p); setModal('produit') }}>
            <div className={`alert-dot ${p.qty===0?'rouge':'orange'}`}></div>
            <div className="alert-txt">{p.emoji} {p.name} — {p.qty===0?'Stock épuisé':'Stock bas'}</div>
            <div className={`alert-badge ${p.qty===0?'rouge':'orange'}`}>{p.qty}</div>
          </div>
        ))}
      </div>
      <div className="section-title">🕒 Dernières ventes</div>
      <div className="card-list">
        {ventes.length===0 ? (
          <div className="empty-state"><div className="ico">🛒</div><div className="txt">Aucune vente encore.</div></div>
        ) : ventes.slice(0,4).map(v => (
          <div className="alert-item" key={v.id}>
            <div className="alert-dot" style={{background:'var(--vert2)'}}></div>
            <div className="alert-txt">Vente #{v.numero} — {v.items.length} article(s) {v.credit?'(crédit)':''}</div>
            <div style={{fontSize:11,color:'var(--txt2)'}}>{new Date(v.created_at).toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'})}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

function StockScreen({ ctx }) {
  const { produits, stockSearch, setStockSearch, setModal, setEditingProduit, setScreen } = ctx
  const list = produits.filter(p => p.name.toLowerCase().includes(stockSearch.toLowerCase()))
  return (
    <div className="screen">
      <div className="header orange">
        <div className="header-row">
          <button className="back-btn" onClick={() => setScreen('home')}>←</button>
          <div className="header-title">Gestion du stock</div>
          <button className="header-icon-btn" onClick={() => { setEditingProduit(null); setModal('produit') }}>➕</button>
        </div>
      </div>
      <div className="search-box"><span>🔍</span><input placeholder="Chercher un produit…" value={stockSearch} onChange={e => setStockSearch(e.target.value)} /></div>
      <div className="section-title">Tous les produits <span className="link">{produits.length} produit(s)</span></div>
      <div className="card-list" style={{paddingBottom:20}}>
        {list.length===0 ? (
          <div className="empty-state"><div className="ico">📦</div><div className="txt">{produits.length===0?'Ton stock est vide. Appuie sur + pour ajouter.':'Aucun produit trouvé.'}</div></div>
        ) : list.map(p => {
          let cls='ok', lbl='En stock'
          if(p.qty===0){cls='vide';lbl='Épuisé'} else if(p.qty<=p.alert){cls='bas';lbl='Stock bas'}
          return (
            <div className="stock-item" key={p.id} onClick={() => { setEditingProduit(p); setModal('produit') }}>
              <div className="stock-emoji">{p.emoji||'📦'}</div>
              <div className="stock-info"><div className="stock-name">{p.name}</div><div className="stock-meta">{fmt(p.price)} FCFA / unité</div></div>
              <div><div className={`stock-qty ${cls}`}>{p.qty}</div><div className="stock-qty-lbl">{lbl}</div></div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function VenteScreen({ ctx }) {
  const { produits, venteSearch, setVenteSearch, panier, setPanier, setModal, setScreen } = ctx
  const list = produits.filter(p => p.name.toLowerCase().includes(venteSearch.toLowerCase()))
  const ids = Object.keys(panier).filter(k => panier[k]>0)
  const count = ids.reduce((s,k) => s+panier[k], 0)
  const total = ids.reduce((s,k) => { const p=produits.find(x=>x.id===k); return s+(p?p.price*panier[k]:0) }, 0)
  function ajouter(prodId) {
    const p = produits.find(x=>x.id===prodId)
    const current = panier[prodId]||0
    if(current>=p.qty){ctx.toast('Stock insuffisant !');return}
    setPanier({...panier,[prodId]:current+1})
  }
  return (
    <div className="screen">
      <div className="header vert">
        <div className="header-row">
          <button className="back-btn" onClick={() => setScreen('home')}>←</button>
          <div className="header-title">Nouvelle vente</div>
        </div>
      </div>
      <div className="search-box"><span>🔍</span><input placeholder="Chercher un produit…" value={venteSearch} onChange={e => setVenteSearch(e.target.value)} /></div>
      <div className="section-title">Produits</div>
      <div className="prod-grid">
        {list.length===0 ? (
          <div className="empty-state" style={{gridColumn:'1/-1'}}><div className="ico">📦</div><div className="txt">Aucun produit.</div></div>
        ) : list.map(p => {
          const inCart=panier[p.id]||0; const vide=p.qty===0
          return (
            <div key={p.id} className={`prod-card ${inCart>0?'selected':''}`} onClick={() => !vide&&ajouter(p.id)} style={vide?{opacity:.45}:{}}>
              {inCart>0 && <div className="prod-badge">{inCart}</div>}
              <div className="prod-emoji">{p.emoji}</div>
              <div className="prod-name">{p.name}</div>
              <div className="prod-price">{fmt(p.price)} F</div>
              <div className={`prod-stock ${vide?'vide':''}`}>{vide?'Épuisé':'Stk: '+p.qty}</div>
            </div>
          )
        })}
      </div>
      <div style={{flex:1}}></div>
      <div className="cart-bar" onClick={() => setModal('panier')}>
        <div className="cart-info">
          <div className="cart-n">{count} article(s) dans le panier</div>
          <div className="cart-tot">{fmt(total)} <span>FCFA</span></div>
        </div>
        <button className="pay-btn" disabled={count===0} onClick={e => {e.stopPropagation();setModal('paiement')}}>Encaisser →</button>
      </div>
    </div>
  )function RecuScreen({ ctx }) {
  const { dernierRecu, boutique, setScreen } = ctx
  if (!dernierRecu) return (
    <div className="screen">
      <div className="header orange"><div className="header-row"><button className="back-btn" onClick={() => setScreen('home')}>←</button><div className="header-title">Reçu</div></div></div>
      <div className="empty-state"><div className="ico">🧾</div><div className="txt">Aucun reçu à afficher.</div></div>
    </div>
  )
  const vente = dernierRecu
  const date = new Date(vente.created_at)
  const dateStr = date.toLocaleDateString('fr-FR')+' '+date.toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'})
  function imprimer() { window.print() }
  function partager() {
    const txt = genererTexteRecu(vente, boutique)
    if(navigator.share){navigator.share({text:txt}).catch(()=>{})}
    else{window.open('https://wa.me/?text='+encodeURIComponent(txt),'_blank')}
  }
  return (
    <div className="screen">
      <div className="header orange"><div className="header-row"><button className="back-btn" onClick={() => setScreen('home')}>←</button><div className="header-title">Reçu de vente</div></div></div>
      <div className="recu-paper">
        <div className="recu-shop">🏪 {(boutique?.name||'MA BOUTIQUE').toUpperCase()}</div>
        <div className="recu-tagline">{boutique?.loc}{boutique?.phone?' · '+boutique.phone:''}</div>
        <hr className="recu-divider" />
        <div className="recu-meta"><span>N° {vente.numero}</span><span>{dateStr}</span></div>
        <hr className="recu-divider" />
        <table className="recu-table">
          <thead><tr><th>Article</th><th>Qté</th><th>P.U</th><th>Total</th></tr></thead>
          <tbody>{vente.items.map((it,i) => <tr key={i}><td>{it.emoji} {it.name}</td><td>{it.qty}</td><td>{fmt(it.price)}</td><td>{fmt(it.total)} F</td></tr>)}</tbody>
        </table>
        <hr className="recu-divider" />
        <div className="recu-total-row"><span>TOTAL</span><span>{fmt(vente.total)} FCFA</span></div>
        {vente.credit ? (
          <div className="recu-monnaie" style={{color:'var(--rouge)',fontWeight:700}}><span>Vente à crédit</span><span>{vente.client_name}</span></div>
        ) : (
          <>
            <div className="recu-monnaie"><span>Reçu</span><span>{fmt(vente.recu)} FCFA</span></div>
            <div className="recu-monnaie" style={{color:'var(--vert)',fontWeight:700}}><span>Monnaie rendue</span><span>{fmt(vente.monnaie)} FCFA</span></div>
          </>
        )}
        <hr className="recu-divider" />
        <div className="recu-merci">Merci pour votre achat !<br /><strong>À bientôt chez {boutique?.name} 🙏</strong></div>
      </div>
      <div className="recu-actions">
        <button className="recu-btn print" onClick={imprimer}>🖨️ Imprimer</button>
        <button className="recu-btn whats" onClick={partager}>💬 WhatsApp</button>
      </div>
      <button className="recu-btn new" style={{width:'calc(100% - 32px)'}} onClick={() => ctx.setScreen('vente')}>➕ Nouvelle vente</button>
    </div>
  )
}

function genererTexteRecu(vente, boutique) {
  let txt = `🏪 ${boutique?.name}\n${boutique?.loc}\n\nReçu N° ${vente.numero}\n${new Date(vente.created_at).toLocaleString('fr-FR')}\n\n`
  vente.items.forEach(it => { txt += `${it.name} x${it.qty} = ${fmt(it.total)} F\n` })
  txt += `\nTOTAL: ${fmt(vente.total)} FCFA\n`
  if(vente.credit) txt += `Vente à crédit - Client: ${vente.client_name}\n`
  else txt += `Reçu: ${fmt(vente.recu)} F | Monnaie: ${fmt(vente.monnaie)} F\n`
  txt += `\nMerci pour votre achat !`
  return txt
}

function StatsScreen({ ctx }) {
  const { ventes, produits, statsPeriod, setStatsPeriod, setScreen } = ctx
  function rangeForPeriod(p) {
    const now = new Date(); let start = new Date(now)
    if(p==='jour') start.setHours(0,0,0,0)
    if(p==='semaine') start.setDate(now.getDate()-7)
    if(p==='mois') start.setDate(now.getDate()-30)
    return start
  }
  const start = rangeForPeriod(statsPeriod)
  const ventesPeriode = ventes.filter(v => new Date(v.created_at)>=start)
  const ca = ventesPeriode.reduce((s,v) => s+Number(v.total), 0)
  const benef = ventesPeriode.reduce((s,v) => s+v.items.reduce((s2,it) => {
    const prod=produits.find(p=>p.name===it.name); const cost=prod?Number(prod.cost)||0:0
    return s2+(it.price-cost)*it.qty
  },0), 0)
  const nbVentes = ventesPeriode.length
  const panierMoyen = nbVentes>0?ca/nbVentes:0
  const days = []
  for(let i=6;i>=0;i--) {
    const d=new Date(); d.setDate(d.getDate()-i); d.setHours(0,0,0,0)
    const dEnd=new Date(d); dEnd.setHours(23,59,59,999)
    const tot=ventes.filter(v=>{const vd=new Date(v.created_at);return vd>=d&&vd<=dEnd}).reduce((s,v)=>s+Number(v.total),0)
    days.push({label:d.toLocaleDateString('fr-FR',{weekday:'short'}).slice(0,3),total:tot,isToday:i===0})
  }
  const maxVal = Math.max(...days.map(d=>d.total),1)
  const ventesProduits = {}
  ventes.forEach(v=>v.items.forEach(it=>{
    if(!ventesProduits[it.name]) ventesProduits[it.name]={emoji:it.emoji,qty:0,total:0}
    ventesProduits[it.name].qty+=it.qty; ventesProduits[it.name].total+=it.total
  }))
  const top = Object.entries(ventesProduits).sort((a,b)=>b[1].total-a[1].total).slice(0,5)
  return (
    <div className="screen">
      <div className="header bleu"><div className="header-row"><button className="back-btn" onClick={() => setScreen('home')}>←</button><div className="header-title">Statistiques</div></div></div>
      <div className="stats-period">
        {['jour','semaine','mois'].map(p => (
          <button key={p} className={`period-btn ${statsPeriod===p?'active':''}`} onClick={() => setStatsPeriod(p)}>{p.charAt(0).toUpperCase()+p.slice(1)}</button>
        ))}
      </div>
      <div className="stats-kpi">
        <div className="kpi-card"><div className="kpi-label">Chiffre d'affaires</div><div className="kpi-val">{fmt(ca)} <span>FCFA</span></div></div>
        <div className="kpi-card"><div className="kpi-label">Bénéfice estimé</div><div className="kpi-val">{fmt(benef)} <span>FCFA</span></div></div>
        <div className="kpi-card"><div className="kpi-label">Nombre de ventes</div><div className="kpi-val">{nbVentes}</div></div>
        <div className="kpi-card"><div className="kpi-label">Panier moyen</div><div className="kpi-val">{fmt(panierMoyen)} <span>F</span></div></div>
      </div>
      <div className="chart-card">
        <div className="chart-label">Ventes des 7 derniers jours</div>
        <div className="bars">
          {days.map((d,i) => (
            <div className="bar-wrap" key={i}>
              <div className={`bar ${d.isToday?'today':''}`} style={{height:Math.max(3,(d.total/maxVal)*76)}}></div>
              <span className="bar-day" style={d.isToday?{color:'var(--orange2)'}:{}}>{d.label}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="section-title">🏆 Top produits</div>
      <div className="card-list" style={{paddingBottom:20}}>
        {top.length===0 ? (
          <div className="empty-state"><div className="ico">📊</div><div className="txt">Pas encore de ventes.</div></div>
        ) : top.map(([name,d],i) => (
          <div className="top-prod-item" key={name}>
            <div className="tp-rank">{i+1}</div>
            <div className="tp-emoji">{d.emoji}</div>
            <div><div className="tp-name">{name}</div><div className="tp-sales">{d.qty} vendus</div></div>
            <div className="tp-val">{fmt(d.total)} F</div>
          </div>
        ))}
      </div>
    </div>
  )
}

function ClientsScreen({ ctx }) {
  const { clients, setModal, setReglementClient, setScreen } = ctx
  return (
    <div className="screen">
      <div className="header violet"><div className="header-row"><button className="back-btn" onClick={() => setScreen('plus')}>←</button><div className="header-title">Clients & Crédits</div><button className="header-icon-btn" onClick={() => setModal('client')}>➕</button></div></div>
      <div className="card-list" style={{paddingTop:14,paddingBottom:20}}>
        {clients.length===0 ? (
          <div className="empty-state"><div className="ico">👥</div><div className="txt">Aucun client enregistré.</div></div>
        ) : clients.map(c => (
          <div className="person-item" key={c.id} onClick={() => c.dette>0&&(setReglementClient(c),setModal('reglement'))}>
            <div className="person-avatar">{c.name.charAt(0).toUpperCase()}</div>
            <div className="person-info"><div className="person-name">{c.name}</div><div className="person-meta">{c.phone||'Pas de téléphone'}</div></div>
            <div className={`person-debt ${c.dette>0?'has':'none'}`}>{c.dette>0?fmt(c.dette)+' F':'À jour ✓'}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

function FournisseursScreen({ ctx }) {
  const { fournisseurs, setModal, setScreen } = ctx
  return (
    <div className="screen">
      <div className="header violet"><div className="header-row"><button className="back-btn" onClick={() => setScreen('plus')}>←</button><div className="header-title">Fournisseurs</div><button className="header-icon-btn" onClick={() => setModal('fournisseur')}>➕</button></div></div>
      <div className="card-list" style={{paddingTop:14,paddingBottom:20}}>
        {fournisseurs.length===0 ? (
          <div className="empty-state"><div className="ico">🚚</div><div className="txt">Aucun fournisseur enregistré.</div></div>
        ) : fournisseurs.map(f => (
          <div className="person-item" key={f.id}>
            <div className="person-avatar">🚚</div>
            <div className="person-info"><div className="person-name">{f.name}</div><div className="person-meta">{f.phone||'Pas de téléphone'}{f.products?' · '+f.products:''}</div></div>
          </div>
        ))}
      </div>
    </div>
  )
}

function PlusScreen({ ctx }) {
  const { setScreen, setModal, boutique, produits, ventes, clients, fournisseurs, toast } = ctx
  async function handleLogout() { await supabase.auth.signOut() }
  function exporter() {
    const data = { boutique, produits, ventes, clients, fournisseurs }
    const blob = new Blob([JSON.stringify(data,null,2)],{type:'application/json'})
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href=url; a.download=`boutique-sauvegarde-${todayStr()}.json`
    document.body.appendChild(a); a.click(); document.body.removeChild(a)
    toast('Sauvegarde téléchargée ✓')
  }
  return (
    <div className="screen">
      <div className="header vert"><div className="header-row"><div className="header-title">Plus d'options</div></div></div>
      <div className="card-list" style={{paddingTop:16}}>
        <div className="menu-item" onClick={() => setScreen('clients')}><div className="menu-icon">👥</div><div className="menu-label">Clients & Crédits</div><div className="menu-arrow">›</div></div>
        <div className="menu-item" onClick={() => setScreen('fournisseurs')}><div className="menu-icon">🚚</div><div className="menu-label">Fournisseurs</div><div className="menu-arrow">›</div></div>
        <div className="menu-item" onClick={() => setModal('boutique')}><div className="menu-icon">🏪</div><div className="menu-label">Infos de la boutique</div><div className="menu-arrow">›</div></div>
        <div className="menu-item" onClick={exporter}><div className="menu-icon">💾</div><div className="menu-label">Exporter mes données</div><div className="menu-arrow">›</div></div>
        <div className="menu-item" onClick={handleLogout}><div className="menu-icon">🚪</div><div className="menu-label">Se déconnecter</div><div className="menu-arrow">›</div></div>
      </div>
    </div>
  )
}
}function Modals({ ctx }) {
  return (
    <>
      {ctx.modal==='produit' && <ModalProduit ctx={ctx} />}
      {ctx.modal==='panier' && <ModalPanier ctx={ctx} />}
      {ctx.modal==='paiement' && <ModalPaiement ctx={ctx} />}
      {ctx.modal==='client' && <ModalClient ctx={ctx} />}
      {ctx.modal==='reglement' && <ModalReglement ctx={ctx} />}
      {ctx.modal==='fournisseur' && <ModalFournisseur ctx={ctx} />}
      {ctx.modal==='boutique' && <ModalBoutique ctx={ctx} />}
    </>
  )
}

function Overlay({ children, onClose }) {
  return (
    <div className="modal-overlay" onClick={e => { if(e.target===e.currentTarget) onClose() }}>
      <div className="modal-sheet">{children}</div>
    </div>
  )
}

function ModalProduit({ ctx }) {
  const { editingProduit, setModal, produits, setProduits, boutique, toast } = ctx
  const [emoji, setEmoji] = useState(editingProduit?.emoji||'')
  const [name, setName] = useState(editingProduit?.name||'')
  const [price, setPrice] = useState(editingProduit?.price||'')
  const [cost, setCost] = useState(editingProduit?.cost||'')
  const [qty, setQty] = useState(editingProduit?.qty??'')
  const [alert, setAlert] = useState(editingProduit?.alert??5)
  const [saving, setSaving] = useState(false)
  function close() { setModal(null) }
  async function save() {
    if(!name.trim()||!price||Number(price)<=0){toast('Renseigne le nom et le prix.');return}
    setSaving(true)
    const payload = { emoji:emoji.trim()||'📦', name:name.trim(), price:Number(price), cost:Number(cost)||0, qty:parseInt(qty)||0, alert:parseInt(alert)||5 }
    if(editingProduit) {
      const {data,error} = await supabase.from('produits').update(payload).eq('id',editingProduit.id).select().maybeSingle()
      if(!error){setProduits(produits.map(p=>p.id===editingProduit.id?data:p));toast('Produit modifié ✓')}
    } else {
      const {data,error} = await supabase.from('produits').insert({...payload,boutique_id:boutique.id}).select().maybeSingle()
      if(!error){setProduits([...produits,data]);toast('Produit ajouté ✓')}
    }
    setSaving(false); close()
  }
  async function remove() {
    const {error} = await supabase.from('produits').delete().eq('id',editingProduit.id)
    if(!error){setProduits(produits.filter(p=>p.id!==editingProduit.id));toast('Produit supprimé')}
    close()
  }
  return (
    <Overlay onClose={close}>
      <div className="modal-handle"></div>
      <div className="modal-header"><div className="modal-title">{editingProduit?'Modifier produit':'Nouveau produit'}</div><button className="modal-close" onClick={close}>✕</button></div>
      <div className="input-group"><label className="input-label">Emoji</label><input className="input-field" maxLength={4} placeholder="🍚 🧴 🧼 🍬" value={emoji} onChange={e=>setEmoji(e.target.value)} /></div>
      <div className="input-group"><label className="input-label">Nom du produit</label><input className="input-field" placeholder="Ex: Riz 1kg" value={name} onChange={e=>setName(e.target.value)} /></div>
      <div className="input-group"><label className="input-label">Prix de vente (FCFA)</label><input className="input-field" type="number" placeholder="Ex: 750" value={price} onChange={e=>setPrice(e.target.value)} /></div>
      <div className="input-group"><label className="input-label">Prix d'achat (FCFA) — optionnel</label><input className="input-field" type="number" placeholder="Ex: 600" value={cost} onChange={e=>setCost(e.target.value)} /></div>
      <div className="input-group"><label className="input-label">Quantité en stock</label><input className="input-field" type="number" placeholder="Ex: 50" value={qty} onChange={e=>setQty(e.target.value)} /></div>
      <div className="input-group"><label className="input-label">Seuil d'alerte</label><input className="input-field" type="number" value={alert} onChange={e=>setAlert(e.target.value)} /></div>
      <div className="btn-row">
        {editingProduit && <button className="btn btn-danger" onClick={remove}>Supprimer</button>}
        <button className="btn btn-primary" onClick={save} disabled={saving}>{saving?'Patiente...':'Enregistrer'}</button>
      </div>
    </Overlay>
  )
}

function ModalPanier({ ctx }) {
  const { panier, setPanier, produits, setModal, toast } = ctx
  const ids = Object.keys(panier).filter(k=>panier[k]>0)
  function changerQte(id, delta) {
    const p=produits.find(x=>x.id===id)
    let newQty=(panier[id]||0)+delta
    if(newQty>p.qty){toast('Stock insuffisant !');return}
    const np={...panier}
    if(newQty<=0) delete np[id]; else np[id]=newQty
    setPanier(np)
  }
  return (
    <Overlay onClose={() => setModal(null)}>
      <div className="modal-handle"></div>
      <div className="modal-header"><div className="modal-title">Mon panier</div><button className="modal-close" onClick={() => setModal(null)}>✕</button></div>
      {ids.length===0 ? (
        <div className="empty-state"><div className="ico">🛒</div><div className="txt">Ton panier est vide.</div></div>
      ) : ids.map(id => {
        const p=produits.find(x=>x.id===id); if(!p) return null
        return (
          <div className="cart-line" key={id}>
            <div className="cart-line-emoji">{p.emoji}</div>
            <div className="cart-line-info"><div className="cart-line-name">{p.name}</div><div className="cart-line-price">{fmt(p.price)} F / unité</div></div>
            <div className="qty-ctrl">
              <button className="qty-btn" onClick={() => changerQte(id,-1)}>−</button>
              <div className="qty-val">{panier[id]}</div>
              <button className="qty-btn" onClick={() => changerQte(id,1)}>+</button>
            </div>
            <div className="cart-line-total">{fmt(p.price*panier[id])} F</div>
          </div>
        )
      })}
      <div className="btn-row"><button className="btn btn-primary" disabled={ids.length===0} onClick={() => setModal('paiement')}>Procéder au paiement</button></div>
    </Overlay>
  )
}

function ModalPaiement({ ctx }) {
  const { panier, setPanier, produits, setProduits, setModal, boutique, ventes, setVentes, clients, setClients, setDernierRecu, setScreen, toast } = ctx
  const ids = Object.keys(panier).filter(k=>panier[k]>0)
  const total = ids.reduce((s,k)=>{const p=produits.find(x=>x.id===k);return s+(p?p.price*panier[k]:0)},0)
  const [received, setReceived] = useState('')
  const [clientName, setClientName] = useState('')
  const [saving, setSaving] = useState(false)
  const recu = parseFloat(received)||0
  const monnaie = recu-total
  async function valider(credit) {
    if(ids.length===0) return
    if(credit&&!clientName.trim()){toast('Indique le nom du client.');return}
    if(!credit&&recu<total){toast('Montant reçu insuffisant.');return}
    setSaving(true)
    const items = ids.map(id=>{const p=produits.find(x=>x.id===id);return{name:p.name,emoji:p.emoji,qty:panier[id],price:p.price,total:p.price*panier[id]}})
    const numero = (ventes.length+1).toString().padStart(5,'0')
    const {data:venteData,error} = await supabase.from('ventes').insert({
      boutique_id:boutique.id, numero, items, total,
      recu:credit?0:recu, monnaie:credit?0:monnaie,
      credit, client_name:clientName.trim()||null
    }).select().maybeSingle()
    if(error){toast('Erreur. Réessaie.');setSaving(false);return}
    for(const id of ids){
      const p=produits.find(x=>x.id===id)
      await supabase.from('produits').update({qty:p.qty-panier[id]}).eq('id',id)
    }
    setProduits(produits.map(p=>ids.includes(p.id)?{...p,qty:p.qty-panier[p.id]}:p))
    if(credit) {
      let client=clients.find(c=>c.name.toLowerCase()===clientName.trim().toLowerCase())
      if(client){
        const newDette=Number(client.dette||0)+total
        await supabase.from('clients').update({dette:newDette}).eq('id',client.id)
        setClients(clients.map(c=>c.id===client.id?{...c,dette:newDette}:c))
      } else {
        const {data:nc}=await supabase.from('clients').insert({boutique_id:boutique.id,name:clientName.trim(),phone:'',dette:total}).select().maybeSingle()
        if(nc) setClients([...clients,nc])
      }
    }
    setVentes([venteData,...ventes]); setDernierRecu(venteData); setPanier({})
    setSaving(false); setModal(null); setScreen('recu')
  }
  return (
    <Overlay onClose={() => setModal(null)}>
      <div className="modal-handle"></div>
      <div className="modal-header"><div className="modal-title">Encaisser la vente</div><button className="modal-close" onClick={() => setModal(null)}>✕</button></div>
      <div style={{padding:'0 16px'}}><div className="card" style={{textAlign:'center',background:'var(--gris1)'}}><div style={{fontSize:11,color:'var(--txt2)'}}>Total à payer</div><div style={{fontSize:26,fontWeight:800,color:'var(--txt)'}}>{fmt(total)} FCFA</div></div></div>
      <div className="input-group"><label className="input-label">Montant reçu (FCFA)</label><input className="input-field" type="number" placeholder="Ex: 2000" value={received} onChange={e=>setReceived(e.target.value)} /></div>
      {recu>0 && <div className="input-group"><div className="card" style={{background:'#E6F5ED'}}><div style={{fontSize:11,color:'var(--txt2)'}}>Monnaie à rendre</div><div style={{fontSize:20,fontWeight:800,color:monnaie<0?'var(--rouge)':'var(--vert)'}}>{fmt(monnaie)} FCFA</div></div></div>}
      <div className="input-group"><label className="input-label">Nom du client (optionnel)</label><input className="input-field" placeholder="Ex: Ibrahim" value={clientName} onChange={e=>setClientName(e.target.value)} /></div>
      <div className="btn-row">
        <button className="btn btn-secondary" disabled={saving} onClick={() => valider(true)}>💳 Crédit</button>
        <button className="btn btn-primary" disabled={saving} onClick={() => valider(false)}>{saving?'Patiente...':'✓ Valider'}</button>
      </div>
    </Overlay>
  )
}

function ModalClient({ ctx }) {
  const { setModal, clients, setClients, boutique, toast } = ctx
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [saving, setSaving] = useState(false)
  async function save() {
    if(!name.trim()){toast('Indique le nom du client.');return}
    setSaving(true)
    const {data,error}=await supabase.from('clients').insert({boutique_id:boutique.id,name:name.trim(),phone:phone.trim(),dette:0}).select().maybeSingle()
    if(!error){setClients([...clients,data]);toast('Client ajouté ✓')}
    setSaving(false); setModal(null)
  }
  return (
    <Overlay onClose={() => setModal(null)}>
      <div className="modal-handle"></div>
      <div className="modal-header"><div className="modal-title">Nouveau client</div><button className="modal-close" onClick={() => setModal(null)}>✕</button></div>
      <div className="input-group"><label className="input-label">Nom du client</label><input className="input-field" placeholder="Ex: Ibrahim Moussa" value={name} onChange={e=>setName(e.target.value)} /></div>
      <div className="input-group"><label className="input-label">Téléphone</label><input className="input-field" placeholder="Ex: 96 00 00 00" value={phone} onChange={e=>setPhone(e.target.value)} /></div>
      <div className="btn-row"><button className="btn btn-primary" disabled={saving} onClick={save}>{saving?'Patiente...':'Enregistrer'}</button></div>
    </Overlay>
  )
}

function ModalReglement({ ctx }) {
  const { reglementClient, setModal, clients, setClients, toast } = ctx
  const [montant, setMontant] = useState('')
  const [saving, setSaving] = useState(false)
  async function save() {
    const m=parseFloat(montant)||0
    if(m<=0){toast('Indique un montant valide.');return}
    setSaving(true)
    const newDette=Math.max(0,Number(reglementClient.dette)-m)
    const {error}=await supabase.from('clients').update({dette:newDette}).eq('id',reglementClient.id)
    if(!error){setClients(clients.map(c=>c.id===reglementClient.id?{...c,dette:newDette}:c));toast('Règlement enregistré ✓')}
    setSaving(false); setModal(null)
  }
  if(!reglementClient) return null
  return (
    <Overlay onClose={() => setModal(null)}>
      <div className="modal-handle"></div>
      <div className="modal-header"><div className="modal-title">Encaisser un règlement</div><button className="modal-close" onClick={() => setModal(null)}>✕</button></div>
      <div style={{padding:'0 16px'}}><div className="card" style={{textAlign:'center',background:'var(--gris1)'}}><div style={{fontSize:11,color:'var(--txt2)'}}>Dette de {reglementClient.name}</div><div style={{fontSize:22,fontWeight:800,color:'var(--rouge)'}}>{fmt(reglementClient.dette)} FCFA</div></div></div>
      <div className="input-group"><label className="input-label">Montant payé (FCFA)</label><input className="input-field" type="number" placeholder="Ex: 5000" value={montant} onChange={e=>setMontant(e.target.value)} /></div>
      <div className="btn-row"><button className="btn btn-primary" disabled={saving} onClick={save}>{saving?'Patiente...':'Enregistrer'}</button></div>
    </Overlay>
  )
}

function ModalFournisseur({ ctx }) {
  const { setModal, fournisseurs, setFournisseurs, boutique, toast } = ctx
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [products, setProducts] = useState('')
  const [saving, setSaving] = useState(false)
  async function save() {
    if(!name.trim()){toast('Indique le nom du fournisseur.');return}
    setSaving(true)
    const {data,error}=await supabase.from('fournisseurs').insert({boutique_id:boutique.id,name:name.trim(),phone:phone.trim(),products:products.trim()}).select().maybeSingle()
    if(!error){setFournisseurs([...fournisseurs,data]);toast('Fournisseur ajouté ✓')}
    setSaving(false); setModal(null)
  }
  return (
    <Overlay onClose={() => setModal(null)}>
      <div className="modal-handle"></div>
      <div className="modal-header"><div className="modal-title">Nouveau fournisseur</div><button className="modal-close" onClick={() => setModal(null)}>✕</button></div>
      <div className="input-group"><label className="input-label">Nom / Entreprise</label><input className="input-field" placeholder="Ex: Grossiste Katako" value={name} onChange={e=>setName(e.target.value)} /></div>
      <div className="input-group"><label className="input-label">Téléphone</label><input className="input-field" placeholder="Ex: 90 00 00 00" value={phone} onChange={e=>setPhone(e.target.value)} /></div>
      <div className="input-group"><label className="input-label">Produits fournis</label><input className="input-field" placeholder="Ex: Riz, Huile, Sucre" value={products} onChange={e=>setProducts(e.target.value)} /></div>
      <div className="btn-row"><button className="btn btn-primary" disabled={saving} onClick={save}>{saving?'Patiente...':'Enregistrer'}</button></div>
    </Overlay>
  )
}

function ModalBoutique({ ctx }) {
  const { boutique, setBoutique, setModal, toast } = ctx
  const [name, setName] = useState(boutique?.name||'')
  const [loc, setLoc] = useState(boutique?.loc||'')
  const [phone, setPhone] = useState(boutique?.phone||'')
  const [saving, setSaving] = useState(false)
  async function save() {
    setSaving(true)
    const payload={name:name.trim()||'Ma Boutique',loc:loc.trim()||'Niger',phone:phone.trim()}
    const {data,error}=await supabase.from('boutiques').update(payload).eq('id',boutique.id).select().maybeSingle()
    if(!error){setBoutique(data);toast('Infos boutique enregistrées ✓')}
    setSaving(false); setModal(null)
  }
  return (
    <Overlay onClose={() => setModal(null)}>
      <div className="modal-handle"></div>
      <div className="modal-header"><div className="modal-title">Infos de la boutique</div><button className="modal-close" onClick={() => setModal(null)}>✕</button></div>
      <div className="input-group"><label className="input-label">Nom de la boutique</label><input className="input-field" placeholder="Ex: Boutique Al-Amin" value={name} onChange={e=>setName(e.target.value)} /></div>
      <div className="input-group"><label className="input-label">Adresse / Quartier</label><input className="input-field" placeholder="Ex: Marché Katako, Niamey" value={loc} onChange={e=>setLoc(e.target.value)} /></div>
      <div className="input-group"><label className="input-label">Téléphone</label><input className="input-field" placeholder="Ex: 96 00 00 00" value={phone} onChange={e=>setPhone(e.target.value)} /></div>
      <div className="btn-row"><button className="btn btn-primary" disabled={saving} onClick={save}>{saving?'Patiente...':'Enregistrer'}</button></div>
    </Overlay>
  )
}
