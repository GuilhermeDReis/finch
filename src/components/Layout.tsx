
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import BackgroundJobIndicator from "@/components/BackgroundJobIndicator";
import NotificationCenterHybrid from "@/components/NotificationCenterHybrid";

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />
        
        <div className="flex-1 flex flex-col">
          {/* Header com central de notificações e indicador de jobs */}
          <header className="flex justify-end items-center gap-2 p-4 border-b">
            <BackgroundJobIndicator />
            <NotificationCenterHybrid />
          </header>
          
          <main className="flex-1 p-6">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
