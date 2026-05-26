import React, { useState, useEffect } from "react";
import { jsPDF } from "jspdf";
import * as XLSX from "xlsx";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { Search, Plus, ShoppingCart, Trash2, User, Download, Printer, FileText, Eye } from "lucide-react";
import { Badge } from "./ui/badge";
import { Label } from "./ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "./ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { dataService } from "../services/dataService";

const API_BASE = 'http://localhost:9000';

const parseOptionalPrice = (value: unknown): number | null => {
  if (value == null || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : null;
};

const getMayoristaPriceInfo = (product: any): { price: number; label: string } | null => {
  const precioBlister = parseOptionalPrice(product.precio_blister ?? product.priceBlister);
  if (precioBlister != null) {
    return { price: precioBlister, label: 'Precio blister' };
  }
  const precioCaja = parseOptionalPrice(product.precio_caja_venta);
  if (precioCaja != null) {
    return { price: precioCaja, label: 'Precio caja' };
  }
  return null;
};

const normalizeApiProduct = (product: any) => {
  const stock = Number(product.stock_actual ?? product.stock ?? 0);
  const minStock = Number(product.stock_minimo ?? product.minStock ?? 0);
  const purchasePrice = Number(product.precio_compra ?? product.purchasePrice ?? 0);
  const priceUnit = Number(product.precio_unitario ?? product.priceUnit ?? 0);
  const priceBlister = parseOptionalPrice(product.precio_blister ?? product.priceBlister);
  const priceBoxVenta = parseOptionalPrice(product.precio_caja_venta);
  const priceBox = priceBoxVenta ?? (Number(product.precio_caja ?? product.priceBox ?? 0) || 0);

  return {
    id: Number(product.id ?? 0),
    code: product.codigo ?? product.code ?? String(product.id ?? ""),
    name: product.nombre ?? product.name ?? "",
    category: product.categoria ?? product.category ?? "",
    brand: product.marca ?? product.brand ?? "",
    stock,
    minStock,
    purchasePrice,
    priceUnit,
    priceBlister: priceBlister ?? 0,
    priceBox,
    unitsPerBlister: Number(product.unidades_blister ?? product.unitsPerBlister ?? 0),
    blistersPerBox: Number(product.blisters_caja ?? product.blistersPerBox ?? 0),
    expiry: product.vencimiento ?? product.expiry ?? "",
    location: product.ubicacion ?? product.location ?? "",
    shelf: product.estante ?? product.shelf ?? "",
    estado: product.estado ?? (stock <= minStock ? "Bajo stock" : "Disponible"),
    precio_caja: Number(product.precio_caja ?? priceBox),
    precio_compra: purchasePrice,
    precio_unitario: priceUnit,
    precio_blister: priceBlister,
    precio_caja_venta: priceBoxVenta,
    unidades_blister: Number(product.unidades_blister ?? product.unitsPerBlister ?? 0),
    blisters_caja: Number(product.blisters_caja ?? product.blistersPerBox ?? 0),
    vencimiento: product.vencimiento ?? product.expiry ?? "",
    ubicacion: product.ubicacion ?? product.location ?? "",
    estante: product.estante ?? product.shelf ?? "",
    valor_total: Number(product.valor_total ?? stock * purchasePrice),
    ganancia: Number(product.ganancia ?? 0),
    compra: Number(product.compra ?? purchasePrice),
    price: priceUnit,
  };
};



import logo from "./figma/logo.png";


interface VentasModuleProps {
  currentUser: {
    username: string;
    role: string;
    name: string;
  };
}

export function VentasModule({ currentUser }: VentasModuleProps) {
  const [searchProduct, setSearchProduct] = useState("");
  const [cart, setCart] = useState<any[]>([]);
  const [customerName, setCustomerName] = useState("");
  const [customerDni, setCustomerDni] = useState("");
  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<any>(null);
  const [paymentMethod, setPaymentMethod] = useState("efectivo");
  const [paymentAmount, setPaymentAmount] = useState("");
  const [showVoucherDialog, setShowVoucherDialog] = useState(false);
  const [lastSaleData, setLastSaleData] = useState<any>(null);
  const [sales, setSales] = useState<any[]>([]);
  const [showReportDialog, setShowReportDialog] = useState(false);
  const [reportFilterDate, setReportFilterDate] = useState(new Date().toISOString().split('T')[0]);
  const [reportFilterUser, setReportFilterUser] = useState("all");
  const [hoveredProductId, setHoveredProductId] = useState<number | null>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [availableCoupons, setAvailableCoupons] = useState<any[]>([]);
  const [loadingSales, setLoadingSales] = useState(false);
  const [showMayoristaDialog, setShowMayoristaDialog] = useState(false);
  const [mayoristaProduct, setMayoristaProduct] = useState<any | null>(null);
  const [mayoristaUnits, setMayoristaUnits] = useState<string>("");
  const [mayoristaPrice, setMayoristaPrice] = useState<string>("");
  const [hoveredMayoristaProductId, setHoveredMayoristaProductId] = useState<number | null>(null);

  const fetchSales = async () => {
    setLoadingSales(true);
    try {
      const resp = await fetch(`${API_BASE}/ventas`);
      if (!resp.ok) throw new Error('Error al obtener ventas desde API');
      const data = await resp.json();
      if (Array.isArray(data)) {
        const normalized = data.map((s: any) => {
          const rawDate = s.fecha ?? s.date ?? '';
          //console.log(rawDate)
          return {
            id: s.id ?? s.idventa ?? null,
            date: rawDate,
            dateOnly: rawDate.split(' ')[0],
            customer: s.cliente || s.customer || 'Cliente General',
            dni: s.dni || s.DNI || '---',
            items: s.items || s.detalle || [],
            subtotal: Number(s.subtotal ?? 0),
            discount: Number(s.descuento ?? s.discount ?? 0),
            total: Number(s.total ?? 0),
            paymentAmount: Number(s.pago ?? s.paymentAmount ?? 0),
            vuelto: Number(s.vuelto ?? 0),
            paymentMethod: s.metodo || s.paymentMethod || 'Efectivo',
            user: s.usuario || s.user || '',
          };
        });
        setSales(normalized);
      }
    } catch (error) {
      console.error('Error cargando ventas desde API:', error);
    } finally {
      setLoadingSales(false);
    }
  };

  const fetchSaleDetail = async (idventa: number | string) => {
    try {
      const resp = await fetch(`${API_BASE}/detalle-venta`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idventa })
      });
      if (!resp.ok) throw new Error('Error al obtener detalle de venta');
      const data = await resp.json();
      const rows = Array.isArray(data) ? data : (data.detalle || data.rows || []);
      return rows.map((r: any) => ({
        idproducto: r.idproducto ?? r.id_producto ?? r.id ?? null,
        name: r.nombre ?? r.name ?? '',
        price: Number(r.precio ?? r.price ?? 0),
        quantity: Number(r.cantidad ?? r.quantity ?? 0),
      }));
    } catch (error) {
      console.error('detalle-venta error:', error);
      return null;
    }
  };

  const handleOpenVoucherDialog = async (sale: any) => {
    try {
      // Si los items están vacíos, cargar desde API
      let saleData = { ...sale };
      if (!saleData.items || saleData.items.length === 0) {
        const detalle = await fetchSaleDetail(sale.id);
        if (detalle && detalle.length > 0) {
          saleData.items = detalle;
        } else {
          // Si no hay detalles, mostrar alerta pero permitir abrir el diálogo
          console.warn('No se pudieron cargar los detalles de la venta');
        }
      }
      setLastSaleData(saleData);
      setShowVoucherDialog(true);
    } catch (error) {
      console.error('Error abriendo voucher:', error);
      alert('Error al cargar los detalles del voucher');
    }
  };

  // Inicializar productos desde la API o desde localStorage si falla
  useEffect(() => {
    const loadProducts = async () => {
      try {
        const response = await fetch(`${API_BASE}/inventario-productos`);
        if (!response.ok) {
          throw new Error('Error al obtener productos desde la API');
        }

        const data = await response.json();
        if (Array.isArray(data) && data.length > 0) {
          const normalized = data.map(normalizeApiProduct);
          setProducts(normalized);
        } else {
          throw new Error('API devolvió datos inválidos');
        }
      } catch (error) {
        console.error('Error cargando productos desde API:', error);
        localStorage.removeItem('botica_products');
        dataService.initializeDefaultData();
        let products = dataService.getProducts();
        if (!products || products.length === 0) {
          localStorage.removeItem('botica_products');
          dataService.initializeDefaultData();
          products = dataService.getProducts();
        }
        setProducts(products.map(normalizeApiProduct));
      }
    };

    loadProducts();
    fetchSales();
    setAvailableCoupons(dataService.getCoupons());
    setSales(dataService.getSales());
  }, []);

  const filteredProducts = products.filter(p => 
    (p.name || '').toLowerCase().includes(searchProduct.toLowerCase()) ||
    (p.code || '').toLowerCase().includes(searchProduct.toLowerCase())
  );

  const addToCart = (product: any) => {
    const productWithPrice = {
      ...product,
      price: product.price || product.priceUnit || 0
    };
    //console.log('Agregando al carrito:', productWithPrice);
    
    const existing = cart.find(item => item.id === product.id);
    if (existing) {
      setCart(cart.map(item => 
        item.id === product.id 
          ? { ...item, quantity: item.quantity + 1 }
          : item
      ));
    } else {
      setCart([...cart, { ...productWithPrice, quantity: 1 }]);
    }
  };

  const openMayoristaDialog = (product: any) => {
    setMayoristaProduct(product);
    const defaultUnits = Number(product.unitsPerBlister ?? product.unidades_blister ?? 0);
    const mayoristaInfo = getMayoristaPriceInfo(product);
    setMayoristaUnits(defaultUnits > 0 ? String(defaultUnits) : "");
    setMayoristaPrice(mayoristaInfo ? String(mayoristaInfo.price) : "");
    setShowMayoristaDialog(true);
  };

  const addMayoristaToCart = () => {
    if (!mayoristaProduct) return;

    const units = Math.floor(Number(mayoristaUnits));
    const price = Number(mayoristaPrice);

    if (!units || units <= 0) {
      alert("Ingrese la cantidad de pastillas a descontar del inventario (mayor a 0)");
      return;
    }

    if (!price || price <= 0) {
      alert("Ingrese el precio mayorista (mayor a 0)");
      return;
    }

    if (Number.isFinite(mayoristaProduct.stock) && Number(mayoristaProduct.stock) < units) {
      alert(`Stock insuficiente. Stock actual: ${mayoristaProduct.stock}`);
      return;
    }

    const cartId = `mayorista-${mayoristaProduct.id}-${Date.now()}`;

    setCart(prev => [
      ...prev,
      {
        ...mayoristaProduct,
        id: cartId,
        productId: mayoristaProduct.id,
        name: `Mayorista - ${mayoristaProduct.name ?? mayoristaProduct.nombre ?? ""}`.trim(),
        price,
        quantity: 1,
        isMayorista: true,
        unitsPerMayorista: units,
      }
    ]);

    setShowMayoristaDialog(false);
    setMayoristaProduct(null);
    setMayoristaUnits("");
    setMayoristaPrice("");
  };

  const removeFromCart = (productId: any) => {
    setCart(cart.filter(item => item.id !== productId));
  };

  const updateQuantity = (productId: any, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId);
    } else {
      setCart(cart.map(item => 
        item.id === productId ? { ...item, quantity } : item
      ));
    }
  };

  const subtotal = cart.reduce((sum, item) => sum + ((item.price || 0) * (item.quantity || 0)), 0);
  
  let discount = 0;
  let couponError = "";
  if (appliedCoupon) {
    // Validar monto mínimo
    if (subtotal < appliedCoupon.minAmount) {
      couponError = `Monto mínimo: S/ ${appliedCoupon.minAmount}`;
    } else {
      if (appliedCoupon.type === "percentage") {
        discount = Math.min((subtotal * appliedCoupon.discount) / 100, appliedCoupon.maxDiscount);
      } else {
        discount = appliedCoupon.discount;
      }
    }
  }
  
  const total = subtotal - discount;

  const applyCoupon = () => {
    const coupon = availableCoupons.find(c => c.code.toUpperCase() === couponCode.toUpperCase());
    if (coupon) {
      if (subtotal >= coupon.minAmount) {
        setAppliedCoupon(coupon);
        setCouponCode("");
      } else {
        alert(`Este cupón requiere un monto mínimo de compra de S/ ${coupon.minAmount}`);
      }
    } else {
      alert("Cupón inválido");
    }
  };

  const removeCoupon = () => {
    setAppliedCoupon(null);
  };

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
  /*
  const generatePDF = (saleData: any) => {
    // Formato para ticketeras de 58mm, 70mm y 76mm
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: [80, 297] // 80mm ancho (mejor para 58-76mm) x altura variable
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    let yPosition = 5;
    const leftMargin = 5;
    const rightMargin = 5;

    // Establecer fuente
    doc.setFont('Arial', 'normal');

    // Header - Información de la empresa
    doc.setFontSize(7);
    doc.setFont('Arial', 'bold');
    doc.text('LYDER HOME', leftMargin, yPosition, { maxWidth: pageWidth - leftMargin - rightMargin, align: 'center' });
    yPosition += 2.5;
    
    doc.text('IMPORT PERU S.A.C.', leftMargin, yPosition, { maxWidth: pageWidth - leftMargin - rightMargin, align: 'center' });
    yPosition += 2.8;
    
    doc.setFontSize(6.5);
    doc.setFont('Arial', 'normal');
    doc.text('RUC: 20614403978', leftMargin, yPosition, { maxWidth: pageWidth - leftMargin - rightMargin, align: 'center' });
    yPosition += 2.8;
    
    doc.setFontSize(5.5);
    doc.text('PROLONGACION AV CULTURA 540', leftMargin, yPosition, { maxWidth: pageWidth - leftMargin - rightMargin, align: 'center' });
    yPosition += 2.2;
    doc.text('SAN SEBASTIAN - CUSCO', leftMargin, yPosition, { maxWidth: pageWidth - leftMargin - rightMargin, align: 'center' });
    yPosition += 2.8;

    // Línea separadora
    doc.setDrawColor(0);
    doc.line(leftMargin, yPosition, pageWidth - rightMargin, yPosition);
    yPosition += 2.2;

    // Título
    doc.setFontSize(6);
    doc.setFont('Arial', 'bold');
    doc.text('BOLETA DE VENTA', leftMargin, yPosition, { maxWidth: pageWidth - leftMargin - rightMargin, align: 'center' });
    yPosition += 2.2;
    doc.text('ELECTRONICA', leftMargin, yPosition, { maxWidth: pageWidth - leftMargin - rightMargin, align: 'center' });
    yPosition += 2.5;

    // Número de boleta
    doc.setFontSize(6.5);
    doc.setFont('Arial', 'bold');
    doc.text('B002-' + saleData.id.replace('V-', ''), leftMargin, yPosition, { maxWidth: pageWidth - leftMargin - rightMargin, align: 'center' });
    yPosition += 2.8;

    // Información de fechas y cliente
    doc.setFontSize(6);
    doc.setFont('Arial', 'normal');
    const fechaHoy = new Date();
    const fechaVencimiento = new Date(fechaHoy.getTime() + 24 * 60 * 60 * 1000);
    
    doc.text(`EMISION: ${fechaHoy.toLocaleDateString('es-PE')}`, leftMargin, yPosition);
    yPosition += 2.5;
    doc.text(`VENCIMIENTO: ${fechaVencimiento.toLocaleDateString('es-PE')}`, leftMargin, yPosition);
    yPosition += 2.5;

    doc.text(`CLIENTE: ${saleData.customer}`, leftMargin, yPosition, { maxWidth: pageWidth - leftMargin - rightMargin });
    yPosition += 3;

    // Línea separadora
    doc.line(leftMargin, yPosition, pageWidth - rightMargin, yPosition);
    yPosition += 2;

    // Tabla de productos
    doc.setFont('Arial', 'bold');
    doc.setFontSize(6);
    doc.text('DESCRIPCION', leftMargin + 1, yPosition);
    doc.text('CANT', pageWidth - rightMargin - 13, yPosition, { align: 'center' });
    doc.text('TOTAL', pageWidth - rightMargin - 2, yPosition, { align: 'right' });
    yPosition += 2.5;

    // Línea separadora tabla
    doc.setDrawColor(200);
    doc.line(leftMargin, yPosition, pageWidth - rightMargin, yPosition);
    yPosition += 1.5;

    doc.setFont('Arial', 'normal');
    doc.setFontSize(6);

    // Detalles de productos
    saleData.items.forEach((item: any) => {
      // Nombre del producto con wrapping mejorado
      const maxNameLength = 18;
      const productName = item.name.length > maxNameLength ? item.name.substring(0, maxNameLength) + '...' : item.name;
      doc.text(productName, leftMargin + 1, yPosition);
      doc.text(item.quantity.toString(), pageWidth - rightMargin - 13, yPosition, { align: 'center' });
      doc.text('S/ ' + (item.price * item.quantity).toFixed(2), pageWidth - rightMargin - 2, yPosition, { align: 'right' });
      yPosition += 2.5;
    });

    // Línea separadora
    doc.setDrawColor(0);
    doc.line(leftMargin, yPosition, pageWidth - rightMargin, yPosition);
    yPosition += 1.5;

    // Valores finales
    doc.setFont('Arial', 'normal');
    doc.setFontSize(6);
    
    const gravada = saleData.subtotal;
    const igv = gravada * 0.18;
    
    doc.text('SUBTOTAL:', leftMargin, yPosition);
    doc.text(`S/ ${gravada.toFixed(2)}`, pageWidth - rightMargin - 2, yPosition, { align: 'right' });
    yPosition += 2.3;

    doc.text('IGV (18%):', leftMargin, yPosition);
    doc.text(`S/ ${igv.toFixed(2)}`, pageWidth - rightMargin - 2, yPosition, { align: 'right' });
    yPosition += 2.3;

    doc.setFont('Arial', 'bold');
    doc.setFontSize(7);
    doc.text('TOTAL:', leftMargin, yPosition);
    doc.text(`S/ ${saleData.total.toFixed(2)}`, pageWidth - rightMargin - 2, yPosition, { align: 'right' });
    yPosition += 3;

    // Pago y vuelto
    doc.setFont('Arial', 'normal');
    doc.setFontSize(6);
    const pago = saleData.total;
    const vuelto = 0;
    
    doc.text('PAGO:', leftMargin, yPosition);
    doc.text(`S/ ${pago.toFixed(2)}`, pageWidth - rightMargin - 2, yPosition, { align: 'right' });
    yPosition += 2.3;

    doc.text('VUELTO:', leftMargin, yPosition);
    doc.text(`S/ ${vuelto.toFixed(2)}`, pageWidth - rightMargin - 2, yPosition, { align: 'right' });
    yPosition += 2.5;

    // Descripción en letras
    doc.setFont('Arial', 'bold');
    doc.setFontSize(6);
    const letras = numeroALetras(Math.floor(saleData.total)) + ' con ' + ((saleData.total % 1) * 100).toFixed(0) + '/100 SOLES';
    doc.text('SON:', leftMargin, yPosition);
    yPosition += 2.2;
    doc.setFontSize(5);
    doc.text(letras.toUpperCase(), leftMargin, yPosition, { maxWidth: pageWidth - leftMargin - rightMargin });
    yPosition += 2.5;

    // Información de pago
    doc.setFont('Arial', 'normal');
    doc.setFontSize(5);
    doc.text('TIPO MONEDA: PEN', leftMargin, yPosition);
    yPosition += 2;

    doc.text('FORMA PAGO: Contado', leftMargin, yPosition);
    yPosition += 2;

    doc.text(`MEDIO: ${saleData.paymentMethod}`, leftMargin, yPosition);
    yPosition += 2;

    doc.text('CAJERO: caja1', leftMargin, yPosition);
    yPosition += 3;

    // Línea separadora final
    doc.setDrawColor(0);
    doc.line(leftMargin, yPosition, pageWidth - rightMargin, yPosition);
    yPosition += 2;

    // Mensaje de gracias
    doc.setFont('Arial', 'bold');
    doc.setFontSize(7);
    doc.text('¡GRACIAS POR SU COMPRA!', leftMargin, yPosition, { maxWidth: pageWidth - leftMargin - rightMargin, align: 'center' });

    // Descargar el PDF
    const fileName = `BOLETA_${saleData.id}_${new Date().toLocaleDateString('es-PE').replace(/\//g, '-')}.pdf`;
    doc.save(fileName);
  }; */
  const generatePDF = (saleData: any) => {
    // Normalizar datos de entrada
    if (!saleData) {
      alert('No hay datos de venta para generar PDF');
      return;
    }

    const normalizeSaleData = (data: any) => {
      const items = Array.isArray(data.items) ? data.items : [];
      const normalizedItems = items.map((item: any) => ({
        name: item.name || item.nombre || 'Producto',
        price: Number(item.price || item.precio || 0),
        quantity: Number(item.quantity || item.cantidad || 1),
      }));

      return {
        id: data.id || data.idventa || 'S/N',
        customer: data.customer || data.cliente || 'Cliente General',
        dni: data.dni || data.DNI || '---',
        subtotal: Number(data.subtotal ?? 0),
        discount: Number(data.discount || data.descuento || 0),
        total: Number(data.total ?? 0),
        paymentAmount: Number(data.paymentAmount || data.pago || (data.total ?? 0)),
        vuelto: Number(data.vuelto || 0),
        paymentMethod: data.paymentMethod || data.metodo || 'Efectivo',
        date: data.date || data.fecha || new Date().toISOString(),
        items: normalizedItems,
      };
    };

    const normalized = normalizeSaleData(saleData);

    if (!normalized.items || normalized.items.length === 0) {
      alert('No hay productos en esta venta para generar PDF');
      return;
    }

    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: [80, 210]
    });

    const pageWidth = 80;
    const margin = 4;
    const usableWidth = pageWidth - margin * 2;
    let y = 2;

    const center = pageWidth / 2;
    const right = pageWidth - margin;

    const small = 8;
    const normal = 8.5;
    const bold = 9.5;

    const line = () => {
      doc.line(margin, y, pageWidth - margin, y);
      y += 3;
    };

    doc.setFont('helvetica');

    /* =======================
        LOGO
    ======================= */
    
    try {
      doc.addImage(logo, 'PNG', 18, y, 44, 44);
      y += 50;
    } catch (e) {
      //console.log('No se pudo cargar el logo');
    } 


    /* =======================
        DIRECCION
    ======================= */

    doc.setFontSize(small);
    doc.setFont('helvetica', 'normal');
    doc.text('Sede San Isidro - Cusco', center, y, { align: 'center' });
    y += 5;

    line();

    /* =======================
        TITULO
    ======================= */

    doc.setFontSize(bold);
    doc.setFont('helvetica', 'bold');
    doc.text('BOLETA DE VENTA ELECTRONICA', center, y, { align: 'center' });
    y += 4;

    const numeroVenta = String(normalized.id).replace('V-', '').replace('B002-', '');
    doc.text(`F00-${numeroVenta}`, center, y, { align: 'center' });
    y += 4;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(normal);

    const saleDate = new Date(normalized.date);
    const venc = new Date(saleDate.getTime() + 86400000);

    doc.text(`FECHA EMISION: ${saleDate.toLocaleDateString('es-PE')}`, margin, y);
    y += 3;
    //doc.text(`FECHA VENCIMIENTO: ${venc.toLocaleDateString('es-PE')}`, margin, y);
    //y += 3;

    doc.text(`SEÑOR(ES): ${normalized.customer}`, margin, y);
    y += 4;

    line();

    /* =======================
        TABLA ENCABEZADO
    ======================= */

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(small);

    doc.text('DETALLE', margin, y);
    doc.text('U.M.', 38, y, { align: 'center' });
    doc.text('CANT', 48, y, { align: 'center' });
    doc.text('P.U.', 57, y, { align: 'center' });
    doc.text('TOT.', 68, y, { align: 'right' });

    y += 4;
    line();

    /* =======================
        ITEMS
    ======================= */

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(small);

    normalized.items.forEach((item: any) => {
      const totalItem = (item.price || 0) * (item.quantity || 0);

      // Nombre con salto automático real
      const splitName = doc.splitTextToSize(item.name, 32);
      doc.text(splitName, margin, y);

      const heightUsed = splitName.length * 2;

      doc.text('UND', 38, y, { align: 'center' });
      doc.text(String(item.quantity || 0), 48, y, { align: 'center' });
      doc.text((item.price || 0).toFixed(2), 57, y, { align: 'center' });
      doc.text(totalItem.toFixed(2), 68, y, { align: 'right' });

      y += heightUsed + 3;
    });

    line();

    /* =======================
        TOTALES
    ======================= */

    const gravada = normalized.subtotal || normalized.total;
    const igv = gravada * 0.18;

    doc.setFontSize(normal);
    doc.text('GRAVADA:', margin, y);
    doc.text(`S/ ${gravada.toFixed(2)}`, 68, y, { align: 'right' });
    y += 3;

    doc.text('I.G.V (18%):', margin, y);
    doc.text(`S/ ${igv.toFixed(2)}`, 68, y, { align: 'right' });
    y += 3;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(bold);

    doc.text('TOTAL:', margin, y);
    doc.text(`S/ ${(normalized.total || 0).toFixed(2)}`, 68, y, { align: 'right' });
    y += 5;

    /* =======================
        PAGO
    ======================= */

    const pago = normalized.paymentAmount || normalized.total || 0;
    const vuelto = Math.max(0, pago - (normalized.total || 0));

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(normal);

    doc.text('PAGO:', margin, y);
    doc.text(`S/ ${pago.toFixed(2)}`, 63, y, { align: 'center' });
    y += 3;

    doc.text('VUELTO:', margin, y);
    doc.text(`S/ ${vuelto.toFixed(2)}`, 63, y, { align: 'center' });
    y += 3;

    /* =======================
        MONTO EN LETRAS
    ======================= */

    doc.setFontSize(small);
    doc.setFont('helvetica', 'bold');

    const totalAmount = normalized.total || 0;
    const entero = Math.floor(totalAmount);
    const dec = Math.round((totalAmount - entero) * 100);

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
    y += 2.5;

    doc.text('FORMA DE PAGO: CONTADO', margin, y);
    y += 2.5;

    doc.text(`MEDIO DE PAGO: ${normalized.paymentMethod}`, margin, y);
    y += 2.5;

    doc.text('ATENDIDO POR: caja1', margin, y);
    y += 2.5;

    line();

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(bold);
    doc.text('¡GRACIAS POR SU COMPRA!', center, y, { align: 'center' });

    doc.save(`BOLETA_${numeroVenta}.pdf`);
    setShowVoucherDialog(false);
  };

  const completeSale = async () => {
    if (cart.length === 0) return;

    // Validar que la caja está abierta: consultar API /aperturas y fallback a dataService
    let todayOpening: any = null;
    try {
      const respA = await fetch(`${API_BASE}/aperturas`);
      if (respA.ok) {
        const aperturasData = await respA.json();
        const today = new Date().toISOString().split('T')[0];
        const aperturaHoy = aperturasData.find((a: any) => {
          const rawFecha = a.fecha || a.fecha_hora || new Date().toISOString();
          const parsedDate = new Date(rawFecha);
          if (!isNaN(parsedDate.getTime())) {
            const formatted = parsedDate.toISOString().split('T')[0];
            return a.estado === 'abierto' && formatted === today;
          }
          return false;
        });
        if (aperturaHoy) todayOpening = aperturaHoy;
      }
    } catch (err) {
      console.error('Error consultando /aperturas:', err);
    }

    if (!todayOpening || todayOpening.estado !== 'abierto') {
      // fallback a dataService si la API falla o no hay aperturas
      const localOpening = dataService.getTodayOpening();
      if (!localOpening || localOpening.estado !== 'abierto') {
        alert("❌ Error: La caja no está abierta.\n\nDebe abrir la caja (Apertura de Caja) antes de realizar ventas.");
        return;
      }
      todayOpening = localOpening;
    }

    if (!paymentMethod) {
      alert("Por favor seleccione un método de pago");
      return;
    }

    // Validar dinero ingresado si es efectivo
    const payAmount = parseFloat(paymentAmount);
    if (paymentMethod === 'efectivo' && (!paymentAmount || isNaN(payAmount) || payAmount <= 0)) {
      alert("Por favor ingrese el dinero recibido");
      return;
    }

    if (paymentMethod === 'efectivo' && payAmount < total) {
      alert(`Dinero insuficiente. Total: S/ ${total.toFixed(2)}`);
      return;
    }

    const finalPaymentAmount = paymentMethod === 'efectivo' ? payAmount : total;
    const vuelto = paymentMethod === 'efectivo' ? payAmount - total : 0;

    // Preparar detalle esperado por el backend
    const detalle = cart.map(item => ({
      idproducto: item.productId ?? item.id,
      nombre: item.name ?? item.nombre ?? '',
      precio: item.isMayorista
        ? Number((Number(item.price ?? 0) / Number(item.unitsPerMayorista ?? 1)) || 0)
        : Number(item.price ?? item.precio ?? item.precio_unitario ?? 0),
      cantidad: item.isMayorista
        ? Number((Number(item.quantity ?? 1) * Number(item.unitsPerMayorista ?? 0)) || 0)
        : Number(item.quantity ?? item.cantidad ?? 1),
    }));

    // Primero registrar la venta (sin detalle) en /registrar-venta
    const saleInfo = {
      cliente: customerName || "Cliente General",
      dni: customerDni || "---",
      subtotal,
      descuento: discount,
      total,
      pago: finalPaymentAmount,
      vuelto,
      metodo: paymentMethod === 'efectivo' ? 'Efectivo' : 
               paymentMethod === 'tarjeta' ? 'Tarjeta' :
               paymentMethod === 'yape' ? 'Yape' : 'Transferencia',
      usuario: currentUser.name,
    };

    setLoadingSales(true);
    try {
      const resp = await fetch(`${API_BASE}/registrar-venta`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(saleInfo),
      });

      if (!resp.ok) {
        // fallback local si no existe endpoint
        const id = `V-${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`;
        const saleLocal = { id, date: new Date().toLocaleString('es-PE'), dateOnly: new Date().toISOString().split('T')[0], customer: saleInfo.cliente, dni: saleInfo.dni, items: cart, subtotal, discount, total, paymentAmount: finalPaymentAmount, vuelto, paymentMethod: saleInfo.metodo, user: currentUser.name };
        setSales(prev => [...prev, saleLocal]);
        dataService.addSale(saleLocal);
        setLastSaleData(saleLocal);
        setShowVoucherDialog(true);
        alert('Venta registrada localmente (backend no disponible)');
        return;
      }

      const result = await resp.json();
      const idventa = result?.idventa ?? result?.insertId ?? result?.id ?? null;

      if (!idventa) {
        throw new Error('El backend no devolvió idventa');
      }

      // Registrar detalle en segundo paso
      const detailResp = await fetch(`${API_BASE}/registrar-detalle-venta`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idventa, detalle })
      });

      if (!detailResp.ok) {
        const txt = await detailResp.text();
        console.error('Error registrar-detalle-venta:', txt);
        alert('Venta registrada pero falló el registro del detalle. Revise el servidor.');
        // aún así intentar actualizar stock y mostrar comprobante parcial
      }

      // Actualizar stock
      const updateResp = await fetch(`${API_BASE}/actualizar-stock-venta`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idventa })
      });

      if (!updateResp.ok) {
        const txt = await updateResp.text();
        console.error('Error actualizar-stock-venta:', txt);
      }

      // Refrescar ventas desde API
      await fetchSales();

      // Buscar la venta creada en la lista para mostrar
      const ventasList = await (await fetch(`${API_BASE}/ventas`)).json();
      const created = ventasList.find((v: any) => v.id === idventa || v.idventa === idventa) || null;
      let saleToShow: any = null;
      if (created) {
        const items = created.items && created.items.length > 0 ? created.items : null;
        if (!items) {
          const detail = await fetchSaleDetail(idventa);
          saleToShow = { id: created.id ?? idventa, date: created.fecha ?? created.date, dateOnly: created.dateOnly || (created.fecha ? created.fecha.split('T')[0] : ''), customer: created.cliente, dni: created.dni, items: detail || cart, subtotal: Number(created.subtotal ?? 0), discount: Number(created.descuento ?? 0), total: Number(created.total ?? 0), paymentAmount: Number(created.pago ?? 0), vuelto: Number(created.vuelto ?? 0), paymentMethod: created.metodo || 'Efectivo', user: created.usuario || currentUser.name };
        } else {
          saleToShow = { id: created.id ?? idventa, date: created.fecha ?? created.date, dateOnly: created.dateOnly || (created.fecha ? created.fecha.split('T')[0] : ''), customer: created.cliente, dni: created.dni, items: created.items, subtotal: Number(created.subtotal ?? 0), discount: Number(created.descuento ?? 0), total: Number(created.total ?? 0), paymentAmount: Number(created.pago ?? 0), vuelto: Number(created.vuelto ?? 0), paymentMethod: created.metodo || 'Efectivo', user: created.usuario || currentUser.name };
        }
      } else {
        saleToShow = { ...saleInfo, id: idventa, items: cart };
      }

      setLastSaleData(saleToShow);
      setShowVoucherDialog(true);
    } catch (error) {
      console.error('completeSale error:', error);
      alert('Error al procesar la venta');
    } finally {
      setLoadingSales(false);
    }
  };

  const finalizeSale = () => {
    setCart([]);
    setCustomerName("");
    setCustomerDni("");
    setAppliedCoupon(null);
    setCouponCode("");
    setPaymentMethod("efectivo");
    setPaymentAmount("");
    setShowVoucherDialog(false);
  };

  // Función para generar reporte en Excel
  const generateSalesReport = () => {
    // Usar ventas cargadas desde la API
    const allSales = sales;

    // Filtrar ventas por fecha y usuario (si es vendedor, sólo su usuario)
    const filteredSales = allSales.filter(sale => {
      const matchDate = !reportFilterDate || sale.dateOnly === reportFilterDate;
      const matchUser = reportFilterUser === "all" || sale.user === reportFilterUser || (currentUser.role.toLowerCase() === 'vendedor' && sale.user === currentUser.name);
      return matchDate && matchUser;
    });

    if (filteredSales.length === 0) {
      alert("No hay ventas que coincidan con los filtros seleccionados");
      return;
    }

    // Helper para convertir fecha ISO a formato es-PE
    const formatDateEsPE = (isoDate: string) => {
      const [year, month, day] = isoDate.split('-');
      return `${day}/${month}/${year}`;
    };

    // Helper para extraer hora de la cadena completa
    const getTime = (dateString: string) => {
      const timePart = dateString.match(/\d{1,2}:\d{2}:\d{2}/);
      return timePart ? timePart[0] : '--:--:--';
    };

    // Preparar datos para Excel
    const reportData = filteredSales.map(sale => ({
      "ID Venta": sale.id,
      "Fecha": formatDateEsPE(sale.dateOnly),
      "Hora": getTime(sale.date),
      "Cliente": sale.customer,
      "DNI": sale.dni,
      "Cantidad Productos": sale.items.length,
      "Subtotal": sale.subtotal.toFixed(2),
      "Descuento": sale.discount.toFixed(2),
      "Total": sale.total.toFixed(2),
      "Método de Pago": sale.paymentMethod,
      "Vendedor": sale.user
    }));

    // Crear resumen
    const totalVentas = filteredSales.length;
    const totalMonto = filteredSales.reduce((sum, sale) => sum + sale.total, 0);
    const totalDescuentos = filteredSales.reduce((sum, sale) => sum + sale.discount, 0);

    // Crear workbook
    const wb = XLSX.utils.book_new();

    // Hoja 1: Resumen
    const summaryData = [
      ["REPORTE DE VENTAS"],
      [""],
      ["Fecha de Generación:", new Date().toLocaleDateString('es-PE')],
      ["Filtro de Fecha:", reportFilterDate ? formatDateEsPE(reportFilterDate) : "Todas las fechas"],
      ["Filtro de Vendedor:", reportFilterUser === "all" ? "Todos los vendedores" : reportFilterUser],
      [""],
      ["RESUMEN"],
      ["Total de Ventas:", totalVentas],
      ["Monto Total:", "S/ " + totalMonto.toFixed(2)],
      ["Total Descuentos:", "S/ " + totalDescuentos.toFixed(2)],
      ["Promedio por Venta:", "S/ " + (totalMonto / totalVentas).toFixed(2)]
    ];

    const ws1 = XLSX.utils.aoa_to_sheet(summaryData);
    ws1["!cols"] = [{ wch: 25 }, { wch: 20 }];
    XLSX.utils.book_append_sheet(wb, ws1, "Resumen");

    // Hoja 2: Detalle de ventas
    const ws2 = XLSX.utils.json_to_sheet(reportData);
    ws2["!cols"] = [
      { wch: 12 }, { wch: 12 }, { wch: 10 }, { wch: 20 },
      { wch: 12 }, { wch: 15 }, { wch: 12 }, { wch: 12 },
      { wch: 12 }, { wch: 15 }, { wch: 15 }
    ];
    XLSX.utils.book_append_sheet(wb, ws2, "Detalle");

    // Descargar archivo
    const fileName = `Reporte_Ventas_${formatDateEsPE(reportFilterDate) || 'Todas'}_${new Date().toLocaleDateString('es-PE').replace(/\//g, "-")}.xlsx`;
    XLSX.writeFile(wb, fileName);
    
    setShowReportDialog(false);
  };

  // Obtener vendedores únicos del historial
  const uniqueUsers = Array.from(new Set(dataService.getSales().map(sale => sale.user)));

  return (
    <div className="space-y-6">
      <div>
        <h2 style={{ color: '#D5B888' }}>Módulo de Ventas</h2>
        <p className="text-muted-foreground">Gestión de ventas y punto de venta</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <Card style={{ borderTop: '4px solid #9AAD97' }}>
            <CardHeader>
              <CardTitle style={{ color: '#9AAD97' }}>Buscar Productos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nombre o código..."
                  value={searchProduct}
                  onChange={(e) => setSearchProduct(e.target.value)}
                  className="pl-10"
                />
              </div>
            </CardContent>
          </Card>

          <Card style={{ borderTop: '4px solid #D5B888' }}>
            <CardHeader>
              <CardTitle style={{ color: '#D5B888' }}>Productos Disponibles</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {filteredProducts.map((product) => (
                  <div
                    key={product.id}
                    onMouseEnter={() => setHoveredProductId(product.id)}
                    onMouseLeave={() => setHoveredProductId(null)}
                    className="flex items-center justify-between p-3 border rounded-lg transition-all cursor-pointer"
                    style={{
                      backgroundColor: hoveredProductId === product.id ? '#D5B888' : 'transparent',
                      color: hoveredProductId === product.id ? 'white' : 'inherit',
                      borderColor: hoveredProductId === product.id ? '#D5B888' : 'inherit'
                    }}
                  >
                    <div className="flex-1">
                      <p style={{ color: hoveredProductId === product.id ? 'white' : 'inherit' }}>{product.name}</p>
                      <p className="text-sm" style={{ color: hoveredProductId === product.id ? 'rgba(255,255,255,0.8)' : '#999' }}>
                        Código: {product.code} | Stock: {product.stock} | Estante: {product.shelf ?? product.estante ?? 'N/A'}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <p style={{ color: hoveredProductId === product.id ? 'white' : '#D5B888', fontWeight: 'bold' }}>S/ {(product.price || 0).toFixed(2)}</p>
                      <Button size="sm" onClick={() => addToCart(product)} style={{ backgroundColor: '#9AAD97', color: 'white', border: 'none' }}>
                        <Plus className="h-4 w-4 mr-1" />
                        Agregar
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openMayoristaDialog(product)}
                        onMouseEnter={() => setHoveredMayoristaProductId(product.id)}
                        onMouseLeave={() => setHoveredMayoristaProductId(null)}
                        style={{
                          borderColor: hoveredMayoristaProductId === product.id ? '#9AAD97' : '#D5B888',
                          borderWidth: hoveredMayoristaProductId === product.id ? '2px' : '1px',
                          color: hoveredProductId === product.id ? 'white' : '#D5B888',
                          backgroundColor: 'transparent'
                        }}
                      >
                        Mayorista
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card style={{ borderTop: '4px solid #D5B888' }}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2" style={{ color: '#D5B888' }}>
                <ShoppingCart className="h-5 w-5" />
                Carrito de Venta
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div>
                  <label className="text-sm mb-2 block">Nombre del Cliente</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Nombre completo"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-sm mb-2 block">DNI del Cliente</label>
                  <Input
                    placeholder="12345678"
                    maxLength={8}
                    value={customerDni}
                    onChange={(e) => setCustomerDni(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {cart.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    No hay productos en el carrito
                  </p>
                ) : (
                  cart.map((item) => (
                    <div key={item.id} className="flex items-center gap-2 p-2 border rounded">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="text-sm">{item.name || ''}</p>
                          {item.isMayorista && (
                            <Badge variant="outline" style={{ borderColor: '#D5B888', color: '#D5B888' }}>
                              Mayorista
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {item.isMayorista
                            ? `S/ ${(item.price || 0).toFixed(2)} mayorista • ${item.unitsPerMayorista || 0} pastillas`
                            : `S/ ${(item.price || 0).toFixed(2)} c/u`}
                        </p>
                      </div>
                      <Input
                        type="number"
                        min="1"
                        value={item.quantity || 1}
                        onChange={(e) => updateQuantity(item.id, parseInt(e.target.value) || 1)}
                        className="w-16 h-8 text-center"
                      />
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => removeFromCart(item.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))
                )}
              </div>

              <div className="border-t pt-4 space-y-3">
                <div>
                  <label className="text-sm mb-2 block">Cupón de Descuento</label>
                  {appliedCoupon ? (
                    <div className="flex items-center gap-2 p-3 rounded-lg" style={{ backgroundColor: 'rgba(154, 173, 151, 0.1)', border: '2px solid #9AAD97' }}>
                      <div className="flex-1">
                        <p className="text-sm" style={{ color: '#9AAD97', fontWeight: 'bold' }}>{appliedCoupon.code}</p>
                        <p className="text-xs" style={{ color: '#9AAD97' }}>{appliedCoupon.description}</p>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={removeCoupon}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <Input
                        placeholder="Código de cupón"
                        value={couponCode}
                        onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={applyCoupon}
                        disabled={!couponCode}
                      >
                        Aplicar
                      </Button>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Subtotal:</span>
                    <span>S/ {subtotal.toFixed(2)}</span>
                  </div>
                  {appliedCoupon && (
                    <div className="flex justify-between text-sm" style={{ color: '#9AAD97', fontWeight: 'bold' }}>
                      <span>Descuento:</span>
                      <span>- S/ {discount.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between border-t pt-2" style={{ color: '#D5B888', fontWeight: 'bold', fontSize: '1.125rem' }}>
                    <span>Total:</span>
                    <span className="text-lg">S/ {total.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-sm">Método de Pago</Label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    className="flex items-center justify-center p-3 border-2 rounded-lg cursor-pointer transition-all"
                    style={{
                      borderColor: paymentMethod === 'efectivo' ? '#9AAD97' : '#e5e7eb',
                      backgroundColor: paymentMethod === 'efectivo' ? 'rgba(154, 173, 151, 0.1)' : 'white'
                    }}
                    onClick={() => setPaymentMethod('efectivo')}
                  >
                    <span className="text-sm">💵 Efectivo</span>
                  </button>
                  <button
                    type="button"
                    className="flex items-center justify-center p-3 border-2 rounded-lg cursor-pointer transition-all"
                    style={{
                      borderColor: paymentMethod === 'yape' ? '#cc10c9dd' : '#e5e7eb',
                      backgroundColor: paymentMethod === 'yape' ? 'rgba(200, 0, 255, 0.1)' : 'white'
                    }}
                    onClick={() => setPaymentMethod('yape')}
                  >
                    <span className="text-sm">📱 Yape</span>
                  </button>
                  <button
                    type="button"
                    className="flex items-center justify-center p-3 border-2 rounded-lg cursor-pointer transition-all"
                    style={{
                      borderColor: paymentMethod === 'tarjeta' ? '#9AAD97' : '#e5e7eb',
                      backgroundColor: paymentMethod === 'tarjeta' ? 'rgba(154, 173, 151, 0.1)' : 'white'
                    }}
                    onClick={() => setPaymentMethod('tarjeta')}
                  >
                    <span className="text-sm">💳 Tarjeta</span>
                  </button>
                  <button
                    type="button"
                    className="flex items-center justify-center p-3 border-2 rounded-lg cursor-pointer transition-all"
                    style={{
                      borderColor: paymentMethod === 'transferencia' ? '#D5B888' : '#e5e7eb',
                      backgroundColor: paymentMethod === 'transferencia' ? 'rgba(213, 184, 136, 0.1)' : 'white'
                    }}
                    onClick={() => setPaymentMethod('transferencia')}
                  >
                    <span className="text-sm">🏦 Transferencia</span>
                  </button>
                </div>
              </div>

              {paymentMethod === 'efectivo' && (
                <div className="space-y-2 p-3 rounded-lg" style={{ backgroundColor: 'rgba(213, 184, 136, 0.1)', borderLeft: '4px solid #D5B888' }}>
                  <Label className="text-sm" style={{ color: '#D5B888' }}>Dinero Recibido</Label>
                  <Input
                    type="number"
                    placeholder="Ingrese el dinero del cliente"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    step="0.50"
                    min="0"
                    style={{ borderColor: '#D5B888' }}
                  />
                  {paymentAmount && !isNaN(parseFloat(paymentAmount)) && (
                    <div className="space-y-1 pt-2">
                      <div className="flex justify-between text-sm">
                        <span style={{ color: '#666' }}>Total:</span>
                        <span style={{ color: '#D5B888', fontWeight: 'bold' }}>S/ {total.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span style={{ color: '#666' }}>Dinero:</span>
                        <span style={{ color: '#D5B888', fontWeight: 'bold' }}>S/ {parseFloat(paymentAmount).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-sm border-t pt-1" style={{ color: '#9AAD97', fontWeight: 'bold' }}>
                        <span>Vuelto:</span>
                        <span>S/ {(parseFloat(paymentAmount) - total).toFixed(2)}</span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              <Button
                className="w-full"
                onClick={completeSale}
                disabled={cart.length === 0}
                style={{ backgroundColor: '#D5B888', color: 'white', border: 'none' }}
              >
                Completar Venta
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      <Card style={{ borderTop: '4px solid #9AAD97' }}>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle style={{ color: '#9AAD97' }}>Ventas Recientes</CardTitle>
          <Button 
            onClick={() => setShowReportDialog(true)}
            style={{ backgroundColor: '#9AAD97', color: 'white', border: 'none' }}
          >
            <FileText className="h-4 w-4 mr-2" />
            Generar Reporte
          </Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID Venta</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Vendedor</TableHead>
                <TableHead>Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(() => {
                const displayedSales = currentUser.role && currentUser.role.toLowerCase() === 'vendedor'
                  ? sales.filter(s => s.user === currentUser.name)
                  : sales;
                if (displayedSales.length > 0) {
                  return displayedSales.map((sale) => (
                    <TableRow key={sale.id}>
                      <TableCell>{sale.id}</TableCell>
                      <TableCell>{sale.date}</TableCell>
                      <TableCell>{sale.customer}</TableCell>
                      <TableCell>S/ {sale.total.toFixed(2)}</TableCell>
                      <TableCell>{sale.user}</TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleOpenVoucherDialog(sale)}
                          style={{ color: '#9AAD97', borderColor: '#9AAD97' }}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          Ver
                        </Button>
                      </TableCell>
                    </TableRow>
                  ));
                }
                return (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground">
                      No hay ventas registradas
                    </TableCell>
                  </TableRow>
                );
              })()}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Dialog para el voucher */}
      <Dialog open={showVoucherDialog} onOpenChange={setShowVoucherDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle style={{ color: '#D5B888' }}>Comprobante de Venta</DialogTitle>
            <DialogDescription>
              Revisa los detalles de tu venta y descarga el comprobante.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">ID Venta:</p>
              <p className="text-sm font-bold">{lastSaleData?.id}</p>
            </div>
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">Fecha:</p>
              <p className="text-sm font-bold">{lastSaleData?.date}</p>
            </div>
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">Cliente:</p>
              <p className="text-sm font-bold">{lastSaleData?.customer}</p>
            </div>
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">DNI:</p>
              <p className="text-sm font-bold">{lastSaleData?.dni}</p>
            </div>
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">Método de Pago:</p>
              <p className="text-sm font-bold">{lastSaleData?.paymentMethod}</p>
            </div>
            <div className="border-t pt-4">
              <table className="w-full">
                <thead>
                  <tr>
                    <th className="text-sm text-left py-2" style={{ color: '#D5B888', fontWeight: 'bold' }}>Producto</th>
                    <th className="text-sm text-left py-2" style={{ color: '#9AAD97', fontWeight: 'bold' }}>Cant.</th>
                    <th className="text-sm text-left py-2" style={{ color: '#D5B888', fontWeight: 'bold' }}>P. Unit</th>
                    <th className="text-sm text-left py-2" style={{ color: '#9AAD97', fontWeight: 'bold' }}>Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  {lastSaleData?.items && lastSaleData?.items.length > 0 ? (
                    lastSaleData?.items.map((item: any) => (
                      <tr key={item.id || item.idproducto}>
                        <td className="text-sm py-1">{item.name || ''}</td>
                        <td className="text-sm py-1">{item.quantity || 0}</td>
                        <td className="text-sm py-1">S/ {(item.price || 0).toFixed(2)}</td>
                        <td className="text-sm py-1">S/ {(((item.price || 0) * (item.quantity || 0))).toFixed(2)}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="text-sm py-2 text-center text-muted-foreground">
                        No hay productos en esta venta
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="border-t pt-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">Subtotal:</p>
                <p className="text-sm font-bold" style={{ color: '#D5B888' }}>S/ {(lastSaleData?.subtotal || 0).toFixed(2)}</p>
              </div>
              {(lastSaleData?.discount || 0) > 0 && (
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">Descuento:</p>
                  <p className="text-sm font-bold" style={{ color: '#9AAD97' }}>- S/ {(lastSaleData?.discount || 0).toFixed(2)}</p>
                </div>
              )}
              <div className="flex items-center justify-between pt-2 border-t">
                <p className="text-sm text-muted-foreground">Total:</p>
                <p className="text-lg font-bold" style={{ color: '#D5B888' }}>S/ {(lastSaleData?.total || 0).toFixed(2)}</p>
              </div>
              {(lastSaleData?.paymentAmount || 0) > 0 && (
                <>
                  <div className="flex items-center justify-between pt-2">
                    <p className="text-sm text-muted-foreground">Dinero Recibido:</p>
                    <p className="text-sm font-bold" style={{ color: '#D5B888' }}>S/ {(lastSaleData?.paymentAmount || 0).toFixed(2)}</p>
                  </div>
                  {(lastSaleData?.vuelto || 0) > 0 && (
                    <div className="flex items-center justify-between border-t pt-2">
                      <p className="text-sm text-muted-foreground">Vuelto:</p>
                      <p className="text-sm font-bold" style={{ color: '#9AAD97' }}>S/ {(lastSaleData?.vuelto || 0).toFixed(2)}</p>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 mt-4 flex-wrap">
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                generatePDF(lastSaleData);
                finalizeSale();
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
                generatePDF(lastSaleData);
                setTimeout(() => {
                  window.print();
                  finalizeSale();
                }, 500);
              }}
              style={{ color: '#D5B888', borderColor: '#D5B888' }}
            >
              <Printer className="h-4 w-4 mr-1" />
              Imprimir
            </Button>
            <Button
              size="sm"
              onClick={finalizeSale}
              style={{ backgroundColor: '#9AAD97', color: 'white', border: 'none', marginLeft: 'auto' }}
            >
              Continuar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog para generar reporte de ventas */}
      <Dialog open={showReportDialog} onOpenChange={setShowReportDialog}>
        <DialogContent className="w-full max-w-[500px]">
          <DialogHeader>
            <DialogTitle style={{ color: '#D5B888' }}>Generar Reporte de Ventas</DialogTitle>
            <DialogDescription>
              Selecciona los filtros para generar el reporte en Excel
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="filterDate" style={{ color: '#D5B888' }}>Fecha de Venta</Label>
              <Input
                id="filterDate"
                type="date"
                value={reportFilterDate}
                onChange={(e) => setReportFilterDate(e.target.value)}
              />
              <p className="text-xs text-gray-500">Por defecto: hoy</p>
            </div>

            <div className="space-y-2">
              <Label style={{ color: '#9AAD97' }}>Vendedor</Label>
              <Select value={reportFilterUser} onValueChange={setReportFilterUser}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar vendedor" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los vendedores</SelectItem>
                  {uniqueUsers.map(user => (
                    <SelectItem key={user} value={user}>{user}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-500">Selecciona un vendedor o deja en blanco para todos</p>
            </div>

            <div className="bg-blue-50 p-3 rounded border border-blue-200">
              <p className="text-sm text-blue-800">
                <strong>Total de ventas con filtros:</strong> {dataService.getSales().filter(s => 
                  (!reportFilterDate || s.dateOnly === reportFilterDate) &&
                  (reportFilterUser === "all" || s.user === reportFilterUser)
                ).length}
              </p>
            </div>
          </div>

          <div className="flex gap-2 justify-end pt-4">
            <Button
              variant="outline"
              onClick={() => setShowReportDialog(false)}
            >
              Cancelar
            </Button>
            <Button
              onClick={generateSalesReport}
              style={{ backgroundColor: '#9AAD97', color: 'white', border: 'none' }}
            >
              <Download className="h-4 w-4 mr-2" />
              Generar Excel
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showMayoristaDialog} onOpenChange={setShowMayoristaDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Venta Mayorista</DialogTitle>
            <DialogDescription asChild>
              <div className="space-y-1">
                <p className="font-medium text-foreground">
                  {mayoristaProduct?.name ?? mayoristaProduct?.nombre ?? "Producto"}
                </p>
                {(() => {
                  const info = mayoristaProduct ? getMayoristaPriceInfo(mayoristaProduct) : null;
                  if (!info) return null;
                  return (
                    <p className="text-sm" style={{ color: '#9AAD97' }}>
                      {info.label}: S/ {info.price.toFixed(2)}
                    </p>
                  );
                })()}
              </div>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Pastillas a descontar del inventario</Label>
              <Input
                type="number"
                min="1"
                step="1"
                value={mayoristaUnits}
                onChange={(e) => setMayoristaUnits(e.target.value)}
                placeholder="Ej: 10"
              />
            </div>

            <div className="space-y-2">
              <Label>Precio mayorista (se suma al total)</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={mayoristaPrice}
                onChange={(e) => setMayoristaPrice(e.target.value)}
                placeholder="Ej: 5.00"
              />
            </div>

            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowMayoristaDialog(false)}>
                Cancelar
              </Button>
              <Button onClick={addMayoristaToCart} style={{ backgroundColor: '#D5B888', color: 'white', border: 'none' }}>
                Agregar mayorista
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}