import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { Label } from "./ui/label";
import { DollarSign, CheckCircle, Clock } from "lucide-react";
import { Textarea } from "./ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";

interface AperturaCajaModuleProps {
  currentUser: {
    username: string;
    role: string;
    name: string;
  };
}

interface Apertura {
  id: number;
  fecha: string;
  usuario: string;
  montoInicial: string;
  montoInicialYape?: string;
  monto_inicial_yape?: string;
  observaciones: string;
  estado: string;
  cuenta_efectivo?: number;
  cuenta_yape?: number;
}

export function AperturaCajaModule({ currentUser }: AperturaCajaModuleProps) {
  const [montoInicialEfectivo, setMontoInicialEfectivo] = useState("");
  const [montoInicialYape, setMontoInicialYape] = useState("");
  const [observaciones, setObservaciones] = useState("");
  const [cajaAbierta, setCajaAbierta] = useState(false);
  const [datosApertura, setDatosApertura] = useState<Apertura | null>(null);
  const [aperturas, setAperturas] = useState<Apertura[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const API_BASE = 'https://node-js-consalud-production.up.railway.app';
  const CUENTA_EFECTIVO_GENERAL_ID = 10;
  const CUENTA_YAPE_GENERAL_ID = 11;

  const registrarMovimientoContable = async (payload: {
    id_cuenta: number;
    id_apertura?: number | null;
    monto: number;
    tipo: 'INGRESO' | 'EGRESO';
    concepto: string;
    usuario: string;
  }) => {
    const response = await fetch(`${API_BASE}/movimientos-contables`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const text = await response.text();
      console.error('Error registrando movimiento contable:', text);
      throw new Error(text || 'Error registrando movimiento contable');
    }

    return response.json();
  };

  // Función para obtener aperturas desde la API
  const fetchAperturas = async () => {
    try {
      const response = await fetch('https://node-js-consalud-production.up.railway.app/aperturas');
      if (!response.ok) throw new Error('Error al obtener aperturas');
      const data = await response.json();
      
      // Formatear fechas
      const aperturaFormateada = data.map((apertura: any) => {
        const rawFecha = apertura.fecha || apertura.fecha_hora || new Date().toISOString();
        const parsedDate = new Date(rawFecha);
        let fecha = String(rawFecha);
        
        if (!isNaN(parsedDate.getTime())) {
          const dateStr = parsedDate.toLocaleDateString('es-PE');
          const timeStr = parsedDate.toLocaleTimeString('es-PE');
          fecha = `${dateStr}, ${timeStr}`;
        }
        
        return { ...apertura, fecha };
      });
      
      setAperturas(aperturaFormateada);

      // Verificar si hay una apertura abierta hoy
      const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
      const aperturaHoy = aperturaFormateada.find((apertura: any) => {
        const rawFecha = apertura.fecha || new Date().toISOString();
        const parsedDate = new Date(rawFecha);
        if (!isNaN(parsedDate.getTime())) {
          const formattedToday = parsedDate.toISOString().split('T')[0];
          return apertura.estado === 'abierto' && formattedToday === today;
        }
        return false;
      });
      
      if (aperturaHoy) {
        setDatosApertura(aperturaHoy);
        setCajaAbierta(true);
      } else {
        setCajaAbierta(false);
        setDatosApertura(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    }
  };

  // Cargar aperturas al montar
  useEffect(() => {
    fetchAperturas();
  }, []);

  const handleAperturaCaja = async () => {
    const efectivo = parseFloat(montoInicialEfectivo) || 0;
    const yape = parseFloat(montoInicialYape) || 0;
    const montoInicialTotal = efectivo + yape;

    if (montoInicialTotal < 0) {
      alert("Por favor ingrese montos válidos");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Verificar si ya existe una caja abierta
      const aperturaResponse = await fetch('https://node-js-consalud-production.up.railway.app/aperturas');
      if (aperturaResponse.ok) {
        const aperturas = await aperturaResponse.json();
        const cajaAbiertaExistente = aperturas.find((apertura: any) => apertura.estado === 'abierto');
        
        if (cajaAbiertaExistente) {
          setError('Ya existe una caja abierta. Por favor, cierre la caja anterior antes de abrir una nueva.');
          setLoading(false);
          alert('❌ Error: Ya existe una caja abierta\n\nDebe cerrar la caja actual (Cierre de Caja) antes de abrir una nueva.');
          return;
        }
      }

      const response = await fetch(`${API_BASE}/apertura-turno`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          usuario: currentUser.name,
          montoInicial: efectivo,
          montoInicialYape: yape,
          cuenta_efectivo: efectivo,
          cuenta_yape: yape,
          observaciones,
        }),
      });

      if (!response.ok) throw new Error('Error al aperturar la caja');

      const aperturaCreada = await response.json();
      const idApertura = aperturaCreada?.id ?? aperturaCreada?.id_apertura ?? null;
      console.log('Apertura creada:', aperturaCreada, 'ID capturado:', idApertura);

      // Refetch aperturas después de la apertura
      await fetchAperturas();

      // Registrar movimientos contables: salida de dinero de las cuentas generales
      const movimientosApertura = [
        {
          id_cuenta: CUENTA_EFECTIVO_GENERAL_ID,
          id_apertura: idApertura,
          monto: efectivo,
          tipo: 'EGRESO' as const,
          concepto: 'apertura de caja',
          usuario: currentUser.name,
        },
        {
          id_cuenta: CUENTA_YAPE_GENERAL_ID,
          id_apertura: idApertura,
          monto: yape,
          tipo: 'EGRESO' as const,
          concepto: 'apertura de caja',
          usuario: currentUser.name,
        },
      ].filter(m => m.monto > 0);

      console.log('Movimientos contables de apertura a enviar:', movimientosApertura);

      if (movimientosApertura.length > 0) {
        try {
          const resultados = await Promise.all(movimientosApertura.map(registrarMovimientoContable));
          console.log('Movimientos contables de apertura registrados:', resultados);
        } catch (movimientoError) {
          console.error('Error registrando movimientos contables de apertura:', movimientoError);
          alert(`Advertencia: La caja se aperturó correctamente, pero no se pudieron registrar los movimientos contables asociados.\n\nError: ${movimientoError instanceof Error ? movimientoError.message : 'Error desconocido'}`);
        }
      }
      setMontoInicialEfectivo("");
      setMontoInicialYape("");
      setObservaciones("");
      alert(`Caja abierta exitosamente\nMonto inicial total: S/ ${montoInicialTotal.toFixed(2)}\nEfectivo: S/ ${efectivo.toFixed(2)}\nYape: S/ ${yape.toFixed(2)}\nRegistrado en la base de datos`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 style={{ color: '#9AAD97' }}>Apertura de Caja</h2>
        <p className="text-muted-foreground">Registre el monto inicial para comenzar el día</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card style={{ borderTop: '4px solid #D5B888' }}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2" style={{ color: '#D5B888' }}>
              <DollarSign className="h-5 w-5" />
              Apertura de Caja
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {!cajaAbierta ? (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Monto Inicial Efectivo *</Label>
                    <div className="relative mt-2">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                        S/
                      </span>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        value={montoInicialEfectivo}
                        onChange={(e) => setMontoInicialEfectivo(e.target.value)}
                        className="pl-10 text-lg"
                      />
                    </div>
                  </div>
                  <div>
                    <Label>Monto Inicial Yape *</Label>
                    <div className="relative mt-2">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                        S/
                      </span>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        value={montoInicialYape}
                        onChange={(e) => setMontoInicialYape(e.target.value)}
                        className="pl-10 text-lg"
                      />
                    </div>
                  </div>
                </div>
                <div className="p-3 rounded-lg" style={{ backgroundColor: 'rgba(154, 173, 151, 0.1)' }}>
                  <p className="text-sm text-muted-foreground">Monto Inicial Total</p>
                  <p className="text-xl" style={{ color: '#9AAD97', fontWeight: 'bold' }}>
                    S/ {((parseFloat(montoInicialEfectivo) || 0) + (parseFloat(montoInicialYape) || 0)).toFixed(2)}
                  </p>
                </div>

                <div>
                  <Label>Observaciones (opcional)</Label>
                  <Textarea
                    placeholder="Notas sobre la apertura de caja..."
                    value={observaciones}
                    onChange={(e) => setObservaciones(e.target.value)}
                    rows={3}
                  />
                </div>

                <Button
                  className="w-full"
                  style={{ backgroundColor: '#9AAD97', color: 'white', border: 'none' }}
                  onClick={handleAperturaCaja}
                  disabled={loading}
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  {loading ? 'Abriendo...' : 'Abrir Caja'}
                </Button>

                {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
              </>
            ) : (
              <div className="space-y-4">
                {datosApertura && (
                  <div style={{ padding: '1rem', backgroundColor: 'rgba(154, 173, 151, 0.1)', border: '2px solid #9AAD97', borderRadius: '0.5rem' }}>
                    <div className="flex items-center gap-2 mb-3">
                      <CheckCircle className="h-5 w-5" style={{ color: '#9AAD97' }} />
                      <span style={{ color: '#9AAD97', fontWeight: 'bold' }}>Caja Abierta</span>
                    </div>
                    <div className="space-y-2">
                      <p className="text-sm">
                        <span className="text-muted-foreground">Monto Inicial Efectivo:</span>
                        <span className="ml-2 text-lg">S/ {parseFloat(datosApertura.montoInicial).toFixed(2)}</span>
                      </p>
                      <p className="text-sm">
                        <span className="text-muted-foreground">Monto Inicial Yape:</span>
                        <span className="ml-2 text-lg" style={{ color: '#D5B888', fontWeight: 'bold' }}>S/ {Number(datosApertura.montoInicialYape ?? datosApertura.monto_inicial_yape ?? 0).toFixed(2)}</span>
                      </p>
                      <p className="text-sm">
                        <span className="text-muted-foreground">Cuenta Efectivo:</span>
                        <span className="ml-2 text-lg" style={{ color: '#9AAD97', fontWeight: 'bold' }}>S/ {Number(datosApertura.cuenta_efectivo ?? 0).toFixed(2)}</span>
                      </p>
                      <p className="text-sm">
                        <span className="text-muted-foreground">Cuenta Yape:</span>
                        <span className="ml-2 text-lg" style={{ color: '#D5B888', fontWeight: 'bold' }}>S/ {Number(datosApertura.cuenta_yape ?? 0).toFixed(2)}</span>
                      </p>
                      <p className="text-sm">
                        <span className="text-muted-foreground">Fecha y Hora:</span>
                        <span className="ml-2">{datosApertura.fecha}</span>
                      </p>
                      <p className="text-sm">
                        <span className="text-muted-foreground">Usuario:</span>
                        <span className="ml-2">{datosApertura.usuario}</span>
                      </p>
                      {datosApertura.observaciones && (
                        <p className="text-sm">
                          <span className="text-muted-foreground">Observaciones:</span>
                          <span className="ml-2">{datosApertura.observaciones}</span>
                        </p>
                      )}
                    </div>
                  </div>
                )}

                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    // Nota: Esta acción solo resetea el estado local. Para cerrar la caja en la base de datos,
                    // se requiere una API adicional que no está implementada aún.
                    alert("Nota: Esta acción solo resetea la vista local. Para cerrar la caja en la base de datos, contacte al administrador.");
                    setCajaAbierta(false);
                    setMontoInicialEfectivo("");
                    setMontoInicialYape("");
                    setObservaciones("");
                    setDatosApertura(null);
                  }}
                >
                  Cerrar y Reabrir Caja
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-blue-600" />
              Historial de Aperturas
            </CardTitle>
          </CardHeader>
          <CardContent>
            {aperturas.length > 0 ? (
              <div className="overflow-y-auto" style={{ maxHeight: '300px' }}>
                <table className="w-full text-sm">
                  <thead className="bg-muted sticky top-0">
                    <tr>
                      <th className="px-4 py-2 text-left font-medium">Nro Caja</th>
                      <th className="px-4 py-2 text-left font-medium">Fecha y Hora</th>
                      <th className="px-4 py-2 text-left font-medium">Usuario</th>
                      <th className="px-4 py-2 text-left font-medium">Monto Inicial Efectivo</th>
                      <th className="px-4 py-2 text-left font-medium">Monto Inicial Yape</th>
                      <th className="px-4 py-2 text-left font-medium">Estado</th>
                      <th className="px-4 py-2 text-left font-medium">Observaciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {aperturas.slice().reverse().map((apertura) => (
                      <tr key={apertura.id} className="border-t">
                        <td className="px-4 py-2 font-bold" style={{ color: '#9AAD97' }}>{apertura.id}</td>
                        <td className="px-4 py-2">{apertura.fecha}</td>
                        <td className="px-4 py-2">{apertura.usuario}</td>
                        <td className="px-4 py-2">S/ {parseFloat(apertura.montoInicial).toFixed(2)}</td>
                        <td className="px-4 py-2">S/ {Number(apertura.montoInicialYape ?? apertura.monto_inicial_yape ?? 0).toFixed(2)}</td>
                        <td className="px-4 py-2">
                          <span style={{
                            padding: '0.25rem 0.75rem',
                            backgroundColor: apertura.estado === 'abierto' ? '#fef08a' : '#d1fae5',
                            color: apertura.estado === 'abierto' ? '#92400e' : '#065f46',
                            borderRadius: '0.375rem',
                            fontSize: '0.875rem',
                            fontWeight: '500'
                          }}>
                            {apertura.estado === 'abierto' ? 'Abierto' : 'Cerrado'}
                          </span>
                        </td>
                        <td className="px-4 py-2">{apertura.observaciones || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground p-4">No hay aperturas registradas</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <DollarSign className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h3 className="text-base mb-1">Importante</h3>
              <p className="text-sm text-muted-foreground">
                El monto registrado en la apertura de caja debe coincidir con el efectivo físico disponible al inicio del día. 
                Este monto será la base para el cierre de caja al final del turno.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
