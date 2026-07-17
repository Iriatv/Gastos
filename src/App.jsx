import { useState, useMemo, useEffect, useCallback } from "react";
import { PlusCircle, TrendingUp, TrendingDown, Scale, ChevronDown, Trash2, X, SlidersHorizontal, Download, Landmark, LineChart, Gift, PiggyBank, Pencil, Check, Minus } from "lucide-react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import * as XLSX from "xlsx";
import { supabase } from "./supabaseClient";

const CATEGORIES = {
  ingreso: {
    "Nómina": [],
    "Otros trabajos": [],
    "Otros ingresos": [],
    "Viajes": ["BlaBlaCar"],
  },
  gasto: {
    "Casa": ["Alquiler", "Gasoil", "Electricidad", "Agua", "Teléfono"],
    "Supermercado": [],
    "Ocio": ["Comer fuera", "Tomar algo", "Entradas", "Actividades"],
    "Otros": ["Compra", "Salud"],
    "Viajes": ["Transporte", "Gasolina", "Peajes", "Aparcamientos", "Alojamiento", "Comer fuera", "Tomar algo (snacks/helados)", "Souvenirs", "Actividades", "Seguro", "Internet", "Otros"],
  },
};

const PALETTE = ["#2D6A63", "#D4A017", "#7A3B4E", "#3E6E9E", "#8C6A3F", "#4A7A4E", "#9A4E3C", "#5B5E8C"];

const DESTINOS = [
  { key: "Cuenta remunerada", color: "#3E6E9E", Icon: Landmark },
  { key: "Invertir", color: "#2D6A63", Icon: LineChart },
  { key: "Wishlist", color: "#D4A017", Icon: Gift },
  { key: "Otros", color: "#5B5E8C", Icon: PiggyBank },
];

const eur = (n) => new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(n || 0);
const fmtDate = (iso) => new Date(iso + "T00:00:00").toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" });
const isoDaysAgo = (n) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
};
const todayISO = () => new Date().toISOString().slice(0, 10);
const monthKey = (iso) => iso.slice(0, 7);
const monthLabel = (key) => {
  const [y, m] = key.split("-");
  const d = new Date(Number(y), Number(m) - 1, 1);
  const s = d.toLocaleDateString("es-ES", { month: "long", year: "numeric" });
  return s.charAt(0).toUpperCase() + s.slice(1);
};

function subcatsFor(categoria) {
  const a = CATEGORIES.ingreso[categoria] || [];
  const b = CATEGORIES.gasto[categoria] || [];
  return Array.from(new Set([...a, ...b]));
}

function exportarExcel(transacciones, nombreArchivo) {
  const filas = transacciones
    .slice()
    .sort((a, b) => a.fecha.localeCompare(b.fecha))
    .map((t) => ({
      Fecha: t.fecha,
      Tipo: t.tipo === "ingreso" ? "Ingreso" : "Gasto",
      Categoría: t.categoria,
      Subcategoría: t.subcategoria || "",
      Importe: Number(t.monto),
      Nota: t.nota || "",
    }));
  const hoja = XLSX.utils.json_to_sheet(filas);
  hoja["!cols"] = [{ wch: 12 }, { wch: 10 }, { wch: 16 }, { wch: 22 }, { wch: 10 }, { wch: 30 }];
  const libro = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(libro, hoja, "Movimientos");
  XLSX.writeFile(libro, nombreArchivo);
}

function Select({ value, onChange, options, placeholder }) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full appearance-none rounded-lg border border-[#D8D2C4] bg-white px-3 py-2.5 pr-9 text-[15px] text-[#1C2B33] focus:outline-none focus:ring-2 focus:ring-[#2D6A63]/40"
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
      <ChevronDown size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#6B7280]" />
    </div>
  );
}

function Chip({ active, onClick, children, color }) {
  return (
    <button
      onClick={onClick}
      className="rounded-full border px-3 py-1.5 text-[13px] transition-colors"
      style={{
        borderColor: active ? (color || "#2D6A63") : "#D8D2C4",
        background: active ? (color || "#2D6A63") : "white",
        color: active ? "white" : "#1C2B33",
        fontWeight: active ? 600 : 500,
      }}
    >
      {children}
    </button>
  );
}

function ReceiptEdge() {
  return (
    <div
      className="absolute left-0 right-0 top-0 h-2"
      style={{
        transform: "translateY(-1px)",
        backgroundImage: "radial-gradient(circle, #EEF1EC 5.5px, transparent 6px)",
        backgroundSize: "16px 16px",
        backgroundPosition: "top",
        backgroundRepeat: "repeat-x",
      }}
    />
  );
}

export default function App() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tab, setTab] = useState("resumen");

  const fetchTransactions = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("transactions")
      .select("*")
      .order("fecha", { ascending: false })
      .order("created_at", { ascending: false });
    if (error) setError(error.message);
    else { setTransactions(data); setError(null); }
    setLoading(false);
  }, []);

  useEffect(() => { fetchTransactions(); }, [fetchTransactions]);

  const addTransaction = async (tx) => {
    const { data, error } = await supabase.from("transactions").insert([tx]).select();
    if (error) { setError(error.message); return; }
    setTransactions((prev) => [...data, ...prev].sort((a, b) => b.fecha.localeCompare(a.fecha)));
  };

  const deleteTransaction = async (id) => {
    const prev = transactions;
    setTransactions((t) => t.filter((x) => x.id !== id)); // optimista
    const { error } = await supabase.from("transactions").delete().eq("id", id);
    if (error) { setError(error.message); setTransactions(prev); }
  };

  return (
    <div className="min-h-screen w-full pb-20 md:pb-10" style={{ background: "#EEF1EC" }}>
      <div className="mx-auto max-w-3xl px-4 pt-6 md:pt-10">
        <header className="mb-5 flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl text-[#1C2B33]" style={{ fontWeight: 600 }}>Mis cuentas</h1>
            <p className="text-xs text-[#8A8E86]">
              {loading ? "Cargando…" : `${transactions.length} movimientos`}
            </p>
          </div>
        </header>

        {error && (
          <div className="mb-4 rounded-lg border border-[#7A3B4E]/30 bg-[#7A3B4E]/10 px-3 py-2 text-xs text-[#7A3B4E]">
            {error}
          </div>
        )}

        <div className="mb-6 flex gap-1 rounded-lg bg-[#E4E1D6] p-1">
          {[["resumen", "Resumen"], ["anadir", "Añadir"], ["historial", "Historial"], ["ahorros", "Ahorros"]].map(([k, label]) => (
            <button
              key={k}
              onClick={() => setTab(k)}
              className="flex-1 rounded-md py-2 text-[13px] transition-colors"
              style={{
                background: tab === k ? "white" : "transparent",
                color: tab === k ? "#1C2B33" : "#8A8E86",
                fontWeight: tab === k ? 600 : 500,
                boxShadow: tab === k ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {loading ? (
          <p className="mt-10 text-center text-sm text-[#8A8E86]">Cargando tus movimientos…</p>
        ) : (
          <>
            {tab === "resumen" && <Resumen transactions={transactions} />}
            {tab === "anadir" && <Anadir onAdd={async (tx) => { await addTransaction(tx); setTab("historial"); }} />}
            {tab === "historial" && <Historial transactions={transactions} onDelete={deleteTransaction} />}
            {tab === "ahorros" && <Ahorros />}
          </>
        )}
      </div>
    </div>
  );
}

/* ---------- RESUMEN ---------- */
function Resumen({ transactions }) {
  const [rango, setRango] = useState("ultimos30"); // 'ultimos30' | 'ultimos90' | 'todo' | 'mesConcreto' | 'personalizado'
  const [vista, setVista] = useState("gasto"); // 'gasto' | 'ingreso' | 'ambos'
  const [mesElegido, setMesElegido] = useState(monthKey(todayISO()));
  const [desdeFiltro, setDesdeFiltro] = useState("");
  const [hastaFiltro, setHastaFiltro] = useState("");

  const mesesDisponibles = useMemo(() => {
    const set = new Set(transactions.map((t) => monthKey(t.fecha)));
    set.add(monthKey(todayISO()));
    return Array.from(set).sort().reverse();
  }, [transactions]);

  const filtradas = useMemo(() => {
    if (rango === "todo") return transactions;
    if (rango === "ultimos30" || rango === "ultimos90") {
      const desde = isoDaysAgo(rango === "ultimos30" ? 30 : 90);
      return transactions.filter((t) => t.fecha >= desde);
    }
    if (rango === "mesConcreto") {
      return transactions.filter((t) => monthKey(t.fecha) === mesElegido);
    }
    if (rango === "personalizado") {
      return transactions.filter((t) => (!desdeFiltro || t.fecha >= desdeFiltro) && (!hastaFiltro || t.fecha <= hastaFiltro));
    }
    return transactions;
  }, [transactions, rango, mesElegido, desdeFiltro, hastaFiltro]);

  const totals = useMemo(() => {
    const ingresos = filtradas.filter((t) => t.tipo === "ingreso").reduce((s, t) => s + Number(t.monto), 0);
    const gastos = filtradas.filter((t) => t.tipo === "gasto").reduce((s, t) => s + Number(t.monto), 0);
    return { ingresos, gastos, balance: ingresos - gastos };
  }, [filtradas]);

  const porCategoria = useMemo(() => {
    const map = {};
    const relevantes = vista === "ambos" ? filtradas : filtradas.filter((t) => t.tipo === vista);
    relevantes.forEach((t) => { map[t.categoria] = (map[t.categoria] || 0) + Number(t.monto); });
    return Object.entries(map).map(([categoria, total]) => ({ categoria, total })).sort((a, b) => b.total - a.total);
  }, [filtradas, vista]);

  const tituloRueda = vista === "gasto" ? "Gastos por categoría" : vista === "ingreso" ? "Ingresos por categoría" : "Ingresos y gastos por categoría";
  const subtituloRueda = vista === "gasto" ? "Distribución del total gastado en el periodo" : vista === "ingreso" ? "Distribución del total ingresado en el periodo" : "Todo el movimiento del periodo, categoría a categoría";
  const vacioTexto = vista === "gasto" ? "No hay gastos en este periodo." : vista === "ingreso" ? "No hay ingresos en este periodo." : "No hay movimientos en este periodo.";

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap gap-2">
        <Chip active={rango === "ultimos30"} onClick={() => setRango("ultimos30")}>Últimos 30 días</Chip>
        <Chip active={rango === "ultimos90"} onClick={() => setRango("ultimos90")}>Últimos 90 días</Chip>
        <Chip active={rango === "mesConcreto"} onClick={() => setRango("mesConcreto")}>Mes concreto</Chip>
        <Chip active={rango === "personalizado"} onClick={() => setRango("personalizado")}>Rango de fechas</Chip>
        <Chip active={rango === "todo"} onClick={() => setRango("todo")}>Todo</Chip>
      </div>

      {rango === "mesConcreto" && (
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative max-w-xs">
            <select
              value={mesElegido}
              onChange={(e) => setMesElegido(e.target.value)}
              className="w-full appearance-none rounded-lg border border-[#D8D2C4] bg-white px-3 py-2.5 pr-9 text-[15px] text-[#1C2B33] focus:outline-none focus:ring-2 focus:ring-[#2D6A63]/40"
            >
              {mesesDisponibles.map((k) => <option key={k} value={k}>{monthLabel(k)}</option>)}
            </select>
            <ChevronDown size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#6B7280]" />
          </div>
          <button
            onClick={() => exportarExcel(filtradas, `movimientos-${mesElegido}.xlsx`)}
            disabled={filtradas.length === 0}
            className="flex items-center gap-2 rounded-lg border border-[#D8D2C4] bg-white px-3 py-2.5 text-[14px] text-[#1C2B33] disabled:opacity-40"
          >
            <Download size={15} /> Exportar a Excel
          </button>
        </div>
      )}

      {rango === "personalizado" && (
        <div className="grid max-w-sm grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-xs text-[#8A8E86]">Desde</label>
            <input type="date" value={desdeFiltro} onChange={(e) => setDesdeFiltro(e.target.value)} className="w-full rounded-lg border border-[#D8D2C4] bg-white px-3 py-2 text-[14px] text-[#1C2B33] focus:outline-none focus:ring-2 focus:ring-[#2D6A63]/40" />
          </div>
          <div>
            <label className="mb-1 block text-xs text-[#8A8E86]">Hasta</label>
            <input type="date" value={hastaFiltro} onChange={(e) => setHastaFiltro(e.target.value)} className="w-full rounded-lg border border-[#D8D2C4] bg-white px-3 py-2 text-[14px] text-[#1C2B33] focus:outline-none focus:ring-2 focus:ring-[#2D6A63]/40" />
          </div>
        </div>
      )}

      <div className="grid grid-cols-3 gap-3">
        <Card label="Ingresos" value={totals.ingresos} color="#2D6A63" Icon={TrendingUp} />
        <Card label="Gastos" value={totals.gastos} color="#7A3B4E" Icon={TrendingDown} />
        <Card label="Balance" value={totals.balance} color={totals.balance >= 0 ? "#1C2B33" : "#7A3B4E"} Icon={Scale} />
      </div>

      <div className="relative rounded-xl bg-white p-5 pt-7 shadow-sm">
        <ReceiptEdge />
        <h2 className="font-display mb-1 text-[17px] text-[#1C2B33]" style={{ fontWeight: 600 }}>{tituloRueda}</h2>
        <p className="mb-3 text-xs text-[#8A8E86]">{subtituloRueda}</p>

        <div className="mb-4 flex gap-2">
          <Chip active={vista === "gasto"} onClick={() => setVista("gasto")} color="#7A3B4E">Gastos</Chip>
          <Chip active={vista === "ingreso"} onClick={() => setVista("ingreso")} color="#2D6A63">Ingresos</Chip>
          <Chip active={vista === "ambos"} onClick={() => setVista("ambos")} color="#1C2B33">Ambos (balance)</Chip>
        </div>

        {porCategoria.length === 0 ? (
          <p className="text-sm text-[#8A8E86]">{vacioTexto}</p>
        ) : (
          <div className="flex flex-col items-center gap-4 md:flex-row">
            <div style={{ width: "100%", maxWidth: 260, height: 260 }} className="shrink-0">
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={porCategoria} dataKey="total" nameKey="categoria" innerRadius={62} outerRadius={95} paddingAngle={2} strokeWidth={0}>
                    {porCategoria.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v) => eur(v)} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex w-full flex-col gap-2">
              {porCategoria.map((c, i) => (
                <div key={c.categoria} className="flex items-center justify-between text-[13px]">
                  <span className="flex items-center gap-2 text-[#1C2B33]">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ background: PALETTE[i % PALETTE.length] }} />
                    {c.categoria}
                  </span>
                  <span className="font-mono-amt text-[#1C2B33]">{eur(c.total)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Card({ label, value, color, Icon }) {
  return (
    <div className="relative overflow-hidden rounded-xl bg-white p-3 pt-5 shadow-sm md:p-4 md:pt-6">
      <ReceiptEdge />
      <Icon size={16} color={color} className="mb-2" />
      <div className="text-[11px] text-[#8A8E86]">{label}</div>
      <div className="font-mono-amt text-[14px] md:text-lg" style={{ color, fontWeight: 600 }}>{eur(value)}</div>
    </div>
  );
}

/* ---------- AÑADIR ---------- */
function Anadir({ onAdd }) {
  const [tipo, setTipo] = useState("gasto");
  const [monto, setMonto] = useState("");
  const [fecha, setFecha] = useState(new Date().toISOString().slice(0, 10));
  const [categoria, setCategoria] = useState("");
  const [subcategoria, setSubcategoria] = useState("");
  const [nota, setNota] = useState("");
  const [guardando, setGuardando] = useState(false);

  const cats = Object.keys(CATEGORIES[tipo]);
  const subcats = categoria ? CATEGORIES[tipo][categoria] : [];
  const canSubmit = monto && Number(monto) > 0 && fecha && categoria && !guardando;

  const pickCategoria = (c) => { setCategoria(c); setSubcategoria(""); };
  const switchTipo = (t) => { setTipo(t); setCategoria(""); setSubcategoria(""); };

  const submit = async () => {
    if (!canSubmit) return;
    setGuardando(true);
    await onAdd({ tipo, monto: Number(monto), fecha, categoria, subcategoria: subcategoria || null, nota: nota.trim() || null });
    setMonto(""); setNota(""); setCategoria(""); setSubcategoria("");
    setGuardando(false);
  };

  return (
    <div className="relative rounded-xl bg-white p-5 pt-7 shadow-sm">
      <ReceiptEdge />
      <div className="mb-5 flex rounded-lg bg-[#F2F0E8] p-1">
        {["gasto", "ingreso"].map((t) => (
          <button
            key={t}
            onClick={() => switchTipo(t)}
            className="flex-1 rounded-md py-2 text-sm transition-colors"
            style={{
              background: tipo === t ? "white" : "transparent",
              color: tipo === t ? (t === "ingreso" ? "#2D6A63" : "#7A3B4E") : "#8A8E86",
              fontWeight: tipo === t ? 600 : 500,
              boxShadow: tipo === t ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
            }}
          >
            {t === "ingreso" ? "Ingreso" : "Gasto"}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-4">
        <div>
          <label className="mb-1 block text-xs text-[#8A8E86]">Importe</label>
          <div className="relative">
            <span className="font-mono-amt absolute left-3 top-1/2 -translate-y-1/2 text-[#8A8E86]">€</span>
            <input
              type="number" inputMode="decimal" min="0" step="0.01" placeholder="0,00"
              value={monto} onChange={(e) => setMonto(e.target.value)}
              className="font-mono-amt w-full rounded-lg border border-[#D8D2C4] bg-white py-2.5 pl-8 pr-3 text-[16px] text-[#1C2B33] focus:outline-none focus:ring-2 focus:ring-[#2D6A63]/40"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-xs text-[#8A8E86]">Fecha</label>
            <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className="w-full rounded-lg border border-[#D8D2C4] bg-white px-3 py-2.5 text-[15px] text-[#1C2B33] focus:outline-none focus:ring-2 focus:ring-[#2D6A63]/40" />
          </div>
          <div>
            <label className="mb-1 block text-xs text-[#8A8E86]">Categoría</label>
            <Select value={categoria} onChange={pickCategoria} options={cats} placeholder="Elegir" />
          </div>
        </div>

        {subcats.length > 0 && (
          <div>
            <label className="mb-1 block text-xs text-[#8A8E86]">Subcategoría</label>
            <Select value={subcategoria} onChange={setSubcategoria} options={subcats} placeholder="Elegir" />
          </div>
        )}

        <div>
          <label className="mb-1 block text-xs text-[#8A8E86]">Nota (opcional)</label>
          <input type="text" placeholder="Ej: cena con amigos" value={nota} onChange={(e) => setNota(e.target.value)} className="w-full rounded-lg border border-[#D8D2C4] bg-white px-3 py-2.5 text-[15px] text-[#1C2B33] focus:outline-none focus:ring-2 focus:ring-[#2D6A63]/40" />
        </div>

        <button
          onClick={submit}
          disabled={!canSubmit}
          className="mt-1 flex items-center justify-center gap-2 rounded-lg py-3 text-[15px] font-semibold text-white transition-opacity disabled:opacity-40"
          style={{ background: tipo === "ingreso" ? "#2D6A63" : "#7A3B4E" }}
        >
          <PlusCircle size={18} /> {guardando ? "Guardando…" : `Guardar ${tipo === "ingreso" ? "ingreso" : "gasto"}`}
        </button>
      </div>
    </div>
  );
}

/* ---------- AHORROS ---------- */
function Ahorros() {
  const [ahorros, setAhorros] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editando, setEditando] = useState(null);
  const [valorEdit, setValorEdit] = useState("");

  const [destino, setDestino] = useState(DESTINOS[0].key);
  const [tipoMov, setTipoMov] = useState("aportar"); // 'aportar' | 'retirar'
  const [importe, setImporte] = useState("");
  const [nota, setNota] = useState("");
  const [guardando, setGuardando] = useState(false);

  const fetchAhorros = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.from("ahorros").select("*").order("fecha", { ascending: false }).order("created_at", { ascending: false });
    if (error) setError(error.message);
    else { setAhorros(data); setError(null); }
    setLoading(false);
  }, []);

  useEffect(() => { fetchAhorros(); }, [fetchAhorros]);

  const addAhorro = async (mov) => {
    const { data, error } = await supabase.from("ahorros").insert([mov]).select();
    if (error) { setError(error.message); return; }
    setAhorros((prev) => [...data, ...prev].sort((a, b) => b.fecha.localeCompare(a.fecha)));
  };

  const deleteAhorro = async (id) => {
    const prev = ahorros;
    setAhorros((a) => a.filter((x) => x.id !== id));
    const { error } = await supabase.from("ahorros").delete().eq("id", id);
    if (error) { setError(error.message); setAhorros(prev); }
  };

  const totales = useMemo(() => {
    const map = {};
    DESTINOS.forEach((d) => { map[d.key] = 0; });
    ahorros.forEach((a) => { map[a.destino] = (map[a.destino] || 0) + Number(a.monto); });
    return map;
  }, [ahorros]);

  const totalGeneral = useMemo(() => Object.values(totales).reduce((s, v) => s + v, 0), [totales]);

  const canSubmit = importe && Number(importe) > 0 && !guardando;

  const submitMovimiento = async () => {
    if (!canSubmit) return;
    setGuardando(true);
    const monto = tipoMov === "retirar" ? -Number(importe) : Number(importe);
    await addAhorro({ destino, monto, fecha: todayISO(), nota: nota.trim() || null });
    setImporte(""); setNota("");
    setGuardando(false);
  };

  const empezarEdicion = (d) => { setEditando(d); setValorEdit(String(totales[d].toFixed(2))); };
  const guardarEdicion = async (d) => {
    const nuevo = Number(valorEdit);
    if (Number.isNaN(nuevo)) { setEditando(null); return; }
    const delta = nuevo - totales[d];
    setEditando(null);
    if (delta === 0) return;
    await addAhorro({ destino: d, monto: delta, fecha: todayISO(), nota: "Ajuste manual" });
  };

  const grouped = useMemo(() => {
    const map = {};
    ahorros.forEach((a) => { (map[a.fecha] = map[a.fecha] || []).push(a); });
    return Object.entries(map).sort((a, b) => b[0].localeCompare(a[0]));
  }, [ahorros]);

  if (loading) return <p className="mt-10 text-center text-sm text-[#8A8E86]">Cargando tus ahorros…</p>;

  return (
    <div className="flex flex-col gap-5">
      {error && (
        <div className="rounded-lg border border-[#7A3B4E]/30 bg-[#7A3B4E]/10 px-3 py-2 text-xs text-[#7A3B4E]">{error}</div>
      )}

      <div className="relative overflow-hidden rounded-xl bg-white p-4 pt-6 shadow-sm">
        <ReceiptEdge />
        <div className="text-[11px] text-[#8A8E86]">Total ahorrado</div>
        <div className="font-mono-amt text-2xl text-[#1C2B33]" style={{ fontWeight: 600 }}>{eur(totalGeneral)}</div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {DESTINOS.map((d) => (
          <div key={d.key} className="relative overflow-hidden rounded-xl bg-white p-4 pt-6 shadow-sm">
            <ReceiptEdge />
            <div className="mb-2 flex items-center justify-between">
              <d.Icon size={18} color={d.color} />
              <button onClick={() => empezarEdicion(d.key)} className="text-[#C9C3B4] hover:text-[#1C2B33]">
                <Pencil size={14} />
              </button>
            </div>
            <div className="text-[12px] text-[#8A8E86]">{d.key}</div>
            {editando === d.key ? (
              <div className="mt-1 flex items-center gap-1">
                <input
                  type="number" step="0.01" autoFocus
                  value={valorEdit} onChange={(e) => setValorEdit(e.target.value)}
                  className="font-mono-amt w-full rounded-md border border-[#D8D2C4] px-2 py-1 text-[15px] text-[#1C2B33] focus:outline-none focus:ring-2 focus:ring-[#2D6A63]/40"
                />
                <button onClick={() => guardarEdicion(d.key)} className="shrink-0 rounded-md p-1.5" style={{ background: d.color }}>
                  <Check size={14} color="white" />
                </button>
              </div>
            ) : (
              <div className="font-mono-amt text-lg" style={{ color: d.color, fontWeight: 600 }}>{eur(totales[d.key])}</div>
            )}
          </div>
        ))}
      </div>

      <div className="relative rounded-xl bg-white p-5 pt-7 shadow-sm">
        <ReceiptEdge />
        <h2 className="font-display mb-4 text-[17px] text-[#1C2B33]" style={{ fontWeight: 600 }}>Mover ahorro</h2>

        <div className="mb-4 flex rounded-lg bg-[#F2F0E8] p-1">
          {["aportar", "retirar"].map((t) => (
            <button
              key={t}
              onClick={() => setTipoMov(t)}
              className="flex-1 rounded-md py-2 text-sm transition-colors"
              style={{
                background: tipoMov === t ? "white" : "transparent",
                color: tipoMov === t ? (t === "aportar" ? "#2D6A63" : "#7A3B4E") : "#8A8E86",
                fontWeight: tipoMov === t ? 600 : 500,
                boxShadow: tipoMov === t ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
              }}
            >
              {t === "aportar" ? "Aportar" : "Retirar"}
            </button>
          ))}
        </div>

        <div className="flex flex-col gap-4">
          <div>
            <label className="mb-1 block text-xs text-[#8A8E86]">Destino</label>
            <Select value={destino} onChange={setDestino} options={DESTINOS.map((d) => d.key)} />
          </div>

          <div>
            <label className="mb-1 block text-xs text-[#8A8E86]">Importe</label>
            <div className="relative">
              <span className="font-mono-amt absolute left-3 top-1/2 -translate-y-1/2 text-[#8A8E86]">€</span>
              <input
                type="number" inputMode="decimal" min="0" step="0.01" placeholder="0,00"
                value={importe} onChange={(e) => setImporte(e.target.value)}
                className="font-mono-amt w-full rounded-lg border border-[#D8D2C4] bg-white py-2.5 pl-8 pr-3 text-[16px] text-[#1C2B33] focus:outline-none focus:ring-2 focus:ring-[#2D6A63]/40"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs text-[#8A8E86]">Nota (opcional)</label>
            <input type="text" placeholder="Ej: ahorro de julio" value={nota} onChange={(e) => setNota(e.target.value)} className="w-full rounded-lg border border-[#D8D2C4] bg-white px-3 py-2.5 text-[15px] text-[#1C2B33] focus:outline-none focus:ring-2 focus:ring-[#2D6A63]/40" />
          </div>

          <button
            onClick={submitMovimiento}
            disabled={!canSubmit}
            className="mt-1 flex items-center justify-center gap-2 rounded-lg py-3 text-[15px] font-semibold text-white transition-opacity disabled:opacity-40"
            style={{ background: tipoMov === "aportar" ? "#2D6A63" : "#7A3B4E" }}
          >
            {tipoMov === "aportar" ? <PlusCircle size={18} /> : <Minus size={18} />}
            {guardando ? "Guardando…" : tipoMov === "aportar" ? "Aportar" : "Retirar"}
          </button>
        </div>
      </div>

      {grouped.length > 0 && (
        <div className="flex flex-col gap-6">
          {grouped.map(([fecha, items]) => (
            <div key={fecha}>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#8A8E86]">{fmtDate(fecha)}</h3>
              <div className="overflow-hidden rounded-xl bg-white shadow-sm">
                {items.map((a, i) => (
                  <div key={a.id} className={`flex items-center justify-between gap-3 px-4 py-3 ${i !== items.length - 1 ? "border-b border-dashed border-[#D8D2C4]" : ""}`}>
                    <div className="min-w-0">
                      <div className="truncate text-[14px] text-[#1C2B33]">{a.destino}</div>
                      {a.nota && <div className="truncate text-xs text-[#8A8E86]">{a.nota}</div>}
                    </div>
                    <div className="flex shrink-0 items-center gap-3">
                      <span className="font-mono-amt text-[15px]" style={{ color: a.monto >= 0 ? "#2D6A63" : "#7A3B4E", fontWeight: 600 }}>
                        {a.monto >= 0 ? "+" : ""}{eur(a.monto)}
                      </span>
                      <button onClick={() => deleteAhorro(a.id)} className="text-[#C9C3B4] hover:text-[#7A3B4E]"><Trash2 size={16} /></button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
function Historial({ transactions, onDelete }) {
  const [showFilters, setShowFilters] = useState(false);
  const [tipoFiltro, setTipoFiltro] = useState("todos");
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const [catsSel, setCatsSel] = useState([]);
  const [subcatsSel, setSubcatsSel] = useState([]);

  const categoriasDisponibles = useMemo(() => {
    return tipoFiltro === "todos"
      ? Array.from(new Set([...Object.keys(CATEGORIES.ingreso), ...Object.keys(CATEGORIES.gasto)]))
      : Object.keys(CATEGORIES[tipoFiltro]);
  }, [tipoFiltro]);

  const subcategoriasDisponibles = useMemo(() => {
    const base = catsSel.length > 0 ? catsSel : categoriasDisponibles;
    return Array.from(new Set(base.flatMap((c) => subcatsFor(c))));
  }, [catsSel, categoriasDisponibles]);

  const toggle = (arr, setArr, val) => setArr(arr.includes(val) ? arr.filter((v) => v !== val) : [...arr, val]);
  const cambiarTipo = (t) => { setTipoFiltro(t); setCatsSel([]); setSubcatsSel([]); };
  const limpiarFiltros = () => { setTipoFiltro("todos"); setDesde(""); setHasta(""); setCatsSel([]); setSubcatsSel([]); };

  const filtradas = useMemo(() => {
    return transactions.filter((t) =>
      (tipoFiltro === "todos" || t.tipo === tipoFiltro) &&
      (!desde || t.fecha >= desde) &&
      (!hasta || t.fecha <= hasta) &&
      (catsSel.length === 0 || catsSel.includes(t.categoria)) &&
      (subcatsSel.length === 0 || (t.subcategoria && subcatsSel.includes(t.subcategoria)))
    );
  }, [transactions, tipoFiltro, desde, hasta, catsSel, subcatsSel]);

  const grouped = useMemo(() => {
    const map = {};
    filtradas.forEach((t) => { (map[t.fecha] = map[t.fecha] || []).push(t); });
    return Object.entries(map).sort((a, b) => b[0].localeCompare(a[0]));
  }, [filtradas]);

  const activeFilterCount = (tipoFiltro !== "todos" ? 1 : 0) + (desde ? 1 : 0) + (hasta ? 1 : 0) + catsSel.length + subcatsSel.length;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <button onClick={() => setShowFilters((v) => !v)} className="flex items-center gap-2 rounded-lg border border-[#D8D2C4] bg-white px-3 py-2 text-[13px] text-[#1C2B33]">
          <SlidersHorizontal size={15} />
          Filtros {activeFilterCount > 0 && <span className="rounded-full bg-[#2D6A63] px-1.5 text-[11px] text-white">{activeFilterCount}</span>}
        </button>
        <span className="text-xs text-[#8A8E86]">{filtradas.length} resultado{filtradas.length !== 1 ? "s" : ""}</span>
      </div>

      {showFilters && (
        <div className="relative rounded-xl bg-white p-4 pt-6 shadow-sm">
          <ReceiptEdge />
          <div className="flex items-center justify-between">
            <h3 className="font-display text-[15px] text-[#1C2B33]" style={{ fontWeight: 600 }}>Filtros avanzados</h3>
            <button onClick={limpiarFiltros} className="flex items-center gap-1 text-xs text-[#7A3B4E]"><X size={13} /> Limpiar</button>
          </div>
          <div className="mt-3 flex flex-col gap-4">
            <div className="flex gap-2">
              <Chip active={tipoFiltro === "todos"} onClick={() => cambiarTipo("todos")}>Todos</Chip>
              <Chip active={tipoFiltro === "ingreso"} onClick={() => cambiarTipo("ingreso")} color="#2D6A63">Ingresos</Chip>
              <Chip active={tipoFiltro === "gasto"} onClick={() => cambiarTipo("gasto")} color="#7A3B4E">Gastos</Chip>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs text-[#8A8E86]">Desde</label>
                <input type="date" value={desde} onChange={(e) => setDesde(e.target.value)} className="w-full rounded-lg border border-[#D8D2C4] px-3 py-2 text-[14px] text-[#1C2B33] focus:outline-none focus:ring-2 focus:ring-[#2D6A63]/40" />
              </div>
              <div>
                <label className="mb-1 block text-xs text-[#8A8E86]">Hasta</label>
                <input type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} className="w-full rounded-lg border border-[#D8D2C4] px-3 py-2 text-[14px] text-[#1C2B33] focus:outline-none focus:ring-2 focus:ring-[#2D6A63]/40" />
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-xs text-[#8A8E86]">Categorías</label>
              <div className="flex flex-wrap gap-2">
                {categoriasDisponibles.map((c) => <Chip key={c} active={catsSel.includes(c)} onClick={() => toggle(catsSel, setCatsSel, c)}>{c}</Chip>)}
              </div>
            </div>
            {subcategoriasDisponibles.length > 0 && (
              <div>
                <label className="mb-1.5 block text-xs text-[#8A8E86]">Subcategorías</label>
                <div className="flex flex-wrap gap-2">
                  {subcategoriasDisponibles.map((s) => <Chip key={s} active={subcatsSel.includes(s)} onClick={() => toggle(subcatsSel, setSubcatsSel, s)}>{s}</Chip>)}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {grouped.length === 0 ? (
        <p className="mt-6 text-center text-sm text-[#8A8E86]">Ningún movimiento coincide con estos filtros.</p>
      ) : (
        <div className="flex flex-col gap-6">
          {grouped.map(([fecha, items]) => (
            <div key={fecha}>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#8A8E86]">{fmtDate(fecha)}</h3>
              <div className="overflow-hidden rounded-xl bg-white shadow-sm">
                {items.map((t, i) => (
                  <div key={t.id} className={`flex items-center justify-between gap-3 px-4 py-3 ${i !== items.length - 1 ? "border-b border-dashed border-[#D8D2C4]" : ""}`}>
                    <div className="min-w-0">
                      <div className="truncate text-[14px] text-[#1C2B33]">{t.categoria}{t.subcategoria ? ` · ${t.subcategoria}` : ""}</div>
                      {t.nota && <div className="truncate text-xs text-[#8A8E86]">{t.nota}</div>}
                    </div>
                    <div className="flex shrink-0 items-center gap-3">
                      <span className="font-mono-amt text-[15px]" style={{ color: t.tipo === "ingreso" ? "#2D6A63" : "#7A3B4E", fontWeight: 600 }}>
                        {t.tipo === "ingreso" ? "+" : "−"}{eur(t.monto)}
                      </span>
                      <button onClick={() => onDelete(t.id)} className="text-[#C9C3B4] hover:text-[#7A3B4E]"><Trash2 size={16} /></button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
