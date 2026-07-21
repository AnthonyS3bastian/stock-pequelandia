import {
    ChangeDetectorRef,
    Component,
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
    producto: string;
    cantidad: number;
    precio: number;
    subtotal: number;
}

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

    private productoService =
        inject(ProductoService);

    private ventaService =
        inject(VentaService);

    private snackBar =
        inject(MatSnackBar);

    private cdr =
        inject(ChangeDetectorRef);

    displayedColumns: string[] = [
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

    consultandoDocumento = false;

    tipoComprobante: TipoComprobante =
        'VENTA RAPIDA';

    numeroDocumento = '';

    nombreCliente = 'PUBLICO GENERAL';

    direccionCliente = '';

    documentoConsultado = true;

    /**
     * Buscar un producto por código y agregarlo
     * temporalmente a la venta.
     */
    agregarProducto(): void {

        if (this.registrando) {
            return;
        }

        const codigo = this.codigoBarras.trim();

        if (!codigo) {
            return;
        }

        this.productoService
            .buscarPorCodigo(codigo)
            .subscribe({

                next: (respuesta: any) => {

                    const producto =
                        respuesta.data;

                    if (!producto) {

                        this.mostrarMensaje(
                            'Producto no encontrado.'
                        );

                        this.codigoBarras = '';

                        return;

                    }

                    const existente =
                        this.ventas.find(
                            item =>
                                item.id_producto ===
                                producto.id_producto
                        );

                    if (existente) {

                        existente.cantidad++;

                        existente.subtotal =
                            existente.cantidad *
                            Number(existente.precio);

                    } else {

                        this.ventas.push({

                            id_producto:
                                producto.id_producto,

                            producto:
                                producto.nombre_producto,

                            cantidad: 1,

                            precio:
                                Number(
                                    producto.precio_producto
                                ),

                            subtotal:
                                Number(
                                    producto.precio_producto
                                )

                        });

                    }

                    this.ventas = [
                        ...this.ventas
                    ];

                    this.calcularTotales();

                    this.codigoBarras = '';

                    this.cdr.detectChanges();

                },

                error: (error: any) => {

                    const mensaje =
                        error?.error?.mensaje ??
                        'Producto no encontrado.';

                    this.mostrarMensaje(mensaje);

                    this.codigoBarras = '';

                    this.cdr.detectChanges();

                }

            });

    }

    /**
     * Aumentar la cantidad de un producto.
     */
    aumentarCantidad(
        producto: ProductoVenta
    ): void {

        if (this.registrando) {
            return;
        }

        producto.cantidad++;

        producto.subtotal =
            producto.cantidad *
            Number(producto.precio);

        this.ventas = [
            ...this.ventas
        ];

        this.calcularTotales();

    }

    /**
     * Disminuir la cantidad de un producto.
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
                Number(producto.precio);

        } else {

            this.eliminarProducto(producto);

            return;

        }

        this.ventas = [
            ...this.ventas
        ];

        this.calcularTotales();

    }

    /**
     * Eliminar un producto de la venta temporal.
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
     * Permitir solamente números en DNI o RUC.
     */
    limpiarNumeroDocumento(): void {

        this.numeroDocumento =
            this.numeroDocumento.replace(
                /\D/g,
                ''
            );

        const longitudMaxima =
            this.tipoComprobante === 'FACTURA'
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

    }

    /**
     * Consultar DNI o RUC mediante el backend.
     */
    consultarDocumento(): void {

        if (
            this.tipoComprobante ===
            'VENTA RAPIDA'
        ) {
            return;
        }

        if (this.consultandoDocumento) {
            return;
        }

        const documento =
            this.numeroDocumento.trim();

        if (
            this.tipoComprobante === 'BOLETA' &&
            !/^\d{8}$/.test(documento)
        ) {

            this.mostrarMensaje(
                'El DNI debe contener exactamente 8 dígitos.'
            );

            return;

        }

        if (
            this.tipoComprobante === 'FACTURA' &&
            !/^\d{11}$/.test(documento)
        ) {

            this.mostrarMensaje(
                'El RUC debe contener exactamente 11 dígitos.'
            );

            return;

        }

        this.consultandoDocumento = true;

        this.nombreCliente = '';

        this.direccionCliente = '';

        this.documentoConsultado = false;

        if (
            this.tipoComprobante === 'BOLETA'
        ) {

            this.consultarDni(documento);

            return;

        }

        this.consultarRuc(documento);

    }

    /**
     * Consultar una persona por DNI.
     */
    private consultarDni(
        dni: string
    ): void {

        this.ventaService
            .consultarDni(dni)
            .subscribe({

                next: (respuesta) => {

                    const datos =
                        respuesta.datos;

                    this.nombreCliente = [
                        datos.nombres,
                        datos.apellidoPaterno,
                        datos.apellidoMaterno
                    ]
                        .filter(Boolean)
                        .join(' ')
                        .trim();

                    this.direccionCliente = '';

                    this.documentoConsultado = true;

                    this.consultandoDocumento = false;

                    this.mostrarMensaje(
                        'DNI consultado correctamente.'
                    );

                    this.cdr.detectChanges();

                },

                error: (error: any) => {

                    this.consultandoDocumento = false;

                    this.documentoConsultado = false;

                    this.nombreCliente = '';

                    this.direccionCliente = '';

                    this.mostrarMensaje(
                        this.obtenerMensajeError(
                            error,
                            'No se pudo consultar el DNI.'
                        )
                    );

                    this.cdr.detectChanges();

                }

            });

    }

    /**
     * Consultar una empresa por RUC.
     */
    private consultarRuc(
        ruc: string
    ): void {

        this.ventaService
            .consultarRuc(ruc)
            .subscribe({

                next: (respuesta) => {

                    const datos =
                        respuesta.datos;

                    if (
                        datos.estado !== 'ACTIVO'
                    ) {

                        this.consultandoDocumento =
                            false;

                        this.documentoConsultado =
                            false;

                        this.mostrarMensaje(
                            'El RUC consultado no se encuentra ACTIVO.'
                        );

                        this.cdr.detectChanges();

                        return;

                    }

                    if (
                        datos.condicion !== 'HABIDO'
                    ) {

                        this.consultandoDocumento =
                            false;

                        this.documentoConsultado =
                            false;

                        this.mostrarMensaje(
                            'El domicilio fiscal del RUC no tiene condición HABIDO.'
                        );

                        this.cdr.detectChanges();

                        return;

                    }

                    this.nombreCliente =
                        datos.razonSocial;

                    this.direccionCliente =
                        datos.direccion ?? '';

                    this.documentoConsultado = true;

                    this.consultandoDocumento = false;

                    this.mostrarMensaje(
                        'RUC consultado correctamente.'
                    );

                    this.cdr.detectChanges();

                },

                error: (error: any) => {

                    this.consultandoDocumento = false;

                    this.documentoConsultado = false;

                    this.nombreCliente = '';

                    this.direccionCliente = '';

                    this.mostrarMensaje(
                        this.obtenerMensajeError(
                            error,
                            'No se pudo consultar el RUC.'
                        )
                    );

                    this.cdr.detectChanges();

                }

            });

    }

    /**
     * Limpiar toda la venta temporal.
     */
    limpiarVenta(): void {

        if (this.registrando) {
            return;
        }

        this.ventas = [];

        this.codigoBarras = '';

        this.calcularTotales();

    }

    /**
     * Registrar la venta en el backend.
     */
    registrarVenta(): void {

        if (this.registrando) {
            return;
        }

        if (this.ventas.length === 0) {

            this.mostrarMensaje(
                'Debe agregar al menos un producto.'
            );

            return;

        }

        if (
            this.tipoComprobante !==
            'VENTA RAPIDA'
        ) {

            if (!this.numeroDocumento.trim()) {

                this.mostrarMensaje(
                    this.tipoComprobante ===
                    'BOLETA'
                        ? 'Debe ingresar el DNI del cliente.'
                        : 'Debe ingresar el RUC de la empresa.'
                );

                return;

            }

            if (!this.documentoConsultado) {

                this.mostrarMensaje(
                    'Primero debe consultar el documento.'
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
                        'Venta registrada correctamente.'
                    );

                    this.reiniciarVentaCompleta();

                    this.cdr.detectChanges();

                },

                error: (error: any) => {

                    this.registrando = false;

                    this.mostrarMensaje(
                        this.obtenerMensajeError(
                            error,
                            'No se pudo completar la venta. Intente nuevamente.'
                        )
                    );

                    this.cdr.detectChanges();

                }

            });

    }

    /**
     * Calcular los totales de la venta.
     */
    calcularTotales(): void {

        this.subtotal =
            this.ventas.reduce(

                (total, item) =>
                    total +
                    Number(item.subtotal),

                0

            );

        this.igv = 0;

        this.total = this.subtotal;

    }

    /**
     * Reiniciar productos, cliente y comprobante
     * después de registrar una venta.
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

    }

    /**
     * Obtener un mensaje legible desde una respuesta
     * de error del backend.
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
                return String(primerError);
            }

        }

        return mensajePredeterminado;

    }

    /**
     * Mostrar una notificación temporal.
     */
    private mostrarMensaje(
        mensaje: string
    ): void {

        this.snackBar.open(

            mensaje,

            'Cerrar',

            {
                duration: 5000,
                horizontalPosition: 'right',
                verticalPosition: 'bottom'
            }

        );

    }

}