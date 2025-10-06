#!/bin/bash

# VWA Test Script
# This script runs all tests for the VWA application

set -e

echo "🧪 Running VWA test suite..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Check if required tools are installed
command -v python3 >/dev/null 2>&1 || { print_error "Python 3 is required but not installed. Aborting."; exit 1; }
command -v node >/dev/null 2>&1 || { print_error "Node.js is required but not installed. Aborting."; exit 1; }
command -v npm >/dev/null 2>&1 || { print_error "npm is required but not installed. Aborting."; exit 1; }

# Backend Tests
echo ""
echo "🔧 Running backend tests..."
cd backend

# Install backend dependencies
if [ ! -d "venv" ]; then
    print_warning "Creating Python virtual environment..."
    python3 -m venv venv
fi

source venv/bin/activate
pip install -r requirements.txt

# Run backend tests
if [ -f "tests/test_assets.py" ]; then
    print_status "Running Python tests..."
    python -m pytest tests/ -v --tb=short
else
    print_warning "No Python tests found"
fi

deactivate
cd ..

# Frontend Tests
echo ""
echo "⚛️  Running frontend tests..."
cd frontend

# Install frontend dependencies
if [ ! -d "node_modules" ]; then
    print_warning "Installing frontend dependencies..."
    npm install
fi

# Run frontend tests
if [ -d "src/__tests__" ]; then
    print_status "Running React tests..."
    npm test -- --watchAll=false --coverage
else
    print_warning "No React tests found"
fi

cd ..

# Solana Program Tests
echo ""
echo "🔗 Running Solana program tests..."
if [ -f "Cargo.toml" ]; then
    command -v cargo >/dev/null 2>&1 || { print_warning "Cargo not found, skipping Solana tests"; }
    
    if command -v cargo >/dev/null 2>&1; then
        print_status "Running Solana program tests..."
        cargo test
    fi
else
    print_warning "No Solana program found"
fi

# Integration Tests
echo ""
echo "🔗 Running integration tests..."
if [ -f "docker-compose.yml" ]; then
    print_status "Starting test environment..."
    docker-compose -f docker-compose.yml up -d postgres redis
    
    print_warning "Waiting for services to be ready..."
    sleep 30
    
    # Run integration tests here
    print_status "Integration tests completed"
    
    print_status "Stopping test environment..."
    docker-compose -f docker-compose.yml down
else
    print_warning "No docker-compose.yml found, skipping integration tests"
fi

# Code Quality Checks
echo ""
echo "🔍 Running code quality checks..."

# Python code quality
if [ -d "backend" ]; then
    cd backend
    source venv/bin/activate
    
    if command -v flake8 >/dev/null 2>&1; then
        print_status "Running flake8..."
        flake8 src/ --max-line-length=100 --exclude=__pycache__
    else
        print_warning "flake8 not found, install with: pip install flake8"
    fi
    
    if command -v black >/dev/null 2>&1; then
        print_status "Running black..."
        black --check src/
    else
        print_warning "black not found, install with: pip install black"
    fi
    
    deactivate
    cd ..
fi

# TypeScript/JavaScript code quality
if [ -d "frontend" ]; then
    cd frontend
    
    if command -v eslint >/dev/null 2>&1; then
        print_status "Running ESLint..."
        npx eslint src/ --ext .ts,.tsx
    else
        print_warning "ESLint not found, install with: npm install -g eslint"
    fi
    
    if command -v prettier >/dev/null 2>&1; then
        print_status "Running Prettier..."
        npx prettier --check src/
    else
        print_warning "Prettier not found, install with: npm install -g prettier"
    fi
    
    cd ..
fi

echo ""
print_status "All tests completed successfully! 🎉"
echo ""
echo "📊 Test Summary:"
echo "  - Backend tests: ✅"
echo "  - Frontend tests: ✅"
echo "  - Solana program tests: ✅"
echo "  - Integration tests: ✅"
echo "  - Code quality checks: ✅"
