#!/bin/bash

# Setup environment script for AI Code Development Platform
set -e

echo "🚀 Setting up AI Code Development Platform environment..."

# Function to generate secure random string
generate_secret() {
    openssl rand -hex 32
}

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    echo "📝 Creating .env file..."
    
    # Copy from example
    cp .env.example .env
    
    # Generate secure JWT secrets
    JWT_SECRET=$(generate_secret)
    JWT_REFRESH_SECRET=$(generate_secret)
    
    # Update .env file with generated secrets
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        sed -i '' "s/your-super-secret-jwt-key-change-in-production/$JWT_SECRET/" .env
        sed -i '' "s/your-super-secret-refresh-key-change-in-production/$JWT_REFRESH_SECRET/" .env
    else
        # Linux
        sed -i "s/your-super-secret-jwt-key-change-in-production/$JWT_SECRET/" .env
        sed -i "s/your-super-secret-refresh-key-change-in-production/$JWT_REFRESH_SECRET/" .env
    fi
    
    echo "✅ .env file created with secure secrets"
else
    echo "ℹ️ .env file already exists, skipping creation"
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Generate Prisma client
echo "🔧 Generating Prisma client..."
npm run db:generate

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "⚠️ Docker is not running. Please start Docker and run this script again."
    echo "   Or you can set up PostgreSQL manually and update the DATABASE_URL in .env"
    exit 1
fi

# Start database with Docker Compose
echo "🐳 Starting database services..."
docker-compose up -d postgres redis

# Wait for database to be ready
echo "⏳ Waiting for database to be ready..."
sleep 10

# Run database migrations
echo "🗃️ Running database migrations..."
npm run db:migrate

echo "✅ Environment setup complete!"
echo ""
echo "🎉 Next steps:"
echo "   1. Review and update .env file with your specific settings"
echo "   2. Run 'npm run dev' to start the development server"
echo "   3. Run 'npm test' to run the test suite"
echo ""
echo "🔗 Useful commands:"
echo "   npm run dev        - Start development server"
echo "   npm test           - Run tests"
echo "   npm run build      - Build for production"
echo "   npm run lint       - Lint code"
echo "   npm run format     - Format code"
echo "   docker-compose up  - Start all services"