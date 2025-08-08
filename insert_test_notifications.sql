-- Script para inserir notificações de teste
-- Execute este script após criar a tabela de notificações
-- Substitua 'YOUR_USER_ID_HERE' pelo ID real do usuário autenticado

-- Verificar se existe um usuário autenticado
-- SELECT id FROM auth.users LIMIT 1;

-- Inserir notificações de teste (substitua o user_id pelo ID real)
INSERT INTO public.notifications (user_id, title, message, type, category, is_read, created_at, data) VALUES
-- Notificação recente não lida
((SELECT id FROM auth.users LIMIT 1), 'Importação Concluída', 'Suas transações foram importadas com sucesso. 67 transações foram processadas do arquivo CSV.', 'success', 'background_job', false, now() - interval '3 minutes', '{"job_type": "import", "records_processed": 67, "file_name": "transacoes-janeiro.csv"}'),

-- Notificação de erro não lida
((SELECT id FROM auth.users LIMIT 1), 'Erro na Categorização', 'Não foi possível categorizar 5 transações automaticamente. Revise manualmente.', 'error', 'background_job', false, now() - interval '15 minutes', '{"job_type": "categorization", "failed_count": 5, "total_count": 45}'),

-- Notificação de transação não lida
((SELECT id FROM auth.users LIMIT 1), 'Nova Transação Detectada', 'Transação de R$ -89,90 em AMAZON BRASIL foi adicionada ao seu cartão Nubank.', 'info', 'transaction', false, now() - interval '45 minutes', '{"amount": -89.90, "merchant": "AMAZON BRASIL", "card_name": "Nubank"}'),

-- Notificação de aviso não lida
((SELECT id FROM auth.users LIMIT 1), 'Limite do Cartão Próximo', 'Você atingiu 78% do limite do seu cartão Nubank. Considere fazer um pagamento.', 'warning', 'system', false, now() - interval '2 hours', '{"card_name": "Nubank", "usage_percentage": 78, "current_limit": 2500}'),

-- Notificação já lida
((SELECT id FROM auth.users LIMIT 1), 'Backup Realizado', 'Backup automático dos seus dados foi realizado com sucesso.', 'success', 'system', true, now() - interval '1 day', '{"backup_size": "2.3MB", "location": "cloud"}'),

-- Notificação antiga já lida
((SELECT id FROM auth.users LIMIT 1), 'Categorias Atualizadas', 'Suas categorias de transações foram sincronizadas com as regras mais recentes.', 'info', 'system', true, now() - interval '3 days', '{"categories_updated": 12, "new_rules": 3}');

-- Verificar se as notificações foram inseridas
SELECT 
    title, 
    type, 
    category, 
    is_read, 
    created_at,
    extract(epoch from (now() - created_at))/60 as minutes_ago
FROM public.notifications 
ORDER BY created_at DESC;
