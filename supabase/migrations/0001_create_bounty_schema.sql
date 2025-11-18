-- Schema for bounty tracking
create extension if not exists "uuid-ossp";
create extension if not exists pgcrypto;

create table if not exists public.bounties (
    id uuid primary key default gen_random_uuid(),
    title text not null,
    description text not null,
    reward numeric(12,2) not null default 0,
    created_by uuid references auth.users (id),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table if not exists public.bounty_acceptances (
    id uuid primary key default gen_random_uuid(),
    bounty_id uuid not null references public.bounties (id) on delete cascade,
    skater_id uuid not null references auth.users (id),
    accepted_at timestamptz not null default now(),
    constraint uq_bounty_acceptance unique (bounty_id, skater_id)
);

create table if not exists public.submissions (
    id uuid primary key default gen_random_uuid(),
    bounty_id uuid not null references public.bounties (id) on delete cascade,
    submitted_by uuid not null references auth.users (id),
    proof_url text not null,
    notes text,
    created_at timestamptz not null default now()
);

create table if not exists public.submission_votes (
    id uuid primary key default gen_random_uuid(),
    submission_id uuid not null references public.submissions (id) on delete cascade,
    voter_id uuid not null references auth.users (id),
    voted_at timestamptz not null default now(),
    constraint uq_submission_vote unique (submission_id, voter_id)
);

create or replace view public.v_submissions_with_votes as
select
    s.id,
    s.bounty_id,
    s.submitted_by,
    s.proof_url,
    s.notes,
    s.created_at,
    coalesce(v.vote_count, 0) as vote_count
from public.submissions s
left join (
    select submission_id, count(*) as vote_count
    from public.submission_votes
    group by submission_id
) v on s.id = v.submission_id;

-- RPC functions
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

    insert into public.bounty_acceptances (bounty_id, skater_id)
    values (p_bounty_id, auth.uid())
    on conflict (bounty_id, skater_id) do update
        set accepted_at = excluded.accepted_at
    returning * into result;

    return result;
end;
$$;

create or replace function public.rpc_submit_proof(
    p_bounty_id uuid,
    p_proof_url text,
    p_notes text default null
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

    insert into public.submissions (bounty_id, submitted_by, proof_url, notes)
    values (p_bounty_id, auth.uid(), p_proof_url, p_notes)
    returning * into result;

    return result;
end;
$$;

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

    insert into public.submission_votes (submission_id, voter_id)
    values (p_submission_id, auth.uid())
    on conflict (submission_id, voter_id) do update
        set voted_at = now()
    returning * into result;

    return result;
end;
$$;

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
      and voter_id = auth.uid();
end;
$$;

-- Row-level security
alter table public.bounties enable row level security;
create policy "authenticated can read bounties" on public.bounties
    for select using (auth.uid() is not null);
create policy "authenticated can insert bounties" on public.bounties
    for insert with check (auth.uid() = created_by);
create policy "creators can update bounties" on public.bounties
    for update using (auth.uid() = created_by) with check (auth.uid() = created_by);
create policy "creators can delete bounties" on public.bounties
    for delete using (auth.uid() = created_by);

alter table public.bounty_acceptances enable row level security;
create policy "authenticated can read bounty_acceptances" on public.bounty_acceptances
    for select using (auth.uid() is not null);
create policy "skaters can accept bounties" on public.bounty_acceptances
    for insert with check (auth.uid() = skater_id);
create policy "skaters can update bounty_acceptances" on public.bounty_acceptances
    for update using (auth.uid() = skater_id) with check (auth.uid() = skater_id);
create policy "skaters can delete bounty_acceptances" on public.bounty_acceptances
    for delete using (auth.uid() = skater_id);

alter table public.submissions enable row level security;
create policy "authenticated can read submissions" on public.submissions
    for select using (auth.uid() is not null);
create policy "submitters can insert" on public.submissions
    for insert with check (auth.uid() = submitted_by);
create policy "submitters can update" on public.submissions
    for update using (auth.uid() = submitted_by) with check (auth.uid() = submitted_by);
create policy "submitters can delete" on public.submissions
    for delete using (auth.uid() = submitted_by);

alter table public.submission_votes enable row level security;
create policy "authenticated can read submission_votes" on public.submission_votes
    for select using (auth.uid() is not null);
create policy "voters can insert" on public.submission_votes
    for insert with check (auth.uid() = voter_id);
create policy "voters can update" on public.submission_votes
    for update using (auth.uid() = voter_id) with check (auth.uid() = voter_id);
create policy "voters can delete" on public.submission_votes
    for delete using (auth.uid() = voter_id);
