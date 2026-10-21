-- Make member profiles public by default.
-- Run in the Supabase SQL Editor. Wrapped in a transaction: if the Zack
-- Rosenblatt lookup below doesn't match exactly one profile, nothing changes.
--
-- 1. New profiles: profiles are created by upserts in app/auth/callback and
--    app/api/auth/wallet that never set is_public/public_fields, so they get
--    the column defaults. Changing the defaults (not the upserts) means a
--    member who later turns their profile private stays private on re-login.
-- 2. Existing profiles: flip every private profile to public, EXCEPT Zack
--    Rosenblatt's, which keeps its current settings (per director request).
--    Members who already picked public_fields keep their picks; only empty
--    ones get the default set.
-- Social handles (twitter, linkedin, telegram) stay hidden until opted in.

begin;

alter table public.profiles
  alter column is_public set default true,
  alter column public_fields set default '["display_name", "school", "bio", "graduation_year", "major"]'::jsonb;

do $$
declare
  excluded_count int;
begin
  select count(*) into excluded_count
  from public.profiles
  where display_name ilike 'zack rosenblatt';

  if excluded_count <> 1 then
    raise exception 'Expected exactly 1 profile named Zack Rosenblatt, found %. Look up his id and filter on id = ''<uuid>'' instead.', excluded_count;
  end if;

  update public.profiles
  set
    is_public = true,
    public_fields = case
      when public_fields is null
        or jsonb_typeof(public_fields) <> 'array'
        or jsonb_array_length(public_fields) = 0
        then '["display_name", "school", "bio", "graduation_year", "major"]'::jsonb
      else public_fields
    end
  where coalesce(is_public, false) = false
    and coalesce(display_name, '') not ilike 'zack rosenblatt';
end $$;

commit;

-- Check afterwards:
--   select is_public, count(*) from public.profiles group by is_public;
--   select display_name, is_public, public_fields from public.profiles where display_name ilike 'zack rosenblatt';
