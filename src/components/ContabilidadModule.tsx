import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { TrendingUp, TrendingDown, DollarSign, Plus, RefreshCw } from "lucide-react";
import { Button } from "./ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "./ui/dialog";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Textarea } from "./ui/textarea";

const API_BASE = 'http://localhost:9000';

interface CuentaContable {
  id_cuenta: number;
  codigo: string;
  nombre: string;
  tipo: 'INGRESO' | 'EGRESO' | 'ACTIVO';
  saldo: number;
  es_totalizadora: number;
  cuenta_padre_id: number | null;
  cuenta_padre: string | null;
}

interface MovimientoContable {
  id_movimiento?: number;
  id_cuenta: number;
  cuenta?: string;
  codigo_cuenta?: string;
  nombre_cuenta?: string;
  monto: number;
  tipo: 'INGRESO' | 'EGRESO';
  concepto: string;
  usuario: string;
  fecha_hora?: string;
  origen?: string;
}

interface ContabilidadModuleProps {
  currentUser: {
    username: string;
    role: string;
    name: string;
  };
}

export function ContabilidadModule({ currentUser }: ContabilidadModuleProps) {
  const [cuentas, setCuentas] = useState<CuentaContable[]>([]);
  const [movimientos, setMovimientos] = useState<MovimientoContable[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showRegisterDialog, setShowRegisterDialog] = useState(false);
  const [registerLoading, setRegisterLoading] = useState(false);

  const [newMovement, setNewMovement] = useState({
    id_cuenta: '',
    tipo: '',
    monto: '',
    concepto: ''
  });

  const fetchCuentas = async (): Promise<string | null> => {
    try {
      const resp = await fetch(`${API_BASE}/cuentas-contables`);
      if (!resp.ok) throw new Error(`Error ${resp.status}: ${await resp.text()}`);
      const data = await resp.json();
      const normalized = Array.isArray(data)
        ? data.map((c: any) => ({ ...c, saldo: Number(c.saldo ?? 0) }))
        : [];
      setCuentas(normalized);
      return null;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error cargando cuentas';
      console.error('Error cargando cuentas:', err);
      setCuentas([]);
      return msg;
    }
  };

  const fetchMovimientos = async (): Promise<string | null> => {
    try {
      const resp = await fetch(`${API_BASE}/movimientos-contables`);
      if (!resp.ok) throw new Error(`Error ${resp.status}: ${await resp.text()}`);
      const data = await resp.json();
      const normalized = Array.isArray(data)
        ? data.map((m: any) => ({ ...m, monto: Number(m.monto ?? 0) }))
        : [];
      setMovimientos(normalized);
      return null;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error cargando movimientos';
      console.error('Error cargando movimientos:', err);
      setMovimientos([]);
      return msg;
    }
  };

  const loadAll = async () => {
    setLoading(true);
    setError(null);
    const [errCuentas, errMovimientos] = await Promise.all([fetchCuentas(), fetchMovimientos()]);
    if (errCuentas || errMovimientos) {
      setError([errCuentas, errMovimientos].filter(Boolean).join(' | '));
    }
    setLoading(false);
  };

  useEffect(() => {
    loadAll();
  }, []);

  const cuentaIngresos = cuentas.find(c => c.codigo === '10');
  const cuentaEgresos = cuentas.find(c => c.codigo === '50');
  const saldoIngresos = cuentaIngresos?.saldo ?? 0;
  const saldoEgresos = Math.abs(cuentaEgresos?.saldo ?? 0);
  const balance = saldoIngresos - saldoEgresos;

  const handleRegisterMovement = async () => {
    if (!newMovement.id_cuenta || !newMovement.tipo || !newMovement.monto || !newMovement.concepto) {
      alert('Por favor complete todos los campos obligatorios');
      return;
    }

    const monto = parseFloat(newMovement.monto);
    if (isNaN(monto) || monto <= 0) {
      alert('Ingrese un monto válido mayor a 0');
      return;
    }

    setRegisterLoading(true);
    try {
      const resp = await fetch(`${API_BASE}/movimientos-contables`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id_cuenta: Number(newMovement.id_cuenta),
          monto,
          tipo: newMovement.tipo,
          concepto: newMovement.concepto,
          usuario: currentUser.name
        })
      });

      if (!resp.ok) {
        const txt = await resp.text();
        throw new Error(txt || 'Error al registrar movimiento');
      }

      await loadAll();
      setNewMovement({ id_cuenta: '', tipo: '', monto: '', concepto: '' });
      setShowRegisterDialog(false);
      alert('Movimiento registrado correctamente');
    } catch (err) {
      console.error('Error registrando movimiento:', err);
      alert('Error al registrar el movimiento: ' + (err instanceof Error ? err.message : 'Error desconocido'));
    } finally {
      setRegisterLoading(false);
    }
  };

  const formatFecha = (raw: string | undefined) => {
    if (!raw) return '-';
    const date = new Date(raw);
    return isNaN(date.getTime()) ? String(raw) : `${date.toLocaleDateString('es-PE')} ${date.toLocaleTimeString('es-PE')}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 style={{ color: '#9AAD97' }}>Módulo de Contabilidad</h2>
          <p className="text-muted-foreground">Gestión de cuentas contables y movimientos</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={loadAll}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Actualizar
          </Button>
          <Button
            style={{ backgroundColor: '#9AAD97', color: 'white', border: 'none' }}
            onClick={() => setShowRegisterDialog(true)}
          >
            <Plus className="h-4 w-4 mr-2" />
            Registrar Movimiento
          </Button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
          <p className="font-medium">Error al cargar datos</p>
          <p>{error}</p>
        </div>
      )}

      {/* Resumen superior */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card style={{ borderTop: '4px solid #9AAD97' }}>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg" style={{ backgroundColor: 'rgba(154, 173, 151, 0.1)' }}>
                <TrendingUp className="h-6 w-6" style={{ color: '#9AAD97' }} />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Cuenta 10 - Ingresos</p>
                <p className="text-2xl" style={{ color: '#9AAD97', fontWeight: 'bold' }}>S/ {saldoIngresos.toFixed(2)}</p>
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
                <p className="text-sm text-muted-foreground">Cuenta 50 - Egresos</p>
                <p className="text-2xl" style={{ color: '#D5B888', fontWeight: 'bold' }}>S/ {saldoEgresos.toFixed(2)}</p>
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
                <p className="text-2xl" style={{ color: balance >= 0 ? '#9AAD97' : '#D5B888', fontWeight: 'bold' }}>
                  S/ {balance.toFixed(2)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Listado de cuentas */}
      <Card>
        <CardHeader>
          <CardTitle>Cuentas Contables</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Código</TableHead>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Cuenta Padre</TableHead>
                  <TableHead className="text-right">Saldo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cuentas.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-4 text-muted-foreground">
                      No hay cuentas registradas
                    </TableCell>
                  </TableRow>
                ) : (
                  cuentas.map((cuenta) => (
                    <TableRow key={cuenta.id_cuenta} className={cuenta.es_totalizadora ? 'bg-muted/50' : ''}>
                      <TableCell className="font-medium">{cuenta.codigo}</TableCell>
                      <TableCell>{cuenta.nombre}</TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          cuenta.tipo === 'INGRESO' ? 'bg-green-100 text-green-700' : 
                          cuenta.tipo === 'EGRESO' ? 'bg-red-100 text-red-700' : 
                          'bg-blue-100 text-blue-700'
                        }`}>
                          {cuenta.tipo}
                        </span>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{cuenta.cuenta_padre || '-'}</TableCell>
                      <TableCell className="text-right font-semibold">S/ {Number(cuenta.saldo ?? 0).toFixed(2)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Listado de movimientos */}
      <Card>
        <CardHeader>
          <CardTitle>Movimientos Contables</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha y Hora</TableHead>
                  <TableHead>Cuenta</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Concepto</TableHead>
                  <TableHead>Usuario</TableHead>
                  <TableHead>Origen</TableHead>
                  <TableHead className="text-right">Monto</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {movimientos.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-4 text-muted-foreground">
                      No hay movimientos registrados
                    </TableCell>
                  </TableRow>
                ) : (
                  movimientos.map((mov, idx) => (
                    <TableRow key={mov.id_movimiento ?? idx}>
                      <TableCell className="whitespace-nowrap">{formatFecha(mov.fecha_hora)}</TableCell>
                      <TableCell>
                        {mov.codigo_cuenta || mov.nombre_cuenta ? (
                          <div>
                            <span className="font-medium">{mov.codigo_cuenta || '-'}</span>
                            {mov.nombre_cuenta && <span className="text-muted-foreground ml-1">- {mov.nombre_cuenta}</span>}
                          </div>
                        ) : (
                          mov.cuenta || '-'
                        )}
                      </TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          mov.tipo === 'INGRESO' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                        }`}>
                          {mov.tipo}
                        </span>
                      </TableCell>
                      <TableCell>{mov.concepto}</TableCell>
                      <TableCell>{mov.usuario}</TableCell>
                      <TableCell className="text-muted-foreground text-xs">{mov.origen || 'MANUAL'}</TableCell>
                      <TableCell className={`text-right font-semibold ${
                        mov.tipo === 'INGRESO' ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {mov.tipo === 'INGRESO' ? '+' : '-'} S/ {Math.abs(Number(mov.monto ?? 0)).toFixed(2)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Diálogo para registrar movimiento */}
      <Dialog open={showRegisterDialog} onOpenChange={setShowRegisterDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar Movimiento Contable</DialogTitle>
            <DialogDescription>
              Registre un ingreso o egreso en la cuenta contable correspondiente.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <Label>Cuenta Contable *</Label>
              <Select
                value={newMovement.id_cuenta}
                onValueChange={(value) => setNewMovement({ ...newMovement, id_cuenta: value })}
              >
                <SelectTrigger className="w-full mt-2">
                  <SelectValue placeholder="Seleccionar cuenta" />
                </SelectTrigger>
                <SelectContent>
                  {cuentas
                    .filter(c => !c.es_totalizadora)
                    .map((cuenta) => (
                      <SelectItem key={cuenta.id_cuenta} value={String(cuenta.id_cuenta)}>
                        {cuenta.codigo} - {cuenta.nombre}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Tipo de Movimiento *</Label>
              <Select
                value={newMovement.tipo}
                onValueChange={(value: 'INGRESO' | 'EGRESO') => setNewMovement({ ...newMovement, tipo: value })}
              >
                <SelectTrigger className="w-full mt-2">
                  <SelectValue placeholder="Seleccionar tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="INGRESO">Ingreso</SelectItem>
                  <SelectItem value="EGRESO">Egreso</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Monto *</Label>
              <div className="relative mt-2">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">S/</span>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={newMovement.monto}
                  onChange={(e) => setNewMovement({ ...newMovement, monto: e.target.value })}
                  className="pl-10"
                />
              </div>
            </div>
            <div>
              <Label>Concepto *</Label>
              <Textarea
                placeholder="Ej: Pago de servicios, venta adicional, etc."
                value={newMovement.concepto}
                onChange={(e) => setNewMovement({ ...newMovement, concepto: e.target.value })}
                rows={3}
              />
            </div>
            <Button
              className="w-full"
              style={{ backgroundColor: '#9AAD97', color: 'white', border: 'none' }}
              onClick={handleRegisterMovement}
              disabled={registerLoading}
            >
              {registerLoading ? 'Guardando...' : 'Registrar Movimiento'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
