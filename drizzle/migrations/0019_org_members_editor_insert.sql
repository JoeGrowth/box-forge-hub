drop policy if exists org_members_insert_admin on public.organization_members;
create policy org_members_insert_admin_or_editor on public.organization_members for insert to authenticated
with check (
  public.has_org_role(auth.uid(), organization_id, 'admin')
  or (role <> 'admin' and public.has_org_role(auth.uid(), organization_id, 'editor'))
);