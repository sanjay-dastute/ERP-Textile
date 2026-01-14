/**
 * Copyright - Dastute Switcher Technologies 
 * Author - SANJAY KR, DHILISH
 */
const Vendor = require('./models/Vendor');
const PurchaseOrder = require('./models/PurchaseOrder');
const BlanketOrder = require('./models/BlanketOrder');
const Product = require('../sales/models/Product'); // Assuming Product is shared or in Sales module

// @desc    Create Vendor
// @route   POST /api/purchase/vendors
// @access  Private
exports.createVendor = async (req, res) => {
    try {
        const vendor = await Vendor.create({
            ...req.body,
            organization: req.user.organization
        });
        res.status(201).json({ success: true, data: vendor });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
};

// @desc    Get Vendors
// @route   GET /api/purchase/vendors
// @access  Private
exports.getVendors = async (req, res) => {
    try {
        const vendors = await Vendor.find({ organization: req.user.organization })
            .populate('products.product', 'name code');
        res.status(200).json({ success: true, count: vendors.length, data: vendors });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
};

// @desc    Update Vendor
// @route   PUT /api/purchase/vendors/:id
// @access  Private
exports.updateVendor = async (req, res) => {
    try {
        let vendor = await Vendor.findById(req.params.id);
        if (!vendor) return res.status(404).json({ success: false, error: 'Vendor not found' });

        if (vendor.organization.toString() !== req.user.organization.toString()) {
            return res.status(404).json({ success: false, error: 'Vendor not found' });
        }

        // Use findById logic to load document, apply updates, then save to trigger pre-save middleware (ratings calc)
        // Or if using findByIdAndUpdate, middleware won't run unless configured, but for ratings we did pre-save.
        // Let's use the object assign pattern.
        Object.keys(req.body).forEach(key => {
            vendor[key] = req.body[key];
        });

        await vendor.save();
        res.status(200).json({ success: true, data: vendor });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
};

// @desc    Recommend Vendors
// @route   GET /api/purchase/vendors/recommend/:productId
// @access  Private
exports.recommendVendors = async (req, res) => {
    try {
        const { productId } = req.params;

        // Find active vendors that supply this product
        // Note: 'products.product' is the path in the new schema
        const vendors = await Vendor.find({
            organization: req.user.organization,
            status: 'Active',
            'products.product': productId
        }).sort({ 'ratings.overall': -1 }); // Sort by overall rating desc

        res.status(200).json({ success: true, count: vendors.length, data: vendors });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
};

// @desc    Create Purchase Order
// @route   POST /api/purchase/purchase-orders
// @access  Private
exports.createPO = async (req, res) => {
    try {
        const { blanketOrder: blanketOrderId, items, vendor: vendorId } = req.body;
        let processedItems = items;

        // Fetch Vendor to check MOQ
        const vendor = await Vendor.findById(vendorId);
        if (!vendor) {
            return res.status(404).json({ success: false, error: 'Vendor not found' });
        }

        // Validate MOQ and Calculate Price from Tiers
        // Validate MOQ and Calculate Price from Tiers
        processedItems = items.map(item => {
            const vendorProduct = vendor.products.find(vp => vp.product.toString() === item.product);

            // MOQ Check
            if (vendorProduct) {
                if (item.quantity < vendorProduct.moq) {
                    throw new Error(`Quantity ${item.quantity} is below MOQ ${vendorProduct.moq} for product`);
                }
            }

            // Tier Pricing Logic
            let unitPrice = item.unitPrice; // Use provided or default

            if (vendorProduct && vendorProduct.pricingTiers && vendorProduct.pricingTiers.length > 0) {
                // Find tiers where quantity >= minQuantity
                const applicableTiers = vendorProduct.pricingTiers.filter(tier => item.quantity >= tier.minQuantity);

                if (applicableTiers.length > 0) {
                    // Sort by price ascending to find lowest price
                    applicableTiers.sort((a, b) => a.price - b.price);
                    unitPrice = applicableTiers[0].price;
                }
            }

            return {
                ...item,
                unitPrice,
                total: unitPrice * item.quantity
            };
        });

        // processedItems = items; // Removed redundant assignment

        // Blanket Order Logic
        if (blanketOrderId) {
            const bo = await BlanketOrder.findOne({
                _id: blanketOrderId,
                organization: req.user.organization,
                status: 'Active'
            });

            if (!bo) {
                return res.status(404).json({ success: false, error: 'Active Blanket Order not found' });
            }

            // Check Validity Dates
            const now = new Date();
            if (now < bo.validFrom || now > bo.validTo) {
                return res.status(400).json({ success: false, error: 'Blanket Order is invalid for current date' });
            }

            // Validate Vendor Match
            if (bo.vendor.toString() !== req.body.vendor) {
                return res.status(400).json({ success: false, error: 'Vendor does not match Blanket Order' });
            }

            // Update Items with Agreed Price and Update BO Quantity
            processedItems = items.map(item => {
                const boItem = bo.items.find(i => i.product.toString() === item.product);
                if (boItem) {
                    // Check Quantity Limit
                    if (boItem.orderedQuantity + item.quantity > boItem.maxQuantity) {
                        throw new Error(`Quantity exceeds Blanket Order limit for product ${item.product}`);
                    }

                    // Update BO tracking (in memory, will save below)
                    boItem.orderedQuantity += item.quantity;

                    // Override Price
                    return {
                        ...item,
                        unitPrice: boItem.agreedPrice,
                        total: boItem.agreedPrice * item.quantity
                    };
                }
                return item;
            });

            // Save updated BO
            await bo.save();
        }

        // Recalculate Total Amount if prices changed
        const totalAmount = processedItems.reduce((acc, item) => acc + item.total, 0);

        const po = await PurchaseOrder.create({
            ...req.body,
            items: processedItems,
            totalAmount,
            paymentTerms: vendor.paymentTerms,
            poNumber: 'PO-' + Date.now(),
            organization: req.user.organization
        });
        res.status(201).json({ success: true, data: po });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
};

// @desc    Create Blanket Order
// @route   POST /api/purchase/blanket-orders
// @access  Private
exports.createBlanketOrder = async (req, res) => {
    try {
        const bo = await BlanketOrder.create({
            ...req.body,
            agreementNumber: 'BO-' + Date.now(),
            organization: req.user.organization
        });
        res.status(201).json({ success: true, data: bo });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
};

// @desc    Get Blanket Orders
// @route   GET /api/purchase/blanket-orders
// @access  Private
exports.getBlanketOrders = async (req, res) => {
    try {
        const bos = await BlanketOrder.find({ organization: req.user.organization })
            .populate('vendor', 'name')
            .sort('-createdAt');
        res.status(200).json({ success: true, count: bos.length, data: bos });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
};

// @desc    Get Purchase Orders
// @route   GET /api/purchase/purchase-orders
// @access  Private
exports.getPOs = async (req, res) => {
    try {
        const pos = await PurchaseOrder.find({ organization: req.user.organization })
            .populate('vendor', 'name')
            .sort('-createdAt');
        res.status(200).json({ success: true, count: pos.length, data: pos });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
};

// @desc    Update Purchase Order
// @route   PUT /api/purchase/purchase-orders/:id
// @access  Private
exports.updatePO = async (req, res) => {
    try {
        let po = await PurchaseOrder.findById(req.params.id);
        if (!po) return res.status(404).json({ success: false, error: 'PO not found' });

        if (po.organization.toString() !== req.user.organization.toString()) {
            return res.status(404).json({ success: false, error: 'PO not found' });
        }

        po = await PurchaseOrder.findByIdAndUpdate(req.params.id, req.body, {
            new: true,
            runValidators: true
        });

        res.status(200).json({ success: true, data: po });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
};
