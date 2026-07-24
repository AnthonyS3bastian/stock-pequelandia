<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DetalleVenta extends Model
{
    protected $table = 'detalle_venta';

    protected $primaryKey =
        'id_detalle_venta';

    protected $fillable = [
        'precio_publico_venta',
        'costo_detalle_venta',
        'cantidad_detalle_venta',
        'id_producto',
        'id_venta',
    ];

    protected function casts(): array
    {
        return [
            'id_detalle_venta' => 'integer',
            'precio_publico_venta' => 'decimal:2',
            'costo_detalle_venta' => 'decimal:2',
            'cantidad_detalle_venta' => 'integer',
            'id_producto' => 'integer',
            'id_venta' => 'integer',
        ];
    }

    public function producto(): BelongsTo
    {
        return $this->belongsTo(
            Producto::class,
            'id_producto',
            'id_producto'
        );
    }

    public function venta(): BelongsTo
    {
        return $this->belongsTo(
            Venta::class,
            'id_venta',
            'id_venta'
        );
    }
}