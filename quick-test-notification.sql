-- Script rápido para testar notificações
-- Execute este SQL no painel do Supabase

-- Inserir uma notificação de teste usando o primeiro usuário encontrado
INSERT INTO public.notifications (user_id, title, message, type, category, is_read, created_at) 
VALUES (
  (SELECT id FROM auth.users ORDER BY created_at DESC LIMIT 1), 
  'Teste da Central', 
  'Esta notificação foi criada para testar o sistema. Se você está vendo isto, está funcionando!', 
  'success', 
  'general', 
  false, 
  now()
);

-- Verificar se foi inserida
SELECT 
  title, 
  message, 
  type, 
  created_at,
  user_id,
  (SELECT email FROM auth.users WHERE id = notifications.user_id) as user_email
FROM public.notifications 
ORDER BY created_at DESC 
LIMIT 5;
