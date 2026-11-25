<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CodigoBarra extends Model
{
    protected $table =
        'codigo_barra';

    protected $primaryKey =
        'id_codigo_barra';

    protected $fillable = [
        'codigo_barra',
        'id_producto',
        'estado',
    ];

    protected $casts = [
        'id_codigo_barra' =>
            'integer',

        'id_producto' =>
            'integer',

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
}