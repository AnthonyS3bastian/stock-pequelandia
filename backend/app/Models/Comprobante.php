<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Comprobante extends Model
{
    protected $table = 'comprobante';

    protected $primaryKey = 'id_comprobante';

    protected $fillable = [
        'id_serie_comprobante',
    ];

    public function serieComprobante(): BelongsTo
    {
        return $this->belongsTo(SerieComprobante::class, 'id_serie_comprobante', 'id_serie_comprobante');
    }
}