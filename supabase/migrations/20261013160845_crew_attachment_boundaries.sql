CREATE POLICY "contentlab attachment client boundary" ON storage.objects AS RESTRICTIVE FOR ALL TO public
USING (bucket_id <> 'contentlab-task-resources' OR (
 auth.uid() IS NOT NULL AND (
 EXISTS (SELECT 1 FROM public.task_resources r JOIN public.tasks t ON t.id=r.task_id
 WHERE r.storage_path=storage.objects.name AND private.can_access_client(t.client,t.brand)
 AND (private.is_internal_user() OR r.visibility='client'))
 OR (private.is_internal_user() AND EXISTS (
 SELECT 1 FROM public.tasks t WHERE t.id::text=split_part(storage.objects.name,'/',1)
 AND private.can_access_client(t.client,t.brand)))
 )))
WITH CHECK (bucket_id <> 'contentlab-task-resources' OR (
 auth.uid() IS NOT NULL AND private.is_internal_user() AND EXISTS (
 SELECT 1 FROM public.tasks t WHERE t.id::text=split_part(storage.objects.name,'/',1)
 AND private.can_access_client(t.client,t.brand))));
