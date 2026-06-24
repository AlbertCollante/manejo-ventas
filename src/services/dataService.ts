// Servicio para manejar datos en localStorage y JSON
import contabilidadData from '../data/contabilidad.json';
import aperturaData from '../data/apertura_caja.json';

export interface Sale {
  id: string;
  date: string;
  dateOnly: string;
  customer: string;
  dni: string;
  items: any[];
  subtotal: number;
  discount: number;
  total: number;
  paymentAmount: number;
  vuelto: number;
  paymentMethod: string;
  user: string;
}

export interface Product {
  id: number;
  code: string;
  name: string;
  category: string;
  brand: string;
  stock: number;
  minStock: number;
  purchasePrice: number;
  price?: number;
  priceUnit: number;
  priceBlister: number;
  priceBox: number;
  unitsPerBlister: number;
  blistersPerBox: number;
  expiry: string;
  location: string;
  shelf: string;
}

export interface Coupon {
  code: string;
  discount: number;
  type: string;
  description: string;
  minAmount: number;
  maxDiscount: number;
}

export interface CierreCaja {
  id: number;
  fecha: string;
  fechaIso?: string;
  usuario: string;
  montoInicial: number;
  totalVentas: number;
  montosContados: {
    efectivo: number;
    yape: number;
    tarjeta: number;
    transferencia: number;
  };
  totalContado: number;
  diferencia: number;
  observaciones: string;
  ventasDelDia: any[];
  aperturaId?: number; // Vincular al ID de apertura
}

export interface AperturaCaja {
  id: number;
  fecha: string;
  usuario: string;
  montoInicial: number;
  observaciones: string;
  estado: 'abierto' | 'cerrado';
}

const STORAGE_KEYS = {
  SALES: 'botica_sales',
  PRODUCTS: 'botica_products',
  COUPONS: 'botica_coupons',
  CASH_CLOSURES: 'botica_cash_closures',
  CASH_OPENINGS: 'botica_cash_openings',
};

class DataService {
  // ==================== SALES ====================
  
  getSales(): Sale[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.SALES);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Error al obtener ventas:', error);
      return [];
    }
  }

  addSale(sale: Sale): void {
    try {
      const sales = this.getSales();
      sales.push(sale);
      localStorage.setItem(STORAGE_KEYS.SALES, JSON.stringify(sales));
    } catch (error) {
      console.error('Error al guardar venta:', error);
    }
  }

  updateSale(saleId: string, updatedSale: Sale): void {
    try {
      const sales = this.getSales();
      const index = sales.findIndex(s => s.id === saleId);
      if (index !== -1) {
        sales[index] = updatedSale;
        localStorage.setItem(STORAGE_KEYS.SALES, JSON.stringify(sales));
      }
    } catch (error) {
      console.error('Error al actualizar venta:', error);
    }
  }

  deleteSale(saleId: string): void {
    try {
      const sales = this.getSales();
      const filtered = sales.filter(s => s.id !== saleId);
      localStorage.setItem(STORAGE_KEYS.SALES, JSON.stringify(filtered));
    } catch (error) {
      console.error('Error al eliminar venta:', error);
    }
  }

  getSaleById(saleId: string): Sale | null {
    const sales = this.getSales();
    return sales.find(s => s.id === saleId) || null;
  }

  getSalesByDateRange(startDate: string, endDate: string): Sale[] {
    const sales = this.getSales();
    return sales.filter(s => s.dateOnly >= startDate && s.dateOnly <= endDate);
  }

  getSalesByUser(userName: string): Sale[] {
    const sales = this.getSales();
    return sales.filter(s => s.user === userName);
  }

  getSalesToday(): Sale[] {
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    return this.getSalesByDateRange(today, today);
  }

  // Obtener ventas desde una hora específica (para cierre de caja)
  getSalesSinceOpening(openingDateTime: string | Date): Sale[] {
    const sales = this.getSales();
    const openingDate = typeof openingDateTime === 'string' 
      ? new Date(openingDateTime) 
      : openingDateTime;

    if (isNaN(openingDate.getTime())) {
      console.error('Hora de apertura inválida, retornando todas las ventas del día');
      return this.getSalesToday();
    }

    // Filtrar ventas que ocurrieron después de la apertura
    return sales.filter(s => {
      // El formato de fecha es "DD/MM/YYYY HH:MM:SS"
      const [dateStr, timeStr] = s.date.split(' ');
      if (!dateStr || !timeStr) return false;

      const [day, month, year] = dateStr.split('/');
      const [hour, minute, second] = timeStr.split(':');
      
      if (!day || !month || !year || !hour || !minute || !second) return false;

      const saleDate = new Date(
        parseInt(year),
        parseInt(month) - 1,
        parseInt(day),
        parseInt(hour),
        parseInt(minute),
        parseInt(second)
      );

      return saleDate >= openingDate;
    });
  }

  // ==================== PRODUCTS ====================

  getProducts(): Product[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.PRODUCTS);
      const products = data ? JSON.parse(data) : [];
      // Normalizar productos para asegurar que tengan price
      return products.map((p: any) => ({
        ...p,
        price: p.price || p.priceUnit || 0
      }));
    } catch (error) {
      console.error('Error al obtener productos:', error);
      return [];
    }
  }

  addProduct(product: Product): void {
    try {
      const products = this.getProducts();
      product.id = Math.max(...products.map(p => p.id), 0) + 1;
      products.push(product);
      localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(products));
    } catch (error) {
      console.error('Error al guardar producto:', error);
    }
  }

  updateProduct(productId: number, updatedProduct: Product): void {
    try {
      const products = this.getProducts();
      const index = products.findIndex(p => p.id === productId);
      if (index !== -1) {
        products[index] = updatedProduct;
        localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(products));
      }
    } catch (error) {
      console.error('Error al actualizar producto:', error);
    }
  }

  deleteProduct(productId: number): void {
    try {
      const products = this.getProducts();
      const filtered = products.filter(p => p.id !== productId);
      localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(filtered));
    } catch (error) {
      console.error('Error al eliminar producto:', error);
    }
  }

  getProductById(productId: number): Product | null {
    const products = this.getProducts();
    return products.find(p => p.id === productId) || null;
  }

  // ==================== COUPONS ====================

  getCoupons(): Coupon[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.COUPONS);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Error al obtener cupones:', error);
      return [];
    }
  }

  addCoupon(coupon: Coupon): void {
    try {
      const coupons = this.getCoupons();
      coupons.push(coupon);
      localStorage.setItem(STORAGE_KEYS.COUPONS, JSON.stringify(coupons));
    } catch (error) {
      console.error('Error al guardar cupón:', error);
    }
  }

  updateCoupon(couponCode: string, updatedCoupon: Coupon): void {
    try {
      const coupons = this.getCoupons();
      const index = coupons.findIndex(c => c.code === couponCode);
      if (index !== -1) {
        coupons[index] = updatedCoupon;
        localStorage.setItem(STORAGE_KEYS.COUPONS, JSON.stringify(coupons));
      }
    } catch (error) {
      console.error('Error al actualizar cupón:', error);
    }
  }

  deleteCoupon(couponCode: string): void {
    try {
      const coupons = this.getCoupons();
      const filtered = coupons.filter(c => c.code !== couponCode);
      localStorage.setItem(STORAGE_KEYS.COUPONS, JSON.stringify(filtered));
    } catch (error) {
      console.error('Error al eliminar cupón:', error);
    }
  }

  getCouponByCode(code: string): Coupon | null {
    const coupons = this.getCoupons();
    return coupons.find(c => c.code.toUpperCase() === code.toUpperCase()) || null;
  }

  // ==================== CASH CLOSURES ====================

  getCashClosures(): CierreCaja[] {
    try {
      // Cargar datos del JSON
      const jsonCierre = (contabilidadData as any).cierres_caja || [];
      // Cargar datos de localStorage (cambios durante la sesión)
      const storageCierre = localStorage.getItem(STORAGE_KEYS.CASH_CLOSURES);
      const storageCierres = storageCierre ? JSON.parse(storageCierre) : [];
      
      // Combinar: primero JSON, luego nuevos de localStorage
      const combinados = [...jsonCierre, ...storageCierres];
      
      // Eliminar duplicados por ID
      const unique = combinados.filter((c, index, self) =>
        index === self.findIndex((cc) => cc.id === c.id)
      );
      
      return unique.sort((a, b) => b.id - a.id); // Ordenar descendente
    } catch (error) {
      console.error('Error al obtener cierres de caja:', error);
      return [];
    }
  }

  addCashClosure(closure: CierreCaja): void {
    try {
      const allClosures = this.getCashClosures();
      // Generar ID basado en el mayor ID existente
      closure.id = Math.max(...allClosures.map(c => c.id), 0) + 1;
      
      // Solo guardar en localStorage los nuevos (que no están en JSON)
      const storageCierre = localStorage.getItem(STORAGE_KEYS.CASH_CLOSURES);
      const storageCierres = storageCierre ? JSON.parse(storageCierre) : [];
      storageCierres.push(closure);
      localStorage.setItem(STORAGE_KEYS.CASH_CLOSURES, JSON.stringify(storageCierres));
    } catch (error) {
      console.error('Error al guardar cierre de caja:', error);
    }
  }

  getCashClosuresByDate(dateOnly: string): CierreCaja[] {
    const closures = this.getCashClosures();
    return closures.filter(c => c.fecha.startsWith(dateOnly.replace(/\//g, '-')));
  }

  getCashClosuresByDateRange(startDate: string, endDate: string): CierreCaja[] {
    const closures = this.getCashClosures();
    
    return closures.filter(c => {
      // Convertir fecha del cierre "DD/MM/YYYY HH:MM:SS" a "YYYY-MM-DD"
      const [datePart] = c.fecha.split(' ');
      const [day, month, year] = datePart.split('/');
      const closureDateFormatted = `${year}-${month}-${day}`;
      
      // Comparar con las fechas del input (YYYY-MM-DD)
      return closureDateFormatted >= startDate && closureDateFormatted <= endDate;
    });
  }

  getCashClosuresByUser(userName: string): CierreCaja[] {
    const closures = this.getCashClosures();
    return closures.filter(c => c.usuario === userName);
  }

  getTodayCashClosure(): CierreCaja | null {
    const today = new Date();
    const dateStr = today.toLocaleDateString('es-PE');
    const closures = this.getCashClosures();
    return closures.find(c => c.fecha.startsWith(dateStr)) || null;
  }

  // ==================== CASH OPENINGS ====================

  getCashOpenings(): AperturaCaja[] {
    try {
      // Cargar datos del JSON
      const jsonApertura = (aperturaData as any).aperturas || [];
      // Cargar datos de localStorage (cambios durante la sesión)
      const storageApertura = localStorage.getItem(STORAGE_KEYS.CASH_OPENINGS);
      const storageAperturas = storageApertura ? JSON.parse(storageApertura) : [];
      
      // Combinar: primero JSON, luego nuevos de localStorage
      const combinados = [...jsonApertura, ...storageAperturas];
      
      // Eliminar duplicados por ID
      const unique = combinados.filter((a, index, self) =>
        index === self.findIndex((aa) => aa.id === a.id)
      );
      
      return unique.sort((a, b) => b.id - a.id); // Ordenar descendente
    } catch (error) {
      console.error('Error al obtener aperturas de caja:', error);
      return [];
    }
  }

  addCashOpening(opening: AperturaCaja): void {
    try {
      const allOpenings = this.getCashOpenings();
      // Generar ID basado en el mayor ID existente
      opening.id = Math.max(...allOpenings.map(a => a.id), 0) + 1;
      
      // Solo guardar en localStorage los nuevos (que no están en JSON)
      const storageApertura = localStorage.getItem(STORAGE_KEYS.CASH_OPENINGS);
      const storageAperturas = storageApertura ? JSON.parse(storageApertura) : [];
      storageAperturas.push(opening);
      localStorage.setItem(STORAGE_KEYS.CASH_OPENINGS, JSON.stringify(storageAperturas));
    } catch (error) {
      console.error('Error al guardar apertura de caja:', error);
    }
  }

  getTodayOpening(): AperturaCaja | null {
    const today = new Date();
    const dateStr = today.toLocaleDateString('es-PE');
    const openings = this.getCashOpenings();
    // Retornar solo la apertura que está abierta del día actual
    return openings.find(a => a.fecha.startsWith(dateStr) && a.estado === 'abierto') || null;
  }

  getCashOpeningById(id: number): AperturaCaja | undefined {
    const openings = this.getCashOpenings();
    return openings.find(a => a.id === id);
  }

  updateCashOpeningStatus(id: number, newStatus: 'abierto' | 'cerrado'): void {
    try {
      // Obtener todas las aperturas del localStorage
      const storageApertura = localStorage.getItem(STORAGE_KEYS.CASH_OPENINGS);
      const storageAperturas = storageApertura ? JSON.parse(storageApertura) : [];
      
      // Buscar y actualizar la apertura
      const index = storageAperturas.findIndex((a: AperturaCaja) => a.id === id);
      if (index !== -1) {
        storageAperturas[index].estado = newStatus;
        localStorage.setItem(STORAGE_KEYS.CASH_OPENINGS, JSON.stringify(storageAperturas));
      }
    } catch (error) {
      console.error('Error al actualizar estado de apertura de caja:', error);
    }
  }

  getCashOpeningsByUser(userName: string): AperturaCaja[] {
    const openings = this.getCashOpenings();
    return openings.filter(a => a.usuario === userName);
  }

  // ==================== UTILITY ====================

  // Inicializar con datos por defecto si no existen
  initializeDefaultData(): void {
    if (!localStorage.getItem(STORAGE_KEYS.PRODUCTS)) {
      const defaultProducts = [
        { 
          id: 1, code: "MED001", name: "Paracetamol 500mg", category: "Analgésicos", brand: "Farmex",
          stock: 150, minStock: 50, purchasePrice: 1.50, price: 2.50, priceUnit: 2.50, priceBlister: 22.50, priceBox: 200.00,
          unitsPerBlister: 10, blistersPerBox: 10, expiry: "12/2026", location: "Estante A1", shelf: "A1"
        },
        { 
          id: 2, code: "MED002", name: "Ibuprofeno 400mg", category: "Antiinflamatorios", brand: "Bayer",
          stock: 8, minStock: 30, purchasePrice: 2.50, price: 3.80, priceUnit: 3.80, priceBlister: 35.00, priceBox: 320.00,
          unitsPerBlister: 10, blistersPerBox: 10, expiry: "08/2025", location: "Estante A2", shelf: "A2"
        },
        { 
          id: 3, code: "MED003", name: "Amoxicilina 500mg", category: "Antibióticos", brand: "Labsur",
          stock: 12, minStock: 40, purchasePrice: 10.00, price: 15.50, priceUnit: 15.50, priceBlister: 140.00, priceBox: 1200.00,
          unitsPerBlister: 10, blistersPerBox: 10, expiry: "03/2026", location: "Estante B1", shelf: "B1"
        },
        { 
          id: 4, code: "MED004", name: "Loratadina 10mg", category: "Antihistamínicos", brand: "Roemmers",
          stock: 20, minStock: 25, purchasePrice: 6.50, price: 8.90, priceUnit: 8.90, priceBlister: 80.10, priceBox: 720.90,
          unitsPerBlister: 10, blistersPerBox: 10, expiry: "06/2026", location: "Estante B2", shelf: "B2"
        },
        { 
          id: 5, code: "MED005", name: "Omeprazol 20mg", category: "Antiácidos", brand: "Pfizer",
          stock: 95, minStock: 35, purchasePrice: 9.00, price: 12.00, priceUnit: 12.00, priceBlister: 108.00, priceBox: 972.00,
          unitsPerBlister: 10, blistersPerBox: 10, expiry: "10/2026", location: "Estante C1", shelf: "C1"
        },
        { 
          id: 6, code: "MED006", name: "Diclofenaco 50mg", category: "Antiinflamatorios", brand: "Novartis",
          stock: 18, minStock: 20, purchasePrice: 3.00, price: 4.50, priceUnit: 4.50, priceBlister: 40.50, priceBox: 364.50,
          unitsPerBlister: 10, blistersPerBox: 10, expiry: "05/2026", location: "Estante C2", shelf: "C2"
        }
      ];
      localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(defaultProducts));
    }

    if (!localStorage.getItem(STORAGE_KEYS.COUPONS)) {
      const defaultCoupons = [
        { code: "DESC10", discount: 10, type: "percentage", description: "10% de descuento", minAmount: 50, maxDiscount: 100 },
        { code: "PRIMERAVEZ", discount: 15, type: "percentage", description: "15% para nuevos clientes", minAmount: 100, maxDiscount: 200 },
        { code: "VERANO2025", discount: 20, type: "fixed", description: "S/ 20 de descuento", minAmount: 80, maxDiscount: 20 },
      ];
      localStorage.setItem(STORAGE_KEYS.COUPONS, JSON.stringify(defaultCoupons));
    }

    if (!localStorage.getItem(STORAGE_KEYS.SALES)) {
      localStorage.setItem(STORAGE_KEYS.SALES, JSON.stringify([]));
    }

    if (!localStorage.getItem(STORAGE_KEYS.CASH_CLOSURES)) {
      localStorage.setItem(STORAGE_KEYS.CASH_CLOSURES, JSON.stringify([]));
    }

    if (!localStorage.getItem(STORAGE_KEYS.CASH_OPENINGS)) {
      localStorage.setItem(STORAGE_KEYS.CASH_OPENINGS, JSON.stringify([]));
    }
  }

  // Limpiar todo (útil para desarrollo/testing)
  clearAllData(): void {
    localStorage.removeItem(STORAGE_KEYS.SALES);
    localStorage.removeItem(STORAGE_KEYS.PRODUCTS);
    localStorage.removeItem(STORAGE_KEYS.COUPONS);
  }

  // Exportar datos como JSON
  exportAllData(): object {
    return {
      sales: this.getSales(),
      products: this.getProducts(),
      coupons: this.getCoupons(),
      cashClosures: this.getCashClosures(),
    };
  }
}



export const dataService = new DataService();
