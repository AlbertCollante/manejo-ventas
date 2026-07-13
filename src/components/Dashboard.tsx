import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Package, ShoppingCart, Users, TrendingUp, DollarSign, AlertTriangle } from "lucide-react";
import { useState, useEffect } from "react";
import { dataService } from "../services/dataService";

interface DashboardProps {
  onNavigate: (module: string) => void;
  currentUser: {
    username: string;
    role: string;
    name: string;
  };
}

export function Dashboard({ onNavigate, currentUser }: DashboardProps) {
  const [ventasDelDia, setVentasDelDia] = useState(0);
  const [ventasDelDiaCompare, setVentasDelDiaCompare] = useState(0);
  const [totalProductos, setTotalProductos] = useState(0);
  const [clientesRegistrados, setClientesRegistrados] = useState(0);
  const [gananciasPromedioMensual, setGananciasPromedioMensual] = useState(0);
  const [productosStockBajo, setProductosStockBajo] = useState<any[]>([]);
  const [ventasRecientes, setVentasRecientes] = useState<any[]>([]);

  useEffect(() => {
    // Ventas del día actual
    const salesHoy = dataService.getSalesToday();
    const totalVentasHoy = salesHoy.reduce((sum, v) => sum + v.total, 0);
    setVentasDelDia(totalVentasHoy);

    // Ventas de ayer para comparativa
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];
    const salesYesterday = dataService.getSalesByDateRange(yesterdayStr, yesterdayStr);
    const totalVentasYesterday = salesYesterday.reduce((sum, v) => sum + v.total, 0);
    
    const percentageChange = totalVentasYesterday > 0 
      ? ((totalVentasHoy - totalVentasYesterday) / totalVentasYesterday) * 100 
      : (totalVentasHoy > 0 ? 100 : 0);
    setVentasDelDiaCompare(percentageChange);

    // Total de productos en stock
    const productos = dataService.getProducts();
    const stockTotal = productos.reduce((sum, p) => sum + p.stock, 0);
    setTotalProductos(stockTotal);

    // Clientes únicos registrados
    const allSales = dataService.getSales();
    const uniqueCustomers = new Set(allSales.map(s => s.customer));
    setClientesRegistrados(uniqueCustomers.size);

    // Ganancias mensuales - promedio de últimos cierres de caja
    const cierres = dataService.getCashClosures();
    const thisMonth = new Date().getMonth();
    const thisYear = new Date().getFullYear();
    const cierresMes = cierres.filter(c => {
      const closureDate = new Date(c.fecha);
      return closureDate.getMonth() === thisMonth && closureDate.getFullYear() === thisYear;
    });
    const gananciasTotal = cierresMes.reduce((sum, c) => sum + c.totalVentas, 0);
    setGananciasPromedioMensual(gananciasTotal);

    // Productos con stock bajo
    const lowStock = productos
      .filter(p => p.stock < p.minStock)
      .sort((a, b) => a.stock - b.stock);
    setProductosStockBajo(lowStock);

    // Ventas recientes (últimas 5) con filtro por rol
    let recentSales = allSales
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 5);

    if (currentUser && currentUser.role && currentUser.role.toLowerCase() === 'vendedor') {
      recentSales = recentSales.filter(s => s.user === currentUser.name);
    }

    setVentasRecientes(recentSales);
  }, []);

  const stats = [
    {
      title: "Ventas del Día",
      value: `S/ ${ventasDelDia.toFixed(2)}`,
      change: `${ventasDelDiaCompare >= 0 ? '+' : ''}${ventasDelDiaCompare.toFixed(1)}% vs ayer`,
      icon: ShoppingCart,
      color: "text-blue-600",
      bgColor: "bg-blue-100",
    },
    {
      title: "Productos en Stock",
      value: totalProductos.toString(),
      change: `${dataService.getProducts().length} productos activos`,
      icon: Package,
      color: "text-green-600",
      bgColor: "bg-green-100",
    },
    {
      title: "Clientes Registrados",
      change: `${Math.max(0, clientesRegistrados - 5)} nuevos esta semana`,
      value: clientesRegistrados.toString(),
      icon: Users,
      color: "text-purple-600",
      bgColor: "bg-purple-100",
    },
    {
      title: "Ganancias Mensuales",
      value: `S/ ${gananciasPromedioMensual.toFixed(2)}`,
      change: `${Math.ceil(gananciasPromedioMensual / Math.max(1, dataService.getCashClosures().filter(c => {
        const closureDate = new Date(c.fecha);
        const thisMonth = new Date().getMonth();
        const thisYear = new Date().getFullYear();
        return closureDate.getMonth() === thisMonth && closureDate.getFullYear() === thisYear;
      }).length))} promedio por cierre`,
      icon: TrendingUp,
      color: "text-orange-600",
      bgColor: "bg-orange-100",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 style={{ color: '#D5B888' }}>Dashboard Principal</h2>
        <p className="text-muted-foreground">Resumen general del sistema</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          const isGreen = index % 2 === 0;
          const borderColor = isGreen ? '#9AAD97' : '#D5B888';
          const bgColor = isGreen ? 'rgba(154, 173, 151, 0.1)' : 'rgba(213, 184, 136, 0.1)';
          const textColor = isGreen ? '#9AAD97' : '#D5B888';
          return (
            <Card key={index} style={{ borderTop: `4px solid ${borderColor}` }}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm" style={{ color: textColor }}>{stat.title}</CardTitle>
                <div style={{ padding: '0.5rem', borderRadius: '0.5rem', backgroundColor: bgColor }}>
                  <Icon className="h-4 w-4" style={{ color: textColor }} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-1">
                  <div style={{ color: textColor, fontWeight: 'bold', fontSize: '1.25rem' }}>{stat.value}</div>
                  <p className="text-xs text-muted-foreground">{stat.change}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="h-[420px] flex flex-col" style={{ borderTop: '4px solid #D5B888' }}>
          <CardHeader>
            <CardTitle style={{ color: '#D5B888' }}>Productos con Stock Bajo</CardTitle>
          </CardHeader>
          <CardContent className="overflow-hidden" style={{ height: "420px" }}>
            <div className="space-y-4 h-full overflow-y-auto pr-1" >
              {productosStockBajo.length > 0 ? (
                productosStockBajo.map((product, index) => (
                  <div key={index} className="flex items-center justify-between border-b pb-3 last:border-b-0">
                    <div className="flex items-center gap-3">
                      <AlertTriangle className="h-5 w-5 text-orange-600" />
                      <div>
                        <p>{product.name}</p>
                        <p className="text-sm text-muted-foreground">
                          Stock actual: {product.stock} (Mín: {product.minStock})
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => onNavigate('inventario')}
                      className="text-sm hover:underline"
                      style={{ color: '#9AAD97' }}
                    >
                      Ver
                    </button>
                  </div>
                ))
              ) : (
                <p className="text-muted-foreground text-center py-4">Todos los productos tienen stock suficiente ✓</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card style={{ borderTop: '4px solid #9AAD97' }}>
          <CardHeader>
            <CardTitle style={{ color: '#9AAD97' }}>Ventas Recientes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {ventasRecientes.length > 0 ? (
                ventasRecientes.map((sale, index) => (
                  <div key={index} className="flex items-center justify-between border-b pb-3 last:border-b-0">
                    <div>
                      <p>{sale.customer}</p>
                      <p className="text-sm text-muted-foreground">{sale.date}</p>
                    </div>
                    <div className="text-right">
                      <p>S/ {sale.total.toFixed(2)}</p>
                      <p className="text-sm text-muted-foreground">{sale.id}</p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-muted-foreground text-center py-4">No hay ventas registradas hoy</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => onNavigate('ventas')} style={{ borderTop: '4px solid #D5B888' }}>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg" style={{ backgroundColor: 'rgba(213, 184, 136, 0.1)' }}>
                <ShoppingCart className="h-6 w-6" style={{ color: '#D5B888' }} />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Ir a</p>
                <p style={{ color: '#D5B888', fontWeight: 'bold' }}>Módulo de Ventas</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => onNavigate('servicios')} style={{ borderTop: '4px solid #9AAD97' }}>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg" style={{ backgroundColor: 'rgba(154, 173, 151, 0.1)' }}>
                <TrendingUp className="h-6 w-6" style={{ color: '#9AAD97' }} />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Ir a</p>
                <p style={{ color: '#9AAD97', fontWeight: 'bold' }}>Módulo de Servicios</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => onNavigate('inventario')} style={{ borderTop: '4px solid #D5B888' }}>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg" style={{ backgroundColor: 'rgba(213, 184, 136, 0.1)' }}>
                <Package className="h-6 w-6" style={{ color: '#D5B888' }} />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Ir a</p>
                <p style={{ color: '#D5B888', fontWeight: 'bold' }}>Módulo de Inventario</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => onNavigate('contabilidad')} style={{ borderTop: '4px solid #9AAD97' }}>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg" style={{ backgroundColor: 'rgba(154, 173, 151, 0.1)' }}>
                <DollarSign className="h-6 w-6" style={{ color: '#9AAD97' }} />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Ir a</p>
                <p style={{ color: '#9AAD97', fontWeight: 'bold' }}>Módulo de Contabilidad</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
