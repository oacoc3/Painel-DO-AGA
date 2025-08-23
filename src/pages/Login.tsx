import { FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

const Login: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email: username, password });
      if (error) setError(error.message);
      else navigate('/dashboard');
    } catch (err) {
      setError((err as Error).message);
    }
  };

  return (
    <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxWidth: 300 }}>
      <label>
        Usuário
        <input value={username} onChange={(e) => setUsername(e.target.value)} />
      </label>
      <label>
        Senha
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
      </label>
      {error && <span style={{ color: 'red' }}>{error}</span>}
      <button type="submit">Entrar</button>
    </form>
  );
};

export default Login;
