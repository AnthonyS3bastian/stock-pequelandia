import {
    Component,
    Input
} from '@angular/core';

import {
    CommonModule
} from '@angular/common';

export interface PuntoGraficoVentas {
    etiqueta: string;
    valor: number;
    detalle?: string;
}

interface PuntoGraficoRender {
    x: number;
    y: number;
    etiqueta: string;
    valor: number;
    detalle: string;
}

interface GuiaGrafico {
    y: number;
    valor: number;
    texto: string;
}

@Component({
    selector: 'app-grafico-ventas',
    standalone: true,
    imports: [
        CommonModule
    ],
    templateUrl: './grafico-ventas.html',
    styleUrl: './grafico-ventas.scss'
})
export class GraficoVentasComponent {

    @Input()
    titulo = 'Evolución de ventas';

    @Input()
    subtitulo = '';

    @Input()
    datos:
        PuntoGraficoVentas[] = [];

    private readonly anchoGrafico =
        1000;

    private readonly altoGrafico =
        280;

    private readonly margenIzquierdo =
        76;

    private readonly margenDerecho =
        30;

    private readonly margenSuperior =
        22;

    private readonly margenInferior =
        48;

    get valorMaximoReal(): number {
        if (this.datos.length === 0) {
            return 0;
        }

        return Math.max(
            ...this.datos.map(
                item =>
                    this.normalizarValor(
                        item.valor
                    )
            )
        );
    }

    get valorMaximoGrafico(): number {
        const maximo =
            this.valorMaximoReal;

        return maximo > 0
            ? maximo
            : 1;
    }

    get tieneVentas(): boolean {
        return this.valorMaximoReal > 0;
    }

    get puntosRender():
        PuntoGraficoRender[] {
        const cantidad =
            this.datos.length;

        if (cantidad === 0) {
            return [];
        }

        const anchoDisponible =
            this.anchoGrafico
            - this.margenIzquierdo
            - this.margenDerecho;

        const altoDisponible =
            this.altoGrafico
            - this.margenSuperior
            - this.margenInferior;

        return this.datos.map(
            (
                item,
                indice
            ) => {
                const x =
                    cantidad === 1
                        ? this.margenIzquierdo
                            + anchoDisponible / 2
                        : this.margenIzquierdo
                            + (
                                anchoDisponible
                                * indice
                                / (cantidad - 1)
                            );

                const valor =
                    this.normalizarValor(
                        item.valor
                    );

                const y =
                    this.margenSuperior
                    + altoDisponible
                    - (
                        valor
                        / this.valorMaximoGrafico
                    ) * altoDisponible;

                return {
                    x,
                    y,
                    etiqueta:
                        item.etiqueta,
                    valor,
                    detalle:
                        item.detalle
                        ?? ''
                };
            }
        );
    }

    get puntosLinea(): string {
        return this.puntosRender
            .map(
                punto =>
                    `${punto.x},${punto.y}`
            )
            .join(' ');
    }

    get puntosArea(): string {
        const puntos =
            this.puntosRender;

        if (puntos.length === 0) {
            return '';
        }

        const baseY =
            this.altoGrafico
            - this.margenInferior;

        return [
            `${puntos[0].x},${baseY}`,
            ...puntos.map(
                punto =>
                    `${punto.x},${punto.y}`
            ),
            `${puntos[puntos.length - 1].x},${baseY}`
        ].join(' ');
    }

    get guias():
        GuiaGrafico[] {
        const porcentajes = [
            1,
            0.75,
            0.5,
            0.25,
            0
        ];

        const altoDisponible =
            this.altoGrafico
            - this.margenSuperior
            - this.margenInferior;

        return porcentajes.map(
            porcentaje => {
                const valor =
                    this.valorMaximoGrafico
                    * porcentaje;

                return {
                    y:
                        this.margenSuperior
                        + altoDisponible
                        * (1 - porcentaje),

                    valor,

                    texto:
                        this.formatearMoneda(
                            valor
                        )
                };
            }
        );
    }

    get etiquetasEjeX():
        PuntoGraficoRender[] {
        const puntos =
            this.puntosRender;

        if (puntos.length <= 8) {
            return puntos;
        }

        const salto =
            Math.ceil(
                puntos.length / 8
            );

        return puntos.filter(
            (
                _,
                indice
            ) =>
                indice % salto === 0
                || indice
                    === puntos.length - 1
        );
    }

    get puntoMayor():
        PuntoGraficoRender | null {
        const puntos =
            this.puntosRender;

        if (puntos.length === 0) {
            return null;
        }

        return [...puntos].sort(
            (
                primero,
                segundo
            ) =>
                segundo.valor
                - primero.valor
        )[0];
    }

    formatearMoneda(
        valor: number
    ): string {
        return new Intl.NumberFormat(
            'es-PE',
            {
                style: 'currency',
                currency: 'PEN',
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            }
        ).format(
            this.normalizarValor(
                valor
            )
        );
    }

    private normalizarValor(
        valor: number
    ): number {
        const numero =
            Number(valor);

        return Number.isFinite(numero)
            && numero > 0
                ? numero
                : 0;
    }
}