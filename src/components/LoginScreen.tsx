import { useState, FormEvent } from "react";
import { Card, CardContent, CardHeader } from "./ui/card";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { Label } from "./ui/label";
import { AlertCircle, Eye, EyeOff } from "lucide-react";
import { Alert, AlertDescription } from "./ui/alert";

const logoUrl = new URL("./figma/logo1.png", import.meta.url).href;

interface LoginScreenProps {
  onLogin: (user: { username: string; role: string; name: string }) => void;
}

export function LoginScreen({ onLogin }: LoginScreenProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const normalizeRole = (role: string) => {
    const normalized = role.toLowerCase();
    if (normalized === "administrador") return "Administrador";
    if (normalized === "vendedor") return "Vendedor";
    return role.charAt(0).toUpperCase() + role.slice(1);
  };

  const handleLogin = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch(
        `http://localhost:9000/simple-role?user=${encodeURIComponent(username)}&contrasena=${encodeURIComponent(password)}`
      );

      const contentType = response.headers.get("content-type") || "";
      const responseText = await response.text();
      let apiMessage = responseText;

      if (contentType.includes("application/json")) {
        try {
          const parsed = JSON.parse(responseText);
          apiMessage = parsed?.message || parsed?.error || responseText;
        } catch {
          apiMessage = responseText;
        }
      }

      if (!response.ok) {
        setError(
          `Error: ${apiMessage || "Usuario o contraseña incorrectos"}`
        );
        return;
      }

      const data = contentType.includes("application/json") ? JSON.parse(responseText) : null;

      if (data?.rol && data?.nombre) {
        onLogin({
          username,
          role: normalizeRole(data.rol),
          name: data.nombre
        });
      } else {
        setError(apiMessage || "Usuario o contraseña incorrectos");
      }
    } catch (error) {
      console.error("Login API error:", error);
      setError("No se pudo conectar con el servidor de autenticación");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div 
      className="min-h-screen flex items-center justify-center"
      style={{
        background: 'linear-gradient(to bottom right, #e8fce4, #dcf1d9, #9aad97)'
      }}
    >
      <div className="w-full max-w-md p-6">
        <Card className="shadow-2xl">
          <CardHeader className="space-y-4">
            <div className="flex justify-center">
              <img src={logoUrl} alt="Logo Botica MZ" className="size-16" />
            </div>
            
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              
              <div className="space-y-2">
                <Label htmlFor="username">Usuario</Label>
                <Input
                  id="username"
                  placeholder="Ingrese su usuario"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Contraseña</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Ingrese su contraseña"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Eye className="h-4 w-4 text-muted-foreground" />
                    )}
                  </Button>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full"
                style={{ backgroundColor: '#D5B888', borderColor: '#D5B888' }}
                disabled={loading}
              >
                {loading ? "Ingresando..." : "Iniciar Sesión"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
