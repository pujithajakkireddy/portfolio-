const fs = require('fs').promises;
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const question = (query) => new Promise((resolve) => rl.question(query, resolve));

async function createDirectoryStructure() {
    const directories = [
        'public',
        'logs',
        'tests',
        'middleware',
        'routes',
        'utils'
    ];

    for (const dir of directories) {
        try {
            await fs.mkdir(path.join(__dirname, dir), { recursive: true });
            console.log(`✅ Created directory: ${dir}`);
        } catch (error) {
            console.log(`⚠️  Directory ${dir} already exists or couldn't be created`);
        }
    }
}

async function createEnvFile() {
    const envPath = path.join(__dirname, '.env');
    
    try {
        await fs.access(envPath);
        console.log('⚠️  .env file already exists, skipping creation');
        return;
    } catch (error) {
        // File doesn't exist, create it
    }

    console.log('\n🔧 Setting up environment variables...\n');

    const port = await question('Server port (default: 3000): ') || '3000';
    const emailUser = await question('Your email address (for contact form): ');
    const emailPass = await question('Your email app password: ');
    const notificationEmail = await question(`Notification email (default: ${emailUser}): `) || emailUser;
    const frontendUrl = await question('Frontend URL (default: http://localhost:8080): ') || 'http://localhost:8080';
    const analyticsKey = await question('Analytics key (random string): ') || Math.random().toString(36).substring(2, 15);

    const envContent = `# Server Configuration
PORT=${port}
NODE_ENV=development
FRONTEND_URL=${frontendUrl}

# Email Configuration
EMAIL_USER=${emailUser}
EMAIL_PASS=${emailPass}
NOTIFICATION_EMAIL=${notificationEmail}

# Analytics
ANALYTICS_KEY=${analyticsKey}

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX=100
CONTACT_RATE_LIMIT_WINDOW_MS=3600000
CONTACT_RATE_LIMIT_MAX=5

# Security
SESSION_SECRET=${Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)}
`;

    try {
        await fs.writeFile(envPath, envContent);
        console.log('✅ Created .env file');
    } catch (error) {
        console.error('❌ Error creating .env file:', error.message);
    }
}

async function copyHtmlFile() {
    const publicDir = path.join(__dirname, 'public');
    const indexPath = path.join(publicDir, 'index.html');
    
    try {
        await fs.access(indexPath);
        console.log('⚠️  index.html already exists in public directory');
        return;
    } catch (error) {
        // File doesn't exist
    }

    console.log('\n📁 Please copy your HTML file to the public directory:');
    console.log(`   cp your-portfolio.html ${indexPath}`);
    console.log('   Or place your HTML file as public/index.html');
}

async function createGitignore() {
    const gitignorePath = path.join(__dirname, '.gitignore');
    
    try {
        await fs.access(gitignorePath);
        console.log('⚠️  .gitignore already exists');
        return;
    } catch (error) {
        // File doesn't exist, create it
    }

    const gitignoreContent = `# Dependencies
node_modules/
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Environment variables
.env
.env.local
.env.development.local
.env.test.local
.env.production.local

# Logs
logs/
*.log

# Runtime data
pids
*.pid
*.seed
*.pid.lock

# Coverage directory used by tools like istanbul
coverage/

# nyc test coverage
.nyc_output

# Dependency directories
node_modules/
jspm_packages/

# Optional npm cache directory
.npm

# Optional REPL history
.node_repl_history

# Output of 'npm pack'
*.tgz

# Yarn Integrity file
.yarn-integrity

# dotenv environment variables file
.env

# IDE
.vscode/
.idea/
*.swp
*.swo

# OS
.DS_Store
Thumbs.db

# Build outputs
dist/
build/

# Temporary files
tmp/
temp/
`;

    try {
        await fs.writeFile(gitignorePath, gitignoreContent);
        console.log('✅ Created .gitignore file');
    } catch (error) {
        console.error('❌ Error creating .gitignore file:', error.message);
    }
}

async function createReadme() {
    const readmePath = path.join(__dirname, 'README.md');
    
    try {
        await fs.access(readmePath);
        console.log('⚠️  README.md already exists');
        return;
    } catch (error) {
        // File doesn't exist, create it
    }

    const readmeContent = `# Portfolio Backend

Backend server for J. Sai Pujitha's portfolio website.

## Features

- ✉️ Contact form handling with email notifications
- 📊 Basic analytics tracking
- 🔒 Security middleware (helmet, rate limiting)
- 📱 CORS support for frontend integration
- 🚀 Production-ready Express server

## Setup

1. **Install dependencies:**
   \`\`\`bash
   npm install
   \`\`\`

2. **Configure environment variables:**
   \`\`\`bash
   cp .env.example .env
   # Edit .env with your configuration
   \`\`\`

3. **Place your HTML file:**
   \`\`\`bash
   cp your-portfolio.html public/index.html
   \`\`\`

4. **Start the server:**
   \`\`\`bash
   npm run dev  # Development
   npm start    # Production
   \`\`\`

## API Endpoints

### Contact Form
\`POST /api/contact\`

Submit contact form data:
\`\`\`json
{
  "name": "John Doe",
  "email": "john@example.com",
  "subject": "Hello",
  "message": "Your message here"
}
\`\`\`

### Analytics
\`POST /api/analytics/pageview\`

Track page views:
\`\`\`json
{
  "page": "/about",
  "referrer": "https://google.com",
  "userAgent": "Mozilla/5.0..."
}
\`\`\`

\`GET /api/analytics/summary\`

Get analytics summary (requires auth key in header).

### Health Check
\`GET /api/health\`

Check server status.

## Email Configuration

For Gmail:
1. Enable 2-factor authentication
2. Generate an app-specific password
3. Use your Gmail address and app password in .env

## Deployment

### Heroku
\`\`\`bash
heroku create your-app-name
heroku config:set NODE_ENV=production
heroku config:set EMAIL_USER=your-email@gmail.com
heroku config:set EMAIL_PASS=your-app-password
# ... other environment variables
git push heroku main
\`\`\`

### Vercel
\`\`\`bash
vercel --prod
\`\`\`

### Railway
\`\`\`bash
railway deploy
\`\`\`

## Security Features

- Rate limiting on all endpoints
- Input validation and sanitization
- CORS protection
- Helmet security headers
- Environment variable protection

## File Structure

\`\`\`
├── server.js          # Main server file
├── package.json       # Dependencies
├── .env              # Environment variables
├── public/           # Static files (HTML, CSS, JS)
├── logs/             # Analytics and contact logs
└── README.md         # This file
\`\`\`

## License

MIT License - see LICENSE file for details.
`;

    try {
        await fs.writeFile(readmePath, readmeContent);
        console.log('✅ Created README.md file');
    } catch (error) {
        console.error('❌ Error creating README.md file:', error.message);
    }
}

async function main() {
    console.log('🚀 Setting up Portfolio Backend...\n');

    try {
        await createDirectoryStructure();
        await createEnvFile();
        await copyHtmlFile();
        await createGitignore();
        await createReadme();

        console.log('\n✅ Setup complete!');
        console.log('\nNext steps:');
        console.log('1. Copy your HTML file to public/index.html');
        console.log('2. Review and update .env file');
        console.log('3. Run: npm run dev');
        console.log('4. Visit: http://localhost:3000');
        
    } catch (error) {
        console.error('❌ Setup failed:', error.message);
    } finally {
        rl.close();
    }
}

if (require.main === module) {
    main();
}

module.exports = { createDirectoryStructure, createEnvFile };