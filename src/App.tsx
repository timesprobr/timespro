import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { OrgProvider } from './context/OrgContext';
import ProtectedRoute from './components/auth/ProtectedRoute';
import DashboardLayout from './components/layout/DashboardLayout';
import Dashboard from './pages/Painel';
import Athletes from './pages/Atletas';
import Finance from './pages/Financeiro';
import Usuarios from './pages/Usuarios';
import Members from './pages/Socios';
import Matches from './pages/Jogos';
import Login from './pages/Login';
import RegisterTeam from './pages/RegistroTime';
import MyTeam from './pages/MeuTime';
import AthleteProfile from './pages/PerfilAtleta';
import Vaquinhas from './pages/Vaquinhas';
import Mensalidades from './pages/Mensalidades';
import Carteira from './pages/Carteira';
import VaquinhaPublica from './pages/VaquinhaPublica';
import Equipe from './pages/Equipe';
import Materiais from './pages/Materiais';
import Documentos from './pages/Documentos';
import Bilheteria from './pages/Bilheteria';
import CompraIngresso from './pages/CompraIngresso';
import PublicPerformance from './pages/PublicPerformance';


import { ThemeProvider } from './context/ThemeContext';

import Checkout from './pages/Checkout';

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <OrgProvider>
        <Router>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/doar/:id" element={<VaquinhaPublica />} />
              <Route path="/performance/:id" element={<PublicPerformance />} />
              <Route path="/checkout/:id" element={<Checkout />} />

              
              {/* Rotas Privadas */}
              <Route path="/register-team" element={<Navigate to="/registrar-clube" replace />} />
              <Route path="/registrar-clube" element={<ProtectedRoute><RegisterTeam /></ProtectedRoute>} />
              <Route path="/" element={<ProtectedRoute><DashboardLayout><Dashboard /></DashboardLayout></ProtectedRoute>} />
              <Route path="/painel" element={<ProtectedRoute><DashboardLayout><Dashboard /></DashboardLayout></ProtectedRoute>} />
              <Route path="/atletas" element={<ProtectedRoute><DashboardLayout><Athletes /></DashboardLayout></ProtectedRoute>} />
              <Route path="/atletas/:id" element={<ProtectedRoute><DashboardLayout><AthleteProfile /></DashboardLayout></ProtectedRoute>} />
              <Route path="/equipe" element={<ProtectedRoute><DashboardLayout><Equipe /></DashboardLayout></ProtectedRoute>} />
              <Route path="/jogos" element={<ProtectedRoute><DashboardLayout><Matches /></DashboardLayout></ProtectedRoute>} />
              <Route path="/financeiro" element={<ProtectedRoute><DashboardLayout><Finance /></DashboardLayout></ProtectedRoute>} />
              <Route path="/vaquinhas" element={<ProtectedRoute><DashboardLayout><Vaquinhas /></DashboardLayout></ProtectedRoute>} />
              <Route path="/mensalidades" element={<ProtectedRoute><DashboardLayout><Mensalidades /></DashboardLayout></ProtectedRoute>} />
              <Route path="/carteira" element={<ProtectedRoute><DashboardLayout><Carteira /></DashboardLayout></ProtectedRoute>} />
              <Route path="/estoque" element={<ProtectedRoute><DashboardLayout><Materiais /></DashboardLayout></ProtectedRoute>} />
              <Route path="/socios" element={<ProtectedRoute><DashboardLayout><Members /></DashboardLayout></ProtectedRoute>} />
              <Route path="/meu-time" element={<ProtectedRoute><DashboardLayout><MyTeam /></DashboardLayout></ProtectedRoute>} />
              <Route path="/usuarios" element={<ProtectedRoute><DashboardLayout><Usuarios /></DashboardLayout></ProtectedRoute>} />
              <Route path="/documentos" element={<ProtectedRoute><DashboardLayout><Documentos /></DashboardLayout></ProtectedRoute>} />
              <Route path="/bilheteria" element={<ProtectedRoute><DashboardLayout><Bilheteria /></DashboardLayout></ProtectedRoute>} />
              <Route path="/ingresso/:id" element={<CompraIngresso />} />
            </Routes>
          </Router>
      </OrgProvider>
    </AuthProvider>
    </ThemeProvider>
  );
}
