import {
    ChangeDetectorRef,
    Component,
    ElementRef,
    ViewChild,
    inject
} from '@angular/core';

import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';

import {
    MatSnackBar,
    MatSnackBarModule
} from '@angular/material/snack-bar';

import { ProductoService } from '../../../inventario/services/producto';

import {
    RegistrarVentaRequest,
    TipoComprobante,
    VentaService
} from '../../services/ventas.service';

interface ProductoVenta {
    id_producto: number;
    codigo: string;
    producto: string;
    cantidad: number;
    precio: number;
    subtotal: number;
    stockDisponible: number;
}

type EstadoConsultaDocumento =
    | 'inicial'
    | 'consultando'
    | 'encontrado'
    | 'no_encontrado'
    | 'advertencia'
    | 'error';

type TipoNotificacion =
    | 'exito'
    | 'advertencia'
    | 'error'
    | 'informacion';

@Component({
    selector: 'app-ventas',

    standalone: true,

    imports: [
        CommonModule,
        FormsModule,
        MatCardModule,
        MatFormFieldModule,
        MatInputModule,
        MatButtonModule,
        MatIconModule,
        MatTableModule,
        MatSnackBarModule
    ],

    templateUrl: './ventas.html',
    styleUrl: './ventas.scss'
})
export class Ventas {

    @ViewChild('campoCodigo')
    campoCodigo?: ElementRef<HTMLInputElement>;

    private productoService =
        inject(ProductoService);

    private ventaService =
        inject(VentaService);

    private snackBar =
        inject(MatSnackBar);

    private cdr =
        inject(ChangeDetectorRef);

    readonly displayedColumns: string[] = [
        'producto',
        'cantidad',
        'precio',
        'subtotal',
        'acciones'
    ];

    ventas: ProductoVenta[] = [];

    codigoBarras = '';

    subtotal = 0;

    igv = 0;

    total = 0;

    registrando = false;

    buscandoProducto = false;

    consultandoDocumento = false;

    tipoComprobante: TipoComprobante =
        'VENTA RAPIDA';

    numeroDocumento = '';

    nombreCliente =
        'PUBLICO GENERAL';

    direccionCliente = '';

    documentoConsultado = true;

    estadoConsultaDocumento:
        EstadoConsultaDocumento = 'inicial';

    mensajeConsultaDocumento = '';

    get cantidadProductos(): number {

        return this.ventas.length;

    }

    get cantidadUnidades(): number {

        return this.ventas.reduce(
            (
                acumulado,
                producto
            ) =>
                acumulado +
                producto.cantidad,
            0
        );

    }

    get puedeRegistrar(): boolean {

        if (
            this.ventas.length === 0 ||
            this.registrando ||
            this.buscandoProducto ||
            this.consultandoDocumento
        ) {
            return false;
        }

        if (
            this.tipoComprobante !==
            'VENTA RAPIDA'
        ) {

            return (
                this.documentoConsultado &&
                this.numeroDocumento.trim() !== ''
            );

        }

        return true;

    }

    /**
     * Buscar un producto mediante su código.
     */
    agregarProducto(): void {

        if (
            this.registrando ||
            this.buscandoProducto
        ) {
            return;
        }

        const codigo =
            this.codigoBarras.trim();

        if (!codigo) {

            this.mostrarMensaje(
                'Ingrese o escanee un código de producto.',
                'advertencia'
            );

            this.enfocarCampoCodigo();

            return;

        }

        this.buscandoProducto = true;

        this.productoService
            .buscarPorCodigo(codigo)
            .subscribe({

                next: (respuesta: any) => {

                    const producto =
                        respuesta?.data;

                    if (!producto) {

                        this.mostrarMensaje(
                            'Producto no encontrado.',
                            'advertencia'
                        );

                        this.finalizarBusquedaProducto();

                        return;

                    }

                    const stockDisponible =
                        Number(
                            producto.stock_producto ??
                            0
                        );

                    if (stockDisponible <= 0) {

                        this.mostrarMensaje(
                            'El producto no tiene stock disponible.',
                            'advertencia'
                        );

                        this.finalizarBusquedaProducto();

                        return;

                    }

                    const existente =
                        this.ventas.find(
                            item =>
                                item.id_producto ===
                                Number(
                                    producto.id_producto
                                )
                        );

                    if (existente) {

                        if (
                            existente.cantidad >=
                            existente.stockDisponible
                        ) {

                            this.mostrarMensaje(
                                `Stock máximo disponible: ${existente.stockDisponible} unidades.`,
                                'advertencia'
                            );

                            this.finalizarBusquedaProducto();

                            return;

                        }

                        existente.cantidad++;

                        existente.subtotal =
                            existente.cantidad *
                            existente.precio;

                    } else {

                        const precio =
                            Number(
                                producto.precio_producto ??
                                0
                            );

                        this.ventas.push({

                            id_producto:
                                Number(
                                    producto.id_producto
                                ),

                            codigo:
                                String(
                                    producto.codigo_producto ??
                                    codigo
                                ),

                            producto:
                                String(
                                    producto.nombre_producto ??
                                    'Producto'
                                ),

                            cantidad: 1,

                            precio,

                            subtotal: precio,

                            stockDisponible

                        });

                    }

                    this.actualizarVentaTemporal();

                    this.finalizarBusquedaProducto();

                },

                error: (error: any) => {

                    const tipo:
                        TipoNotificacion =
                        error?.status === 404
                            ? 'advertencia'
                            : 'error';

                    this.mostrarMensaje(
                        this.obtenerMensajeError(
                            error,
                            error?.status === 404
                                ? 'Producto no encontrado.'
                                : 'No se pudo consultar el producto.'
                        ),
                        tipo
                    );

                    this.finalizarBusquedaProducto();

                }

            });

    }

    /**
     * Aumentar la cantidad.
     */
    aumentarCantidad(
        producto: ProductoVenta
    ): void {

        if (this.registrando) {
            return;
        }

        if (
            producto.cantidad >=
            producto.stockDisponible
        ) {

            this.mostrarMensaje(
                `Stock máximo disponible: ${producto.stockDisponible} unidades.`,
                'advertencia'
            );

            return;

        }

        producto.cantidad++;

        producto.subtotal =
            producto.cantidad *
            producto.precio;

        this.actualizarVentaTemporal();

    }

    /**
     * Disminuir la cantidad.
     */
    disminuirCantidad(
        producto: ProductoVenta
    ): void {

        if (this.registrando) {
            return;
        }

        if (producto.cantidad > 1) {

            producto.cantidad--;

            producto.subtotal =
                producto.cantidad *
                producto.precio;

            this.actualizarVentaTemporal();

            return;

        }

        this.eliminarProducto(producto);

    }

    /**
     * Eliminar producto de la venta temporal.
     */
    eliminarProducto(
        producto: ProductoVenta
    ): void {

        if (this.registrando) {
            return;
        }

        this.ventas =
            this.ventas.filter(
                item =>
                    item.id_producto !==
                    producto.id_producto
            );

        this.calcularTotales();

        this.enfocarCampoCodigo();

    }

    /**
     * Cambiar el tipo de comprobante.
     */
    seleccionarTipoComprobante(
        tipo: TipoComprobante
    ): void {

        if (
            this.registrando ||
            this.consultandoDocumento
        ) {
            return;
        }

        this.tipoComprobante = tipo;

        this.numeroDocumento = '';

        this.direccionCliente = '';

        this.estadoConsultaDocumento =
            'inicial';

        this.mensajeConsultaDocumento = '';

        if (tipo === 'VENTA RAPIDA') {

            this.nombreCliente =
                'PUBLICO GENERAL';

            this.documentoConsultado = true;

        } else {

            this.nombreCliente = '';

            this.documentoConsultado = false;

        }

        this.cdr.detectChanges();

    }

    /**
     * Permitir solo números.
     */
    limpiarNumeroDocumento(): void {

        this.numeroDocumento =
            this.numeroDocumento.replace(
                /\D/g,
                ''
            );

        const longitudMaxima =
            this.tipoComprobante ===
            'FACTURA'
                ? 11
                : 8;

        this.numeroDocumento =
            this.numeroDocumento.substring(
                0,
                longitudMaxima
            );

        this.nombreCliente = '';

        this.direccionCliente = '';

        this.documentoConsultado = false;

        this.estadoConsultaDocumento =
            'inicial';

        this.mensajeConsultaDocumento = '';

    }

    /**
     * Consultar DNI o RUC.
     */
    consultarDocumento(): void {

        if (
            this.tipoComprobante ===
            'VENTA RAPIDA' ||
            this.consultandoDocumento ||
            this.registrando
        ) {
            return;
        }

        const documento =
            this.numeroDocumento.trim();

        if (
            this.tipoComprobante === 'BOLETA' &&
            !/^\d{8}$/.test(documento)
        ) {

            this.establecerEstadoDocumento(
                'advertencia',
                'El DNI debe contener exactamente 8 dígitos.'
            );

            return;

        }

        if (
            this.tipoComprobante === 'FACTURA' &&
            !/^\d{11}$/.test(documento)
        ) {

            this.establecerEstadoDocumento(
                'advertencia',
                'El RUC debe contener exactamente 11 dígitos.'
            );

            return;

        }

        this.consultandoDocumento = true;

        this.documentoConsultado = false;

        this.nombreCliente = '';

        this.direccionCliente = '';

        this.establecerEstadoDocumento(
            'consultando',
            this.tipoComprobante === 'BOLETA'
                ? 'Consultando DNI...'
                : 'Consultando RUC...'
        );

        if (
            this.tipoComprobante === 'BOLETA'
        ) {

            this.consultarDni(documento);

            return;

        }

        this.consultarRuc(documento);

    }

    /**
     * Consultar persona por DNI.
     */
    private consultarDni(
        dni: string
    ): void {

        this.ventaService
            .consultarDni(dni)
            .subscribe({

                next: (respuesta) => {

                    const datos =
                        respuesta?.datos;

                    const nombre = [
                        datos?.nombres,
                        datos?.apellidoPaterno,
                        datos?.apellidoMaterno
                    ]
                        .filter(Boolean)
                        .join(' ')
                        .trim();

                    if (!nombre) {

                        this.consultandoDocumento =
                            false;

                        this.documentoConsultado =
                            false;

                        this.establecerEstadoDocumento(
                            'no_encontrado',
                            'No se encontró información para el DNI ingresado.'
                        );

                        this.cdr.detectChanges();

                        return;

                    }

                    this.nombreCliente = nombre;

                    this.direccionCliente = '';

                    this.documentoConsultado = true;

                    this.consultandoDocumento = false;

                    this.establecerEstadoDocumento(
                        'encontrado',
                        'Cliente encontrado correctamente.'
                    );

                    this.cdr.detectChanges();

                },

                error: (error: any) => {

                    this.procesarErrorDocumento(
                        error,
                        'DNI'
                    );

                }

            });

    }

    /**
     * Consultar empresa por RUC.
     */
    private consultarRuc(
        ruc: string
    ): void {

        this.ventaService
            .consultarRuc(ruc)
            .subscribe({

                next: (respuesta) => {

                    const datos =
                        respuesta?.datos;

                    if (!datos?.razonSocial) {

                        this.consultandoDocumento =
                            false;

                        this.documentoConsultado =
                            false;

                        this.establecerEstadoDocumento(
                            'no_encontrado',
                            'No se encontró información para el RUC ingresado.'
                        );

                        this.cdr.detectChanges();

                        return;

                    }

                    this.nombreCliente =
                        datos.razonSocial;

                    this.direccionCliente =
                        datos.direccion ?? '';

                    if (datos.estado !== 'ACTIVO') {

                        this.consultandoDocumento =
                            false;

                        this.documentoConsultado =
                            false;

                        this.establecerEstadoDocumento(
                            'advertencia',
                            `El RUC pertenece a ${this.nombreCliente}, pero su estado es ${datos.estado || 'desconocido'}.`
                        );

                        this.cdr.detectChanges();

                        return;

                    }

                    if (datos.condicion !== 'HABIDO') {

                        this.consultandoDocumento =
                            false;

                        this.documentoConsultado =
                            false;

                        this.establecerEstadoDocumento(
                            'advertencia',
                            `El RUC pertenece a ${this.nombreCliente}, pero su condición es ${datos.condicion || 'desconocida'}.`
                        );

                        this.cdr.detectChanges();

                        return;

                    }

                    this.documentoConsultado = true;

                    this.consultandoDocumento = false;

                    this.establecerEstadoDocumento(
                        'encontrado',
                        'Empresa encontrada correctamente.'
                    );

                    this.cdr.detectChanges();

                },

                error: (error: any) => {

                    this.procesarErrorDocumento(
                        error,
                        'RUC'
                    );

                }

            });

    }

    /**
     * Clasificar el error de una consulta.
     */
    private procesarErrorDocumento(
        error: any,
        tipoDocumento: 'DNI' | 'RUC'
    ): void {

        this.consultandoDocumento = false;

        this.documentoConsultado = false;

        this.nombreCliente = '';

        this.direccionCliente = '';

        const estadoHttp =
            Number(error?.status ?? 0);

        if (estadoHttp === 404) {

            this.establecerEstadoDocumento(
                'no_encontrado',
                `No se encontró información para el ${tipoDocumento} ingresado.`
            );

        } else if (
            estadoHttp === 400 ||
            estadoHttp === 422
        ) {

            this.establecerEstadoDocumento(
                'advertencia',
                this.obtenerMensajeError(
                    error,
                    `El ${tipoDocumento} ingresado no es válido.`
                )
            );

        } else if (
            estadoHttp === 0 ||
            estadoHttp >= 500
        ) {

            this.establecerEstadoDocumento(
                'error',
                'El servicio de consulta no está disponible. Intente nuevamente.'
            );

        } else {

            this.establecerEstadoDocumento(
                'error',
                this.obtenerMensajeError(
                    error,
                    `No se pudo consultar el ${tipoDocumento}.`
                )
            );

        }

        this.cdr.detectChanges();

    }

    /**
     * Establecer el estado visual de la consulta.
     */
    private establecerEstadoDocumento(
        estado: EstadoConsultaDocumento,
        mensaje: string
    ): void {

        this.estadoConsultaDocumento =
            estado;

        this.mensajeConsultaDocumento =
            mensaje;

    }

    /**
     * Limpiar la venta temporal.
     */
    limpiarVenta(): void {

        if (this.registrando) {
            return;
        }

        this.ventas = [];

        this.codigoBarras = '';

        this.calcularTotales();

        this.enfocarCampoCodigo();

    }

    /**
     * Registrar la venta.
     */
    registrarVenta(): void {

        if (this.registrando) {
            return;
        }

        if (this.ventas.length === 0) {

            this.mostrarMensaje(
                'Debe agregar al menos un producto.',
                'advertencia'
            );

            return;

        }

        const productoSinStock =
            this.ventas.find(
                producto =>
                    producto.cantidad >
                    producto.stockDisponible
            );

        if (productoSinStock) {

            this.mostrarMensaje(
                `La cantidad de ${productoSinStock.producto} supera el stock disponible.`,
                'advertencia'
            );

            return;

        }

        if (
            this.tipoComprobante !==
            'VENTA RAPIDA'
        ) {

            if (!this.numeroDocumento.trim()) {

                this.establecerEstadoDocumento(
                    'advertencia',
                    this.tipoComprobante ===
                    'BOLETA'
                        ? 'Ingrese el DNI del cliente.'
                        : 'Ingrese el RUC de la empresa.'
                );

                return;

            }

            if (!this.documentoConsultado) {

                this.establecerEstadoDocumento(
                    'advertencia',
                    'Consulte y valide el documento antes de registrar.'
                );

                return;

            }

        }

        const datos: RegistrarVentaRequest = {

            tipo_comprobante:
                this.tipoComprobante,

            numero_documento:
                this.tipoComprobante ===
                'VENTA RAPIDA'
                    ? null
                    : this.numeroDocumento,

            detalles:
                this.ventas.map(
                    producto => ({

                        id_producto:
                            producto.id_producto,

                        cantidad:
                            producto.cantidad

                    })
                )

        };

        this.registrando = true;

        this.ventaService
            .registrar(datos)
            .subscribe({

                next: (respuesta) => {

                    this.registrando = false;

                    this.mostrarMensaje(
                        respuesta.mensaje ||
                        'Venta registrada correctamente.',
                        'exito'
                    );

                    this.reiniciarVentaCompleta();

                    this.cdr.detectChanges();

                    this.enfocarCampoCodigo();

                },

                error: (error: any) => {

                    this.registrando = false;

                    this.mostrarMensaje(
                        this.obtenerMensajeError(
                            error,
                            'No se pudo completar la venta. Intente nuevamente.'
                        ),
                        'error'
                    );

                    this.cdr.detectChanges();

                }

            });

    }

    /**
     * Calcular totales.
     */
    calcularTotales(): void {

        this.subtotal =
            this.ventas.reduce(
                (
                    acumulado,
                    producto
                ) =>
                    acumulado +
                    Number(
                        producto.subtotal
                    ),
                0
            );

        this.igv = 0;

        this.total =
            this.subtotal +
            this.igv;

    }

    /**
     * Actualizar tabla y totales.
     */
    private actualizarVentaTemporal(): void {

        this.ventas = [
            ...this.ventas
        ];

        this.calcularTotales();

    }

    /**
     * Finalizar búsqueda de producto.
     */
    private finalizarBusquedaProducto(): void {

        this.buscandoProducto = false;

        this.codigoBarras = '';

        this.cdr.detectChanges();

        this.enfocarCampoCodigo();

    }

    /**
     * Reiniciar la venta completa.
     */
    private reiniciarVentaCompleta(): void {

        this.ventas = [];

        this.codigoBarras = '';

        this.subtotal = 0;

        this.igv = 0;

        this.total = 0;

        this.tipoComprobante =
            'VENTA RAPIDA';

        this.numeroDocumento = '';

        this.nombreCliente =
            'PUBLICO GENERAL';

        this.direccionCliente = '';

        this.documentoConsultado = true;

        this.consultandoDocumento = false;

        this.buscandoProducto = false;

        this.estadoConsultaDocumento =
            'inicial';

        this.mensajeConsultaDocumento = '';

    }

    /**
     * Enfocar nuevamente el escáner.
     */
    private enfocarCampoCodigo(): void {

        setTimeout(
            () => {

                this.campoCodigo
                    ?.nativeElement
                    .focus();

            },
            100
        );

    }

    /**
     * Obtener un mensaje del backend.
     */
    private obtenerMensajeError(
        error: any,
        mensajePredeterminado: string
    ): string {

        if (error?.error?.mensaje) {
            return error.error.mensaje;
        }

        if (error?.error?.message) {
            return error.error.message;
        }

        if (error?.error?.errors) {

            const errores =
                Object.values(
                    error.error.errors
                );

            const primerError =
                errores[0];

            if (Array.isArray(primerError)) {

                return String(
                    primerError[0]
                );

            }

            if (primerError) {

                return String(
                    primerError
                );

            }

        }

        return mensajePredeterminado;

    }

    /**
     * Mostrar notificación del sistema.
     */
    private mostrarMensaje(
        mensaje: string,
        tipo: TipoNotificacion =
            'informacion'
    ): void {

        this.snackBar.open(
            mensaje,
            'Cerrar',
            {
                duration: 5000,
                horizontalPosition: 'right',
                verticalPosition: 'bottom',
                panelClass: [
                    'notificacion-sistema',
                    `notificacion-${tipo}`
                ]
            }
        );

    }

}