const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const authRoutes = require('./modules/auth/auth.routes');

const organizationRoutes = require('./modules/core/organization.routes');
const salesRoutes = require('./modules/sales/sales.routes');
const purchaseRoutes = require('./modules/purchase/purchase.routes');
const cookieParser = require('cookie-parser');
const { protect } = require('./middleware/auth.middleware');
const { contextMiddleware } = require('./middleware/context.middleware');
const { sanitizeInput, preventTenantHopping } = require('./middleware/security.middleware');

const app = express();

// Middleware
app.use(express.json());
app.use(cookieParser());
app.use(contextMiddleware);
app.use(sanitizeInput);
app.use(preventTenantHopping);
app.use(cors());
app.use(helmet());
app.use(morgan('dev'));

// Basic Route
// Routes
app.use('/api/auth', authRoutes);
app.use('/api/organization', organizationRoutes);
app.use('/api/sales', salesRoutes);
app.use('/api/purchase', purchaseRoutes);

app.get('/', (req, res) => {
    res.json({ message: 'Textile-ERP API is running' });
});

module.exports = app;
