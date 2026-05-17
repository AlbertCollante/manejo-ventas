import { useState, useEffect } from "react";
import * as XLSX from "xlsx";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { Search, Plus, Edit, AlertTriangle, Package, Download, Filter, Lock, Trash2 } from "lucide-react";
import { Badge } from "./ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";
import { Label } from "./ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { dataService } from "../services/dataService";

const API_BASE = 'http://localhost:9000';

const normalizeApiProduct = (product: any) => {
  const stock = Number(product.stock_actual ?? product.stock ?? 0);
  const minStock = Number(product.stock_minimo ?? product.minStock ?? 0);
  const purchasePrice = Number(product.precio_compra ?? product.purchasePrice ?? 0);
  const priceUnit = Number(product.precio_unitario ?? product.priceUnit ?? 0);
  const priceBlister = Number(product.precio_blister ?? product.priceBlister ?? 0);
  const priceBox = Number(product.precio_caja ?? product.precio_caja_venta ?? product.priceBox ?? 0);

  return {
    id: Number(product.id ?? 0),
    code: product.codigo ?? product.code ?? String(product.id ?? ""),
    name: product.nombre ?? product.name ?? "",
    category: product.categoria ?? product.category ?? "",
    brand: product.marca ?? product.brand ?? "",
    stock,
    minStock,
    purchasePrice,
    priceUnit,
    priceBlister,
    priceBox,
    unitsPerBlister: Number(product.unidades_blister ?? product.unitsPerBlister ?? 0),
    blistersPerBox: Number(product.blisters_caja ?? product.blistersPerBox ?? 0),
    expiry: product.vencimiento ?? product.expiry ?? "",
    location: product.ubicacion ?? product.location ?? "",
    shelf: product.estante ?? product.shelf ?? "",
    estado: product.estado ?? (stock <= minStock ? "Bajo stock" : "Disponible"),
    precio_caja: Number(product.precio_caja ?? priceBox),
    precio_compra: purchasePrice,
    precio_unitario: priceUnit,
    precio_blister: priceBlister,
    precio_caja_venta: Number(product.precio_caja_venta ?? priceBox),
    unidades_blister: Number(product.unidades_blister ?? product.unitsPerBlister ?? 0),
    blisters_caja: Number(product.blisters_caja ?? product.blistersPerBox ?? 0),
    vencimiento: product.vencimiento ?? product.expiry ?? "",
    ubicacion: product.ubicacion ?? product.location ?? "",
    estante: product.estante ?? product.shelf ?? "",
    valor_total: Number(product.valor_total ?? stock * purchasePrice),
    ganancia: Number(product.ganancia ?? 0),
    compra: Number(product.compra ?? purchasePrice),
    price: priceUnit,
  };
};

// Datos por defecto
const DEFAULT_PRODUCTS = [
  { 
    id: 1, code: "MED001", name: "Paracetamol 500mg", category: "Analgésicos", brand: "Farmex",
    stock: 150, minStock: 50, purchasePrice: 1.50, priceUnit: 2.50, priceBlister: 22.50, priceBox: 200.00,
    unitsPerBlister: 10, blistersPerBox: 10, expiry: "12/2026", location: "Estante A1", shelf: "A1"
  },
  { 
    id: 2, code: "MED002", name: "Ibuprofeno 400mg", category: "Antiinflamatorios", brand: "Bayer",
    stock: 8, minStock: 30, purchasePrice: 2.50, priceUnit: 3.80, priceBlister: 35.00, priceBox: 320.00,
    unitsPerBlister: 10, blistersPerBox: 10, expiry: "08/2025", location: "Estante A2", shelf: "A2"
  },
  { 
    id: 3, code: "MED003", name: "Amoxicilina 500mg", category: "Antibióticos", brand: "Labsur",
    stock: 12, minStock: 40, purchasePrice: 10.00, priceUnit: 15.50, priceBlister: 140.00, priceBox: 1200.00,
    unitsPerBlister: 10, blistersPerBox: 10, expiry: "03/2026", location: "Estante B1", shelf: "B1"
  },
  { 
    id: 4, code: "MED004", name: "Loratadina 10mg", category: "Antihistamínicos", brand: "Roemmers",
    stock: 50, minStock: 25, purchasePrice: 6.50, priceUnit: 8.90, priceBlister: 80.10, priceBox: 720.90,
    unitsPerBlister: 10, blistersPerBox: 10, expiry: "06/2026", location: "Estante B2", shelf: "B2"
  },
  { 
    id: 5, code: "MED005", name: "Omeprazol 20mg", category: "Antiácidos", brand: "Pfizer",
    stock: 95, minStock: 35, purchasePrice: 9.00, priceUnit: 12.00, priceBlister: 108.00, priceBox: 972.00,
    unitsPerBlister: 10, blistersPerBox: 10, expiry: "10/2026", location: "Estante C1", shelf: "C1"
  },
  { 
    id: 6, code: "MED006", name: "Diclofenaco 50mg", category: "Antiinflamatorios", brand: "Novartis",
    stock: 45, minStock: 20, purchasePrice: 3.00, priceUnit: 4.50, priceBlister: 40.50, priceBox: 364.50,
    unitsPerBlister: 10, blistersPerBox: 10, expiry: "05/2026", location: "Estante C2", shelf: "C2"
  }
];

interface Product {
  id: number;
  code: string;
  name: string;
  category: string;
  brand: string;
  stock: number;
  minStock: number;
  purchasePrice: number;
  priceUnit: number;
  priceBlister: number;
  priceBox: number;
  unitsPerBlister: number;
  blistersPerBox: number;
  expiry: string;
  location: string;
  shelf: string;
  estado?: string;
  precio_caja?: number;
  precio_compra?: number;
  precio_unitario?: number;
  precio_blister?: number;
  precio_caja_venta?: number;
  unidades_blister?: number;
  blisters_caja?: number;
  vencimiento?: string;
  ubicacion?: string;
  estante?: string;
  valor_total?: number;
  ganancia?: number;
  compra?: number;
  price?: number;
}

// Función para normalizar productos y asegurar que tengan todos los campos
const normalizeProduct = (product: any): Product => {
  return {
    id: product.id || 0,
    code: product.code || '',
    name: product.name || '',
    category: product.category || '',
    brand: product.brand || '',
    stock: typeof product.stock === 'number' ? product.stock : 0,
    minStock: typeof product.minStock === 'number' ? product.minStock : 0,
    purchasePrice: typeof product.purchasePrice === 'number' ? product.purchasePrice : 0,
    priceUnit: typeof product.priceUnit === 'number' ? product.priceUnit : 0,
    priceBlister: typeof product.priceBlister === 'number' ? product.priceBlister : 0,
    priceBox: typeof product.priceBox === 'number' ? product.priceBox : 0,
    unitsPerBlister: typeof product.unitsPerBlister === 'number' ? product.unitsPerBlister : 1,
    blistersPerBox: typeof product.blistersPerBox === 'number' ? product.blistersPerBox : 1,
    expiry: product.expiry || '',
    location: product.location || '',
    shelf: product.shelf || ''
  };
};

export function InventarioModule() {
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterLocation, setFilterLocation] = useState("all");
  const [filterLowStock, setFilterLowStock] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [codeSearch, setCodeSearch] = useState("");
  
  const [newProduct, setNewProduct] = useState({
    code: "",
    name: "",
    category: "",
    brand: "",
    stock: 0,
    minStock: 0,
    purchasePrice: 0,
    marginPercentage: 30,
    unitsPerBlister: 10,
    blistersPerBox: 10,
    expiry: "",
    location: "",
    shelf: ""
  });

  const [products, setProducts] = useState<Product[]>([]);

  // Cargar productos desde la API al montar el componente
  useEffect(() => {
    const loadProducts = async () => {
      const oldKey = localStorage.getItem('products');
      if (oldKey) {
        localStorage.removeItem('products');
      }

      try {
        const response = await fetch(`${API_BASE}/inventario-productos`);
        if (!response.ok) {
          throw new Error('Error al obtener inventario de la API');
        }

        const data = await response.json();
        if (Array.isArray(data) && data.length > 0) {
          const normalized = data.map(normalizeApiProduct);
          setProducts(normalized);
          localStorage.setItem('botica_products', JSON.stringify(normalized));
          return;
        }

        throw new Error('API de inventario devolvió datos inválidos');
      } catch (error) {
        console.error('Error cargando productos desde API:', error);
        const savedProducts = localStorage.getItem('botica_products');
        if (savedProducts) {
          try {
            const parsed = JSON.parse(savedProducts);
            if (Array.isArray(parsed) && parsed.length > 0) {
              const normalized = parsed.map(normalizeApiProduct);
              setProducts(normalized);
              return;
            }
          } catch (err) {
            console.error('Error cargando productos desde localStorage:', err);
          }
        }

        const normalized = DEFAULT_PRODUCTS.map(normalizeProduct);
        setProducts(normalized);
        localStorage.setItem('botica_products', JSON.stringify(normalized));
      }
    };

    loadProducts();
  }, []);

  const categories = ["all", "Analgésicos", "Antiinflamatorios", "Antibióticos", "Antihistamínicos", "Antiácidos", "Tópicos", "Servicios"];
  const locations = ["all", "Estante A1", "Estante A2", "Estante B1", "Estante C1", "Estante D1", "Estante E1", "Estante S1", "Estante S2"];
  const brands = ["Farmex", "Bayer", "Labsur", "Roemmers", "Pfizer", "Novartis"];

  // Autocompletado por código
  const handleCodeSearch = (code: string) => {
    setCodeSearch(code);
    const product = products.find(p => p.code.toLowerCase() === code.toLowerCase());
    if (product) {
      setEditingProduct(product);
    }
  };

  const filteredProducts = products.filter(p => {
    const matchesSearch = (p.name || '').toLowerCase().includes(search.toLowerCase()) ||
                         (p.code || '').toLowerCase().includes(search.toLowerCase()) ||
                         (p.brand || '').toLowerCase().includes(search.toLowerCase());
    const matchesCategory = filterCategory === "all" || p.category === filterCategory;
    const matchesLocation = filterLocation === "all" || p.location === filterLocation;
    const matchesLowStock = !filterLowStock || (p.stock || 0) <= (p.minStock || 0);
    return matchesSearch && matchesCategory && matchesLocation && matchesLowStock;
  });

  const lowStockCount = products.filter(p => (p.stock || 0) <= (p.minStock || 0)).length;

  // Calcular precio de venta basado en precio de compra
  const calculateSalePrice = (purchasePrice: number, margin: number) => {
    const price = typeof purchasePrice === 'number' ? purchasePrice : 0;
    const marginValue = typeof margin === 'number' ? margin : 0;
    return Math.max(0, price * (1 + marginValue / 100));
  };

  const handleAddProduct = () => {
    if (!newProduct.code || !newProduct.name || !newProduct.category) {
      alert("Por favor complete los campos obligatorios");
      return;
    }

    const priceUnit = calculateSalePrice(newProduct.purchasePrice, newProduct.marginPercentage);
    const priceBlister = priceUnit * newProduct.unitsPerBlister * 0.95; // 5% descuento
    const priceBox = priceBlister * newProduct.blistersPerBox * 0.90; // 10% descuento

    const product: Product = {
      id: products.length > 0 ? Math.max(...products.map(p => p.id)) + 1 : 1,
      code: newProduct.code,
      name: newProduct.name,
      category: newProduct.category,
      brand: newProduct.brand,
      stock: newProduct.stock,
      minStock: newProduct.minStock,
      purchasePrice: newProduct.purchasePrice,
      priceUnit,
      priceBlister,
      priceBox,
      unitsPerBlister: newProduct.unitsPerBlister,
      blistersPerBox: newProduct.blistersPerBox,
      expiry: newProduct.expiry,
      location: newProduct.location,
      shelf: newProduct.shelf
    };

    const updatedProducts = [...products, product];
    setProducts(updatedProducts);
    
    // Guardar en localStorage con la clave correcta
    localStorage.setItem('botica_products', JSON.stringify(updatedProducts));
    
    setNewProduct({
      code: "",
      name: "",
      category: "",
      brand: "",
      stock: 0,
      minStock: 0,
      purchasePrice: 0,
      marginPercentage: 30,
      unitsPerBlister: 10,
      blistersPerBox: 10,
      expiry: "",
      location: "",
      shelf: ""
    });
    alert("Producto agregado exitosamente");
  };

  const handleUpdateProduct = () => {
    if (!editingProduct) return;
    
    const updatedProducts = products.map(p => 
      p.id === editingProduct.id ? editingProduct : p
    );
    
    setProducts(updatedProducts);
    
    // Guardar en localStorage con la clave correcta
    localStorage.setItem('botica_products', JSON.stringify(updatedProducts));
    
    setEditingProduct(null);
    alert("Producto actualizado exitosamente");
  };

  const downloadReport = () => {
    // Preparar datos para Excel
    const reportDate = new Date().toLocaleDateString('es-PE');
    
    // Hoja 1: Resumen general
    const summaryData = [
      ["REPORTE DE INVENTARIO - CONSALUD"],
      [""],
      ["Fecha de Generación:", reportDate],
      ["Total de Productos:", products.length],
      ["Productos con Bajo Stock:", lowStockCount],
      [""],
      ["RESUMEN FINANCIERO"],
      ["Inventario Total (Valor):", 
        (products.reduce((sum, p) => sum + ((p.stock || 0) * (p.purchasePrice || 0)), 0)).toFixed(2)
      ]
    ];

    // Hoja 2: Detalle de productos
    const productData = filteredProducts.map(p => ({
      "Código": p.code || '',
      "Nombre": p.name || '',
      "Categoría": p.category || '',
      "Marca": p.brand || '',
      "Stock Actual": p.stock || 0,
      "Stock Mínimo": p.minStock || 0,
      "Estado": (p.stock || 0) <= (p.minStock || 0) ? "⚠️ BAJO STOCK" : "✓ OK",
      "Precio Compra": "S/ " + ((p.purchasePrice || 0).toFixed(2)),
      "Precio Unitario": "S/ " + ((p.priceUnit || 0).toFixed(2)),
      "Precio Blíster": "S/ " + ((p.priceBlister || 0).toFixed(2)),
      "Precio Caja": "S/ " + ((p.priceBox || 0).toFixed(2)),
      "Unidades/Blíster": p.unitsPerBlister || 1,
      "Blísteres/Caja": p.blistersPerBox || 1,
      "Vencimiento": p.expiry || '',
      "Ubicación": p.location || '',
      "Estante": p.shelf || '',
      "Valor Total": "S/ " + (((p.stock || 0) * (p.purchasePrice || 0)).toFixed(2))
    }));

    // Crear workbook
    const wb = XLSX.utils.book_new();
    
    // Agregar hoja de resumen
    const ws1 = XLSX.utils.aoa_to_sheet(summaryData);
    ws1["!cols"] = [{ wch: 30 }, { wch: 20 }];
    XLSX.utils.book_append_sheet(wb, ws1, "Resumen");
    
    // Agregar hoja de detalle de productos
    const ws2 = XLSX.utils.json_to_sheet(productData);
    ws2["!cols"] = [
      { wch: 12 }, { wch: 25 }, { wch: 18 }, { wch: 15 },
      { wch: 12 }, { wch: 12 }, { wch: 14 }, { wch: 12 },
      { wch: 14 }, { wch: 14 }, { wch: 12 }, { wch: 13 },
      { wch: 12 }, { wch: 12 }, { wch: 18 }, { wch: 10 },
      { wch: 14 }
    ];
    XLSX.utils.book_append_sheet(wb, ws2, "Productos");

    // Hoja 3: Productos con bajo stock
    const lowStockData = products
      .filter(p => (p.stock || 0) <= (p.minStock || 0))
      .map(p => ({
        "Código": p.code || '',
        "Nombre": p.name || '',
        "Stock Actual": p.stock || 0,
        "Stock Mínimo": p.minStock || 0,
        "Diferencia": (p.stock || 0) - (p.minStock || 0),
        "Ubicación": p.location || ''
      }));

    if (lowStockData.length > 0) {
      const ws3 = XLSX.utils.json_to_sheet(lowStockData);
      ws3["!cols"] = [{ wch: 12 }, { wch: 25 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 18 }];
      XLSX.utils.book_append_sheet(wb, ws3, "Bajo Stock");
    }

    // Descargar archivo
    const fileName = `Inventario_CONSALUD_${reportDate.replace(/\//g, "-")}.xlsx`;
    XLSX.writeFile(wb, fileName);
  };

  // Determinar si el usuario actual es vendedor (esto vendría del contexto/props en producción)
  const isVendedor = false; // Cambiar según el rol del usuario

  // Mostrar componente de carga si no hay productos
  if (products.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h2 style={{ color: '#9AAD97' }}>Módulo de Inventario</h2>
          <p className="text-muted-foreground">Cargando productos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 style={{ color: '#9AAD97' }}>Módulo de Inventario</h2>
          <p className="text-muted-foreground">Gestión de productos y stock</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={downloadReport} style={{ color: '#9AAD97', borderColor: '#9AAD97' }}>
            <Download className="h-4 w-4 mr-2" />
            Descargar Inventario (Excel)
          </Button>
          {!isVendedor && (
            <Dialog>
              <DialogTrigger asChild>
                <Button style={{ backgroundColor: '#D5B888', color: 'white', border: 'none' }}>
                  <Plus className="h-4 w-4 mr-2" />
                  Nuevo Producto
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle style={{ color: '#D5B888' }}>Agregar Nuevo Producto</DialogTitle>
                  <DialogDescription>
                    Complete los datos del nuevo producto para agregarlo al inventario.
                  </DialogDescription>
                </DialogHeader>
                <Tabs defaultValue="basico">
                  <TabsList className="grid w-full grid-cols-3" style={{ backgroundColor: 'rgba(154, 173, 151, 0.1)', borderBottom: `2px solid #9AAD97` }}>
                    <TabsTrigger value="basico" style={{ color: '#9AAD97' }}>Información Básica</TabsTrigger>
                    <TabsTrigger value="precios" style={{ color: '#D5B888' }}>Precios</TabsTrigger>
                    <TabsTrigger value="ubicacion" style={{ color: '#9AAD97' }}>Ubicación</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="basico" className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label style={{ color: '#D5B888' }}>Código *</Label>
                        <Input 
                          placeholder="MED007" 
                          value={newProduct.code}
                          onChange={(e) => setNewProduct({...newProduct, code: e.target.value})}
                        />
                      </div>
                      <div>
                        <Label style={{ color: '#9AAD97' }}>Marca *</Label>
                        <Select value={newProduct.brand} onValueChange={(v: any) => setNewProduct({...newProduct, brand: v})}>
                          <SelectTrigger>
                            <SelectValue placeholder="Seleccionar marca" />
                          </SelectTrigger>
                          <SelectContent>
                            {brands.map(b => (
                              <SelectItem key={b} value={b}>{b}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div>
                      <Label style={{ color: '#D5B888' }}>Nombre del Producto *</Label>
                      <Input 
                        placeholder="Nombre del medicamento" 
                        value={newProduct.name}
                        onChange={(e) => setNewProduct({...newProduct, name: e.target.value})}
                      />
                    </div>
                    <div>
                      <Label style={{ color: '#9AAD97' }}>Categoría *</Label>
                      <Select value={newProduct.category} onValueChange={(v: any) => setNewProduct({...newProduct, category: v})}>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar categoría" />
                        </SelectTrigger>
                        <SelectContent>
                          {categories.slice(1).map((cat) => (
                            <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label style={{ color: '#D5B888' }}>Stock Inicial</Label>
                        <Input 
                          type="number" 
                          placeholder="100" 
                          value={newProduct.stock}
                          onChange={(e) => setNewProduct({...newProduct, stock: parseInt(e.target.value) || 0})}
                        />
                      </div>
                      <div>
                        <Label style={{ color: '#9AAD97' }}>Stock Mínimo</Label>
                        <Input 
                          type="number" 
                          placeholder="30" 
                          value={newProduct.minStock}
                          onChange={(e) => setNewProduct({...newProduct, minStock: parseInt(e.target.value) || 0})}
                        />
                      </div>
                    </div>
                    <div>
                      <Label style={{ color: '#D5B888' }}>Fecha de Vencimiento</Label>
                      <Input 
                        type="text" 
                        placeholder="MM/YYYY" 
                        value={newProduct.expiry}
                        onChange={(e) => setNewProduct({...newProduct, expiry: e.target.value})}
                      />
                    </div>
                  </TabsContent>

                  <TabsContent value="precios" className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label style={{ color: '#9AAD97' }}>Precio de Compra *</Label>
                        <Input 
                          type="number" 
                          step="0.01" 
                          placeholder="0.00" 
                          value={newProduct.purchasePrice}
                          onChange={(e) => setNewProduct({...newProduct, purchasePrice: parseFloat(e.target.value) || 0})}
                        />
                      </div>
                      <div>
                        <Label style={{ color: '#D5B888' }}>Margen de Ganancia (%)</Label>
                        <Input 
                          type="number" 
                          placeholder="30" 
                          value={newProduct.marginPercentage}
                          onChange={(e) => setNewProduct({...newProduct, marginPercentage: parseInt(e.target.value) || 30})}
                        />
                      </div>
                    </div>
                    <div className="p-4 rounded-lg" style={{ backgroundColor: 'rgba(213, 184, 136, 0.1)', borderLeft: `4px solid #D5B888` }}>
                      <p className="text-sm" style={{ color: '#D5B888', fontWeight: 'bold' }}>Precio de venta calculado (Unidad): 
                        <span className="ml-2">
                          S/ {calculateSalePrice(newProduct.purchasePrice, newProduct.marginPercentage).toFixed(2)}
                        </span>
                      </p>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label style={{ color: '#9AAD97' }}>Unidades por Blíster</Label>
                        <Input 
                          type="number" 
                          placeholder="10" 
                          value={newProduct.unitsPerBlister}
                          onChange={(e) => setNewProduct({...newProduct, unitsPerBlister: parseInt(e.target.value) || 10})}
                        />
                      </div>
                      <div>
                        <Label style={{ color: '#D5B888' }}>Blísteres por Caja</Label>
                        <Input 
                          type="number" 
                          placeholder="10" 
                          value={newProduct.blistersPerBox}
                          onChange={(e) => setNewProduct({...newProduct, blistersPerBox: parseInt(e.target.value) || 10})}
                        />
                      </div>
                    </div>
                    
                    <div className="p-4 rounded-lg space-y-2" style={{ backgroundColor: 'rgba(154, 173, 151, 0.1)', borderLeft: `4px solid #9AAD97` }}>
                      <p className="text-sm" style={{ color: '#9AAD97', fontWeight: 'bold' }}>Precio Blíster (5% desc): 
                        <span className="ml-2">
                          S/ {(calculateSalePrice(newProduct.purchasePrice, newProduct.marginPercentage) * newProduct.unitsPerBlister * 0.95).toFixed(2)}
                        </span>
                      </p>
                      <p className="text-sm" style={{ color: '#9AAD97', fontWeight: 'bold' }}>Precio Caja (10% desc): 
                        <span className="ml-2">
                          S/ {(calculateSalePrice(newProduct.purchasePrice, newProduct.marginPercentage) * newProduct.unitsPerBlister * newProduct.blistersPerBox * 0.90).toFixed(2)}
                        </span>
                      </p>
                    </div>
                  </TabsContent>

                  <TabsContent value="ubicacion" className="space-y-4">
                    <div>
                      <Label>Ubicación/Estante</Label>
                      <Select value={newProduct.location} onValueChange={(v: any) => setNewProduct({...newProduct, location: v, shelf: v})}>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar ubicación" />
                        </SelectTrigger>
                        <SelectContent>
                          {locations.slice(1).map((loc) => (
                            <SelectItem key={loc} value={loc}>{loc}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Código de Estante</Label>
                      <Input 
                        placeholder="A1" 
                        value={newProduct.shelf}
                        onChange={(e) => setNewProduct({...newProduct, shelf: e.target.value})}
                      />
                    </div>
                  </TabsContent>
                </Tabs>
                <Button className="w-full" onClick={handleAddProduct} style={{ backgroundColor: '#9AAD97', color: 'white', border: 'none' }}>Guardar Producto</Button>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card style={{ borderTop: '4px solid #D5B888' }}>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg" style={{ backgroundColor: 'rgba(213, 184, 136, 0.1)' }}>
                <Package className="h-6 w-6" style={{ color: '#D5B888' }} />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Productos</p>
                <p className="text-2xl" style={{ color: '#D5B888', fontWeight: 'bold' }}>{products.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card style={{ borderTop: '4px solid #9AAD97' }}>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg" style={{ backgroundColor: 'rgba(154, 173, 151, 0.1)' }}>
                <AlertTriangle className="h-6 w-6" style={{ color: '#9AAD97' }} />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Stock Bajo</p>
                <p className="text-2xl" style={{ color: '#9AAD97', fontWeight: 'bold' }}>{lowStockCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card style={{ borderTop: '4px solid #D5B888' }}>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg" style={{ backgroundColor: 'rgba(213, 184, 136, 0.1)' }}>
                <Package className="h-6 w-6" style={{ color: '#D5B888' }} />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Valor Inventario</p>
                <p className="text-2xl" style={{ color: '#D5B888', fontWeight: 'bold' }}>S/ {products.reduce((sum, p) => sum + ((p.priceUnit || 0) * (p.stock || 0)), 0).toFixed(0)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card style={{ borderTop: '4px solid #9AAD97' }}>
        <CardHeader>
          <CardTitle style={{ color: '#9AAD97' }}>Lista de Productos</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nombre, código o marca..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Input
              placeholder="Buscar por código exacto..."
              value={codeSearch}
              onChange={(e) => handleCodeSearch(e.target.value)}
              className="w-[200px]"
            />
            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Categoría" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las categorías</SelectItem>
                {categories.slice(1).map((cat) => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterLocation} onValueChange={setFilterLocation}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Ubicación" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                {locations.slice(1).map((loc) => (
                  <SelectItem key={loc} value={loc}>{loc}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              onClick={() => setFilterLowStock(!filterLowStock)}
              style={{
                backgroundColor: filterLowStock ? '#D5B888' : 'transparent',
                color: filterLowStock ? 'white' : '#D5B888',
                borderColor: '#D5B888',
                border: '1px solid #D5B888'
              }}
            >
              <Filter className="h-4 w-4 mr-2" />
              Bajo Stock
            </Button>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Categoría</TableHead>
                  <TableHead>Marca</TableHead>
                  <TableHead>Stock Actual</TableHead>
                  <TableHead>Stock Mínimo</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Precio Caja</TableHead>
                  <TableHead>Precio Compra</TableHead>
                  <TableHead>Precio Unitario</TableHead>
                  <TableHead>Precio Blíster</TableHead>
                  <TableHead>Precio Caja Venta</TableHead>
                  <TableHead>Unidades Blíster</TableHead>
                  <TableHead>Blisters Caja</TableHead>
                  <TableHead>Vencimiento</TableHead>
                  <TableHead>Ubicación</TableHead>
                  <TableHead>Estante</TableHead>
                  <TableHead>Valor Total</TableHead>
                  <TableHead>Ganancia</TableHead>
                  <TableHead>Compra</TableHead>
                  <TableHead>Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProducts.map((product) => (
                  <TableRow key={product.id}>
                    <TableCell>{product.id}</TableCell>
                    <TableCell>{product.name}</TableCell>
                    <TableCell>{product.category}</TableCell>
                    <TableCell>{product.brand}</TableCell>
                    <TableCell>{product.stock}</TableCell>
                    <TableCell>{product.minStock}</TableCell>
                    <TableCell>{product.estado}</TableCell>
                    <TableCell style={{ color: '#D5B888', fontWeight: 'bold' }}>S/ {((product.precio_caja ?? product.priceBox) || 0).toFixed(2)}</TableCell>
                    <TableCell style={{ color: '#9AAD97', fontWeight: 'bold' }}>S/ {((product.precio_compra ?? product.purchasePrice) || 0).toFixed(2)}</TableCell>
                    <TableCell style={{ color: '#D5B888', fontWeight: 'bold' }}>S/ {((product.precio_unitario ?? product.priceUnit) || 0).toFixed(2)}</TableCell>
                    <TableCell style={{ color: '#9AAD97', fontWeight: 'bold' }}>S/ {((product.precio_blister ?? product.priceBlister) || 0).toFixed(2)}</TableCell>
                    <TableCell style={{ color: '#D5B888', fontWeight: 'bold' }}>S/ {((product.precio_caja_venta ?? product.priceBox) || 0).toFixed(2)}</TableCell>
                    <TableCell>{product.unidades_blister ?? product.unitsPerBlister ?? 0}</TableCell>
                    <TableCell>{product.blisters_caja ?? product.blistersPerBox ?? 0}</TableCell>
                    <TableCell>{product.vencimiento ?? product.expiry}</TableCell>
                    <TableCell>{product.ubicacion ?? product.location}</TableCell>
                    <TableCell>{product.estante ?? product.shelf}</TableCell>
                    <TableCell>S/ {((product.valor_total ?? product.stock * ((product.precio_compra ?? product.purchasePrice) || 0)) || 0).toFixed(2)}</TableCell>
                    <TableCell>S/ {(product.ganancia ?? 0).toFixed(2)}</TableCell>
                    <TableCell>S/ {((product.compra ?? product.purchasePrice) || 0).toFixed(2)}</TableCell>
                    <TableCell>
                      {isVendedor ? (
                        <Lock className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button 
                              size="sm" 
                              variant="ghost"
                              onClick={() => setEditingProduct(product)}
                              style={{ color: '#D5B888' }}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle style={{ color: '#D5B888' }}>Editar Producto</DialogTitle>
                            </DialogHeader>
                            {editingProduct && (
                              <div className="space-y-4">
                                <div>
                                  <Label style={{ color: '#9AAD97', fontWeight: 'bold' }}>Stock</Label>
                                  <Input
                                    type="number"
                                    value={editingProduct.stock}
                                    onChange={(e) => setEditingProduct({
                                      ...editingProduct,
                                      stock: parseInt(e.target.value) || 0
                                    })}
                                  />
                                </div>
                                <div>
                                  <Label style={{ color: '#D5B888', fontWeight: 'bold' }}>Precio Unitario</Label>
                                  <Input
                                    type="number"
                                    step="0.01"
                                    value={editingProduct.priceUnit}
                                    onChange={(e) => setEditingProduct({
                                      ...editingProduct,
                                      priceUnit: parseFloat(e.target.value) || 0
                                    })}
                                  />
                                </div>
                                <Button className="w-full" onClick={handleUpdateProduct} style={{ backgroundColor: '#9AAD97', color: 'white', border: 'none' }}>
                                  Actualizar Producto
                                </Button>
                              </div>
                            )}
                          </DialogContent>
                        </Dialog>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
