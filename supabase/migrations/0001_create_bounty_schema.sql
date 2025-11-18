create extension if not exists "uuid-ossp";
create extension if not exists pgcrypto;

create table if not exists public.bounties (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users (id),
    trick text,
    reward numeric,
    created_at timestamptz not null default now(),
    spot_id uuid references public.spots (id) on delete set null,
    status text,
    reward_type text,
    difficulty text,
    expires_at timestamptz
);

alter table public.bounties
    add column if not exists user_id uuid not null references auth.users (id);

alter table public.bounties
    add column if not exists trick text;

alter table public.bounties
    add column if not exists reward numeric;

alter table public.bounties
    add column if not exists created_at timestamptz not null default now();

alter table public.bounties
    add column if not exists spot_id uuid references public.spots (id) on delete set null;

alter table public.bounties
    add column if not exists status text;

alter table public.bounties
    add column if not exists reward_type text;

alter table public.bounties
    add column if not exists difficulty text;

alter table public.bounties
    add column if not exists expires_at timestamptz;

create table if not exists public.bounty_acceptances (
    id uuid primary key default gen_random_uuid(),
    bounty_id uuid not null references public.bounties (id) on delete cascade,
    user_id uuid not null references auth.users (id),
    created_at timestamptz not null default now(),
    constraint uq_bounty_acceptance unique (bounty_id, user_id)
);

alter table public.bounty_acceptances
    add column if not exists user_id uuid not null references auth.users (id);

alter table public.bounty_acceptances
    add column if not exists created_at timestamptz not null default now();

alter table public.bounty_acceptances
    drop constraint if exists uq_bounty_acceptance;

alter table public.bounty_acceptances
    add constraint uq_bounty_acceptance unique (bounty_id, user_id);

create table if not exists public.submissions (
    id uuid primary key default gen_random_uuid(),
    bounty_id uuid not null references public.bounties (id) on delete cascade,
    user_id uuid not null references auth.users (id),
    media_url text not null,
    caption text,
    status text,
    created_at timestamptz not null default now(),
    external_url text,
    external_posted_at timestamptz
);

alter table public.submissions
    add column if not exists user_id uuid not null references auth.users (id);

alter table public.submissions
    add column if not exists media_url text;

alter table public.submissions
    add column if not exists caption text;

alter table public.submissions
    add column if not exists status text;

alter table public.submissions
    add column if not exists created_at timestamptz not null default now();

alter table public.submissions
    add column if not exists external_url text;

alter table public.submissions
    add column if not exists external_posted_at timestamptz;

create table if not exists public.submission_votes (
    id uuid primary key default gen_random_uuid(),
    submission_id uuid not null references public.submissions (id) on delete cascade,
    user_id uuid not null references auth.users (id),
    created_at timestamptz not null default now(),
    constraint uq_submission_vote unique (submission_id, user_id)
);

alter table public.submission_votes
    add column if not exists user_id uuid not null references auth.users (id);

alter table public.submission_votes
    add column if not exists created_at timestamptz not null default now();

alter table public.submission_votes
    drop constraint if exists uq_submission_vote;

alter table public.submission_votes
    add constraint uq_submission_vote unique (submission_id, user_id);

create or replace view public.v_submissions_with_votes as
select
    s.id,
    s.bounty_id,
    s.user_id,
    s.media_url,
    s.caption,
    s.status,
    s.created_at,
    s.external_url,
    s.external_posted_at,
    coalesce(v.vote_count, 0) as vote_count
from public.submissions s
left join (
    select submission_id, count(*) as vote_count
    from public.submission_votes
    group by submission_id
) v on s.id = v.submission_id;

drop function if exists public.rpc_accept_bounty(uuid);
create or replace function public.rpc_accept_bounty(p_bounty_id uuid)
returns public.bounty_acceptances
language plpgsql
security invoker
set search_path = public
as $$
declare
    result bounty_acceptances;
begin
    if auth.uid() is null then
        raise exception 'Not authenticated';
    end if;

    insert into public.bounty_acceptances (bounty_id, user_id)
    values (p_bounty_id, auth.uid())
    on conflict (bounty_id, user_id) do update
        set created_at = excluded.created_at
    returning * into result;

    return result;
end;
$$;

drop function if exists public.rpc_submit_proof(uuid, text, text, text, text, timestamptz);
create or replace function public.rpc_submit_proof(
    p_bounty_id uuid,
    p_media_url text,
    p_caption text default null,
    p_status text default null,
    p_external_url text default null,
    p_external_posted_at timestamptz default null
)
returns public.submissions
language plpgsql
security invoker
set search_path = public
as $$
declare
    result submissions;
begin
    if auth.uid() is null then
        raise exception 'Not authenticated';
    end if;

    insert into public.submissions (
        bounty_id,
        user_id,
        media_url,
        caption,
        status,
        external_url,
        external_posted_at
    )
    values (
        p_bounty_id,
        auth.uid(),
        p_media_url,
        p_caption,
        coalesce(p_status, 'submitted'),
        p_external_url,
        p_external_posted_at
    )
    returning * into result;

    return result;
end;
$$;

drop function if exists public.rpc_vote_submission(uuid);
create or replace function public.rpc_vote_submission(p_submission_id uuid)
returns public.submission_votes
language plpgsql
security invoker
set search_path = public
as $$
declare
    result submission_votes;
begin
    if auth.uid() is null then
        raise exception 'Not authenticated';
    end if;

    insert into public.submission_votes (submission_id, user_id)
    values (p_submission_id, auth.uid())
    on conflict (submission_id, user_id) do update
        set created_at = now()
    returning * into result;

    return result;
end;
$$;

drop function if exists public.rpc_unvote_submission(uuid);
create or replace function public.rpc_unvote_submission(p_submission_id uuid)
returns void
language plpgsql
security invoker
set search_path = public
as $$
begin
    if auth.uid() is null then
        raise exception 'Not authenticated';
    end if;

    delete from public.submission_votes
    where submission_id = p_submission_id
      and user_id = auth.uid();
end;
$$;

-- Row-level security
alter table public.bounties enable row level security;
create policy "authenticated can read bounties" on public.bounties
    for select using (auth.uid() is not null);
create policy "authenticated can insert bounties" on public.bounties
    for insert with check (auth.uid() = user_id);
create policy "creators can update bounties" on public.bounties
    for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "creators can delete bounties" on public.bounties
    for delete using (auth.uid() = user_id);

alter table public.bounty_acceptances enable row level security;
create policy "authenticated can read bounty_acceptances" on public.bounty_acceptances
    for select using (auth.uid() is not null);
create policy "skaters can accept bounties" on public.bounty_acceptances
    for insert with check (auth.uid() = user_id);
create policy "skaters can update bounty_acceptances" on public.bounty_acceptances
    for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "skaters can delete bounty_acceptances" on public.bounty_acceptances
    for delete using (auth.uid() = user_id);

alter table public.submissions enable row level security;
create policy "authenticated can read submissions" on public.submissions
    for select using (auth.uid() is not null);
create policy "submitters can insert" on public.submissions
    for insert with check (auth.uid() = user_id);
create policy "submitters can update" on public.submissions
    for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "submitters can delete" on public.submissions
    for delete using (auth.uid() = user_id);

alter table public.submission_votes enable row level security;
create policy "authenticated can read submission_votes" on public.submission_votes
    for select using (auth.uid() is not null);
create policy "voters can insert" on public.submission_votes
    for insert with check (auth.uid() = user_id);
create policy "voters can update" on public.submission_votes
    for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "voters can delete" on public.submission_votes
    for delete using (auth.uid() = user_id);
