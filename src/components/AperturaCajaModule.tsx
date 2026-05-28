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
  observaciones: string;
  estado: string;
}

export function AperturaCajaModule({ currentUser }: AperturaCajaModuleProps) {
  const [montoInicial, setMontoInicial] = useState("");
  const [observaciones, setObservaciones] = useState("");
  const [cajaAbierta, setCajaAbierta] = useState(false);
  const [datosApertura, setDatosApertura] = useState<Apertura | null>(null);
  const [aperturas, setAperturas] = useState<Apertura[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Función para obtener aperturas desde la API
  const fetchAperturas = async () => {
    try {
      const response = await fetch('http://localhost:9000/aperturas');
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
    if (montoInicial === "" || parseFloat(montoInicial) < 0) {
      alert("Por favor ingrese un monto válido");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Verificar si ya existe una caja abierta
      const aperturaResponse = await fetch('http://localhost:9000/aperturas');
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

      const response = await fetch('http://localhost:9000/apertura-turno', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          usuario: currentUser.name,
          montoInicial: parseFloat(montoInicial),
          observaciones,
        }),
      });

      if (!response.ok) throw new Error('Error al aperturar la caja');

      // Refetch aperturas después de la apertura
      await fetchAperturas();
      setMontoInicial("");
      setObservaciones("");
      alert(`Caja abierta exitosamente\nMonto inicial: S/ ${parseFloat(montoInicial).toFixed(2)}\nRegistrado en la base de datos`);
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
                <div>
                  <Label>Monto Inicial en Caja *</Label>
                  <div className="relative mt-2">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                      S/
                    </span>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={montoInicial}
                      onChange={(e) => setMontoInicial(e.target.value)}
                      className="pl-10 text-lg"
                    />
                  </div>
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
                        <span className="text-muted-foreground">Monto Inicial:</span>
                        <span className="ml-2 text-lg">S/ {parseFloat(datosApertura.montoInicial).toFixed(2)}</span>
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
                    setMontoInicial("");
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
              <div className="overflow-x-auto max-h-16 overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nro Caja</TableHead>
                      <TableHead>Fecha y Hora</TableHead>
                      <TableHead>Usuario</TableHead>
                      <TableHead>Monto Inicial</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Observaciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {aperturas.slice().reverse().map((apertura) => (
                      <TableRow key={apertura.id}>
                        <TableCell className="font-bold" style={{ color: '#9AAD97' }}>{apertura.id}</TableCell>
                        <TableCell className="text-sm">{apertura.fecha}</TableCell>
                        <TableCell>{apertura.usuario}</TableCell>
                        <TableCell>S/ {parseFloat(apertura.montoInicial).toFixed(2)}</TableCell>
                        <TableCell>
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
                        </TableCell>
                        <TableCell className="text-sm">{apertura.observaciones || '-'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No hay aperturas registradas</p>
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
