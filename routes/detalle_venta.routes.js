const express = require('express');
const router = express.Router();
const pool = require('../config/db');

// precio_unitario es opcional; si no se envía, se usa el precio actual del producto.
// subtotal se calcula en el servidor: cantidad * precio_unitario.

// 1. GET /api/v1/detalle_ventas -> Obtener la lista completa de registros
router.get('/', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM detalle_venta ORDER BY id_detalle DESC');
        res.status(200).json({
            status: 'success',
            message: 'Detalles de venta obtenidos correctamente',
            data: { items: rows, count: rows.length },
            errors: []
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: 'Error al obtener los detalles de venta',
            data: null,
            errors: []
        });
    }
});

// 2. GET /api/v1/detalle_ventas/:id -> Obtener un registro por su ID
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
        const [rows] = await pool.query('SELECT * FROM detalle_venta WHERE id_detalle = ?', [id]);

        if (rows.length === 0) {
            return res.status(404).json({
                status: 'fail',
                message: `Detalle de venta con ID ${id} no encontrado`,
                data: null,
                errors: []
            });
        }

        res.status(200).json({
            status: 'success',
            message: 'Detalle de venta obtenido correctamente',
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

// 3. POST /api/v1/detalle_ventas -> Crear un nuevo registro
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

    const { id_venta, id_producto, cantidad, precio_unitario } = body;
    const errores = [];
    const idVentaValido = /^[1-9]\d*$/.test(String(id_venta));
    const idProductoValido = /^[1-9]\d*$/.test(String(id_producto));
    const cantidadEsNumero = cantidad !== '' && cantidad != null && Number.isFinite(Number(cantidad));
    const precioEsNumero = precio_unitario !== '' && precio_unitario != null && Number.isFinite(Number(precio_unitario));

    if (!idVentaValido) {
        errores.push('id_venta es obligatorio y debe ser un entero positivo');
    }
    if (!idProductoValido) {
        errores.push('id_producto es obligatorio y debe ser un entero positivo');
    }
    if (!cantidadEsNumero || !Number.isInteger(Number(cantidad)) || Number(cantidad) <= 0) {
        errores.push('cantidad es obligatoria y debe ser un entero mayor a 0');
    }
    if (precio_unitario != null && (!precioEsNumero || Number(precio_unitario) < 0)) {
        errores.push('precio_unitario debe ser un número mayor o igual a 0');
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
        let precio = precio_unitario != null ? Number(precio_unitario) : null;
        if (precio === null) {
            const [productos] = await pool.query('SELECT precio FROM producto WHERE id_producto = ?', [id_producto]);
            precio = productos.length > 0 ? Number(productos[0].precio) : null;
        }

        if (precio === null) {
            return res.status(400).json({
                status: 'fail',
                message: `El producto con ID ${id_producto} no existe`,
                data: null,
                errors: []
            });
        }

        const subtotal = Math.round((Number(cantidad) * precio + Number.EPSILON) * 100) / 100;
        const [result] = await pool.query(
            'INSERT INTO detalle_venta (id_venta, id_producto, cantidad, precio_unitario, subtotal) VALUES (?, ?, ?, ?, ?)',
            [Number(id_venta), Number(id_producto), Number(cantidad), precio, subtotal]
        );

        res.location(`/api/v1/detalle_ventas/${result.insertId}`).status(201).json({
            status: 'success',
            message: 'Registro creado exitosamente',
            data: { id: result.insertId },
            errors: []
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: 'Error al registrar el detalle de venta',
            data: null,
            errors: []
        });
    }
});

// 4. PUT /api/v1/detalle_ventas/:id -> Actualizar un registro existente
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
    const { id_venta, id_producto, cantidad, precio_unitario } =
        body && typeof body === 'object' && !Array.isArray(body) ? body : {};
    const errores = [];
    const idVentaValido = /^[1-9]\d*$/.test(String(id_venta));
    const idProductoValido = /^[1-9]\d*$/.test(String(id_producto));
    const cantidadEsNumero = cantidad !== '' && cantidad != null && Number.isFinite(Number(cantidad));
    const precioEsNumero = precio_unitario !== '' && precio_unitario != null && Number.isFinite(Number(precio_unitario));

    if (!idVentaValido) {
        errores.push('id_venta es obligatorio y debe ser un entero positivo');
    }
    if (!idProductoValido) {
        errores.push('id_producto es obligatorio y debe ser un entero positivo');
    }
    if (!cantidadEsNumero || !Number.isInteger(Number(cantidad)) || Number(cantidad) <= 0) {
        errores.push('cantidad es obligatoria y debe ser un entero mayor a 0');
    }
    if (precio_unitario != null && (!precioEsNumero || Number(precio_unitario) < 0)) {
        errores.push('precio_unitario debe ser un número mayor o igual a 0');
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
        let precio = precio_unitario != null ? Number(precio_unitario) : null;
        if (precio === null) {
            const [productos] = await pool.query('SELECT precio FROM producto WHERE id_producto = ?', [id_producto]);
            precio = productos.length > 0 ? Number(productos[0].precio) : null;
        }

        if (precio === null) {
            return res.status(400).json({
                status: 'fail',
                message: `El producto con ID ${id_producto} no existe`,
                data: null,
                errors: []
            });
        }

        const subtotal = Math.round((Number(cantidad) * precio + Number.EPSILON) * 100) / 100;
        const [result] = await pool.query(
            'UPDATE detalle_venta SET id_venta = ?, id_producto = ?, cantidad = ?, precio_unitario = ?, subtotal = ? WHERE id_detalle = ?',
            [Number(id_venta), Number(id_producto), Number(cantidad), precio, subtotal, id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                status: 'fail',
                message: `No se pudo actualizar. El detalle de venta con ID ${id} no existe`,
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
            message: 'Error al actualizar el detalle de venta',
            data: null,
            errors: []
        });
    }
});

// 5. DELETE /api/v1/detalle_ventas/:id -> Eliminar un registro por su ID
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
        const [result] = await pool.query('DELETE FROM detalle_venta WHERE id_detalle = ?', [id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({
                status: 'fail',
                message: `No se pudo eliminar. El detalle de venta con ID ${id} no existe`,
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
            message: 'Error al eliminar el detalle de venta',
            data: null,
            errors: []
        });
    }
});

module.exports = router;
