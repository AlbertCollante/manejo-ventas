import { useState } from "react";
import { jsPDF } from "jspdf";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { Search, Plus, Activity, Droplets, Heart, Baby, TestTube, Clock, Download, Settings, Printer } from "lucide-react";
import { Badge } from "./ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";
import { Label } from "./ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Textarea } from "./ui/textarea";

export function ServiciosModule() {
  const [search, setSearch] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerDni, setCustomerDni] = useState("");
  const [selectedService, setSelectedService] = useState("");
  const [showRegisterDialog, setShowRegisterDialog] = useState(false);
  const [registeredServices, setRegisteredServices] = useState<any[]>([]);
  const [showServiceDialog, setShowServiceDialog] = useState(false);
  const [lastServiceData, setLastServiceData] = useState<any>(null);
  const [services, setServices] = useState([
    {
      id: 1,
      name: "Extracción de Sangre",
      icon: Droplets,
      price: 15.00,
      duration: "15 min",
      category: "Análisis",
      color: "text-red-600",
      bgColor: "bg-red-100",
      active: true
    },
    {
      id: 2,
      name: "Medición de Oxígeno",
      icon: Activity,
      price: 5.00,
      duration: "5 min",
      category: "Monitoreo",
      color: "text-amber-600",
      bgColor: "bg-amber-100",
      active: true
    },
    {
      id: 3,
      name: "Medición de Glucosa",
      icon: TestTube,
      price: 8.00,
      duration: "10 min",
      category: "Análisis",
      color: "text-green-600",
      bgColor: "bg-green-100",
      active: true
    },
    {
      id: 4,
      name: "Prueba de Embarazo",
      icon: Baby,
      price: 12.00,
      duration: "10 min",
      category: "Pruebas",
      color: "text-pink-600",
      bgColor: "bg-pink-100",
      active: true
    },
    {
      id: 5,
      name: "Medición de Presión Arterial",
      icon: Heart,
      price: 5.00,
      duration: "5 min",
      category: "Monitoreo",
      color: "text-purple-600",
      bgColor: "bg-purple-100",
      active: true
    },
    {
      id: 6,
      name: "Aplicación de Inyectables",
      icon: Activity,
      price: 10.00,
      duration: "10 min",
      category: "Procedimientos",
      color: "text-orange-600",
      bgColor: "bg-orange-100",
      active: true
    },
  ]);
  
  const [newService, setNewService] = useState({
    name: "",
    price: "",
    duration: "",
    category: ""
  });

  const recentServices = [
    {
      id: "SRV-001",
      customer: "María López",
      dni: "12345678",
      service: "Medición de Glucosa",
      price: 8.00,
      date: "13/10/2025 10:30",
      status: "Completado"
    },
    {
      id: "SRV-002",
      customer: "Juan Pérez",
      dni: "87654321",
      service: "Extracción de Sangre",
      price: 15.00,
      date: "13/10/2025 11:15",
      status: "Completado"
    },
    {
      id: "SRV-003",
      customer: "Ana Torres",
      dni: "45678901",
      service: "Medición de Presión Arterial",
      price: 5.00,
      date: "13/10/2025 12:00",
      status: "Completado"
    },
  ];

  const filteredServices = services.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.category.toLowerCase().includes(search.toLowerCase())
  );

  // Función para convertir números a letras
  const numeroALetras = (num: number): string => {
    const unidades = ['', 'uno', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve'];
    const decenas = ['diez', 'once', 'doce', 'trece', 'catorce', 'quince', 'dieciséis', 'diecisiete', 'dieciocho', 'diecinueve'];
    const decenasMultiples = ['', '', 'veinte', 'treinta', 'cuarenta', 'cincuenta', 'sesenta', 'setenta', 'ochenta', 'noventa'];
    const centenas = ['', 'ciento', 'doscientos', 'trescientos', 'cuatrocientos', 'quinientos', 'seiscientos', 'setecientos', 'ochocientos', 'novecientos'];

    const partes = Math.floor(num).toString().split('');
    let resultado = '';

    if (partes.length === 1) {
      resultado = unidades[parseInt(partes[0])];
    } else if (partes.length === 2) {
      const decena = parseInt(partes[0]);
      const unidad = parseInt(partes[1]);
      if (decena === 1) {
        resultado = decenas[unidad];
      } else {
        resultado = decenasMultiples[decena] + (unidad > 0 ? ' y ' + unidades[unidad] : '');
      }
    } else if (partes.length === 3) {
      const centena = parseInt(partes[0]);
      const decena = parseInt(partes[1]);
      const unidad = parseInt(partes[2]);
      resultado = centenas[centena];
      if (decena === 0 && unidad === 0) {
        // Solo centena
      } else if (decena === 1) {
        resultado += ' ' + decenas[unidad];
      } else {
        resultado += ' ' + decenasMultiples[decena] + (unidad > 0 ? ' y ' + unidades[unidad] : '');
      }
    }

    return resultado.trim();
  };

  const generateServicePDF = (serviceData: any) => {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: [80, 297]
    });

    const pageWidth = 80;
    const margin = 4;
    const usableWidth = pageWidth - margin * 2;
    let y = 5;

    const center = pageWidth / 2;
    const right = pageWidth - margin;

    const small = 5.5;
    const normal = 6;
    const bold = 6.5;

    const line = () => {
      doc.line(margin, y, pageWidth - margin, y);
      y += 2;
    };

    doc.setFont('helvetica');

    /* =======================
        HEADER EMPRESA
    ======================= */

    doc.setFontSize(bold);
    doc.setFont('helvetica', 'bold');
    doc.text('CONSALUD S.A.C.', center, y, { align: 'center' });
    y += 3;

    doc.setFontSize(normal);
    doc.setFont('helvetica', 'normal');
    doc.text('RUC: 20614403978', center, y, { align: 'center' });
    y += 2.5;

    doc.setFontSize(small);
    doc.text('PROLONGACION AV DE LA CULTURA 540', center, y, { align: 'center' });
    y += 2.2;
    doc.text('SAN SEBASTIAN - CUSCO', center, y, { align: 'center' });
    y += 3;

    line();

    /* =======================
        TITULO
    ======================= */

    doc.setFontSize(bold);
    doc.setFont('helvetica', 'bold');
    doc.text('COMPROBANTE DE SERVICIO', center, y, { align: 'center' });
    y += 3;

    doc.text(`S002-${serviceData.id.replace('SRV-', '')}`, center, y, { align: 'center' });
    y += 3;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(normal);

    const fecha = new Date();
    const venc = new Date(fecha.getTime() + 86400000);

    doc.text(`FECHA EMISION: ${fecha.toLocaleDateString('es-PE')}`, margin, y);
    y += 2.5;
    doc.text(`HORA: ${fecha.toLocaleTimeString('es-PE')}`, margin, y);
    y += 2.5;

    doc.text(`SEÑOR(ES): ${serviceData.customer || 'VARIOS'}`, margin, y);
    y += 2.5;

    doc.text(`DNI: ${serviceData.dni || '---'}`, margin, y);
    y += 3;

    line();

    /* =======================
        TABLA ENCABEZADO
    ======================= */

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(small);

    doc.text('SERVICIO', margin, y);
    doc.text('CANT', 55, y, { align: 'center' });
    doc.text('PRECIO', 70, y, { align: 'right' });

    y += 2;
    line();

    /* =======================
        ITEMS (SERVICIO)
    ======================= */

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(small);

    const serviceLines = doc.splitTextToSize(serviceData.service, 50);
    doc.text(serviceLines, margin, y);

    const heightUsed = serviceLines.length * 2.2;

    doc.text('1', 55, y, { align: 'center' });
    doc.text(serviceData.price.toFixed(2), 76, y, { align: 'right' });

    y += heightUsed + 3;

    line();

    /* =======================
        TOTALES
    ======================= */

    doc.setFontSize(normal);
    doc.text('SUBTOTAL:', margin, y);
    doc.text(`S/ ${serviceData.price.toFixed(2)}`, right, y, { align: 'right' });
    y += 2.5;

    doc.text('I.G.V (18%):', margin, y);
    const igv = serviceData.price * 0.18;
    doc.text(`S/ ${igv.toFixed(2)}`, right, y, { align: 'right' });
    y += 3;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(bold);

    doc.text('TOTAL:', margin, y);
    doc.text(`S/ ${serviceData.price.toFixed(2)}`, right, y, { align: 'right' });
    y += 3;

    /* =======================
        MONTO EN LETRAS
    ======================= */

    doc.setFontSize(small);
    doc.setFont('helvetica', 'bold');

    const entero = Math.floor(serviceData.price);
    const dec = Math.round((serviceData.price - entero) * 100);

    const letras = `${numeroALetras(entero)} CON ${dec
      .toString()
      .padStart(2, '0')}/100 SOLES`;

    doc.text(`SON: ${letras.toUpperCase()}`, margin, y, {
      maxWidth: usableWidth
    });

    y += 4;

    /* =======================
        INFO FINAL
    ======================= */

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(small);

    doc.text('TIPO DE MONEDA: PEN', margin, y);
    y += 2;

    doc.text('FORMA DE PAGO: CONTADO', margin, y);
    y += 2;

    doc.text('ATENDIDO POR: caja1', margin, y);
    y += 3;

    line();

    doc.setFont('helvetica', 'bold');
    doc.text('¡GRACIAS POR VISITARNOS!', center, y, { align: 'center' });

    doc.save(`SERVICIO_${serviceData.id}.pdf`);
  };

  const generateServiceReceipt = (serviceName: string, price: number) => {
    const serviceData = {
      id: `SRV-${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`,
      date: new Date().toLocaleString('es-PE'),
      customer: customerName,
      dni: customerDni,
      service: serviceName,
      price,
    };

    // Guardar el servicio en el historial
    setRegisteredServices([...registeredServices, serviceData]);
    setLastServiceData(serviceData);
    setShowServiceDialog(true);
  };

  const finalizeService = () => {
    setCustomerName("");
    setCustomerDni("");
    setSelectedService("");
    setShowServiceDialog(false);
  };

  const handleRegisterService = () => {
    if (!customerName || !customerDni || !selectedService) return;
    
    const service = services.find(s => s.id.toString() === selectedService);
    if (service) {
      generateServiceReceipt(service.name, service.price);
      setShowRegisterDialog(false);
    }
  };

  const handleAddService = () => {
    if (!newService.name || !newService.price || !newService.category) {
      alert("Por favor complete todos los campos obligatorios");
      return;
    }

    const newServiceItem = {
      id: services.length + 1,
      name: newService.name,
      icon: Activity,
      price: parseFloat(newService.price),
      duration: newService.duration || "10 min",
      category: newService.category,
      color: "text-blue-600",
      bgColor: "bg-blue-100",
      active: true
    };

    setServices([...services, newServiceItem]);
    setNewService({ name: "", price: "", duration: "", category: "" });
    alert(`Servicio "${newServiceItem.name}" agregado exitosamente`);
  };

  const todayRevenue = recentServices.reduce((sum, srv) => sum + srv.price, 0);
  const todayCount = recentServices.length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 style={{ color: '#9AAD97' }}>Módulo de Servicios</h2>
          <p className="text-muted-foreground">Gestión de servicios médicos y procedimientos</p>
        </div>
        <Dialog open={showRegisterDialog} onOpenChange={setShowRegisterDialog}>
          <DialogTrigger asChild>
            <Button style={{ backgroundColor: '#D5B888', color: 'white', border: 'none' }}>
              <Plus className="h-4 w-4 mr-2" />
              Registrar Servicio
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle style={{ color: '#D5B888' }}>Registrar Nuevo Servicio</DialogTitle>
              <DialogDescription>
                Complete los datos del cliente y seleccione el servicio a realizar.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Nombre del Cliente</Label>
                <Input
                  placeholder="Nombre completo"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                />
              </div>
              <div>
                <Label>DNI</Label>
                <Input
                  placeholder="12345678"
                  maxLength={8}
                  value={customerDni}
                  onChange={(e) => setCustomerDni(e.target.value)}
                />
              </div>
              <div>
                <Label>Servicio</Label>
                <Select value={selectedService} onValueChange={setSelectedService}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar servicio" />
                  </SelectTrigger>
                  <SelectContent>
                    {services.map((service) => (
                      <SelectItem key={service.id} value={service.id.toString()}>
                        {service.name} - S/ {service.price.toFixed(2)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Observaciones (opcional)</Label>
                <Textarea placeholder="Notas adicionales sobre el servicio" />
              </div>
              <Button className="w-full" onClick={handleRegisterService} style={{ backgroundColor: '#9AAD97', color: 'white', border: 'none' }}>
                Registrar Servicio
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg" style={{ backgroundColor: 'rgba(213, 184, 136, 0.2)' }}>
                <Activity className="h-6 w-6" style={{ color: '#D5B888' }} />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Servicios Hoy</p>
                <p className="text-2xl">{todayCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-green-100">
                <TestTube className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Ingresos Hoy</p>
                <p className="text-2xl">S/ {todayRevenue.toFixed(2)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-purple-100">
                <Clock className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Tiempo Promedio</p>
                <p className="text-2xl">10 min</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card style={{ borderTop: '4px solid #D5B888' }}>
        <CardHeader>
          <CardTitle style={{ color: '#D5B888' }}>Servicios Disponibles</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar servicios..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredServices.map((service) => {
              const Icon = service.icon;
              return (
                <Card key={service.id} className="hover:shadow-lg transition-shadow cursor-pointer">
                  <CardContent className="pt-6">
                    <div className="flex items-start gap-4">
                      <div className={`p-3 rounded-lg ${service.bgColor}`}>
                        <Icon className={`h-6 w-6 ${service.color}`} />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-base mb-1">{service.name}</h3>
                        <Badge variant="outline" className="mb-2 text-xs">
                          {service.category}
                        </Badge>
                        <div className="flex items-center justify-between mt-3">
                          <span className="text-lg text-primary">
                            S/ {service.price.toFixed(2)}
                          </span>
                          <span className="text-sm text-muted-foreground flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {service.duration}
                          </span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card style={{ borderTop: '4px solid #9AAD97' }}>
        <CardHeader>
          <CardTitle style={{ color: '#9AAD97' }}>Servicios Recientes</CardTitle>
        </CardHeader> 
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow style={{ backgroundColor: 'rgba(154, 173, 151, 0.1)' }}>
                <TableHead style={{ color: '#9AAD97', fontWeight: 'bold' }}>ID</TableHead>
                <TableHead style={{ color: '#D5B888', fontWeight: 'bold' }}>Cliente</TableHead>
                <TableHead style={{ color: '#9AAD97', fontWeight: 'bold' }}>DNI</TableHead>
                <TableHead style={{ color: '#D5B888', fontWeight: 'bold' }}>Servicio</TableHead>
                <TableHead style={{ color: '#9AAD97', fontWeight: 'bold' }}>Precio</TableHead>
                <TableHead style={{ color: '#D5B888', fontWeight: 'bold' }}>Fecha</TableHead>
                <TableHead style={{ color: '#9AAD97', fontWeight: 'bold' }}>Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentServices.map((srv) => (
                <TableRow key={srv.id}>
                  <TableCell>{srv.id}</TableCell>
                  <TableCell>{srv.customer}</TableCell>
                  <TableCell>{srv.dni}</TableCell>
                  <TableCell>{srv.service}</TableCell>
                  <TableCell style={{ color: '#D5B888', fontWeight: 'bold' }}>S/ {srv.price.toFixed(2)}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{srv.date}</TableCell>
                  <TableCell>
                    <Badge style={{ backgroundColor: '#9AAD97', color: 'white', border: 'none' }}>{srv.status}</Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card style={{ borderTop: '4px solid #D5B888' }}>
        <CardHeader>
          <CardTitle style={{ color: '#D5B888' }}>Agregar Nuevo Servicio</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Nombre del Servicio</Label>
            <Input
              placeholder="Nombre del servicio"
              value={newService.name}
              onChange={(e) => setNewService({ ...newService, name: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>Precio</Label>
            <Input
              placeholder="Precio del servicio"
              value={newService.price}
              onChange={(e) => setNewService({ ...newService, price: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>Duración</Label>
            <Input
              placeholder="Duración del servicio"
              value={newService.duration}
              onChange={(e) => setNewService({ ...newService, duration: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>Categoría</Label>
            <Input
              placeholder="Categoría del servicio"
              value={newService.category}
              onChange={(e) => setNewService({ ...newService, category: e.target.value })}
            />
          </div>
          <Button className="w-full" onClick={handleAddService} style={{ backgroundColor: '#9AAD97', color: 'white', border: 'none' }}>
            Agregar Servicio
          </Button>
        </CardContent>
      </Card>

      {/* Dialog para el comprobante de servicio */}
      <Dialog open={showServiceDialog} onOpenChange={setShowServiceDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle style={{ color: '#D5B888' }}>Comprobante de Servicio</DialogTitle>
            <DialogDescription>
              Revisa los detalles del servicio prestado y descarga el comprobante.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">ID Servicio:</p>
              <p className="text-sm font-bold">{lastServiceData?.id}</p>
            </div>
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">Fecha:</p>
              <p className="text-sm font-bold">{lastServiceData?.date}</p>
            </div>
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">Cliente:</p>
              <p className="text-sm font-bold">{lastServiceData?.customer}</p>
            </div>
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">DNI:</p>
              <p className="text-sm font-bold">{lastServiceData?.dni}</p>
            </div>
            <div className="border-t pt-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-bold" style={{ color: '#D5B888' }}>Servicio Prestado</p>
                <p className="text-sm font-bold" style={{ color: '#9AAD97' }}>Precio</p>
              </div>
              <div className="flex items-center justify-between">
                <p className="text-sm">{lastServiceData?.service}</p>
                <p className="text-sm">S/ {lastServiceData?.price.toFixed(2)}</p>
              </div>
            </div>
            <div className="border-t pt-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">Subtotal:</p>
                <p className="text-sm font-bold" style={{ color: '#D5B888' }}>S/ {lastServiceData?.price.toFixed(2)}</p>
              </div>
              <div className="flex items-center justify-between mt-2">
                <p className="text-sm text-muted-foreground">IGV (18%):</p>
                <p className="text-sm font-bold">S/ {(lastServiceData?.price * 0.18).toFixed(2)}</p>
              </div>
              <div className="flex items-center justify-between pt-2 border-t mt-2">
                <p className="text-sm text-muted-foreground">Total:</p>
                <p className="text-lg font-bold" style={{ color: '#D5B888' }}>S/ {lastServiceData?.price.toFixed(2)}</p>
              </div>
            </div>
          </div>
          <div className="flex items-center justify-between mt-4">
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                generateServicePDF(lastServiceData);
                finalizeService();
              }}
              style={{ color: '#9AAD97', borderColor: '#9AAD97' }}
            >
              <Download className="h-4 w-4 mr-1" />
              Descargar PDF
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                generateServicePDF(lastServiceData);
                setTimeout(() => {
                  window.print();
                  finalizeService();
                }, 500);
              }}
              style={{ color: '#D5B888', borderColor: '#D5B888' }}
            >
              <Printer className="h-4 w-4 mr-1" />
              Imprimir
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}