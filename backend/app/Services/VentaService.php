<?php

namespace App\Services;

use App\Models\Cliente;
use App\Models\DetalleVenta;
use App\Models\Producto;
use App\Models\SerieComprobante;
use App\Models\Usuario;
use App\Models\Venta;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Throwable;

class VentaService
{
    /**
     * Registrar una nueva venta.
     *
     * Temporalmente se utilizarán:
     * id_usuario = 1
     * id_cliente = 1
     * id_serie_comprobante = 1
     */
    public function registrar(array $datos): array
    {
        DB::beginTransaction();

        try {
            $idUsuario = 1;
            $idCliente = 1;
            $idSerieComprobante = 1;

            /*
             * El frontend puede enviar la lista con el nombre
             * "detalles" o "productos".
             */
            $detallesRecibidos = $datos['detalles']
                ?? $datos['productos']
                ?? [];

            if (!is_array($detallesRecibidos) || count($detallesRecibidos) === 0) {
                throw ValidationException::withMessages([
                    'detalles' => [
                        'La venta debe contener al menos un producto.',
                    ],
                ]);
            }

            /*
             * Verificar que existan temporalmente el usuario
             * y el cliente con ID 1.
             */
            if (!Usuario::where('id_usuario', $idUsuario)->exists()) {
                throw ValidationException::withMessages([
                    'id_usuario' => [
                        'No existe el usuario temporal con ID 1.',
                    ],
                ]);
            }

            if (!Cliente::where('id_cliente', $idCliente)->exists()) {
                throw ValidationException::withMessages([
                    'id_cliente' => [
                        'No existe el cliente temporal con ID 1.',
                    ],
                ]);
            }

            /*
             * Bloquear la serie mientras se genera el comprobante
             * para evitar números duplicados.
             */
            $serieComprobante = SerieComprobante::query()
                ->where('id_serie_comprobante', $idSerieComprobante)
                ->lockForUpdate()
                ->first();

            if (!$serieComprobante) {
                throw ValidationException::withMessages([
                    'id_serie_comprobante' => [
                        'No existe la serie de comprobante temporal con ID 1.',
                    ],
                ]);
            }

            /*
             * Agrupar productos repetidos.
             *
             * Se acepta cualquiera de estos nombres para la cantidad:
             * cantidad
             * cantidad_detalle_venta
             */
            $cantidadesPorProducto = [];

            foreach ($detallesRecibidos as $indice => $detalleRecibido) {
                if (!is_array($detalleRecibido)) {
                    throw ValidationException::withMessages([
                        "detalles.$indice" => [
                            'El detalle del producto no tiene un formato válido.',
                        ],
                    ]);
                }

                $idProducto = $detalleRecibido['id_producto'] ?? null;

                $cantidadRecibida = $detalleRecibido['cantidad']
                    ?? $detalleRecibido['cantidad_detalle_venta']
                    ?? null;

                if (
                    !is_numeric($idProducto)
                    || (int) $idProducto <= 0
                ) {
                    throw ValidationException::withMessages([
                        "detalles.$indice.id_producto" => [
                            'El producto seleccionado no es válido.',
                        ],
                    ]);
                }

                if (
                    !is_numeric($cantidadRecibida)
                    || (float) $cantidadRecibida <= 0
                    || (int) $cantidadRecibida != (float) $cantidadRecibida
                ) {
                    throw ValidationException::withMessages([
                        "detalles.$indice.cantidad" => [
                            'La cantidad debe ser un número entero mayor que cero.',
                        ],
                    ]);
                }

                $idProducto = (int) $idProducto;
                $cantidad = (int) $cantidadRecibida;

                if (!isset($cantidadesPorProducto[$idProducto])) {
                    $cantidadesPorProducto[$idProducto] = 0;
                }

                $cantidadesPorProducto[$idProducto] += $cantidad;
            }

            /*
             * Ordenar los productos ayuda a mantener siempre
             * el mismo orden de bloqueo dentro de la transacción.
             */
            ksort($cantidadesPorProducto);

            $productosVenta = [];
            $totalVenta = 0;

            /*
             * Consultar y bloquear cada producto para evitar
             * que dos ventas descuenten el mismo stock al mismo tiempo.
             */
            foreach ($cantidadesPorProducto as $idProducto => $cantidad) {
                $producto = Producto::query()
                    ->where('id_producto', $idProducto)
                    ->lockForUpdate()
                    ->first();

                if (!$producto) {
                    throw ValidationException::withMessages([
                        'productos' => [
                            "No existe el producto con ID {$idProducto}.",
                        ],
                    ]);
                }

                if (!$producto->estado) {
                    throw ValidationException::withMessages([
                        'productos' => [
                            "El producto {$producto->nombre_producto} se encuentra inactivo.",
                        ],
                    ]);
                }

                if ($producto->stock_producto < $cantidad) {
                    throw ValidationException::withMessages([
                        'stock' => [
                            "Stock insuficiente para {$producto->nombre_producto}. "
                            . "Disponible: {$producto->stock_producto}. "
                            . "Solicitado: {$cantidad}.",
                        ],
                    ]);
                }

                $precioUnitario = round(
                    (float) $producto->precio_producto,
                    2
                );

                $subtotal = round(
                    $precioUnitario * $cantidad,
                    2
                );

                $totalVenta = round(
                    $totalVenta + $subtotal,
                    2
                );

                $productosVenta[] = [
                    'producto' => $producto,
                    'cantidad' => $cantidad,
                    'precio_unitario' => $precioUnitario,
                ];
            }

            /*
             * Generar el número de comprobante.
             *
             * Ejemplo:
             * NV01-00000001
             */
            $numeroCorrelativo = (int) $serieComprobante->numero_correlativo;

            $numeroComprobante = $serieComprobante->serie_documento
                . '-'
                . str_pad(
                    (string) $numeroCorrelativo,
                    8,
                    '0',
                    STR_PAD_LEFT
                );

            if (strlen($numeroComprobante) > 20) {
                throw ValidationException::withMessages([
                    'numero_comprobante' => [
                        'El número de comprobante supera los 20 caracteres permitidos.',
                    ],
                ]);
            }

            /*
             * Registrar la cabecera de la venta.
             */
            $venta = Venta::create([
                'fecha_venta' => now(),
                'numero_comprobante' => $numeroComprobante,
                'total_venta' => $totalVenta,
                'id_usuario' => $idUsuario,
                'id_serie_comprobante' => $idSerieComprobante,
                'id_cliente' => $idCliente,
            ]);

            /*
             * Registrar los detalles y descontar el stock.
             */
            foreach ($productosVenta as $productoVenta) {
                /** @var Producto $producto */
                $producto = $productoVenta['producto'];

                $cantidad = $productoVenta['cantidad'];

                $precioUnitario = $productoVenta['precio_unitario'];

                DetalleVenta::create([
                    'precio_publico_venta' => $precioUnitario,
                    'costo_detalle_venta' => round(
                        (float) $producto->costo_producto,
                        2
                    ),
                    'cantidad_detalle_venta' => $cantidad,
                    'id_producto' => $producto->id_producto,
                    'id_venta' => $venta->id_venta,
                ]);

                $producto->stock_producto =
                    $producto->stock_producto - $cantidad;

                $producto->save();
            }

            /*
             * Incrementar el correlativo para la siguiente venta.
             */
            $serieComprobante->numero_correlativo =
                $numeroCorrelativo + 1;

            $serieComprobante->save();

            DB::commit();

            /*
             * Recargar la venta con todas sus relaciones.
             */
            $venta->load([
                'usuario',
                'cliente',
                'serieComprobante',
                'detalleVentas.producto',
            ]);

            return [
                'mensaje' => 'Venta registrada correctamente.',
                'venta' => $venta,
            ];
        } catch (Throwable $e) {
            DB::rollBack();

            throw $e;
        }
    }
}