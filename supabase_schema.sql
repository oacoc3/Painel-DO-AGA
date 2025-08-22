-- Tipos enumerados
create type processo_tipo as enum ('PDIR','Inscrição/Alteração','Exploração','OPEA');
create type processo_status as enum (
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
);

-- Perfil dos usuários
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null
);

create table roles (
  id serial primary key,
  name text unique not null check (name in (
    'Analista OACO','Analista OAGA','CH OACO','CH OAGA','CH AGA','Administrador','Visitante'
  ))
);

create table user_roles (
  user_id uuid references profiles(id) on delete cascade,
  role_id int references roles(id) on delete cascade,
  primary key (user_id, role_id)
);

-- Processos
create table processes (
  id uuid primary key default gen_random_uuid(),
  nup text not null,
  tipo processo_tipo not null,
  primeira_entrada date not null,
  status processo_status not null default 'Análise Documental',
  inserted_at timestamptz default now()
);

-- Histórico de status
create table process_status_history (
  id uuid primary key default gen_random_uuid(),
  process_id uuid references processes(id) on delete cascade,
  status processo_status not null,
  changed_at timestamptz default now(),
  user_id uuid references profiles(id),
  role text not null
);
