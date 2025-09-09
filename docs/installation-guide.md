# SFMC Development Suite - Installation Guide

## Prerequisites

Before installing the SFMC Development Suite, ensure you have the following prerequisites:

### System Requirements
- **Operating System**: Windows 10/11, macOS 10.15+, or Linux (Ubuntu 18.04+)
- **Node.js**: Version 18.0 or higher
- **npm**: Version 8.0 or higher (comes with Node.js)
- **Memory**: Minimum 4GB RAM (8GB recommended)
- **Storage**: At least 2GB free disk space

### Required Software
- **Git**: For version control and cloning the repository
- **Docker**: For containerized deployment (optional but recommended)
- **Redis**: For session management and caching (can be run via Docker)

## Installation Methods

### Method 1: Local Development Setup

#### Step 1: Clone the Repository
```bash
git clone https://github.com/your-org/sfmc-development-suite.git
cd sfmc-development-suite
```

#### Step 2: Install Dependencies
```bash
npm install
```

#### Step 3: Environment Configuration
1. Copy the example environment file:
   ```bash
   cp .env.example .env.development
   ```

2. Edit `.env.development` with your configuration:
   ```env
   # Application Configuration
   NODE_ENV=development
   PORT=3000
   
   # SFMC Configuration
   SFMC_CLIENT_ID=your_sfmc_client_id
   SFMC_CLIENT_SECRET=your_sfmc_client_secret
   SFMC_SUBDOMAIN=your_sfmc_subdomain
   
   # AI Service Configuration
   OPENAI_API_KEY=your_openai_api_key
   
   # Redis Configuration
   REDIS_URL=redis://localhost:6379
   
   # Security
   JWT_SECRET=your_jwt_secret_key
   ENCRYPTION_KEY=your_32_character_encryption_key
   ```

#### Step 4: Start Redis (if not using Docker)
**Windows:**
```bash
# Install Redis using Chocolatey
choco install redis-64
redis-server
```

**macOS:**
```bash
# Install Redis using Homebrew
brew install redis
brew services start redis
```

**Linux:**
```bash
# Install Redis
sudo apt-get install redis-server
sudo systemctl start redis-server
```

#### Step 5: Run Database Migrations (if applicable)
```bash
npm run db:migrate
```

#### Step 6: Start the Development Server
```bash
npm run dev
```

The application will be available at `http://localhost:3000`

### Method 2: Docker Setup

#### Step 1: Clone the Repository
```bash
git clone https://github.com/your-org/sfmc-development-suite.git
cd sfmc-development-suite
```

#### Step 2: Configure Environment
```bash
cp .env.example .env.development
# Edit .env.development with your configuration
```

#### Step 3: Start with Docker Compose
```bash
docker-compose -f docker-compose.dev.yml up -d
```

This will start:
- The main application on port 3000
- Redis on port 6379
- Any additional services

### Method 3: Production Deployment

#### Using Docker
```bash
# Build production image
docker build -t sfmc-dev-suite .

# Run production container
docker run -d \
  --name sfmc-dev-suite \
  -p 3000:3000 \
  --env-file .env.production \
  sfmc-dev-suite
```

#### Using Kubernetes
```bash
# Apply Kubernetes configurations
kubectl apply -f k8s/
```

## SFMC Integration Setup

### Step 1: Create SFMC App
1. Log into your Salesforce Marketing Cloud account
2. Navigate to **Setup** > **Apps** > **Installed Packages**
3. Click **New** to create a new package
4. Add a new component of type **API Integration**
5. Configure the following permissions:
   - **Email**: Read, Write
   - **Web**: Read, Write
   - **Automation**: Read, Write
   - **Data Extensions**: Read, Write

### Step 2: Configure OAuth
1. Note down the **Client ID** and **Client Secret**
2. Set the **Redirect URI** to: `http://localhost:3000/api/sfmc/callback`
3. Update your `.env.development` file with these credentials

### Step 3: Test Connection
1. Start the application
2. Navigate to the SFMC Integration section
3. Click **Connect to SFMC**
4. Complete the OAuth flow

## Verification

### Health Check
Visit `http://localhost:3000/api/health` to verify the application is running correctly.

### Feature Testing
1. **AI Code Generator**: Navigate to `/generate` and test code generation
2. **Debugging Tool**: Navigate to `/debug` and test code analysis
3. **Cloud Pages Generator**: Navigate to `/pages` and test page generation
4. **SFMC Integration**: Test authentication and data retrieval

## Troubleshooting Installation

### Common Issues

#### Port Already in Use
```bash
# Find process using port 3000
lsof -i :3000  # macOS/Linux
netstat -ano | findstr :3000  # Windows

# Kill the process or change the port in .env
PORT=3001
```

#### Redis Connection Failed
```bash
# Check if Redis is running
redis-cli ping

# Should return "PONG"
```

#### SFMC Authentication Errors
- Verify Client ID and Client Secret are correct
- Ensure Redirect URI matches exactly
- Check that your SFMC user has appropriate permissions

#### Node.js Version Issues
```bash
# Check Node.js version
node --version

# Use nvm to install correct version
nvm install 18
nvm use 18
```

## Next Steps

After successful installation:
1. Read the [User Manual](user-manual.md) for detailed feature usage
2. Check the [API Documentation](api/openapi.yaml) for integration details
3. Review the [Troubleshooting Guide](troubleshooting-guide.md) for common issues
4. Join our community for support and updates

## Support

For installation support:
- Check our [Troubleshooting Guide](troubleshooting-guide.md)
- Open an issue on GitHub
- Contact support at support@your-org.com