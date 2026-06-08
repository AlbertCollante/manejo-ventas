import React, { useState, useEffect } from "react";
import { jsPDF } from "jspdf";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { Search, Plus, Activity, Download, Trash2 } from "lucide-react";
import { Badge } from "./ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";
import { Label } from "./ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";

interface ServiciosModuleProps {
  currentUser: {
    username: string;
    role: string;
    name: string;
  };
}

export function ServiciosModule({ currentUser }: ServiciosModuleProps) {
  const API_BASE = 'http://localhost:9000';

  // Estados para búsqueda y carrito de productos
  const [searchProduct, setSearchProduct] = useState("");
  const [products, setProducts] = useState<any[]>([]);
  const [materialsCart, setMaterialsCart] = useState<any[]>([]);

  // Estados para servicios disponibles
  const [availableServices, setAvailableServices] = useState<any[]>([]);
  const [searchService, setSearchService] = useState("");

  // Estados para registro de servicio
  const [customerName, setCustomerName] = useState("");
  const [customerDni, setCustomerDni] = useState("");
  const [selectedService, setSelectedService] = useState("");
  const [selectedServicePrice, setSelectedServicePrice] = useState("");
  const [manualServiceCost, setManualServiceCost] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("efectivo");
  const [paymentAmount, setPaymentAmount] = useState("");

  // Estados para diálogos
  const [showRegisterDialog, setShowRegisterDialog] = useState(false);
  const [showServiceReceipt, setShowServiceReceipt] = useState(false);
  const [showAddServiceDialog, setShowAddServiceDialog] = useState(false);

  // Estados para servicios registrados
  const [registeredServices, setRegisteredServices] = useState<any[]>([]);
  const [lastServiceData, setLastServiceData] = useState<any>(null);
  const [openBoxId, setOpenBoxId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hoveredProductId, setHoveredProductId] = useState<number | null>(null);

  // Estados para agregar nuevo servicio
  const [newServiceData, setNewServiceData] = useState({
    descripcion: "",
    precio: "",
    duracion: ""
  });

  // Cargar productos del inventario
  const loadProducts = async () => {
    try {
      const response = await fetch(`${API_BASE}/inventario-productos`);
      if (!response.ok) throw new Error('Error al obtener productos');
      const data = await response.json();
      if (Array.isArray(data)) {
        const normalized = data.map((p: any) => ({
          id: Number(p.id ?? 0),
          idproducto: Number(p.id ?? 0),
          codigo: p.codigo ?? p.code ?? String(p.id ?? ""),
          code: p.codigo ?? p.code ?? String(p.id ?? ""),
          nombre: p.nombre ?? p.name ?? "",
          name: p.nombre ?? p.name ?? "",
          categoria: p.categoria ?? p.category ?? "",
          marca: p.marca ?? p.brand ?? "",
          estante: p.estante ?? p.shelf ?? "",
          shelf: p.estante ?? p.shelf ?? "",
          stock: Number(p.stock_actual ?? p.stock ?? 0),
          precio_unitario: Number(p.precio_unitario ?? p.price ?? 0),
          precio_compra: Number(p.precio_compra ?? 0),
        }));
        setProducts(normalized);
      }
    } catch (err) {
      console.error('Error cargando productos:', err);
      // No mostrar error, solo continuar con lista vacía
    }
  };

  // Cargar servicios disponibles
  const loadAvailableServices = async () => {
    try {
      const response = await fetch(`${API_BASE}/lista-servicios`);
      if (!response.ok) throw new Error('Error al obtener servicios');
      const data = await response.json();
      if (Array.isArray(data)) {
        const normalized = data.map((s: any) => ({
          idservicio: Number(s.idservicio ?? 0),
          descripcion: s.descripcion ?? '',
          precio: Number(s.precio ?? 0),
          duracion: s.duracion ?? ''
        }));
        setAvailableServices(normalized);
      }
    } catch (err) {
      console.error('Error cargando servicios:', err);
      // Mostrar servicios de ejemplo si la API falla
      setAvailableServices([
        { idservicio: 1, descripcion: 'Servicio de Ejemplo', precio: 0, duracion: '' }
      ]);
    }
  };

  // Cargar servicios registrados
  const loadRegisteredServices = async () => {
    try {
      const response = await fetch(`${API_BASE}/servicios`);
      if (!response.ok) throw new Error('Error al obtener servicios registrados');
      const data = await response.json();
      if (Array.isArray(data)) {
        const normalized = data.map((s: any) => ({
          idserviciodado: s.idserviciodado ?? s.id,
          idservicio: Number(s.idservicio ?? 0),
          descripcion: s.descripcion ?? "",
          duracion: s.duracion ?? "",
          subtotal: Number(s.subtotal ?? 0),
          vendedor: s.vendedor ?? "",
          hora: s.hora ?? new Date().toISOString(),
          pago: Number(s.pago ?? 0),
          vuelto: Number(s.vuelto ?? 0),
          metodo: s.metodo ?? "Efectivo",
          usuario: s.usuario ?? "",
          idapertura: Number(s.idapertura ?? null),
        }));
        setRegisteredServices(normalized);
      }
    } catch (err) {
      console.error('Error cargando servicios registrados:', err);
      // Continuar con lista vacía
    }
  };

  // Obtener caja abierta
  const getOpenBox = async () => {
    try {
      const resp = await fetch(`${API_BASE}/aperturas`);
      if (resp.ok) {
        const data = await resp.json();
        const openBox = data.find((a: any) => a.estado === 'abierto');
        if (openBox) {
          setOpenBoxId(openBox.id);
        }
      }
    } catch (error) {
      console.error('Error obteniendo caja abierta:', error);
      // Continuar sin caja abierta
    }
  };

  // Inicializar datos
  useEffect(() => {
    loadProducts();
    loadAvailableServices();
    loadRegisteredServices();
    getOpenBox();
  }, []);

  const getProductStock = (idproducto: number) => {
    const product = products.find(p => p.idproducto === idproducto);
    return product?.stock ?? 0;
  };

  const getCartQuantity = (idproducto: number) => {
    return materialsCart.find(item => item.idproducto === idproducto)?.cantidad ?? 0;
  };

  // Filtrar productos
  const filteredProducts =
  searchProduct.trim().length < 2
    ? []
    : products.filter(p => {
        const term = searchProduct.toLowerCase();

        return (
          (p.nombre || '').toLowerCase().includes(term) ||
          (p.codigo || '').toLowerCase().includes(term) ||
          (p.marca || '').toLowerCase().includes(term)
        );
      }).slice(0, 5);

  // Filtrar servicios disponibles
  const filteredAvailableServices = availableServices.filter(s =>
    (s.descripcion || '').toLowerCase().includes(searchService.toLowerCase())
  );

  const formatPaymentMethod = (method: string) => {
    if (method === 'efectivo') return 'Efectivo';
    if (method === 'tarjeta') return 'Tarjeta';
    if (method === 'yape') return 'Yape';
    return 'Transferencia';
  };

  // Agregar producto al carrito de materiales
  const addMaterialToCart = (product: any) => {
    const stock = Number(product.stock ?? 0);
    if (stock <= 0) {
      alert('Este producto no tiene stock disponible');
      return;
    }

    const existing = materialsCart.find(item => item.idproducto === product.idproducto);
    const currentQty = existing?.cantidad ?? 0;

    if (currentQty + 1 > stock) {
      alert(`Stock insuficiente. Disponible: ${stock}`);
      return;
    }

    if (existing) {
      setMaterialsCart(materialsCart.map(item =>
        item.idproducto === product.idproducto
          ? { ...item, cantidad: item.cantidad + 1 }
          : item
      ));
    } else {
      setMaterialsCart([...materialsCart, {
        ...product,
        idproducto: product.idproducto,
        nombre: product.nombre || product.name,
        precio: product.precio_unitario,
        cantidad: 1
      }]);
    }
    setSearchProduct("");
  };

  // Remover producto del carrito
  const removeMaterialFromCart = (idproducto: number) => {
    setMaterialsCart(materialsCart.filter(item => item.idproducto !== idproducto));
  };

  // Actualizar cantidad
  const updateMaterialQuantity = (idproducto: number, cantidad: number) => {
    if (cantidad <= 0) {
      removeMaterialFromCart(idproducto);
      return;
    }

    const stock = getProductStock(idproducto);
    if (cantidad > stock) {
      alert(`Stock insuficiente. Disponible: ${stock}`);
      return;
    }

    setMaterialsCart(materialsCart.map(item =>
      item.idproducto === idproducto
        ? { ...item, cantidad }
        : item
    ));
  };

  // Manejar selección de servicio
  const handleSelectService = (serviceId: string) => {
    setSelectedService(serviceId);
    const service = availableServices.find(s => s.idservicio === Number(serviceId));
    if (service) {
      const price = Number(service.precio) || 0;
      setSelectedServicePrice(String(price));
      setManualServiceCost(price > 0 ? String(price) : "");
    }
  };

  const handleOpenRegisterDialog = (open: boolean) => {
    setShowRegisterDialog(open);
    if (open) {
      setSearchProduct("");
      loadProducts();
      getOpenBox();
    } else {
      setSearchProduct("");
      setHoveredProductId(null);
    }
  };

  // Registrar servicio
  const handleRegisterService = async () => {
    
    
    if (!selectedService) {
      alert('Seleccione un servicio');
      return;
    }
    if (!manualServiceCost) {
      alert('Ingrese el costo del servicio');
      return;
    }

    let activeBoxId = openBoxId;
    try {
      const resp = await fetch(`${API_BASE}/aperturas`);
      if (resp.ok) {
        const data = await resp.json();
        const openBox = Array.isArray(data) ? data.find((a: any) => a.estado === 'abierto') : null;
        if (openBox) {
          activeBoxId = openBox.id;
          setOpenBoxId(openBox.id);
        }
      }
    } catch (err) {
      console.error('Error consultando caja abierta:', err);
    }

    if (!activeBoxId) {
      alert('❌ La caja no está abierta. Debe abrir la caja antes de registrar servicios.');
      return;
    }

    const cost = Number(manualServiceCost);
    if (isNaN(cost) || cost <= 0) {
      alert('Ingrese un costo válido para el servicio');
      return;
    }

    const payAmount = paymentMethod === 'efectivo'
      ? Number(paymentAmount)
      : cost;

    if (paymentMethod === 'efectivo' && (isNaN(payAmount) || payAmount <= 0)) {
      alert('Ingrese el monto pagado en efectivo');
      return;
    }

    if (paymentMethod === 'efectivo' && payAmount < cost) {
      alert(`El monto de pago debe ser mayor o igual al costo del servicio (S/ ${cost.toFixed(2)})`);
      return;
    }

    setLoading(true);
    try {
      const metodo = formatPaymentMethod(paymentMethod);

      // Registrar el servicio principal
      const serviceResponse = await fetch(`${API_BASE}/registrar-servicio`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          idservicio: Number(selectedService),
          subtotal: cost,
          vendedor: customerName.trim(),
          pago: payAmount,
          vuelto: paymentMethod === 'efectivo' ? payAmount - cost : 0,
          metodo,
          usuario: currentUser.name || currentUser.username,
          idapertura: activeBoxId
        })
      });

      if (!serviceResponse.ok) throw new Error('Error al registrar servicio');
      const serviceData = await serviceResponse.json();
      const idserviciodado = serviceData.idserviciodado;

      // Registrar detalles del servicio (materiales usados)
      if (materialsCart.length > 0) {
        const detailResponse = await fetch(`${API_BASE}/registrar-detalle-servicio`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            idserviciodado: idserviciodado,
            detalle: materialsCart.map(item => ({
              idproducto: item.idproducto,
              nombre: item.nombre,
              precio: item.precio,
              cantidad: item.cantidad
            }))
          })
        });

        if (!detailResponse.ok) throw new Error('Error al registrar detalles');
      }

      // Preparar datos para el recibo
      const service = availableServices.find(s => s.idservicio === Number(selectedService));
      setLastServiceData({
        idserviciodado,
        hora: new Date().toLocaleString('es-PE'),
        cliente: customerName,
        dni: customerDni,
        servicio: service?.descripcion || 'Servicio',
        duracion: service?.duracion || '',
        subtotal: cost,
        pago: payAmount,
        vuelto: paymentMethod === 'efectivo' ? payAmount - cost : 0,
        metodo,
        materiales: materialsCart
      });

      setShowServiceReceipt(true);
      setShowRegisterDialog(false);
      
      // Limpiar formulario
      setCustomerName("");
      setCustomerDni("");
      setSelectedService("");
      setSelectedServicePrice("");
      setManualServiceCost("");
      setPaymentAmount("");
      setMaterialsCart([]);
      
      // Recargar servicios registrados
      await loadRegisteredServices();
    } catch (err) {
      console.error('Error registrando servicio:', err);
      alert('Error al registrar el servicio');
    } finally {
      setLoading(false);
    }
  };

  // Agregar nuevo servicio a lista_servicios
  const handleAddNewService = async () => {
    if (!newServiceData.descripcion || !newServiceData.precio) {
      alert('Por favor complete los campos requeridos');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/agregar-servicio`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          descripcion: newServiceData.descripcion,
          precio: Number(newServiceData.precio),
          duracion: newServiceData.duracion || ""
        })
      });

      if (!response.ok) throw new Error('Error al agregar servicio');
      
      alert('Servicio agregado exitosamente');
      setNewServiceData({ descripcion: "", precio: "", duracion: "" });
      setShowAddServiceDialog(false);
      await loadAvailableServices();
    } catch (err) {
      console.error('Error agregando servicio:', err);
      alert('Error al agregar el servicio');
    } finally {
      setLoading(false);
    }
  };

  // Generar PDF del servicio
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

    // HEADER
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

    // TITULO
    doc.setFontSize(bold);
    doc.setFont('helvetica', 'bold');
    doc.text('COMPROBANTE DE SERVICIO', center, y, { align: 'center' });
    y += 3;

    doc.text(`SRV-${serviceData.idserviciodado}`, center, y, { align: 'center' });
    y += 3;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(normal);

    const fecha = new Date();
    doc.text(`FECHA: ${fecha.toLocaleDateString('es-PE')}`, margin, y);
    y += 2.5;
    doc.text(`HORA: ${fecha.toLocaleTimeString('es-PE')}`, margin, y);
    y += 2.5;

    doc.text(`CLIENTE: ${serviceData.cliente || 'SIN NOMBRE'}`, margin, y);
    y += 2.5;

    doc.text(`DNI: ${serviceData.dni || '---'}`, margin, y);
    y += 3;

    line();

    // SERVICIO
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(normal);
    doc.text('SERVICIO:', margin, y);
    y += 2.5;

    doc.setFont('helvetica', 'normal');
    const serviceLines = doc.splitTextToSize(serviceData.servicio || 'Servicio', usableWidth - 2);
    doc.text(serviceLines, margin + 1, y);
    y += serviceLines.length * 2.5 + 1;

    if (serviceData.duracion) {
      doc.setFont('helvetica', 'bold');
      doc.text('DURACIÓN:', margin, y);
      doc.setFont('helvetica', 'normal');
      doc.text(serviceData.duracion, margin + 10, y);
      y += 2.5;
    }

    line();

    // TOTALES
    doc.setFontSize(normal);
    doc.setFont('helvetica', 'normal');
    doc.text('COSTO:', margin, y);
    doc.text(`S/ ${(serviceData.subtotal || 0).toFixed(2)}`, right, y, { align: 'right' });
    y += 2.5;

    doc.text('PAGO:', margin, y);
    doc.text(`S/ ${(serviceData.pago || 0).toFixed(2)}`, right, y, { align: 'right' });
    y += 2.5;

    doc.text('VUELTO:', margin, y);
    doc.text(`S/ ${(serviceData.vuelto || 0).toFixed(2)}`, right, y, { align: 'right' });
    y += 3;

    doc.setFont('helvetica', 'bold');
    doc.text('MÉTODO:', margin, y);
    doc.setFont('helvetica', 'normal');
    doc.text(serviceData.metodo || 'Efectivo', margin + 15, y);
    y += 3;

    line();

    doc.setFont('helvetica', 'bold');
    doc.text('¡GRACIAS POR VISITARNOS!', center, y, { align: 'center' });

    doc.save(`SERVICIO_${serviceData.idserviciodado}.pdf`);
  };

  // Calcular totales
  const servicesOfOpenBox = registeredServices.filter(s => s.idapertura === openBoxId);
  const totalServices = servicesOfOpenBox.length;
  const totalServiceRevenue = servicesOfOpenBox.reduce((sum, s) => sum + s.subtotal, 0);

  const revenueByPaymentMethod = {
    efectivo: servicesOfOpenBox.filter(s => s.metodo === 'Efectivo').reduce((sum, s) => sum + s.subtotal, 0),
    yape: servicesOfOpenBox.filter(s => s.metodo === 'Yape').reduce((sum, s) => sum + s.subtotal, 0),
    tarjeta: servicesOfOpenBox.filter(s => s.metodo === 'Tarjeta').reduce((sum, s) => sum + s.subtotal, 0),
    transferencia: servicesOfOpenBox.filter(s => s.metodo === 'Transferencia').reduce((sum, s) => sum + s.subtotal, 0),
  };

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-sm text-yellow-800">{error}</p>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 style={{ color: '#9AAD97' }}>Módulo de Servicios</h2>
          <p className="text-muted-foreground">Registro de servicios y materiales utilizados</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={showAddServiceDialog} onOpenChange={setShowAddServiceDialog}>
            <DialogTrigger>
              <Button style={{ backgroundColor: '#9AAD97', color: 'white', border: 'none' }}>
                <Plus className="h-4 w-4 mr-2" />
                Nuevo Servicio
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle style={{ color: '#9AAD97' }}>Agregar Nuevo Servicio</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Descripción</Label>
                  <Input
                    placeholder="Nombre del servicio"
                    value={newServiceData.descripcion}
                    onChange={(e) => setNewServiceData({ ...newServiceData, descripcion: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Precio Sugerido</Label>
                  <Input
                    type="number"
                    placeholder="Precio"
                    value={newServiceData.precio}
                    onChange={(e) => setNewServiceData({ ...newServiceData, precio: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Duración (opcional)</Label>
                  <Input
                    placeholder="Ej: 30 min"
                    value={newServiceData.duracion}
                    onChange={(e) => setNewServiceData({ ...newServiceData, duracion: e.target.value })}
                  />
                </div>
                <Button className="w-full" onClick={handleAddNewService} disabled={loading} style={{ backgroundColor: '#D5B888', color: 'white', border: 'none' }}>
                  {loading ? 'Guardando...' : 'Agregar Servicio'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={showRegisterDialog} onOpenChange={handleOpenRegisterDialog}>
            <DialogTrigger>
              <Button style={{ backgroundColor: '#D5B888', color: 'white', border: 'none' }}>
                <Plus className="h-4 w-4 mr-2" />
                Registrar Servicio
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle style={{ color: '#D5B888' }}>Registrar Nuevo Servicio</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                {/* Datos del Cliente */}
                <div className="border-b pb-4">
                  <h3 style={{ color: '#9AAD97' }} className="font-semibold mb-2">Datos del Cliente</h3>
                  <div>
                    <Label>Nombre</Label>
                    <Input
                      placeholder="Nombre completo"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                    />
                  </div>
                  <div className="mt-2">
                    <Label>DNI</Label>
                    <Input
                      placeholder="12345678"
                      value={customerDni}
                      onChange={(e) => setCustomerDni(e.target.value)}
                    />
                  </div>
                </div>

                {/* Seleccionar Servicio */}
                <div className="border-b pb-4">
                  <h3 style={{ color: '#9AAD97' }} className="font-semibold mb-2">Seleccionar Servicio</h3>
                  <div>
                    <Label>Servicio</Label>
                    <Select value={selectedService} onValueChange={handleSelectService}>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar servicio" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableServices.map((service) => (
                          <SelectItem key={service.idservicio} value={service.idservicio.toString()}>
                            {service.descripcion} - S/ {(Number(service.precio) || 0).toFixed(2)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {selectedService && (
                    <div className="mt-2 text-sm text-muted-foreground">
                      <p>Precio sugerido: S/ {selectedServicePrice}</p>
                    </div>
                  )}
                </div>

                {/* Materiales Utilizados */}
                <div className="border-b pb-4">
                  <h3 style={{ color: '#9AAD97' }} className="font-semibold mb-2">Materiales Utilizados</h3>
                  <p className="text-xs text-muted-foreground mb-2">
                    Busque productos del inventario y agréguelos como materiales del servicio.
                  </p>
                  <div className="relative mb-3">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar por nombre, código o marca..."
                      value={searchProduct}
                      onChange={(e) => setSearchProduct(e.target.value)}
                      className="pl-10"
                    />
                  </div>

                  {searchProduct.trim().length >= 2 && (
                    <div className="space-y-2 max-h-[220px] overflow-y-auto mb-3">
                    {filteredProducts.length === 0 ? (
                      <div className="text-center py-6 text-sm text-muted-foreground border rounded-lg">
                        {products.length === 0
                          ? 'No hay productos cargados del inventario'
                          : 'No se encontraron productos con ese criterio'}
                      </div>
                    ) : (
                      filteredProducts.map((product) => {
                        const inCartQty = getCartQuantity(product.idproducto);
                        const available = Math.max(0, Number(product.stock ?? 0) - inCartQty);
                        const outOfStock = Number(product.stock ?? 0) <= 0;

                        return (
                          <div
                            key={product.idproducto}
                            onMouseEnter={() => setHoveredProductId(product.idproducto)}
                            onMouseLeave={() => setHoveredProductId(null)}
                            className="flex items-center justify-between p-3 border rounded-lg transition-all"
                            style={{
                              backgroundColor: hoveredProductId === product.idproducto ? '#9AAD97' : 'transparent',
                              color: hoveredProductId === product.idproducto ? 'white' : 'inherit',
                              borderColor: hoveredProductId === product.idproducto ? '#9AAD97' : 'inherit',
                              opacity: outOfStock ? 0.6 : 1
                            }}
                          >
                            <div className="flex-1 min-w-0 pr-3">
                              <p className="text-sm font-medium truncate">
                                {product.nombre || product.name}
                              </p>
                              <p
                                className="text-xs"
                                style={{
                                  color: hoveredProductId === product.idproducto
                                    ? 'rgba(255,255,255,0.85)'
                                    : '#999'
                                }}
                              >
                                Código: {product.codigo || product.code} | Stock: {product.stock}
                                {product.estante || product.shelf ? ` | Estante: ${product.estante || product.shelf}` : ''}
                                {inCartQty > 0 ? ` | En carrito: ${inCartQty}` : ''}
                              </p>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <p
                                className="text-sm font-bold"
                                style={{
                                  color: hoveredProductId === product.idproducto ? 'white' : '#D5B888'
                                }}
                              >
                                S/ {(product.precio_unitario || 0).toFixed(2)}
                              </p>
                              <Button
                                size="sm"
                                disabled={available <= 0}
                                onClick={() => addMaterialToCart(product)}
                                style={{
                                  backgroundColor: '#D5B888',
                                  color: 'white',
                                  border: 'none'
                                }}
                              >
                                <Plus className="h-4 w-4 mr-1" />
                                Agregar
                              </Button>
                            </div>
                          </div>
                        );
                      })
                    )}

                  </div>
                  )}

                  {materialsCart.length > 0 && (
                    <div className="rounded-lg border p-3 space-y-2" style={{ backgroundColor: 'rgba(154, 173, 151, 0.08)' }}>
                      <p className="text-sm font-semibold" style={{ color: '#9AAD97' }}>
                        Materiales seleccionados ({materialsCart.length})
                      </p>
                      {materialsCart.map((item) => (
                        <div key={item.idproducto} className="flex items-center gap-2 p-2 bg-white border rounded">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{item.nombre}</p>
                            <p className="text-xs text-muted-foreground">
                              S/ {(item.precio || 0).toFixed(2)} c/u • Stock disp.: {getProductStock(item.idproducto)}
                            </p>
                          </div>
                          <Input
                            type="number"
                            min="1"
                            max={getProductStock(item.idproducto)}
                            value={item.cantidad || 1}
                            onChange={(e) => updateMaterialQuantity(item.idproducto, parseInt(e.target.value) || 1)}
                            className="w-16 h-8 text-center"
                          />
                          <p className="text-sm font-semibold w-20 text-right" style={{ color: '#D5B888' }}>
                            S/ {((item.precio || 0) * (item.cantidad || 0)).toFixed(2)}
                          </p>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => removeMaterialFromCart(item.idproducto)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Costo del Servicio */}
                <div className="border-b pb-4">
                  <h3 style={{ color: '#9AAD97' }} className="font-semibold mb-2">Costo del Servicio</h3>
                  <div>
                    <Label>Costo Total Ingresado por el Personal</Label>
                    <Input
                      type="number"
                      placeholder="Ingrese el costo total del servicio"
                      value={manualServiceCost}
                      onChange={(e) => setManualServiceCost(e.target.value)}
                    />
                  </div>
                </div>

                {/* Método de Pago */}
                <div className="border-b pb-4">
                  <h3 style={{ color: '#9AAD97' }} className="font-semibold mb-2">Método de Pago</h3>
                  <div>
                    <Label>Método</Label>
                    <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="efectivo">Efectivo</SelectItem>
                        <SelectItem value="tarjeta">Tarjeta</SelectItem>
                        <SelectItem value="yape">Yape</SelectItem>
                        <SelectItem value="transferencia">Transferencia</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {paymentMethod === 'efectivo' && (
                    <div className="mt-2">
                      <Label>Monto Pagado</Label>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="Monto que paga el cliente"
                        value={paymentAmount}
                        onChange={(e) => setPaymentAmount(e.target.value)}
                      />
                      {paymentAmount && manualServiceCost && Number(paymentAmount) >= Number(manualServiceCost) && (
                        <p className="text-xs mt-1" style={{ color: '#9AAD97' }}>
                          Vuelto: S/ {(Number(paymentAmount) - Number(manualServiceCost)).toFixed(2)}
                        </p>
                      )}
                    </div>
                  )}
                </div>

                <Button className="w-full" onClick={handleRegisterService} disabled={loading} style={{ backgroundColor: '#9AAD97', color: 'white', border: 'none' }}>
                  {loading ? 'Registrando...' : 'Registrar Servicio'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Resumen */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg" style={{ backgroundColor: 'rgba(154, 173, 151, 0.2)' }}>
                <Activity className="h-6 w-6" style={{ color: '#9AAD97' }} />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Servicios Registrados</p>
                <p className="text-2xl font-bold">{totalServices === 0 && registeredServices.length === 0 ? 'Cargando...' : totalServices}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg" style={{ backgroundColor: 'rgba(213, 184, 136, 0.2)' }}>
                <Download className="h-6 w-6" style={{ color: '#D5B888' }} />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Ingresos por Servicios</p>
                <p className="text-2xl font-bold">S/ {totalServiceRevenue.toFixed(2)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-blue-100">
                <Plus className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Métodos de Pago</p>
                <p className="text-sm mt-1">
                  <span style={{ color: '#9AAD97' }} className="font-semibold">E: S/{revenueByPaymentMethod.efectivo.toFixed(2)} </span>
                  <span style={{ color: '#D5B888' }} className="font-semibold">T: S/{revenueByPaymentMethod.tarjeta.toFixed(2)}</span>
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {openBoxId === null && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-800">
            <strong>⚠️ Nota:</strong> Debe abrir la caja antes de registrar servicios. Por favor, use el módulo de Apertura de Caja.
          </p>
        </div>
      )}

      {/* Tabla de Servicios Registrados */}
      <Card style={{ borderTop: '4px solid #D5B888' }}>
        <CardHeader>
          <CardTitle style={{ color: '#D5B888' }}>Servicios Realizados - Caja Abierta</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow style={{ backgroundColor: 'rgba(213, 184, 136, 0.1)' }}>
                <TableHead style={{ color: '#D5B888', fontWeight: 'bold' }}>ID</TableHead>
                <TableHead style={{ color: '#9AAD97', fontWeight: 'bold' }}>Vendedor</TableHead>
                <TableHead style={{ color: '#D5B888', fontWeight: 'bold' }}>Servicio</TableHead>
                <TableHead style={{ color: '#9AAD97', fontWeight: 'bold' }}>Monto (S/)</TableHead>
                <TableHead style={{ color: '#D5B888', fontWeight: 'bold' }}>Método</TableHead>
                <TableHead style={{ color: '#9AAD97', fontWeight: 'bold' }}>Hora</TableHead>
                <TableHead style={{ color: '#D5B888', fontWeight: 'bold' }}>Acción</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {servicesOfOpenBox.map((service) => (
                <TableRow key={service.idserviciodado}>
                  <TableCell className="font-semibold">{service.idserviciodado}</TableCell>
                  <TableCell>{service.vendedor}</TableCell>
                  <TableCell>{service.descripcion}</TableCell>
                  <TableCell style={{ color: '#D5B888', fontWeight: 'bold' }}>S/ {service.subtotal.toFixed(2)}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{service.metodo}</Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(service.hora).toLocaleTimeString('es-PE')}
                  </TableCell>
                  <TableCell>
                    <button onClick={() => generateServicePDF(service)} className="text-blue-600 text-sm hover:underline">
                      Ver PDF
                    </button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {servicesOfOpenBox.length === 0 && (
            <div className="text-center py-4 text-muted-foreground">
              No hay servicios registrados para la caja abierta
            </div>
          )}
        </CardContent>
      </Card>

      {/* Diálogo de Recibo */}
      <Dialog open={showServiceReceipt} onOpenChange={setShowServiceReceipt}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle style={{ color: '#D5B888' }}>Comprobante de Servicio</DialogTitle>
          </DialogHeader>
          {lastServiceData && (
            <div className="space-y-3 text-sm">
              <div className="flex justify-between border-b pb-2">
                <span className="text-muted-foreground">ID:</span>
                <span className="font-semibold">SRV-{lastServiceData.idserviciodado}</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-muted-foreground">Cliente:</span>
                <span className="font-semibold">{lastServiceData.cliente}</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-muted-foreground">Servicio:</span>
                <span className="font-semibold">{lastServiceData.servicio}</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-muted-foreground">Costo:</span>
                <span style={{ color: '#D5B888' }} className="font-bold">S/ {lastServiceData.subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-muted-foreground">Pago:</span>
                <span className="font-semibold">S/ {lastServiceData.pago.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Vuelto:</span>
                <span className="font-semibold">S/ {lastServiceData.vuelto.toFixed(2)}</span>
              </div>
              <div className="flex gap-2 pt-4">
                <Button size="sm" className="flex-1" onClick={() => generateServicePDF(lastServiceData)} style={{ backgroundColor: '#9AAD97', color: 'white' }}>
                  <Download className="h-4 w-4 mr-2" />
                  PDF
                </Button>
                <Button size="sm" className="flex-1" variant="outline" onClick={() => setShowServiceReceipt(false)}>
                  Cerrar
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}