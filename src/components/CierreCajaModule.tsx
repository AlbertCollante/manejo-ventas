import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { Label } from "./ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { DollarSign, Lock, Send, Download, ShoppingCart, Calendar } from "lucide-react";
import { Textarea } from "./ui/textarea";
import { Badge } from "./ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";
import { dataService, CierreCaja } from "../services/dataService";
import * as XLSX from 'xlsx';

interface CierreCajaModuleProps {
  currentUser: {
    username: string;
    role: string;
    name: string;
  };
}

export function CierreCajaModule({ currentUser }: CierreCajaModuleProps) {
  const [montoEfectivo, setMontoEfectivo] = useState("");
  const [montoYape, setMontoYape] = useState("");
  const [montoTarjeta, setMontoTarjeta] = useState("");
  const [montoTransferencia, setMontoTransferencia] = useState("");
  const [observaciones, setObservaciones] = useState("");
  const [email, setEmail] = useState("");
  const [cajaCerrada, setCajaCerrada] = useState(false);
  const [activeTab, setActiveTab] = useState("actual");
  
  // Para reportes de rango de fechas
  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaFin, setFechaFin] = useState("");
  const [cierresHistorico, setCierresHistorico] = useState<CierreCaja[]>([]);
  const [allCierres, setAllCierres] = useState<CierreCaja[]>([]);
  const [ventasDelDia, setVentasDelDia] = useState<any[]>([]);
  const [serviciosDelDia, setServiciosDelDia] = useState<any[]>([]);
  const [montoInicial, setMontoInicial] = useState<number>(0);
  const [aperturaDelDia, setAperturaDelDia] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const API_BASE = 'http://localhost:9000';

  const mapApiClosureToCierreCaja = (item: any): CierreCaja => {
    const efectivo = Number(item.efectivo ?? 0);
    const yape = Number(item.yape ?? 0);
    const tarjeta = Number(item.tarjeta ?? 0);
    const transferencia = Number(item.transferencia ?? 0);
    const total = Number(item.total ?? 0);
    const diferenciaApi = total - (efectivo + yape + tarjeta + transferencia);

    const rawFecha = item.fecha_hora || new Date().toISOString();
    const parsedDate = new Date(rawFecha);
    let fecha = String(rawFecha);
    
    if (!isNaN(parsedDate.getTime())) {
      const dateStr = parsedDate.toLocaleDateString('es-PE');
      const timeStr = parsedDate.toLocaleTimeString('es-PE');
      fecha = `${dateStr}, ${timeStr}`;
    }

    return {
      id: Number(item.id),
      fecha,
      usuario: item.usuario || '',
      montoInicial: 0,
      totalVentas: total,
      montosContados: {
        efectivo,
        yape,
        tarjeta,
        transferencia,
      },
      totalContado: total,
      diferencia: diferenciaApi,
      observaciones: item.observaciones || '',
      ventasDelDia: [],
      aperturaId: item.aperturaId || item.id_apertura || '-',
    };
  };

  const normalizeApiSale = (sale: any) => {
    // El API devuelve directamente los totales, no necesitamos calcularlos
    const subtotal = Number(sale.subtotal ?? 0);
    const discount = Number(sale.descuento ?? 0);
    const total = Number(sale.total ?? 0);

    // Normalizar método de pago a formato capitalizado
    let paymentMethod = String(sale.metodo ?? sale.metodoPago ?? sale.paymentMethod ?? 'Efectivo');
    const pm = paymentMethod.toLowerCase();
    if (pm.includes('efect')) paymentMethod = 'Efectivo';
    else if (pm.includes('tarj')) paymentMethod = 'Tarjeta';
    else if (pm.includes('yape')) paymentMethod = 'Yape';
    else if (pm.includes('trans')) paymentMethod = 'Transferencia';
    else paymentMethod = paymentMethod.charAt(0).toUpperCase() + paymentMethod.slice(1);

    // Parsear fecha robustamente: soporta ISO y formato "DD/MM/YYYY HH:MM:SS"
    const raw = sale.fecha ?? sale.date ?? new Date().toISOString();
    let saleDateObj = new Date(raw);
    if (isNaN(saleDateObj.getTime())) {
      // Intentar parsear formato DD/MM/YYYY HH:MM:SS
      try {
        const [datePart, timePart] = String(raw).split(' ');
        const [day, month, year] = (datePart ?? '').split('/');
        const [hour = '00', minute = '00', second = '00'] = (timePart ?? '').split(':');
        if (day && month && year) {
          saleDateObj = new Date(
            parseInt(year, 10),
            parseInt(month, 10) - 1,
            parseInt(day, 10),
            parseInt(hour, 10) || 0,
            parseInt(minute, 10) || 0,
            parseInt(second, 10) || 0
          );
        }
      } catch (e) {
        saleDateObj = new Date();
      }
    }

    const pad = (n: number) => n.toString().padStart(2, '0');
    const dateFormatted = `${pad(saleDateObj.getDate())}/${pad(saleDateObj.getMonth() + 1)}/${saleDateObj.getFullYear()} ${pad(saleDateObj.getHours())}:${pad(saleDateObj.getMinutes())}:${pad(saleDateObj.getSeconds())}`;

    return {
      id: sale.id ?? `V-${Math.random().toString().slice(2, 6)}`,
      // date: cadena legible para la UI, dateObj: instancia para comparar
      date: dateFormatted,
      dateObj: saleDateObj,
      dateOnly: saleDateObj.toISOString().split('T')[0],
      customer: sale.cliente ?? sale.customer ?? 'Cliente General',
      dni: sale.dni ?? sale.documento ?? '---',
      items: sale.items ?? [],
      subtotal,
      discount,
      total,
      paymentAmount: Number(sale.pago ?? sale.paymentAmount ?? total),
      vuelto: Number(sale.vuelto ?? 0),
      paymentMethod,
      user: sale.usuario ?? sale.user ?? 'caja1',
      type: 'venta',
      id_apertura: sale.id_apertura ?? null
    };
  };

  const normalizeApiService = (service: any) => {
    const subtotal = Number(service.subtotal ?? 0);
    
    // Normalizar método de pago
    let paymentMethod = String(service.metodo ?? 'Efectivo');
    const pm = paymentMethod.toLowerCase();
    if (pm.includes('efect')) paymentMethod = 'Efectivo';
    else if (pm.includes('tarj')) paymentMethod = 'Tarjeta';
    else if (pm.includes('yape')) paymentMethod = 'Yape';
    else if (pm.includes('trans')) paymentMethod = 'Transferencia';
    else paymentMethod = paymentMethod.charAt(0).toUpperCase() + paymentMethod.slice(1);

    // Parsear fecha
    const raw = service.hora ?? service.fecha ?? new Date().toISOString();
    let serviceDateObj = new Date(raw);
    if (isNaN(serviceDateObj.getTime())) {
      try {
        const [datePart, timePart] = String(raw).split(' ');
        const [day, month, year] = (datePart ?? '').split('/');
        const [hour = '00', minute = '00', second = '00'] = (timePart ?? '').split(':');
        if (day && month && year) {
          serviceDateObj = new Date(
            parseInt(year, 10),
            parseInt(month, 10) - 1,
            parseInt(day, 10),
            parseInt(hour, 10) || 0,
            parseInt(minute, 10) || 0,
            parseInt(second, 10) || 0
          );
        }
      } catch (e) {
        serviceDateObj = new Date();
      }
    }

    const pad = (n: number) => n.toString().padStart(2, '0');
    const dateFormatted = `${pad(serviceDateObj.getDate())}/${pad(serviceDateObj.getMonth() + 1)}/${serviceDateObj.getFullYear()} ${pad(serviceDateObj.getHours())}:${pad(serviceDateObj.getMinutes())}:${pad(serviceDateObj.getSeconds())}`;

    return {
      id: service.idserviciodado ?? `SRV-${Math.random().toString().slice(2, 6)}`,
      date: dateFormatted,
      dateObj: serviceDateObj,
      dateOnly: serviceDateObj.toISOString().split('T')[0],
      vendor: service.vendedor ?? 'Sin especificar',
      description: service.descripcion ?? 'Servicio',
      subtotal,
      paymentAmount: Number(service.pago ?? subtotal),
      vuelto: Number(service.vuelto ?? 0),
      paymentMethod,
      user: service.usuario ?? 'caja1',
      type: 'servicio',
      idapertura: service.idapertura ?? service.id_apertura ?? null
    };
  };

  const fetchVentasDelDia = async (aperturaId: number) => {
    try {
      const resp = await fetch(`${API_BASE}/ventas`);
      if (!resp.ok) throw new Error('Error al obtener ventas de la API');

      const data = await resp.json();
      const allSales = Array.isArray(data) ? data : [];

      // Normalizar ventas
      const normalizedSales = allSales.map(normalizeApiSale);

      // Filtrar ventas que pertenecen a esta caja (por aperturaId)
      const filteredSales = normalizedSales.filter(sale => sale.id_apertura === aperturaId);

      // Obtener detalles de cada venta para saber los productos
      const ventasConDetalles = await Promise.all(
        filteredSales.map(async (sale) => {
          if (!sale.items || sale.items.length === 0) {
            try {
              const detailResp = await fetch(`${API_BASE}/detalle-venta`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ idventa: sale.id })
              });
              if (detailResp.ok) {
                const detailData = await detailResp.json();
                const items = Array.isArray(detailData) ? detailData : (detailData.detalle || []);
                return { ...sale, items };
              }
            } catch (e) {
              console.error('Error obteniendo detalle de venta:', e);
            }
          }
          return sale;
        })
      );

      setVentasDelDia(ventasConDetalles.sort((a, b) => a.dateObj.getTime() - b.dateObj.getTime()));
    } catch (err) {
      console.error('Error cargando ventas:', err);
      setVentasDelDia([]);
    }
  };

  const fetchServiciosDelDia = async (aperturaId: number) => {
    try {
      const resp = await fetch(`${API_BASE}/servicios`);
      if (!resp.ok) throw new Error('Error al obtener servicios de la API');

      const data = await resp.json();
      const allServices = Array.isArray(data) ? data : [];

      // Normalizar servicios
      const normalizedServices = allServices.map(normalizeApiService);

      // Filtrar servicios de la apertura actual (solo por aperturaId)
      const filteredServices = normalizedServices.filter(service => service.idapertura === aperturaId);

      setServiciosDelDia(filteredServices.sort((a, b) => a.dateObj.getTime() - b.dateObj.getTime()));
    } catch (err) {
      console.error('Error cargando servicios:', err);
      setServiciosDelDia([]);
    }
  };

  const fetchCashClosures = async () => {
    try {
      setError(null);
      const response = await fetch(`${API_BASE}/cierres`);
      if (!response.ok) throw new Error('Error al obtener cierres de turno');
      const data = await response.json();
      const closures = Array.isArray(data)
        ? data.map(mapApiClosureToCierreCaja).sort((a, b) => b.id - a.id)
        : [];
      setCierresHistorico(closures);
      setAllCierres(closures);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    }
  };

  const fetchOpenApertura = async () => {
    try {
      setError(null);
      const response = await fetch(`${API_BASE}/aperturas`);
      if (!response.ok) throw new Error('Error al obtener la apertura de caja');
      const data = await response.json();
      const openApertura = Array.isArray(data)
        ? data.find((item: any) => item.estado === 'abierto')
        : null;

      if (openApertura) {
        const rawFecha = openApertura.fecha || openApertura.fecha_hora || new Date().toISOString();
        const parsedDate = new Date(rawFecha);
        const fecha = !isNaN(parsedDate.getTime())
          ? `${parsedDate.toLocaleDateString('es-PE')}, ${parsedDate.toLocaleTimeString('es-PE')}`
          : String(rawFecha);

        setAperturaDelDia({ ...openApertura, fecha });
        setMontoInicial(Number(openApertura.montoInicial ?? 0));

        // Cargar ventas desde la API de esta caja
        await fetchVentasDelDia(openApertura.id);
        // Cargar servicios de esta caja
        await fetchServiciosDelDia(openApertura.id);
      } else {
        setAperturaDelDia(null);
        setMontoInicial(0);
        setVentasDelDia([]);
        setServiciosDelDia([]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
      setAperturaDelDia(null);
      setMontoInicial(0);
      setVentasDelDia([]);
      setServiciosDelDia([]);
    }
  };

  // Cargar cierres, ventas y apertura al montar
  useEffect(() => {
    fetchCashClosures();
    fetchOpenApertura();
  }, []);

  // Cálculos basados en ventas y servicios reales
  const totalVentas = ventasDelDia.reduce((sum, v) => sum + v.total, 0);
  const totalServicios = serviciosDelDia.reduce((sum, s) => sum + s.subtotal, 0);
  const totalIngresos = totalVentas + totalServicios;
  
  // Ingresos por método de pago (ventas + servicios)
  const ingresosPorMetodo = {
    efectivo: (
      ventasDelDia.filter(v => v.paymentMethod === "Efectivo").reduce((sum, v) => sum + v.total, 0) +
      serviciosDelDia.filter(s => s.paymentMethod === "Efectivo").reduce((sum, s) => sum + s.subtotal, 0)
    ),
    yape: (
      ventasDelDia.filter(v => v.paymentMethod === "Yape").reduce((sum, v) => sum + v.total, 0) +
      serviciosDelDia.filter(s => s.paymentMethod === "Yape").reduce((sum, s) => sum + s.subtotal, 0)
    ),
    tarjeta: (
      ventasDelDia.filter(v => v.paymentMethod === "Tarjeta").reduce((sum, v) => sum + v.total, 0) +
      serviciosDelDia.filter(s => s.paymentMethod === "Tarjeta").reduce((sum, s) => sum + s.subtotal, 0)
    ),
    transferencia: (
      ventasDelDia.filter(v => v.paymentMethod === "Transferencia").reduce((sum, v) => sum + v.total, 0) +
      serviciosDelDia.filter(s => s.paymentMethod === "Transferencia").reduce((sum, s) => sum + s.subtotal, 0)
    ),
  };

  const totalEsperado = montoInicial + totalIngresos;
  const totalContado = parseFloat(montoEfectivo || "0") + 
                       parseFloat(montoYape || "0") + 
                       parseFloat(montoTarjeta || "0") + 
                       parseFloat(montoTransferencia || "0");
  const diferencia = totalContado - totalEsperado;

  const handleCerrarCaja = async () => {
    if (!aperturaDelDia) {
      alert('No hay caja abierta para cerrar');
      return;
    }

    if (!montoEfectivo) {
      alert("Por favor ingrese el monto de efectivo contado");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const payload = {
        usuario: currentUser.name,
        efectivo: parseFloat(montoEfectivo || "0"),
        yape: parseFloat(montoYape || "0"),
        tarjeta: parseFloat(montoTarjeta || "0"),
        transferencia: parseFloat(montoTransferencia || "0"),
        total: totalContado,
        observaciones,
        aperturaId: aperturaDelDia.id,
      };

      const response = await fetch(`${API_BASE}/cierre-turno`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || 'Error al registrar cierre de turno');
      }

      await response.json();

      const cerrarResponse = await fetch(`${API_BASE}/cerrar-turno`, {
        method: 'PUT',
      });

      if (!cerrarResponse.ok) {
        const text = await cerrarResponse.text();
        throw new Error(text || 'Error al cerrar la apertura de caja');
      }

      await fetchCashClosures();
      await fetchOpenApertura();
      setCajaCerrada(true);
      alert(`Caja cerrada exitosamente\nVentas: ${ventasDelDia.length} | Servicios: ${serviciosDelDia.length}\nTotal Ventas: S/ ${totalVentas.toFixed(2)}\nTotal Servicios: S/ ${totalServicios.toFixed(2)}\nTotal Ingresos: S/ ${totalIngresos.toFixed(2)}\nTotal contado: S/ ${totalContado.toFixed(2)}\nDiferencia: S/ ${diferencia.toFixed(2)}\n\nCierre registrado en la base de datos`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  };

  const handleEnviarReporte = () => {
    if (!email) {
      alert("Por favor ingrese un correo electrónico");
      return;
    }

    alert(`Reporte de cierre enviado a: ${email}\nVentas: ${ventasDelDia.length}\nServicios: ${serviciosDelDia.length}\nTotal Ingresos: S/ ${totalIngresos.toFixed(2)}`);
  };

  const generarPDFReporte = () => {
    // Generar Excel del cierre actual
    generarExcelCierreActual();
  };

  const generarExcelCierreActual = () => {
    // Crear workbook
    const wb = XLSX.utils.book_new();
    
    // Hoja 1: Resumen del cierre
    const resumenData = [
      ['REPORTE DE CIERRE DE CAJA'],
      [],
      ['Fecha y Hora:', new Date().toLocaleString('es-PE')],
      ['Usuario:', currentUser.name],
      [],
      ['RESUMEN FINANCIERO'],
      ['Concepto', 'Monto (S/)'],
      ['Monto Inicial', montoInicial.toFixed(2)],
      ['Total Ventas', totalVentas.toFixed(2)],
      ['Total Servicios', totalServicios.toFixed(2)],
      ['Total Ingresos', totalIngresos.toFixed(2)],
      ['Total Esperado', totalEsperado.toFixed(2)],
      [],
      ['EFECTIVO CONTADO POR MÉTODO'],
      ['Método', 'Monto (S/)'],
      ['Efectivo', parseFloat(montoEfectivo || "0").toFixed(2)],
      ['Yape/Plin', parseFloat(montoYape || "0").toFixed(2)],
      ['Tarjeta', parseFloat(montoTarjeta || "0").toFixed(2)],
      ['Transferencia', parseFloat(montoTransferencia || "0").toFixed(2)],
      [],
      ['TOTALES'],
      ['Total Contado', totalContado.toFixed(2)],
      ['Total Esperado', totalEsperado.toFixed(2)],
      ['Diferencia', diferencia.toFixed(2)],
      [],
      ['Observaciones:', observaciones || 'Sin observaciones'],
    ];

    const wsResumen = XLSX.utils.aoa_to_sheet(resumenData);
    XLSX.utils.book_append_sheet(wb, wsResumen, "Resumen");

    // Hoja 2: Detalle de ventas
    const ventasHeaderData = [
      ['DETALLE DE VENTAS DEL DÍA'],
      [],
      ['ID', 'Hora', 'Cliente', 'Método de Pago', 'Monto (S/)'],
    ];
    
    const ventasBodyData = ventasDelDia.map(v => {
      // Extraer hora de la fecha (formato: "DD/MM/YYYY HH:MM:SS")
      const [, hora] = v.date.split(' ');
      return [
        v.id,
        hora || 'N/A',
        v.customer,
        v.paymentMethod,
        v.total.toFixed(2)
      ];
    });

    const ventasData = [...ventasHeaderData, ...ventasBodyData];
    ventasData.push([], ['TOTALES POR MÉTODO']);
    ventasData.push(['Efectivo', '', '', '', ingresosPorMetodo.efectivo.toFixed(2)]);
    ventasData.push(['Yape', '', '', '', ingresosPorMetodo.yape.toFixed(2)]);
    ventasData.push(['Tarjeta', '', '', '', ingresosPorMetodo.tarjeta.toFixed(2)]);
    ventasData.push(['Transferencia', '', '', '', ingresosPorMetodo.transferencia.toFixed(2)]);
    ventasData.push(['TOTAL', '', '', '', totalIngresos.toFixed(2)]);

    const wsVentas = XLSX.utils.aoa_to_sheet(ventasData);
    XLSX.utils.book_append_sheet(wb, wsVentas, "Ventas y Servicios");

    // Hoja 3: Detalle de servicios
    const serviciosHeaderData = [
      ['DETALLE DE SERVICIOS DEL DÍA'],
      [],
      ['ID', 'Hora', 'Vendedor', 'Descripción', 'Método de Pago', 'Monto (S/)'],
    ];
    
    const serviciosBodyData = serviciosDelDia.map(s => {
      // Extraer hora de la fecha
      const [, hora] = s.date.split(' ');
      return [
        s.id,
        hora || 'N/A',
        s.vendor,
        s.description,
        s.paymentMethod,
        s.subtotal.toFixed(2)
      ];
    });

    const serviciosData = [...serviciosHeaderData, ...serviciosBodyData];
    serviciosData.push([], ['TOTAL SERVICIOS', '', '', '', '', totalServicios.toFixed(2)]);

    const wsServicios = XLSX.utils.aoa_to_sheet(serviciosData);
    XLSX.utils.book_append_sheet(wb, wsServicios, "Servicios");

    // Generar archivo
    const nombreArchivo = `Cierre_Caja_${new Date().toISOString().split('T')[0]}_${new Date().getHours()}${new Date().getMinutes()}.xlsx`;
    XLSX.writeFile(wb, nombreArchivo);
    
    alert('Excel generado y descargado correctamente');
  };

  const generarExcelReportePeriodo = () => {
    // Crear workbook
    const wb = XLSX.utils.book_new();
    
    // Hoja 1: Resumen del período
    const resumenPeriodoData = [
      ['REPORTE DE CIERRES DE CAJA - PERÍODO'],
      [],
      ['Fecha Inicio:', fechaInicio],
      ['Fecha Fin:', fechaFin],
      ['Total de Cierres:', cierresHistorico.length],
      [],
      ['RESUMEN FINANCIERO DEL PERÍODO'],
      ['Concepto', 'Monto (S/)'],
      ['Total Ventas General', totalGeneralHistorico.toFixed(2)],
      ['Total Efectivo', totalEfectivoHistorico.toFixed(2)],
      ['Total Yape', totalYapeHistorico.toFixed(2)],
      ['Total Tarjeta', totalTarjetaHistorico.toFixed(2)],
      ['Total Transferencia', totalTransferenciaHistorico.toFixed(2)],
    ];

    const wsResumen = XLSX.utils.aoa_to_sheet(resumenPeriodoData);
    XLSX.utils.book_append_sheet(wb, wsResumen, "Resumen");

    // Hoja 2: Detalle de cierres
    const detalleHeaderData = [
      ['DETALLE DE CIERRES DE CAJA'],
      [],
      ['Nro Caja', 'Fecha y Hora', 'Usuario', 'Efectivo (S/)', 'Yape (S/)', 'Tarjeta (S/)', 'Transferencia (S/)', 'Total (S/)', 'Diferencia (S/)'],
    ];

    const detalleBodyData = cierresHistorico.map(c => [
      c.aperturaId,
      c.fecha,
      c.usuario,
      c.montosContados.efectivo.toFixed(2),
      c.montosContados.yape.toFixed(2),
      c.montosContados.tarjeta.toFixed(2),
      c.montosContados.transferencia.toFixed(2),
      c.totalContado.toFixed(2),
      c.diferencia.toFixed(2),
    ]);

    const detalleData = [...detalleHeaderData, ...detalleBodyData];
    detalleData.push([]);
    detalleData.push(['', 'TOTALES', '', 
      totalEfectivoHistorico.toFixed(2),
      totalYapeHistorico.toFixed(2),
      totalTarjetaHistorico.toFixed(2),
      totalTransferenciaHistorico.toFixed(2),
      (totalEfectivoHistorico + totalYapeHistorico + totalTarjetaHistorico + totalTransferenciaHistorico).toFixed(2),
      ''
    ]);

    const wsDetalle = XLSX.utils.aoa_to_sheet(detalleData);
    XLSX.utils.book_append_sheet(wb, wsDetalle, "Cierres");

    // Generar archivo
    const nombreArchivo = `Reporte_Cierres_${fechaInicio}_${fechaFin}.xlsx`;
    XLSX.writeFile(wb, nombreArchivo);

    alert('Excel generado y descargado correctamente');
  };

  const buscarCierresPorFecha = () => {
    if (!fechaInicio || !fechaFin) {
      alert("Por favor seleccione ambas fechas");
      return;
    }

    const filtered = allCierres.filter((cierre) => {
      const closureDate = new Date(cierre.fecha);
      if (!isNaN(closureDate.getTime())) {
        const formatted = closureDate.toISOString().split('T')[0];
        return formatted >= fechaInicio && formatted <= fechaFin;
      }

      const [datePart] = cierre.fecha.split(' ');
      const [day, month, year] = datePart.split('/');
      if (!day || !month || !year) return false;
      const closureDateFormatted = `${year}-${month}-${day}`;
      return closureDateFormatted >= fechaInicio && closureDateFormatted <= fechaFin;
    });

    setCierresHistorico(filtered);
  };

  const resetearReporte = () => {
    setFechaInicio("");
    setFechaFin("");
    setCierresHistorico(allCierres);
  };

  const totalGeneralHistorico = cierresHistorico.reduce((sum, c) => sum + c.totalVentas, 0);
  const totalEfectivoHistorico = cierresHistorico.reduce((sum, c) => sum + c.montosContados.efectivo, 0);
  const totalYapeHistorico = cierresHistorico.reduce((sum, c) => sum + c.montosContados.yape, 0);
  const totalTarjetaHistorico = cierresHistorico.reduce((sum, c) => sum + c.montosContados.tarjeta, 0);
  const totalTransferenciaHistorico = cierresHistorico.reduce((sum, c) => sum + c.montosContados.transferencia, 0);

  // Verificar si el usuario es administrador
  const isAdmin = currentUser.role?.toLowerCase() === 'admin' || currentUser.role?.toLowerCase() === 'administrador';

  // Si no es admin y está en una pestaña de admin, cambiar a "actual"
  useEffect(() => {
    if (!isAdmin && (activeTab === "historial" || activeTab === "reporte")) {
      setActiveTab("actual");
    }
  }, [isAdmin, activeTab]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 style={{ color: '#D5B888' }}>Cierre de Caja</h2>
          <p className="text-muted-foreground">Registre el arqueo de caja y gestione cierres históricos</p>
        </div>
      </div>

      {/* Tabs para cambiar entre vistas */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-2 mb-4">
            <Button 
              variant={activeTab === "actual" ? "default" : "outline"}
              onClick={() => setActiveTab("actual")}
              style={activeTab === "actual" ? { backgroundColor: '#9AAD97', color: 'white' } : {}}
            >
              Cierre Actual
            </Button>
            {isAdmin && (
              <>
                <Button 
                  variant={activeTab === "historial" ? "default" : "outline"}
                  onClick={() => setActiveTab("historial")}
                  style={activeTab === "historial" ? { backgroundColor: '#9AAD97', color: 'white' } : {}}
                >
                  Historial de Cierres
                </Button>
                <Button 
                  variant={activeTab === "reporte" ? "default" : "outline"}
                  onClick={() => setActiveTab("reporte")}
                  style={activeTab === "reporte" ? { backgroundColor: '#9AAD97', color: 'white' } : {}}
                >
                  Reporte por Fechas
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* TAB 1: CIERRE ACTUAL */}
      {activeTab === "actual" && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-lg bg-blue-100">
                    <DollarSign className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Monto Inicial</p>
                    <p className="text-xl">S/ {montoInicial.toFixed(2)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-lg bg-green-100">
                    <ShoppingCart className="h-6 w-6 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Ventas</p>
                    <p className="text-xl">S/ {totalVentas.toFixed(2)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-lg bg-purple-100">
                    <DollarSign className="h-6 w-6 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Esperado en Caja</p>
                    <p className="text-xl">S/ {totalEsperado.toFixed(2)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-lg ${diferencia >= 0 ? 'bg-green-100' : 'bg-red-100'}`}>
                    <DollarSign className={`h-6 w-6 ${diferencia >= 0 ? 'text-green-600' : 'text-red-600'}`} />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Diferencia</p>
                    <p className={`text-xl ${diferencia >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      S/ {Math.abs(diferencia).toFixed(2)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Ventas por Método de Pago</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 border-l-4 border-green-500 bg-green-50 rounded-lg">
                    <span>Efectivo</span>
                    <span>S/ {ingresosPorMetodo.efectivo.toFixed(2)}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 border-l-4 border-purple-500 bg-purple-50 rounded-lg">
                    <span>Yape</span>
                    <span>S/ {ingresosPorMetodo.yape.toFixed(2)}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 border-l-4 border-cyan-500 bg-cyan-50 rounded-lg">
                    <span>Tarjeta</span>
                    <span>S/ {ingresosPorMetodo.tarjeta.toFixed(2)}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 border-l-4 border-blue-500 bg-blue-50 rounded-lg">
                    <span>Transferencia</span>
                    <span>S/ {ingresosPorMetodo.transferencia.toFixed(2)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card style={{ borderTop: '4px solid #D5B888' }}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2" style={{ color: '#D5B888' }}>
                  <Lock className="h-5 w-5" />
                  Arqueo de Caja
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {!cajaCerrada ? (
                  aperturaDelDia ? (
                    <>
                      <div>
                        <Label>Efectivo Contado *</Label>
                        <div className="relative mt-2">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                            S/
                          </span>
                          <Input
                            type="number"
                            step="0.01"
                            placeholder="0.00"
                            value={montoEfectivo}
                            onChange={(e) => setMontoEfectivo(e.target.value)}
                            className="pl-10"
                          />
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          Esperado: S/ {(montoInicial + ingresosPorMetodo.efectivo).toFixed(2)}
                        </p>
                      </div>

                      <div>
                        <Label>Yape / Plin Contado</Label>
                        <div className="relative mt-2">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                            S/
                          </span>
                          <Input
                            type="number"
                            step="0.01"
                            placeholder="0.00"
                            value={montoYape}
                            onChange={(e) => setMontoYape(e.target.value)}
                            className="pl-10"
                          />
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          Esperado: S/ {ingresosPorMetodo.yape.toFixed(2)}
                        </p>
                      </div>

                      <div>
                        <Label>Tarjeta Contado</Label>
                        <div className="relative mt-2">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                            S/
                          </span>
                          <Input
                            type="number"
                            step="0.01"
                            placeholder="0.00"
                            value={montoTarjeta}
                            onChange={(e) => setMontoTarjeta(e.target.value)}
                            className="pl-10"
                          />
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          Esperado: S/ {ingresosPorMetodo.tarjeta.toFixed(2)}
                        </p>
                      </div>

                      <div>
                        <Label>Transferencia Contado</Label>
                        <div className="relative mt-2">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                            S/
                          </span>
                          <Input
                            type="number"
                            step="0.01"
                            placeholder="0.00"
                            value={montoTransferencia}
                            onChange={(e) => setMontoTransferencia(e.target.value)}
                            className="pl-10"
                          />
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          Esperado: S/ {ingresosPorMetodo.transferencia.toFixed(2)}
                        </p>
                      </div>

                      <div>
                        <Label>Observaciones</Label>
                        <Textarea
                          placeholder="Notas sobre el cierre de caja..."
                          value={observaciones}
                          onChange={(e) => setObservaciones(e.target.value)}
                          rows={2}
                        />
                      </div>

                      <div className="p-3 bg-muted rounded-lg">
                        <div className="flex justify-between mb-1">
                          <span className="text-sm">Total Contado:</span>
                          <span className="text-sm">S/ {totalContado.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between mb-1">
                          <span className="text-sm">Total Esperado:</span>
                          <span className="text-sm">S/ {totalEsperado.toFixed(2)}</span>
                        </div>
                        <div className={`flex justify-between pt-2 border-t ${diferencia >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          <span className="text-sm">Diferencia:</span>
                          <span className="text-sm">
                            {diferencia >= 0 ? '+' : ''} S/ {diferencia.toFixed(2)}
                          </span>
                        </div>
                      </div>

                      <Button
                        className="w-full"
                        style={{ backgroundColor: '#9AAD97', color: 'white', border: 'none' }}
                        onClick={handleCerrarCaja}
                        disabled={loading}
                      >
                        <Lock className="h-4 w-4 mr-2" />
                        {loading ? 'Guardando...' : 'Cerrar Caja'}
                      </Button>
                      {error && (
                        <p className="text-sm text-red-500 mt-2">{error}</p>
                      )}
                    </>
                  ) : (
                    <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <p className="text-sm text-yellow-700 font-medium">No hay caja abierta</p>
                    </div>
                  )
                ) : (
                  <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center gap-2 mb-3">
                      <Lock className="h-5 w-5 text-green-600" />
                      <span className="text-green-700">Caja Cerrada Exitosamente</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      La caja ha sido cerrada correctamente. El reporte ha sido registrado en la base de datos.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Resumen de Ventas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="p-4 bg-green-50 rounded-lg border-l-4 border-green-500">
                  <p className="text-sm text-muted-foreground">Cantidad de Ventas</p>
                  <p className="text-2xl font-bold text-green-700">{ventasDelDia.length}</p>
                </div>
                <div className="p-4 bg-green-50 rounded-lg border-l-4 border-green-500">
                  <p className="text-sm text-muted-foreground">Productos Vendidos</p>
                  <p className="text-2xl font-bold text-green-700">
                    {ventasDelDia.reduce((sum, v) => sum + (v.items?.length || 0), 0)}
                  </p>
                </div>
                <div className="p-4 bg-green-50 rounded-lg border-l-4 border-green-500">
                  <p className="text-sm text-muted-foreground">Total Ventas</p>
                  <p className="text-2xl font-bold text-green-700">S/ {totalVentas.toFixed(2)}</p>
                </div>
                <div className="p-4 bg-blue-50 rounded-lg border-l-4 border-blue-500">
                  <p className="text-sm text-muted-foreground">Ticket Promedio</p>
                  <p className="text-2xl font-bold text-blue-700">
                    S/ {ventasDelDia.length > 0 ? (totalVentas / ventasDelDia.length).toFixed(2) : '0.00'}
                  </p>
                </div>
              </div>

              <p className="text-sm font-medium mb-3">Por Método de Pago</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="p-3 bg-green-50 rounded-lg">
                  <p className="text-xs text-muted-foreground">Efectivo</p>
                  <p className="text-lg font-bold">S/ {ventasDelDia.filter(v => v.paymentMethod === "Efectivo").reduce((sum, v) => sum + v.total, 0).toFixed(2)}</p>
                  <p className="text-xs text-muted-foreground">{ventasDelDia.filter(v => v.paymentMethod === "Efectivo").length} ventas</p>
                </div>
                <div className="p-3 bg-purple-50 rounded-lg">
                  <p className="text-xs text-muted-foreground">Yape</p>
                  <p className="text-lg font-bold">S/ {ventasDelDia.filter(v => v.paymentMethod === "Yape").reduce((sum, v) => sum + v.total, 0).toFixed(2)}</p>
                  <p className="text-xs text-muted-foreground">{ventasDelDia.filter(v => v.paymentMethod === "Yape").length} ventas</p>
                </div>
                <div className="p-3 bg-cyan-50 rounded-lg">
                  <p className="text-xs text-muted-foreground">Tarjeta</p>
                  <p className="text-lg font-bold">S/ {ventasDelDia.filter(v => v.paymentMethod === "Tarjeta").reduce((sum, v) => sum + v.total, 0).toFixed(2)}</p>
                  <p className="text-xs text-muted-foreground">{ventasDelDia.filter(v => v.paymentMethod === "Tarjeta").length} ventas</p>
                </div>
                <div className="p-3 bg-blue-50 rounded-lg">
                  <p className="text-xs text-muted-foreground">Transferencia</p>
                  <p className="text-lg font-bold">S/ {ventasDelDia.filter(v => v.paymentMethod === "Transferencia").reduce((sum, v) => sum + v.total, 0).toFixed(2)}</p>
                  <p className="text-xs text-muted-foreground">{ventasDelDia.filter(v => v.paymentMethod === "Transferencia").length} ventas</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Resumen de Servicios</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="p-4 bg-purple-50 rounded-lg border-l-4 border-purple-500">
                  <p className="text-sm text-muted-foreground">Cantidad de Servicios</p>
                  <p className="text-2xl font-bold text-purple-700">{serviciosDelDia.length}</p>
                </div>
                <div className="p-4 bg-purple-50 rounded-lg border-l-4 border-purple-500">
                  <p className="text-sm text-muted-foreground">Total Servicios</p>
                  <p className="text-2xl font-bold text-purple-700">S/ {totalServicios.toFixed(2)}</p>
                </div>
                <div className="p-4 bg-blue-50 rounded-lg border-l-4 border-blue-500">
                  <p className="text-sm text-muted-foreground">Ticket Promedio</p>
                  <p className="text-2xl font-bold text-blue-700">
                    S/ {serviciosDelDia.length > 0 ? (totalServicios / serviciosDelDia.length).toFixed(2) : '0.00'}
                  </p>
                </div>
              </div>

              <p className="text-sm font-medium mb-3">Por Método de Pago</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="p-3 bg-green-50 rounded-lg">
                  <p className="text-xs text-muted-foreground">Efectivo</p>
                  <p className="text-lg font-bold">S/ {serviciosDelDia.filter(s => s.paymentMethod === "Efectivo").reduce((sum, s) => sum + s.subtotal, 0).toFixed(2)}</p>
                  <p className="text-xs text-muted-foreground">{serviciosDelDia.filter(s => s.paymentMethod === "Efectivo").length} servicios</p>
                </div>
                <div className="p-3 bg-purple-50 rounded-lg">
                  <p className="text-xs text-muted-foreground">Yape</p>
                  <p className="text-lg font-bold">S/ {serviciosDelDia.filter(s => s.paymentMethod === "Yape").reduce((sum, s) => sum + s.subtotal, 0).toFixed(2)}</p>
                  <p className="text-xs text-muted-foreground">{serviciosDelDia.filter(s => s.paymentMethod === "Yape").length} servicios</p>
                </div>
                <div className="p-3 bg-cyan-50 rounded-lg">
                  <p className="text-xs text-muted-foreground">Tarjeta</p>
                  <p className="text-lg font-bold">S/ {serviciosDelDia.filter(s => s.paymentMethod === "Tarjeta").reduce((sum, s) => sum + s.subtotal, 0).toFixed(2)}</p>
                  <p className="text-xs text-muted-foreground">{serviciosDelDia.filter(s => s.paymentMethod === "Tarjeta").length} servicios</p>
                </div>
                <div className="p-3 bg-blue-50 rounded-lg">
                  <p className="text-xs text-muted-foreground">Transferencia</p>
                  <p className="text-lg font-bold">S/ {serviciosDelDia.filter(s => s.paymentMethod === "Transferencia").reduce((sum, s) => sum + s.subtotal, 0).toFixed(2)}</p>
                  <p className="text-xs text-muted-foreground">{serviciosDelDia.filter(s => s.paymentMethod === "Transferencia").length} servicios</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex gap-2">
            <Button className="flex-1" onClick={generarExcelCierreActual}>
              <Download className="h-4 w-4 mr-2" />
              Descargar Excel
            </Button>
            <div className="flex-1 flex gap-2">
              <Input
                type="email"
                placeholder="correo@ejemplo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <Button onClick={handleEnviarReporte}>
                <Send className="h-4 w-4 mr-2" />
                Enviar
              </Button>
            </div>
          </div>
        </>
      )}

      {/* TAB 2: HISTORIAL DE CIERRES */}
      {isAdmin && activeTab === "historial" && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Historial de Cierres de Caja</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nro Caja</TableHead>
                      <TableHead>Fecha y Hora</TableHead>
                      <TableHead>Usuario</TableHead>
                      <TableHead>Efectivo</TableHead>
                      <TableHead>Yape</TableHead>
                      <TableHead>Tarjeta</TableHead>
                      <TableHead>Transferencia</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead>Diferencia</TableHead>
                      <TableHead>Observaciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {cierresHistorico.length > 0 ? (
                      cierresHistorico.map((cierre) => (
                        <TableRow key={cierre.id}>
                          <TableCell className="font-bold" style={{ color: '#9AAD97' }}>{cierre.aperturaId}</TableCell>
                          <TableCell className="text-sm">{cierre.fecha}</TableCell>
                          <TableCell>{cierre.usuario}</TableCell>
                          <TableCell>S/ {cierre.montosContados.efectivo.toFixed(2)}</TableCell>
                          <TableCell>S/ {cierre.montosContados.yape.toFixed(2)}</TableCell>
                          <TableCell>S/ {cierre.montosContados.tarjeta.toFixed(2)}</TableCell>
                          <TableCell>S/ {cierre.montosContados.transferencia.toFixed(2)}</TableCell>
                          <TableCell className="font-semibold">S/ {cierre.totalContado.toFixed(2)}</TableCell>
                          <TableCell>
                            <Badge variant={cierre.diferencia >= 0 ? "default" : "destructive"}>
                              {cierre.diferencia >= 0 ? '+' : ''} S/ {cierre.diferencia.toFixed(2)}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm">{cierre.observaciones || '-'}</TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={10} className="text-center py-4 text-muted-foreground">
                          No hay cierres registrados
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* TAB 3: REPORTE POR FECHAS */}
      {isAdmin && activeTab === "reporte" && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Reporte de Cierres por Rango de Fechas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Fecha de Inicio</Label>
                  <Input
                    type="date"
                    value={fechaInicio}
                    onChange={(e) => setFechaInicio(e.target.value)}
                    className="mt-2"
                  />
                </div>
                <div>
                  <Label>Fecha de Fin</Label>
                  <Input
                    type="date"
                    value={fechaFin}
                    onChange={(e) => setFechaFin(e.target.value)}
                    className="mt-2"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Button 
                  className="flex-1" 
                  onClick={buscarCierresPorFecha}
                  style={{ backgroundColor: '#9AAD97', color: 'white' }}
                >
                  <Calendar className="h-4 w-4 mr-2" />
                  Buscar Cierres
                </Button>
                <Button 
                  variant="outline" 
                  onClick={resetearReporte}
                >
                  Limpiar
                </Button>
              </div>
            </CardContent>
          </Card>

          {cierresHistorico.length > 0 && (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>Resumen del Período</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    <div className="p-3 bg-blue-50 rounded-lg">
                      <p className="text-xs text-muted-foreground">Total General</p>
                      <p className="text-lg font-bold">S/ {totalGeneralHistorico.toFixed(2)}</p>
                    </div>
                    <div className="p-3 bg-green-50 rounded-lg">
                      <p className="text-xs text-muted-foreground">Total Efectivo</p>
                      <p className="text-lg font-bold">S/ {totalEfectivoHistorico.toFixed(2)}</p>
                    </div>
                    <div className="p-3 bg-purple-50 rounded-lg">
                      <p className="text-xs text-muted-foreground">Total Yape</p>
                      <p className="text-lg font-bold">S/ {totalYapeHistorico.toFixed(2)}</p>
                    </div>
                    <div className="p-3 bg-cyan-50 rounded-lg">
                      <p className="text-xs text-muted-foreground">Total Tarjeta</p>
                      <p className="text-lg font-bold">S/ {totalTarjetaHistorico.toFixed(2)}</p>
                    </div>
                    <div className="p-3 bg-blue-100 rounded-lg">
                      <p className="text-xs text-muted-foreground">Total Transfer.</p>
                      <p className="text-lg font-bold">S/ {totalTransferenciaHistorico.toFixed(2)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Detalle de Cierres en el Período</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Fecha y Hora</TableHead>
                          <TableHead>Usuario</TableHead>
                          <TableHead>Efectivo</TableHead>
                          <TableHead>Yape</TableHead>
                          <TableHead>Tarjeta</TableHead>
                          <TableHead>Transferencia</TableHead>
                          <TableHead>Total</TableHead>
                          <TableHead>Diferencia</TableHead>
                          <TableHead>Observaciones</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {cierresHistorico.map((cierre) => (
                          <TableRow key={cierre.id}>
                            <TableCell className="text-sm">{cierre.fecha}</TableCell>
                            <TableCell>{cierre.usuario}</TableCell>
                            <TableCell>S/ {cierre.montosContados.efectivo.toFixed(2)}</TableCell>
                            <TableCell>S/ {cierre.montosContados.yape.toFixed(2)}</TableCell>
                            <TableCell>S/ {cierre.montosContados.tarjeta.toFixed(2)}</TableCell>
                            <TableCell>S/ {cierre.montosContados.transferencia.toFixed(2)}</TableCell>
                            <TableCell className="font-semibold">S/ {cierre.totalContado.toFixed(2)}</TableCell>
                            <TableCell>
                              <Badge variant={cierre.diferencia >= 0 ? "default" : "destructive"}>
                                {cierre.diferencia >= 0 ? '+' : ''} S/ {cierre.diferencia.toFixed(2)}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-sm">{cierre.observaciones || '-'}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>

              <div className="flex gap-2">
                <Button className="flex-1" onClick={generarExcelReportePeriodo}>
                  <Download className="h-4 w-4 mr-2" />
                  Descargar Excel
                </Button>
                <div className="flex-1 flex gap-2">
                  <Input
                    type="email"
                    placeholder="correo@ejemplo.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                  <Button onClick={handleEnviarReporte}>
                    <Send className="h-4 w-4 mr-2" />
                    Enviar
                  </Button>
                </div>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
