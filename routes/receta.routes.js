const express = require('express');
const router = express.Router();
const pool = require('../config/db');

// 1. GET /api/v1/recetas -> Obtener la lista completa de registros
router.get('/', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM receta ORDER BY id_receta DESC');
        res.status(200).json({
            status: 'success',
            message: 'Recetas obtenidas correctamente',
            data: { items: rows, count: rows.length },
            errors: []
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: 'Error al obtener las recetas',
            data: null,
            errors: []
        });
    }
});

// 2. GET /api/v1/recetas/:id -> Obtener un único registro filtrado por su ID
router.get('/:id', async (req, res) => {
    const { id } = req.params;

    if (!/^[1-9]\d*$/.test(id) || !Number.isSafeInteger(Number(id))) {
        return res.status(400).json({
            status: 'fail',
            message: 'El ID debe ser un entero positivo',
            data: null,
            errors: []
        });
    }

    try {
        const [rows] = await pool.query('SELECT * FROM receta WHERE id_receta = ?', [id]);
        
        if (rows.length === 0) {
            return res.status(404).json({
                status: 'fail',
                message: `Receta con ID ${id} no encontrada`,
                data: null,
                errors: []
            });
        }
        
        res.status(200).json({
            status: 'success',
            message: 'Receta obtenida correctamente',
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

// 3. POST /api/v1/recetas -> Crear un nuevo registro recibiendo JSON Body
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

    const { id_producto, id_insumo, cantidad_requerida } = body;
    const errores = [];
    const idProductoValido = /^[1-9]\d*$/.test(String(id_producto)) &&
        Number.isSafeInteger(Number(id_producto));
    const idInsumoValido = /^[1-9]\d*$/.test(String(id_insumo)) &&
        Number.isSafeInteger(Number(id_insumo));
    const cantidadValida = cantidad_requerida !== '' &&
        cantidad_requerida != null &&
        Number.isFinite(Number(cantidad_requerida)) &&
        Number(cantidad_requerida) > 0;

    if (!idProductoValido) {
        errores.push('id_producto es obligatorio y debe ser un entero positivo');
    }
    if (!idInsumoValido) {
        errores.push('id_insumo es obligatorio y debe ser un entero positivo');
    }
    if (!cantidadValida) {
        errores.push('cantidad_requerida es obligatoria y debe ser un número mayor a 0');
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
            'INSERT INTO receta (id_producto, id_insumo, cantidad_requerida) VALUES (?, ?, ?)',
            [Number(id_producto), Number(id_insumo), Number(cantidad_requerida)]
        );

        res.status(201).json({
            status: 'success',
            message: 'Registro creado exitosamente',
            data: { id: result.insertId },
            errors: []
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: 'Error al registrar la receta',
            data: null,
            errors: []
        });
    }
});

// 4. PUT /api/v1/recetas/:id -> Actualizar un registro existente mediante JSON Body e ID en URL
router.put('/:id', async (req, res) => {
    const { id } = req.params;

    if (!/^[1-9]\d*$/.test(id) || !Number.isSafeInteger(Number(id))) {
        return res.status(400).json({
            status: 'fail',
            message: 'El ID debe ser un entero positivo',
            data: null,
            errors: []
        });
    }

    const body = req.body;
    const { id_producto, id_insumo, cantidad_requerida } =
        body && typeof body === 'object' && !Array.isArray(body) ? body : {};
    const errores = [];
    const idProductoValido = /^[1-9]\d*$/.test(String(id_producto)) &&
        Number.isSafeInteger(Number(id_producto));
    const idInsumoValido = /^[1-9]\d*$/.test(String(id_insumo)) &&
        Number.isSafeInteger(Number(id_insumo));
    const cantidadValida = cantidad_requerida !== '' &&
        cantidad_requerida != null &&
        Number.isFinite(Number(cantidad_requerida)) &&
        Number(cantidad_requerida) > 0;

    if (!idProductoValido) {
        errores.push('id_producto es obligatorio y debe ser un entero positivo');
    }
    if (!idInsumoValido) {
        errores.push('id_insumo es obligatorio y debe ser un entero positivo');
    }
    if (!cantidadValida) {
        errores.push('cantidad_requerida es obligatoria y debe ser un número mayor a 0');
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
            'UPDATE receta SET id_producto = ?, id_insumo = ?, cantidad_requerida = ? WHERE id_receta = ?',
            [Number(id_producto), Number(id_insumo), Number(cantidad_requerida), id]
        );

        if (result.affectedRows === 0) {
            const [rows] = await pool.query('SELECT id_receta FROM receta WHERE id_receta = ?', [id]);

            if (rows.length === 0) {
                return res.status(404).json({
                    status: 'fail',
                    message: `No se pudo actualizar. La receta con ID ${id} no existe`,
                    data: null,
                    errors: []
                });
            }
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
            message: 'Error al actualizar la receta',
            data: null,
            errors: []
        });
    }
});

// 5. DELETE /api/v1/recetas/:id -> Eliminar un registro específico por su ID
router.delete('/:id', async (req, res) => {
    const { id } = req.params;

    if (!/^[1-9]\d*$/.test(id) || !Number.isSafeInteger(Number(id))) {
        return res.status(400).json({
            status: 'fail',
            message: 'El ID debe ser un entero positivo',
            data: null,
            errors: []
        });
    }

    try {
        const [result] = await pool.query('DELETE FROM receta WHERE id_receta = ?', [id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({
                status: 'fail',
                message: `No se pudo eliminar. La receta con ID ${id} no existe`,
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
            message: 'Error al eliminar la receta',
            data: null,
            errors: []
        });
    }
});

module.exports = router;