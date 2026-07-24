<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Cliente extends Model
{
    protected $table = 'cliente';

    protected $primaryKey = 'id_cliente';

    protected $fillable = [
        'tipo_cliente',
        'codigo_cliente',
        'nombres_cliente',
        'apellidos_cliente',
        'razon_social_cliente',
        'telefono_cliente',
        'direccion_cliente',
        'correo_cliente',
        'estado',
    ];

    protected function casts(): array
    {
        return [
            'id_cliente' => 'integer',
            'estado' => 'boolean',
        ];
    }

    public function ventas(): HasMany
    {
        return $this->hasMany(
            Venta::class,
            'id_cliente',
            'id_cliente'
        );
    }
}