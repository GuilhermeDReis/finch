
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import BackgroundJobIndicator from "@/components/BackgroundJobIndicator";
import NotificationCenterHybrid from "@/components/NotificationCenterHybrid";
import { UserProfileDropdown } from "@/components/UserProfileDropdown";

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />
        
        <div className="flex-1 flex flex-col">
          {/* Header com perfil do usuário, central de notificações e indicador de jobs */}
          <header className="flex justify-end items-center gap-3 pr-2 py-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
            <BackgroundJobIndicator />
            <NotificationCenterHybrid />
            <UserProfileDropdown />
          </header>
          
          <main className="flex-1 p-6">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
