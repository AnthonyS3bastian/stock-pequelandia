<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Venta extends Model
{
    protected $table = 'venta';

    protected $primaryKey = 'id_venta';

    protected $fillable = [
        'fecha_venta',
        'numero_comprobante',
        'total_venta',
        'id_usuario',
        'id_serie_comprobante',
        'id_cliente',
    ];

    protected function casts(): array
    {
        return [
            'id_venta' => 'integer',
            'fecha_venta' => 'datetime',
            'total_venta' => 'decimal:2',
            'id_usuario' => 'integer',
            'id_serie_comprobante' => 'integer',
            'id_cliente' => 'integer',
        ];
    }

    public function usuario(): BelongsTo
    {
        return $this->belongsTo(
            Usuario::class,
            'id_usuario',
            'id_usuario'
        );
    }

    public function cliente(): BelongsTo
    {
        return $this->belongsTo(
            Cliente::class,
            'id_cliente',
            'id_cliente'
        );
    }

    public function serieComprobante(): BelongsTo
    {
        return $this->belongsTo(
            SerieComprobante::class,
            'id_serie_comprobante',
            'id_serie_comprobante'
        );
    }

    public function detalleVentas(): HasMany
    {
        return $this->hasMany(
            DetalleVenta::class,
            'id_venta',
            'id_venta'
        );
    }
}