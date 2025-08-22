export type ProcessoTipo = 'PDIR' | 'Inscrição/Alteração' | 'Exploração' | 'OPEA';

export type ProcessoStatus =
  | 'Análise Documental'
  | 'Análise Técnica Preliminar'
  | 'Análise Técnica'
  | 'Parecer ATM'
  | 'Parecer DT'
  | 'Notificação'
  | 'Revisão OACO'
  | 'Aprovação'
  | 'Sobrestado Documental'
  | 'Sobrestado Técnico'
  | 'Análise ICA'
  | 'Publicação de Portaria'
  | 'Concluído'
  | 'Remoção/Rebaixamento'
  | 'Término de Obra';

export interface Processo {
  id: string;
  nup: string;
  tipo: ProcessoTipo;
  primeiraEntrada: string; // DD/MM/AA
  status: ProcessoStatus;
}
