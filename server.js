const express = require('express');
const cors = require('cors');
const fs = require('fs').promises;
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from 'public' folder
app.use(express.static(path.join(__dirname, 'public')));

// Minimum quantities
const minQuantities = {
    'fish_feed': 10,
    'catfish': 1,
    'materials': 50
};

// Product names
const productNames = {
    'fish_feed': 'Fish Feed',
    'catfish': 'Catfish',
    'materials': 'Materials'
};

// Handle order submission
app.post('/api/order', async (req, res) => {
    try {
        const { name, address, phone, product, quantity, notes } = req.body;

        // Validate required fields
        if (!name || !address || !phone || !product) {
            return res.json({
                success: false,
                message: 'All required fields must be filled'
            });
        }

        // Validate product type
        if (!minQuantities[product]) {
            return res.json({
                success: false,
                message: 'Invalid product selected'
            });
        }

        // Validate quantity
        const qty = parseFloat(quantity);
        if (isNaN(qty) || qty < minQuantities[product]) {
            return res.json({
                success: false,
                message: `Quantity does not meet minimum requirement for ${productNames[product]} (Min: ${minQuantities[product]}kg)`
            });
        }

        // Generate order number and date
        const orderDate = new Date().toISOString().replace('T', ' ').substring(0, 19);
        const orderNumber = 'FP' + Date.now() + Math.floor(Math.random() * 1000);

        // Prepare order data
        const orderLine = `Order #${orderNumber} | Date: ${orderDate} | Name: ${name} | Phone: ${phone} | Address: ${address} | Product: ${productNames[product]} | Quantity: ${qty}kg | Notes: ${notes || 'None'}\n`;

        // Save to file
        try {
            await fs.appendFile('orders.txt', orderLine);
        } catch (error) {
            console.error('File write error:', error);
            return res.json({
                success: false,
                message: 'Unable to save order. Please try again.'
            });
        }

        // Optional: Send email notification using a service like SendGrid, Mailgun, etc.
        // You'll need to install nodemailer: npm install nodemailer
        
        const nodemailer = require('nodemailer');
        
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS
            }
        });

        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: process.env.EMAIL_TO || process.env.EMAIL_USER,
            subject: `New Fish Parque Order - ${orderNumber}`,
            html: `
                <h2>New Order Received</h2>
                <p><strong>Order Number:</strong> ${orderNumber}</p>
                <p><strong>Date:</strong> ${orderDate}</p>
                <hr>
                <h3>Customer Information</h3>
                <p><strong>Name:</strong> ${name}</p>
                <p><strong>Phone:</strong> ${phone}</p>
                <p><strong>Address:</strong> ${address}</p>
                <hr>
                <h3>Order Details</h3>
                <p><strong>Product:</strong> ${productNames[product]}</p>
                <p><strong>Quantity:</strong> ${qty}kg</p>
                <p><strong>Notes:</strong> ${notes || 'None'}</p>
            `
        };

        await transporter.sendMail(mailOptions);
        

        // Success response
        res.json({
            success: true,
            message: `Thank you! Your order #${orderNumber} has been placed successfully. We will contact you shortly.`
        });

    } catch (error) {
        console.error('Server error:', error);
        res.json({
            success: false,
            message: 'An error occurred. Please try again.'
        });
    }
});

// Serve index.html for root route
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: 'Fish Parque API is running' });
});

// Start server
app.listen(PORT, () => {
    console.log(`Fish Parque server running on port ${PORT}`);
});