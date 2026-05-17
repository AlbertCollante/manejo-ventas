import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { Search, Plus, Edit, Building2, Phone, Mail, Upload } from "lucide-react";
import { Badge } from "./ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";

export function ProveedoresModule() {
  const [search, setSearch] = useState("");
  const [excelFile, setExcelFile] = useState<File | null>(null);

  const proveedores = [
    {
      id: 1,
      name: "Farmacéutica del Perú S.A.",
      ruc: "20123456789",
      contact: "Juan Martínez",
      phone: "01-234-5678",
      email: "ventas@farmaceutica.com.pe",
      category: "Medicamentos",
      status: "Activo",
      lastOrder: "10/10/2025"
    },
    {
      id: 2,
      name: "Distribuidora Médica Norte",
      ruc: "20987654321",
      contact: "María López",
      phone: "01-876-5432",
      email: "contacto@medicanorte.com",
      category: "Insumos Médicos",
      status: "Activo",
      lastOrder: "08/10/2025"
    },
    {
      id: 3,
      name: "Laboratorios Unidos SAC",
      ruc: "20456789123",
      contact: "Carlos Ruiz",
      phone: "01-345-6789",
      email: "ventas@labunidos.com",
      category: "Medicamentos",
      status: "Activo",
      lastOrder: "12/10/2025"
    },
    {
      id: 4,
      name: "Importadora Salud Global",
      ruc: "20654321987",
      contact: "Ana Fernández",
      phone: "01-567-8901",
      email: "info@saludglobal.com",
      category: "Importados",
      status: "Activo",
      lastOrder: "05/10/2025"
    },
  ];

  const ordenesRecientes = [
    {
      id: "OC-001",
      proveedor: "Farmacéutica del Perú S.A.",
      fecha: "10/10/2025",
      total: 8500.00,
      estado: "Recibida"
    },
    {
      id: "OC-002",
      proveedor: "Laboratorios Unidos SAC",
      fecha: "12/10/2025",
      total: 6200.00,
      estado: "Pendiente"
    },
    {
      id: "OC-003",
      proveedor: "Distribuidora Médica Norte",
      fecha: "08/10/2025",
      total: 3450.00,
      estado: "Recibida"
    },
  ];

  const filteredProveedores = proveedores.filter(p => 
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.ruc.includes(search) ||
    p.contact.toLowerCase().includes(search.toLowerCase())
  );

  const handleExcelUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setExcelFile(file);
      console.log("Archivo Excel seleccionado:", file.name);
      alert(`Archivo "${file.name}" cargado exitosamente.\nEn producción, aquí se procesaría el archivo Excel.`);
      // En producción, aquí se procesaría el archivo Excel con una librería como xlsx
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 style={{ color: '#D5B888' }}>Módulo de Proveedores</h2>
          <p className="text-muted-foreground">Gestión de proveedores y órdenes de compra</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" style={{ color: '#9AAD97', borderColor: '#9AAD97' }}>
            <Plus className="h-4 w-4 mr-2" />
            Nueva Orden
          </Button>
          <Dialog>
            <DialogTrigger asChild>
              <Button style={{ backgroundColor: '#D5B888', color: 'white', border: 'none' }}>
                <Plus className="h-4 w-4 mr-2" />
                Nuevo Proveedor
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Agregar Nuevo Proveedor</DialogTitle>
                <DialogDescription>
                  Registre un nuevo proveedor con su información de contacto.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Nombre o Razón Social</Label>
                  <Input placeholder="Nombre del proveedor" />
                </div>
                <div>
                  <Label>RUC</Label>
                  <Input placeholder="20123456789" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Persona de Contacto</Label>
                    <Input placeholder="Nombre completo" />
                  </div>
                  <div>
                    <Label>Categoría</Label>
                    <Input placeholder="Ej: Medicamentos" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Teléfono</Label>
                    <Input placeholder="01-234-5678" />
                  </div>
                  <div>
                    <Label>Correo Electrónico</Label>
                    <Input type="email" placeholder="contacto@proveedor.com" />
                  </div>
                </div>
                <div>
                  <Label>Dirección</Label>
                  <Textarea placeholder="Dirección completa" />
                </div>
                <Button className="w-full">Guardar Proveedor</Button>
              </div>
            </DialogContent>
          </Dialog>
          <Button variant="outline" onClick={() => document.getElementById('excelUpload')?.click()}>
            <Upload className="h-4 w-4 mr-2" />
            Cargar Excel
          </Button>
          <input
            type="file"
            id="excelUpload"
            accept=".xlsx, .xls"
            className="hidden"
            onChange={handleExcelUpload}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-blue-100">
                <Building2 className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Proveedores Activos</p>
                <p className="text-2xl">{proveedores.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-green-100">
                <Building2 className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Órdenes Pendientes</p>
                <p className="text-2xl">1</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-purple-100">
                <Building2 className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Comprado</p>
                <p className="text-2xl">S/ 18,150</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lista de Proveedores</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar proveedores..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Proveedor</TableHead>
                <TableHead>RUC</TableHead>
                <TableHead>Contacto</TableHead>
                <TableHead>Categoría</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Última Orden</TableHead>
                <TableHead>Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredProveedores.map((proveedor) => (
                <TableRow key={proveedor.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-blue-100">
                        <Building2 className="h-4 w-4 text-blue-600" />
                      </div>
                      <div>
                        <p>{proveedor.name}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                          <Phone className="h-3 w-3" />
                          <span>{proveedor.phone}</span>
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>{proveedor.ruc}</TableCell>
                  <TableCell>
                    <div>
                      <p className="text-sm">{proveedor.contact}</p>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                        <Mail className="h-3 w-3" />
                        <span>{proveedor.email}</span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{proveedor.category}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge className="bg-green-100 text-green-600">{proveedor.status}</Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {proveedor.lastOrder}
                  </TableCell>
                  <TableCell>
                    <Button size="sm" variant="ghost">
                      <Edit className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Órdenes de Compra Recientes</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID Orden</TableHead>
                <TableHead>Proveedor</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ordenesRecientes.map((orden) => (
                <TableRow key={orden.id}>
                  <TableCell>{orden.id}</TableCell>
                  <TableCell>{orden.proveedor}</TableCell>
                  <TableCell>{orden.fecha}</TableCell>
                  <TableCell>S/ {orden.total.toFixed(2)}</TableCell>
                  <TableCell>
                    <Badge variant={orden.estado === "Recibida" ? "default" : "outline"}>
                      {orden.estado}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}