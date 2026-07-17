import { useState } from "react";
import { Lock } from "lucide-react";

const PIN_CORRECTO = "1973";
const CLAVE_STORAGE = "presupuesto_desbloqueado";

export default function PinGate({ children }) {
  const [desbloqueado, setDesbloqueado] = useState(() => localStorage.getItem(CLAVE_STORAGE) === "true");
  const [pin, setPin] = useState("");
  const [error, setError] = useState(false);

  if (desbloqueado) {
    return (
      <div className="relative">
        {children}
        <button
          onClick={() => { localStorage.removeItem(CLAVE_STORAGE); setDesbloqueado(false); setPin(""); }}
          className="fixed bottom-24 right-4 z-20 flex items-center gap-1.5 rounded-full bg-white px-3 py-2 text-xs text-[#8A8E86] shadow-md md:bottom-4"
        >
          <Lock size={13} /> Bloquear
        </button>
      </div>
    );
  }

  const intentar = () => {
    if (pin === PIN_CORRECTO) {
      localStorage.setItem(CLAVE_STORAGE, "true");
      setDesbloqueado(true);
      setError(false);
    } else {
      setError(true);
      setPin("");
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-4" style={{ background: "#EEF1EC" }}>
      <div className="relative w-full max-w-xs rounded-xl bg-white p-6 pt-8 shadow-sm">
        <div className="mb-5 flex flex-col items-center gap-2">
          <Lock size={22} color="#1C2B33" />
          <h1 className="font-display text-lg text-[#1C2B33]" style={{ fontWeight: 600 }}>Introduce tu PIN</h1>
        </div>
        <input
          type="password"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={8}
          autoFocus
          value={pin}
          onChange={(e) => { setPin(e.target.value.replace(/\D/g, "")); setError(false); }}
          onKeyDown={(e) => { if (e.key === "Enter") intentar(); }}
          placeholder="••••"
          className="font-mono-amt mb-3 w-full rounded-lg border border-[#D8D2C4] bg-white px-3 py-2.5 text-center text-[20px] tracking-[6px] text-[#1C2B33] focus:outline-none focus:ring-2 focus:ring-[#2D6A63]/40"
        />
        {error && <p className="mb-2 text-center text-xs text-[#7A3B4E]">PIN incorrecto, inténtalo de nuevo.</p>}
        <button
          onClick={intentar}
          disabled={!pin}
          className="w-full rounded-lg py-3 text-[15px] font-semibold text-white transition-opacity disabled:opacity-40"
          style={{ background: "#2D6A63" }}
        >
          Entrar
        </button>
      </div>
    </div>
  );
}
