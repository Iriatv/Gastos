-- Ejecuta esto en Supabase: panel del proyecto -> SQL Editor -> New query -> pegar y Run

create table if not exists transactions (
  id uuid primary key default gen_random_uuid(),
  tipo text not null check (tipo in ('ingreso', 'gasto')),
  monto numeric(10, 2) not null check (monto > 0),
  fecha date not null,
  categoria text not null,
  subcategoria text,
  nota text,
  created_at timestamptz not null default now()
);

-- Activamos seguridad a nivel de fila (obligatorio en Supabase)
alter table transactions enable row level security;

-- Política permisiva: cualquiera con tu clave "anon" puede leer/escribir.
-- Válido para un uso personal donde el enlace de tu app no es público/compartido.
-- Si más adelante quieres protegerlo con login, sustituye esto por políticas basadas en auth.uid().
create policy "Permitir todo con la clave anon"
  on transactions
  for all
  using (true)
  with check (true);
