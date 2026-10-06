-- Údržba: exspirácia overení, čistenie logov (vyžaduje rozšírenie pg_cron, v Supabase zapnúť v Database > Extensions)
create extension if not exists pg_cron;
select cron.schedule('np-expire-verifications', '15 3 * * *', $$
  update public.verifications set status = 'expired'
   where status = 'approved' and created_at < now() - interval '90 days';
$$);
select cron.schedule('np-cleanup-contacts', '30 3 * * *', $$
  delete from public.contacts where created_at < now() - interval '12 months';
$$);
select cron.schedule('np-cleanup-audit', '45 3 * * *', $$
  delete from public.audit_log where created_at < now() - interval '24 months';
$$);
