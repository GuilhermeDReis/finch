-- Script super simples para verificar o estado das tabelas
-- Execute cada query individualmente

-- 1. Verificar quais tabelas existem no schema public
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public'
ORDER BY table_name;

-- 2. Se você viu 'notifications' na lista anterior, execute esta:
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'notifications' AND table_schema = 'public'
ORDER BY ordinal_position;

-- 3. Se você viu 'background_jobs' na lista anterior, execute esta:
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'background_jobs' AND table_schema = 'public'
ORDER BY ordinal_position;

-- 4. Verificar quantos usuários existem
SELECT COUNT(*) as total_users FROM auth.users;

-- 5. Se as tabelas existem, teste inserir uma notificação manualmente
-- IMPORTANTE: Substitua 'YOUR_USER_ID' por um ID real de usuário
/*
INSERT INTO public.notifications (
    user_id,
    title,
    message,
    type,
    category
) VALUES (
    (SELECT id FROM auth.users LIMIT 1),
    'Teste Manual',
    'Esta é uma notificação de teste',
    'info',
    'general'
);
*/

-- 6. Se conseguiu inserir, verificar se apareceu
-- SELECT * FROM public.notifications WHERE title = 'Teste Manual';

-- 7. Limpar o teste
-- DELETE FROM public.notifications WHERE title = 'Teste Manual';
