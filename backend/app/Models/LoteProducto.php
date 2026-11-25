<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class LoteProducto extends Model
{
    protected $table =
        'lote_producto';

    protected $primaryKey =
        'id_lote_producto';

    protected $fillable = [
        'id_producto',
        'cantidad_inicial',
        'cantidad_disponible',
        'costo_unitario',
        'fecha_ingreso',
        'fecha_caducidad',
        'estado',
    ];

    protected $casts = [
        'id_lote_producto' =>
            'integer',

        'id_producto' =>
            'integer',

        'cantidad_inicial' =>
            'integer',

        'cantidad_disponible' =>
            'integer',

        'costo_unitario' =>
            'decimal:2',

        'fecha_ingreso' =>
            'date:Y-m-d',

        'fecha_caducidad' =>
            'date:Y-m-d',

        'estado' =>
            'boolean',
    ];

    public function producto(): BelongsTo
    {
        return $this->belongsTo(
            Producto::class,
            'id_producto',
            'id_producto'
        );
    }

    /**
     * Consumos de este lote realizados
     * mediante ventas.
     */
    public function consumosVenta(): HasMany
    {
        return $this->hasMany(
            DetalleVentaLote::class,
            'id_lote_producto',
            'id_lote_producto'
        );
    }
}