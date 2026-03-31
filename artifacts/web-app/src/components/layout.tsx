import { Link, useLocation } from "wouter";
import { LayoutDashboard, Files, Users, Building2, Calculator, UsersRound } from "lucide-react";
import { cn } from "@/lib/utils";

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Applications", href: "/applications", icon: Files },
  { name: "Borrowers", href: "/borrowers", icon: Users },
  { name: "Properties", href: "/properties", icon: Building2 },
  { name: "Calculator", href: "/calculator", icon: Calculator },
  { name: "Users", href: "/users", icon: UsersRound },
];

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();

  return (
    <div className="flex h-screen bg-gray-50/50">
      <div className="w-64 bg-sidebar text-sidebar-foreground flex flex-col shrink-0">
        <div className="h-16 flex items-center px-6 border-b border-sidebar-accent font-bold text-lg tracking-tight">
          CRE Nexus
        </div>
        <nav className="flex-1 overflow-y-auto py-4">
          <ul className="space-y-1 px-3">
            {navigation.map((item) => {
              const isActive = location === item.href || (item.href !== "/dashboard" && location.startsWith(item.href));
              return (
                <li key={item.name}>
                  <Link
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                      isActive
                        ? "bg-sidebar-accent text-sidebar-accent-foreground"
                        : "text-sidebar-foreground/80 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                    )}
                  >
                    <item.icon className="h-4 w-4" />
                    {item.name}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>
      <main className="flex-1 overflow-auto bg-gray-50 flex flex-col">
        <div className="h-16 flex items-center px-8 border-b bg-white shrink-0 shadow-sm">
          <div className="text-sm font-medium text-muted-foreground capitalize flex items-center gap-2">
            <span>{location.split('/')[1] || 'Dashboard'}</span>
          </div>
        </div>
        <div className="flex-1 p-8">
          <div className="mx-auto max-w-6xl">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
