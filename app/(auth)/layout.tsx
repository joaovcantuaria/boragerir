import Image from "next/image"

export const dynamic = "force-dynamic"

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background flex">
      {/* Painel esquerdo — branding desktop */}
      <div className="hidden lg:flex flex-col justify-between w-[45%] bg-[#1A1A1A] p-12 relative overflow-hidden">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-32 -right-32 w-80 h-80 bg-primary/20 rounded-full blur-3xl" />
          <div className="absolute -bottom-32 -left-32 w-80 h-80 bg-primary/10 rounded-full blur-3xl" />
        </div>

        {/* Logo — versão branca para fundo escuro */}
        <div className="relative">
          <LogoBranca />
        </div>

        {/* Headline */}
        <div className="relative space-y-6">
          <h1 className="text-5xl font-black text-white leading-tight">
            Gestão simples.<br />
            <span className="text-primary">Resultado</span> de verdade.
          </h1>
          <p className="text-gray-400 text-lg leading-relaxed">
            Controle seu negócio de qualquer lugar — caixa, clientes, agendamentos e financeiro num só lugar.
          </p>
          <div className="grid grid-cols-1 gap-3 mt-6">
            {[
              { emoji: "💰", text: "Controle de caixa em tempo real" },
              { emoji: "📅", text: "Agenda integrada com clientes" },
              { emoji: "📊", text: "Relatórios financeiros completos" },
              { emoji: "📱", text: "Funciona no celular como app" },
            ].map((f) => (
              <div key={f.text} className="flex items-center gap-3 text-gray-300 text-sm">
                <span className="text-base">{f.emoji}</span>
                <span>{f.text}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="relative text-gray-600 text-xs">
          © {new Date().getFullYear()} Bora Gerir. Todos os direitos reservados.
        </div>
      </div>

      {/* Painel direito — formulário */}
      <div className="flex-1 flex items-center justify-center p-6 bg-background">
        <div className="w-full max-w-md">
          {/* Logo mobile — versão padrão (fundo claro) */}
          <div className="flex justify-center mb-8 lg:hidden">
            <div className="relative h-11" style={{ width: "160px" }}>
              <Image
                src="/logo-full.png"
                alt="Bora Gerir"
                fill
                className="object-contain object-left"
                priority
              />
            </div>
          </div>
          {children}
        </div>
      </div>
    </div>
  )
}

// ── Logo branca para o painel escuro ─────────────────────────
// v2 — usa logo-full-branca.png
function LogoBranca() {
  return (
    <div className="relative" style={{ width: 340, height: 78 }}>
      <Image
        src="/logo-full-branca.png"
        alt="BoraGerir"
        fill
        className="object-contain object-left"
        priority
      />
    </div>
  )
}
