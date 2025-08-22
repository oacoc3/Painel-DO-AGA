import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

interface Profile {
  name: string;
  roles: string[];
}

interface AuthContextValue {
  user: any | null;
  profile: Profile | null;
}

const AuthContext = createContext<AuthContextValue>({ user: null, profile: null });

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [value, setValue] = useState<AuthContextValue>({ user: null, profile: null });

  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const user = session?.user ?? null;
      if (user) {
        const { data: profile } = await supabase.from('profiles').select('name').eq('id', user.id).single();
        const { data: rolesData } = await supabase
          .from('user_roles')
          .select('roles(name)')
          .eq('user_id', user.id);
        const roles = rolesData ? rolesData.map((r: any) => r.roles.name) : [];
        setValue({ user, profile: profile ? { name: profile.name, roles } : { name: '', roles } });
      } else {
        setValue({ user: null, profile: null });
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);
