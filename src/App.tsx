import { useState } from "react";
import { LoginScreen } from "./components/LoginScreen";
import { Dashboard } from "./components/Dashboard";
import { VentasModule } from "./components/VentasModule";
import { InventarioModule } from "./components/InventarioModule";
import { ContabilidadModule } from "./components/ContabilidadModule";
import { UsuariosModule } from "./components/UsuariosModule";
import { ProveedoresModule } from "./components/ProveedoresModule";
import { ServiciosModule } from "./components/ServiciosModule";
import { AperturaCajaModule } from "./components/AperturaCajaModule";
import { CierreCajaModule } from "./components/CierreCajaModule";
import { Button } from "./components/ui/button";
import { 
  LayoutDashboard, 
  ShoppingCart, 
  Package, 
  DollarSign, 
  Users, 
  Building2,
  Menu,
  X,
  Activity,
  LogOut,
  Unlock,
  Lock
} from "lucide-react";

const logoUrl = new URL("./components/figma/ISOTIPO.png", import.meta.url).href;



interface User {
  username: string;
  role: string;
  name: string;
}

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activeModule, setActiveModule] = useState("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [logoutHover, setLogoutHover] = useState(false);

  const allMenuItems = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, roles: ["Administrador"] },
    { id: "ventas", label: "Ventas", icon: ShoppingCart, roles: ["Administrador", "Vendedor"] },
    { id: "servicios", label: "Servicios", icon: Activity, roles: ["Administrador"] },
    { id: "inventario", label: "Inventario", icon: Package, roles: ["Administrador"] },
    { id: "contabilidad", label: "Contabilidad", icon: DollarSign, roles: ["Administrador"] },
    { id: "usuarios", label: "Usuarios", icon: Users, roles: ["Administrador"] },
    { id: "proveedores", label: "Proveedores", icon: Building2, roles: ["Administrador"] },
    { id: "apertura_caja", label: "Apertura de Caja", icon: Unlock, roles: ["Administrador", "Vendedor"] },
    { id: "cierre_caja", label: "Cierre de Caja", icon: Lock, roles: ["Administrador", "Vendedor"] },
  ];

  // Filtrar menús según el rol del usuario
  const menuItems = currentUser 
    ? allMenuItems.filter(item => item.roles.includes(currentUser.role))
    : allMenuItems;

  const handleLogin = (user: User) => {
    setCurrentUser(user);
    // Si es vendedor, redirigir a ventas en lugar de dashboard
    if (user.role === "Vendedor") {
      setActiveModule("ventas");
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setActiveModule("dashboard");
  };

  const renderModule = () => {
    switch (activeModule) {
      case "dashboard":
        return <Dashboard onNavigate={setActiveModule} currentUser={currentUser!} />;
      case "ventas":
        return currentUser ? <VentasModule currentUser={currentUser} /> : null;
      case "servicios":
        return <ServiciosModule />;
      case "inventario":
        return <InventarioModule />;
      case "contabilidad":
        return <ContabilidadModule />;
      case "usuarios":
        return <UsuariosModule />;
      case "proveedores":
        return <ProveedoresModule />;
      case "apertura_caja":
        return currentUser ? <AperturaCajaModule currentUser={currentUser} /> : null;
      case "cierre_caja":
        return currentUser ? <CierreCajaModule currentUser={currentUser} /> : null;
      default:
        return <Dashboard onNavigate={setActiveModule} currentUser={currentUser!} />;
    }
  };

  // Mostrar login si no hay usuario
  if (!currentUser) {
    return <LoginScreen onLogin={handleLogin} />;
  }

  return (
    <div className="flex h-screen bg-muted/30">
      {/* Sidebar */}
      <aside
        className={`${
          sidebarOpen ? "w-64" : "w-0"
        } transition-all duration-300 overflow-hidden flex flex-col`}
        style={{ backgroundColor: '#faf9f7', borderRight: '2px solid #9AAD97' }}
      >
        <div className="p-6 border-b" style={{ borderBottomColor: '#D5B888', backgroundColor: '#fff' }}>
          <div className="flex items-center gap-3">
            <img src={logoUrl} alt="Logo Botica MZ" style={{ width: '60px', height: '60px' }} />
            <div>
              <h1 className="text-xl font-bold" style={{ color: '#D5B888' }}>CONSALUD</h1>
              <p className="text-xs" style={{ color: '#9AAD97' }}>Sistema de Gestión</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-2">
          {menuItems.map((item, index) => {
            const Icon = item.icon;
            const isActive = activeModule === item.id;
            const isGreen = index % 2 === 0;
            const baseColor = isGreen ? '#9AAD97' : '#D5B888';
            
            return (
              <Button
                key={item.id}
                className={`w-full justify-start transition-all border-l-4`}
                style={{
                  backgroundColor: isActive ? baseColor : 'transparent',
                  color: isActive ? '#fff' : baseColor,
                  borderLeftColor: baseColor,
                }}
                onClick={() => setActiveModule(item.id)}
              >
                <Icon className="h-5 w-5 mr-3" />
                {item.label}
              </Button>
            );
          })}
        </nav>

        <div className="p-4 border-t" style={{ borderTopColor: '#9AAD97' }}>
          <div className="flex items-center gap-3 p-3 rounded-lg" style={{ backgroundColor: '#f0f0f0' }}>
            <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold" style={{ backgroundColor: '#9AAD97' }}>
              {currentUser.name.charAt(0)}
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium">{currentUser.name}</p>
              <p className="text-xs" style={{ color: '#9AAD97' }}>{currentUser.role}</p>
            </div>
          </div>
          <Button
            className="w-full justify-start mt-2 transition-all"
            style={{
              color: logoutHover ? '#ffffff' : '#D5B888',
              border: '2px solid #D5B888',
              backgroundColor: logoutHover ? '#D5B888' : 'transparent'
            }}
            onMouseEnter={() => setLogoutHover(true)}
            onMouseLeave={() => setLogoutHover(false)}
            onClick={handleLogout}
          >
            <LogOut className="h-4 w-4 mr-3" />
            Cerrar Sesión
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-background border-b border-border p-4 flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
          <div className="flex-1">
            <p className="text-sm text-muted-foreground">Sistema de Gestión de Farmacia</p>
          </div>
          <div className="text-sm text-muted-foreground">
            Lunes, 13 de Octubre 2025
          </div>
        </header>

        {/* Content Area */}
        <main className="flex-1 overflow-auto p-6">
          {renderModule()}
        </main>
      </div>
    </div>
  );
}