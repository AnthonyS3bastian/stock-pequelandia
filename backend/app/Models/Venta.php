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
        'fecha_anulacion',
        'numero_comprobante',
        'total_venta',
        'estado_venta',
        'id_usuario',
        'id_usuario_anulacion',
        'id_serie_comprobante',
        'id_cliente',
    ];

    protected function casts(): array
    {
        return [
            'id_venta' => 'integer',
            'fecha_venta' => 'datetime',
            'fecha_anulacion' => 'datetime',
            'total_venta' => 'decimal:2',
            'id_usuario' => 'integer',
            'id_usuario_anulacion' => 'integer',
            'id_serie_comprobante' => 'integer',
            'id_cliente' => 'integer',
        ];
    }

    /**
     * Usuario que registró la venta.
     */
    public function usuario(): BelongsTo
    {
        return $this->belongsTo(
            Usuario::class,
            'id_usuario',
            'id_usuario'
        );
    }

    /**
     * Usuario que anuló la venta.
     */
    public function usuarioAnulacion(): BelongsTo
    {
        return $this->belongsTo(
            Usuario::class,
            'id_usuario_anulacion',
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

    public function estaRegistrada(): bool
    {
        return strtoupper(
            trim((string) $this->estado_venta)
        ) === 'REGISTRADA';
    }

    public function estaAnulada(): bool
    {
        return strtoupper(
            trim((string) $this->estado_venta)
        ) === 'ANULADA';
    }
}