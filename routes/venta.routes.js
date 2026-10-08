const express = require('express');
const router = express.Router();
const pool = require('../config/db');

// id_usuario y fecha_venta son opcionales; cambio se calcula en el servidor.

// 1. GET /api/v1/ventas -> Obtener la lista completa de registros
router.get('/', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM venta ORDER BY id_venta DESC');
        res.status(200).json({
            status: 'success',
            message: 'Ventas obtenidas correctamente',
            data: { items: rows, count: rows.length },
            errors: []
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: 'Error al obtener las ventas',
            data: null,
            errors: []
        });
    }
});

// 2. GET /api/v1/ventas/:id -> Obtener un registro por su ID
router.get('/:id', async (req, res) => {
    const { id } = req.params;

    if (!/^[1-9]\d*$/.test(id)) {
        return res.status(400).json({
            status: 'fail',
            message: 'El ID debe ser un entero positivo',
            data: null,
            errors: []
        });
    }

    try {
        const [rows] = await pool.query('SELECT * FROM venta WHERE id_venta = ?', [id]);

        if (rows.length === 0) {
            return res.status(404).json({
                status: 'fail',
                message: `Venta con ID ${id} no encontrada`,
                data: null,
                errors: []
            });
        }

        res.status(200).json({
            status: 'success',
            message: 'Venta obtenida correctamente',
            data: rows[0],
            errors: []
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: 'Error en la consulta del servidor',
            data: null,
            errors: []
        });
    }
});

// 3. POST /api/v1/ventas -> Crear una nueva venta
router.post('/', async (req, res) => {
    const body = req.body;

    if (!body || typeof body !== 'object' || Array.isArray(body)) {
        return res.status(400).json({
            status: 'fail',
            message: 'El cuerpo debe ser un objeto JSON',
            data: null,
            errors: ['El cuerpo debe ser un objeto JSON']
        });
    }

    const { id_usuario, total, monto_pagado, fecha_venta } = body;
    const errores = [];
    const totalEsNumero = total !== '' && total != null && Number.isFinite(Number(total));
    const pagoEsNumero = monto_pagado !== '' && monto_pagado != null && Number.isFinite(Number(monto_pagado));
    const fechaValida = fecha_venta == null || (
        fecha_venta !== '' && !Number.isNaN(new Date(fecha_venta).getTime())
    );

    if (id_usuario != null && !/^[1-9]\d*$/.test(String(id_usuario))) {
        errores.push('id_usuario debe ser un entero positivo');
    }
    if (!totalEsNumero || Number(total) < 0) {
        errores.push('total es obligatorio y debe ser un número mayor o igual a 0');
    }
    if (!pagoEsNumero || Number(monto_pagado) < 0) {
        errores.push('monto_pagado es obligatorio y debe ser un número mayor o igual a 0');
    }
    if (totalEsNumero && pagoEsNumero && Number(monto_pagado) < Number(total)) {
        errores.push('monto_pagado no puede ser menor que el total');
    }
    if (!fechaValida) {
        errores.push('fecha_venta debe ser una fecha válida (ej. 2026-10-02 14:30:00)');
    }
    if (errores.length > 0) {
        return res.status(400).json({
            status: 'fail',
            message: 'Datos inválidos',
            data: null,
            errors: errores
        });
    }

    const cambio = Math.round((Number(monto_pagado) - Number(total) + Number.EPSILON) * 100) / 100;

    try {
        const [result] = await pool.query(
            `INSERT INTO venta (id_usuario, total, monto_pagado, cambio, fecha_venta)
             VALUES (?, ?, ?, ?, COALESCE(?, CURRENT_TIMESTAMP))`,
            [
                id_usuario != null ? Number(id_usuario) : null,
                Number(total),
                Number(monto_pagado),
                cambio,
                fecha_venta != null ? new Date(fecha_venta) : null
            ]
        );

        res.location(`/api/v1/ventas/${result.insertId}`).status(201).json({
            status: 'success',
            message: 'Registro creado exitosamente',
            data: { id: result.insertId },
            errors: []
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: 'Error al registrar la venta',
            data: null,
            errors: []
        });
    }
});

// 4. PUT /api/v1/ventas/:id -> Actualizar una venta existente
router.put('/:id', async (req, res) => {
    const { id } = req.params;

    if (!/^[1-9]\d*$/.test(id)) {
        return res.status(400).json({
            status: 'fail',
            message: 'El ID debe ser un entero positivo',
            data: null,
            errors: []
        });
    }

    const body = req.body;
    const { id_usuario, total, monto_pagado, fecha_venta } =
        body && typeof body === 'object' && !Array.isArray(body) ? body : {};
    const errores = [];
    const totalEsNumero = total !== '' && total != null && Number.isFinite(Number(total));
    const pagoEsNumero = monto_pagado !== '' && monto_pagado != null && Number.isFinite(Number(monto_pagado));
    const fechaValida = fecha_venta == null || (
        fecha_venta !== '' && !Number.isNaN(new Date(fecha_venta).getTime())
    );

    if (id_usuario != null && !/^[1-9]\d*$/.test(String(id_usuario))) {
        errores.push('id_usuario debe ser un entero positivo');
    }
    if (!totalEsNumero || Number(total) < 0) {
        errores.push('total es obligatorio y debe ser un número mayor o igual a 0');
    }
    if (!pagoEsNumero || Number(monto_pagado) < 0) {
        errores.push('monto_pagado es obligatorio y debe ser un número mayor o igual a 0');
    }
    if (totalEsNumero && pagoEsNumero && Number(monto_pagado) < Number(total)) {
        errores.push('monto_pagado no puede ser menor que el total');
    }
    if (!fechaValida) {
        errores.push('fecha_venta debe ser una fecha válida (ej. 2026-10-02 14:30:00)');
    }
    if (errores.length > 0) {
        return res.status(400).json({
            status: 'fail',
            message: 'Datos inválidos',
            data: null,
            errors: errores
        });
    }

    const cambio = Math.round((Number(monto_pagado) - Number(total) + Number.EPSILON) * 100) / 100;

    try {
        const [result] = await pool.query(
            `UPDATE venta
                SET id_usuario = COALESCE(?, id_usuario),
                    total = ?,
                    monto_pagado = ?,
                    cambio = ?,
                    fecha_venta = COALESCE(?, fecha_venta)
              WHERE id_venta = ?`,
            [
                id_usuario != null ? Number(id_usuario) : null,
                Number(total),
                Number(monto_pagado),
                cambio,
                fecha_venta != null ? new Date(fecha_venta) : null,
                id
            ]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                status: 'fail',
                message: `No se pudo actualizar. La venta con ID ${id} no existe`,
                data: null,
                errors: []
            });
        }

        res.status(200).json({
            status: 'success',
            message: 'Registro actualizado correctamente',
            data: null,
            errors: []
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: 'Error al actualizar la venta',
            data: null,
            errors: []
        });
    }
});

// 5. DELETE /api/v1/ventas/:id -> Eliminar una venta por su ID
router.delete('/:id', async (req, res) => {
    const { id } = req.params;

    if (!/^[1-9]\d*$/.test(id)) {
        return res.status(400).json({
            status: 'fail',
            message: 'El ID debe ser un entero positivo',
            data: null,
            errors: []
        });
    }

    try {
        const [result] = await pool.query('DELETE FROM venta WHERE id_venta = ?', [id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({
                status: 'fail',
                message: `No se pudo eliminar. La venta con ID ${id} no existe`,
                data: null,
                errors: []
            });
        }

        res.status(200).json({
            status: 'success',
            message: 'Registro eliminado correctamente',
            data: null,
            errors: []
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: 'Error al eliminar la venta',
            data: null,
            errors: []
        });
    }
});

module.exports = router;
