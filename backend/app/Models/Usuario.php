<?php

namespace App\Models;

use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Laravel\Sanctum\HasApiTokens;

class Usuario extends Authenticatable
{
    use HasApiTokens;

    protected $table = 'usuario';

    protected $primaryKey = 'id_usuario';

    public $timestamps = true;

    protected $fillable = [
        'rol_usuario',
        'nombre_usuario',
        'password',
        'estado_usuario',
        'id_personal',
    ];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected function casts(): array
    {
        return [
            'password' => 'hashed',
            'estado_usuario' => 'boolean',
        ];
    }

    public function personal(): BelongsTo
    {
        return $this->belongsTo(Personal::class, 'id_personal', 'id_personal');
    }

    public function ventas(): HasMany
    {
        return $this->hasMany(Venta::class, 'id_usuario', 'id_usuario');
    }
}