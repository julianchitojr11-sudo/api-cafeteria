const express = require('express');
const router = express.Router();
const pool = require('../config/db');

// 1. GET /api/v1/modificadores -> Obtener la lista completa de registros
router.get('/', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM modificador ORDER BY id_modificador DESC');
        res.status(200).json({
            status: 'success',
            message: 'Modificadores obtenidos correctamente',
            data: { items: rows, count: rows.length },
            errors: []
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: 'Error al obtener los modificadores',
            data: null,
            errors: []
        });
    }
});

// 2. GET /api/v1/modificadores/:id -> Obtener un registro por su ID
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
        const [rows] = await pool.query('SELECT * FROM modificador WHERE id_modificador = ?', [id]);

        if (rows.length === 0) {
            return res.status(404).json({
                status: 'fail',
                message: `Modificador con ID ${id} no encontrado`,
                data: null,
                errors: []
            });
        }

        res.status(200).json({
            status: 'success',
            message: 'Modificador obtenido correctamente',
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

// 3. POST /api/v1/modificadores -> Crear un nuevo registro
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

    const { nombre, tipo, precio_extra } = body;
    const errores = [];
    const precioEsNumero = precio_extra !== '' && precio_extra != null && Number.isFinite(Number(precio_extra));

    if (typeof nombre !== 'string' || !nombre.trim()) {
        errores.push('nombre es obligatorio (texto)');
    }
    if (typeof tipo !== 'string' || !tipo.trim()) {
        errores.push('tipo es obligatorio (texto)');
    }
    if (!precioEsNumero || Number(precio_extra) < 0) {
        errores.push('precio_extra es obligatorio y debe ser un número mayor o igual a 0');
    }
    if (errores.length > 0) {
        return res.status(400).json({
            status: 'fail',
            message: 'Datos inválidos',
            data: null,
            errors: errores
        });
    }

    try {
        const [result] = await pool.query(
            'INSERT INTO modificador (nombre, tipo, precio_extra) VALUES (?, ?, ?)',
            [nombre.trim(), tipo.trim(), Number(precio_extra)]
        );

        res.location(`/api/v1/modificadores/${result.insertId}`).status(201).json({
            status: 'success',
            message: 'Registro creado exitosamente',
            data: { id: result.insertId },
            errors: []
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: 'Error al registrar el modificador',
            data: null,
            errors: []
        });
    }
});

// 4. PUT /api/v1/modificadores/:id -> Actualizar un registro existente
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
    const { nombre, tipo, precio_extra } = body && typeof body === 'object' && !Array.isArray(body) ? body : {};
    const errores = [];
    const precioEsNumero = precio_extra !== '' && precio_extra != null && Number.isFinite(Number(precio_extra));

    if (typeof nombre !== 'string' || !nombre.trim()) {
        errores.push('nombre es obligatorio (texto)');
    }
    if (typeof tipo !== 'string' || !tipo.trim()) {
        errores.push('tipo es obligatorio (texto)');
    }
    if (!precioEsNumero || Number(precio_extra) < 0) {
        errores.push('precio_extra es obligatorio y debe ser un número mayor o igual a 0');
    }
    if (errores.length > 0) {
        return res.status(400).json({
            status: 'fail',
            message: 'Datos inválidos',
            data: null,
            errors: errores
        });
    }

    try {
        const [result] = await pool.query(
            'UPDATE modificador SET nombre = ?, tipo = ?, precio_extra = ? WHERE id_modificador = ?',
            [nombre.trim(), tipo.trim(), Number(precio_extra), id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                status: 'fail',
                message: `No se pudo actualizar. El modificador con ID ${id} no existe`,
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
            message: 'Error al actualizar el modificador',
            data: null,
            errors: []
        });
    }
});

// 5. DELETE /api/v1/modificadores/:id -> Eliminar un registro por su ID
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
        const [result] = await pool.query('DELETE FROM modificador WHERE id_modificador = ?', [id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({
                status: 'fail',
                message: `No se pudo eliminar. El modificador con ID ${id} no existe`,
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
            message: 'Error al eliminar el modificador',
            data: null,
            errors: []
        });
    }
});

module.exports = router;
