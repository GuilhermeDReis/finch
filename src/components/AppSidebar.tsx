
import { BarChart3, CreditCard, FileText, Home, Settings, Upload, Menu, User, LogOut } from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";

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
          
          {!isCollapsed && (
            <SidebarTrigger className="h-7 w-7 p-0 hover:bg-muted rounded-md transition-colors">
              <Menu className="h-4 w-4" />
            </SidebarTrigger>
          )}
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
                    className={`h-12 ${isCollapsed ? 'justify-center px-0 mx-1' : 'justify-start px-3'} transition-all duration-200`}
                  >
                    <NavLink
                      to={item.url}
                      end={item.url === "/"}
                      className={getNavCls}
                      title={isCollapsed ? item.title : undefined}
                    >
                      <item.icon className={`h-5 w-5 flex-shrink-0 ${isCollapsed ? '' : 'mr-3'}`} />
                      {!isCollapsed && (
                        <span className="transition-opacity duration-200 overflow-hidden">
                          {item.title}
                        </span>
                      )}
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
              {!isCollapsed && user?.email && (
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <div className="flex items-center gap-2 p-2 text-muted-foreground">
                      <User className="h-4 w-4" />
                      <span className="text-sm truncate">{user.email}</span>
                    </div>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <Button
                    variant="ghost"
                    onClick={signOut}
                    className={`w-full gap-2 p-2 h-12 ${isCollapsed ? 'justify-center px-0 mx-1' : 'justify-start'}`}
                    title={isCollapsed ? 'Sair' : undefined}
                  >
                    <LogOut className="h-4 w-4" />
                    {!isCollapsed && 'Sair'}
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
