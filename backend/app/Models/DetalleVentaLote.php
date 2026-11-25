<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DetalleVentaLote extends Model
{
    protected $table =
        'detalle_venta_lote';

    protected $primaryKey =
        'id_detalle_venta_lote';

    protected $fillable = [
        'id_detalle_venta',
        'id_lote_producto',
        'cantidad',
        'costo_unitario',
    ];

    protected $casts = [
        'id_detalle_venta_lote' =>
            'integer',

        'id_detalle_venta' =>
            'integer',

        'id_lote_producto' =>
            'integer',

        'cantidad' =>
            'integer',

        'costo_unitario' =>
            'decimal:2',
    ];

    public function detalleVenta(): BelongsTo
    {
        return $this->belongsTo(
            DetalleVenta::class,
            'id_detalle_venta',
            'id_detalle_venta'
        );
    }

    public function loteProducto(): BelongsTo
    {
        return $this->belongsTo(
            LoteProducto::class,
            'id_lote_producto',
            'id_lote_producto'
        );
    }
}