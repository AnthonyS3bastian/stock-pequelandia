<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class SerieComprobante extends Model
{
    protected $table =
        'serie_comprobante';

    protected $primaryKey =
        'id_serie_comprobante';

    protected $fillable = [
        'tipo_documento_serie',
        'serie_documento',
        'numero_correlativo',
    ];

    protected function casts(): array
    {
        return [
            'id_serie_comprobante' => 'integer',
            'numero_correlativo' => 'integer',
        ];
    }

    public function comprobante(): HasOne
    {
        return $this->hasOne(
            Comprobante::class,
            'id_serie_comprobante',
            'id_serie_comprobante'
        );
    }

    public function ventas(): HasMany
    {
        return $this->hasMany(
            Venta::class,
            'id_serie_comprobante',
            'id_serie_comprobante'
        );
    }
}