# 🎨 Identidade Visual — TimesPro

Este documento detalha o sistema de design e a identidade visual da plataforma **TimesPro**, garantindo consistência visual em todas as telas e versões (Admin e App).

---

## ⚡ Estética Geral
A estética do TimesPro é **"Premium Sports Dark"**. 
Inspirada em interfaces de alta performance e tecnologia esportiva, utiliza um contraste forte entre o fundo preto profundo e um verde limão neon vibrante.

- **Atmosfera:** Profissional, dinâmica, tecnológica e exclusiva.
- **Elementos Chave:** Gradientes sutis, glassmorphism (transparências), bordas arredondadas generosas e tipografia agressiva/itálica para títulos.

---

## 🎨 Paleta de Cores

### Cores Principais
| Cor | HEX | Uso | Tailwind |
| :--- | :--- | :--- | :--- |
| **Primary** | `#a3e635` | Ação principal, botões, ícones ativos | `bg-primary` |
| **Primary Dark** | `#84cc16` | Hovers e estados de pressionado | `bg-lime-600` |
| **Background** | `#09090b` | Fundo principal da aplicação | `bg-zinc-950` |
| **Surface (Card)** | `#121214` | Cards, modais e superfícies | `bg-zinc-900` |
| **Border** | `rgba(255,255,255,0.06)` | Divisores e bordas de cards | `border-white/5` |

### Cores de Texto
- **Principal:** `#FFFFFF` (Branco puro para leitura máxima)
- **Muted:** `#a1a1aa` (Zinc-400 para legendas e textos secundários)
- **Subtle:** `#52525b` (Zinc-600 para IDs e textos muito pequenos)

---

## 🔤 Tipografia

### Fontes
- **Display/Títulos:** `Barlow Condensed` (ou `Plus Jakarta Sans` como fallback)
  - Estilo: `font-black italic uppercase tracking-tighter`
  - Objetivo: Transmitir velocidade e impacto esportivo.
- **Corpo:** `Inter`
  - Estilo: `font-medium` ou `font-bold`
  - Objetivo: Legibilidade clara para dados administrativos.

### Escala de Tamanhos
- **H1 (Páginas):** `text-xl` ou `text-2xl` (Black Italic Uppercase)
- **Subtítulos:** `text-[9px]` ou `text-[10px]` (Bold Uppercase Tracking-widest)
- **Corpo de Texto:** `text-xs` (12px) ou `text-sm` (14px)
- **Labels de Input:** `text-[9px]` ou `text-[10px]` (Black Uppercase)

---

## 🖼️ Iconografia
Utilizamos a biblioteca **Lucide React** com `strokeWidth={2}` ou `{3}` para ícones de ação.

### Galeria de Ícones Principais
| Ícone | Nome Lucide | Contexto de Uso |
| :---: | :--- | :--- |
| ⚽ | `Users` / `Users2` | Gestão de Atletas / Equipe |
| 🎟️ | `Ticket` | Bilheteria |
| 💰 | `Wallet` / `DollarSign` | Financeiro / Carteira Digital |
| 📅 | `Calendar` | Agenda de Jogos e Treinos |
| ❤️ | `Heart` | Vaquinhas / Campanhas |
| 👤 | `UserCircle` | Perfil de Usuário |
| ➕ | `Plus` | Criar novo registro |
| 🔍 | `Search` | Busca e filtros |
| ✅ | `CheckCircle2` | Status concluído / Pago |
| ⚠️ | `AlertCircle` | Avisos e pendências |
| 📈 | `TrendingUp` | Resultados e métricas |

---

## 💠 Componentes e Estilos

### Botões (Buttons)
- **Primário:** `bg-primary text-black rounded-xl px-5 py-2.5 text-[10px] font-black uppercase shadow-lg shadow-primary/20`
- **Secundário:** `bg-white/5 text-white border border-white/5 rounded-xl px-4 py-2 hover:bg-white/10`
- **Ghost:** `text-zinc-500 hover:text-white transition-colors`

### Cards
- **Padrão:** `bg-zinc-900/50 backdrop-blur-md border border-white/5 rounded-[32px] p-6`
- **Hover State:** `hover:border-primary/30 hover:scale-[1.01] transition-all`

### Inputs
- **Base:** `bg-zinc-800/50 border border-white/5 rounded-xl px-4 py-3 text-xs font-bold focus:border-primary outline-none transition-all`

---

## 📏 Espaçamento e Bordas
- **Radius:** `rounded-[32px]` ou `rounded-[40px]` para containers grandes; `rounded-xl` (12px) para botões e inputs.
- **Spacing:** Uso intensivo de `gap-4` (16px) e `p-6` (24px).
- **Safe Area:** Em mobile, garantir `pb-safe` no bottom navigation.

---

## 📱 Especificações Mobile (App)
- **Bottom Nav:** Fixo no rodapé com `backdrop-blur-xl`.
- **Interação:** Tap targets de no mínimo `44x44px`.
- **Transições:** `animate-in fade-in slide-in-from-bottom-4 duration-300`.
