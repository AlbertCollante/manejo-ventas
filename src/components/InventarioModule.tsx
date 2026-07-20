import { useState, useEffect, useRef } from "react";
import * as XLSX from "xlsx";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { Search, Plus, Edit, AlertTriangle, Package, Download, Filter, Lock, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";
import { Label } from "./ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";

const API_BASE = 'http://localhost:9000';

const normalizeApiProduct = (product: any) => {
  const stock = Number(product.stock_actual ?? product.stock ?? 0);
  const stockInicial = Number(product.stock_inicial ?? product.stockInicial ?? stock);
  const minStock = Number(product.stock_minimo ?? product.minStock ?? 0);
  const purchasePrice = Number(product.costo_compra ?? product.precio_compra ?? product.purchasePrice ?? 0);
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
    stockInicial,
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
    stock_inicial: stockInicial,
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
    stock: 150, stockInicial: 150, minStock: 50, purchasePrice: 1.50, priceUnit: 2.50, priceBlister: 22.50, priceBox: 200.00,
    unitsPerBlister: 10, blistersPerBox: 10, expiry: "12/2026", location: "Estante A1", shelf: "A1"
  },
  { 
    id: 2, code: "MED002", name: "Ibuprofeno 400mg", category: "Antiinflamatorios", brand: "Bayer",
    stock: 8, stockInicial: 8, minStock: 30, purchasePrice: 2.50, priceUnit: 3.80, priceBlister: 35.00, priceBox: 320.00,
    unitsPerBlister: 10, blistersPerBox: 10, expiry: "08/2025", location: "Estante A2", shelf: "A2"
  },
  { 
    id: 3, code: "MED003", name: "Amoxicilina 500mg", category: "Antibióticos", brand: "Labsur",
    stock: 12, stockInicial: 12, minStock: 40, purchasePrice: 10.00, priceUnit: 15.50, priceBlister: 140.00, priceBox: 1200.00,
    unitsPerBlister: 10, blistersPerBox: 10, expiry: "03/2026", location: "Estante B1", shelf: "B1"
  },
  { 
    id: 4, code: "MED004", name: "Loratadina 10mg", category: "Antihistamínicos", brand: "Roemmers",
    stock: 50, stockInicial: 50, minStock: 25, purchasePrice: 6.50, priceUnit: 8.90, priceBlister: 80.10, priceBox: 720.90,
    unitsPerBlister: 10, blistersPerBox: 10, expiry: "06/2026", location: "Estante B2", shelf: "B2"
  },
  { 
    id: 5, code: "MED005", name: "Omeprazol 20mg", category: "Antiácidos", brand: "Pfizer",
    stock: 95, stockInicial: 95, minStock: 35, purchasePrice: 9.00, priceUnit: 12.00, priceBlister: 108.00, priceBox: 972.00,
    unitsPerBlister: 10, blistersPerBox: 10, expiry: "10/2026", location: "Estante C1", shelf: "C1"
  },
  { 
    id: 6, code: "MED006", name: "Diclofenaco 50mg", category: "Antiinflamatorios", brand: "Novartis",
    stock: 45, stockInicial: 45, minStock: 20, purchasePrice: 3.00, priceUnit: 4.50, priceBlister: 40.50, priceBox: 364.50,
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
  stockInicial: number;
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
  costo_compra?: number;
  precio_compra?: number;
  precio_unitario?: number;
  precio_blister?: number;
  precio_caja_venta?: number;
  unidades_blister?: number;
  blisters_caja?: number;
  stock_inicial?: number;
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
    stockInicial: typeof product.stockInicial === 'number' ? product.stockInicial : (typeof product.stock === 'number' ? product.stock : 0),
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
  const [filterShelf, setFilterShelf] = useState("all");
  const [shelfInput, setShelfInput] = useState("");
  const [shelfDropdownOpen, setShelfDropdownOpen] = useState(false);
  const shelfFilterRef = useRef<HTMLDivElement>(null);
  const [filterLowStock, setFilterLowStock] = useState(false);

  // Sincronizar input de estante con filtro seleccionado y cerrar al hacer click fuera
  useEffect(() => {
    setShelfInput(filterShelf === "all" ? "" : filterShelf);
  }, [filterShelf]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (shelfFilterRef.current && !shelfFilterRef.current.contains(event.target as Node)) {
        setShelfDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [codeSearch, setCodeSearch] = useState("");
  
  const [newProduct, setNewProduct] = useState({
    marca: "",
    nombre: "",
    categoria: "",
    estante: "",
    stock_actual: 0,
    stock_inicial: 0,
    stock_minimo: 0,
    vencimiento: "",
    precio_caja: 0,
    costo_compra: 0,
    precio_unitario: 0,
    precio_blister: 0
  });

  const [addProductLoading, setAddProductLoading] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);

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
  const shelves = ["all", ...Array.from(new Set(products.map(p => p.shelf || p.estante).filter(Boolean))).sort((a, b) => a.localeCompare(b))];
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
    const matchesShelf = filterShelf === "all" ||
      (p.shelf || "").toLowerCase().startsWith((filterShelf || "").toLowerCase()) ||
      (p.estante || "").toLowerCase().startsWith((filterShelf || "").toLowerCase());
    const matchesLowStock = !filterLowStock || (p.stock || 0) <= (p.minStock || 0);
    return matchesSearch && matchesCategory && matchesShelf && matchesLowStock;
  });

  const lowStockCount = products.filter(p => (p.stock || 0) <= (p.minStock || 0)).length;

  // Calcular precio de venta basado en precio de compra
  const calculateSalePrice = (purchasePrice: number, margin: number) => {
    const price = typeof purchasePrice === 'number' ? purchasePrice : 0;
    const marginValue = typeof margin === 'number' ? margin : 0;
    return Math.max(0, price * (1 + marginValue / 100));
  };

  const handleAddProduct = async () => {
    // Validación de campos requeridos
    if (
      !newProduct.marca ||
      !newProduct.nombre ||
      newProduct.stock_actual === undefined ||
      newProduct.stock_minimo === undefined ||
      newProduct.costo_compra === undefined ||
      newProduct.precio_unitario === undefined
    ) {
      alert("Por favor complete todos los campos obligatorios");
      return;
    }

    setAddProductLoading(true);

    try {
      const payload: any = {
        marca: newProduct.marca,
        nombre: newProduct.nombre,
        categoria: newProduct.categoria,
        estante: newProduct.estante,
        vencimiento: newProduct.vencimiento,
        stock_actual: newProduct.stock_actual,
        stock_minimo: newProduct.stock_minimo,
        costo_compra: newProduct.costo_compra,
        precio_unitario: newProduct.precio_unitario,
      };

      if (newProduct.stock_inicial > 0) {
        payload.stock_inicial = newProduct.stock_inicial;
      }
      if (newProduct.precio_caja > 0) {
        payload.precio_caja = newProduct.precio_caja;
      }
      if (newProduct.precio_blister > 0) {
        payload.precio_blister = newProduct.precio_blister;
      }

      const response = await fetch(`${API_BASE}/agregar-producto`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Error al agregar el producto');
      }

      const result = await response.json();

      // Mostrar mensaje de éxito
      alert(`✓ Producto agregado correctamente\nID: ${result.idproducto}`);

      // Recargar los productos
      const inventarioResponse = await fetch(`${API_BASE}/inventario-productos`);
      if (inventarioResponse.ok) {
        const data = await inventarioResponse.json();
        if (Array.isArray(data)) {
          const normalized = data.map(normalizeApiProduct);
          setProducts(normalized);
          localStorage.setItem('botica_products', JSON.stringify(normalized));
        }
      }

      // Limpiar formulario
      setNewProduct({
        marca: "",
        nombre: "",
        categoria: "",
        estante: "",
        stock_actual: 0,
        stock_inicial: 0,
        stock_minimo: 0,
        vencimiento: "",
        precio_caja: 0,
        costo_compra: 0,
        precio_unitario: 0,
        precio_blister: 0
      });

    } catch (error) {
      alert(`Error: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    } finally {
      setAddProductLoading(false);
    }
  };

  const handleUpdateProduct = async () => {
    if (!editingProduct) return;
    setSaveLoading(true);
    try {
      const payload = {
        id: editingProduct.id,
        nombre: editingProduct.name,
        marca: editingProduct.brand,
        categoria: editingProduct.category,
        estante: editingProduct.shelf,
        stock_actual: editingProduct.stock,
        stock_inicial: editingProduct.stockInicial,
        stock_minimo: editingProduct.minStock,
        costo_compra: editingProduct.purchasePrice,
        precio_unitario: editingProduct.priceUnit,
        precio_blister: editingProduct.priceBlister,
        precio_caja: editingProduct.priceBox,
        unidades_blister: editingProduct.unitsPerBlister,
        blisters_caja: editingProduct.blistersPerBox,
        vencimiento: editingProduct.expiry,
        ubicacion: editingProduct.location,
      };

      const response = await fetch(`${API_BASE}/actualizar-producto`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Error al actualizar producto');
      }

      const invRes = await fetch(`${API_BASE}/inventario-productos`);
      if (invRes.ok) {
        const data = await invRes.json();
        if (Array.isArray(data)) {
          const normalized = data.map(normalizeApiProduct);
          setProducts(normalized);
          localStorage.setItem('botica_products', JSON.stringify(normalized));
        }
      }

      setEditingProduct(null);
      setEditDialogOpen(false);
      alert("Producto actualizado exitosamente");
    } catch (error) {
      alert(`Error: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    } finally {
      setSaveLoading(false);
    }
  };

  const handleDeleteProduct = async () => {
    if (!editingProduct) return;

    const confirmed = window.confirm(
      `¿Estás seguro de eliminar el producto "${editingProduct.name}"? Esta acción no se puede deshacer.`
    );
    if (!confirmed) return;

    setDeleteLoading(true);

    try {
      const response = await fetch(`${API_BASE}/eliminar-producto/${editingProduct.id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Error al eliminar el producto');
      }

      setProducts((prev) => prev.filter((p) => p.id !== editingProduct.id));
      localStorage.setItem('botica_products', JSON.stringify(products.filter((p) => p.id !== editingProduct.id)));

      setEditingProduct(null);
      setEditDialogOpen(false);
      alert('Producto eliminado exitosamente');
    } catch (error) {
      alert(`Error: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    } finally {
      setDeleteLoading(false);
    }
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
      "Stock Inicial": p.stockInicial || p.stock || 0,
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
      { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 14 },
      { wch: 12 }, { wch: 14 }, { wch: 14 }, { wch: 12 },
      { wch: 13 }, { wch: 12 }, { wch: 12 }, { wch: 18 },
      { wch: 10 }, { wch: 14 }
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
              <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle style={{ color: '#D5B888' }}>Agregar Nuevo Producto</DialogTitle>
                  <DialogDescription>
                    Complete todos los datos del nuevo producto. Los campos marcados con * son obligatorios.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  {/* Marca y Nombre */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label style={{ color: '#D5B888' }}>Marca *</Label>
                      <Input 
                        list="marcas-list"
                        placeholder="Escribir o seleccionar marca" 
                        value={newProduct.marca}
                        onChange={(e) => setNewProduct({...newProduct, marca: e.target.value})}
                      />
                      <datalist id="marcas-list">
                        {brands.map(b => (
                          <option key={b} value={b} />
                        ))}
                      </datalist>
                    </div>
                    <div>
                      <Label style={{ color: '#9AAD97' }}>Categoría</Label>
                      <Input 
                        list="categorias-list"
                        placeholder="Escribir o seleccionar categoría" 
                        value={newProduct.categoria}
                        onChange={(e) => setNewProduct({...newProduct, categoria: e.target.value})}
                      />
                      <datalist id="categorias-list">
                        {categories.slice(1).map(cat => (
                          <option key={cat} value={cat} />
                        ))}
                      </datalist>
                    </div>
                  </div>

                  {/* Nombre del producto */}
                  <div>
                    <Label style={{ color: '#D5B888' }}>Nombre del Producto *</Label>
                    <Input 
                      placeholder="Ej: Paracetamol 500mg" 
                      value={newProduct.nombre}
                      onChange={(e) => setNewProduct({...newProduct, nombre: e.target.value})}
                    />
                  </div>

                  {/* Estante */}
                  <div>
                    <Label style={{ color: '#9AAD97' }}>Estante</Label>
                    <Input 
                      placeholder="Ej: A1, B2, C3" 
                      value={newProduct.estante}
                      onChange={(e) => setNewProduct({...newProduct, estante: e.target.value})}
                    />
                  </div>

                  <div>
                    <Label style={{ color: '#9AAD97' }}>Stock Inicial</Label>
                    <Input 
                      type="number" 
                      placeholder="100 (si se deja vacío usa el stock actual)" 
                      value={newProduct.stock_inicial}
                      onChange={(e) => setNewProduct({...newProduct, stock_inicial: parseInt(e.target.value) || 0})}
                    />
                  </div>

                  {/* Stock */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label style={{ color: '#9AAD97' }}>Stock Actual *</Label>
                      <Input 
                        type="number" 
                        placeholder="100" 
                        value={newProduct.stock_actual}
                        onChange={(e) => {
                          const newStock = parseInt(e.target.value) || 0;
                          const calcCostoCompra = newStock > 0 && newProduct.precio_caja > 0
                            ? Math.round((newProduct.precio_caja / newStock) * 100) / 100
                            : newProduct.costo_compra;
                          setNewProduct({...newProduct, stock_actual: newStock, costo_compra: calcCostoCompra});
                        }}
                      />
                    </div>
                    <div>
                      <Label style={{ color: '#D5B888' }}>Stock Mínimo *</Label>
                      <Input 
                        type="number" 
                        placeholder="30" 
                        value={newProduct.stock_minimo}
                        onChange={(e) => setNewProduct({...newProduct, stock_minimo: parseInt(e.target.value) || 0})}
                      />
                    </div>
                  </div>

                  {/* Stock Inicial */}
                  

                  {/* Vencimiento */}
                  <div>
                    <Label style={{ color: '#9AAD97' }}>Fecha de Vencimiento (MM/YYYY)</Label>
                    <Input 
                      type="month"
                      value={newProduct.vencimiento ? 
                        (() => {
                          const parts = newProduct.vencimiento.split('/');
                          if (parts.length === 2) {
                            const [month, year] = parts;
                            return `${year}-${month.padStart(2, '0')}`;
                          }
                          return '';
                        })() 
                        : ''
                      }
                      onChange={(e) => {
                        const date = e.target.value;
                        if (date) {
                          const [year, month] = date.split('-');
                          setNewProduct({...newProduct, vencimiento: `${month}/${year}`});
                        } else {
                          setNewProduct({...newProduct, vencimiento: ''});
                        }
                      }}
                    />
                  </div>

                  {/* Precios */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label style={{ color: '#D5B888' }}>Costo Unitario *</Label>
                      <div className="relative mt-2">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">S/</span>
                        <Input 
                          type="number" 
                          step="0.01" 
                          placeholder="0.00" 
                          value={newProduct.costo_compra}
                          onChange={(e) => setNewProduct({...newProduct, costo_compra: parseFloat(e.target.value) || 0})}
                          className="pl-10"
                        />
                      </div>
                    </div>
                    <div>
                      <Label style={{ color: '#D5B888' }}>Costo x Caja</Label>
                      <div className="relative mt-2">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">S/</span>
                        <Input 
                          type="number" 
                          step="0.01" 
                          placeholder="0.00" 
                          value={newProduct.precio_caja}
                          onChange={(e) => {
                            const newPrecioCaja = parseFloat(e.target.value) || 0;
                            const calcCostoCompra = newPrecioCaja > 0 && newProduct.stock_actual > 0
                              ? Math.round((newPrecioCaja / newProduct.stock_actual) * 100) / 100
                              : newProduct.costo_compra;
                            setNewProduct({...newProduct, precio_caja: newPrecioCaja, costo_compra: calcCostoCompra});
                          }}
                          className="pl-10"
                        />
                      </div>
                    </div>
                    <div>
                      <Label style={{ color: '#9AAD97' }}>Precio Unitario *</Label>
                      <div className="relative mt-2">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">S/</span>
                        <Input 
                          type="number" 
                          step="0.01" 
                          placeholder="0.00" 
                          value={newProduct.precio_unitario}
                          onChange={(e) => setNewProduct({...newProduct, precio_unitario: parseFloat(e.target.value) || 0})}
                          className="pl-10"
                        />
                      </div>
                    </div>
                    <div>
                      <Label style={{ color: '#9AAD97' }}>Precio Blister</Label>
                      <div className="relative mt-2">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">S/</span>
                        <Input 
                          type="number" 
                          step="0.01" 
                          placeholder="0.00" 
                          value={newProduct.precio_blister}
                          onChange={(e) => setNewProduct({...newProduct, precio_blister: parseFloat(e.target.value) || 0})}
                          className="pl-10"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Info de cálculos automáticos */}
                  <div className="p-3 rounded-lg" style={{ backgroundColor: 'rgba(154, 173, 151, 0.1)', borderLeft: `4px solid #9AAD97` }}>
                    <p className="text-xs text-muted-foreground mb-2">Los siguientes valores se calcularán automáticamente:</p>
                    <p className="text-sm" style={{ color: '#9AAD97', fontWeight: 'bold' }}>
                      Ganancia: S/ {(newProduct.precio_unitario * newProduct.stock_actual - newProduct.costo_compra * newProduct.stock_actual).toFixed(2)}
                    </p>
                    <p className="text-sm" style={{ color: '#9AAD97', fontWeight: 'bold' }}>
                      Costo Total: S/ {(newProduct.costo_compra * newProduct.stock_actual).toFixed(2)}
                    </p>
                  </div>
                </div>

                <Button 
                  className="w-full" 
                  onClick={handleAddProduct} 
                  disabled={addProductLoading}
                  style={{ backgroundColor: '#9AAD97', color: 'white', border: 'none' }}
                >
                  {addProductLoading ? 'Guardando...' : 'Guardar Producto'}
                </Button>
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
            <div ref={shelfFilterRef} className="relative w-[180px]">
              <Input
                placeholder="Estante"
                value={shelfInput}
                onChange={(e) => {
                  const value = e.target.value;
                  setShelfInput(value);
                  setFilterShelf(value ? value : "all");
                  setShelfDropdownOpen(true);
                }}
                onFocus={() => setShelfDropdownOpen(true)}
              />
              {shelfDropdownOpen && (
                <div className="absolute z-50 mt-1 w-full rounded-md border shadow-md bg-popover text-popover-foreground max-h-60 overflow-auto p-1">
                  <div
                    className="relative flex w-full cursor-default items-center rounded-sm px-2 py-1.5 text-sm outline-none select-none hover:bg-accent hover:text-accent-foreground"
                    onClick={() => {
                      setFilterShelf("all");
                      setShelfInput("");
                      setShelfDropdownOpen(false);
                    }}
                  >
                    Todos
                  </div>
                  {shelves
                    .slice(1)
                    .filter((shelf) => shelf.toLowerCase().startsWith(shelfInput.toLowerCase()))
                    .map((shelf) => (
                      <div
                        key={shelf}
                        className="relative flex w-full cursor-default items-center rounded-sm px-2 py-1.5 text-sm outline-none select-none hover:bg-accent hover:text-accent-foreground"
                        onClick={() => {
                          setFilterShelf(shelf);
                          setShelfInput(shelf);
                          setShelfDropdownOpen(false);
                        }}
                      >
                        {shelf}
                      </div>
                    ))}
                </div>
              )}
            </div>
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

          <div className="overflow-y-auto" style={{ maxHeight: '55vh', scrollbarWidth: 'thin' }}>
            <table className="w-full text-sm border-collapse">
              <thead className="sticky top-0 z-10" style={{ backgroundColor: 'white' }}>
                <tr>
                  <th className="px-2 py-2 text-left font-medium">ID</th>
                  <th className="px-2 py-2 text-left font-medium">Nombre</th>
                  <th className="px-2 py-2 text-left font-medium">Categoría</th>
                  <th className="px-2 py-2 text-left font-medium">Marca</th>
                  <th className="px-2 py-2 text-left font-medium">Stock Inicial</th>
                  <th className="px-2 py-2 text-left font-medium">Stock Actual</th>
                  <th className="px-2 py-2 text-left font-medium">Stock Mínimo</th>
                  <th className="px-2 py-2 text-left font-medium">Estado</th>
                  <th className="px-2 py-2 text-left font-medium">Costo Caja</th>
                  <th className="px-2 py-2 text-left font-medium">Costo Unitario</th>
                  <th className="px-2 py-2 text-left font-medium">Precio Unitario</th>
                  <th className="px-2 py-2 text-left font-medium">Precio Blíster</th>
                  <th className="px-2 py-2 text-left font-medium">Vencimiento</th>
                  <th className="px-2 py-2 text-left font-medium">Estante</th>
                  <th className="px-2 py-2 text-left font-medium">Valor Total</th>
                  <th className="px-2 py-2 text-left font-medium">Ganancia</th>
                  <th className="px-2 py-2 text-left font-medium">Compra</th>
                  <th className="px-2 py-2 text-left font-medium">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.map((product) => (
                  <tr key={product.id} className="border-t">
                    <td className="px-2 py-2">{product.id}</td>
                    <td className="px-2 py-2">{product.name}</td>
                    <td className="px-2 py-2">{product.category}</td>
                    <td className="px-2 py-2">{product.brand}</td>
                    <td className="px-2 py-2">{product.stockInicial}</td>
                    <td className="px-2 py-2">{product.stock}</td>
                    <td className="px-2 py-2">{product.minStock}</td>
                    <td className="px-2 py-2">{product.estado}</td>
                    <td className="px-2 py-2" style={{ color: '#D5B888', fontWeight: 'bold' }}>S/ {((product.precio_caja ?? product.priceBox) || 0).toFixed(2)}</td>
                    <td className="px-2 py-2" style={{ color: '#9AAD97', fontWeight: 'bold' }}>S/ {((product.costo_compra ?? product.precio_compra ?? product.purchasePrice) || 0).toFixed(2)}</td>
                    <td className="px-2 py-2" style={{ color: '#D5B888', fontWeight: 'bold' }}>S/ {((product.precio_unitario ?? product.priceUnit) || 0).toFixed(2)}</td>
                    <td className="px-2 py-2" style={{ color: '#9AAD97', fontWeight: 'bold' }}>S/ {((product.precio_blister ?? product.priceBlister) || 0).toFixed(2)}</td>
                    <td className="px-2 py-2">{product.vencimiento ?? product.expiry}</td>
                    <td className="px-2 py-2">{product.estante ?? product.shelf}</td>
                    <td className="px-2 py-2">S/ {((product.valor_total ?? product.stock * ((product.costo_compra ?? product.precio_compra ?? product.purchasePrice) || 0)) || 0).toFixed(2)}</td>
                    <td className="px-2 py-2">S/ {(product.ganancia ?? 0).toFixed(2)}</td>
                    <td className="px-2 py-2">S/ {((product.costo_compra ?? product.precio_compra ?? product.purchasePrice) || 0).toFixed(2)}</td>
                    <td className="px-2 py-2">  
                      {isVendedor ? (
                        <Lock className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <Button 
                          size="sm" 
                          variant="ghost"
                          onClick={() => {
                            setEditingProduct(product);
                            setEditDialogOpen(true);
                          }}
                          style={{ color: '#D5B888' }}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Edit Product Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={(open) => {
        if (!open) { setEditDialogOpen(false); setEditingProduct(null); }
      }}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle style={{ color: '#D5B888' }}>Editar Producto</DialogTitle>
            <DialogDescription>Modifique los campos del producto.</DialogDescription>
          </DialogHeader>
          {editingProduct && (
            <div className="space-y-4">
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                <div style={{ width: '30%' }}>
                  <Label style={{ color: '#9AAD97' }}>Código</Label>
                  <Input value={editingProduct.code} onChange={(e) => setEditingProduct({...editingProduct, code: e.target.value})} />
                </div>
                <div style={{ flex: 1 }}>
                  <Label style={{ color: '#D5B888' }}>Nombre</Label>
                  <Input value={editingProduct.name} onChange={(e) => setEditingProduct({...editingProduct, name: e.target.value})} style={{ width: '100%' }} />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label style={{ color: '#9AAD97' }}>Marca</Label>
                  <Input value={editingProduct.brand} onChange={(e) => setEditingProduct({...editingProduct, brand: e.target.value})} />
                </div>
                <div>
                  <Label style={{ color: '#9AAD97' }}>Categoría</Label>
                  <Input value={editingProduct.category} onChange={(e) => setEditingProduct({...editingProduct, category: e.target.value})} />
                </div>
                <div>
                  <Label style={{ color: '#D5B888' }}>Estante</Label>
                  <Input value={editingProduct.shelf} onChange={(e) => setEditingProduct({...editingProduct, shelf: e.target.value})} />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label style={{ color: '#D5B888' }}>Stock Inicial</Label>
                  <Input type="number" value={editingProduct.stockInicial} onChange={(e) => setEditingProduct({...editingProduct, stockInicial: parseInt(e.target.value) || 0})} />
                </div>
                <div>
                  <Label style={{ color: '#9AAD97' }}>Stock Actual</Label>
                  <Input type="number" value={editingProduct.stock} onChange={(e) => setEditingProduct({...editingProduct, stock: parseInt(e.target.value) || 0})} />
                </div>
                <div>
                  <Label style={{ color: '#9AAD97' }}>Stock Mínimo</Label>
                  <Input type="number" value={editingProduct.minStock} onChange={(e) => setEditingProduct({...editingProduct, minStock: parseInt(e.target.value) || 0})} />
                </div>
              </div>
              <div>
                <Label style={{ color: '#9AAD97' }}>Vencimiento (MM/YYYY)</Label>
                <Input value={editingProduct.expiry} onChange={(e) => setEditingProduct({...editingProduct, expiry: e.target.value})} placeholder="MM/YYYY" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label style={{ color: '#D5B888' }}>Costo Unitario</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">S/</span>
                    <Input type="number" step="0.01" value={editingProduct.purchasePrice} onChange={(e) => setEditingProduct({...editingProduct, purchasePrice: parseFloat(e.target.value) || 0})} className="pl-10" />
                  </div>
                </div>
                <div>
                <Label style={{ color: '#9AAD97' }}>Costo x Caja</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">S/</span>
                  <Input type="number" step="0.01" value={editingProduct.priceBox} onChange={(e) => setEditingProduct({...editingProduct, priceBox: parseFloat(e.target.value) || 0})} className="pl-10" />
                </div>
              </div>
                <div>
                  <Label style={{ color: '#9AAD97' }}>Precio Unitario</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">S/</span>
                    <Input type="number" step="0.01" value={editingProduct.priceUnit} onChange={(e) => setEditingProduct({...editingProduct, priceUnit: parseFloat(e.target.value) || 0})} className="pl-10" />
                  </div>
                </div>
                
                <div>
                  <Label style={{ color: '#D5B888' }}>Precio Blíster</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">S/</span>
                    <Input type="number" step="0.01" value={editingProduct.priceBlister} onChange={(e) => setEditingProduct({...editingProduct, priceBlister: parseFloat(e.target.value) || 0})} className="pl-10" />
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-2 pt-2">
                <Button 
                  size="sm"
                  variant="ghost"
                  onClick={handleDeleteProduct}
                  disabled={deleteLoading}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50 px-2"
                  title="Eliminar producto"
                >
                  {deleteLoading ? (
                    <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-red-300 border-t-red-600" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                </Button>
                <Button 
                  className="flex-1" 
                  onClick={handleUpdateProduct}
                  disabled={saveLoading}
                  style={{ backgroundColor: '#9AAD97', color: 'white', border: 'none' }}
                >
                  {saveLoading ? 'Guardando...' : 'Guardar Cambios'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
