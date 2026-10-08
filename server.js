const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());

// Importar Enrutador de Productos
const productosRoutes = require('./routes/producto.routes');
const modificadoresRoutes = require('./routes/modificador.routes');
const ventasRoutes = require('./routes/venta.routes');
const usuariosRoutes = require('./routes/usuario.routes');
const recetasRoutes = require('./routes/receta.routes');
const detalleVentasRoutes = require('./routes/detalle_venta.routes');

// Vincular Prefijo Base RESTful
app.use('/api/v1/productos', productosRoutes);
app.use('/api/v1/modificadores', modificadoresRoutes);
app.use('/api/v1/ventas', ventasRoutes);
app.use('/api/v1/detalle_ventas', detalleVentasRoutes);
app.use('/api/v1/recetas', recetasRoutes);
app.use('/api/v1/usuarios', usuariosRoutes);

// Ruta de estado del servidor
app.get('/api/v1', (req, res) => {
    res.status(200).json({
        status: 'success',
        message: 'API POS Cafetería',
        data: {
            endpoints: {
                productos: '/api/v1/productos',
                modificadores: '/api/v1/modificadores',
                ventas: '/api/v1/ventas',
                detalle_ventas: '/api/v1/detalle_ventas',
                recetas: '/api/v1/recetas',
                usuarios: '/api/v1/usuarios'
            }
        },
        errors: []
    });
});

// Mantener las respuestas JSON estandarizadas ante errores de parseo o no controlados.
app.use((error, req, res, next) => {
    if (res.headersSent) {
        return next(error);
    }

    const isInvalidJson = error.type === 'entity.parse.failed';
    const statusCode = isInvalidJson ? 400 : 500;

    res.status(statusCode).json({
        status: isInvalidJson ? 'fail' : 'error',
        message: isInvalidJson ? 'El cuerpo de la solicitud contiene JSON inválido' : 'Error interno del servidor',
        data: null,
        errors: isInvalidJson ? ['Verifica la sintaxis del JSON enviado'] : []
    });
});

// Manejo de rutas no encontradas (404)
app.use((req, res) => {
    res.status(404).json({
        status: 'fail',
        message: 'Endpoint no encontrado',
        data: null,
        errors: []
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Servidor ejecutándose en: http://localhost:${PORT}`);
    console.log(`📌 Endpoint base RESTful: http://localhost:${PORT}/api/v1/productos`);
    console.log(`📌 Endpoint base RESTful: http://localhost:${PORT}/api/v1/modificadores`);
    console.log(`📌 Endpoint base RESTful: http://localhost:${PORT}/api/v1/ventas`);
    console.log(`📌 Endpoint base RESTful: http://localhost:${PORT}/api/v1/recetas`);
    console.log(`📌 Endpoint base RESTful: http://localhost:${PORT}/api/v1/usuarios`);
    console.log(`📌 Endpoint base RESTful: http://localhost:${PORT}/api/v1/detalle_ventas`);
});