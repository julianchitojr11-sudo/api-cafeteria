const express = require('express');
const router = express.Router();
const pool = require('../config/db');

const DEFAULT_STOCK = 100;
const DEFAULT_ICONO = 'fa-mug-hot';

function isNumeric(value) {
    return (typeof value === 'number' || (typeof value === 'string' && value.trim() !== '')) &&
        Number.isFinite(Number(value));
}

function isPositiveId(id) {
    return /^[1-9]\d*$/.test(id) && Number.isSafeInteger(Number(id));
}

function getProductData(body) {
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
        return {
            errors: ['El cuerpo debe ser un objeto JSON']
        };
    }

    const { nombre, categoria, precio, stock, icono } = body;
    const errors = [];
    const priceIsNumber = isNumeric(precio);

    if (typeof nombre !== 'string' || !nombre.trim()) {
        errors.push('nombre es obligatorio y debe ser texto no vacío');
    }
    if (typeof categoria !== 'string' || !categoria.trim()) {
        errors.push('categoria es obligatoria y debe ser texto no vacío');
    }
    if (!priceIsNumber || Number(precio) < 0) {
        errors.push('precio es obligatorio y debe ser un número mayor o igual a 0');
    }
    if (stock != null && (
        !isNumeric(stock) ||
        !Number.isSafeInteger(Number(stock)) ||
        Number(stock) < 0
    )) {
        errors.push('stock debe ser un entero mayor o igual a 0');
    }
    if (icono != null && (typeof icono !== 'string' || !icono.trim())) {
        errors.push('icono debe ser texto no vacío');
    }

    if (errors.length > 0) {
        return { errors };
    }

    return {
        errors: [],
        values: {
            nombre: nombre.trim(),
            categoria: categoria.trim(),
            precio: Number(precio),
            stock: stock != null ? Number(stock) : DEFAULT_STOCK,
            icono: icono != null ? icono.trim() : DEFAULT_ICONO
        }
    };
}

function sendDatabaseError(res, error, message) {
    console.error('Error en el módulo de productos:', error);
    const isForeignKeyConflict = error && error.code === 'ER_ROW_IS_REFERENCED_2';

    res.status(isForeignKeyConflict ? 409 : 500).json({
        status: isForeignKeyConflict ? 'fail' : 'error',
        message: isForeignKeyConflict
            ? 'No se puede eliminar el producto porque está asociado a otros registros'
            : message,
        data: null,
        errors: []
    });
}

// GET /api/v1/productos
router.get('/', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM producto ORDER BY nombre DESC');
        res.status(200).json({
            status: 'success',
            message: 'Productos obtenidos correctamente',
            data: { items: rows, count: rows.length },
            errors: []
        });
    } catch (error) {
        sendDatabaseError(res, error, 'Error al obtener los productos');
    }
});

// GET /api/v1/productos/:id
router.get('/:id', async (req, res) => {
    const { id } = req.params;
    if (!isPositiveId(id)) {
        return res.status(400).json({
            status: 'fail',
            message: 'El ID debe ser un entero positivo',
            data: null,
            errors: []
        });
    }

    try {
        const [rows] = await pool.query('SELECT * FROM producto WHERE id_producto = ?', [Number(id)]);
        if (rows.length === 0) {
            return res.status(404).json({
                status: 'fail',
                message: `Producto con ID ${id} no encontrado`,
                data: null,
                errors: []
            });
        }

        res.status(200).json({
            status: 'success',
            message: 'Producto obtenido correctamente',
            data: rows[0],
            errors: []
        });
    } catch (error) {
        sendDatabaseError(res, error, 'Error al obtener el producto');
    }
});

// POST /api/v1/productos
router.post('/', async (req, res) => {
    const product = getProductData(req.body);
    if (product.errors.length > 0) {
        return res.status(400).json({
            status: 'fail',
            message: 'Datos inválidos',
            data: null,
            errors: product.errors
        });
    }

    const { nombre, categoria, precio, stock, icono } = product.values;
    try {
        const [result] = await pool.query(
            'INSERT INTO producto (nombre, categoria, precio, stock, icono) VALUES (?, ?, ?, ?, ?)',
            [nombre, categoria, precio, stock, icono]
        );

        res.location(`/api/v1/productos/${result.insertId}`).status(201).json({
            status: 'success',
            message: 'Producto creado correctamente',
            data: { id: result.insertId },
            errors: []
        });
    } catch (error) {
        sendDatabaseError(res, error, 'Error al registrar el producto');
    }
});

// PUT /api/v1/productos/:id
router.put('/:id', async (req, res) => {
    const { id } = req.params;
    if (!isPositiveId(id)) {
        return res.status(400).json({
            status: 'fail',
            message: 'El ID debe ser un entero positivo',
            data: null,
            errors: []
        });
    }

    const product = getProductData(req.body);
    if (product.errors.length > 0) {
        return res.status(400).json({
            status: 'fail',
            message: 'Datos inválidos',
            data: null,
            errors: product.errors
        });
    }

    const { nombre, categoria, precio, stock, icono } = product.values;
    try {
        const [result] = await pool.query(
            'UPDATE producto SET nombre = ?, categoria = ?, precio = ?, stock = ?, icono = ? WHERE id_producto = ?',
            [nombre, categoria, precio, stock, icono, Number(id)]
        );

        if (result.affectedRows === 0) {
            const [rows] = await pool.query(
                'SELECT id_producto FROM producto WHERE id_producto = ?',
                [Number(id)]
            );
            if (rows.length === 0) {
                return res.status(404).json({
                    status: 'fail',
                    message: `No se pudo actualizar. El producto con ID ${id} no existe`,
                    data: null,
                    errors: []
                });
            }
        }

        res.status(200).json({
            status: 'success',
            message: 'Producto actualizado correctamente',
            data: null,
            errors: []
        });
    } catch (error) {
        sendDatabaseError(res, error, 'Error al actualizar el producto');
    }
});

// DELETE /api/v1/productos/:id
router.delete('/:id', async (req, res) => {
    const { id } = req.params;
    if (!isPositiveId(id)) {
        return res.status(400).json({
            status: 'fail',
            message: 'El ID debe ser un entero positivo',
            data: null,
            errors: []
        });
    }

    try {
        const [result] = await pool.query('DELETE FROM producto WHERE id_producto = ?', [Number(id)]);
        if (result.affectedRows === 0) {
            return res.status(404).json({
                status: 'fail',
                message: `No se pudo eliminar. El producto con ID ${id} no existe`,
                data: null,
                errors: []
            });
        }

        res.status(200).json({
            status: 'success',
            message: 'Producto eliminado correctamente',
            data: null,
            errors: []
        });
    } catch (error) {
        sendDatabaseError(res, error, 'Error al eliminar el producto');
    }
});

module.exports = router;
