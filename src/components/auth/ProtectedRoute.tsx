import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useOrg } from '../../context/OrgContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, loading: authLoading } = useAuth();
  const { organization, loading: orgLoading } = useOrg();
  const location = useLocation();

  if (authLoading || orgLoading) {
    return (
      <div className="min-h-screen bg-dark-bg flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Se o usuário está logado mas não tem time, e não está na página de registro de time
  if (!organization && location.pathname !== '/registrar-clube') {
    return <Navigate to="/registrar-clube" replace />;
  }

  // Se o usuário já tem time e tenta acessar a página de registro
  if (organization && location.pathname === '/registrar-clube') {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

