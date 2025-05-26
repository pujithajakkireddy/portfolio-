const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const nodemailer = require('nodemailer');
const validator = require('validator');
const path = require('path');
const fs = require('fs').promises; // Using promises version for async/await
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// --- DEBUG LOG: Before any middleware ---
console.log('Server starting...');
console.log('FRONTEND_URL from .env:', process.env.FRONTEND_URL);
console.log('EMAIL_USER from .env:', process.env.EMAIL_USER);

// Security Middleware
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
            fontSrc: ["'self'", "https://fonts.gstatic.com"],
            scriptSrc: ["'self'", "'unsafe-inline'"], // Keep 'unsafe-inline' for now due to onclick, consider moving to external JS
            imgSrc: ["'self'", "data:", "https:"],
            connectSrc: ["'self'", process.env.FRONTEND_URL || 'http://localhost:8080'],
        },
    },
    hidePoweredBy: true,
}));

// CORS configuration
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:8080',
    credentials: true
}));

// --- DEBUG LOG: After CORS middleware ---
app.use((req, res, next) => {
    console.log(`[Middleware] Request received: ${req.method} ${req.url}`);
    console.log(`[Middleware] Request origin: ${req.headers.origin}`);
    next();
});

// Rate limiting setup
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Max 100 requests per 15 minutes per IP
    message: { error: 'Too many requests from this IP, please try again later.' }
});

const contactLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 5, // Max 5 contact form submissions per hour per IP
    message: { error: 'Too many contact form submissions, please try again later.' }
});

// Apply general rate limit to all requests
app.use(limiter);

// Body parsers
app.use(express.json({ limit: '10mb' })); // for parsing application/json
app.use(express.urlencoded({ extended: true, limit: '10mb' })); // for parsing application/x-www-form-urlencoded

// --- DEBUG LOG: After body parsers ---
app.use((req, res, next) => {
    if (req.method === 'POST' && req.url === '/api/contact') {
        console.log('[Middleware] Body parsed for /api/contact:', req.body);
    }
    next();
});

// Serve Static Files
const publicPath = path.join(__dirname, '..', 'public');
console.log('Serving static files from this absolute path:', publicPath); // <--- THIS IS THE NEW LOG LINE
app.use(express.static(publicPath));

// --- DEBUG LOG: After static files middleware ---
app.use((req, res, next) => {
    if (req.method === 'GET' && req.url === '/') {
        console.log('[Middleware] Serving static index.html for GET /');
    }
    next();
});


// Email Transporter Configuration
const createTransporter = () => {
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
        console.warn('Nodemailer: EMAIL_USER or EMAIL_PASS not set. Email sending may fail.');
        // Return a dummy transporter for development/testing if credentials are missing
        return {
            sendMail: (mailOptions) => {
                console.log('Dummy sendMail called. Email would be sent:', mailOptions);
                return Promise.resolve({ messageId: 'dummy-id-no-creds' });
            }
        };
    }
    return nodemailer.createTransport({
        service: 'gmail', // You can use other services or direct SMTP
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS
        }
    });
};

// Utility Functions
const sanitizeInput = (input) => validator.escape(String(input || '').trim());

const validateContactForm = (data) => {
    const errors = [];
    if (!data.name || data.name.length < 2 || data.name.length > 100) errors.push('Name must be between 2 and 100 characters');
    if (!data.email || !validator.isEmail(data.email)) errors.push('Please provide a valid email address');
    if (!data.subject || data.subject.length < 5 || data.subject.length > 200) errors.push('Subject must be between 5 and 200 characters');
    if (!data.message || data.message.length < 10 || data.message.length > 2000) errors.push('Message must be between 10 and 2000 characters');
    return errors;
};

const logContactSubmission = async (data, ip) => {
    const logEntry = {
        timestamp: new Date().toISOString(),
        ip: ip,
        name: data.name,
        email: data.email,
        subject: data.subject,
        message: data.message.substring(0, 100) + '...' // Log only first 100 chars of message
    };
    try {
        const logDir = path.join(__dirname, '..', 'logs'); // logs folder parallel to routes
        const logPath = path.join(logDir, 'contacts.json');

        // Ensure logs directory exists
        await fs.mkdir(logDir, { recursive: true });

        let logs = [];
        try {
            const existingLogs = await fs.readFile(logPath, 'utf8');
            logs = JSON.parse(existingLogs);
        } catch (err) {
            // If file doesn't exist or is empty/corrupt, start with an empty array
            if (err.code !== 'ENOENT' && !(err instanceof SyntaxError)) {
                console.error('Error reading existing contact logs, starting new:', err);
            }
        }
        logs.push(logEntry);

        // Keep log file size manageable (e.g., last 1000 entries)
        if (logs.length > 1000) {
            logs = logs.slice(-1000);
        }
        await fs.writeFile(logPath, JSON.stringify(logs, null, 2)); // Prettify JSON
    } catch (err) {
        console.error('Error logging contact submission:', err);
    }
};

// API Routes

// Health check endpoint
app.get('/api/health', (req, res) => {
    console.log('[Route] /api/health hit');
    res.json({ status: 'ok', timestamp: new Date().toISOString(), uptime: process.uptime() });
});

// Contact form endpoint
app.post('/api/contact', contactLimiter, async (req, res) => {
    // --- DEBUG LOG: Inside contact form POST route ---
    console.log('[Route] /api/contact POST route hit!');
    console.log('Request body:', req.body);

    try {
        const { name, email, subject, message } = req.body;
        
        // Sanitize inputs
        const sanitizedData = {
            name: sanitizeInput(name),
            email: sanitizeInput(email),
            subject: sanitizeInput(subject),
            message: sanitizeInput(message)
        };
        
        // Validate inputs
        const validationErrors = validateContactForm(sanitizedData);
        if (validationErrors.length > 0) {
            console.log('[Route] Validation errors:', validationErrors);
            return res.status(400).json({ success: false, errors: validationErrors });
        }
        
        // Log the submission (asynchronous)
        await logContactSubmission(sanitizedData, req.ip);
        
        // Send emails
        const transporter = createTransporter();
        
        const notificationEmail = {
            from: `"Portfolio Contact Form" <${process.env.EMAIL_USER}>`,
            to: process.env.NOTIFICATION_EMAIL || process.env.EMAIL_USER, // Send notification to yourself
            subject: `New Contact Form Submission: ${sanitizedData.subject}`,
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #333; border-bottom: 2px solid #007bff; padding-bottom: 10px;">New Contact Form Submission</h2>
                    <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
                        <p><strong>Name:</strong> ${sanitizedData.name}</p>
                        <p><strong>Email:</strong> ${sanitizedData.email}</p>
                        <p><strong>Subject:</strong> ${sanitizedData.subject}</p>
                        <p><strong>IP Address:</strong> ${req.ip}</p>
                        <p><strong>Timestamp:</strong> ${new Date().toLocaleString()}</p>
                    </div>
                    <div style="background: white; padding: 20px; border-left: 4px solid #007bff; margin: 20px 0;">
                        <h3 style="color: #333; margin-top: 0;">Message:</h3>
                        <p style="line-height: 1.6; white-space: pre-wrap;">${sanitizedData.message}</p>
                    </div>
                    <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #dee2e6; color: #6c757d; font-size: 12px;">
                        <p>This email was sent from your portfolio contact form.</p>
                    </div>
                </div>
            `
        };
        
        const autoReplyEmail = {
            from: `"J. Sai Pujitha" <${process.env.EMAIL_USER}>`,
            to: sanitizedData.email, // Auto-reply to the sender
            subject: `Thank you for contacting me - ${sanitizedData.subject}`,
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #333; border-bottom: 2px solid #aa70e0; padding-bottom: 10px;">Thank You for Reaching Out!</h2>
                    <div style="background: linear-gradient(135deg, #f8f9ff, #fff5f8); padding: 30px; border-radius: 12px; margin: 20px 0;">
                        <p style="font-size: 16px; line-height: 1.6;">Hi ${sanitizedData.name},</p>
                        <p style="font-size: 16px; line-height: 1.6;">Thank you for contacting me through my portfolio website. I've received your message about "<strong>${sanitizedData.subject}</strong>" and appreciate you taking the time to reach out.</p>
                        <p style="font-size: 16px; line-height: 1.6;">I typically respond to messages within 24-48 hours. I'll review your message and get back to you soon.</p>
                    </div>
                    <div style="background: white; padding: 20px; border-left: 4px solid #aa70e0; margin: 20px 0;">
                        <h3 style="color: #333; margin-top: 0;">Your Message:</h3>
                        <p style="line-height: 1.6; color: #666; white-space: pre-wrap;">${sanitizedData.message}</p>
                    </div>
                    <div style="margin-top: 30px; padding: 20px; background: #f8f9fa; border-radius: 8px;">
                        <p style="margin: 0; color: #666;"><strong>Connect with me:</strong><br>GitHub: <a href="https://github.com/pujithajakkireddy" style="color: #aa70e0;">github.com/pujithajakkireddy</a><br>Email: ${process.env.EMAIL_USER}</p>
                    </div>
                    <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #dee2e6; color: #6c757d; font-size: 12px; text-align: center;">
                        <p>Best regards,<br><strong>J. Sai Pujitha</strong><br>Web Developer & Creative Coder</p>
                    </div>
                </div>
            `
        };
        
        // Send both emails concurrently
        await Promise.all([
            transporter.sendMail(notificationEmail),
            transporter.sendMail(autoReplyEmail)
        ]);
        
        console.log('[Route] Emails sent successfully!');
        res.json({ success: true, message: 'Your message has been sent successfully! I\'ll get back to you soon.' });
        
    } catch (error) {
        console.error('Contact form error:', error);
        res.status(500).json({ success: false, message: 'There was an error sending your message. Please try again later.', details: error.message });
    }
});

// Analytics Endpoints
app.post('/api/analytics/pageview', async (req, res) => {
    console.log('[Route] /api/analytics/pageview POST route hit!');
    try {
        // Here you would implement logic to store pageview data
        // For example, save to a file or database
        res.json({ success: true, message: 'Pageview recorded (dummy).' });
    } catch (error) {
        console.error('Analytics error:', error);
        res.status(500).json({ success: false, message: 'Failed to record pageview.' });
    }
});

app.get('/api/analytics/summary', async (req, res) => {
    console.log('[Route] /api/analytics/summary GET route hit!');
    try {
        // Here you would implement logic to retrieve and summarize analytics data
        // For example, read from a file or database and process
        const summary = {
            totalPageviews: 1234,
            uniqueVisitors: 567,
            topPages: [{ path: '/', views: 500 }, { path: '/projects', views: 200 }]
        };
        res.json(summary);
    } catch (error) {
        console.error('Analytics summary error:', error);
        res.status(500).json({ error: 'Failed to fetch analytics' });
    }
});

// SPA Fallback Route - This should be the LAST route definition
// It serves index.html for any GET request that hasn't been handled by previous routes
app.get('*', (req, res) => {
    // --- DEBUG LOG: Inside fallback route ---
    console.log(`[Route] Fallback GET route hit for: ${req.url}. Sending index.html.`);
    res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

// Error Handling Middleware
app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
});

// Server Start
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📧 Email configured: ${process.env.EMAIL_USER ? 'Yes' : 'No'}`);
    console.log(`🔒 Environment: ${process.env.NODE_ENV || 'development'}`);
});