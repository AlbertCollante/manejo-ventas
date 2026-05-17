import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { Search, Plus, Edit, UserCheck, Shield, Upload, FileText, Eye } from "lucide-react";
import { Badge } from "./ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";
import { Label } from "./ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";

export function UsuariosModule() {
  const [search, setSearch] = useState("");
  const [selectedUser, setSelectedUser] = useState<any>(null);

  const users = [
    {
      id: 1,
      name: "Ana María García",
      email: "ana.garcia@boticamz.com",
      role: "Administrador",
      status: "Activo",
      lastLogin: "13/10/2025 14:30",
      initials: "AG",
      avatar: "",
      dni: "72845621",
      phone: "987654321",
      birthday: "15/03/1990",
      salary: 3500.00,
      documents: [
        { type: "DNI", status: "Verificado", date: "01/01/2025" },
        { type: "Antecedentes Penales", status: "Verificado", date: "01/01/2025" },
        { type: "Certificado de Salud", status: "Verificado", date: "01/01/2025" },
      ]
    },
    {
      id: 2,
      name: "Carlos Rodríguez",
      email: "carlos.rodriguez@boticamz.com",
      role: "Vendedor",
      status: "Activo",
      lastLogin: "13/10/2025 13:15",
      initials: "CR",
      avatar: "",
      dni: "45678912",
      phone: "976543210",
      birthday: "22/07/1995",
      salary: 1500.00,
      documents: [
        { type: "DNI", status: "Verificado", date: "15/02/2025" },
        { type: "Antecedentes Penales", status: "Pendiente", date: "-" },
      ]
    },
    {
      id: 3,
      name: "María Fernández",
      email: "maria.fernandez@boticamz.com",
      role: "Vendedor",
      status: "Activo",
      lastLogin: "13/10/2025 12:00",
      initials: "MF",
      avatar: "",
      dni: "78912345",
      phone: "965432109",
      birthday: "10/11/1992",
      salary: 1500.00,
      documents: [
        { type: "DNI", status: "Verificado", date: "20/03/2025" },
        { type: "Antecedentes Penales", status: "Verificado", date: "20/03/2025" },
      ]
    },
    {
      id: 4,
      name: "Luis Torres",
      email: "luis.torres@boticamz.com",
      role: "Inventario",
      status: "Activo",
      lastLogin: "12/10/2025 16:45",
      initials: "LT",
      avatar: "",
      dni: "12378945",
      phone: "954321098",
      birthday: "05/05/1988",
      salary: 2000.00,
      documents: [
        { type: "DNI", status: "Verificado", date: "10/04/2025" },
      ]
    },
    {
      id: 5,
      name: "Patricia Morales",
      email: "patricia.morales@boticamz.com",
      role: "Contador",
      status: "Activo",
      lastLogin: "13/10/2025 10:00",
      initials: "PM",
      avatar: "",
      dni: "89745612",
      phone: "943210987",
      birthday: "28/12/1985",
      salary: 2800.00,
      documents: [
        { type: "DNI", status: "Verificado", date: "05/05/2025" },
        { type: "Antecedentes Penales", status: "Verificado", date: "05/05/2025" },
        { type: "Título Profesional", status: "Verificado", date: "05/05/2025" },
      ]
    },
  ];

  const filteredUsers = users.filter(u => 
    u.name.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase()) ||
    u.role.toLowerCase().includes(search.toLowerCase())
  );

  const roles = [
    { name: "Administrador", count: 1, color: "bg-red-100 text-red-600" },
    { name: "Vendedor", count: 2, color: "bg-blue-100 text-blue-600" },
    { name: "Inventario", count: 1, color: "bg-green-100 text-green-600" },
    { name: "Contador", count: 1, color: "bg-purple-100 text-purple-600" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 style={{ color: '#9AAD97' }}>Módulo de Usuarios</h2>
          <p className="text-muted-foreground">Gestión de usuarios y permisos</p>
        </div>
        <Dialog>
          <DialogTrigger asChild>
            <Button style={{ backgroundColor: '#D5B888', color: 'white', border: 'none' }}>
              <Plus className="h-4 w-4 mr-2" />
              Nuevo Usuario
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle style={{ color: '#D5B888' }}>Agregar Nuevo Usuario</DialogTitle>
              <DialogDescription>
                Complete los datos para crear un nuevo usuario en el sistema.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Nombre Completo</Label>
                <Input placeholder="Juan Pérez López" />
              </div>
              <div>
                <Label>Correo Electrónico</Label>
                <Input type="email" placeholder="usuario@boticamz.com" />
              </div>
              <div>
                <Label>Rol</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar rol" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Administrador</SelectItem>
                    <SelectItem value="vendedor">Vendedor</SelectItem>
                    <SelectItem value="inventario">Inventario</SelectItem>
                    <SelectItem value="contador">Contador</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Contraseña Temporal</Label>
                <Input type="password" placeholder="••••••••" />
              </div>
              <Button className="w-full" style={{ backgroundColor: '#9AAD97', color: 'white', border: 'none' }}>Crear Usuario</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {roles.map((role, index) => (
          <Card key={index}>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-lg ${role.color}`}>
                  <Shield className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{role.name}</p>
                  <p className="text-2xl">{role.count}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card style={{ borderTop: '4px solid #9AAD97' }}>
        <CardHeader>
          <CardTitle style={{ color: '#9AAD97' }}>Lista de Usuarios</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar usuarios..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Usuario</TableHead>
                <TableHead>Correo</TableHead>
                <TableHead>Rol</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Último Acceso</TableHead>
                <TableHead>Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar>
                        {user.avatar && <AvatarImage src={user.avatar} alt={user.name} />}
                        <AvatarFallback className="bg-primary text-primary-foreground">
                          {user.initials}
                        </AvatarFallback>
                      </Avatar>
                      <span>{user.name}</span>
                    </div>
                  </TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{user.role}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <UserCheck className="h-4 w-4 text-green-600" />
                      <span className="text-green-600">{user.status}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {user.lastLogin}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setSelectedUser(user)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl">
                          <DialogHeader>
                            <DialogTitle>Detalles del Usuario</DialogTitle>
                            <DialogDescription>
                              Información completa y documentos del trabajador
                            </DialogDescription>
                          </DialogHeader>
                          {selectedUser && (
                            <Tabs defaultValue="info">
                              <TabsList className="grid w-full grid-cols-2">
                                <TabsTrigger value="info">Información</TabsTrigger>
                                <TabsTrigger value="docs">Documentos</TabsTrigger>
                              </TabsList>
                              <TabsContent value="info" className="space-y-4">
                                <div className="flex items-center gap-4 p-4 bg-muted rounded-lg">
                                  <Avatar className="h-20 w-20">
                                    {selectedUser.avatar && (
                                      <AvatarImage src={selectedUser.avatar} alt={selectedUser.name} />
                                    )}
                                    <AvatarFallback className="bg-primary text-primary-foreground text-2xl">
                                      {selectedUser.initials}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div className="flex-1">
                                    <h3>{selectedUser.name}</h3>
                                    <p className="text-sm text-muted-foreground">{selectedUser.role}</p>
                                    <Button size="sm" variant="outline" className="mt-2">
                                      <Upload className="h-3 w-3 mr-2" />
                                      Cambiar Foto
                                    </Button>
                                  </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <Label>DNI</Label>
                                    <p className="text-sm mt-1">{selectedUser.dni}</p>
                                  </div>
                                  <div>
                                    <Label>Teléfono</Label>
                                    <p className="text-sm mt-1">{selectedUser.phone}</p>
                                  </div>
                                  <div>
                                    <Label>Correo</Label>
                                    <p className="text-sm mt-1">{selectedUser.email}</p>
                                  </div>
                                  <div>
                                    <Label>Estado</Label>
                                    <p className="text-sm mt-1">
                                      <Badge className="bg-green-100 text-green-600">
                                        {selectedUser.status}
                                      </Badge>
                                    </p>
                                  </div>
                                  <div>
                                    <Label>Cumpleaños</Label>
                                    <p className="text-sm mt-1">{selectedUser.birthday}</p>
                                  </div>
                                  <div>
                                    <Label>Salario</Label>
                                    <p className="text-sm mt-1">S/ {selectedUser.salary.toFixed(2)}</p>
                                  </div>
                                </div>
                              </TabsContent>
                              <TabsContent value="docs" className="space-y-4">
                                <div className="space-y-3">
                                  {selectedUser.documents.map((doc: any, idx: number) => (
                                    <div
                                      key={idx}
                                      className="flex items-center justify-between p-4 border rounded-lg"
                                    >
                                      <div className="flex items-center gap-3">
                                        <FileText className="h-5 w-5 text-muted-foreground" />
                                        <div>
                                          <p className="text-sm">{doc.type}</p>
                                          <p className="text-xs text-muted-foreground">
                                            Subido: {doc.date}
                                          </p>
                                        </div>
                                      </div>
                                      <Badge
                                        variant={doc.status === "Verificado" ? "default" : "outline"}
                                        className={
                                          doc.status === "Verificado"
                                            ? "bg-green-100 text-green-600"
                                            : ""
                                        }
                                      >
                                        {doc.status}
                                      </Badge>
                                    </div>
                                  ))}
                                  <Button variant="outline" className="w-full">
                                    <Upload className="h-4 w-4 mr-2" />
                                    Subir Nuevo Documento
                                  </Button>
                                </div>
                              </TabsContent>
                            </Tabs>
                          )}
                        </DialogContent>
                      </Dialog>
                      <Button size="sm" variant="ghost">
                        <Edit className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Permisos por Rol</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-5 gap-4 border-b pb-2">
              <div></div>
              <div className="text-center text-sm">Administrador</div>
              <div className="text-center text-sm">Vendedor</div>
              <div className="text-center text-sm">Inventario</div>
              <div className="text-center text-sm">Contador</div>
            </div>
            
            {[
              { module: "Gestión de Ventas", perms: [true, true, false, false] },
              { module: "Gestión de Inventario", perms: [true, false, true, false] },
              { module: "Gestión de Contabilidad", perms: [true, false, false, true] },
              { module: "Gestión de Usuarios", perms: [true, false, false, false] },
              { module: "Gestión de Proveedores", perms: [true, false, true, false] },
              { module: "Reportes y Análisis", perms: [true, true, true, true] },
            ].map((item, idx) => (
              <div key={idx} className="grid grid-cols-5 gap-4 items-center">
                <div className="text-sm">{item.module}</div>
                {item.perms.map((allowed, i) => (
                  <div key={i} className="text-center">
                    {allowed ? (
                      <div className="inline-block w-5 h-5 rounded-full bg-green-500" />
                    ) : (
                      <div className="inline-block w-5 h-5 rounded-full bg-gray-300" />
                    )}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}