import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Processo, ProcessoStatus, ProcessoTipo } from '../types';
import { useAuth } from '../context/AuthContext';

const tipos: ProcessoTipo[] = ['PDIR', 'Inscrição/Alteração', 'Exploração', 'OPEA'];
const statusList: ProcessoStatus[] = [
  'Análise Documental',
  'Análise Técnica Preliminar',
  'Análise Técnica',
  'Parecer ATM',
  'Parecer DT',
  'Notificação',
  'Revisão OACO',
  'Aprovação',
  'Sobrestado Documental',
  'Sobrestado Técnico',
  'Análise ICA',
  'Publicação de Portaria',
  'Concluído',
  'Remoção/Rebaixamento',
  'Término de Obra'
];

const Dashboard: React.FC = () => {
  const { user, profile } = useAuth();
  const [processos, setProcessos] = useState<Processo[]>([]);
  const [novo, setNovo] = useState({ nup: '', tipo: tipos[0], primeiraEntrada: '' });
  const [history, setHistory] = useState<Record<string, any[]>>({});

  const load = async () => {
    const { data } = await supabase.from('processes').select('*');
    const mapped = (data ?? []).map((p: any) => ({
      id: p.id,
      nup: p.nup,
      tipo: p.tipo,
      primeiraEntrada: new Date(p.primeira_entrada).toLocaleDateString('pt-BR'),
      status: p.status
    }));
    setProcessos(mapped);
  };

  useEffect(() => {
    load();
  }, []);

  const addProcess = async () => {
    const [d, m, y] = novo.primeiraEntrada.split('/');
    const iso = `20${y}-${m}-${d}`; // converte DD/MM/AA para ISO
    await supabase.from('processes').insert({
      nup: novo.nup,
      tipo: novo.tipo,
      primeira_entrada: iso,
      status: 'Análise Documental'
    });
    setNovo({ nup: '', tipo: tipos[0], primeiraEntrada: '' });
    load();
  };

  const updateStatus = async (processo: Processo, status: ProcessoStatus) => {
    await supabase.from('processes').update({ status }).eq('id', processo.id);
    await supabase.from('process_status_history').insert({
      process_id: processo.id,
      status,
      user_id: user.id,
      role: profile?.roles[0] ?? ''
    });
    load();
  };

  const loadHistory = async (id: string) => {
    const { data } = await supabase
      .from('process_status_history')
      .select('status, changed_at, role, profiles(name)')
      .eq('process_id', id)
      .order('changed_at');
    setHistory((h) => ({ ...h, [id]: data as any[] }));
  };

  return (
    <div>
      <h2>Novo Processo</h2>
      <div style={{ display: 'flex', gap: '0.5rem' }}>
        <input placeholder="NUP" value={novo.nup} onChange={(e) => setNovo({ ...novo, nup: e.target.value })} />
        <select value={novo.tipo} onChange={(e) => setNovo({ ...novo, tipo: e.target.value as ProcessoTipo })}>
          {tipos.map((t) => (
            <option key={t}>{t}</option>
          ))}
        </select>
        <input
          placeholder="1ª Entrada Regional"
          value={novo.primeiraEntrada}
          onChange={(e) => setNovo({ ...novo, primeiraEntrada: e.target.value })}
        />
        <button onClick={addProcess}>Adicionar</button>
      </div>

      <h2>Processos</h2>
      <table border={1} cellPadding={4} style={{ borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th>NUP</th>
            <th>Tipo</th>
            <th>1ª Entrada Regional</th>
            <th>Status</th>
            <th>Ações</th>
          </tr>
        </thead>
        <tbody>
          {processos.map((p) => (
            <tr key={p.id}>
              <td>{p.nup}</td>
              <td>{p.tipo}</td>
              <td>{p.primeiraEntrada}</td>
              <td>{p.status}</td>
              <td>
                <select onChange={(e) => updateStatus(p, e.target.value as ProcessoStatus)} defaultValue="">
                  <option value="" disabled>
                    Alterar status
                  </option>
                  {statusList.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
                <button onClick={() => loadHistory(p.id)}>Histórico</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {Object.entries(history).map(([id, hist]) => (
        <div key={id}>
          <h3>Histórico {id}</h3>
          <ul>
            {hist.map((h: any) => (
              <li key={h.changed_at}>
                {new Date(h.changed_at).toLocaleString('pt-BR', {
                  timeZone: 'America/Sao_Paulo',
                  hour: '2-digit',
                  minute: '2-digit',
                  day: '2-digit',
                  month: '2-digit',
                  year: '2-digit'
                })}
                : {h.status} - {h.role} - {h.profiles?.name}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
};

export default Dashboard;
