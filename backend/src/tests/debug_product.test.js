const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const Product = require('../modules/sales/models/Product');

let mongoServer;

// Setup is handled by jest.setup.js
// beforeAll(async () => {
//     mongoServer = await MongoMemoryServer.create();
//     await mongoose.connect(mongoServer.getUri());
// });

// afterAll(async () => {
//     await mongoose.disconnect();
//     await mongoServer.stop();
// });

test('Should create product', async () => {
    try {
        const orgId = new mongoose.Types.ObjectId();
        const p = await Product.create({
            name: 'Test Product',
            sku: 'TEST-SKU',
            organization: orgId
        });
        console.log('Product created:', p);
    } catch (err) {
        require('fs').writeFileSync('debug_error.json', JSON.stringify(err, null, 2));
        throw err;
    }
});
