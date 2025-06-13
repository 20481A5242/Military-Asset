#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

async function setup() {
  console.log('🚀 Military Asset Management System Setup\n');

  try {
    // Check if Node.js version is compatible
    const nodeVersion = process.version;
    const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);
    if (majorVersion < 18) {
      console.error('❌ Node.js 18 or higher is required. Current version:', nodeVersion);
      process.exit(1);
    }
    console.log('✅ Node.js version check passed:', nodeVersion);

    // Install root dependencies
    console.log('\n📦 Installing root dependencies...');
    execSync('npm install', { stdio: 'inherit', cwd: __dirname });
    console.log('✅ Root dependencies installed');

    // Install server dependencies
    console.log('\n📦 Installing server dependencies...');
    execSync('npm install', { stdio: 'inherit', cwd: path.join(__dirname, 'server') });
    console.log('✅ Server dependencies installed');

    // Install client dependencies
    console.log('\n📦 Installing client dependencies...');
    execSync('npm install', { stdio: 'inherit', cwd: path.join(__dirname, 'client') });
    console.log('✅ Client dependencies installed');

    // Setup environment files
    console.log('\n⚙️  Setting up environment files...');

    // Create server .env file
    const serverEnvPath = path.join(__dirname, 'server', '.env');

    if (!fs.existsSync(serverEnvPath)) {
      const envContent = `# Database
DATABASE_URL="postgresql://postgres:password@localhost:5432/military_assets"

# JWT Secret (use a strong, random string in production)
JWT_SECRET="military-asset-management-super-secret-jwt-key-2024"
JWT_EXPIRES_IN="7d"

# Server Configuration
PORT=3001
NODE_ENV=development

# CORS Origins (comma-separated list)
CORS_ORIGINS="http://localhost:5173,http://localhost:3000"

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Logging
LOG_LEVEL=info
LOG_FILE=logs/app.log

# Pagination
DEFAULT_PAGE_SIZE=20
MAX_PAGE_SIZE=100`;

      fs.writeFileSync(serverEnvPath, envContent);
      console.log('✅ Created server/.env file');
    }

    console.log('\n🎉 Setup completed successfully!');
    console.log('\n📋 Next Steps:');
    console.log('1. Make sure PostgreSQL is installed and running');
    console.log('2. Create a database named "military_assets"');
    console.log('3. Update the DATABASE_URL in server/.env if needed');
    console.log('4. Run database migrations: npm run db:migrate');
    console.log('5. Seed the database: npm run db:seed');
    console.log('6. Start the development servers: npm run dev');
    console.log('\n🔗 Application URLs:');
    console.log('  Frontend: http://localhost:5173');
    console.log('  Backend API: http://localhost:3001');
    console.log('  Database Studio: http://localhost:5555 (run "npm run db:studio")');
    console.log('\n🔑 Default login credentials (after seeding):');
    console.log('  Admin: admin@military.gov / password123');
    console.log('  Base Commander (FL): commander.fl@military.gov / password123');
    console.log('  Logistics Officer (FL): logistics.fl@military.gov / password123');

  } catch (error) {
    console.error('\n❌ Setup failed:', error.message);
    console.log('\n🔧 Troubleshooting:');
    console.log('- Make sure you have Node.js 18+ installed');
    console.log('- Check your internet connection');
    console.log('- Try running: npm cache clean --force');
    console.log('- Delete node_modules folders and try again');
    process.exit(1);
  }
}

setup().catch(console.error);
