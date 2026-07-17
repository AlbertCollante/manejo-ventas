import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { Label } from "./ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { DollarSign, Lock, Send, Download, ShoppingCart, Calendar, Ban } from "lucide-react";
import { Textarea } from "./ui/textarea";
import { Badge } from "./ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
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
  const [allCierres, setAllCierres] = useState<CierreCaja[]>([]);

  // Estado independiente para reporte por fechas
  const [reporteFechaInicio, setReporteFechaInicio] = useState("");
  const [reporteFechaFin, setReporteFechaFin] = useState("");
  const [cajasReporte, setCajasReporte] = useState<CierreCaja[]>([]);
  const [cajasSeleccionadas, setCajasSeleccionadas] = useState<number[]>([]);
  const [ventasReporte, setVentasReporte] = useState<any[]>([]);
  const [serviciosReporte, setServiciosReporte] = useState<any[]>([]);
  const [ventasAnuladasReporte, setVentasAnuladasReporte] = useState<any[]>([]);
  const [loadingReporte, setLoadingReporte] = useState(false);
  const [loadingVentasAnuladas, setLoadingVentasAnuladas] = useState(false);
  const [showVentasAnuladas, setShowVentasAnuladas] = useState(false);

  const [ventasDelDia, setVentasDelDia] = useState<any[]>([]);
  const [serviciosDelDia, setServiciosDelDia] = useState<any[]>([]);
  const [montoInicial, setMontoInicial] = useState<number>(0);
  const [montoInicialYape, setMontoInicialYape] = useState<number>(0);
  const [cuentaEfectivo, setCuentaEfectivo] = useState<number>(0);
  const [cuentaYape, setCuentaYape] = useState<number>(0);
  const [aperturaDelDia, setAperturaDelDia] = useState<any>(null);
  const [showMoveDialog, setShowMoveDialog] = useState(false);
  const [moveAmount, setMoveAmount] = useState("");
  const [moveType, setMoveType] = useState<"manual" | "recarga" | "retiro-yape" | "deposito-yape">("manual");
  const [moveFrom, setMoveFrom] = useState<"efectivo" | "yape">("efectivo");
  const [moveTo, setMoveTo] = useState<"efectivo" | "yape">("yape");
  const [moveHasCommission, setMoveHasCommission] = useState(false);
  const [moveCommissionAmount, setMoveCommissionAmount] = useState("");
  const [moveCommissionAccount, setMoveCommissionAccount] = useState<"efectivo" | "yape">("efectivo");
  const [moveObservations, setMoveObservations] = useState("");

  const applyMovePreset = (type: "manual" | "recarga" | "retiro-yape" | "deposito-yape") => {
    setMoveType(type);
    setMoveAmount("");
    setMoveCommissionAmount("");

    if (type === "recarga") {
      setMoveFrom("yape");
      setMoveTo("efectivo");
      setMoveHasCommission(false);
      setMoveCommissionAccount("efectivo");
      setMoveObservations("Recarga");
    } else if (type === "retiro-yape") {
      setMoveFrom("efectivo");
      setMoveTo("yape");
      setMoveHasCommission(true);
      setMoveCommissionAccount("efectivo");
      setMoveObservations("Retiro Yape");
    } else if (type === "deposito-yape") {
      setMoveFrom("yape");
      setMoveTo("efectivo");
      setMoveHasCommission(true);
      setMoveCommissionAccount("efectivo");
      setMoveObservations("Depósito a Yape");
    } else {
      setMoveFrom("efectivo");
      setMoveTo("yape");
      setMoveHasCommission(false);
      setMoveCommissionAccount("efectivo");
      setMoveObservations("");
    }
  };

  const [totalCommissions, setTotalCommissions] = useState(0);
  const [moveLoading, setMoveLoading] = useState(false);
  const [showMovementsDialog, setShowMovementsDialog] = useState(false);
  const [movementsList, setMovementsList] = useState<any[]>([]);
  const [loadingMovements, setLoadingMovements] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const API_BASE = 'http://localhost:9000';

  const normalizeAccountName = (value: any): 'efectivo' | 'yape' | 'otro' => {
    const name = String(value ?? '').toLowerCase();
    if (name.includes('efect')) return 'efectivo';
    if (name.includes('yape')) return 'yape';
    return 'otro';
  };

  const toLocalISODate = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

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
      fechaIso: !isNaN(parsedDate.getTime()) ? toLocalISODate(parsedDate) : '',
      usuario: item.usuario || '',
      montoInicial: Number(item.monto_inicial ?? item.montoInicial ?? 0),
      montoInicialYape: Number(item.monto_inicial_yape ?? item.montoInicialYape ?? 0),
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
        setMontoInicialYape(Number(
          openApertura.montoInicialYape ??
          openApertura.monto_inicial_yape ??
          0
        ));
        setCuentaEfectivo(Number(openApertura.cuenta_efectivo ?? 0));
        setCuentaYape(Number(openApertura.cuenta_yape ?? 0));

        // Cargar ventas desde la API de esta caja
        await fetchVentasDelDia(openApertura.id);
        // Cargar servicios de esta caja
        await fetchServiciosDelDia(openApertura.id);
      } else {
        setAperturaDelDia(null);
        setMontoInicial(0);
        setMontoInicialYape(0);
        setCuentaEfectivo(0);
        setCuentaYape(0);
        setVentasDelDia([]);
        setServiciosDelDia([]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
      setAperturaDelDia(null);
      setMontoInicial(0);
      setMontoInicialYape(0);
      setCuentaEfectivo(0);
      setCuentaYape(0);
      setVentasDelDia([]);
      setServiciosDelDia([]);
    }
  };

  // Cargar cierres, ventas y apertura al montar
  useEffect(() => {
    fetchCashClosures();
    fetchOpenApertura();
  }, []);

  // Cargar movimientos automáticamente cuando hay una apertura abierta
  useEffect(() => {
    if (aperturaDelDia) {
      fetchMovements();
    }
  }, [aperturaDelDia?.id]);

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

  const totalEsperado = cuentaEfectivo + cuentaYape;
  const totalContado = parseFloat(montoEfectivo || "0") + 
                       parseFloat(montoYape || "0") + 
                       parseFloat(montoTarjeta || "0") + 
                       parseFloat(montoTransferencia || "0");
  const diferencia = totalContado - totalEsperado;

  // Resumen de movimientos entre cuentas
  const resumenMovimientos = movementsList.reduce((acc, mov) => {
    const origen = normalizeAccountName(mov.cuenta_origen);
    const destino = normalizeAccountName(mov.cuenta_destino);
    const monto = Number(mov.monto ?? 0);
    const comision = Number(mov.comision ?? 0);
    const cuentaComision = normalizeAccountName(mov.cuenta_comision);

    if (origen === 'efectivo' || origen === 'yape') {
      acc[origen].movimientos -= monto;
    }
    if (destino === 'efectivo' || destino === 'yape') {
      acc[destino].movimientos += monto;
    }
    if (comision > 0 && (cuentaComision === 'efectivo' || cuentaComision === 'yape')) {
      acc[cuentaComision].comisiones += comision;
    }

    return acc;
  }, {
    efectivo: { movimientos: 0, comisiones: 0 },
    yape: { movimientos: 0, comisiones: 0 },
  });

  const fetchMovements = async () => {
    if (!aperturaDelDia) return;
    setLoadingMovements(true);
    try {
      const resp = await fetch(`${API_BASE}/movimientos-cuenta?id_apertura=${aperturaDelDia.id}`);
      if (!resp.ok) throw new Error('Error al obtener movimientos');
      const data = await resp.json();
      setMovementsList(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error cargando movimientos:', err);
      setMovementsList([]);
    } finally {
      setLoadingMovements(false);
    }
  };

  const handleMoveBetweenAccounts = async () => {
    if (!aperturaDelDia) {
      alert('No hay caja abierta');
      return;
    }
    const amount = parseFloat(moveAmount);
    if (isNaN(amount) || amount <= 0) {
      alert('Ingrese un monto válido mayor a 0');
      return;
    }
    if (moveFrom === moveTo) {
      alert('La cuenta de origen y destino deben ser diferentes');
      return;
    }

    const commission = moveHasCommission ? parseFloat(moveCommissionAmount) : 0;
    if (moveHasCommission && (isNaN(commission) || commission <= 0)) {
      alert('Ingrese un monto de comisión válido mayor a 0');
      return;
    }

    const sourceBalance = moveFrom === 'efectivo' ? cuentaEfectivo : cuentaYape;
    if (amount > sourceBalance) {
      alert(`Saldo insuficiente en cuenta ${moveFrom}. Disponible: S/ ${sourceBalance.toFixed(2)}. Necesita: S/ ${amount.toFixed(2)}`);
      return;
    }

    setMoveLoading(true);
    try {
      // Consolidar actualizaciones por cuenta para evitar condiciones de carrera
      // cuando la comisión va a la misma cuenta de origen o destino
      const updates: Record<string, number> = {};
      updates[moveFrom] = (updates[moveFrom] || 0) - amount;
      updates[moveTo] = (updates[moveTo] || 0) + amount;
      if (commission > 0) {
        updates[moveCommissionAccount] = (updates[moveCommissionAccount] || 0) + commission;
      }

      const requests = Object.entries(updates).map(([account, monto]) =>
        fetch(`${API_BASE}/actualizar-cuenta-${account}/${aperturaDelDia.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ monto })
        })
      );

      const responses = await Promise.all(requests);

      responses.forEach((resp, index) => {
        if (!resp.ok) {
          throw new Error(`Error en operación ${index + 1}: ${resp.statusText}`);
        }
      });

      // Registrar el movimiento en el historial
      const movimientoPayload: any = {
        id_apertura: aperturaDelDia.id,
        cuenta_origen: moveFrom === 'efectivo' ? 'EFECTIVO' : 'YAPE',
        cuenta_destino: moveTo === 'efectivo' ? 'EFECTIVO' : 'YAPE',
        monto: amount,
        comision: commission,
        usuario: currentUser.name,
        observaciones: moveObservations.trim() || `Movimiento de ${moveFrom} a ${moveTo}${commission > 0 ? ` con comisión S/ ${commission.toFixed(2)}` : ''}`
      };
      if (commission > 0) {
        movimientoPayload.cuenta_comision = moveCommissionAccount === 'efectivo' ? 'EFECTIVO' : 'YAPE';
      }

      const movimientoResp = await fetch(`${API_BASE}/movimientos-cuenta`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(movimientoPayload)
      });

      if (!movimientoResp.ok) {
        const txt = await movimientoResp.text();
        console.error('Error registrando movimiento:', txt);
      }

      if (commission > 0) {
        setTotalCommissions((prev) => prev + commission);
      }

      // Recargar apertura y movimientos para actualizar saldos y resumen
      await fetchOpenApertura();
      await fetchMovements();
      setMoveAmount("");
      setMoveHasCommission(false);
      setMoveCommissionAmount("");
      setMoveCommissionAccount("efectivo");
      setMoveObservations("");
      setShowMoveDialog(false);
      alert(`Movimiento realizado: S/ ${amount.toFixed(2)} de ${moveFrom} a ${moveTo}${commission > 0 ? ` (comisión S/ ${commission.toFixed(2)} a ${moveCommissionAccount})` : ''}`);
    } catch (error) {
      console.error('Error movimiento entre cuentas:', error);
      alert('Error al realizar el movimiento: ' + (error instanceof Error ? error.message : 'Error desconocido'));
    } finally {
      setMoveLoading(false);
    }
  };

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

      // Calcular comisiones totales desde los movimientos registrados (más confiable que el estado local)
      let commissionsToRegister = totalCommissions;
      try {
        const movimientosResp = await fetch(`${API_BASE}/movimientos-cuenta?id_apertura=${aperturaDelDia.id}`);
        if (movimientosResp.ok) {
          const movimientos = await movimientosResp.json();
          const calculatedCommission = (Array.isArray(movimientos) ? movimientos : [])
            .reduce((sum, m) => sum + Number(m.comision ?? 0), 0);
          if (calculatedCommission > 0) {
            commissionsToRegister = calculatedCommission;
          }
        }
      } catch (e) {
        console.error('Error calculando comisiones desde movimientos:', e);
      }

      // Registrar comisiones acumuladas en cuenta contable 1030 (Otros)
      if (commissionsToRegister > 0) {
        try {
          const cuentasResp = await fetch(`${API_BASE}/cuentas-contables`);
          if (!cuentasResp.ok) {
            throw new Error(`Error obteniendo cuentas contables: ${cuentasResp.statusText}`);
          }
          const cuentas = await cuentasResp.json();
          const cuenta1030 = Array.isArray(cuentas)
            ? cuentas.find((c: any) =>
                String(c.codigo) === '1030' ||
                String(c.codigo) === '10.30' ||
                Number(c.codigo) === 1030
              )
            : null;

          if (!cuenta1030) {
            console.warn('Cuentas contables disponibles:', cuentas);
            throw new Error('No se encontró la cuenta contable 1030');
          }

          console.log('Cuenta 1030 encontrada:', cuenta1030);

          const comisionPayload = {
            id_cuenta: Number(cuenta1030.id_cuenta ?? cuenta1030.id),
            monto: Number(commissionsToRegister),
            tipo: 'INGRESO',
            concepto: 'comisiones',
            usuario: currentUser.name || currentUser.username,
          };
          console.log('Enviando comisión a cuenta 1030:', comisionPayload);

          const comisionResp = await fetch(`${API_BASE}/movimientos-contables`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(comisionPayload),
          });

          if (!comisionResp.ok) {
            const txt = await comisionResp.text();
            throw new Error(`Error registrando comisión: ${txt}`);
          }
        } catch (comisionErr) {
          const msg = comisionErr instanceof Error ? comisionErr.message : 'Error desconocido';
          console.error('Error enviando comisión a cuenta 1030:', comisionErr);
          alert('Advertencia: el cierre se registró, pero no se pudo enviar la comisión a la cuenta 1030. ' + msg);
        }
      }

      setCajaCerrada(true);
      setTotalCommissions(0);
      alert(`Caja cerrada exitosamente\nVentas: ${ventasDelDia.length} | Servicios: ${serviciosDelDia.length}\nTotal Ventas: S/ ${totalVentas.toFixed(2)}\nTotal Servicios: S/ ${totalServicios.toFixed(2)}\nTotal Ingresos: S/ ${totalIngresos.toFixed(2)}\nTotal contado: S/ ${totalContado.toFixed(2)}\nDiferencia: S/ ${diferencia.toFixed(2)}${commissionsToRegister > 0 ? `\nComisión registrada en cuenta 1030: S/ ${commissionsToRegister.toFixed(2)}` : ''}\n\nCierre registrado en la base de datos`);
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
      ['Total Inicial', (montoInicial + montoInicialYape).toFixed(2)],
      ['Monto Inicial Efectivo', montoInicial.toFixed(2)],
      ['Monto Inicial Yape', montoInicialYape.toFixed(2)],
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

  const resetearReporte = () => {
    setReporteFechaInicio("");
    setReporteFechaFin("");
    setCajasReporte([]);
    setCajasSeleccionadas([]);
    setVentasReporte([]);
    setServiciosReporte([]);
    setVentasAnuladasReporte([]);
    setShowVentasAnuladas(false);
  };

  const buscarCajasReporte = () => {
    if (!reporteFechaInicio || !reporteFechaFin) {
      alert("Por favor seleccione ambas fechas");
      return;
    }

    const filtered = allCierres.filter(c => {
      if (c.fechaIso) {
        return c.fechaIso >= reporteFechaInicio && c.fechaIso <= reporteFechaFin;
      }
      return false;
    });

    setCajasReporte(filtered);
    setCajasSeleccionadas([]);
    setVentasReporte([]);
    setServiciosReporte([]);
  };

  const toggleCajaSeleccionada = (aperturaId: number) => {
    setCajasSeleccionadas(prev => {
      if (prev.includes(aperturaId)) {
        return prev.filter(id => id !== aperturaId);
      }
      return [...prev, aperturaId];
    });
  };

  const actualizarDatosReporte = async () => {
    if (cajasSeleccionadas.length === 0) {
      setVentasReporte([]);
      setServiciosReporte([]);
      return;
    }

    setLoadingReporte(true);
    try {
      const [ventasResp, serviciosResp] = await Promise.all([
        fetch(`${API_BASE}/ventas`),
        fetch(`${API_BASE}/servicios`)
      ]);

      const ventasData = ventasResp.ok ? await ventasResp.json() : [];
      const serviciosData = serviciosResp.ok ? await serviciosResp.json() : [];

      const normalizedVentas = Array.isArray(ventasData) ? ventasData.map(normalizeApiSale) : [];
      const normalizedServicios = Array.isArray(serviciosData) ? serviciosData.map(normalizeApiService) : [];

      const filteredVentas = normalizedVentas.filter(v => cajasSeleccionadas.includes(v.id_apertura));
      const filteredServicios = normalizedServicios.filter(s => cajasSeleccionadas.includes(s.idapertura));

      // Obtener detalle de productos de cada venta
      const ventasConDetalles = await Promise.all(
        filteredVentas.map(async (sale) => {
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

      setVentasReporte(ventasConDetalles.sort((a, b) => a.dateObj.getTime() - b.dateObj.getTime()));
      setServiciosReporte(filteredServicios.sort((a, b) => a.dateObj.getTime() - b.dateObj.getTime()));
    } catch (err) {
      console.error('Error cargando datos del reporte:', err);
    } finally {
      setLoadingReporte(false);
    }
  };

  useEffect(() => {
    actualizarDatosReporte();
  }, [cajasSeleccionadas]);

  const fetchVentasAnuladasReporte = async () => {
    if (!reporteFechaInicio || !reporteFechaFin) {
      alert("Por favor seleccione ambas fechas");
      return;
    }

    setLoadingVentasAnuladas(true);
    try {
      const params = new URLSearchParams({
        fechaInicio: reporteFechaInicio,
        fechaFin: reporteFechaFin,
      });
      // Para administradores no se envía usuario: retorna todo el historial
      if (!isAdmin) {
        params.append('usuario', currentUser.name);
      }

      const resp = await fetch(`${API_BASE}/ventas-anuladas?${params.toString()}`);
      if (!resp.ok) throw new Error('Error al obtener ventas anuladas');
      const data = await resp.json();
      setVentasAnuladasReporte(Array.isArray(data) ? data : []);
      setShowVentasAnuladas(true);
    } catch (err) {
      console.error('Error cargando ventas anuladas:', err);
      alert('Error al cargar las ventas anuladas');
    } finally {
      setLoadingVentasAnuladas(false);
    }
  };

  // Totales del reporte por fechas/cajas seleccionadas
  const totalVentasReporte = ventasReporte.reduce((sum, v) => sum + v.total, 0);
  const totalServiciosReporte = serviciosReporte.reduce((sum, s) => sum + s.subtotal, 0);
  const totalReporte = totalVentasReporte + totalServiciosReporte;

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
                    <p className="text-sm text-muted-foreground">Total Inicial</p>
                    <p className="text-xl">S/ {(montoInicial + montoInicialYape).toFixed(2)}</p>
                    <div className="flex gap-3 mt-1 text-xs text-muted-foreground">
                      <span>Efectivo: S/ {montoInicial.toFixed(2)}</span>
                      <span>Yape: S/ {montoInicialYape.toFixed(2)}</span>
                    </div>
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
                    <p className="text-sm text-muted-foreground">Total Ingresos</p>
                    <p className="text-xl">S/ {totalIngresos.toFixed(2)}</p>
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
                <CardTitle>Cuentas Contables</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="p-3 border-l-4 border-green-500 bg-green-50 rounded-lg">
                    <div className="flex items-center justify-between">
                      <span>Cuenta Efectivo</span>
                      <span style={{ fontWeight: 'bold' }}>S/ {cuentaEfectivo.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-xs mt-1">
                      <span className="text-muted-foreground">Movimientos</span>
                      <span className={resumenMovimientos.efectivo.movimientos >= 0 ? 'text-green-600' : 'text-red-600'}>
                        {resumenMovimientos.efectivo.movimientos >= 0 ? '+' : ''}S/ {resumenMovimientos.efectivo.movimientos.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Comisiones</span>
                      <span className={resumenMovimientos.efectivo.comisiones >= 0 ? 'text-green-600' : 'text-red-600'}>
                        {resumenMovimientos.efectivo.comisiones >= 0 ? '+' : ''}S/ {resumenMovimientos.efectivo.comisiones.toFixed(2)}
                      </span>
                    </div>
                  </div>
                  <div className="p-3 border-l-4 border-purple-500 bg-purple-50 rounded-lg">
                    <div className="flex items-center justify-between">
                      <span>Cuenta Yape</span>
                      <span style={{ fontWeight: 'bold' }}>S/ {cuentaYape.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-xs mt-1">
                      <span className="text-muted-foreground">Movimientos</span>
                      <span className={resumenMovimientos.yape.movimientos >= 0 ? 'text-green-600' : 'text-red-600'}>
                        {resumenMovimientos.yape.movimientos >= 0 ? '+' : ''}S/ {resumenMovimientos.yape.movimientos.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Comisiones</span>
                      <span className={resumenMovimientos.yape.comisiones >= 0 ? 'text-green-600' : 'text-red-600'}>
                        {resumenMovimientos.yape.comisiones >= 0 ? '+' : ''}S/ {resumenMovimientos.yape.comisiones.toFixed(2)}
                      </span>
                    </div>
                  </div>
                  <div className="pt-2 border-t">
                    <p className="text-xs text-muted-foreground mb-2">Ventas por método de pago (solo referencia)</p>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="flex justify-between"><span>Efectivo</span><span>S/ {ingresosPorMetodo.efectivo.toFixed(2)}</span></div>
                      <div className="flex justify-between"><span>Yape</span><span>S/ {ingresosPorMetodo.yape.toFixed(2)}</span></div>
                      <div className="flex justify-between"><span>Tarjeta</span><span>S/ {ingresosPorMetodo.tarjeta.toFixed(2)}</span></div>
                      <div className="flex justify-between"><span>Transferencia</span><span>S/ {ingresosPorMetodo.transferencia.toFixed(2)}</span></div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      variant="outline"
                      onClick={() => {
                        applyMovePreset('manual');
                        setShowMoveDialog(true);
                      }}
                      disabled={!aperturaDelDia}
                    >
                      Movimientos de cuentas
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        fetchMovements();
                        setShowMovementsDialog(true);
                      }}
                      disabled={!aperturaDelDia}
                    >
                      Ver movimientos
                    </Button>
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
                          Esperado en cuenta: S/ {cuentaEfectivo.toFixed(2)}
                        </p>
                      </div>

                      <div>
                        <Label>Yape / Plin / Tarjeta / Transferencia Contado</Label>
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
                          Esperado en cuenta: S/ {cuentaYape.toFixed(2)}
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
                <div className="p-4 rounded-lg" style={{ borderTop: '4px solid #9AAD97', backgroundColor: 'rgba(154, 173, 151, 0.05)' }}>
                  <p className="text-sm text-muted-foreground">Cantidad de Ventas</p>
                  <p className="text-2xl font-bold" style={{ color: '#9AAD97' }}>{ventasDelDia.length}</p>
                </div>
                <div className="p-4 rounded-lg" style={{ borderTop: '4px solid #9AAD97', backgroundColor: 'rgba(154, 173, 151, 0.05)' }}>
                  <p className="text-sm text-muted-foreground">Productos Vendidos</p>
                  <p className="text-2xl font-bold" style={{ color: '#9AAD97' }}>
                    {ventasDelDia.reduce((sum, v) => sum + (v.items?.length || 0), 0)}
                  </p>
                </div>
                <div className="p-4 rounded-lg" style={{ border: '2px solid #D5B888', backgroundColor: 'rgba(213, 184, 136, 0.25)', boxShadow: '0 2px 8px rgba(213, 184, 136, 0.3)' }}>
                  <p className="text-sm" style={{ color: '#D5B888', fontWeight: 700 }}>Total Ventas</p>
                  <p className="text-2xl font-bold" style={{ color: '#8B7A4E' }}>S/ {totalVentas.toFixed(2)}</p>
                </div>
                <div className="p-4 rounded-lg" style={{ borderTop: '4px solid #9AAD97', backgroundColor: 'rgba(154, 173, 151, 0.05)' }}>
                  <p className="text-sm text-muted-foreground">Ticket Promedio</p>
                  <p className="text-2xl font-bold" style={{ color: '#9AAD97' }}>
                    S/ {ventasDelDia.length > 0 ? (totalVentas / ventasDelDia.length).toFixed(2) : '0.00'}
                  </p>
                </div>
              </div>

              <p className="text-sm font-medium mb-3" style={{ color: '#9AAD97' }}>Por Método de Pago</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-sm border" style={{ borderColor: '#e5e7eb', borderLeft: '2px solid #9AAD97' }}>
                  <p className="text-xs text-muted-foreground">Efectivo</p>
                  <p className="text-base font-semibold" style={{ color: '#9AAD97' }}>S/ {ventasDelDia.filter(v => v.paymentMethod === "Efectivo").reduce((sum, v) => sum + v.total, 0).toFixed(2)}</p>
                  <p className="text-xs text-muted-foreground">{ventasDelDia.filter(v => v.paymentMethod === "Efectivo").length} ventas</p>
                </div>
                <div className="p-3 rounded-sm border" style={{ borderColor: '#e5e7eb', borderLeft: '2px solid #D5B888' }}>
                  <p className="text-xs text-muted-foreground">Yape / Tarjeta / Transferencia</p>
                  <p className="text-base font-semibold" style={{ color: '#D5B888' }}>S/ {ventasDelDia.filter(v => ["Yape", "Tarjeta", "Transferencia"].includes(v.paymentMethod)).reduce((sum, v) => sum + v.total, 0).toFixed(2)}</p>
                  <p className="text-xs text-muted-foreground">{ventasDelDia.filter(v => ["Yape", "Tarjeta", "Transferencia"].includes(v.paymentMethod)).length} ventas</p>
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
                <div className="p-4 rounded-lg" style={{ borderTop: '4px solid #9AAD97', backgroundColor: 'rgba(154, 173, 151, 0.05)' }}>
                  <p className="text-sm text-muted-foreground">Cantidad de Servicios</p>
                  <p className="text-2xl font-bold" style={{ color: '#9AAD97' }}>{serviciosDelDia.length}</p>
                </div>
                <div className="p-4 rounded-lg" style={{ border: '2px solid #D5B888', backgroundColor: 'rgba(213, 184, 136, 0.25)', boxShadow: '0 2px 8px rgba(213, 184, 136, 0.3)' }}>
                  <p className="text-sm" style={{ color: '#D5B888', fontWeight: 700 }}>Total Servicios</p>
                  <p className="text-2xl font-bold" style={{ color: '#8B7A4E' }}>S/ {totalServicios.toFixed(2)}</p>
                </div>
                <div className="p-4 rounded-lg" style={{ borderTop: '4px solid #9AAD97', backgroundColor: 'rgba(154, 173, 151, 0.05)' }}>
                  <p className="text-sm text-muted-foreground">Ticket Promedio</p>
                  <p className="text-2xl font-bold" style={{ color: '#9AAD97' }}>
                    S/ {serviciosDelDia.length > 0 ? (totalServicios / serviciosDelDia.length).toFixed(2) : '0.00'}
                  </p>
                </div>
              </div>

              <p className="text-sm font-medium mb-3" style={{ color: '#9AAD97' }}>Por Método de Pago</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-sm border" style={{ borderColor: '#e5e7eb', borderLeft: '2px solid #9AAD97' }}>
                  <p className="text-xs text-muted-foreground">Efectivo</p>
                  <p className="text-base font-semibold" style={{ color: '#9AAD97' }}>S/ {serviciosDelDia.filter(s => s.paymentMethod === "Efectivo").reduce((sum, s) => sum + s.subtotal, 0).toFixed(2)}</p>
                  <p className="text-xs text-muted-foreground">{serviciosDelDia.filter(s => s.paymentMethod === "Efectivo").length} servicios</p>
                </div>
                <div className="p-3 rounded-sm border" style={{ borderColor: '#e5e7eb', borderLeft: '2px solid #D5B888' }}>
                  <p className="text-xs text-muted-foreground">Yape / Tarjeta / Transferencia</p>
                  <p className="text-base font-semibold" style={{ color: '#D5B888' }}>S/ {serviciosDelDia.filter(s => ["Yape", "Tarjeta", "Transferencia"].includes(s.paymentMethod)).reduce((sum, s) => sum + s.subtotal, 0).toFixed(2)}</p>
                  <p className="text-xs text-muted-foreground">{serviciosDelDia.filter(s => ["Yape", "Tarjeta", "Transferencia"].includes(s.paymentMethod)).length} servicios</p>
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
                      <TableHead>Monto Inicial Efectivo</TableHead>
                      <TableHead>Monto Inicial Yape</TableHead>
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
                    {allCierres.length > 0 ? (
                      allCierres.map((cierre) => (
                        <TableRow key={cierre.id}>
                          <TableCell className="font-bold" style={{ color: '#9AAD97' }}>{cierre.aperturaId}</TableCell>
                          <TableCell className="text-sm">S/ {cierre.montoInicial.toFixed(2)}</TableCell>
                          <TableCell className="text-sm">S/ {Number(cierre.montoInicialYape ?? 0).toFixed(2)}</TableCell>
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
                        <TableCell colSpan={12} className="text-center py-4 text-muted-foreground">
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
              <CardTitle>Reporte por Rango de Fechas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Fecha de Inicio</Label>
                  <Input
                    type="date"
                    value={reporteFechaInicio}
                    onChange={(e) => setReporteFechaInicio(e.target.value)}
                    className="mt-2"
                  />
                </div>
                <div>
                  <Label>Fecha de Fin</Label>
                  <Input
                    type="date"
                    value={reporteFechaFin}
                    onChange={(e) => setReporteFechaFin(e.target.value)}
                    className="mt-2"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Button 
                  className="flex-1" 
                  onClick={buscarCajasReporte}
                  style={{ backgroundColor: '#9AAD97', color: 'white' }}
                >
                  <Calendar className="h-4 w-4 mr-2" />
                  Buscar Cajas
                </Button>
                <Button 
                  variant="outline" 
                  onClick={fetchVentasAnuladasReporte}
                  disabled={loadingVentasAnuladas}
                  style={{ color: '#ef4444', borderColor: '#ef4444' }}
                >
                  <Ban className="h-4 w-4 mr-2" />
                  {loadingVentasAnuladas ? 'Cargando...' : 'Ventas Anuladas'}
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

          {showVentasAnuladas && (
            <Card style={{ borderTop: '4px solid #ef4444' }}>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle style={{ color: '#ef4444' }}>Ventas Anuladas</CardTitle>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setShowVentasAnuladas(false)}
                  className="text-muted-foreground"
                >
                  Ocultar
                </Button>
              </CardHeader>
              <CardContent>
                {loadingVentasAnuladas ? (
                  <p className="text-center text-muted-foreground py-4">Cargando ventas anuladas...</p>
                ) : ventasAnuladasReporte.length === 0 ? (
                  <p className="text-muted-foreground text-center py-4">No hay ventas anuladas en el rango seleccionado</p>
                ) : (
                  <div className="space-y-4 max-h-[600px] overflow-y-auto">
                    {ventasAnuladasReporte.map((venta, idx) => (
                      <div key={venta.id_anulacion ?? idx} className="border rounded-lg overflow-hidden" style={{ borderColor: '#fecaca' }}>
                        <div className="p-3 text-sm" style={{ backgroundColor: 'rgba(239, 68, 68, 0.06)' }}>
                          <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                            <div className="flex flex-wrap gap-2 items-center">
                              <span className="font-semibold" style={{ color: '#ef4444' }}>Anulación #{venta.id_anulacion ?? '-'}</span>
                              <span className="text-muted-foreground">Venta #{venta.idventa ?? '-'}</span>
                              <span className="px-1.5 py-0.5 rounded border text-xs" style={{ borderColor: '#9AAD97', color: '#9AAD97' }}>
                                Caja {venta.id_apertura ?? '-'}
                              </span>
                            </div>
                            <span className="font-bold" style={{ color: '#ef4444' }}>S/ {Number(venta.total_extornado ?? 0).toFixed(2)}</span>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-muted-foreground">
                            <p><span className="font-medium" style={{ color: '#9AAD97' }}>Cliente:</span> {venta.cliente ?? '-'} {venta.dni && venta.dni !== '---' ? `(DNI: ${venta.dni})` : ''}</p>
                            <p><span className="font-medium" style={{ color: '#9AAD97' }}>Método:</span> {venta.metodo ?? '-'}</p>
                            <p><span className="font-medium" style={{ color: '#9AAD97' }}>Fecha venta:</span> {venta.fecha_venta ? new Date(venta.fecha_venta).toLocaleString('es-PE') : '-'}</p>
                            <p><span className="font-medium" style={{ color: '#9AAD97' }}>Fecha anulación:</span> {venta.fecha_hora ? new Date(venta.fecha_hora).toLocaleString('es-PE') : '-'}</p>
                            <p><span className="font-medium" style={{ color: '#9AAD97' }}>Vendedor:</span> {venta.usuario_vendedor ?? '-'}</p>
                            <p><span className="font-medium" style={{ color: '#9AAD97' }}>Anulado por:</span> {venta.usuario_anulo ?? '-'}</p>
                          </div>
                          <div className="mt-2 text-xs">
                            <span className="font-medium" style={{ color: '#9AAD97' }}>Motivo:</span> {venta.motivo ?? '-'}
                          </div>
                        </div>
                        <div className="p-3">
                          <p className="text-xs font-medium mb-2" style={{ color: '#9AAD97' }}>Productos devueltos</p>
                          {(venta.productosDevueltos || []).length === 0 ? (
                            <p className="text-xs text-muted-foreground">Sin productos devueltos</p>
                          ) : (
                            <table className="w-full text-xs">
                              <thead>
                                <tr className="text-muted-foreground border-b" style={{ borderColor: '#f0f0f0' }}>
                                  <th className="text-left py-1">Producto</th>
                                  <th className="text-center py-1 w-12">Cant.</th>
                                  <th className="text-right py-1 w-16">P.U.</th>
                                  <th className="text-right py-1 w-16">Subtotal</th>
                                </tr>
                              </thead>
                              <tbody>
                                {(venta.productosDevueltos || []).map((prod: any, pIdx: number) => (
                                  <tr key={pIdx} className="border-b last:border-b-0" style={{ borderColor: '#f0f0f0' }}>
                                    <td className="py-1 pr-1">{prod.nombre ?? '-'}</td>
                                    <td className="py-1 text-center">{prod.cantidad ?? 0}</td>
                                    <td className="py-1 text-right">S/ {Number(prod.precio ?? 0).toFixed(2)}</td>
                                    <td className="py-1 text-right font-medium">S/ {Number(prod.subtotal ?? 0).toFixed(2)}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {cajasReporte.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Seleccionar Cajas</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-3">
                  {cajasReporte.map((cierre) => (
                    <label
                      key={cierre.id}
                      className="flex items-center gap-2 p-3 border rounded-lg cursor-pointer transition-colors hover:bg-muted"
                      style={{ borderColor: '#e5e7eb' }}
                    >
                      <input
                        type="checkbox"
                        className="h-4 w-4"
                        checked={cajasSeleccionadas.includes(Number(cierre.aperturaId))}
                        onChange={() => toggleCajaSeleccionada(Number(cierre.aperturaId))}
                      />
                      <div className="text-sm">
                        <p className="font-medium" style={{ color: '#9AAD97' }}>Caja #{cierre.aperturaId}</p>
                        <p className="text-xs text-muted-foreground">{cierre.fecha} - {cierre.usuario}</p>
                      </div>
                    </label>
                  ))}
                </div>
                {cajasSeleccionadas.length > 0 && (
                  <p className="text-xs mt-3" style={{ color: '#9AAD97' }}>
                    {cajasSeleccionadas.length} caja(s) seleccionada(s)
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          {cajasSeleccionadas.length > 0 && (
            <>
              <Card style={{ borderTop: '4px solid #D5B888' }}>
                <CardHeader>
                  <CardTitle style={{ color: '#D5B888' }}>Resumen de Ingresos</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-2 md:gap-4">
                    <div className="p-2 md:p-4 rounded-lg" style={{ borderTop: '4px solid #9AAD97', backgroundColor: 'rgba(154, 173, 151, 0.05)' }}>
                      <p className="text-[10px] md:text-sm text-muted-foreground truncate">Ventas</p>
                      <p className="text-sm md:text-2xl font-bold" style={{ color: '#9AAD97' }}>S/ {totalVentasReporte.toFixed(2)}</p>
                      <p className="text-[10px] text-muted-foreground">{ventasReporte.length}</p>
                    </div>
                    <div className="p-2 md:p-4 rounded-lg" style={{ borderTop: '4px solid #9AAD97', backgroundColor: 'rgba(154, 173, 151, 0.05)' }}>
                      <p className="text-[10px] md:text-sm text-muted-foreground truncate">Servicios</p>
                      <p className="text-sm md:text-2xl font-bold" style={{ color: '#9AAD97' }}>S/ {totalServiciosReporte.toFixed(2)}</p>
                      <p className="text-[10px] text-muted-foreground">{serviciosReporte.length}</p>
                    </div>
                    <div className="p-2 md:p-4 rounded-lg" style={{ border: '2px solid #D5B888', backgroundColor: 'rgba(213, 184, 136, 0.25)', boxShadow: '0 2px 8px rgba(213, 184, 136, 0.3)' }}>
                      <p className="text-[10px] md:text-sm" style={{ color: '#D5B888', fontWeight: 700 }}>Total</p>
                      <p className="text-sm md:text-2xl font-bold" style={{ color: '#8B7A4E' }}>S/ {totalReporte.toFixed(2)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {loadingReporte ? (
                <p className="text-center text-muted-foreground py-4">Cargando ventas y servicios...</p>
              ) : (
                <>
                  <Card style={{ borderTop: '4px solid #9AAD97' }}>
                    <CardHeader>
                      <CardTitle style={{ color: '#9AAD97' }}>Productos Vendidos</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {ventasReporte.length === 0 ? (
                        <p className="text-muted-foreground text-center py-4">No hay ventas en las cajas seleccionadas</p>
                      ) : (
                        <div className="overflow-y-scroll max-h-[350px] space-y-2">
                          {ventasReporte.map((v) => (
                            <div key={v.id} className="border rounded-lg overflow-hidden" style={{ borderColor: '#e5e7eb' }}>
                              <div className="flex flex-wrap items-center justify-between gap-2 p-2 text-xs" style={{ backgroundColor: 'rgba(154, 173, 151, 0.08)' }}>
                                <div className="flex flex-wrap gap-2">
                                  <span className="font-semibold" style={{ color: '#9AAD97' }}>Venta #{v.id}</span>
                                  <span className="text-muted-foreground">{v.date}</span>
                                  <span className="px-1.5 py-0.5 rounded border" style={{ borderColor: '#D5B888', color: '#D5B888' }}>{v.paymentMethod}</span>
                                </div>
                                <span className="font-bold" style={{ color: '#9AAD97' }}>S/ {v.total.toFixed(2)}</span>
                              </div>
                              <div className="p-2">
                                <table className="w-full text-xs">
                                  <thead>
                                    <tr className="text-muted-foreground">
                                      <th className="text-left py-1">Prod.</th>
                                      <th className="text-center py-1 w-10">Cant.</th>
                                      <th className="text-right py-1 w-16">Costo</th>
                                      <th className="text-right py-1 w-16">P.U.</th>
                                      <th className="text-right py-1 w-16">Total</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {(v.items || []).map((item: any, idx: number) => (
                                      <tr key={idx} className="border-b last:border-b-0 border-dashed" style={{ borderColor: '#f0f0f0' }}>
                                        <td className="py-1 pr-1 truncate max-w-[120px] sm:max-w-[200px]">{item.nombre || item.name || item.producto || 'Producto'}</td>
                                        <td className="py-1 text-center">{item.cantidad || item.quantity || 1}</td>
                                        <td className="py-1 text-right">S/ {Number(item.costo_compra ?? 0).toFixed(2)}</td>
                                        <td className="py-1 text-right">S/ {Number(item.precio_unitario || item.precio || item.price || 0).toFixed(2)}</td>
                                        <td className="py-1 text-right font-medium">S/ {(Number(item.cantidad || item.quantity || 1) * Number(item.precio_unitario || item.precio || item.price || 0)).toFixed(2)}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  <Card style={{ borderTop: '4px solid #D5B888' }}>
                    <CardHeader>
                      <CardTitle style={{ color: '#D5B888' }}>Servicios</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {serviciosReporte.length === 0 ? (
                        <p className="text-muted-foreground text-center py-4">No hay servicios en las cajas seleccionadas</p>
                      ) : (
                        <div className="overflow-auto max-h-[400px]">
                          <table className="w-full text-xs">
                            <thead className="sticky top-0 bg-white">
                              <tr>
                                <th className="text-left p-1 border-b w-12" style={{ color: '#D5B888' }}>ID</th>
                                <th className="text-left p-1 border-b w-28" style={{ color: '#9AAD97' }}>Fecha</th>
                                <th className="text-left p-1 border-b" style={{ color: '#D5B888' }}>Descripción</th>
                                <th className="text-left p-1 border-b w-16" style={{ color: '#9AAD97' }}>Método</th>
                                <th className="text-right p-1 border-b w-16" style={{ color: '#D5B888' }}>Monto</th>
                              </tr>
                            </thead>
                            <tbody>
                              {serviciosReporte.map((s) => (
                                <tr key={s.id} className="border-b last:border-b-0">
                                  <td className="p-1">{s.id}</td>
                                  <td className="p-1">{s.date}</td>
                                  <td className="p-1 truncate max-w-[120px]">{s.description}</td>
                                  <td className="p-1">{s.paymentMethod}</td>
                                  <td className="p-1 text-right font-semibold">S/ {s.subtotal.toFixed(2)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </>
              )}
            </>
          )}
        </>
      )}

      {/* Diálogo de movimientos entre cuentas */}
      <Dialog open={showMoveDialog} onOpenChange={setShowMoveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Movimientos de Cuentas</DialogTitle>
            <DialogDescription>
              Transfiere dinero entre la cuenta efectivo y la cuenta yape. El monto se restará de la cuenta origen y sumará a la cuenta destino.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <Label>Tipo de Movimiento</Label>
              <Select value={moveType} onValueChange={(value: "manual" | "recarga" | "retiro-yape" | "deposito-yape") => applyMovePreset(value)}>
                <SelectTrigger className="w-full mt-2">
                  <SelectValue placeholder="Seleccione tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="manual">Manual</SelectItem>
                  <SelectItem value="recarga">Recarga</SelectItem>
                  <SelectItem value="retiro-yape">Retiro Yape</SelectItem>
                  <SelectItem value="deposito-yape">Depósito a Yape</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Cuenta Origen</Label>
                <Select value={moveFrom} onValueChange={(value: "efectivo" | "yape") => {
                  setMoveFrom(value);
                  if (moveTo === value) {
                    setMoveTo(value === 'efectivo' ? 'yape' : 'efectivo');
                  }
                }}>
                  <SelectTrigger className="w-full mt-2">
                    <SelectValue placeholder="Origen" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="efectivo">Efectivo</SelectItem>
                    <SelectItem value="yape">Yape</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Cuenta Destino</Label>
                <Select value={moveTo} onValueChange={(value: "efectivo" | "yape") => {
                  setMoveTo(value);
                  if (moveFrom === value) {
                    setMoveFrom(value === 'efectivo' ? 'yape' : 'efectivo');
                  }
                }}>
                  <SelectTrigger className="w-full mt-2">
                    <SelectValue placeholder="Destino" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="efectivo">Efectivo</SelectItem>
                    <SelectItem value="yape">Yape</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Monto a transferir</Label>
              <div className="relative mt-2">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">S/</span>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={moveAmount}
                  onChange={(e) => setMoveAmount(e.target.value)}
                  className="pl-10"
                />
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Saldo disponible: S/ {moveFrom === 'efectivo' ? cuentaEfectivo.toFixed(2) : cuentaYape.toFixed(2)}
              </p>
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="hasCommission"
                checked={moveHasCommission}
                onChange={(e) => setMoveHasCommission(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-[#9AAD97] focus:ring-[#9AAD97]"
              />
              <Label htmlFor="hasCommission" className="cursor-pointer">¿Tiene comisión?</Label>
            </div>

            {moveHasCommission && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Monto de comisión</Label>
                  <div className="relative mt-2">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">S/</span>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={moveCommissionAmount}
                      onChange={(e) => setMoveCommissionAmount(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <div>
                  <Label>Cuenta de comisión</Label>
                  <Select value={moveCommissionAccount} onValueChange={(value: "efectivo" | "yape") => setMoveCommissionAccount(value)}>
                    <SelectTrigger className="w-full mt-2">
                      <SelectValue placeholder="Cuenta" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="efectivo">Efectivo</SelectItem>
                      <SelectItem value="yape">Yape</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            <div>
              <Label>Observaciones</Label>
              <Textarea
                placeholder="Notas sobre el movimiento..."
                value={moveObservations}
                onChange={(e) => setMoveObservations(e.target.value)}
                rows={2}
                className="mt-2"
              />
            </div>

            <Button
              className="w-full"
              style={{ backgroundColor: '#9AAD97', color: 'white', border: 'none' }}
              onClick={handleMoveBetweenAccounts}
              disabled={moveLoading}
            >
              {moveLoading ? 'Procesando...' : 'Realizar Movimiento'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Diálogo para ver movimientos anteriores */}
      <Dialog open={showMovementsDialog} onOpenChange={setShowMovementsDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Historial de Movimientos entre Cuentas</DialogTitle>
            <DialogDescription>
              Movimientos registrados para la caja actual.
            </DialogDescription>
          </DialogHeader>
          <div className="pt-2">
            {loadingMovements ? (
              <p className="text-center text-muted-foreground py-4">Cargando movimientos...</p>
            ) : movementsList.length === 0 ? (
              <p className="text-center text-muted-foreground py-4">No hay movimientos registrados</p>
            ) : (
              <div className="overflow-auto max-h-[400px]">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-white">
                    <tr className="border-b">
                      <th className="text-left py-2 px-2">Fecha</th>
                      <th className="text-left py-2 px-2">Origen</th>
                      <th className="text-left py-2 px-2">Destino</th>
                      <th className="text-right py-2 px-2">Monto</th>
                      <th className="text-right py-2 px-2">Comisión</th>
                      <th className="text-left py-2 px-2">Cta. Comisión</th>
                      <th className="text-left py-2 px-2">Usuario</th>
                    </tr>
                  </thead>
                  <tbody>
                    {movementsList.map((mov) => {
                      const rawFecha = mov.fecha_hora || mov.fecha || new Date().toISOString();
                      const parsedDate = new Date(rawFecha);
                      const fecha = !isNaN(parsedDate.getTime())
                        ? `${parsedDate.toLocaleDateString('es-PE')} ${parsedDate.toLocaleTimeString('es-PE')}`
                        : String(rawFecha);
                      const comision = Number(mov.comision ?? 0);
                      return (
                        <tr key={mov.id_movimiento ?? mov.id} className="border-b last:border-b-0">
                          <td className="py-2 px-2 whitespace-nowrap">{fecha}</td>
                          <td className="py-2 px-2">{mov.cuenta_origen}</td>
                          <td className="py-2 px-2">{mov.cuenta_destino}</td>
                          <td className="py-2 px-2 text-right font-semibold">S/ {Number(mov.monto ?? 0).toFixed(2)}</td>
                          <td className="py-2 px-2 text-right">{comision > 0 ? `S/ ${comision.toFixed(2)}` : '-'}</td>
                          <td className="py-2 px-2">{comision > 0 ? mov.cuenta_comision : '-'}</td>
                          <td className="py-2 px-2">{mov.usuario}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
