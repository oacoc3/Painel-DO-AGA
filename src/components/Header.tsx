import { useAuth } from '../context/AuthContext';

const Header: React.FC = () => {
  const { profile } = useAuth();
  return (
    <header style={{ padding: '1rem', background: '#eee', marginBottom: '1rem' }}>
      {profile ? (
        <div>
          Usuário: {profile.name} | Perfil: {profile.roles.join(', ')}
        </div>
      ) : (
        <div>Não autenticado</div>
      )}
    </header>
  );
};

export default Header;
