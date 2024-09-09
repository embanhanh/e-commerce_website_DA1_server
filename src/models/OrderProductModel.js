const mongoose = require('mongoose')

const Schema = mongoose.Schema

const OrderProducts = new Schema(
    {
        products: [
            {
                product: { type: mongoose.Schema.Types.ObjectId, ref: 'products', required: true },
                quantity: { type: Number, required: true },
            },
        ],
        paymentMethod: { type: String, required: true },
        productsPrice: { type: Number, required: true },
        shippingPrice: { type: Number, required: true },
        totalPrice: { type: Number, required: true },
        status: { type: String, enum: ['Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled'], default: 'Pending' },
        shippingAddress: { type: mongoose.Schema.Types.ObjectId, ref: 'address', required: true },
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'users', required: true },
        paidAt: { type: Date, default: null },
        deliveredAt: { type: Date, default: null },
        voucher: { type: mongoose.Schema.Types.ObjectId, ref: 'vouchers', default: null },
    },
    { timestamps: true }
)

module.exports = mongoose.model('order_products', OrderProducts)
