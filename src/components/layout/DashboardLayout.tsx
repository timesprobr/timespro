import React, { useState } from 'react';
import { 
  Trophy, 
  Users, 
  Calendar, 
  DollarSign, 
  Package, 
  LayoutDashboard, 
  FileText, 
  ShieldCheck, 
  UserCircle, 
  Menu, 
  X, 
  LogOut,
  Globe,
  Sun,
  Moon,
  Wallet,
  ChevronLeft,
  ChevronRight,
  Heart,
  CreditCard,
  Ticket
} from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '../../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { useOrg } from '../../context/OrgContext';
import { useTheme } from '../../context/ThemeContext';

interface SidebarItemProps {
  icon: React.ElementType;
  label: string;
  href: string;
  active: boolean;
  collapsed?: boolean;
  onClick?: () => void;
  key?: React.Key;
}

const SidebarItem = ({ icon: Icon, label, href, active, collapsed, onClick }: SidebarItemProps) => {
  return (
    <Link
      to={href}
      onClick={onClick}
      title={collapsed ? label : ''}
      className={cn(
        "flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200 group relative text-[13px] font-medium",
        collapsed ? "justify-center px-1" : "px-3",
        active 
          ? "bg-primary text-black shadow-lg shadow-primary/20" 
          : "text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface-soft)]"
      )}
    >
      <Icon 
        size={18} 
        strokeWidth={active ? 2.5 : 2}
        className={cn(
          "transition-all duration-200", 
          active ? "text-black" : "text-[var(--text-muted)] group-hover:text-[var(--text)]"
        )} 
      />
      {!collapsed && (
        <span className="truncate">
          {label}
        </span>
      )}
    </Link>
  );
};


export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const location = useLocation();
  const { organization } = useOrg();
  const { theme, toggleTheme } = useTheme();

  const menuItems = [
    { icon: LayoutDashboard, label: 'Dashboard', href: '/painel' },
    { icon: Users, label: 'Atletas', href: '/atletas' },
    { icon: UserCircle, label: 'Equipe', href: '/equipe' },
    { icon: Calendar, label: 'Agenda', href: '/jogos' },
    { icon: DollarSign, label: 'Financeiro', href: '/financeiro' },
    { icon: Heart, label: 'Vaquinhas', href: '/vaquinhas' },
    { icon: CreditCard, label: 'Mensalidades', href: '/mensalidades' },
    {icon: Package, label: 'Materiais', href: '/estoque' },
    { icon: ShieldCheck, label: 'Sócio Torcedor', href: '/socios' },
    { icon: Ticket, label: 'Bilheteria', href: '/bilheteria' },
    { icon: Trophy, label: 'Meu Time', href: '/meu-time' },
    { icon: FileText, label: 'Documentos', href: '/documentos' },
    { icon: Users, label: 'Usuários', href: '/usuarios' },
  ];

  return (
    <div className="min-h-screen font-sans transition-colors duration-300 bg-[var(--bg)] text-[var(--text)]">
      {/* Mobile Header */}
      <header className="lg:hidden flex items-center justify-between p-3 border-b sticky top-0 z-50 backdrop-blur-md bg-[var(--surface)]/80 border-[var(--border)]">
        <div className="flex items-center gap-2">
          {organization?.logo_url ? (
            <img src={organization.logo_url} className="w-8 h-8 object-contain" alt="Logo" />
          ) : (
            <div className="w-8 h-8 rounded-lg bg-[#a3e635] flex items-center justify-center">
              <Trophy size={16} className="text-black" strokeWidth={2.5} />
            </div>
          )}
          <span className="font-bold tracking-tight text-xs text-[var(--text)] truncate max-w-[120px]">
            {organization?.name && organization.name.length > 12
              ? organization.name.split(' ')[0]
              : (organization?.name || 'TimesPro')}
          </span>
        </div>
        <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 text-[var(--text-muted)]">
          {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </header>

      <div className="flex h-screen overflow-hidden">
        {/* Sidebar */}
        <aside className={cn(
          "fixed inset-y-0 left-0 z-40 transform transition-all duration-300 lg:translate-x-0 lg:static lg:inset-auto",
          "bg-[var(--surface)] border-r border-[var(--border)]",
          isSidebarOpen ? "translate-x-0" : "-translate-x-full",
          isCollapsed ? "w-20" : "w-60"
        )}>
          <div className="h-full flex flex-col pt-5 pb-2">
            {/* Logo Section */}
            <div className={cn(
              "flex items-center mb-8 px-4",
              isCollapsed ? "justify-center px-0" : "justify-between"
            )}>
              <div className="flex items-center gap-2.5 overflow-hidden">
                <div className="w-9 h-9 rounded-xl bg-[#a3e635] flex items-center justify-center shadow-sm shrink-0 overflow-hidden">
                  {organization?.logo_url ? (
                    <img src={organization.logo_url} className="w-full h-full object-contain p-1" alt="Logo" />
                  ) : (
                    <Trophy size={18} className="text-black" strokeWidth={2.5} />
                  )}
                </div>
                {!isCollapsed && (
                  <div className="min-w-0 flex flex-col">
                    <span className="font-bold tracking-tight text-[13px] block leading-tight truncate text-[var(--text)]">
                      {organization?.name && organization.name.length > 15 
                        ? organization.name.split(' ')[0] + ' ' + (organization.name.split(' ')[1] || '')
                        : (organization?.name || 'TimesPro')}
                    </span>
                    <span className="text-[9px] font-black uppercase tracking-[0.2em] text-primary/70 leading-none mt-0.5">
                      Dashboard
                    </span>
                  </div>
                )}
              </div>
              
              <button 
                onClick={() => setIsCollapsed(!isCollapsed)}
                className="hidden lg:flex p-1 rounded-lg hover:bg-[var(--surface-soft)] text-[var(--text-muted)] transition-all"
              >
                {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
              </button>
            </div>

            {/* Menu */}
            <nav className="flex-1 space-y-0.5 px-2 overflow-y-auto no-scrollbar">
              {menuItems.map((item) => (
                <SidebarItem 
                  key={item.href} 
                  icon={item.icon}
                  label={item.label}
                  href={item.href}
                  collapsed={isCollapsed}
                  active={location.pathname === item.href}
                  onClick={() => setIsSidebarOpen(false)}
                />
              ))}
            </nav>

            {/* Wallet Section - Minimalist */}
            {!isCollapsed && (
              <div className="px-3 py-4">
                <Link to="/carteira" className={cn(
                  "flex items-center gap-3 p-3 rounded-xl border transition-all relative overflow-hidden",
                  "bg-[var(--surface-soft)] border-[var(--border)] hover:bg-[var(--surface-strong)]"
                )}>
                  <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 blur-[100px] -mr-32 -mt-32" />
                  <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-black">
                    <Wallet size={16} />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest leading-none mb-1">Carteira</p>
                    <p className="text-xs font-bold text-[var(--text)]">Saldo Ativo</p>
                  </div>
                </Link>
              </div>
            )}
          </div>
        </aside>

        {/* Overlay for mobile */}
        <AnimatePresence>
          {isSidebarOpen && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSidebarOpen(false)}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-30 lg:hidden"
            />
          )}
        </AnimatePresence>

        {/* Main Content */}
        <main className="flex-1 flex flex-col h-screen overflow-hidden">
          {/* Header Desktop */}
          <header className="hidden lg:flex h-14 border-b items-center justify-between px-8 sticky top-0 z-30 transition-colors duration-300 bg-[var(--surface)]/80 backdrop-blur-xl border-[var(--border)]">
            <div className="flex items-center gap-2 text-xs font-medium text-[var(--text-muted)]">
              <span>{menuItems.find(m => m.href === location.pathname)?.label || 'Dashboard'}</span>
            </div>

            {/* Central Branding */}
            <div className="absolute left-1/2 -translate-x-1/2 hidden md:flex flex-col items-center pointer-events-none">
              <div className="flex items-center gap-1.5">
                <div className="w-1 h-1 bg-primary rounded-full animate-pulse" />
                <span className="text-[7px] font-black uppercase tracking-[0.4em] text-primary/80 leading-none">Gestão Profissional</span>
                <div className="w-1 h-1 bg-primary rounded-full animate-pulse" />
              </div>
              <span className="text-[11px] font-black uppercase italic tracking-tighter mt-0.5 text-[var(--text)]">
                {organization?.name || 'TimesPro'}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <button 
                onClick={toggleTheme}
                className="p-2 rounded-lg hover:bg-[var(--surface-soft)] text-[var(--text-muted)] transition-all flex items-center justify-center"
                title={theme === 'light' ? 'Modo Escuro' : 'Modo Claro'}
              >
                {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
              </button>
              <div className="h-4 w-px bg-[var(--border)] mx-1" />

              <button className="flex items-center gap-2 px-2 py-1 rounded-lg hover:bg-[var(--surface-soft)] transition-all group">
                <div className="w-7 h-7 rounded-full bg-[var(--surface-strong)] flex items-center justify-center text-[var(--text-muted)]">
                  <UserCircle size={18} />
                </div>
                <span className="text-xs font-semibold text-[var(--text-muted)]">Admin</span>
              </button>
            </div>
          </header>

          {/* Content Area */}
          <div className="flex-1 overflow-y-auto p-4 lg:p-8 custom-scrollbar">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="max-w-7xl mx-auto"
            >
              {children}
            </motion.div>
          </div>
        </main>
      </div>
    </div>
  );
}
