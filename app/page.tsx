'use client'

import { useEffect, useMemo, useState } from 'react'

type Item = { Objet: string; Catégorie: string; 'Prix / stack de 64 ($)'?: number; 'Prix / unité ($)'?: number; 'Rareté estimée'?: string; 'Justification économique'?: string }
type CartLine = { item: Item; quantity: number; mode: 'unit' | 'stack' }
type Promo = { id: number; title: string; detail: string; active: boolean; image: string; badge: string }

const fallbackItems: Item[] = [
  { Objet: 'Bambou', Catégorie: 'Agriculture', 'Prix / stack de 64 ($)': 16, 'Rareté estimée': 'Très commune', 'Justification économique': 'Croissance rapide et facilement automatisable.' },
  { Objet: 'Blé', Catégorie: 'Agriculture', 'Prix / stack de 64 ($)': 22.4, 'Rareté estimée': 'Très commune', 'Justification économique': 'Culture renouvelable et facile à automatiser.' },
  { Objet: 'Cactus', Catégorie: 'Agriculture', 'Prix / stack de 64 ($)': 44.8, 'Rareté estimée': 'Peu commun', 'Justification économique': "L'absence de désert rend sa disponibilité moins confortable." },
  { Objet: 'Potion de rapidité', Catégorie: 'Alchimie', 'Prix / stack de 64 ($)': 640, 'Rareté estimée': 'Peu commune', 'Justification économique': 'Préparation et accès au Nether inclus.' },
  { Objet: 'Poudre de blaze', Catégorie: 'Alchimie', 'Prix / stack de 64 ($)': 192, 'Rareté estimée': 'Peu commune', 'Justification économique': 'Ressource dangereuse et recherchée.' },
  { Objet: 'Œuf de dragon', Catégorie: 'Raretés', 'Prix / stack de 64 ($)': 50000, 'Rareté estimée': 'Unique', 'Justification économique': 'Objet trophée, disponible sur demande.' },
]

const initialPromos: Promo[] = [
  { id: 1, title: 'La récolte en folie', detail: '-10% sur le bambou, le blé et le cactus cette semaine', badge: '-10%', image: '/assets/promo-farm.png', active: true },
  { id: 2, title: 'Trésors du Nether', detail: 'Poudre de blaze et potions à prix cassés', badge: 'HOT', image: '/assets/promo-potions.png', active: true },
  { id: 3, title: 'Pièce mythique', detail: 'Une offre rare sur l’œuf de dragon, sur demande', badge: 'RARE', image: '/assets/promo-rare.png', active: true },
]

function money(value: number) { return `${value.toLocaleString('fr-FR', { maximumFractionDigits: 2 })} $` }
const CATEGORY_IMAGES: Record<string, string> = {
  'Agriculture': '/assets/items/agriculture.svg',
  'Alchimie': '/assets/items/alchimie.svg',
  'Blocs colorés': '/assets/items/blocs-colores.svg',
  'Blocs naturels': '/assets/items/blocs-naturels.svg',
  'Bois': '/assets/items/bois.svg',
  'Construction': '/assets/items/construction.svg',
  'Construction & décoration': '/assets/items/construction-deco.svg',
  'Cuivre': '/assets/items/cuivre.svg',
  'Décoration & utilitaires': '/assets/items/deco-utilitaires.svg',
  'Drops & objets rares': '/assets/items/drops-rares.svg',
  'Drops de mobs': '/assets/items/drops-mobs.svg',
  'End & exploration': '/assets/items/end-exploration.svg',
  'Équipements': '/assets/items/equipements.svg',
  'Exploration & structures': '/assets/items/exploration.svg',
  'Nether': '/assets/items/nether.svg',
  'Nourriture': '/assets/items/nourriture.svg',
  'Nouveautés 1.21.11': '/assets/items/nouveautes.svg',
  'Outils & équipements': '/assets/items/outils.svg',
  'Plantes & végétation': '/assets/items/plantes.svg',
  'Raretés': '/assets/items/raretes.svg',
  'Redstone & stockage': '/assets/items/redstone.svg',
  'Teintures': '/assets/items/teintures.svg',
  'Transport': '/assets/items/transport.svg',
  'Utilitaires & exploration': '/assets/items/utilitaires.svg',
  'Verre et sable': '/assets/items/verre-sable.svg',
  'Services': '/assets/items/services.svg',
}

const FALLBACK_IMAGE = '/assets/items/divers.svg'

// Couleurs Minecraft (laines, béton, terracotta, teintures...) : les entrées les plus
// spécifiques ("bleu clair", "gris clair") doivent être testées avant les génériques.
const COLOR_HEX: [RegExp, string][] = [
  [/bleu clair/, '#3ab3da'],
  [/gris clair/, '#9d9d97'],
  [/blanc/, '#e9ecee'],
  [/bleu/, '#35399d'],
  [/cyan/, '#158991'],
  [/gris/, '#474f52'],
  [/jaune/, '#f0c93b'],
  [/lime/, '#7fb238'],
  [/magenta/, '#c454c2'],
  [/marron/, '#7a4a2f'],
  [/noir/, '#1c1c22'],
  [/orange/, '#e8781f'],
  [/rose/, '#ee8fac'],
  [/rouge/, '#a4342a'],
  [/vert/, '#546d1b'],
  [/violet/, '#7f37b3'],
]

// Essences de bois : chêne noir / chêne pâle doivent être testés avant "chêne" seul.
const WOOD_HEX: [RegExp, string][] = [
  [/chene noir/, '#3a2617'],
  [/chene pale/, '#d9c9a3'],
  [/chene/, '#9c7233'],
  [/acacia/, '#a94d29'],
  [/bouleau/, '#d9c793'],
  [/cerisier/, '#dd94a4'],
  [/jungle/, '#7c5535'],
  [/mangrove/, '#75342e'],
  [/sapin/, '#4f3620'],
]

function clamp255(v: number) { return Math.max(0, Math.min(255, v)) }
function shade(hex: string, amt: number) {
  const n = parseInt(hex.slice(1), 16)
  const r = clamp255((n >> 16) + amt)
  const g = clamp255(((n >> 8) & 255) + amt)
  const b = clamp255((n & 255) + amt)
  return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)
}

function cubeArt(hex: string) {
  const top = shade(hex, 42)
  const left = hex
  const right = shade(hex, -48)
  const bg1 = shade(hex, -66)
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300"><defs><radialGradient id="g" cx="50%" cy="35%" r="78%"><stop offset="0" stop-color="${bg1}"/><stop offset="1" stop-color="#060a10"/></radialGradient></defs><rect width="400" height="300" fill="url(#g)"/><ellipse cx="200" cy="262" rx="120" ry="18" fill="#000" opacity=".35"/><polygon points="200,26 286,76 200,126 114,76" fill="${top}"/><polygon points="114,76 200,126 200,218 114,168" fill="${left}"/><polygon points="286,76 200,126 200,218 286,168" fill="${right}"/><polyline points="114,76 200,126 286,76" fill="none" stroke="#000" stroke-opacity=".3" stroke-width="3"/><line x1="200" y1="126" x2="200" y2="218" stroke="#000" stroke-opacity=".3" stroke-width="3"/></svg>`
  return `data:image/svg+xml,${encodeURIComponent(svg)}`
}

const KEYWORD_IMAGES: { test: RegExp; image: string }[] = [
  { test: /oeuf de dragon|tete de |totem|etoile du nether|souffle de dragon|trophee/, image: '/assets/items/raretes.svg' },
  { test: /minerai|diamant|emeraude|lapis|amethyste|quartz|netherite|debris|lingot|pepite|charbon|fer brut|or brut/, image: '/assets/items/minerais.svg' },
  { test: /potion|fiole|blaze|alchimie|fermentee|chaudron/, image: '/assets/items/alchimie.svg' },
  { test: /verre|vitre|sable|gravier/, image: '/assets/items/verre-sable.svg' },
  { test: /rail|wagonnet|bateau|elytre|selle|minecart/, image: '/assets/items/transport.svg' },
  { test: /armure|epee|arc |arbalete|casque|plastron|jambiere|bottes|bouclier/, image: '/assets/items/equipements.svg' },
  { test: /pioche|hache|pelle|houe|cisaille|briquet|canne a peche|seau/, image: '/assets/items/outils.svg' },
  { test: /four|enclume|table de craft|table de forge|etabli|bibliotheque/, image: '/assets/items/utilitaires.svg' },
  { test: /redstone|piston|coffre|baril|tonneau|entonnoir|comparateur|repeteur|dropper|distributeur|shulker/, image: '/assets/items/redstone.svg' },
  { test: /cuivre/, image: '/assets/items/cuivre.svg' },
  { test: /nether|wither|ghast|magma|basalte|soul|ame|netherrack|obsidienne/, image: '/assets/items/nether.svg' },
  { test: /^end |ender|chorus|purpur/, image: '/assets/items/end-exploration.svg' },
  { test: /pain|pomme|carotte|steak|boeuf|porc|mouton|lapin|poulet|poisson|morue|saumon|gateau|ragout|soupe|miel|melon|citrouille|biscuit|sucre|lait|baie|champignon/, image: '/assets/items/nourriture.svg' },
  { test: /fleur|feuille|liane|herbe|azalee|fougere|mousse|allium|coquelicot|bleuet|lilas|marguerite|muguet|orchidee|tulipe|pissenlit|tournesol|varech|algue|racines/, image: '/assets/items/plantes.svg' },
]

function normalize(value: string) {
  return value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
}

function itemImage(item: Item) {
  const name = normalize(item.Objet)
  const category = item.Catégorie || ''

  if (category === 'Blocs colorés' || category === 'Teintures') {
    const found = COLOR_HEX.find(([re]) => re.test(name))
    if (found) return cubeArt(found[1])
  }
  if (category === 'Bois') {
    const found = WOOD_HEX.find(([re]) => re.test(name))
    if (found) return cubeArt(found[1])
  }

  const match = KEYWORD_IMAGES.find(entry => entry.test.test(name))
  if (match) return match.image
  return CATEGORY_IMAGES[category] || FALLBACK_IMAGE
}

type ServiceTier = { id: string; label: string; price: number; time?: string; unit?: string; desc: string }
type ServiceOption = { id: string; label: string; price: number; desc: string }
type ServiceLine = { id: string; label: string; price: number; quantity: number; group: 'Ferme' | 'Transport' }
type CustomRequest = { id: number; text: string }
type OrderRecord = {
  id: number
  date: string
  player: string
  contact: string
  note: string
  items: { label: string; detail: string; total: number }[]
  services: { label: string; detail: string; total: number }[]
  customRequests: string[]
  total: number
}
type ServiceCatalog = { farmTiers: ServiceTier[]; farmOptions: ServiceOption[]; transportTiers: ServiceTier[]; transportOptions: ServiceOption[] }
type SortMode = 'defaut' | 'prix-asc' | 'prix-desc' | 'nom'
type AdminTab = 'catalogue' | 'services' | 'promos' | 'commandes'

// Mot de passe admin unique — pas d'identifiant, pas de création de compte.
// Rappel : ce site est 100% statique (pas de serveur), donc ce mot de passe
// vit dans le code envoyé au navigateur. Il décourage les visiteurs curieux,
// mais n'importe qui inspectant le code source de la page peut le retrouver.
const ADMIN_PASSWORD = 'zKsz-jEDN-KMvB-zUlr-QSWH-3zY8-VrrS'

const DEFAULT_SERVICES: ServiceCatalog = {
  farmTiers: [
    { id: 'ferme-petite', label: 'Ferme — Petite', price: 1500, time: '1–2 h', desc: '1 module, compacte, stockage de base, accès maintenance' },
    { id: 'ferme-moyenne', label: 'Ferme — Moyenne', price: 5000, time: '3–5 h', desc: '2–4 modules, production régulière, stockage amélioré' },
    { id: 'ferme-grande', label: 'Ferme — Grande', price: 15000, time: '8–12 h', desc: '5–10 modules, forte production, gros stockage' },
    { id: 'ferme-gigantesque', label: 'Ferme — Gigantesque', price: 40000, time: '20–30 h+', desc: 'Projet industriel, nombreux modules, stockage massif, architecture personnalisée' },
  ],
  farmOptions: [
    { id: 'camo-leger', label: 'Camouflage léger', price: 500, desc: 'Masquage visuel simple' },
    { id: 'camo-complet', label: 'Camouflage complet', price: 1500, desc: 'Relief, végétation et façades' },
    { id: 'camo-premium', label: 'Camouflage premium', price: 10000, desc: 'Intégration poussée au terrain + accès discret' },
    { id: 'decoration', label: 'Décoration', price: 1000, desc: 'Habillage esthétique' },
    { id: 'tri', label: 'Tri automatique', price: 2500, desc: 'Tri et stockage structuré' },
    { id: 'optimisation', label: 'Optimisation', price: 2000, desc: 'Optimisation du débit selon le design' },
  ],
  transportTiers: [
    { id: 'transport-petit', label: 'Transport — petit', price: 500, unit: 'trajet', desc: 'Inclus 0–500 blocs · au-delà 1 $/bloc (sur devis)' },
    { id: 'transport-moyen', label: 'Transport — moyen', price: 1500, unit: 'trajet', desc: 'Inclus 0–1 500 blocs · au-delà 0,75 $/bloc (sur devis)' },
    { id: 'transport-grand', label: 'Transport — grand', price: 4000, unit: 'trajet', desc: 'Inclus 0–3 000 blocs · au-delà 0,60 $/bloc (sur devis)' },
    { id: 'transport-industriel', label: 'Transport — industriel', price: 10000, unit: 'mission', desc: 'Inclus 0–6 000 blocs · au-delà entièrement sur devis' },
  ],
  transportOptions: [
    { id: 'chargement', label: 'Chargement / déchargement', price: 300, desc: '1 opération (supplément sur devis si complexe)' },
    { id: 'stockage', label: 'Stockage temporaire', price: 500, desc: 'Par jour, zone dédiée' },
  ],
}

function loadJSON<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback
  try { const raw = localStorage.getItem(key); return raw ? (JSON.parse(raw) as T) : fallback } catch { return fallback }
}
function saveJSON(key: string, value: unknown) {
  try { localStorage.setItem(key, JSON.stringify(value)) } catch { /* stockage indisponible, on ignore */ }
}

export default function Page() {
  const [items, setItems] = useState<Item[]>(fallbackItems)
  const [cart, setCart] = useState<CartLine[]>([])
  const [serviceCart, setServiceCart] = useState<ServiceLine[]>([])
  const [customRequests, setCustomRequests] = useState<CustomRequest[]>([])
  const [customText, setCustomText] = useState('')
  const [promos, setPromos] = useState<Promo[]>(initialPromos)
  const [services, setServices] = useState<ServiceCatalog>(DEFAULT_SERVICES)
  const [orders, setOrders] = useState<OrderRecord[]>([])
  const [view, setView] = useState<'home' | 'catalogue' | 'services' | 'admin'>('home')
  const [query, setQuery] = useState('')
  const [sortMode, setSortMode] = useState<SortMode>('defaut')
  const [cartOpen, setCartOpen] = useState(false)
  const [checkoutOpen, setCheckoutOpen] = useState(false)
  const [adminTab, setAdminTab] = useState<AdminTab>('catalogue')
  const [notice, setNotice] = useState('')
  const [newPromo, setNewPromo] = useState({ title: '', detail: '' })
  const [adminAuth, setAdminAuth] = useState(false)
  const [authOpen, setAuthOpen] = useState(false)

  useEffect(() => { fetch('/data/catalogue.json').then(r => r.json()).then(data => Array.isArray(data) && setItems(data)).catch(() => {}) }, [])
  useEffect(() => { if (sessionStorage.getItem('tfpc-admin-session') === 'true') setAdminAuth(true) }, [])
  useEffect(() => { setServices(loadJSON('tfpc-services', DEFAULT_SERVICES)) }, [])
  useEffect(() => { setOrders(loadJSON('tfpc-orders', [] as OrderRecord[])) }, [])
  useEffect(() => { saveJSON('tfpc-services', services) }, [services])

  const openAdmin = () => setAuthOpen(true)
  const handleAdminAuth = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const password = String(form.get('password') || '')
    if (password !== ADMIN_PASSWORD) { setNotice('Mot de passe incorrect.'); return }
    sessionStorage.setItem('tfpc-admin-session', 'true')
    setAdminAuth(true); setAuthOpen(false); setView('admin')
  }
  const logoutAdmin = () => { sessionStorage.removeItem('tfpc-admin-session'); setAdminAuth(false); setView('home') }

  const priceBase = (item: Item) => Number(item['Prix / stack de 64 ($)']) || (Number(item['Prix / unité ($)']) || 0) * 64
  const filtered = useMemo(() => {
    const list = items.filter(item => `${item.Objet} ${item.Catégorie}`.toLowerCase().includes(query.toLowerCase()))
    if (sortMode === 'prix-asc') return [...list].sort((a, b) => priceBase(a) - priceBase(b))
    if (sortMode === 'prix-desc') return [...list].sort((a, b) => priceBase(b) - priceBase(a))
    if (sortMode === 'nom') return [...list].sort((a, b) => a.Objet.localeCompare(b.Objet, 'fr'))
    return list
  }, [items, query, sortMode])

  const lineUnitPrice = (item: Item, mode: 'unit' | 'stack') => mode === 'unit' ? (Number(item['Prix / unité ($)']) || (Number(item['Prix / stack de 64 ($)']) || 0) / 64) : (Number(item['Prix / stack de 64 ($)']) || (Number(item['Prix / unité ($)']) || 0) * 64)
  const catalogueTotal = cart.reduce((sum, line) => sum + lineUnitPrice(line.item, line.mode) * line.quantity, 0)
  const serviceTotal = serviceCart.reduce((sum, line) => sum + line.price * line.quantity, 0)
  const total = catalogueTotal + serviceTotal
  const hasVariablePricing = serviceCart.some(line => line.group === 'Transport') || customRequests.length > 0
  const rangeHigh = total * 1.25
  const lineKey = (name: string, mode: 'unit' | 'stack') => `${name}::${mode}`

  const add = (item: Item, qty: number = 1, mode: 'unit' | 'stack' = 'stack') => {
    const amount = Math.max(1, qty)
    setCart(lines => {
      const existing = lines.find(line => line.item.Objet === item.Objet && line.mode === mode)
      return existing ? lines.map(line => line === existing ? { ...line, quantity: line.quantity + amount } : line) : [...lines, { item, quantity: amount, mode }]
    })
    setNotice(`${item.Objet} ajouté au panier (${amount} ${mode === 'unit' ? 'unité(s)' : 'stack(s)'})`)
  }
  const remove = (name: string, mode: 'unit' | 'stack') => setCart(lines => lines.filter(line => !(line.item.Objet === name && line.mode === mode)))
  const setQuantity = (name: string, mode: 'unit' | 'stack', qty: number) => setCart(lines => qty <= 0 ? lines.filter(line => !(line.item.Objet === name && line.mode === mode)) : lines.map(line => line.item.Objet === name && line.mode === mode ? { ...line, quantity: qty } : line))
  const [pickQty, setPickQty] = useState<Record<string, number>>({})
  const [pickMode, setPickMode] = useState<Record<string, 'unit' | 'stack'>>({})
  const qtyFor = (name: string) => pickQty[name] || 1
  const modeFor = (name: string) => pickMode[name] || 'stack'
  const bumpQty = (name: string, delta: number) => setPickQty(current => ({ ...current, [name]: Math.max(1, (current[name] || 1) + delta) }))
  const setModeFor = (name: string, mode: 'unit' | 'stack') => setPickMode(current => ({ ...current, [name]: mode }))

  const addService = (label: string, price: number, group: 'Ferme' | 'Transport', id: string, qty: number = 1) => {
    setServiceCart(lines => {
      const existing = lines.find(line => line.id === id)
      return existing ? lines.map(line => line === existing ? { ...line, quantity: line.quantity + qty } : line) : [...lines, { id, label, price, quantity: qty, group }]
    })
    setNotice(`${label} ajouté au panier`)
  }
  const removeService = (id: string) => setServiceCart(lines => lines.filter(line => line.id !== id))
  const setServiceQuantity = (id: string, qty: number) => setServiceCart(lines => qty <= 0 ? lines.filter(line => line.id !== id) : lines.map(line => line.id === id ? { ...line, quantity: qty } : line))
  const [serviceQty, setServiceQtyPick] = useState<Record<string, number>>({})
  const serviceQtyFor = (id: string) => serviceQty[id] || 1
  const bumpServiceQty = (id: string, delta: number) => setServiceQtyPick(current => ({ ...current, [id]: Math.max(1, (current[id] || 1) + delta) }))

  const addCustomRequest = () => {
    if (!customText.trim()) return
    setCustomRequests(current => [...current, { id: Date.now(), text: customText.trim() }])
    setCustomText('')
    setNotice('Demande sur mesure ajoutée au panier')
  }
  const removeCustomRequest = (id: number) => setCustomRequests(current => current.filter(request => request.id !== id))

  const submitOrder = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const player = String(form.get('player') || '')
    const contact = String(form.get('contact') || '')
    const note = String(form.get('note') || '')
    const order: OrderRecord = {
      id: Date.now(),
      date: new Date().toLocaleString('fr-FR'),
      player, contact, note,
      items: cart.map(line => ({ label: line.item.Objet, detail: `${line.quantity} ${line.mode === 'unit' ? 'unité(s)' : 'stack(s)'}`, total: lineUnitPrice(line.item, line.mode) * line.quantity })),
      services: serviceCart.map(line => ({ label: line.label, detail: `${line.quantity} ×`, total: line.price * line.quantity })),
      customRequests: customRequests.map(request => request.text),
      total,
    }
    const nextOrders = [order, ...orders]
    setOrders(nextOrders)
    saveJSON('tfpc-orders', nextOrders)
    setCart([]); setServiceCart([]); setCustomRequests([])
    setCheckoutOpen(false); setCartOpen(false)
    setNotice('Commande enregistrée. Nous revenons vers toi pour le paiement et la livraison.')
  }
  const deleteOrder = (id: number) => { const next = orders.filter(order => order.id !== id); setOrders(next); saveJSON('tfpc-orders', next) }

  const cartCount = cart.reduce((sum, line) => sum + line.quantity, 0) + serviceCart.reduce((sum, line) => sum + line.quantity, 0) + customRequests.length
  const catalogueItemsToShow = view === 'home' ? filtered.slice(0, 6) : filtered

  return <div className="site-shell">
    <header className="topbar">
      <a className="brand" href="#" onClick={() => setView('home')}><img src="/assets/logo.svg" alt="Tout faire pas cher" /></a>
      <nav>
        <button onClick={() => setView('home')}>Accueil</button>
        <button onClick={() => setView('catalogue')}>Catalogue</button>
        <button onClick={() => setView('services')}>Services</button>
        <button className="admin-link" onClick={() => adminAuth ? setView('admin') : openAdmin()}>Admin</button>
      </nav>
      <button className="cart-button" onClick={() => setCartOpen(true)}>Panier <b>{cartCount}</b></button>
    </header>
    {notice && <div className="toast" role="status">{notice}<button onClick={() => setNotice('')}>×</button></div>}

    {view === 'admin' && adminAuth ? <Admin
      items={items} setItems={setItems}
      promos={promos} setPromos={setPromos}
      services={services} setServices={setServices}
      orders={orders} deleteOrder={deleteOrder}
      tab={adminTab} setTab={setAdminTab}
      newPromo={newPromo} setNewPromo={setNewPromo}
      onBack={() => setView('home')}
      onLogout={logoutAdmin}
    /> : <>
      {view === 'home' && <>
        <section className="hero">
          <div><span className="eyebrow">Boutique Minecraft • simple et fiable</span><h1>Tout faire pas cher.<br /><em>Oui, on peut.</em></h1>
          <p>Ressources, objets rares, fermes et services sur mesure. Ajoute ce dont tu as besoin au panier, puis indique ton pseudo au moment de commander.</p>
          <div className="hero-actions"><button className="primary" onClick={() => setView('catalogue')}>Voir le catalogue</button><button className="secondary" onClick={() => setCartOpen(true)}>Ouvrir le panier</button></div>
          </div>
          <div className="hero-image"><img src="/assets/hero.svg" alt="Paysage Minecraft nocturne" /></div>
        </section>
        <section className="promo-strip">
          <div className="promo-heading"><span className="eyebrow">Offres limitées</span><h2>Les promos qui font plaisir</h2><p>Des prix boostés, des stocks limités. Profite-en avant que les coffres soient vides.</p></div>
          <div className="promo-grid">{promos.filter(p => p.active).map(p => <article className="promo-card" key={p.id}><img src={p.image} alt="" /><div className="promo-overlay"><b className="promo-badge">{p.badge}</b><strong>{p.title}</strong><span>{p.detail}</span><button onClick={() => setView('catalogue')}>Profiter de l'offre</button></div></article>)}</div>
        </section>
      </>}

      {view !== 'services' && <section className="catalogue" id="catalogue">
        <div className="section-heading"><div><span className="eyebrow">Catalogue</span><h2>{view === 'home' ? 'Les incontournables' : `Tous les objets disponibles (${filtered.length})`}</h2></div><input aria-label="Rechercher un objet" placeholder="Rechercher un objet…" value={query} onChange={e => setQuery(e.target.value)} /></div>
        <div className="category-row">
          <button onClick={() => setQuery('Agriculture')}>Agriculture</button>
          <button onClick={() => setQuery('Alchimie')}>Alchimie</button>
          <button onClick={() => setQuery('rare')}>Objets rares</button>
          <button onClick={() => setQuery('')}>Tout afficher</button>
          {view !== 'home' && <span className="sort-group">
            <button className={sortMode === 'prix-asc' ? 'selected' : ''} onClick={() => setSortMode(sortMode === 'prix-asc' ? 'defaut' : 'prix-asc')}>Prix croissant</button>
            <button className={sortMode === 'prix-desc' ? 'selected' : ''} onClick={() => setSortMode(sortMode === 'prix-desc' ? 'defaut' : 'prix-desc')}>Prix décroissant</button>
            <button className={sortMode === 'nom' ? 'selected' : ''} onClick={() => setSortMode(sortMode === 'nom' ? 'defaut' : 'nom')}>Nom A→Z</button>
          </span>}
        </div>
        <div className="product-grid">{catalogueItemsToShow.map(item => <article className="product-card" key={item.Objet}>
          <div className="product-art"><img src={itemImage(item)} alt={`Illustration de ${item.Objet}`} loading="lazy" onError={event => { const target = event.currentTarget; if (target.src.indexOf(FALLBACK_IMAGE) === -1) target.src = FALLBACK_IMAGE }} /></div>
          <div className="product-body">
            <small>{item.Catégorie}</small><h3>{item.Objet}</h3><p>{item['Justification économique'] || 'Article disponible sur commande.'}</p>
            <div className="product-footer">
              <strong>{money(lineUnitPrice(item, modeFor(item.Objet)) * qtyFor(item.Objet))}</strong>
              <div className="buy-controls">
                <div className="mode-picker"><button type="button" className={modeFor(item.Objet) === 'unit' ? 'selected' : ''} onClick={() => setModeFor(item.Objet, 'unit')}>Unité</button><button type="button" className={modeFor(item.Objet) === 'stack' ? 'selected' : ''} onClick={() => setModeFor(item.Objet, 'stack')}>Stack 64</button></div>
                <div className="qty-picker"><button type="button" aria-label="Diminuer la quantité" onClick={() => bumpQty(item.Objet, -1)}>−</button><span>{qtyFor(item.Objet)}</span><button type="button" aria-label="Augmenter la quantité" onClick={() => bumpQty(item.Objet, 1)}>+</button></div>
                <button onClick={() => add(item, qtyFor(item.Objet), modeFor(item.Objet))}>Ajouter</button>
              </div>
            </div>
          </div>
        </article>)}</div>
      </section>}

      {view === 'services' && <section className="catalogue services-view" id="services">
        <div className="section-heading"><div><span className="eyebrow">Services</span><h2>Fermes automatiques & transport</h2></div></div>

        <div className="service-block">
          <h3>Construction d'une ferme</h3>
          <div className="service-grid">{services.farmTiers.map(tier => <article className="service-card" key={tier.id}>
            <h4>{tier.label}</h4><p>{tier.desc}</p>{tier.time && <small>Temps indicatif : {tier.time}</small>}
            <div className="service-footer">
              <strong>{money(tier.price * serviceQtyFor(tier.id))}</strong>
              <div className="qty-picker"><button type="button" onClick={() => bumpServiceQty(tier.id, -1)}>−</button><span>{serviceQtyFor(tier.id)}</span><button type="button" onClick={() => bumpServiceQty(tier.id, 1)}>+</button></div>
              <button onClick={() => addService(tier.label, tier.price, 'Ferme', tier.id, serviceQtyFor(tier.id))}>Ajouter au panier</button>
            </div>
          </article>)}</div>
          <h5 className="options-title">Options facultatives</h5>
          <div className="option-row">{services.farmOptions.map(opt => <button key={opt.id} type="button" className="option-chip" title={opt.desc} onClick={() => addService(opt.label, opt.price, 'Ferme', opt.id, 1)}>{opt.label} · {money(opt.price)}</button>)}</div>
        </div>

        <div className="service-block">
          <h3>Transport</h3>
          <div className="service-grid">{services.transportTiers.map(tier => <article className="service-card" key={tier.id}>
            <h4>{tier.label}</h4><p>{tier.desc}</p>{tier.unit && <small>Unité : {tier.unit}</small>}
            <div className="service-footer">
              <strong>{money(tier.price * serviceQtyFor(tier.id))}</strong>
              <div className="qty-picker"><button type="button" onClick={() => bumpServiceQty(tier.id, -1)}>−</button><span>{serviceQtyFor(tier.id)}</span><button type="button" onClick={() => bumpServiceQty(tier.id, 1)}>+</button></div>
              <button onClick={() => addService(tier.label, tier.price, 'Transport', tier.id, serviceQtyFor(tier.id))}>Ajouter au panier</button>
            </div>
          </article>)}</div>
          <h5 className="options-title">Options facultatives</h5>
          <div className="option-row">{services.transportOptions.map(opt => <button key={opt.id} type="button" className="option-chip" title={opt.desc} onClick={() => addService(opt.label, opt.price, 'Transport', opt.id, 1)}>{opt.label} · {money(opt.price)}</button>)}</div>
        </div>

        <div className="service-block custom-block">
          <h3>Divers — demande sur mesure</h3>
          <p>Tu ne trouves pas ce que tu cherches ? Décris ton besoin, on revient vers toi avec un devis.</p>
          <textarea value={customText} onChange={e => setCustomText(e.target.value)} placeholder="Ex : construction complète d'une base, ferme spécifique, gros transport, projet redstone…" />
          <button className="primary" onClick={addCustomRequest}>Ajouter la demande au panier</button>
        </div>
      </section>}
    </>}

    <footer>© Tout faire pas cher • Minecraft Java • Prix indicatifs du serveur</footer>

    {cartOpen && <aside className="drawer" aria-label="Panier">
      <div className="drawer-head"><h2>Ton panier</h2><button onClick={() => setCartOpen(false)}>×</button></div>
      {cart.length === 0 && serviceCart.length === 0 && customRequests.length === 0 ? <p className="empty">Ton panier est vide. Ajoute des objets ou des services.</p> : <>
        {cart.length > 0 && <div className="cart-section"><h3>Objets</h3>
          {cart.map(line => <div className="cart-line" key={lineKey(line.item.Objet, line.mode)}>
            <div><b>{line.item.Objet}</b><span>{line.mode === 'unit' ? 'À l\u2019unité' : 'Stack de 64'} · {money(lineUnitPrice(line.item, line.mode) * line.quantity)}</span>
              <div className="qty-picker cart-qty"><button type="button" onClick={() => setQuantity(line.item.Objet, line.mode, line.quantity - 1)}>−</button><span>{line.quantity} {line.mode === 'unit' ? 'unité(s)' : 'stack(s)'}</span><button type="button" onClick={() => setQuantity(line.item.Objet, line.mode, line.quantity + 1)}>+</button></div>
            </div>
            <button onClick={() => remove(line.item.Objet, line.mode)}>Retirer</button>
          </div>)}
        </div>}
        {serviceCart.length > 0 && <div className="cart-section"><h3>Services</h3>
          {serviceCart.map(line => <div className="cart-line" key={line.id}>
            <div><b>{line.label}</b><span>{line.group} · {money(line.price * line.quantity)}</span>
              <div className="qty-picker cart-qty"><button type="button" onClick={() => setServiceQuantity(line.id, line.quantity - 1)}>−</button><span>{line.quantity} ×</span><button type="button" onClick={() => setServiceQuantity(line.id, line.quantity + 1)}>+</button></div>
            </div>
            <button onClick={() => removeService(line.id)}>Retirer</button>
          </div>)}
        </div>}
        {customRequests.length > 0 && <div className="cart-section"><h3>Demandes sur mesure</h3>
          {customRequests.map(request => <div className="cart-line custom-line" key={request.id}>
            <div><span>{request.text}</span><small>Sur devis — pas de prix fixe</small></div>
            <button onClick={() => removeCustomRequest(request.id)}>Retirer</button>
          </div>)}
        </div>}
        <div className="cart-total"><span>{hasVariablePricing ? 'Fourchette estimée' : 'Total estimé'}</span><strong>{hasVariablePricing ? `${money(total)} – ${money(rangeHigh)}` : money(total)}</strong></div>
        {hasVariablePricing && <p className="range-note">Le prix final dépend de la distance de transport et/ou de ta demande sur mesure — on te confirme le montant exact avant paiement.</p>}
        <button className="primary full" onClick={() => setCheckoutOpen(true)}>Passer à la commande</button>
      </>}
    </aside>}

    {checkoutOpen && <div className="modal-backdrop"><form className="checkout modal-card" onSubmit={submitOrder}>
      <button type="button" className="modal-close" onClick={() => setCheckoutOpen(false)}>×</button>
      <span className="eyebrow">Dernière étape</span><h2>Qui doit recevoir la commande ?</h2>
      <p>Le panier est conservé pendant que tu renseignes tes informations.</p>
      <label>Pseudo Minecraft *<input required name="player" placeholder="Ton pseudo" /></label>
      <label>Contact (Discord, etc.)<input name="contact" placeholder="Optionnel" /></label>
      <label>Précision de livraison<textarea name="note" placeholder="Coordonnées, horaire ou demande particulière…" /></label>
      <div className="checkout-total"><span>{hasVariablePricing ? 'Total à confirmer (fourchette)' : 'Total à confirmer'}</span><b>{hasVariablePricing ? `${money(total)} – ${money(rangeHigh)}` : money(total)}</b></div>
      <button className="primary full">Confirmer ma commande</button>
    </form></div>}

    {authOpen && <div className="modal-backdrop"><form className="modal-card admin-auth" onSubmit={handleAdminAuth}>
      <button type="button" className="modal-close" onClick={() => setAuthOpen(false)}>×</button>
      <span className="eyebrow">Accès réservé</span><h2>Connexion admin</h2>
      <p>Entre le mot de passe administrateur pour gérer la boutique.</p>
      <label>Mot de passe<input required type="password" name="password" autoComplete="current-password" /></label>
      <button className="primary full">Se connecter</button>
    </form></div>}
  </div>
}

function Admin({ items, setItems, promos, setPromos, services, setServices, orders, deleteOrder, tab, setTab, newPromo, setNewPromo, onBack, onLogout }: {
  items: Item[]; setItems: React.Dispatch<React.SetStateAction<Item[]>>
  promos: Promo[]; setPromos: React.Dispatch<React.SetStateAction<Promo[]>>
  services: ServiceCatalog; setServices: React.Dispatch<React.SetStateAction<ServiceCatalog>>
  orders: OrderRecord[]; deleteOrder: (id: number) => void
  tab: AdminTab; setTab: (tab: AdminTab) => void
  newPromo: { title: string; detail: string }; setNewPromo: React.Dispatch<React.SetStateAction<{ title: string; detail: string }>>
  onBack: () => void; onLogout: () => void
}) {
  const [editing, setEditing] = useState<Item | null>(null)
  const [adminSearch, setAdminSearch] = useState('')
  const filteredAdminItems = useMemo(() => items.filter(item => `${item.Objet} ${item.Catégorie}`.toLowerCase().includes(adminSearch.toLowerCase())), [items, adminSearch])
  const saveItem = (event: React.FormEvent<HTMLFormElement>) => { event.preventDefault(); if (!editing) return; setItems(current => current.some(item => item.Objet === editing.Objet) ? current.map(item => item.Objet === editing.Objet ? editing : item) : [editing, ...current]); setEditing(null) }
  const updateTierPrice = (group: 'farmTiers' | 'transportTiers', id: string, price: number) => setServices(current => ({ ...current, [group]: current[group].map(t => t.id === id ? { ...t, price } : t) }))
  const updateOptionPrice = (group: 'farmOptions' | 'transportOptions', id: string, price: number) => setServices(current => ({ ...current, [group]: current[group].map(o => o.id === id ? { ...o, price } : o) }))

  return <main className="admin-page">
    <div className="admin-hero">
      <div><span className="eyebrow">Espace gestion</span><h1>Admin boutique</h1><p>Modifie les prix, les descriptions, les tarifs de service et suis les commandes.</p></div>
      <div className="admin-hero-actions"><button className="secondary" onClick={onBack}>Retour boutique</button><button className="danger" onClick={onLogout}>Se déconnecter</button></div>
    </div>
    <div className="admin-tabs">
      <button className={tab === 'catalogue' ? 'selected' : ''} onClick={() => setTab('catalogue')}>Objets & prix ({items.length})</button>
      <button className={tab === 'services' ? 'selected' : ''} onClick={() => setTab('services')}>Tarifs services</button>
      <button className={tab === 'promos' ? 'selected' : ''} onClick={() => setTab('promos')}>Promotions</button>
      <button className={tab === 'commandes' ? 'selected' : ''} onClick={() => setTab('commandes')}>Commandes ({orders.length})</button>
    </div>

    {tab === 'catalogue' && <section className="admin-panel">
      <div className="panel-head"><div><h2>Catalogue</h2><p>{filteredAdminItems.length} / {items.length} objets affichés</p></div><button className="primary" onClick={() => setEditing({ Objet: '', Catégorie: 'Agriculture', 'Prix / stack de 64 ($)': 0, 'Justification économique': '' })}>Ajouter un objet</button></div>
      <input className="admin-search" placeholder="Filtrer le catalogue par nom ou catégorie…" value={adminSearch} onChange={e => setAdminSearch(e.target.value)} />
      <div className="admin-list">{filteredAdminItems.map(item => <div className="admin-row" key={item.Objet}><div><b>{item.Objet}</b><span>{item.Catégorie} · {money(Number(item['Prix / stack de 64 ($)']) || 0)}</span></div><button onClick={() => setEditing({ ...item })}>Modifier</button></div>)}</div>
    </section>}

    {tab === 'services' && <section className="admin-panel">
      <div className="panel-head"><div><h2>Tarifs des services</h2><p>Ces prix sont ceux affichés en direct dans l'onglet Services de la boutique.</p></div></div>
      <h3 className="admin-subhead">Construction de ferme</h3>
      <div className="admin-list">{services.farmTiers.map(t => <div className="admin-row" key={t.id}><div><b>{t.label}</b><span>{t.desc}</span></div><div className="admin-price"><input type="number" min="0" step="1" value={t.price} onChange={e => updateTierPrice('farmTiers', t.id, Number(e.target.value))} /><span>$</span></div></div>)}</div>
      <h3 className="admin-subhead">Options ferme</h3>
      <div className="admin-list">{services.farmOptions.map(o => <div className="admin-row" key={o.id}><div><b>{o.label}</b><span>{o.desc}</span></div><div className="admin-price"><input type="number" min="0" step="1" value={o.price} onChange={e => updateOptionPrice('farmOptions', o.id, Number(e.target.value))} /><span>$</span></div></div>)}</div>
      <h3 className="admin-subhead">Transport</h3>
      <div className="admin-list">{services.transportTiers.map(t => <div className="admin-row" key={t.id}><div><b>{t.label}</b><span>{t.desc}</span></div><div className="admin-price"><input type="number" min="0" step="1" value={t.price} onChange={e => updateTierPrice('transportTiers', t.id, Number(e.target.value))} /><span>$</span></div></div>)}</div>
      <h3 className="admin-subhead">Options transport</h3>
      <div className="admin-list">{services.transportOptions.map(o => <div className="admin-row" key={o.id}><div><b>{o.label}</b><span>{o.desc}</span></div><div className="admin-price"><input type="number" min="0" step="1" value={o.price} onChange={e => updateOptionPrice('transportOptions', o.id, Number(e.target.value))} /><span>$</span></div></div>)}</div>
    </section>}

    {tab === 'promos' && <section className="admin-panel">
      <div className="panel-head"><div><h2>Promotions publiques</h2><p>Les promotions actives apparaissent automatiquement sur l'accueil.</p></div></div>
      <div className="promo-form"><input placeholder="Titre de la promo" value={newPromo.title} onChange={e => setNewPromo({ ...newPromo, title: e.target.value })} /><input placeholder="Détail visible par les clients" value={newPromo.detail} onChange={e => setNewPromo({ ...newPromo, detail: e.target.value })} /><button className="primary" onClick={() => { if (newPromo.title && newPromo.detail) { setPromos([...promos, { ...newPromo, id: Date.now(), badge: 'NEW', image: '/assets/promo-farm.png', active: true }]); setNewPromo({ title: '', detail: '' }) } }}>Publier</button></div>
      <div className="admin-list">{promos.map(p => <div className="admin-row" key={p.id}><div><b>{p.title}</b><span>{p.detail}</span></div><div><button onClick={() => setPromos(promos.map(x => x.id === p.id ? { ...x, active: !x.active } : x))}>{p.active ? 'Masquer' : 'Afficher'}</button><button className="danger" onClick={() => setPromos(promos.filter(x => x.id !== p.id))}>Supprimer</button></div></div>)}</div>
    </section>}

    {tab === 'commandes' && <section className="admin-panel">
      <div className="panel-head"><div><h2>Commandes reçues</h2><p>{orders.length} commande(s) enregistrée(s) sur cet appareil.</p></div></div>
      <p className="admin-note">⚠️ Ce site est statique (pas de serveur ni de base de données) : cette liste n'affiche que les commandes passées depuis <b>ce même navigateur</b>. Pour recevoir les commandes de tous tes clients en un seul endroit, il faudra brancher une vraie base de données côté serveur.</p>
      {orders.length === 0 ? <p className="empty">Aucune commande pour l'instant.</p> : <div className="order-list">{orders.map(order => <article className="order-card" key={order.id}>
        <div className="order-head"><div><b>{order.player}</b><span>{order.date}</span></div><strong>{money(order.total)}</strong></div>
        {order.contact && <p className="order-contact">Contact : {order.contact}</p>}
        {order.note && <p className="order-note">Note : {order.note}</p>}
        {(order.items.length > 0 || order.services.length > 0) && <ul className="order-lines">
          {order.items.map((l, i) => <li key={`i${i}`}>{l.label} — {l.detail} — {money(l.total)}</li>)}
          {order.services.map((l, i) => <li key={`s${i}`}>{l.label} — {l.detail} — {money(l.total)}</li>)}
        </ul>}
        {order.customRequests.length > 0 && <ul className="order-lines custom">{order.customRequests.map((t, i) => <li key={`c${i}`}>Sur mesure : {t}</li>)}</ul>}
        <button className="danger" onClick={() => deleteOrder(order.id)}>Supprimer</button>
      </article>)}</div>}
    </section>}

    {editing && <div className="modal-backdrop"><form className="modal-card admin-form" onSubmit={saveItem}>
      <button type="button" className="modal-close" onClick={() => setEditing(null)}>×</button>
      <h2>{editing.Objet ? 'Modifier l\u2019objet' : 'Nouvel objet'}</h2>
      <label>Nom<input required value={editing.Objet} onChange={e => setEditing({ ...editing, Objet: e.target.value })} /></label>
      <label>Catégorie<input value={editing.Catégorie} onChange={e => setEditing({ ...editing, Catégorie: e.target.value })} /></label>
      <label>Prix par stack<input type="number" min="0" step="0.01" value={editing['Prix / stack de 64 ($)'] || 0} onChange={e => setEditing({ ...editing, 'Prix / stack de 64 ($)': Number(e.target.value) })} /></label>
      <label>Description<textarea value={editing['Justification économique'] || ''} onChange={e => setEditing({ ...editing, 'Justification économique': e.target.value })} /></label>
      <button className="primary full">Enregistrer</button>
    </form></div>}
  </main>
}
