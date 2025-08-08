-- Script para inserir notificações de teste com usuário real
-- Execute este script no SQL Editor do Supabase

-- Primeiro, vamos verificar se há usuários na tabela auth.users
SELECT id, email, created_at FROM auth.users ORDER BY created_at DESC LIMIT 5;

-- Inserir notificações usando o primeiro usuário encontrado
-- (você pode substituir por um ID específico se souber qual é)
DO $$
DECLARE
    user_uuid UUID;
BEGIN
    -- Pegar o ID do primeiro usuário da tabela auth.users
    SELECT id INTO user_uuid FROM auth.users ORDER BY created_at DESC LIMIT 1;
    
    -- Verificar se encontrou um usuário
    IF user_uuid IS NOT NULL THEN
        -- Inserir notificações de teste
        INSERT INTO public.notifications (user_id, title, message, type, category, is_read, created_at, data) VALUES
        -- Notificação recente não lida (sucesso)
        (user_uuid, 'Importação Concluída', 'Suas transações foram importadas com sucesso. 67 transações foram processadas do arquivo CSV.', 'success', 'background_job', false, now() - interval '3 minutes', '{"job_type": "import", "records_processed": 67, "file_name": "transacoes-janeiro.csv"}'),
        
        -- Notificação de erro não lida
        (user_uuid, 'Erro na Categorização', 'Não foi possível categorizar 5 transações automaticamente. Revise manualmente.', 'error', 'background_job', false, now() - interval '15 minutes', '{"job_type": "categorization", "failed_count": 5, "total_count": 45}'),
        
        -- Notificação de transação não lida
        (user_uuid, 'Nova Transação Detectada', 'Transação de R$ -89,90 em AMAZON BRASIL foi adicionada ao seu cartão Nubank.', 'info', 'transaction', false, now() - interval '45 minutes', '{"amount": -89.90, "merchant": "AMAZON BRASIL", "card_name": "Nubank"}'),
        
        -- Notificação de aviso não lida
        (user_uuid, 'Limite do Cartão Próximo', 'Você atingiu 78% do limite do seu cartão Nubank. Considere fazer um pagamento.', 'warning', 'system', false, now() - interval '2 hours', '{"card_name": "Nubank", "usage_percentage": 78, "current_limit": 2500}'),
        
        -- Notificação já lida
        (user_uuid, 'Backup Realizado', 'Backup automático dos seus dados foi realizado com sucesso.', 'success', 'system', true, now() - interval '1 day', '{"backup_size": "2.3MB", "location": "cloud"}'),
        
        -- Notificação antiga já lida
        (user_uuid, 'Categorias Atualizadas', 'Suas categorias de transações foram sincronizadas com as regras mais recentes.', 'info', 'system', true, now() - interval '3 days', '{"categories_updated": 12, "new_rules": 3}');
        
        -- Mostrar o resultado
        RAISE NOTICE 'Notificações inseridas para o usuário: %', user_uuid;
    ELSE
        RAISE NOTICE 'Nenhum usuário encontrado na tabela auth.users';
    END IF;
END $$;

-- Verificar as notificações inseridas
SELECT 
    n.title, 
    n.type, 
    n.category, 
    n.is_read, 
    n.created_at,
    extract(epoch from (now() - n.created_at))/60 as minutes_ago,
    u.email as user_email
FROM public.notifications n
JOIN auth.users u ON n.user_id = u.id
ORDER BY n.created_at DESC;
