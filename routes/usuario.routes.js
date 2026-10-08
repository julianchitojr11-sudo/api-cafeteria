const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const bcrypt = require('bcrypt');

const PASSWORD_MIN = 6;

// 1. GET /api/v1/usuarios -> Obtener la lista completa de registros
router.get('/', async (req, res) => {
    try {
        const [rows] = await pool.query(
            'SELECT id_usuario, nombre, email, rol, fecha_creacion FROM usuario ORDER BY id_usuario DESC'
        );
        res.status(200).json({
            status: 'success',
            message: 'Usuarios obtenidos correctamente',
            data: { items: rows, count: rows.length },
            errors: []
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: 'Error al obtener los usuarios',
            data: null,
            errors: []
        });
    }
});

// 2. GET /api/v1/usuarios/:id -> Obtener un registro por su ID
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
        const [rows] = await pool.query(
            'SELECT id_usuario, nombre, email, rol, fecha_creacion FROM usuario WHERE id_usuario = ?',
            [id]
        );

        if (rows.length === 0) {
            return res.status(404).json({
                status: 'fail',
                message: `Usuario con ID ${id} no encontrado`,
                data: null,
                errors: []
            });
        }

        res.status(200).json({
            status: 'success',
            message: 'Usuario obtenido correctamente',
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

// 3. POST /api/v1/usuarios -> Crear un nuevo usuario
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

    const { nombre, email, password, rol } = body;
    const errores = [];
    const emailValido = typeof email === 'string' &&
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

    if (typeof nombre !== 'string' || !nombre.trim()) {
        errores.push('nombre es obligatorio (texto)');
    }
    if (!emailValido) {
        errores.push('email es obligatorio y debe tener un formato válido');
    }
    if (typeof rol !== 'string' || !rol.trim()) {
        errores.push('rol es obligatorio (texto)');
    }
    if (typeof password !== 'string' || password.length < PASSWORD_MIN) {
        errores.push(`password es obligatorio y debe tener al menos ${PASSWORD_MIN} caracteres`);
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
        const passwordHash = await bcrypt.hash(password, 10);
        const [result] = await pool.query(
            `INSERT INTO usuario (nombre, email, password_hash, rol, fecha_creacion)
             VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)`,
            [nombre.trim(), email.trim().toLowerCase(), passwordHash, rol.trim()]
        );

        res.location(`/api/v1/usuarios/${result.insertId}`).status(201).json({
            status: 'success',
            message: 'Registro creado exitosamente',
            data: { id: result.insertId },
            errors: []
        });
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({
                status: 'fail',
                message: 'El email ya está registrado',
                data: null,
                errors: []
            });
        }

        res.status(500).json({
            status: 'error',
            message: 'Error al registrar el usuario',
            data: null,
            errors: []
        });
    }
});

// 4. PUT /api/v1/usuarios/:id -> Actualizar un usuario existente
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
    const { nombre, email, password, rol } =
        body && typeof body === 'object' && !Array.isArray(body) ? body : {};
    const errores = [];
    const emailValido = typeof email === 'string' &&
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

    if (typeof nombre !== 'string' || !nombre.trim()) {
        errores.push('nombre es obligatorio (texto)');
    }
    if (!emailValido) {
        errores.push('email es obligatorio y debe tener un formato válido');
    }
    if (typeof rol !== 'string' || !rol.trim()) {
        errores.push('rol es obligatorio (texto)');
    }
    if (password != null && (typeof password !== 'string' || password.length < PASSWORD_MIN)) {
        errores.push(`password es obligatorio y debe tener al menos ${PASSWORD_MIN} caracteres`);
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
        let query = 'UPDATE usuario SET nombre = ?, email = ?, rol = ?';
        const values = [nombre.trim(), email.trim().toLowerCase(), rol.trim()];

        if (password != null) {
            query += ', password_hash = ?';
            values.push(await bcrypt.hash(password, 10));
        }

        query += ' WHERE id_usuario = ?';
        values.push(id);

        const [result] = await pool.query(query, values);

        if (result.affectedRows === 0) {
            const [rows] = await pool.query('SELECT id_usuario FROM usuario WHERE id_usuario = ?', [id]);

            if (rows.length === 0) {
                return res.status(404).json({
                    status: 'fail',
                    message: `No se pudo actualizar. El usuario con ID ${id} no existe`,
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
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({
                status: 'fail',
                message: 'El email ya está registrado',
                data: null,
                errors: []
            });
        }

        res.status(500).json({
            status: 'error',
            message: 'Error al actualizar el usuario',
            data: null,
            errors: []
        });
    }
});

// 5. DELETE /api/v1/usuarios/:id -> Eliminar un registro por su ID
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
        const [result] = await pool.query('DELETE FROM usuario WHERE id_usuario = ?', [id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({
                status: 'fail',
                message: `No se pudo eliminar. El usuario con ID ${id} no existe`,
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
            message: 'Error al eliminar el usuario',
            data: null,
            errors: []
        });
    }
});

module.exports = router;
