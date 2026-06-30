import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import {
  Search,
  Plus,
  Edit,
  Trash2,
  Building2,
  Phone,
  ArrowLeft,
  Eye,
  AlertTriangle,
  CheckCircle2,
  Package,
  ClipboardList,
  AlertOctagon,
  Clock,
  RotateCcw,
  X
} from "lucide-react";
import { Badge } from "./ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Checkbox } from "./ui/checkbox";

const API_BASE = "http://localhost:9000/api";

type View = "proveedores" | "pedidos" | "nuevo-pedido" | "detalle-pedido" | "discrepancias";

interface Proveedor {
  id_proveedor: number;
  nombre: string;
  ruc: string;
  rubro: string;
  telefono: string;
  fecha_creacion?: string;
}

interface PedidoDetalle {
  id_pedido_detalle?: number;
  id_pedido?: number;
  producto: string;
  cantidad_pedida: number;
  precio_unitario: number;
  cantidad_bonificada: number;
  descripcion_promocion?: string | null;
  estado?: string;
  cantidad_recibida?: number | null;
  cantidad_bonificada_recibida?: number | null;
  fecha_recepcion?: string | null;
  observaciones?: string | null;
  tiene_discrepancia?: boolean;
}

interface Pedido {
  id_pedido: number;
  id_proveedor: number;
  proveedor?: string;
  fecha_pedido: string;
  fecha_entrega_estimada: string;
  total_pedido: number;
  observaciones?: string;
  estado_general: string;
  detalle?: PedidoDetalle[];
}

interface Discrepancia {
  id_pedido: number;
  proveedor: string;
  producto: string;
  cantidad_pedida: number;
  cantidad_recibida: number;
  cantidad_bonificada: number;
  cantidad_bonificada_recibida: number;
  observaciones: string;
  fecha_recepcion: string;
}

interface PedidoLineaForm {
  producto: string;
  cantidad_pedida: number;
  precio_unitario: number;
  cantidad_bonificada: number;
  descripcion_promocion: string;
}

interface ProveedoresModuleProps {
  currentUser: {
    username: string;
    role: string;
    name: string;
  };
}

const COLOR_GOLD = "#D5B888";
const COLOR_SAGE = "#9AAD97";

async function getApiError(response: Response): Promise<string> {
  try {
    const data = await response.json();
    return data.message || data.error || `Error ${response.status}: ${response.statusText}`;
  } catch {
    return `Error ${response.status}: ${response.statusText}`;
  }
}

function formatDateTimeLocalInput(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function formatDateForApi(dateTimeLocal: string): string {
  return dateTimeLocal.replace("T", " ") + ":00";
}

function formatDateDisplay(value: string | undefined): string {
  if (!value) return "—";
  const d = new Date(value.replace(" ", "T"));
  if (isNaN(d.getTime())) return value;
  return d.toLocaleString("es-PE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDateOnlyDisplay(value: string | undefined): string {
  if (!value) return "—";
  const d = new Date(value);
  if (isNaN(d.getTime())) return value;
  return d.toLocaleDateString("es-PE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function getDefaultFechaEntrega(): string {
  const d = new Date();
  d.setDate(d.getDate() + 2);
  return d.toISOString().split("T")[0];
}

export function ProveedoresModule({ currentUser }: ProveedoresModuleProps) {
  const isAdmin = currentUser.role?.toLowerCase() === 'admin' || currentUser.role?.toLowerCase() === 'administrador';
  const isVendedor = currentUser.role?.toLowerCase() === 'vendedor';
  const [view, setView] = useState<View>(isVendedor ? "pedidos" : "proveedores");

  const getHeaders = (contentType = false): Record<string, string> => {
    const headers: Record<string, string> = {
      "x-usuario": currentUser.username,
    };
    if (contentType) {
      headers["Content-Type"] = "application/json";
    }
    return headers;
  };

  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [selectedPedido, setSelectedPedido] = useState<Pedido | null>(null);
  const [discrepancias, setDiscrepancias] = useState<Discrepancia[]>([]);

  const [loadingProveedores, setLoadingProveedores] = useState(false);
  const [loadingPedidos, setLoadingPedidos] = useState(false);
  const [loadingDetalle, setLoadingDetalle] = useState(false);
  const [loadingDiscrepancias, setLoadingDiscrepancias] = useState(false);
  const [saving, setSaving] = useState(false);
  const [receiving, setReceiving] = useState<number | null>(null);

  const [error, setError] = useState<string | null>(null);

  const [searchProveedor, setSearchProveedor] = useState("");
  const [proveedorFormOpen, setProveedorFormOpen] = useState(false);
  const [editingProveedor, setEditingProveedor] = useState<Proveedor | null>(null);
  const [deletingProveedor, setDeletingProveedor] = useState<Proveedor | null>(null);

  const [proveedorForm, setProveedorForm] = useState({
    nombre: "",
    ruc: "",
    rubro: "",
    telefono: "",
  });

  const [pedidoFilterProveedor, setPedidoFilterProveedor] = useState<string>("all");
  const [pedidoFilterEstado, setPedidoFilterEstado] = useState<string>("all");
  const [pedidoFilterDesde, setPedidoFilterDesde] = useState<string>("");
  const [pedidoFilterHasta, setPedidoFilterHasta] = useState<string>("");

  const [discrepanciaFilterProveedor, setDiscrepanciaFilterProveedor] = useState<string>("all");
  const [discrepanciaFilterDesde, setDiscrepanciaFilterDesde] = useState<string>("");
  const [discrepanciaFilterHasta, setDiscrepanciaFilterHasta] = useState<string>("");

  const [nuevoPedido, setNuevoPedido] = useState({
    id_proveedor: "",
    fecha_pedido: formatDateTimeLocalInput(new Date()),
    fecha_entrega_estimada: getDefaultFechaEntrega(),
    observaciones: "",
  });
  const [nuevoPedidoLineas, setNuevoPedidoLineas] = useState<PedidoLineaForm[]>([
    {
      producto: "",
      cantidad_pedida: 1,
      precio_unitario: 0,
      cantidad_bonificada: 0,
      descripcion_promocion: "",
    },
  ]);

  const [recepcionStates, setRecepcionStates] = useState<Record<number, {
    recibido: boolean;
    cantidad_recibida: number;
    cantidad_bonificada_recibida: number;
    observaciones: string;
  }>>({});

  const [resumen, setResumen] = useState({
    proveedores: 0,
    pedidos: 0,
    pedidosPendientes: 0,
    discrepancias: 0,
  });

  useEffect(() => {
    fetchProveedores();
    loadResumen();
  }, []);

  useEffect(() => {
    if (view === "pedidos") fetchPedidos();
  }, [view]);

  useEffect(() => {
    if (view === "discrepancias") fetchDiscrepancias();
  }, [view]);

  useEffect(() => {
    if (isVendedor && (view === "proveedores" || view === "discrepancias")) {
      setView("pedidos");
    }
  }, [isVendedor, view]);

  const fetchProveedores = async () => {
    setLoadingProveedores(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE}/proveedores`, {
        headers: getHeaders(),
      });
      if (!response.ok) throw new Error(await getApiError(response));
      const data = await response.json();
      setProveedores(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar proveedores");
    } finally {
      setLoadingProveedores(false);
    }
  };

  const fetchPedidosInternal = async (
    proveedor: string,
    estado: string,
    desde: string,
    hasta: string
  ) => {
    setLoadingPedidos(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (proveedor && proveedor !== "all") {
        params.append("id_proveedor", proveedor);
      }
      if (estado && estado !== "all") {
        params.append("estado_general", estado);
      }
      if (desde) params.append("desde", desde);
      if (hasta) params.append("hasta", hasta);

      const response = await fetch(`${API_BASE}/pedidos?${params.toString()}`, {
        headers: getHeaders(),
      });
      if (!response.ok) throw new Error(await getApiError(response));
      const data = await response.json();
      setPedidos(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar pedidos");
    } finally {
      setLoadingPedidos(false);
    }
  };

  const fetchPedidos = async () => {
    await fetchPedidosInternal(
      pedidoFilterProveedor,
      pedidoFilterEstado,
      pedidoFilterDesde,
      pedidoFilterHasta
    );
  };

  const limpiarFiltrosPedidos = () => {
    setPedidoFilterProveedor("all");
    setPedidoFilterEstado("all");
    setPedidoFilterDesde("");
    setPedidoFilterHasta("");
    fetchPedidosInternal("all", "all", "", "");
  };

  const fetchDetallePedido = async (pedido: Pedido) => {
    setLoadingDetalle(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE}/pedidos/${pedido.id_pedido}`, {
        headers: getHeaders(),
      });
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error("No se encontró el endpoint de detalle del pedido.");
        }
        throw new Error(await getApiError(response));
      }
      const data = await response.json();
      const detalle: PedidoDetalle[] = data.detalle || [];
      const fullPedido: Pedido = { ...data, detalle };
      setSelectedPedido(fullPedido);

      const initialStates: Record<number, { recibido: boolean; cantidad_recibida: number; cantidad_bonificada_recibida: number; observaciones: string }> = {};
      detalle.forEach((linea) => {
        if (linea.id_pedido_detalle) {
          initialStates[linea.id_pedido_detalle] = {
            recibido: linea.estado === "ENTREGADO",
            cantidad_recibida: linea.cantidad_recibida ?? linea.cantidad_pedida,
            cantidad_bonificada_recibida: linea.cantidad_bonificada_recibida ?? linea.cantidad_bonificada,
            observaciones: linea.observaciones ?? "",
          };
        }
      });
      setRecepcionStates(initialStates);
      setView("detalle-pedido");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar detalle del pedido");
    } finally {
      setLoadingDetalle(false);
    }
  };

  const fetchDiscrepanciasInternal = async (
    proveedor: string,
    desde: string,
    hasta: string
  ) => {
    setLoadingDiscrepancias(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (proveedor && proveedor !== "all") {
        params.append("id_proveedor", proveedor);
      }
      if (desde) params.append("desde", desde);
      if (hasta) params.append("hasta", hasta);

      const response = await fetch(`${API_BASE}/pedidos/discrepancias?${params.toString()}`, {
        headers: getHeaders(),
      });
      if (!response.ok) throw new Error(await getApiError(response));
      const data = await response.json();
      setDiscrepancias(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar discrepancias");
    } finally {
      setLoadingDiscrepancias(false);
    }
  };

  const fetchDiscrepancias = async () => {
    await fetchDiscrepanciasInternal(
      discrepanciaFilterProveedor,
      discrepanciaFilterDesde,
      discrepanciaFilterHasta
    );
  };

  const limpiarFiltrosDiscrepancias = () => {
    setDiscrepanciaFilterProveedor("all");
    setDiscrepanciaFilterDesde("");
    setDiscrepanciaFilterHasta("");
    fetchDiscrepanciasInternal("all", "", "");
  };

  const loadResumen = async () => {
    try {
      const [provRes, pedRes, discRes] = await Promise.all([
        fetch(`${API_BASE}/proveedores`, { headers: getHeaders() }),
        fetch(`${API_BASE}/pedidos`, { headers: getHeaders() }),
        fetch(`${API_BASE}/pedidos/discrepancias`, { headers: getHeaders() }),
      ]);

      if (provRes.ok) {
        const provData = await provRes.json();
        setResumen((prev) => ({
          ...prev,
          proveedores: Array.isArray(provData) ? provData.length : 0,
        }));
      }
      if (pedRes.ok) {
        const pedData = await pedRes.json();
        const lista = Array.isArray(pedData) ? pedData : [];
        setResumen((prev) => ({
          ...prev,
          pedidos: lista.length,
          pedidosPendientes: lista.filter((p: Pedido) => p.estado_general === "PENDIENTE").length,
        }));
      }
      if (discRes.ok) {
        const discData = await discRes.json();
        setResumen((prev) => ({
          ...prev,
          discrepancias: Array.isArray(discData) ? discData.length : 0,
        }));
      }
    } catch (err) {
      console.error("Error cargando resumen:", err);
    }
  };

  const handleSaveProveedor = async () => {
    if (!proveedorForm.nombre || !proveedorForm.ruc || !proveedorForm.rubro || !proveedorForm.telefono) {
      alert("Complete todos los campos obligatorios.");
      return;
    }
    setSaving(true);
    try {
      const url = editingProveedor
        ? `${API_BASE}/proveedores/${editingProveedor.id_proveedor}`
        : `${API_BASE}/proveedores`;
      const method = editingProveedor ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: getHeaders(true),
        body: JSON.stringify(proveedorForm),
      });
      if (!response.ok) throw new Error(await getApiError(response));

      alert(editingProveedor ? "Proveedor actualizado correctamente." : "Proveedor registrado correctamente.");
      setProveedorFormOpen(false);
      setEditingProveedor(null);
      setProveedorForm({ nombre: "", ruc: "", rubro: "", telefono: "" });
      await fetchProveedores();
      await loadResumen();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Error al guardar proveedor");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteProveedor = async () => {
    if (!deletingProveedor) return;
    setSaving(true);
    try {
      const response = await fetch(`${API_BASE}/proveedores/${deletingProveedor.id_proveedor}`, {
        method: "DELETE",
        headers: getHeaders(),
      });
      if (!response.ok) throw new Error(await getApiError(response));
      alert("Proveedor eliminado correctamente.");
      setDeletingProveedor(null);
      await fetchProveedores();
      await loadResumen();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Error al eliminar proveedor");
    } finally {
      setSaving(false);
    }
  };

  const openProveedorForm = (proveedor?: Proveedor) => {
    if (proveedor) {
      setEditingProveedor(proveedor);
      setProveedorForm({
        nombre: proveedor.nombre,
        ruc: proveedor.ruc,
        rubro: proveedor.rubro,
        telefono: proveedor.telefono,
      });
    } else {
      setEditingProveedor(null);
      setProveedorForm({ nombre: "", ruc: "", rubro: "", telefono: "" });
    }
    setProveedorFormOpen(true);
  };

  const handleSavePedido = async () => {
    if (!nuevoPedido.id_proveedor) {
      alert("Seleccione un proveedor.");
      return;
    }
    if (!nuevoPedido.fecha_entrega_estimada) {
      alert("Ingrese la fecha estimada de entrega.");
      return;
    }

    const lineasValidas = nuevoPedidoLineas.filter(
      (l) => l.producto.trim() && l.cantidad_pedida > 0 && l.precio_unitario > 0
    );
    if (lineasValidas.length === 0) {
      alert("Agregue al menos una línea válida con producto, cantidad y precio.");
      return;
    }

    const payload = {
      id_proveedor: Number(nuevoPedido.id_proveedor),
      fecha_pedido: formatDateForApi(nuevoPedido.fecha_pedido),
      fecha_entrega_estimada: nuevoPedido.fecha_entrega_estimada,
      observaciones: nuevoPedido.observaciones,
      detalle: lineasValidas.map((l) => ({
        producto: l.producto.trim(),
        cantidad_pedida: Number(l.cantidad_pedida),
        precio_unitario: Number(l.precio_unitario),
        cantidad_bonificada: Number(l.cantidad_bonificada) || 0,
        descripcion_promocion: l.descripcion_promocion || null,
      })),
    };

    setSaving(true);
    try {
      const response = await fetch(`${API_BASE}/pedidos`, {
        method: "POST",
        headers: getHeaders(true),
        body: JSON.stringify(payload),
      });
      if (!response.ok) throw new Error(await getApiError(response));
      const data = await response.json();
      alert(`Pedido registrado correctamente. Total: S/ ${Number(data.total_pedido).toFixed(2)}`);
      resetNuevoPedido();
      setView("pedidos");
      fetchPedidos();
      loadResumen();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Error al registrar pedido");
    } finally {
      setSaving(false);
    }
  };

  const resetNuevoPedido = () => {
    setNuevoPedido({
      id_proveedor: "",
      fecha_pedido: formatDateTimeLocalInput(new Date()),
      fecha_entrega_estimada: getDefaultFechaEntrega(),
      observaciones: "",
    });
    setNuevoPedidoLineas([
      {
        producto: "",
        cantidad_pedida: 1,
        precio_unitario: 0,
        cantidad_bonificada: 0,
        descripcion_promocion: "",
      },
    ]);
  };

  const updateLinea = (index: number, field: keyof PedidoLineaForm, value: string | number) => {
    const nuevas = [...nuevoPedidoLineas];
    nuevas[index] = { ...nuevas[index], [field]: value };
    setNuevoPedidoLineas(nuevas);
  };

  const addLinea = () => {
    setNuevoPedidoLineas([
      ...nuevoPedidoLineas,
      { producto: "", cantidad_pedida: 1, precio_unitario: 0, cantidad_bonificada: 0, descripcion_promocion: "" },
    ]);
  };

  const removeLinea = (index: number) => {
    if (nuevoPedidoLineas.length === 1) {
      setNuevoPedidoLineas([{ producto: "", cantidad_pedida: 1, precio_unitario: 0, cantidad_bonificada: 0, descripcion_promocion: "" }]);
      return;
    }
    setNuevoPedidoLineas(nuevoPedidoLineas.filter((_, i) => i !== index));
  };

  const totalNuevoPedido = useMemo(() => {
    return nuevoPedidoLineas.reduce((sum, l) => sum + l.cantidad_pedida * l.precio_unitario, 0);
  }, [nuevoPedidoLineas]);

  const handleRecepcionar = async (linea: PedidoDetalle) => {
    if (!linea.id_pedido_detalle || !selectedPedido) return;
    const state = recepcionStates[linea.id_pedido_detalle] || {
      recibido: false,
      cantidad_recibida: linea.cantidad_pedida,
      cantidad_bonificada_recibida: linea.cantidad_bonificada,
      observaciones: "",
    };

    const cantidadRecibida = Number(state.cantidad_recibida);
    const cantidadBonificadaRecibida = Number(state.cantidad_bonificada_recibida);

    if (Number.isNaN(cantidadRecibida) || cantidadRecibida < 0) {
      alert("La cantidad recibida debe ser un número válido.");
      return;
    }

    const hayDiferencia =
      cantidadRecibida !== linea.cantidad_pedida ||
      cantidadBonificadaRecibida !== linea.cantidad_bonificada;

    if (hayDiferencia) {
      const confirmar = window.confirm(
        `Los valores ingresados no coinciden con lo esperado:\n` +
          `- ${linea.producto}\n` +
          `Esperado: ${linea.cantidad_pedida} u. + ${linea.cantidad_bonificada} bonif.\n` +
          `Recibido: ${cantidadRecibida} u. + ${cantidadBonificadaRecibida} bonif.\n\n` +
          `¿Desea guardar la recepción de todos modos?`
      );
      if (!confirmar) return;
    }

    setReceiving(linea.id_pedido_detalle);
    setRecepcionStates((prev) => ({
      ...prev,
      [linea.id_pedido_detalle]: { ...state, recibido: true },
    }));
    try {
      const response = await fetch(
        `${API_BASE}/pedidos/${selectedPedido.id_pedido}/detalle/${linea.id_pedido_detalle}/recepcionar`,
        {
          method: "PATCH",
          headers: getHeaders(true),
          body: JSON.stringify({
            cantidad_recibida: cantidadRecibida,
            cantidad_bonificada_recibida: Number.isFinite(cantidadBonificadaRecibida) ? cantidadBonificadaRecibida : 0,
            observaciones: state.observaciones || null,
          }),
        }
      );
      if (!response.ok) throw new Error(await getApiError(response));
      const data = await response.json();
      alert(
        data.tiene_discrepancia
          ? "Recepción guardada. Se detectó una discrepancia."
          : "Recepción guardada correctamente."
      );
      await fetchDetallePedido(selectedPedido);
      loadResumen();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Error al recepcionar línea");
    } finally {
      setReceiving(null);
    }
  };

  const handleRechazar = async (linea: PedidoDetalle) => {
    if (!linea.id_pedido_detalle || !selectedPedido) return;
    const confirmar = window.confirm(
      `¿Está seguro de rechazar el producto "${linea.producto}"?\nSe registrará como recibido con cantidad 0.`
    );
    if (!confirmar) return;

    setReceiving(linea.id_pedido_detalle);
    setRecepcionStates((prev) => ({
      ...prev,
      [linea.id_pedido_detalle]: {
        recibido: true,
        cantidad_recibida: 0,
        cantidad_bonificada_recibida: 0,
        observaciones: "Rechazado",
      },
    }));
    try {
      const response = await fetch(
        `${API_BASE}/pedidos/${selectedPedido.id_pedido}/detalle/${linea.id_pedido_detalle}/recepcionar`,
        {
          method: "PATCH",
          headers: getHeaders(true),
          body: JSON.stringify({
            cantidad_recibida: 0,
            cantidad_bonificada_recibida: 0,
            observaciones: "Rechazado",
          }),
        }
      );
      if (!response.ok) throw new Error(await getApiError(response));
      const data = await response.json();
      alert(
        data.tiene_discrepancia
          ? "Rechazo registrado. Se detectó una discrepancia."
          : "Rechazo registrado correctamente."
      );
      await fetchDetallePedido(selectedPedido);
      loadResumen();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Error al rechazar línea");
    } finally {
      setReceiving(null);
    }
  };

  const toggleRecibido = (linea: PedidoDetalle, checked: boolean) => {
    if (!linea.id_pedido_detalle) return;
    setRecepcionStates((prev) => {
      const current = prev[linea.id_pedido_detalle!] || {
        recibido: false,
        cantidad_recibida: linea.cantidad_pedida,
        cantidad_bonificada_recibida: linea.cantidad_bonificada,
        observaciones: "",
      };
      return {
        ...prev,
        [linea.id_pedido_detalle]: { ...current, recibido: checked },
      };
    });
  };

  const updateRecepcionField = (id: number, field: string, value: string | number) => {
    setRecepcionStates((prev) => ({
      ...prev,
      [id]: { ...prev[id], [field]: value },
    }));
  };

  const proveedoresFiltrados = useMemo(() => {
    const q = searchProveedor.toLowerCase();
    return proveedores.filter(
      (p) =>
        p.nombre.toLowerCase().includes(q) ||
        p.rubro.toLowerCase().includes(q) ||
        p.ruc.includes(q)
    );
  }, [proveedores, searchProveedor]);

  const getNombreProveedor = (id: number | string) => {
    const p = proveedores.find((p) => p.id_proveedor === Number(id));
    return p?.nombre || `Proveedor #${id}`;
  };

  const renderEstadoBadge = (estado: string) => {
    const upper = estado?.toUpperCase() || "";
    if (upper === "PENDIENTE") {
      return (
        <Badge style={{ backgroundColor: "#FEF3C7", color: "#B45309", borderColor: "#F59E0B", border: "1px solid" }}>
          PENDIENTE
        </Badge>
      );
    }
    if (upper === "COMPLETO") {
      return (
        <Badge style={{ backgroundColor: "#DCFCE7", color: "#15803D", borderColor: "#22C55E", border: "1px solid" }}>
          COMPLETO
        </Badge>
      );
    }
    return <Badge variant="outline">{estado}</Badge>;
  };

  const renderEstadoLineaBadge = (estado?: string, tieneDiscrepancia?: boolean) => {
    const upper = estado?.toUpperCase() || "";
    if (upper === "ENTREGADO") {
      return (
        <div className="flex items-center gap-1">
          <CheckCircle2 className="h-4 w-4" style={{ color: COLOR_SAGE }} />
          <span className="text-sm">ENTREGADO</span>
          {tieneDiscrepancia && <AlertTriangle className="h-4 w-4 text-amber-600" />}
        </div>
      );
    }
    return (
      <div className="flex items-center gap-1">
        <span className="text-sm">{estado || "PENDIENTE"}</span>
        {tieneDiscrepancia && <AlertTriangle className="h-4 w-4 text-amber-600" />}
      </div>
    );
  };

  const renderNavigation = () => (
    <div className="flex flex-wrap items-center gap-2 mb-6">
      {isAdmin && (
        <Button
          variant={view === "proveedores" ? "default" : "outline"}
          onClick={() => setView("proveedores")}
          style={
            view === "proveedores"
              ? { backgroundColor: COLOR_GOLD, color: "white", border: "none" }
              : { color: COLOR_GOLD, borderColor: COLOR_GOLD }
          }
        >
          <Building2 className="h-4 w-4 mr-2" />
          Proveedores
        </Button>
      )}
      <Button
        variant={view === "pedidos" || view === "nuevo-pedido" || view === "detalle-pedido" ? "default" : "outline"}
        onClick={() => setView("pedidos")}
        style={
          view === "pedidos" || view === "nuevo-pedido" || view === "detalle-pedido"
            ? { backgroundColor: COLOR_SAGE, color: "white", border: "none" }
            : { color: COLOR_SAGE, borderColor: COLOR_SAGE }
        }
      >
        <ClipboardList className="h-4 w-4 mr-2" />
        Pedidos
      </Button>
      {isAdmin && (
        <Button
          variant={view === "discrepancias" ? "default" : "outline"}
          onClick={() => setView("discrepancias")}
          style={
            view === "discrepancias"
              ? { backgroundColor: COLOR_GOLD, color: "white", border: "none" }
              : { color: COLOR_GOLD, borderColor: COLOR_GOLD }
          }
        >
          <AlertOctagon className="h-4 w-4 mr-2" />
          Discrepancias
        </Button>
      )}
    </div>
  );

  const renderProveedoresView = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 style={{ color: COLOR_GOLD }}>Proveedores</h2>
          <p className="text-muted-foreground">Gestión de proveedores del sistema</p>
        </div>
        <Button
          onClick={() => openProveedorForm()}
          style={{ backgroundColor: COLOR_GOLD, color: "white", border: "none" }}
        >
          <Plus className="h-4 w-4 mr-2" />
          Nuevo Proveedor
        </Button>
      </div>

      <Card style={{ borderTop: `4px solid ${COLOR_GOLD}` }}>
        <CardHeader>
          <CardTitle style={{ color: COLOR_GOLD }}>Lista de Proveedores</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nombre, rubro o RUC..."
              value={searchProveedor}
              onChange={(e) => setSearchProveedor(e.target.value)}
              className="pl-10"
            />
          </div>

          {loadingProveedores ? (
            <p className="text-muted-foreground">Cargando proveedores...</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Proveedor</TableHead>
                  <TableHead>RUC</TableHead>
                  <TableHead>Rubro</TableHead>
                  <TableHead>Teléfono</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {proveedoresFiltrados.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground">
                      No se encontraron proveedores.
                    </TableCell>
                  </TableRow>
                ) : (
                  proveedoresFiltrados.map((p) => (
                    <TableRow key={p.id_proveedor}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg" style={{ backgroundColor: "rgba(213, 184, 136, 0.15)" }}>
                            <Building2 className="h-4 w-4" style={{ color: COLOR_GOLD }} />
                          </div>
                          <p className="font-medium">{p.nombre}</p>
                        </div>
                      </TableCell>
                      <TableCell>{p.ruc}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{p.rubro}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 text-sm">
                          <Phone className="h-3 w-3 text-muted-foreground" />
                          {p.telefono}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => openProveedorForm(p)}
                          style={{ color: COLOR_GOLD }}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setDeletingProveedor(p)}
                          style={{ color: "#DC2626" }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={proveedorFormOpen} onOpenChange={setProveedorFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle style={{ color: COLOR_GOLD }}>
              {editingProveedor ? "Editar Proveedor" : "Nuevo Proveedor"}
            </DialogTitle>
            <DialogDescription>
              {editingProveedor
                ? "Modifique los datos del proveedor."
                : "Registre un nuevo proveedor con su información de contacto."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label style={{ color: COLOR_GOLD }}>Nombre o Razón Social</Label>
              <Input
                value={proveedorForm.nombre}
                onChange={(e) => setProveedorForm({ ...proveedorForm, nombre: e.target.value })}
                placeholder="Distribuidora Salud SAC"
              />
            </div>
            <div>
              <Label style={{ color: COLOR_SAGE }}>RUC</Label>
              <Input
                value={proveedorForm.ruc}
                onChange={(e) => setProveedorForm({ ...proveedorForm, ruc: e.target.value })}
                placeholder="20123456789"
              />
            </div>
            <div>
              <Label style={{ color: COLOR_GOLD }}>Rubro</Label>
              <Input
                value={proveedorForm.rubro}
                onChange={(e) => setProveedorForm({ ...proveedorForm, rubro: e.target.value })}
                placeholder="Distribuidor de medicamentos"
              />
            </div>
            <div>
              <Label style={{ color: COLOR_SAGE }}>Teléfono</Label>
              <Input
                value={proveedorForm.telefono}
                onChange={(e) => setProveedorForm({ ...proveedorForm, telefono: e.target.value })}
                placeholder="987654321"
              />
            </div>
            <Button
              className="w-full"
              onClick={handleSaveProveedor}
              disabled={saving}
              style={{ backgroundColor: COLOR_GOLD, color: "white", border: "none" }}
            >
              {saving ? "Guardando..." : editingProveedor ? "Guardar Cambios" : "Guardar Proveedor"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deletingProveedor} onOpenChange={(open) => !open && setDeletingProveedor(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle style={{ color: "#DC2626" }}>Eliminar Proveedor</DialogTitle>
            <DialogDescription>
              ¿Está seguro de eliminar a <strong>{deletingProveedor?.nombre}</strong>? Esta acción no se puede deshacer.
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-2 justify-end mt-4">
            <Button
              variant="outline"
              onClick={() => setDeletingProveedor(null)}
              className="border-[#D5B888] text-[#D5B888] hover:bg-[#D5B888] hover:text-white hover:border-[#D5B888]"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleDeleteProveedor}
              disabled={saving}
              style={{ backgroundColor: "#DC2626", color: "white", border: "none" }}
            >
              {saving ? "Eliminando..." : "Eliminar"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );

  const renderPedidosView = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 style={{ color: COLOR_SAGE }}>Pedidos</h2>
          <p className="text-muted-foreground">Gestión de pedidos a proveedores</p>
        </div>
        <Button
          onClick={() => {
            resetNuevoPedido();
            setView("nuevo-pedido");
          }}
          style={{ backgroundColor: COLOR_SAGE, color: "white", border: "none" }}
        >
          <Plus className="h-4 w-4 mr-2" />
          Nuevo Pedido
        </Button>
      </div>

      <Card style={{ borderTop: `4px solid ${COLOR_SAGE}` }}>
        <CardHeader>
          <CardTitle style={{ color: COLOR_SAGE }}>Lista de Pedidos</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-3 items-end">
            <div className="w-full md:w-56">
              <Label className="text-xs">Proveedor</Label>
              <Select value={pedidoFilterProveedor} onValueChange={setPedidoFilterProveedor}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los proveedores</SelectItem>
                  {proveedores.map((p) => (
                    <SelectItem key={p.id_proveedor} value={String(p.id_proveedor)}>
                      {p.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="w-full md:w-44">
              <Label className="text-xs">Estado</Label>
              <Select value={pedidoFilterEstado} onValueChange={setPedidoFilterEstado}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="PENDIENTE">PENDIENTE</SelectItem>
                  <SelectItem value="COMPLETO">COMPLETO</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Desde</Label>
              <Input type="date" value={pedidoFilterDesde} onChange={(e) => setPedidoFilterDesde(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">Hasta</Label>
              <Input type="date" value={pedidoFilterHasta} onChange={(e) => setPedidoFilterHasta(e.target.value)} />
            </div>
            <div className="flex items-end gap-2">
              <Button
                onClick={fetchPedidos}
                variant="outline"
                style={{ color: COLOR_SAGE, borderColor: COLOR_SAGE }}
              >
                <Search className="h-4 w-4 mr-2" />
                Buscar
              </Button>
              <Button
                onClick={limpiarFiltrosPedidos}
                variant="ghost"
                style={{ color: COLOR_GOLD }}
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Limpiar
              </Button>
            </div>
          </div>

          {loadingPedidos ? (
            <p className="text-muted-foreground">Cargando pedidos...</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Pedido</TableHead>
                  <TableHead>Proveedor</TableHead>
                  <TableHead>Fecha Pedido</TableHead>
                  <TableHead>Fecha Entrega Est.</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pedidos.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground">
                      No se encontraron pedidos.
                    </TableCell>
                  </TableRow>
                ) : (
                  pedidos.map((p) => (
                    <TableRow key={p.id_pedido}>
                      <TableCell className="font-medium">{p.id_pedido}</TableCell>
                      <TableCell>{p.proveedor || getNombreProveedor(p.id_proveedor)}</TableCell>
                      <TableCell>{formatDateDisplay(p.fecha_pedido)}</TableCell>
                      <TableCell>{formatDateOnlyDisplay(p.fecha_entrega_estimada)}</TableCell>
                      <TableCell className="font-bold" style={{ color: COLOR_SAGE }}>
                        S/ {Number(p.total_pedido).toFixed(2)}
                      </TableCell>
                      <TableCell>{renderEstadoBadge(p.estado_general)}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => fetchDetallePedido(p)}
                          style={{ color: COLOR_SAGE }}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          Ver
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );

  const renderNuevoPedidoView = () => (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" onClick={() => setView("pedidos")} style={{ color: COLOR_SAGE }}>
          <ArrowLeft className="h-4 w-4 mr-1" />
          Volver
        </Button>
        <div>
          <h2 style={{ color: COLOR_SAGE }}>Nuevo Pedido</h2>
          <p className="text-muted-foreground">Registre un pedido y sus líneas</p>
        </div>
      </div>

      <Card style={{ borderTop: `4px solid ${COLOR_SAGE}` }}>
        <CardHeader>
          <CardTitle style={{ color: COLOR_SAGE }}>Datos del Pedido</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label style={{ color: COLOR_SAGE }}>Proveedor *</Label>
              <Select value={nuevoPedido.id_proveedor} onValueChange={(v) => setNuevoPedido({ ...nuevoPedido, id_proveedor: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccione un proveedor" />
                </SelectTrigger>
                <SelectContent>
                  {proveedores.map((p) => (
                    <SelectItem key={p.id_proveedor} value={String(p.id_proveedor)}>
                      {p.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label style={{ color: COLOR_GOLD }}>Fecha y Hora de Pedido</Label>
              <Input
                value={formatDateDisplay(nuevoPedido.fecha_pedido)}
                readOnly
                className="bg-[#faf9f7] cursor-default border-[#e5e1d8]"
              />
            </div>
            <div>
              <Label style={{ color: COLOR_SAGE }}>Fecha Estimada de Entrega *</Label>
              <Input
                type="date"
                value={nuevoPedido.fecha_entrega_estimada}
                onChange={(e) => setNuevoPedido({ ...nuevoPedido, fecha_entrega_estimada: e.target.value })}
                className="bg-[#faf9f7] border-[#e5e1d8]"
              />
            </div>
            <div>
              <Label style={{ color: COLOR_GOLD }}>Observaciones Generales</Label>
              <Input
                value={nuevoPedido.observaciones}
                onChange={(e) => setNuevoPedido({ ...nuevoPedido, observaciones: e.target.value })}
                placeholder="Pedido urgente"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle style={{ color: COLOR_SAGE }}>Líneas del Pedido</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead style={{ color: COLOR_SAGE }}>Producto</TableHead>
                  <TableHead className="w-28" style={{ color: COLOR_SAGE }}>Cant. Pedida</TableHead>
                  <TableHead className="w-44" style={{ color: COLOR_SAGE }}>Precio Unitario</TableHead>
                  <TableHead className="w-28" style={{ color: COLOR_SAGE }}>Bonif. Esperada</TableHead>
                  <TableHead style={{ color: COLOR_SAGE }}>Promoción</TableHead>
                  <TableHead className="w-16"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {nuevoPedidoLineas.map((linea, idx) => (
                  <TableRow key={idx} className="hover:bg-transparent">
                    <TableCell>
                      <Input
                        value={linea.producto}
                        onChange={(e) => updateLinea(idx, "producto", e.target.value)}
                        placeholder="Paracetamol 500mg"
                        className="bg-[#faf9f7] border-[#e5e1d8]"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min={1}
                        value={linea.cantidad_pedida}
                        onChange={(e) => updateLinea(idx, "cantidad_pedida", parseInt(e.target.value) || 0)}
                        className="bg-[#faf9f7] border-[#e5e1d8]"
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex rounded-md overflow-hidden border border-[#e5e1d8]">
                        <div className="px-3 py-2 bg-[#f0ece3] border-r border-[#e5e1d8] text-sm text-[#7a7569] flex items-center">
                          S/
                        </div>
                        <Input
                          type="number"
                          step="0.01"
                          min={0}
                          value={linea.precio_unitario}
                          onChange={(e) => updateLinea(idx, "precio_unitario", parseFloat(e.target.value) || 0)}
                          className="border-0 rounded-none focus-visible:ring-0 bg-[#faf9f7]"
                        />
                      </div>
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min={0}
                        value={linea.cantidad_bonificada}
                        onChange={(e) => updateLinea(idx, "cantidad_bonificada", parseInt(e.target.value) || 0)}
                        className="bg-[#faf9f7] border-[#e5e1d8]"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        value={linea.descripcion_promocion}
                        onChange={(e) => updateLinea(idx, "descripcion_promocion", e.target.value)}
                        placeholder="Oferta 6x5"
                        className="bg-[#faf9f7] border-[#e5e1d8]"
                      />
                    </TableCell>
                    <TableCell>
                      <Button size="icon" variant="ghost" onClick={() => removeLinea(idx)} style={{ color: "#DC2626" }}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <Button
              variant="outline"
              onClick={addLinea}
              style={{ color: COLOR_SAGE, borderColor: COLOR_SAGE }}
            >
              <Plus className="h-4 w-4 mr-2" />
              Agregar Línea
            </Button>
            <p className="text-xl font-bold" style={{ color: COLOR_SAGE }}>
              S/ {totalNuevoPedido.toFixed(2)}
            </p>
          </div>

          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => setView("pedidos")}>
              Cancelar
            </Button>
            <Button
              onClick={handleSavePedido}
              disabled={saving}
              style={{ backgroundColor: COLOR_SAGE, color: "white", border: "none" }}
            >
              {saving ? "Guardando..." : "Guardar Pedido"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderDetallePedidoView = () => {
    if (!selectedPedido) return null;
    const detalle = selectedPedido.detalle || [];

    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" onClick={() => setView("pedidos")} style={{ color: COLOR_SAGE }}>
            <ArrowLeft className="h-4 w-4 mr-1" />
            Volver a Pedidos
          </Button>
        </div>

        <Card style={{ borderTop: `4px solid ${COLOR_GOLD}` }}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle style={{ color: COLOR_GOLD }}>Pedido #{selectedPedido.id_pedido}</CardTitle>
              {renderEstadoBadge(selectedPedido.estado_general)}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <p className="text-xs text-muted-foreground">Proveedor</p>
                <p className="font-medium">
                  {selectedPedido.proveedor || getNombreProveedor(selectedPedido.id_proveedor)}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Fecha de Pedido</p>
                <p className="font-medium">{formatDateDisplay(selectedPedido.fecha_pedido)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Fecha Entrega Estimada</p>
                <p className="font-medium">{formatDateOnlyDisplay(selectedPedido.fecha_entrega_estimada)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Pedido</p>
                <p className="font-medium text-xl" style={{ color: COLOR_SAGE }}>
                  S/ {Number(selectedPedido.total_pedido).toFixed(2)}
                </p>
              </div>
            </div>
            {selectedPedido.observaciones && (
              <div>
                <p className="text-xs text-muted-foreground">Observaciones</p>
                <p>{selectedPedido.observaciones}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle style={{ color: COLOR_SAGE }}>Líneas del Pedido</CardTitle>
          </CardHeader>
          <CardContent>
            {loadingDetalle ? (
              <p className="text-muted-foreground">Cargando detalle...</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Producto</TableHead>
                      <TableHead>Cant. Pedida</TableHead>
                      <TableHead>Precio Unit.</TableHead>
                      <TableHead>Bonif. Esperada</TableHead>
                      <TableHead>Promoción</TableHead>
                      <TableHead>Recibido</TableHead>
                      <TableHead>Cant. Recibida</TableHead>
                      <TableHead>Bonif. Recibida</TableHead>
                      <TableHead>Observaciones</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {detalle.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={11} className="text-center text-muted-foreground">
                          No se pudieron cargar las líneas del pedido.
                        </TableCell>
                      </TableRow>
                    ) : (
                      detalle.map((linea) => {
                        const id = linea.id_pedido_detalle!;
                        const state = recepcionStates[id] || {
                          recibido: linea.estado === "ENTREGADO",
                          cantidad_recibida: linea.cantidad_recibida ?? linea.cantidad_pedida,
                          cantidad_bonificada_recibida: linea.cantidad_bonificada_recibida ?? linea.cantidad_bonificada,
                          observaciones: linea.observaciones ?? "",
                        };
                        const entregado = linea.estado === "ENTREGADO";

                        return (
                          <TableRow key={id}>
                            <TableCell className="font-medium">{linea.producto}</TableCell>
                            <TableCell>{linea.cantidad_pedida}</TableCell>
                            <TableCell>S/ {Number(linea.precio_unitario).toFixed(2)}</TableCell>
                            <TableCell>{linea.cantidad_bonificada}</TableCell>
                            <TableCell>{linea.descripcion_promocion || "—"}</TableCell>
                            <TableCell>
                              <Checkbox
                                checked={state.recibido}
                                disabled={entregado || receiving === id}
                                onCheckedChange={(checked) => toggleRecibido(linea, checked as boolean)}
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                min={0}
                                disabled={entregado || receiving === id}
                                value={state.cantidad_recibida}
                                onChange={(e) => updateRecepcionField(id, "cantidad_recibida", parseInt(e.target.value) || 0)}
                                className="w-24"
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                min={0}
                                disabled={entregado || receiving === id}
                                value={state.cantidad_bonificada_recibida}
                                onChange={(e) => updateRecepcionField(id, "cantidad_bonificada_recibida", parseInt(e.target.value) || 0)}
                                className="w-24"
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                disabled={entregado || receiving === id}
                                value={state.observaciones}
                                onChange={(e) => updateRecepcionField(id, "observaciones", e.target.value)}
                                placeholder="Observación de recepción"
                                className="w-40"
                              />
                            </TableCell>
                            <TableCell>{renderEstadoLineaBadge(linea.estado, linea.tiene_discrepancia)}</TableCell>
                            <TableCell>
                              {!entregado && (
                                <div className="flex items-center gap-2">
                                  <Button
                                    size="sm"
                                    onClick={() => handleRecepcionar(linea)}
                                    disabled={receiving === id}
                                    style={{ backgroundColor: COLOR_SAGE, color: "white", border: "none" }}
                                  >
                                    {receiving === id ? "Guardando..." : "Confirmar"}
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleRechazar(linea)}
                                    disabled={receiving === id}
                                    style={{ color: "#DC2626", borderColor: "#DC2626" }}
                                  >
                                    Rechazar
                                  </Button>
                                </div>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  };

  const renderDiscrepanciasView = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 style={{ color: COLOR_GOLD }}>Reporte de Discrepancias</h2>
          <p className="text-muted-foreground">Diferencias entre lo pedido y lo recibido</p>
        </div>
        <Button variant="outline" onClick={() => setView("pedidos")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Volver a Pedidos
        </Button>
      </div>

      <Card style={{ borderTop: `4px solid ${COLOR_GOLD}` }}>
        <CardHeader>
          <CardTitle style={{ color: COLOR_GOLD }}>Discrepancias de Recepción</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-3 items-end">
            <div className="w-full md:w-56">
              <Label className="text-xs">Proveedor</Label>
              <Select value={discrepanciaFilterProveedor} onValueChange={setDiscrepanciaFilterProveedor}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los proveedores</SelectItem>
                  {proveedores.map((p) => (
                    <SelectItem key={p.id_proveedor} value={String(p.id_proveedor)}>
                      {p.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Desde</Label>
              <Input type="date" value={discrepanciaFilterDesde} onChange={(e) => setDiscrepanciaFilterDesde(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">Hasta</Label>
              <Input type="date" value={discrepanciaFilterHasta} onChange={(e) => setDiscrepanciaFilterHasta(e.target.value)} />
            </div>
            <div className="flex items-end gap-2">
              <Button
                onClick={fetchDiscrepancias}
                variant="outline"
                style={{ color: COLOR_SAGE, borderColor: COLOR_SAGE }}
              >
                <Search className="h-4 w-4 mr-2" />
                Buscar
              </Button>
              <Button
                onClick={limpiarFiltrosDiscrepancias}
                variant="ghost"
                style={{ color: COLOR_GOLD }}
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Limpiar
              </Button>
            </div>
          </div>

          {loadingDiscrepancias ? (
            <p className="text-muted-foreground">Cargando discrepancias...</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Pedido</TableHead>
                  <TableHead>Proveedor</TableHead>
                  <TableHead>Producto</TableHead>
                  <TableHead>Cant. Pedida</TableHead>
                  <TableHead>Cant. Recibida</TableHead>
                  <TableHead>Bonif. Pedida</TableHead>
                  <TableHead>Bonif. Recibida</TableHead>
                  <TableHead>Observaciones</TableHead>
                  <TableHead>Fecha Recepción</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {discrepancias.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center text-muted-foreground">
                      No se encontraron discrepancias.
                    </TableCell>
                  </TableRow>
                ) : (
                  discrepancias.map((d, idx) => (
                    <TableRow key={idx}>
                      <TableCell>{d.id_pedido}</TableCell>
                      <TableCell>{d.proveedor}</TableCell>
                      <TableCell className="font-medium">{d.producto}</TableCell>
                      <TableCell>{d.cantidad_pedida}</TableCell>
                      <TableCell>{d.cantidad_recibida}</TableCell>
                      <TableCell>{d.cantidad_bonificada}</TableCell>
                      <TableCell>{d.cantidad_bonificada_recibida}</TableCell>
                      <TableCell>{d.observaciones || "—"}</TableCell>
                      <TableCell>{formatDateDisplay(d.fecha_recepcion)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );

  const renderResumen = () => (
    <div className={`grid grid-cols-1 sm:grid-cols-2 ${isAdmin ? 'lg:grid-cols-4' : 'lg:grid-cols-2'} gap-4 mb-6`}>
      {isAdmin && (
        <Card style={{ borderTop: `4px solid ${COLOR_GOLD}` }}>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg" style={{ backgroundColor: "rgba(213, 184, 136, 0.15)" }}>
                <Building2 className="h-6 w-6" style={{ color: COLOR_GOLD }} />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Proveedores</p>
                <p className="text-2xl font-bold" style={{ color: COLOR_GOLD }}>{resumen.proveedores}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card style={{ borderTop: `4px solid ${COLOR_SAGE}` }}>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-lg" style={{ backgroundColor: "rgba(154, 173, 151, 0.15)" }}>
              <ClipboardList className="h-6 w-6" style={{ color: COLOR_SAGE }} />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Pedidos Totales</p>
              <p className="text-2xl font-bold" style={{ color: COLOR_SAGE }}>{resumen.pedidos}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card style={{ borderTop: "4px solid #F59E0B" }}>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-lg" style={{ backgroundColor: "rgba(245, 158, 11, 0.15)" }}>
              <Clock className="h-6 w-6" style={{ color: "#F59E0B" }} />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Pedidos Pendientes</p>
              <p className="text-2xl font-bold" style={{ color: "#F59E0B" }}>{resumen.pedidosPendientes}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {isAdmin && (
        <Card style={{ borderTop: "4px solid #DC2626" }}>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg" style={{ backgroundColor: "rgba(220, 38, 38, 0.1)" }}>
                <AlertOctagon className="h-6 w-6" style={{ color: "#DC2626" }} />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Discrepancias</p>
                <p className="text-2xl font-bold" style={{ color: "#DC2626" }}>{resumen.discrepancias}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 style={{ color: COLOR_GOLD }}>Proveedores y Pedidos</h1>
          <p className="text-muted-foreground">Gestión de proveedores, pedidos y recepciones</p>
        </div>
      </div>

      {renderResumen()}
      {renderNavigation()}

      {error && (
        <div className="mb-4 p-4 rounded-lg border flex items-start gap-3" style={{ backgroundColor: "#FEF2F2", borderColor: "#FECACA" }}>
          <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-medium text-red-800">Ha ocurrido un error</p>
            <p className="text-sm text-red-700">{error}</p>
          </div>
          <Button size="icon" variant="ghost" onClick={() => setError(null)}>
            <X className="h-4 w-4 text-red-600" />
          </Button>
        </div>
      )}

      {view === "proveedores" && renderProveedoresView()}
      {view === "pedidos" && renderPedidosView()}
      {view === "nuevo-pedido" && renderNuevoPedidoView()}
      {view === "detalle-pedido" && renderDetallePedidoView()}
      {view === "discrepancias" && renderDiscrepanciasView()}
    </div>
  );
}
