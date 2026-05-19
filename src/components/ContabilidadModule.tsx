import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { TrendingUp, TrendingDown, DollarSign, Receipt, Plus, Calendar, FileText, Download } from "lucide-react";
import { Badge } from "./ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Button } from "./ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Textarea } from "./ui/textarea";
import * as XLSX from "xlsx";
import contabilidadData from "../data/contabilidad.json";

const API_BASE = 'http://localhost:9000';

export function ContabilidadModule() {
  const [egresos, setEgresos] = useState(contabilidadData.egresos);
  const [ingresos, setIngresos] = useState<any[]>([]);
  const [productos, setProductos] = useState<any[]>([]);
  
  const [newExpense, setNewExpense] = useState({
    concept: "",
    amount: "",
    type: "",
    description: "",
    date: new Date().toISOString().split('T')[0]
  });
  
  const [filterStartDate, setFilterStartDate] = useState("");
  const [filterEndDate, setFilterEndDate] = useState("");
  const [selectedDate, setSelectedDate] = useState("");
  const [montoRemesado, setMontoRemesado] = useState("");
  const [montoDejado, setMontoDejado] = useState("");

  // Cargar datos de la API
  useEffect(() => {
    const loadData = async () => {
      try {
        // Cargar ventas desde API
        const ventasRes = await fetch(`${API_BASE}/ventas`);
        if (ventasRes.ok) {
          const ventasData = await ventasRes.json();
          if (Array.isArray(ventasData)) {
            const normalized = ventasData.map((v: any) => ({
              id: v.id ?? v.idventa ?? null,
              date: v.fecha ?? v.date ?? new Date().toISOString(),
              concept: v.cliente || v.customer || 'Cliente General',
              total: Number(v.total ?? 0),
              type: 'Venta'
            }));
            setIngresos(normalized);
          }
        }
      } catch (error) {
        console.error('Error cargando ventas:', error);
      }

      try {
        // Cargar productos desde API
        const productosRes = await fetch(`${API_BASE}/inventario-productos`);
        if (productosRes.ok) {
          const productosData = await productosRes.json();
          if (Array.isArray(productosData)) {
            const normalized = productosData.map((p: any) => ({
              id: p.id ?? p.idproducto ?? null,
              name: p.nombre ?? p.name ?? '',
              purchasePrice: Number(p.precio_compra ?? p.purchasePrice ?? 0),
              date: p.id ?? p.idproducto ?? ''
            }));
            setProductos(normalized);
          }
        }
      } catch (error) {
        console.error('Error cargando productos:', error);
      }
    };

    loadData();
  }, []);
  
  const filterByDate = (items: any[]) => {
    if (!filterStartDate && !filterEndDate) return items;
    
    return items.filter(item => {
      const rawDate = item.date || item.fecha || new Date().toISOString();
      const dateStr = typeof rawDate === 'string' ? rawDate : new Date(rawDate).toISOString();
      const itemDate = dateStr.includes('/') 
        ? new Date(dateStr.split('/').reverse().join('-'))
        : new Date(dateStr);
      const start = filterStartDate ? new Date(filterStartDate) : null;
      const end = filterEndDate ? new Date(filterEndDate) : null;
      
      if (start && end) {
        return itemDate >= start && itemDate <= end;
      } else if (start) {
        return itemDate >= start;
      } else if (end) {
        return itemDate <= end;
      }
      return true;
    });
  };

  const filteredIngresos = filterByDate(ingresos);
  const filteredEgresos = filterByDate(productos.map(p => ({
    ...p,
    amount: p.purchasePrice,
    concept: p.name,
    type: 'Compra'
  })));
  
  // Sumatoria de ingresos (total de ventas)
  const totalIngresos = filteredIngresos.reduce((sum, item) => sum + (item.total || 0), 0);
  
  // Sumatoria de egresos (suma de precios de compra de productos)
  const totalEgresos = filteredEgresos.reduce((sum, item) => sum + (item.amount || 0), 0);
  
  const balance = totalIngresos - totalEgresos;

  /*
  const estadoResultados = {
    ventasBrutas: ingresos.reduce((sum, item) => sum + item.amount, 0),
    costoVentas: egresos.filter(e => e.type === "Compra").reduce((sum, item) => sum + item.amount, 0),
    gastoOperativos: egresos.filter(e => e.type === "Servicios").reduce((sum, item) => sum + item.amount, 0),
    gastosAdmin: egresos.filter(e => e.type === "Nómina").reduce((sum, item) => sum + item.amount, 0),
    otrosGastos: egresos.filter(e => e.type === "Mantenimiento").reduce((sum, item) => sum + item.amount, 0),
  };

  const utilidadBruta = estadoResultados.ventasBrutas - estadoResultados.costoVentas;
  const utilidadOperativa = utilidadBruta - estadoResultados.gastoOperativos;
  const utilidadNeta = utilidadOperativa - estadoResultados.gastosAdmin - estadoResultados.otrosGastos;
  */

  const handleAddExpense = () => {
    if (!newExpense.concept || !newExpense.amount || !newExpense.type) {
      alert("Por favor complete todos los campos obligatorios");
      return;
    }
    
    const newEgreso = {
      id: egresos.length + 1,
      date: newExpense.date.split('-').reverse().join('/'),
      concept: newExpense.concept,
      amount: parseFloat(newExpense.amount),
      type: newExpense.type === "compra" ? "Compra" : 
            newExpense.type === "servicios" ? "Servicios" :
            newExpense.type === "nomina" ? "Nómina" :
            newExpense.type === "alquiler" ? "Alquiler" :
            newExpense.type === "mantenimiento" ? "Mantenimiento" : "Otros"
    };
    
    setEgresos([newEgreso, ...egresos]);
    alert(`Gasto registrado: ${newExpense.concept} - S/ ${newExpense.amount}\nFecha: ${newExpense.date}`);
    setNewExpense({ concept: "", amount: "", type: "", description: "", date: new Date().toISOString().split('T')[0] });
  };

  const handleSendEmail = () => {
    if (!filterStartDate && !filterEndDate) {
      alert("Por favor seleccione al menos una fecha para generar el reporte");
      return;
    }
    
    // Crear un nuevo libro de Excel
    const wb = XLSX.utils.book_new();
    
    // Preparar datos para la hoja de Ingresos
    const ingresosData = filteredIngresos.map(item => ({
      'Fecha': item.date,
      'Concepto': item.concept,
      'Tipo': item.type,
      'Monto': item.amount
    }));
    
    // Preparar datos para la hoja de Egresos
    const egresosData = filteredEgresos.map(item => ({
      'Fecha': item.date,
      'Concepto': item.concept,
      'Tipo': item.type,
      'Monto': item.amount
    }));
    
    // Preparar datos para la hoja de Resumen
    const resumenData = [
      { 'Concepto': 'Total Ingresos', 'Monto': totalIngresos },
      { 'Concepto': 'Total Egresos', 'Monto': totalEgresos },
      { 'Concepto': 'Balance', 'Monto': balance },
      { 'Concepto': '', 'Monto': '' },
      { 'Concepto': 'Desgloses de Egresos', 'Monto': '' },
      { 'Concepto': 'Compras', 'Monto': filteredEgresos.filter(e => e.type === 'Compra').reduce((sum, e) => sum + e.amount, 0) },
      { 'Concepto': 'Servicios', 'Monto': filteredEgresos.filter(e => e.type === 'Servicios').reduce((sum, e) => sum + e.amount, 0) },
      { 'Concepto': 'Nómina', 'Monto': filteredEgresos.filter(e => e.type === 'Nómina').reduce((sum, e) => sum + e.amount, 0) },
      { 'Concepto': 'Mantenimiento', 'Monto': filteredEgresos.filter(e => e.type === 'Mantenimiento').reduce((sum, e) => sum + e.amount, 0) }
    ];
    
    // Crear hojas del libro
    const wsIngresos = XLSX.utils.json_to_sheet(ingresosData);
    const wsEgresos = XLSX.utils.json_to_sheet(egresosData);
    const wsResumen = XLSX.utils.json_to_sheet(resumenData);
    
    // Ajustar ancho de columnas
    const colWidth = [{ wch: 15 }, { wch: 30 }, { wch: 15 }, { wch: 15 }];
    wsIngresos['!cols'] = colWidth;
    wsEgresos['!cols'] = colWidth;
    wsResumen['!cols'] = [{ wch: 25 }, { wch: 15 }];
    
    // Agregar hojas al libro
    XLSX.utils.book_append_sheet(wb, wsIngresos, "Ingresos");
    XLSX.utils.book_append_sheet(wb, wsEgresos, "Egresos");
    XLSX.utils.book_append_sheet(wb, wsResumen, "Resumen");
    
    // Generar archivo y descargarlo
    const fechaInicio = filterStartDate || "Inicio";
    const fechaFin = filterEndDate || "Fin";
    const nombreArchivo = `Reporte_Contabilidad_${fechaInicio}_${fechaFin}.xlsx`;
    
    XLSX.writeFile(wb, nombreArchivo);
    alert(`Reporte generado y descargado: ${nombreArchivo}`);
  };

  const handleReceipt = () => {
    const remesado = parseFloat(montoRemesado) || 0;
    const dejado = parseFloat(montoDejado) || 0;
    const total = remesado + dejado;
    
    alert(`Monto Total: S/ ${total.toFixed(2)}\nRemesado: S/ ${remesado.toFixed(2)}\nDejado: S/ ${dejado.toFixed(2)}`);
  };

  // Detalle por día
  const getDetailByDate = () => {
    if (!selectedDate) return null;
    
    // Convertir formato YYYY-MM-DD a DD/MM/YYYY
    const [year, month, day] = selectedDate.split('-');
    const formattedDate = `${day}/${month}/${year}`;
    
    const ingresosDelDia = ingresos.filter(i => i.date === formattedDate);
    const egresosDelDia = egresos.filter(e => e.date === formattedDate);
    const totalIngresosDelDia = ingresosDelDia.reduce((sum, i) => sum + i.amount, 0);
    const totalEgresosDelDia = egresosDelDia.reduce((sum, e) => sum + e.amount, 0);
    
    return {
      ingresos: ingresosDelDia,
      egresos: egresosDelDia,
      totalIngresos: totalIngresosDelDia,
      totalEgresos: totalEgresosDelDia,
      balance: totalIngresosDelDia - totalEgresosDelDia,
      date: formattedDate
    };
  };

  const detalleDia = getDetailByDate();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 style={{ color: '#9AAD97' }}>Módulo de Contabilidad</h2>
          <p className="text-muted-foreground">Gestión financiera y reportes contables</p>
        </div>
        {/* Botón comentado: Agregar Gasto
        <Dialog>
          <DialogTrigger asChild>
            <Button style={{ backgroundColor: '#D5B888', color: 'white', border: 'none' }}>
              <Plus className="h-4 w-4 mr-2" />
              Agregar Gasto
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Registrar Nuevo Gasto</DialogTitle>
              <DialogDescription>
                Complete la información del gasto a registrar
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Concepto *</Label>
                <Input
                  placeholder="Ej: Pago de servicios, Salarios, Compra de suministros"
                  value={newExpense.concept}
                  onChange={(e) => setNewExpense({ ...newExpense, concept: e.target.value })}
                />
              </div>
              <div>
                <Label>Tipo de Gasto *</Label>
                <Select value={newExpense.type} onValueChange={(value: any) => setNewExpense({ ...newExpense, type: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="compra">Compra de Inventario</SelectItem>
                    <SelectItem value="servicios">Servicios (Luz, Agua, Internet)</SelectItem>
                    <SelectItem value="nomina">Nómina y Salarios</SelectItem>
                    <SelectItem value="alquiler">Alquiler</SelectItem>
                    <SelectItem value="mantenimiento">Mantenimiento</SelectItem>
                    <SelectItem value="otros">Otros Gastos</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Monto *</Label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={newExpense.amount}
                  onChange={(e) => setNewExpense({ ...newExpense, amount: e.target.value })}
                />
              </div>
              <div>
                <Label>Fecha *</Label>
                <Input
                  type="date"
                  value={newExpense.date}
                  onChange={(e) => setNewExpense({ ...newExpense, date: e.target.value })}
                />
              </div>
              <div>
                <Label>Descripción (opcional)</Label>
                <Textarea
                  placeholder="Detalles adicionales del gasto"
                  value={newExpense.description}
                  onChange={(e) => setNewExpense({ ...newExpense, description: e.target.value })}
                />
              </div>
              <Button className="w-full" onClick={handleAddExpense} style={{ backgroundColor: '#9AAD97', color: 'white', border: 'none' }}>
                Registrar Gasto
              </Button>
            </div>
          </DialogContent>
        </Dialog>
        */}</div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card style={{ borderTop: '4px solid #9AAD97' }}>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg" style={{ backgroundColor: 'rgba(154, 173, 151, 0.1)' }}>
                <TrendingUp className="h-6 w-6" style={{ color: '#9AAD97' }} />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Ingresos</p>
                <p className="text-xl" style={{ color: '#9AAD97', fontWeight: 'bold' }}>S/ {totalIngresos.toFixed(2)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card style={{ borderTop: '4px solid #D5B888' }}>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg" style={{ backgroundColor: 'rgba(213, 184, 136, 0.1)' }}>
                <TrendingDown className="h-6 w-6" style={{ color: '#D5B888' }} />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Egresos</p>
                <p className="text-xl" style={{ color: '#D5B888', fontWeight: 'bold' }}>S/ {totalEgresos.toFixed(2)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card style={{ borderTop: '4px solid #9AAD97' }}>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg" style={{ backgroundColor: 'rgba(154, 173, 151, 0.1)' }}>
                <DollarSign className="h-6 w-6" style={{ color: '#9AAD97' }} />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Balance</p>
                <p className="text-xl" style={{ color: '#9AAD97', fontWeight: 'bold' }}>S/ {balance.toFixed(2)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Card comentado: Utilidad Neta
        <Card style={{ borderTop: '4px solid #D5B888' }}>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg" style={{ backgroundColor: 'rgba(213, 184, 136, 0.1)' }}>
                <Receipt className="h-6 w-6" style={{ color: '#D5B888' }} />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Utilidad Neta</p>
                <p className="text-xl" style={{ color: '#D5B888', fontWeight: 'bold' }}>S/ {utilidadNeta.toFixed(2)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        */}
      </div>

      <Tabs defaultValue="movimientos">
        <TabsList>
          <TabsTrigger value="movimientos">Movimientos</TabsTrigger>
          {/* <TabsTrigger value="estado">Estado de Resultados</TabsTrigger> */}
        </TabsList>

        <TabsContent value="movimientos" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card style={{ borderTop: '4px solid #D5B888' }}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2" style={{ color: '#D5B888' }}>
                  <TrendingUp className="h-5 w-5" />
                  Ingresos Recientes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div style={{ maxHeight: '400px', overflowY: 'auto', overflowX: 'hidden' }}>
                  <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Concepto</TableHead>
                      <TableHead>Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredIngresos.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>{new Date(item.date).toLocaleDateString('es-PE')}</TableCell>
                        <TableCell>
                          <p className="text-sm">{item.concept}</p>
                        </TableCell>
                        <TableCell style={{ color: '#9AAD97', fontWeight: 'bold' }}>
                          + S/ {(item.total || 0).toFixed(2)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                </div>
              </CardContent>
            </Card>

            <Card style={{ borderTop: '4px solid #9AAD97' }}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2" style={{ color: '#9AAD97' }}>
                  <TrendingDown className="h-5 w-5" />
                  Egresos Recientes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div style={{ maxHeight: '400px', overflowY: 'auto', overflowX: 'hidden' }}>
                  <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID</TableHead>
                      <TableHead>Producto</TableHead>
                      <TableHead>Precio Compra</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredEgresos.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>{item.id}</TableCell>
                        <TableCell>
                          <p className="text-sm">{item.concept}</p>
                        </TableCell>
                        <TableCell style={{ color: '#D5B888', fontWeight: 'bold' }}>
                          - S/ {(item.amount || 0).toFixed(2)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Tab comentada: Estado de Resultados
        <TabsContent value="estado">
          <Card style={{ borderTop: '4px solid #D5B888' }}>
            <CardHeader>
              <CardTitle style={{ color: '#D5B888' }}>Estado de Resultados - Octubre 2025</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="space-y-3">
                  <div className="flex justify-between items-center border-b pb-2">
                    <span>Ventas Brutas</span>
                    <span>S/ {estadoResultados.ventasBrutas.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center text-red-600">
                    <span>(-) Costo de Ventas</span>
                    <span>S/ {estadoResultados.costoVentas.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center border-t pt-2">
                    <span>Utilidad Bruta</span>
                    <span>S/ {utilidadBruta.toFixed(2)}</span>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between items-center text-red-600">
                    <span>(-) Gastos Operativos</span>
                    <span>S/ {estadoResultados.gastoOperativos.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center border-t pt-2">
                    <span>Utilidad Operativa</span>
                    <span>S/ {utilidadOperativa.toFixed(2)}</span>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between items-center text-red-600">
                    <span>(-) Gastos Administrativos</span>
                    <span>S/ {estadoResultados.gastosAdmin.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center text-red-600">
                    <span>(-) Otros Gastos</span>
                    <span>S/ {estadoResultados.otrosGastos.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center border-t-2 pt-3">
                    <span>Utilidad Neta</span>
                    <span className="text-green-600">S/ {utilidadNeta.toFixed(2)}</span>
                  </div>
                </div>

                <div className="mt-6 p-4 bg-muted rounded-lg">
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <p className="text-sm text-muted-foreground">Margen Bruto</p>
                      <p>{((utilidadBruta / estadoResultados.ventasBrutas) * 100).toFixed(1)}%</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Margen Operativo</p>
                      <p>{((utilidadOperativa / estadoResultados.ventasBrutas) * 100).toFixed(1)}%</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Margen Neto</p>
                      <p>{((utilidadNeta / estadoResultados.ventasBrutas) * 100).toFixed(1)}%</p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        */}
      </Tabs>

      <div className="space-y-4">
        {/* Ventanas comentadas: Filtrar por Fecha, Detalle por Día, Registrar Recibo
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-gray-600" />
                Filtrar por Fecha
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <Label>Fecha Inicial</Label>
                  <Input
                    type="date"
                    value={filterStartDate}
                    onChange={(e) => setFilterStartDate(e.target.value)}
                  />
                </div>
                <div>
                  <Label>Fecha Final</Label>
                  <Input
                    type="date"
                    value={filterEndDate}
                    onChange={(e) => setFilterEndDate(e.target.value)}
                  />
                </div>
                <Button 
                  className="w-full" 
                  onClick={handleSendEmail}
                  style={{ backgroundColor: '#9AAD97', color: 'white', border: 'none' }}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Descargar Excel
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-gray-600" />
                Detalle por Día
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <Label>Seleccionar Fecha</Label>
                  <Input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                  />
                </div>
                {detalleDia && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-3 gap-2">
                      <div className="p-3 rounded-lg bg-green-50 border border-green-200">
                        <p className="text-xs text-muted-foreground">Ingresos</p>
                        <p className="text-lg font-bold text-green-600">S/ {detalleDia.totalIngresos.toFixed(2)}</p>
                      </div>
                      <div className="p-3 rounded-lg bg-red-50 border border-red-200">
                        <p className="text-xs text-muted-foreground">Egresos</p>
                        <p className="text-lg font-bold text-red-600">S/ {detalleDia.totalEgresos.toFixed(2)}</p>
                      </div>
                      <div className={`p-3 rounded-lg border ${detalleDia.balance >= 0 ? 'bg-blue-50 border-blue-200' : 'bg-orange-50 border-orange-200'}`}>
                        <p className="text-xs text-muted-foreground">Balance</p>
                        <p className={`text-lg font-bold ${detalleDia.balance >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>
                          S/ {detalleDia.balance.toFixed(2)}
                        </p>
                      </div>
                    </div>
                    
                    {detalleDia.ingresos.length > 0 && (
                      <div className="border-t pt-4">
                        <h3 className="font-semibold text-green-600 mb-2 text-sm">Ingresos del día ({detalleDia.ingresos.length})</h3>
                        <Table className="text-xs">
                          <TableHeader>
                            <TableRow>
                              <TableHead>Concepto</TableHead>
                              <TableHead className="text-right">Monto</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {detalleDia.ingresos.map((item, idx) => (
                              <TableRow key={idx}>
                                <TableCell>{item.concept}</TableCell>
                                <TableCell className="text-right text-green-600 font-semibold">S/ {item.amount.toFixed(2)}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                    
                    {detalleDia.egresos.length > 0 && (
                      <div className="border-t pt-4">
                        <h3 className="font-semibold text-red-600 mb-2 text-sm">Egresos del día ({detalleDia.egresos.length})</h3>
                        <Table className="text-xs">
                          <TableHeader>
                            <TableRow>
                              <TableHead>Concepto</TableHead>
                              <TableHead className="text-right">Monto</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {detalleDia.egresos.map((item, idx) => (
                              <TableRow key={idx}>
                                <TableCell>{item.concept}</TableCell>
                                <TableCell className="text-right text-red-600 font-semibold">S/ {item.amount.toFixed(2)}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                    
                    {detalleDia.ingresos.length === 0 && detalleDia.egresos.length === 0 && (
                      <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg text-center text-muted-foreground">
                        <p>No hay movimientos registrados para esta fecha</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Receipt className="h-5 w-5 text-gray-600" />
                Registrar Recibo
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <Label>Monto Remesado</Label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={montoRemesado}
                    onChange={(e) => setMontoRemesado(e.target.value)}
                  />
                </div>
                <div>
                  <Label>Monto Dejado</Label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={montoDejado}
                    onChange={(e) => setMontoDejado(e.target.value)}
                  />
                </div>
                <Button 
                  className="w-full" 
                  onClick={handleReceipt}
                  style={{ backgroundColor: '#D5B888', color: 'white', border: 'none' }}
                >
                  Registrar Recibo
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
        */}

        {/* Reporte de Gastos por Categoría comentado
        <Card style={{ borderTop: '4px solid #D5B888' }}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2" style={{ color: '#D5B888' }}>
              <TrendingDown className="h-5 w-5" />
              Reporte de Gastos por Categoría
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <div className="p-4 rounded-lg border border-blue-200 bg-blue-50">
                <p className="text-sm text-muted-foreground">Compras de Inventario</p>
                <p className="text-2xl font-bold text-blue-600">
                  S/ {filteredEgresos.filter(e => e.type === "Compra").reduce((sum, e) => sum + e.amount, 0).toFixed(2)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {filteredEgresos.filter(e => e.type === "Compra").length} movimientos
                </p>
              </div>
              <div className="p-4 rounded-lg border border-purple-200 bg-purple-50">
                <p className="text-sm text-muted-foreground">Servicios</p>
                <p className="text-2xl font-bold text-purple-600">
                  S/ {filteredEgresos.filter(e => e.type === "Servicios").reduce((sum, e) => sum + e.amount, 0).toFixed(2)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {filteredEgresos.filter(e => e.type === "Servicios").length} movimientos
                </p>
              </div>
              <div className="p-4 rounded-lg border border-red-200 bg-red-50">
                <p className="text-sm text-muted-foreground">Nómina</p>
                <p className="text-2xl font-bold text-red-600">
                  S/ {filteredEgresos.filter(e => e.type === "Nómina").reduce((sum, e) => sum + e.amount, 0).toFixed(2)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {filteredEgresos.filter(e => e.type === "Nómina").length} movimientos
                </p>
              </div>
              <div className="p-4 rounded-lg border border-yellow-200 bg-yellow-50">
                <p className="text-sm text-muted-foreground">Mantenimiento</p>
                <p className="text-2xl font-bold text-yellow-600">
                  S/ {filteredEgresos.filter(e => e.type === "Mantenimiento").reduce((sum, e) => sum + e.amount, 0).toFixed(2)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {filteredEgresos.filter(e => e.type === "Mantenimiento").length} movimientos
                </p>
              </div>
              <div className="p-4 rounded-lg border border-gray-200 bg-gray-50">
                <p className="text-sm text-muted-foreground">Total Egresos</p>
                <p className="text-2xl font-bold text-gray-600">
                  S/ {totalEgresos.toFixed(2)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {filteredEgresos.length} movimientos
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        */}
      </div>
    </div>
  );
}