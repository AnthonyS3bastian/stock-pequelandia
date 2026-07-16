<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Personal extends Model
{
    protected $table = 'personal';

    protected $primaryKey = 'id_personal';

    protected $fillable = [
        'dni_personal',
        'nombre_personal',
        'apellido_personal',
        'tel_personal',
    ];

    public function usuario(): HasOne
    {
        return $this->hasOne(Usuario::class, 'id_personal', 'id_personal');
    }
}