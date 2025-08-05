
import { BarChart3, CreditCard, FileText, Home, Settings, Upload, Menu, LogOut } from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";

const items = [
  { title: "Dashboard", url: "/dashboard", icon: BarChart3 },
  { title: "Início", url: "/", icon: Home },
  { title: "Transações", url: "/transactions", icon: CreditCard },
  { title: "Cartões de Crédito", url: "/credit-cards", icon: CreditCard },
  { title: "Importar Extrato", url: "/import", icon: Upload },
  { title: "Relatórios", url: "/reports", icon: FileText },
  { title: "Configurações", url: "/settings", icon: Settings },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const location = useLocation();
  const currentPath = location.pathname;
  const isCollapsed = state === "collapsed";
  const { user, signOut } = useAuth();

  const isActive = (path: string) => {
    if (path === "/") {
      return currentPath === "/" || currentPath === "/dashboard";
    }
    return currentPath === path || currentPath.startsWith(path);
  };

  const getNavCls = ({ isActive }: { isActive: boolean }) =>
    isActive 
      ? "bg-primary text-primary-foreground" 
      : "text-muted-foreground hover:bg-muted hover:text-foreground";

  return (
    <Sidebar
      className="border-r bg-background"
      collapsible="icon"
    >
      <SidebarHeader className={`border-b ${isCollapsed ? 'p-2' : 'p-3'}`}>
        <div className="flex items-center justify-between">
          <div className={`flex items-center ${isCollapsed ? 'justify-center w-full' : 'gap-2'}`}>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <FileText className="h-5 w-5 text-primary-foreground" />
            </div>
            {!isCollapsed && (
              <div className="flex flex-col">
                <span className="text-sm font-semibold text-foreground">
                  FinanceApp
                </span>
              </div>
            )}
          </div>
        </div>
        
        {/* Trigger sempre visível */}
        <div className={`${isCollapsed ? 'flex justify-center mt-2' : 'absolute top-3 right-3'}`}>
          <SidebarTrigger className="h-7 w-7 p-0 hover:bg-muted rounded-md transition-colors">
            <Menu className="h-4 w-4" />
          </SidebarTrigger>
        </div>
      </SidebarHeader>

      <SidebarContent className={isCollapsed ? 'p-1' : 'p-2'}>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton 
                    asChild 
                    className={`h-12 ${isCollapsed ? 'justify-center px-2 mx-1' : 'justify-start px-3'} transition-all duration-200`}
                  >
                    <NavLink
                      to={item.url}
                      end={item.url === "/"}
                      className={getNavCls}
                      title={isCollapsed ? item.title : undefined}
                    >
                      <div className={`flex items-center ${isCollapsed ? 'justify-center w-full' : 'w-auto'}`}>
                        <item.icon className={`h-5 w-5 flex-shrink-0 ${isCollapsed ? '' : 'mr-3'}`} />
                        {!isCollapsed && (
                          <span className="transition-opacity duration-200 overflow-hidden">
                            {item.title}
                          </span>
                        )}
                      </div>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      
      <SidebarFooter className={`border-t ${isCollapsed ? 'p-1' : 'p-2'}`}>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {user?.email && (
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to="/profile"
                      className="flex items-center gap-2 p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
                      title={isCollapsed ? 'Perfil' : undefined}
                    >
                      <Avatar className={`${isCollapsed ? 'h-9 w-9 mx-auto rounded-full' : 'h-6 w-6'}`}>
                        <AvatarImage 
                          src={user.user_metadata?.avatar_url} 
                          alt={user.user_metadata?.first_name || user.user_metadata?.full_name || user.email} 
                          className="object-cover"
                        />
                        <AvatarFallback className={`${isCollapsed ? 'h-9 w-9' : 'h-6 w-6'} text-xs`}>
                          {user.user_metadata?.first_name?.[0] || user.user_metadata?.full_name?.[0] || user.email?.[0]?.toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      {!isCollapsed && (
                        <span className="text-sm truncate">
                          {user.user_metadata?.first_name || user.user_metadata?.full_name || user.email}
                        </span>
                      )}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
              <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <Button
                      variant="ghost"
                      onClick={signOut}
                      className={`w-full gap-2 p-2 h-12 ${isCollapsed ? 'justify-center px-2 mx-1' : 'justify-start'}`}
                      title={isCollapsed ? 'Sair' : undefined}
                    >
                      <div className={`flex items-center ${isCollapsed ? 'justify-center w-full' : 'w-auto'}`}>
                        <LogOut className="h-5 w-5" />
                        {!isCollapsed && <span className="ml-2">Sair</span>}
                      </div>
                    </Button>
                  </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarFooter>
    </Sidebar>
  );
}
