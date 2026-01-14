const Quotation = require('./models/Quotation');
const SalesOrder = require('./models/SalesOrder');
const ReturnOrder = require('./models/ReturnOrder');
const Customer = require('./models/Customer');
const Contact = require('./models/Contact');
const Interaction = require('./models/Interaction');
const Product = require('./models/Product');
const { getKey } = require('../../utils/context');
const Activity = require('./models/Activity');
const Document = require('./models/Document');
const Complaint = require('./models/Complaint');
const Invoice = require('./models/Invoice');
const NPSResponse = require('./models/NPSResponse');
const Deal = require('./models/Deal');
const fs = require('fs-extra');
const path = require('path');

// @desc    Add Interaction
// @route   POST /api/sales/customers/:id/interactions
// @access  Private
exports.addInteraction = async (req, res) => {
    try {
        const customerId = req.params.id;
        const customer = await Customer.findById(customerId);

        if (!customer) {
            return res.status(404).json({ success: false, error: 'Customer not found' });
        }

        const interaction = await Interaction.create({
            ...req.body,
            customer: customerId,
            performedBy: req.user._id,
            organization: req.user.organization
        });

        res.status(201).json({ success: true, data: interaction });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
};

// @desc    Get Interactions for Customer
// @route   GET /api/sales/customers/:id/interactions
// @access  Private
exports.getInteractions = async (req, res) => {
    try {
        const interactions = await Interaction.find({
            customer: req.params.id,
            organization: req.user.organization
        }).sort({ date: -1 });

        res.status(200).json({ success: true, count: interactions.length, data: interactions });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
};

// @desc    Add Contact to Customer
// @route   POST /api/sales/customers/:id/contacts
// @access  Private
exports.addContact = async (req, res) => {
    try {
        const customerId = req.params.id;
        const customer = await Customer.findById(customerId); // tenant plugin handles filtering

        if (!customer) {
            return res.status(404).json({ success: false, error: 'Customer not found' });
        }

        const contact = await Contact.create({
            ...req.body,
            customer: customerId,
            organization: req.user.organization
        });

        res.status(201).json({ success: true, data: contact });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
};

// @desc    Get Contacts for Customer
// @route   GET /api/sales/customers/:id/contacts
// @access  Private
exports.getContacts = async (req, res) => {
    try {
        const contacts = await Contact.find({
            customer: req.params.id,
            organization: req.user.organization
        });

        res.status(200).json({ success: true, count: contacts.length, data: contacts });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
};

// @desc    Create Return Order
// @route   POST /api/sales/returns
// @access  Private
exports.createReturnOrder = async (req, res) => {
    try {
        const { salesOrderId, type, items } = req.body;

        const salesOrder = await SalesOrder.findById(salesOrderId);
        if (!salesOrder) {
            return res.status(404).json({ success: false, error: 'Sales Order not found' });
        }

        const returnNumber = `RT-${Date.now()}`;

        const returnOrder = await ReturnOrder.create({
            returnNumber,
            salesOrder: salesOrderId,
            customer: salesOrder.customerRef,
            type,
            items,
            organization: req.user.organization
        });

        res.status(201).json({ success: true, data: returnOrder });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
};

// @desc    Update Return Status
// @route   PUT /api/sales/returns/:id/status
// @access  Private
exports.updateReturnStatus = async (req, res) => {
    try {
        const { status } = req.body;
        const returnOrder = await ReturnOrder.findById(req.params.id);

        if (!returnOrder) {
            return res.status(404).json({ success: false, error: 'Return Order not found' });
        }

        // Inventory Logic: If status -> Received and Type is Return, Restock
        if (status === 'Received' && returnOrder.status !== 'Received' && returnOrder.type === 'Return') {
            for (const item of returnOrder.items) {
                if (item.productRef) {
                    const product = await Product.findById(item.productRef);
                    if (product) {
                        product.quantityOnHand += item.quantity;
                        await product.save();
                    }
                }
            }
        }

        returnOrder.status = status;
        await returnOrder.save();

        res.status(200).json({ success: true, data: returnOrder });

    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
};

// @desc    Get My Orders (Portal)
// @route   GET /api/sales/portal/orders
// @access  Private (Customer)
exports.getPortalOrders = async (req, res) => {
    try {
        // Find Customer linked to this User
        const customer = await Customer.findOne({
            portalUser: req.user._id,
            organization: req.user.organization
        });

        if (!customer) {
            return res.status(404).json({ success: false, error: 'Customer profile not found for this user' });
        }

        const orders = await SalesOrder.find({
            customerRef: customer._id,
            organization: req.user.organization
        }).sort({ createdAt: -1 });

        res.status(200).json({ success: true, count: orders.length, data: orders });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
};

// @desc    Get My Quotations (Portal)
// @route   GET /api/sales/portal/quotations
// @access  Private (Customer)
exports.getPortalQuotations = async (req, res) => {
    try {
        const customer = await Customer.findOne({
            portalUser: req.user._id,
            organization: req.user.organization
        });

        if (!customer) {
            return res.status(404).json({ success: false, error: 'Customer profile not found for this user' });
        }

        const quotations = await Quotation.find({
            customerRef: customer._id,
            organization: req.user.organization
        }).sort({ createdAt: -1 });

        res.status(200).json({ success: true, count: quotations.length, data: quotations });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
};

// @desc    Create new customer
// @route   POST /api/sales/customers
// @access  Private
exports.createCustomer = async (req, res) => {
    try {
        const customer = await Customer.create({
            ...req.body,
            organization: req.user.organization
        });

        res.status(201).json({ success: true, data: customer });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
};

// @desc    Update Customer
// @route   PUT /api/sales/customers/:id
// @access  Private
exports.updateCustomer = async (req, res) => {
    try {
        let customer = await Customer.findById(req.params.id);

        if (!customer) {
            return res.status(404).json({ success: false, error: 'Customer not found' });
        }

        // Verify tenant or ownership if needed (tenant plugin handles query usually, but findById might not if not carefully used with plugin options or separate check)
        if (customer.organization.toString() !== req.user.organization.toString()) {
            return res.status(404).json({ success: false, error: 'Customer not found' });
        }

        customer = await Customer.findByIdAndUpdate(req.params.id, req.body, {
            new: true,
            runValidators: true
        });

        res.status(200).json({ success: true, data: customer });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
};

// @desc    Get Customer Hierarchy
// @route   GET /api/sales/customers/:id/hierarchy
// @access  Private
exports.getCustomerHierarchy = async (req, res) => {
    try {
        const rootId = req.params.id;

        // Find root
        const root = await Customer.findOne({ _id: rootId, organization: req.user.organization });
        if (!root) {
            return res.status(404).json({ success: false, error: 'Customer not found' });
        }

        const children = await Customer.find({ parentCustomer: rootId, organization: req.user.organization });

        res.status(200).json({ success: true, data: { ...root.toObject(), children } });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
};

// @desc    Convert Quotation to Sales Order
// @route   POST /api/sales/quotations/:id/convert
// @access  Private
exports.convertQuoteToSO = async (req, res) => {
    try {
        const quotationId = req.params.id;

        const quotation = await Quotation.findById(quotationId);
        if (!quotation) {
            return res.status(404).json({ success: false, error: 'Quotation not found' });
        }

        const customer = await Customer.findById(quotation.customerRef);
        if (!customer) {
            return res.status(404).json({ success: false, error: 'Customer not found' });
        }

        // Check Credit Status
        if (['Hold', 'Closed'].includes(customer.creditStatus)) {
            return res.status(400).json({ success: false, error: `Customer is on Credit ${customer.creditStatus}` });
        }

        // Check Credit Limit
        if (customer.creditLimit > 0 && (customer.usedCredit + quotation.totalAmount) > customer.creditLimit) {
            return res.status(400).json({ success: false, error: 'Credit limit exceeded' });
        }

        // Process Items and Allocate Stock
        const orderItems = [];
        if (quotation.items && Array.isArray(quotation.items)) {
            for (const item of quotation.items) {
                let quantityAllocated = 0;
                let quantityBackordered = 0;
                let allocationStatus = 'Pending';

                if (item.productRef) {
                    try {
                        const product = await Product.findById(item.productRef);
                        if (product) {
                            const available = product.quantityOnHand || 0;
                            if (available >= item.quantity) {
                                quantityAllocated = item.quantity;
                                product.quantityOnHand -= item.quantity;
                                allocationStatus = 'Fully Allocated';
                            } else {
                                quantityAllocated = available;
                                quantityBackordered = item.quantity - quantityAllocated;
                                product.quantityOnHand = 0;
                                allocationStatus = quantityAllocated > 0 ? 'Partially Allocated' : 'Backordered';
                            }
                            await product.save();
                        } else {
                            quantityAllocated = item.quantity;
                            allocationStatus = 'Fully Allocated';
                        }
                    } catch (err) {
                        console.error('Product lookup failed', err);
                        quantityAllocated = item.quantity;
                        allocationStatus = 'Fully Allocated';
                    }
                } else {
                    quantityAllocated = item.quantity;
                    allocationStatus = 'Fully Allocated';
                }

                orderItems.push({
                    productRef: item.productRef,
                    description: item.description,
                    quantity: item.quantity,
                    unitPrice: item.unitPrice,
                    amount: item.amount,
                    color: item.color,
                    size: item.size,
                    pricingMethod: item.pricingMethod,
                    costPrice: item.costPrice,
                    markupPercent: item.markupPercent,
                    tierId: item.tierId,
                    shrinkagePercent: item.shrinkagePercent,
                    grossQuantity: item.grossQuantity,
                    quantityAllocated,
                    quantityBackordered,
                    allocationStatus
                });
            }
        }

        const salesOrder = await SalesOrder.create({
            number: `SO-${Date.now()}`,
            quotation: quotationId,
            customer: quotation.customer,
            customerRef: quotation.customerRef,
            salesRep: quotation.salesRep,
            commissionRate: quotation.commissionRate,
            commissionAmount: 0,
            items: orderItems,
            totalAmount: quotation.totalAmount,
            status: 'Confirmed',
            expectedDeliveryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            organization: req.user.organization
        });

        // Update Usage
        customer.usedCredit += quotation.totalAmount;
        await customer.save();

        quotation.status = 'Converted';
        await quotation.save();

        res.status(201).json({ success: true, data: salesOrder });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
};

// @desc    Create new product
// @route   POST /api/sales/products
// @access  Private
exports.createProduct = async (req, res) => {
    try {
        const product = await Product.create({
            ...req.body,
            organization: req.user.organization
        });
        res.status(201).json({ success: true, data: product });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
};

// @desc    Update order status
// @route   PUT /api/sales/orders/:id/status
// @access  Private
exports.updateOrderStatus = async (req, res) => {
    try {
        const { status, comment } = req.body;
        const order = await SalesOrder.findById(req.params.id);

        if (!order) {
            return res.status(404).json({ success: false, error: 'Order not found' });
        }

        // State Machine Validation
        const allowedTransitions = {
            'Draft': ['Confirmed', 'Cancelled'],
            'Confirmed': ['Approved', 'Cancelled'],
            'Approved': ['Released', 'Cancelled'],
            'Released': ['Shipped', 'Cancelled'],
            'Shipped': ['Invoiced', 'Cancelled', 'Closed'],
            'Invoiced': ['Closed', 'Cancelled'],
            'Closed': [],
            'Cancelled': []
        };

        const allowed = allowedTransitions[order.status];
        if (!allowed || !allowed.includes(status)) {
            return res.status(400).json({
                success: false,
                error: `Invalid status transition from ${order.status} to ${status}`
            });
        }

        if (status === 'Invoiced' && order.commissionRate > 0) {
            order.commissionAmount = order.totalAmount * (order.commissionRate / 100);
        }

        order.status = status;
        order.statusHistory.push({
            status,
            changedBy: req.user._id,
            comment
        });

        await order.save();

        res.status(200).json({ success: true, data: order });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
};

// @desc    Update sales order (e.g. Delivery Schedule)
// @route   PUT /api/sales/orders/:id
// @access  Private
exports.updateSalesOrder = async (req, res) => {
    try {
        let order = await SalesOrder.findById(req.params.id);

        if (!order) {
            return res.status(404).json({ success: false, error: 'Order not found' });
        }

        // Handle Item Updates (specifically Delivery Schedule)
        if (req.body.items) {
            // We need to map updates to existing items
            // Basic logic: User sends array of items with _id and deliverySchedule

            for (const updateItem of req.body.items) {
                const dbItem = order.items.id(updateItem._id);
                if (dbItem) {
                    if (updateItem.deliverySchedule) {
                        // Validate Total Quantity
                        const totalScheduled = updateItem.deliverySchedule.reduce((acc, sch) => acc + sch.quantity, 0);
                        // Tolerant check? Or Strict? Plan said Strict.
                        if (totalScheduled !== dbItem.quantity) {
                            return res.status(400).json({
                                success: false,
                                error: `Schedule total ${totalScheduled} does not match item quantity ${dbItem.quantity} for item ${dbItem.description}`
                            });
                        }
                        dbItem.deliverySchedule = updateItem.deliverySchedule;
                    }
                }
            }
        }

        await order.save();
        res.status(200).json({ success: true, data: order });

    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
};



// @desc    Get sales performance stats
// @route   GET /api/sales/reports/performance
// @access  Private
exports.getSalesPerformance = async (req, res) => {
    try {
        const overall = await SalesOrder.aggregate([
            { $match: { organization: req.user.organization } },
            {
                $group: {
                    _id: null,
                    totalRevenue: { $sum: "$totalAmount" },
                    totalOrders: { $sum: 1 },
                    avgOrderValue: { $avg: "$totalAmount" }
                }
            }
        ]);

        const monthly = await SalesOrder.aggregate([
            { $match: { organization: req.user.organization } },
            {
                $group: {
                    _id: {
                        month: { $month: "$createdAt" },
                        year: { $year: "$createdAt" }
                    },
                    revenue: { $sum: "$totalAmount" },
                    orders: { $sum: 1 }
                }
            },
            { $sort: { "_id.year": -1, "_id.month": -1 } }
        ]);

        res.status(200).json({
            success: true,
            data: {
                overall: overall[0] || { totalRevenue: 0, totalOrders: 0, avgOrderValue: 0 },
                monthly
            }
        });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
};



// @desc    Get commission report
// @route   GET /api/sales/reports/commissions
// @access  Private
exports.getCommissions = async (req, res) => {
    try {
        const commissions = await SalesOrder.aggregate([
            {
                $match: {
                    organization: req.user.organization,
                    status: 'Invoiced',
                    salesRep: { $exists: true }
                }
            },
            {
                $group: {
                    _id: "$salesRep",
                    totalCommission: { $sum: "$commissionAmount" },
                    totalSales: { $sum: "$totalAmount" },
                    ordersCount: { $sum: 1 }
                }
            },
            {
                $lookup: {
                    from: "users", // Verify collection name 'users'
                    localField: "_id",
                    foreignField: "_id",
                    as: "salesRepInfo"
                }
            },
            { $unwind: "$salesRepInfo" },
            {
                $project: {
                    name: "$salesRepInfo.name",
                    email: "$salesRepInfo.email",
                    totalCommission: 1,
                    totalSales: 1,
                    ordersCount: 1
                }
            }
        ]);

        res.status(200).json({ success: true, data: commissions });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
};



// @desc    Create new quotation
// @route   POST /api/sales/quotations
// @access  Private (Manager/Satff)
exports.createQuotation = async (req, res) => {
    try {
        const { customer, items, validUntil } = req.body;

        // Auto-generate simplistic number (TIMESTAMP-RAND)
        // In real app, use a counter collection
        const quoteNumber = `QT-${Date.now()}`;

        // Calculate total
        // const totalAmount = items.reduce((acc, item) => acc + (item.quantity * item.unitPrice), 0); // This line is replaced

        // Calculate Pricing
        if (req.body.items) {
            req.body.items = req.body.items.map(item => {
                if (item.pricingMethod === 'CostPlus' && item.costPrice && item.markupPercent) {
                    item.unitPrice = item.costPrice * (1 + item.markupPercent / 100);
                }

                // Calculate Gross Quantity (Shrinkage)
                if (item.quantity) {
                    const shrinkage = item.shrinkagePercent || 0;
                    item.grossQuantity = item.quantity * (1 + shrinkage / 100);
                }
                // Recalculate amount just in case
                if (item.quantity && item.unitPrice) {
                    item.amount = item.quantity * item.unitPrice;
                }
                return item;
            });

            // Recalculate Total
            req.body.totalAmount = req.body.items.reduce((acc, item) => acc + (item.amount || 0), 0);
        } else {
            req.body.totalAmount = 0; // Ensure totalAmount is set even if no items
        }

        const quotation = await Quotation.create({
            ...req.body,
            number: quoteNumber,
            organization: req.user.organization
        });

        res.status(201).json({
            success: true,
            data: quotation
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            error: error.message
        });
    }
};

// @desc    Get all quotations
// @route   GET /api/sales/quotations
// @access  Private
exports.getQuotations = async (req, res) => {
    try {
        // RLS plugin automatically filters by organization
        const quotations = await Quotation.find().sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            count: quotations.length,
            data: quotations
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            error: error.message
        });
    }
};

// @desc    Get single quotation
// @route   GET /api/sales/quotations/:id
// @access  Private
exports.getQuotation = async (req, res) => {
    try {
        const quotation = await Quotation.findById(req.params.id);

        if (!quotation) {
            return res.status(404).json({
                success: false,
                error: 'Quotation not found'
            });
        }

        res.status(200).json({
            success: true,
            data: quotation
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            error: error.message
        });
    }
};

// @desc    Update quotation
// @route   PUT /api/sales/quotations/:id
// @access  Private
exports.updateQuotation = async (req, res) => {
    try {
        let quotation = await Quotation.findById(req.params.id);

        if (!quotation) {
            return res.status(404).json({
                success: false,
                error: 'Quotation not found'
            });
        }

        // Check if status is being updated to Sent/Accepted? 
        // For now, allow field updates.

        // Recalculate total if items change
        // Recalculate total if items change
        if (req.body.items) {
            req.body.items = req.body.items.map(item => {
                if (item.pricingMethod === 'CostPlus' && item.costPrice && item.markupPercent) {
                    item.unitPrice = item.costPrice * (1 + item.markupPercent / 100);
                }

                // Calculate Gross Quantity (Shrinkage)
                if (item.quantity) {
                    const shrinkage = item.shrinkagePercent || 0;
                    item.grossQuantity = item.quantity * (1 + shrinkage / 100);
                }
                // Recalculate amount just in case
                if (item.quantity && item.unitPrice) {
                    item.amount = item.quantity * item.unitPrice;
                }
                return item;
            });
            req.body.totalAmount = req.body.items.reduce((acc, item) => acc + (item.amount || 0), 0);
        }

        quotation = await Quotation.findByIdAndUpdate(req.params.id, req.body, {
            new: true,
            runValidators: true
        });

        res.status(200).json({
            success: true,
            data: quotation
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            error: error.message
        });
    }
};

// @desc    Delete quotation
// @route   DELETE /api/sales/quotations/:id
// @access  Private
exports.deleteQuotation = async (req, res) => {
    try {
        const quotation = await Quotation.findById(req.params.id);

        if (!quotation) {
            return res.status(404).json({
                success: false,
                error: 'Quotation not found'
            });
        }

        await quotation.deleteOne();

        res.status(200).json({
            success: true,
            data: {}
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            error: error.message
        });
    }
};

// @desc    Create new activity
// @route   POST /api/sales/customers/:id/activities
// @access  Private
exports.createActivity = async (req, res) => {
    try {
        const customerId = req.params.id;
        const customer = await Customer.findById(customerId);

        if (!customer) {
            return res.status(404).json({ success: false, error: 'Customer not found' });
        }

        const activity = await Activity.create({
            ...req.body,
            customer: customerId,
            createdBy: req.user._id,
            organization: req.user.organization
        });

        res.status(201).json({ success: true, data: activity });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
};

// @desc    Get Activities for Customer
// @route   GET /api/sales/customers/:id/activities
// @access  Private
exports.getActivities = async (req, res) => {
    try {
        const activities = await Activity.find({
            customer: req.params.id,
            organization: req.user.organization
        }).sort({ dueDate: 1, createdAt: -1 });

        res.status(200).json({ success: true, count: activities.length, data: activities });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
};

// @desc    Update Activity
// @route   PUT /api/sales/activities/:id
// @access  Private
exports.updateActivity = async (req, res) => {
    try {
        let activity = await Activity.findById(req.params.id);

        if (!activity) {
            return res.status(404).json({ success: false, error: 'Activity not found' });
        }

        if (activity.organization.toString() !== req.user.organization.toString()) {
            return res.status(404).json({ success: false, error: 'Activity not found' });
        }

        activity = await Activity.findByIdAndUpdate(req.params.id, req.body, {
            new: true,
            runValidators: true
        });

        res.status(200).json({ success: true, data: activity });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
};

// @desc    Delete Activity
// @route   DELETE /api/sales/activities/:id
// @access  Private
exports.deleteActivity = async (req, res) => {
    try {
        const activity = await Activity.findById(req.params.id);

        if (!activity) {
            return res.status(404).json({ success: false, error: 'Activity not found' });
        }

        if (activity.organization.toString() !== req.user.organization.toString()) {
            return res.status(404).json({ success: false, error: 'Activity not found' });
        }

        await activity.deleteOne();

        res.status(200).json({ success: true, data: {} });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
};

// @desc    Upload Document
// @route   POST /api/sales/customers/:id/documents
// @access  Private
exports.uploadDocument = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, error: 'Please upload a file' });
        }

        const customerId = req.params.id;
        const customer = await Customer.findById(customerId);

        if (!customer) {
            // Cleanup file if customer not found
            await fs.unlink(req.file.path).catch(() => { });
            return res.status(404).json({ success: false, error: 'Customer not found' });
        }

        const document = await Document.create({
            filename: req.file.filename,
            originalName: req.file.originalname,
            path: req.file.path,
            mimetype: req.file.mimetype,
            size: req.file.size,
            customer: customerId,
            uploadedBy: req.user._id,
            organization: req.user.organization,
            tags: req.body.tags ? JSON.parse(req.body.tags) : []
        });

        res.status(201).json({ success: true, data: document });
    } catch (error) {
        // Cleanup file on error
        if (req.file) {
            await fs.unlink(req.file.path).catch(() => { });
        }
        res.status(400).json({ success: false, error: error.message });
    }
};

// @desc    Get Documents for Customer
// @route   GET /api/sales/customers/:id/documents
// @access  Private
exports.getDocuments = async (req, res) => {
    try {
        const documents = await Document.find({
            customer: req.params.id,
            organization: req.user.organization
        }).populate('uploadedBy', 'name');

        res.status(200).json({ success: true, count: documents.length, data: documents });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
};

// @desc    Delete Document
// @route   DELETE /api/sales/documents/:id
// @access  Private
exports.deleteDocument = async (req, res) => {
    try {
        const document = await Document.findById(req.params.id);

        if (!document) {
            return res.status(404).json({ success: false, error: 'Document not found' });
        }

        if (document.organization.toString() !== req.user.organization.toString()) {
            return res.status(404).json({ success: false, error: 'Document not found' });
        }

        // Remove from filesystem
        await fs.unlink(document.path).catch(err => console.error('File unlink error:', err));

        await document.deleteOne();

        res.status(200).json({ success: true, data: {} });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
};

// @desc    Create Complaint
// @route   POST /api/sales/customers/:id/complaints
// @access  Private
exports.createComplaint = async (req, res) => {
    try {
        const customerId = req.params.id;
        const customer = await Customer.findById(customerId);

        if (!customer) {
            return res.status(404).json({ success: false, error: 'Customer not found' });
        }

        const complaint = await Complaint.create({
            ...req.body,
            customer: customerId,
            createdBy: req.user._id,
            organization: req.user.organization
        });

        res.status(201).json({ success: true, data: complaint });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
};

// @desc    Get Complaints (by customer or all allowed)
// @route   GET /api/sales/customers/:id/complaints
// @route   GET /api/sales/complaints
// @access  Private
exports.getComplaints = async (req, res) => {
    try {
        let query = { organization: req.user.organization };

        if (req.params.id) {
            query.customer = req.params.id;
        }

        const complaints = await Complaint.find(query)
            .populate('customer', 'name')
            .populate('assignedTo', 'name')
            .sort('-createdAt');

        res.status(200).json({ success: true, count: complaints.length, data: complaints });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
};

// @desc    Update Complaint
// @route   PUT /api/sales/complaints/:id
// @access  Private
exports.updateComplaint = async (req, res) => {
    try {
        let complaint = await Complaint.findById(req.params.id);

        if (!complaint) {
            return res.status(404).json({ success: false, error: 'Complaint not found' });
        }

        if (complaint.organization.toString() !== req.user.organization.toString()) {
            return res.status(404).json({ success: false, error: 'Complaint not found' });
        }

        // If status is changing to Resolved/Closed, set resolvedBy/resolvedAt
        if (req.body.status && ['Resolved', 'Closed'].includes(req.body.status) && !['Resolved', 'Closed'].includes(complaint.status)) {
            req.body.resolvedBy = req.user._id;
            req.body.resolvedAt = Date.now();
        }

        complaint = await Complaint.findByIdAndUpdate(req.params.id, req.body, {
            new: true,
            runValidators: true
        });

        res.status(200).json({ success: true, data: complaint });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
};

// @desc    Delete Complaint
// @route   DELETE /api/sales/complaints/:id
// @access  Private
exports.deleteComplaint = async (req, res) => {
    try {
        const complaint = await Complaint.findById(req.params.id);

        if (!complaint) {
            return res.status(404).json({ success: false, error: 'Complaint not found' });
        }

        if (complaint.organization.toString() !== req.user.organization.toString()) {
            return res.status(404).json({ success: false, error: 'Complaint not found' });
        }

        await complaint.deleteOne();

        res.status(200).json({ success: true, data: {} });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
};

// @desc    Create Invoice
// @route   POST /api/sales/invoices
// @access  Private
exports.createInvoice = async (req, res) => {
    try {
        const { customer, salesOrder, dueDate, totalAmount } = req.body;

        const invoice = await Invoice.create({
            invoiceNumber: 'INV-' + Date.now(),
            customer,
            salesOrder, // Optional
            dueDate,
            totalAmount,
            organization: req.user.organization
        });

        res.status(201).json({ success: true, data: invoice });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
};

// @desc    Get Invoices
// @route   GET /api/sales/invoices
// @access  Private
exports.getInvoices = async (req, res) => {
    try {
        const invoices = await Invoice.find({ organization: req.user.organization })
            .populate('customer', 'name')
            .sort('-createdAt');

        res.status(200).json({ success: true, count: invoices.length, data: invoices });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
};

// @desc    Get AR Aging Report
// @route   GET /api/sales/reports/ar-aging
// @access  Private
exports.getARAging = async (req, res) => {
    try {
        const invoices = await Invoice.find({
            organization: req.user.organization,
            status: { $in: ['Unpaid', 'Partially Paid', 'Overdue'] }
        }).populate('customer', 'name');

        const agingData = {};
        const now = new Date();

        invoices.forEach(inv => {
            const customerName = inv.customer ? inv.customer.name : 'Unknown';
            if (!agingData[customerName]) {
                agingData[customerName] = { current: 0, days30: 0, days60: 0, days90: 0, over90: 0, total: 0 };
            }

            const due = new Date(inv.dueDate);
            const diffTime = Math.max(0, now - due);
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            const balance = inv.totalAmount - (inv.paidAmount || 0);

            agingData[customerName].total += balance;

            if (diffDays <= 0) {
                agingData[customerName].current += balance;
            } else if (diffDays <= 30) {
                agingData[customerName].days30 += balance;
            } else if (diffDays <= 60) {
                agingData[customerName].days60 += balance;
            } else if (diffDays <= 90) {
                agingData[customerName].days90 += balance;
            } else {
                agingData[customerName].over90 += balance;
            }
        });

        res.status(200).json({ success: true, data: agingData });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
};

// @desc    Submit NPS Response
// @route   POST /api/sales/customers/:id/nps
// @access  Private
exports.submitNPS = async (req, res) => {
    try {
        const customerId = req.params.id;
        const { score, feedback, salesOrder } = req.body;

        const response = await NPSResponse.create({
            customer: customerId,
            score,
            feedback,
            salesOrder,
            organization: req.user.organization
        });

        res.status(201).json({ success: true, data: response });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
};

// @desc    Get NPS Statistics
// @route   GET /api/sales/reports/nps
// @access  Private
exports.getNPSStats = async (req, res) => {
    try {
        const responses = await NPSResponse.find({
            organization: req.user.organization
        });

        const total = responses.length;
        if (total === 0) {
            return res.status(200).json({ success: true, data: { nps: 0, promoters: 0, passives: 0, detractors: 0, total: 0 } });
        }

        let promoters = 0;
        let passives = 0;
        let detractors = 0;

        responses.forEach(r => {
            if (r.score >= 9) promoters++;
            else if (r.score >= 7) passives++;
            else detractors++;
        });

        const nps = Math.round(((promoters - detractors) / total) * 100);

        res.status(200).json({
            success: true,
            data: { nps, promoters, passives, detractors, total }
        });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
};

// @desc    Create Deal
// @route   POST /api/sales/deals
// @access  Private
exports.createDeal = async (req, res) => {
    try {
        const deal = await Deal.create({
            ...req.body,
            organization: req.user.organization,
            assignedTo: req.body.assignedTo || req.user._id
        });

        res.status(201).json({ success: true, data: deal });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
};

// @desc    Get Deals
// @route   GET /api/sales/deals
// @access  Private
exports.getDeals = async (req, res) => {
    try {
        const deals = await Deal.find({ organization: req.user.organization })
            .populate('customer', 'name')
            .populate('assignedTo', 'name')
            .sort('-createdAt');

        res.status(200).json({ success: true, count: deals.length, data: deals });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
};

// @desc    Update Deal
// @route   PUT /api/sales/deals/:id
// @access  Private
exports.updateDeal = async (req, res) => {
    try {
        let deal = await Deal.findById(req.params.id);

        if (!deal) {
            return res.status(404).json({ success: false, error: 'Deal not found' });
        }

        if (deal.organization.toString() !== req.user.organization.toString()) {
            return res.status(404).json({ success: false, error: 'Deal not found' });
        }

        // Update fields
        Object.keys(req.body).forEach(key => {
            deal[key] = req.body[key];
        });

        await deal.save();

        res.status(200).json({ success: true, data: deal });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
};

// @desc    Delete Deal
// @route   DELETE /api/sales/deals/:id
// @access  Private
exports.deleteDeal = async (req, res) => {
    try {
        const deal = await Deal.findById(req.params.id);

        if (!deal) {
            return res.status(404).json({ success: false, error: 'Deal not found' });
        }

        if (deal.organization.toString() !== req.user.organization.toString()) {
            return res.status(404).json({ success: false, error: 'Deal not found' });
        }

        await deal.deleteOne();

        res.status(200).json({ success: true, data: {} });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
};

// @desc    Get Pipeline Summary
// @route   GET /api/sales/reports/pipeline
// @access  Private
exports.getPipelineSummary = async (req, res) => {
    try {
        const deals = await Deal.find({ organization: req.user.organization });

        const summary = {
            'Prospecting': { count: 0, value: 0 },
            'Qualification': { count: 0, value: 0 },
            'Proposal': { count: 0, value: 0 },
            'Negotiation': { count: 0, value: 0 },
            'Closed Won': { count: 0, value: 0 },
            'Closed Lost': { count: 0, value: 0 },
            'Total': { count: 0, value: 0 }
        };

        deals.forEach(deal => {
            const stage = deal.stage;
            if (summary[stage]) {
                summary[stage].count++;
                summary[stage].value += deal.amount;
                summary['Total'].count++;
                summary['Total'].value += deal.amount;
            }
        });

        res.status(200).json({ success: true, data: summary });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
};

// @desc    Get Lead Source Statistics
// @route   GET /api/sales/reports/lead-sources
// @access  Private
exports.getLeadSourceStats = async (req, res) => {
    try {
        const stats = await Customer.aggregate([
            { $match: { organization: req.user.organization } },
            { $group: { _id: '$leadSource', count: { $sum: 1 } } }
        ]);

        // Convert array to object for easier consumption
        const report = {
            'Referral': 0, 'Web': 0, 'Social Media': 0, 'Advertisement': 0,
            'Cold Call': 0, 'Event': 0, 'Other': 0
        };

        stats.forEach(item => {
            if (item._id) {
                report[item._id] = item.count;
            } else {
                report['Other'] += item.count;
            }
        });

        res.status(200).json({ success: true, data: report });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
};

// @desc    Get Customer Lifetime Value (CLV)
// @route   GET /api/sales/reports/clv
// @access  Private
exports.getCustomerCLV = async (req, res) => {
    try {
        const clvData = await Invoice.aggregate([
            { $match: { organization: req.user.organization } },
            {
                $group: {
                    _id: '$customer',
                    totalSpent: { $sum: '$paidAmount' },
                    invoiceCount: { $sum: 1 }
                }
            },
            { $sort: { totalSpent: -1 } },
            { $limit: 20 }, // Top 20 customers
            {
                $lookup: {
                    from: 'customers',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'customerDetails'
                }
            },
            {
                $project: {
                    _id: 1,
                    totalSpent: 1,
                    invoiceCount: 1,
                    customerName: { $arrayElemAt: ['$customerDetails.name', 0] },
                    email: { $arrayElemAt: ['$customerDetails.email', 0] }
                }
            }
        ]);

        res.status(200).json({ success: true, data: clvData });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
};
