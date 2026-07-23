<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Producto extends Model
{
    protected $table = 'producto';

    protected $primaryKey = 'id_producto';

    protected $fillable = [
        'codigo_producto',
        'nombre_producto',
        'descripcion_producto',
        'id_categoria',
        'precio_producto',
        'costo_producto',
        'fecha_caducidad',
        'stock_producto',
        'stock_minimo_producto',
        'estado',
    ];

    protected $casts = [
        'id_categoria' => 'integer',
        'precio_producto' => 'decimal:2',
        'costo_producto' => 'decimal:2',
        'fecha_caducidad' => 'date:Y-m-d',
        'stock_producto' => 'integer',
        'stock_minimo_producto' => 'integer',
        'estado' => 'boolean',
    ];

    public function categoria(): BelongsTo
    {
        return $this->belongsTo(
            Categoria::class,
            'id_categoria',
            'id_categoria'
        );
    }

    public function detalleVentas(): HasMany
    {
        return $this->hasMany(
            DetalleVenta::class,
            'id_producto',
            'id_producto'
        );
    }
}