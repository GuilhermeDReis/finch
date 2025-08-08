import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, Upload, User as UserIcon, Sun, Moon, Monitor } from 'lucide-react';
import { useTheme } from 'next-themes';
import { getLogger } from '@/utils/logger';

const logger = getLogger('UserProfile');

const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB

export function UserProfile() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { theme, setTheme } = useTheme();
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState('');

  useEffect(() => {
    if (user) {
      loadUserProfile();
    }
  }, [user]);

  const loadUserProfile = async () => {
    if (!user) return;

    setLoading(true);
    try {
      // Usar os metadados do usuário do auth
      const userMetadata = user.user_metadata || {};
      setFirstName(userMetadata.first_name || '');
      setLastName(userMetadata.last_name || '');
      setEmail(user.email || '');
      setAvatarUrl(userMetadata.avatar_url || '');
    } catch (error) {
      logger.error('Erro ao carregar perfil', { error });
      toast({
        title: "Erro",
        description: "Não foi possível carregar os dados do perfil.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_FILE_SIZE) {
      toast({
        title: "Arquivo muito grande",
        description: "Por favor, selecione uma imagem menor que 2MB.",
        variant: "destructive",
      });
      return;
    }

    if (!file.type.startsWith('image/')) {
      toast({
        title: "Tipo inválido",
        description: "Por favor, selecione uma imagem válida.",
        variant: "destructive",
      });
      return;
    }

    setAvatarFile(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreviewUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const uploadAvatar = async (): Promise<string | null> => {
    if (!avatarFile || !user) return null;

    setUploading(true);
    try {
      const fileExt = avatarFile.name.split('.').pop();
      const fileName = `${user.id}-${Date.now()}.${fileExt}`;
      const filePath = `avatars/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('profiles')
        .upload(filePath, avatarFile, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('profiles')
        .getPublicUrl(filePath);

      return publicUrl;
    } catch (error) {
      logger.error('Erro ao fazer upload', { error });
      toast({
        title: "Erro no upload",
        description: "Não foi possível fazer upload da imagem.",
        variant: "destructive",
      });
      return null;
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    try {
      let finalAvatarUrl = avatarUrl;

      if (avatarFile) {
        const uploadedUrl = await uploadAvatar();
        if (uploadedUrl) {
          finalAvatarUrl = uploadedUrl;
        }
      }

      // Atualizar os metadados do usuário no auth
      const { error } = await supabase.auth.updateUser({
        data: {
          first_name: firstName,
          last_name: lastName,
          avatar_url: finalAvatarUrl,
        },
      });

      if (error) throw error;

      toast({
        title: "Sucesso!",
        description: "Perfil atualizado com sucesso.",
      });
    } catch (error) {
      logger.error('Erro ao atualizar perfil', { error });
      toast({
        title: "Erro",
        description: "Não foi possível atualizar o perfil.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const displayName = firstName && lastName ? `${firstName} ${lastName}` : email;
  const displayAvatar = previewUrl || avatarUrl;

  return (
    <div className="container mx-auto py-8 max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle>Perfil do Usuário</CardTitle>
          <CardDescription>
            Atualize suas informações pessoais e foto de perfil
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="flex flex-col items-center space-y-4">
              <Avatar className="h-24 w-24">
                <AvatarImage src={displayAvatar} alt={displayName} />
                <AvatarFallback>
                  {firstName && lastName
                    ? `${firstName[0]}${lastName[0]}`.toUpperCase()
                    : email?.[0]?.toUpperCase() || <UserIcon />}
                </AvatarFallback>
              </Avatar>
              
              <div className="text-center">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarChange}
                  className="hidden"
                  id="avatar-upload"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => document.getElementById('avatar-upload')?.click()}
                  disabled={uploading}
                  className="mx-auto"
                >
                  {uploading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Upload className="h-4 w-4 mr-2" />
                  )}
                  {uploading ? 'Enviando...' : 'Mudar foto'}
                </Button>
                <p className="text-xs text-muted-foreground mt-2 text-center">
                  Máximo 2MB. Formatos: JPG, PNG, GIF
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">Nome</Label>
                <Input
                  id="firstName"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="Seu nome"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="lastName">Sobrenome</Label>
                <Input
                  id="lastName"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Seu sobrenome"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                disabled
                className="bg-muted"
              />
              <p className="text-xs text-muted-foreground">
                O email não pode ser alterado
              </p>
            </div>

            <div className="space-y-4 pt-6 border-t">
              <div className="space-y-2">
                <Label className="text-base font-medium">Aparência</Label>
                <p className="text-sm text-muted-foreground">
                  Escolha como você deseja que a interface seja exibida
                </p>
              </div>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="flex items-center justify-center w-8 h-8 rounded-md bg-muted">
                      <Sun className="h-4 w-4" />
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Modo Claro</Label>
                      <p className="text-xs text-muted-foreground">Interface com cores claras</p>
                    </div>
                  </div>
                  <Switch
                    checked={theme === 'light'}
                    onCheckedChange={() => setTheme('light')}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="flex items-center justify-center w-8 h-8 rounded-md bg-muted">
                      <Moon className="h-4 w-4" />
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Modo Escuro</Label>
                      <p className="text-xs text-muted-foreground">Interface com cores escuras</p>
                    </div>
                  </div>
                  <Switch
                    checked={theme === 'dark'}
                    onCheckedChange={() => setTheme('dark')}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="flex items-center justify-center w-8 h-8 rounded-md bg-muted">
                      <Monitor className="h-4 w-4" />
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Sistema</Label>
                      <p className="text-xs text-muted-foreground">Usar configuração do sistema</p>
                    </div>
                  </div>
                  <Switch
                    checked={theme === 'system'}
                    onCheckedChange={() => setTheme('system')}
                  />
                </div>
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Salvando...
                </>
              ) : (
                'Salvar alterações'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
