-- ============================================================
-- PublicVerdict — Supabase Database Schema
-- Run this in the Supabase SQL Editor (Database → SQL Editor)
-- ============================================================

-- ── PROFILES ────────────────────────────────────────────────
create table if not exists public.profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  username   text not null,
  created_at timestamptz default now() not null
);

alter table public.profiles enable row level security;

create policy "Anyone can read profiles"
  on public.profiles for select using (true);

create policy "User can insert own profile"
  on public.profiles for insert with check (auth.uid() = id);

create policy "User can update own profile"
  on public.profiles for update using (auth.uid() = id);


-- ── CASES ───────────────────────────────────────────────────
create table if not exists public.cases (
  id                 text primary key default gen_random_uuid()::text,
  title              text not null,
  description        text,
  claimant_id        uuid references public.profiles(id) on delete set null,
  claimant_name      text not null,
  claimant_avatar    text,
  claimant_location  text,
  respondent_name    text,
  respondent_avatar  text,
  tags               text[] default '{}',
  support_votes      integer default 0 not null,
  against_votes      integer default 0 not null,
  status             text default 'open' not null check (status in ('open', 'verdict', 'closed')),
  claim_video_url    text,
  filed_at           timestamptz default now() not null,
  created_at         timestamptz default now() not null
);

alter table public.cases enable row level security;

create policy "Anyone can read cases"
  on public.cases for select using (true);

create policy "Authenticated users can file cases"
  on public.cases for insert with check (auth.role() = 'authenticated');

create policy "Claimant can update own case"
  on public.cases for update using (auth.uid() = claimant_id);


-- ── EVIDENCE ────────────────────────────────────────────────
create table if not exists public.evidence (
  id          uuid primary key default gen_random_uuid(),
  case_id     text not null references public.cases(id) on delete cascade,
  side        text not null check (side in ('prosecution', 'defense')),
  type        text not null check (type in ('image', 'video')),
  user_id     uuid references public.profiles(id) on delete set null,
  user_name   text not null,
  user_avatar text,
  caption     text not null,
  file_url    text,
  likes       integer default 0 not null,
  created_at  timestamptz default now() not null
);

alter table public.evidence enable row level security;

create policy "Anyone can read evidence"
  on public.evidence for select using (true);

create policy "Authenticated users can submit evidence"
  on public.evidence for insert with check (auth.role() = 'authenticated');


-- ── VOTES ───────────────────────────────────────────────────
create table if not exists public.votes (
  id         uuid primary key default gen_random_uuid(),
  case_id    text not null references public.cases(id) on delete cascade,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  side       text not null check (side in ('prosecution', 'defense')),
  created_at timestamptz default now() not null,
  unique (case_id, user_id)
);

alter table public.votes enable row level security;

create policy "Anyone can read votes"
  on public.votes for select using (true);

create policy "Authenticated users can vote"
  on public.votes for insert with check (auth.uid() = user_id);

-- Auto-update case vote counts when a vote is cast
create or replace function public.increment_case_votes()
returns trigger language plpgsql security definer as $$
begin
  if new.side = 'prosecution' then
    update public.cases set support_votes = support_votes + 1 where id = new.case_id;
  else
    update public.cases set against_votes = against_votes + 1 where id = new.case_id;
  end if;
  return new;
end;
$$;

drop trigger if exists on_vote_inserted on public.votes;
create trigger on_vote_inserted
  after insert on public.votes
  for each row execute procedure public.increment_case_votes();


-- ── CASE COMMENTS ───────────────────────────────────────────
create table if not exists public.case_comments (
  id         uuid primary key default gen_random_uuid(),
  case_id    text not null references public.cases(id) on delete cascade,
  user_id    uuid references public.profiles(id) on delete set null,
  user_name  text not null,
  text       text not null,
  created_at timestamptz default now() not null
);

alter table public.case_comments enable row level security;

create policy "Anyone can read case comments"
  on public.case_comments for select using (true);

create policy "Authenticated users can comment on cases"
  on public.case_comments for insert with check (auth.role() = 'authenticated');


-- ── EVIDENCE COMMENTS ───────────────────────────────────────
create table if not exists public.evidence_comments (
  id          uuid primary key default gen_random_uuid(),
  evidence_id uuid not null references public.evidence(id) on delete cascade,
  user_id     uuid references public.profiles(id) on delete set null,
  user_name   text not null,
  text        text not null,
  created_at  timestamptz default now() not null
);

alter table public.evidence_comments enable row level security;

create policy "Anyone can read evidence comments"
  on public.evidence_comments for select using (true);

create policy "Authenticated users can comment on evidence"
  on public.evidence_comments for insert with check (auth.role() = 'authenticated');


-- ── CASE LIKES ──────────────────────────────────────────────
create table if not exists public.case_likes (
  id         uuid primary key default gen_random_uuid(),
  case_id    text not null references public.cases(id) on delete cascade,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz default now() not null,
  unique (case_id, user_id)
);

alter table public.case_likes enable row level security;

create policy "Anyone can read case likes"
  on public.case_likes for select using (true);

create policy "Authenticated users can like cases"
  on public.case_likes for insert with check (auth.uid() = user_id);


-- ── EVIDENCE LIKES ──────────────────────────────────────────
create table if not exists public.evidence_likes (
  id          uuid primary key default gen_random_uuid(),
  evidence_id uuid not null references public.evidence(id) on delete cascade,
  user_id     uuid not null references public.profiles(id) on delete cascade,
  created_at  timestamptz default now() not null,
  unique (evidence_id, user_id)
);

alter table public.evidence_likes enable row level security;

create policy "Anyone can read evidence likes"
  on public.evidence_likes for select using (true);

create policy "Authenticated users can like evidence"
  on public.evidence_likes for insert with check (auth.uid() = user_id);

-- Auto-update evidence like count
create or replace function public.increment_evidence_likes()
returns trigger language plpgsql security definer as $$
begin
  update public.evidence set likes = likes + 1 where id = new.evidence_id;
  return new;
end;
$$;

drop trigger if exists on_evidence_like_inserted on public.evidence_likes;
create trigger on_evidence_like_inserted
  after insert on public.evidence_likes
  for each row execute procedure public.increment_evidence_likes();
