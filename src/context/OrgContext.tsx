import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';

interface Organization {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  primary_color: string;
  secondary_color: string;
  settings: any;
}

interface OrgContextType {
  organization: Organization | null;
  loading: boolean;
  refreshOrg: () => Promise<void>;
}

const OrgContext = createContext<OrgContextType | undefined>(undefined);

export function OrgProvider({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);

  const fetchOrg = async () => {
    setLoading(true);
    try {
      let orgData = null;

      // 1. Tentar identificar pela URL (Subdomínio/Slug)
      const hostname = window.location.hostname;
      const subdomain = hostname.split('.')[0];
      const isCustomDomain = hostname.includes('.') && subdomain !== 'localhost' && subdomain !== 'www' && !hostname.includes('supabase.co');

      if (isCustomDomain) {
        const { data: org, error: orgError } = await supabase!
          .from('organizations')
          .select('*')
          .eq('slug', subdomain)
          .single();
        
        if (!orgError && org) orgData = org;
      }

      // 2. Se não identificou pela URL e tem usuário, tentar pelo perfil
      if (!orgData && user) {
        const { data: profile, error: profileError } = await supabase!
          .from('profiles')
          .select('organization_id')
          .eq('id', user.id)
          .single();

        if (!profileError && profile?.organization_id) {
          const { data: org, error: orgError } = await supabase!
            .from('organizations')
            .select('*')
            .eq('id', profile.organization_id)
            .single();

          if (!orgError && org) orgData = org;
        }
      }

      setOrganization(orgData);
    } catch (err) {
      console.error('Error fetching org:', err);
      setOrganization(null);
    } finally {
      setLoading(false);
      setInitialized(true);
    }
  };

  useEffect(() => {
    if (!authLoading) {
      fetchOrg();
    }
  }, [user, authLoading]);

  // Consider it loading if auth is loading, or if we haven't initialized the org check yet
  const isReallyLoading = authLoading || loading || (!initialized && user !== null);

  return (
    <OrgContext.Provider value={{ organization, loading: isReallyLoading, refreshOrg: fetchOrg }}>
      {children}
    </OrgContext.Provider>
  );
}

export const useOrg = () => {
  const context = useContext(OrgContext);
  if (context === undefined) {
    throw new Error('useOrg must be used within an OrgProvider');
  }
  return context;
};
