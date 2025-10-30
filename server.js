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
            console.log(`✅ Order ${orderNumber} saved to orders.txt`);
        } catch (error) {
            console.error('File write error:', error);
            return res.json({
                success: false,
                message: 'Unable to save order. Please try again.'
            });
        }

        // Send email notification
        // For Gmail: May be blocked by Render. Use Brevo (smtp-relay.brevo.com) instead
        // Set environment variables: SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, EMAIL_TO
        if (process.env.SMTP_USER && process.env.SMTP_PASS) {
            try {
                const nodemailer = require('nodemailer');
                
                const transporter = nodemailer.createTransport({
                    host: process.env.SMTP_HOST || 'smtp.gmail.com',
                    port: parseInt(process.env.SMTP_PORT || '587'),
                    secure: false,
                    auth: {
                        user: process.env.SMTP_USER,
                        pass: process.env.SMTP_PASS
                    },
                    tls: {
                        rejectUnauthorized: false
                    },
                    connectionTimeout: 10000,
                    greetingTimeout: 10000,
                    socketTimeout: 10000
                });

                const mailOptions = {
                    from: `"Fish Parque Orders" <${process.env.SMTP_USER}>`,
                    to: process.env.EMAIL_TO || process.env.SMTP_USER,
                    subject: `🐟 New Fish Parque Order - ${orderNumber}`,
                    html: `
                        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                            <h2 style="color: #667eea;">🐟 New Order Received - Fish Parque</h2>
                            <p><strong>Order Number:</strong> ${orderNumber}</p>
                            <p><strong>Date:</strong> ${orderDate}</p>
                            <hr style="border: 1px solid #e0e0e0;">
                            
                            <h3 style="color: #667eea;">Customer Information</h3>
                            <p><strong>Name:</strong> ${name}</p>
                            <p><strong>Phone:</strong> ${phone}</p>
                            <p><strong>Address:</strong> ${address}</p>
                            <hr style="border: 1px solid #e0e0e0;">
                            
                            <h3 style="color: #667eea;">Order Details</h3>
                            <p><strong>Product:</strong> ${productNames[product]}</p>
                            <p><strong>Quantity:</strong> ${qty}kg</p>
                            <p><strong>Notes:</strong> ${notes || 'None'}</p>
                            <hr style="border: 1px solid #e0e0e0;">
                            
                            <p style="color: #666; font-size: 0.9em;">✅ Order saved successfully to server database.</p>
                        </div>
                    `
                };

                // Try to send email with timeout
                await Promise.race([
                    transporter.sendMail(mailOptions),
                    new Promise((_, reject) => 
                        setTimeout(() => reject(new Error('Email timeout after 15s')), 15000)
                    )
                ]);
                
                console.log(`✅ Email sent successfully for order ${orderNumber}`);
            } catch (emailError) {
                console.error(`⚠️ Email failed for order ${orderNumber}:`, emailError.message);
                console.log('Order is still saved in orders.txt');
                // Don't fail the order if email fails - order is already saved
            }
        } else {
            console.log(`⚠️ Email not configured. Order ${orderNumber} saved to orders.txt only.`);
        }

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
