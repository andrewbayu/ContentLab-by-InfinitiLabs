CREATE POLICY "crew client boundary" ON public.comments AS RESTRICTIVE FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.tasks t WHERE t.id = comments.task_id AND private.can_access_client(t.client,t.brand)))
WITH CHECK (EXISTS (SELECT 1 FROM public.tasks t WHERE t.id = comments.task_id AND private.can_access_client(t.client,t.brand)));
CREATE POLICY "crew client boundary" ON public.task_resources AS RESTRICTIVE FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.tasks t WHERE t.id = task_resources.task_id AND private.can_access_client(t.client,t.brand)))
WITH CHECK (EXISTS (SELECT 1 FROM public.tasks t WHERE t.id = task_resources.task_id AND private.can_access_client(t.client,t.brand)));
CREATE POLICY "crew client boundary" ON public.documents AS RESTRICTIVE FOR ALL TO authenticated
USING ((visibility='personal' AND owner_id=private.current_member_id()) OR private.can_access_client(client,brand))
WITH CHECK ((visibility='personal' AND owner_id=private.current_member_id()) OR private.can_access_client(client,brand));
CREATE POLICY "crew client boundary" ON public.notifications AS RESTRICTIVE FOR ALL TO authenticated
USING (task_id IS NULL OR EXISTS (SELECT 1 FROM public.tasks t WHERE t.id=notifications.task_id AND private.can_access_client(t.client,t.brand)))
WITH CHECK (task_id IS NULL OR EXISTS (SELECT 1 FROM public.tasks t WHERE t.id=notifications.task_id AND private.can_access_client(t.client,t.brand)));
