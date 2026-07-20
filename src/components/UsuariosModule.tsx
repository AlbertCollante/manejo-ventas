import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { Search, Plus, Edit, Trash2, Eye, Shield, Lock, RefreshCw, UserCheck } from "lucide-react";
import { Badge } from "./ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";
import { Label } from "./ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";

interface UsuariosModuleProps {
  currentUser: {
    username: string;
    role: string;
    name: string;
  };
}

interface Usuario {
  id_usuario: number;
  nombre: string;
  usuario: string;
  rol: string;
  correo: string;
}

interface UserForm {
  nombre: string;
  usuario: string;
  correo: string;
  rol: string;
  contrasena: string;
}

const API_BASE = 'http://localhost:9000';
const ROLES = ['Administrador', 'Vendedor'];

export function UsuariosModule({ currentUser }: UsuariosModuleProps) {
  const [users, setUsers] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const [selectedUser, setSelectedUser] = useState<Usuario | null>(null);
  const [viewUser, setViewUser] = useState<Usuario | null>(null);

  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const [form, setForm] = useState<UserForm>({
    nombre: '',
    usuario: '',
    correo: '',
    rol: 'Vendedor',
    contrasena: '',
  });
  const [newPassword, setNewPassword] = useState("");
  const [formLoading, setFormLoading] = useState(false);

  const isAdmin = currentUser.role === 'Administrador';

  const isSelf = (user: Usuario) => currentUser.username === user.usuario;
  const canEdit = (user: Usuario) => isAdmin || isSelf(user);
  const canChangePassword = (user: Usuario) => isAdmin || isSelf(user);
  const canDelete = (user: Usuario) => isAdmin && !isSelf(user);

  const getHeaders = () => ({
    'Content-Type': 'application/json',
    'x-usuario': currentUser.username,
  });

  const fetchUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE}/api/usuarios`, {
        headers: { 'x-usuario': currentUser.username },
      });
      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || `Error ${response.status} al cargar usuarios`);
      }
      const data = await response.json();
      setUsers(Array.isArray(data) ? data : []);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error cargando usuarios';
      console.error('Error cargando usuarios:', err);
      setError(msg);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserById = async (id: number): Promise<Usuario | null> => {
    try {
      const response = await fetch(`${API_BASE}/api/usuarios/${id}`, {
        headers: { 'x-usuario': currentUser.username },
      });
      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || `Error ${response.status} al cargar usuario`);
      }
      return await response.json();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error cargando usuario';
      console.error('Error cargando usuario:', err);
      alert('Error al cargar usuario: ' + msg);
      return null;
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const filteredUsers = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return users;
    return users.filter(u =>
      u.nombre.toLowerCase().includes(term) ||
      u.usuario.toLowerCase().includes(term) ||
      u.correo.toLowerCase().includes(term) ||
      u.rol.toLowerCase().includes(term)
    );
  }, [users, search]);

  const roleCounts = useMemo(() => {
    return ROLES.map(rol => ({
      name: rol,
      count: users.filter(u => u.rol === rol).length,
    }));
  }, [users]);

  const resetForm = () => {
    setForm({
      nombre: '',
      usuario: '',
      correo: '',
      rol: 'Vendedor',
      contrasena: '',
    });
  };

  const openCreateDialog = () => {
    resetForm();
    setShowCreateDialog(true);
  };

  const openEditDialog = async (user: Usuario) => {
    setSelectedUser(user);
    setForm({
      nombre: user.nombre,
      usuario: user.usuario,
      correo: user.correo,
      rol: user.rol,
      contrasena: '',
    });
    setShowEditDialog(true);
  };

  const openPasswordDialog = (user: Usuario) => {
    setSelectedUser(user);
    setNewPassword("");
    setShowPasswordDialog(true);
  };

  const openDeleteDialog = (user: Usuario) => {
    setSelectedUser(user);
    setShowDeleteDialog(true);
  };

  const openViewDialog = async (user: Usuario) => {
    const freshUser = await fetchUserById(user.id_usuario);
    if (freshUser) {
      setViewUser(freshUser);
    }
  };

  const handleCreate = async () => {
    if (!isAdmin) {
      alert('No tiene permisos para crear usuarios');
      return;
    }
    if (!form.nombre || !form.usuario || !form.contrasena || !form.correo || !form.rol) {
      alert('Por favor complete todos los campos obligatorios');
      return;
    }

    setFormLoading(true);
    try {
      const response = await fetch(`${API_BASE}/api/usuarios`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          nombre: form.nombre,
          usuario: form.usuario,
          contrasena: form.contrasena,
          rol: form.rol,
          correo: form.correo,
        }),
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || 'Error al crear usuario');
      }

      await fetchUsers();
      setShowCreateDialog(false);
      resetForm();
      alert('Usuario creado correctamente');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error desconocido';
      console.error('Error creando usuario:', err);
      alert('Error al crear usuario: ' + msg);
    } finally {
      setFormLoading(false);
    }
  };

  const handleUpdate = async () => {
    if (!selectedUser) return;
    if (!canEdit(selectedUser)) {
      alert('No tiene permisos para editar este usuario');
      return;
    }
    if (!form.nombre || !form.usuario || !form.correo) {
      alert('Por favor complete los campos obligatorios');
      return;
    }

    setFormLoading(true);
    try {
      const payload: any = {
        nombre: form.nombre,
        usuario: form.usuario,
        correo: form.correo,
      };
      if (isAdmin) {
        payload.rol = form.rol;
      }

      const response = await fetch(`${API_BASE}/api/usuarios/${selectedUser.id_usuario}`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || 'Error al actualizar usuario');
      }

      await fetchUsers();
      setShowEditDialog(false);
      setSelectedUser(null);
      resetForm();
      alert('Usuario actualizado correctamente');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error desconocido';
      console.error('Error actualizando usuario:', err);
      alert('Error al actualizar usuario: ' + msg);
    } finally {
      setFormLoading(false);
    }
  };

  const handleChangePassword = async () => {
    if (!selectedUser) return;
    if (!canChangePassword(selectedUser)) {
      alert('No tiene permisos para cambiar la contraseña de este usuario');
      return;
    }
    if (!newPassword) {
      alert('Por favor ingrese la nueva contraseña');
      return;
    }

    setFormLoading(true);
    try {
      const response = await fetch(`${API_BASE}/api/usuarios/${selectedUser.id_usuario}/contrasena`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify({ contrasena: newPassword }),
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || 'Error al cambiar contraseña');
      }

      setShowPasswordDialog(false);
      setSelectedUser(null);
      setNewPassword("");
      alert('Contraseña actualizada correctamente');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error desconocido';
      console.error('Error cambiando contraseña:', err);
      alert('Error al cambiar contraseña: ' + msg);
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedUser) return;
    if (!canDelete(selectedUser)) {
      alert('No tiene permisos para eliminar este usuario');
      return;
    }

    setFormLoading(true);
    try {
      const response = await fetch(`${API_BASE}/api/usuarios/${selectedUser.id_usuario}`, {
        method: 'DELETE',
        headers: { 'x-usuario': currentUser.username },
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || 'Error al eliminar usuario');
      }

      await fetchUsers();
      setShowDeleteDialog(false);
      setSelectedUser(null);
      alert('Usuario eliminado correctamente');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error desconocido';
      console.error('Error eliminando usuario:', err);
      alert('Error al eliminar usuario: ' + msg);
    } finally {
      setFormLoading(false);
    }
  };

  const getInitials = (name: string) => {
    return name.charAt(0).toUpperCase();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 style={{ color: '#9AAD97' }}>Módulo de Usuarios</h2>
          <p className="text-muted-foreground">Gestión de usuarios y permisos</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={fetchUsers}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Actualizar
          </Button>
          {isAdmin && (
            <Button
              style={{ backgroundColor: '#D5B888', color: 'white', border: 'none' }}
              onClick={openCreateDialog}
            >
              <Plus className="h-4 w-4 mr-2" />
              Nuevo Usuario
            </Button>
          )}
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
          <p className="font-medium">Error al cargar usuarios</p>
          <p>{error}</p>
        </div>
      )}

      {/* Resumen por rol */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {roleCounts.map((role) => (
          <Card key={role.name}>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-lg ${
                  role.name === 'Administrador' ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'
                }`}>
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

      {/* Lista de usuarios */}
      <Card style={{ borderTop: '4px solid #9AAD97' }}>
        <CardHeader>
          <CardTitle style={{ color: '#9AAD97' }}>Lista de Usuarios</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nombre, usuario, correo o rol..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Usuario</TableHead>
                <TableHead>Correo</TableHead>
                <TableHead>Rol</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-4 text-muted-foreground">
                    Cargando usuarios...
                  </TableCell>
                </TableRow>
              ) : filteredUsers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-4 text-muted-foreground">
                    No hay usuarios registrados
                  </TableCell>
                </TableRow>
              ) : (
                filteredUsers.map((user) => (
                  <TableRow key={user.id_usuario}>
                    <TableCell>
                      <span>{user.nombre}</span>
                    </TableCell>
                    <TableCell>{user.usuario}</TableCell>
                    <TableCell>{user.correo}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={
                        user.rol === 'Administrador' ? 'border-red-300 text-red-600' : 'border-blue-300 text-blue-600'
                      }>
                        {user.rol}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => openViewDialog(user)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Detalle del Usuario</DialogTitle>
                              <DialogDescription>
                                Información del usuario seleccionado
                              </DialogDescription>
                            </DialogHeader>
                            {viewUser && (
                              <div className="space-y-4 pt-2">
                                <div className="flex items-center gap-4 p-4 bg-muted rounded-lg">
                                  <div className="w-16 h-16 rounded-full flex items-center justify-center text-white text-xl font-bold" style={{ backgroundColor: '#9AAD97' }}>
                                    {getInitials(viewUser.nombre)}
                                  </div>
                                  <div>
                                    <h3 className="font-semibold">{viewUser.nombre}</h3>
                                    <p className="text-sm text-muted-foreground">{viewUser.usuario}</p>
                                  </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                  <div>
                                    <Label className="text-muted-foreground">Correo</Label>
                                    <p>{viewUser.correo}</p>
                                  </div>
                                  <div>
                                    <Label className="text-muted-foreground">Rol</Label>
                                    <p>{viewUser.rol}</p>
                                  </div>
                                  <div>
                                    <Label className="text-muted-foreground">ID</Label>
                                    <p>{viewUser.id_usuario}</p>
                                  </div>
                                </div>
                              </div>
                            )}
                          </DialogContent>
                        </Dialog>

                        {canEdit(user) && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => openEditDialog(user)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        )}

                        {canChangePassword(user) && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => openPasswordDialog(user)}
                          >
                            <Lock className="h-4 w-4" />
                          </Button>
                        )}

                        {canDelete(user) && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-red-600 hover:text-red-700"
                            onClick={() => openDeleteDialog(user)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Diálogo: Crear usuario */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle style={{ color: '#D5B888' }}>Agregar Nuevo Usuario</DialogTitle>
            <DialogDescription>
              Complete los datos para crear un nuevo usuario en el sistema.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <Label>Nombre Completo *</Label>
              <Input
                placeholder="Juan Pérez López"
                value={form.nombre}
                onChange={(e) => setForm({ ...form, nombre: e.target.value })}
              />
            </div>
            <div>
              <Label>Usuario *</Label>
              <Input
                placeholder="jperez"
                value={form.usuario}
                onChange={(e) => setForm({ ...form, usuario: e.target.value })}
              />
            </div>
            <div>
              <Label>Correo Electrónico *</Label>
              <Input
                type="email"
                placeholder="usuario@ejemplo.com"
                value={form.correo}
                onChange={(e) => setForm({ ...form, correo: e.target.value })}
              />
            </div>
            <div>
              <Label>Rol *</Label>
              <Select
                value={form.rol}
                onValueChange={(value) => setForm({ ...form, rol: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar rol" />
                </SelectTrigger>
                <SelectContent>
                  {ROLES.map(r => (
                    <SelectItem key={r} value={r}>{r}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Contraseña Temporal *</Label>
              <Input
                type="password"
                placeholder="••••••••"
                value={form.contrasena}
                onChange={(e) => setForm({ ...form, contrasena: e.target.value })}
              />
            </div>
            <Button
              className="w-full"
              style={{ backgroundColor: '#9AAD97', color: 'white', border: 'none' }}
              onClick={handleCreate}
              disabled={formLoading}
            >
              {formLoading ? 'Creando...' : 'Crear Usuario'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Diálogo: Editar usuario */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle style={{ color: '#D5B888' }}>Editar Usuario</DialogTitle>
            <DialogDescription>
              Modifique los datos del usuario.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <Label>Nombre Completo *</Label>
              <Input
                value={form.nombre}
                onChange={(e) => setForm({ ...form, nombre: e.target.value })}
              />
            </div>
            <div>
              <Label>Usuario *</Label>
              <Input
                value={form.usuario}
                onChange={(e) => setForm({ ...form, usuario: e.target.value })}
              />
            </div>
            <div>
              <Label>Correo Electrónico *</Label>
              <Input
                type="email"
                value={form.correo}
                onChange={(e) => setForm({ ...form, correo: e.target.value })}
              />
            </div>
            <div>
              <Label>Rol *</Label>
              <Select
                value={form.rol}
                onValueChange={(value) => setForm({ ...form, rol: value })}
                disabled={!isAdmin}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar rol" />
                </SelectTrigger>
                <SelectContent>
                  {ROLES.map(r => (
                    <SelectItem key={r} value={r}>{r}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {!isAdmin && (
                <p className="text-xs text-muted-foreground mt-1">
                  Solo un Administrador puede cambiar el rol.
                </p>
              )}
            </div>
            <Button
              className="w-full"
              style={{ backgroundColor: '#9AAD97', color: 'white', border: 'none' }}
              onClick={handleUpdate}
              disabled={formLoading}
            >
              {formLoading ? 'Guardando...' : 'Guardar Cambios'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Diálogo: Cambiar contraseña */}
      <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle style={{ color: '#D5B888' }}>
              Cambiar Contraseña
            </DialogTitle>
            <DialogDescription>
              {selectedUser && (
                <>Usuario: <strong>{selectedUser.usuario}</strong></>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <Label>Nueva Contraseña *</Label>
              <Input
                type="password"
                placeholder="••••••••"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </div>
            <Button
              className="w-full"
              style={{ backgroundColor: '#9AAD97', color: 'white', border: 'none' }}
              onClick={handleChangePassword}
              disabled={formLoading}
            >
              {formLoading ? 'Actualizando...' : 'Actualizar Contraseña'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Diálogo: Confirmar eliminación */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-red-600">Eliminar Usuario</DialogTitle>
            <DialogDescription>
              {selectedUser && (
                <>
                  ¿Está seguro de eliminar al usuario <strong>{selectedUser.usuario}</strong>? Esta acción no se puede deshacer.
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-2 justify-end pt-4">
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)} disabled={formLoading}>
              Cancelar
            </Button>
            <Button
              style={{ backgroundColor: '#ef4444', color: 'white', border: 'none' }}
              onClick={handleDelete}
              disabled={formLoading}
            >
              {formLoading ? 'Eliminando...' : 'Eliminar'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
