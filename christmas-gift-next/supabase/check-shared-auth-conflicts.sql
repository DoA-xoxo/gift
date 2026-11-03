-- Run this read-only check after mari-toybox/supabase/schema.sql,
-- but BEFORE shared-auth-migration.sql.
-- Both query results should be empty. If not, resolve the listed account IDs manually.

-- 1. Duplicate gift-site IDs ignoring letter case.
select lower(nickname) as normalized_id, count(*) as account_count,
       array_agg(nickname order by nickname) as variants
from public.event_users
group by lower(nickname)
having count(*) > 1;

-- 2. Nicknames present in both legacy account tables.
select p.nickname as mari_nickname,
       e.nickname as gift_nickname,
       p.id as mari_profile_id
from public.user_profiles p
join public.event_users e on lower(e.nickname) = lower(p.nickname)
order by lower(p.nickname);
