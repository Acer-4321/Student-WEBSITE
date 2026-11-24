create table if not exists public.library_files (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  code text not null default '',
  author text not null default '',
  type text not null,
  level text not null,
  faculty text not null default '',
  summary text not null default '',
  file_name text not null,
  size bigint not null default 0,
  storage_path text not null,
  added timestamptz not null default now()
);

alter table public.library_files enable row level security;

create policy "Signed-in users can view shared library files"
on public.library_files for select
to authenticated
using (true);

create policy "Users can add library files"
on public.library_files for insert
to authenticated
with check (auth.uid() = user_id);

create policy "Users can edit their library files"
on public.library_files for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Users can delete their library files"
on public.library_files for delete
to authenticated
using (auth.uid() = user_id);

insert into storage.buckets (id, name, public)
values ('study-files', 'study-files', true)
on conflict (id) do update set public = excluded.public;

create policy "Signed-in users can upload library files"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'study-files'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "Signed-in users can update their library files"
on storage.objects for update
to authenticated
using (
  bucket_id = 'study-files'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'study-files'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "Signed-in users can delete their library files"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'study-files'
  and (storage.foldername(name))[1] = auth.uid()::text
);
