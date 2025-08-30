#!/bin/bash

# AI Code Development Platform Documentation Build Script
# This script builds and optionally deploys the user documentation

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if we're in the correct directory
if [ ! -f "mkdocs.yml" ]; then
    print_error "mkdocs.yml not found. Please run this script from the project root directory."
    exit 1
fi

# Function to check dependencies
check_dependencies() {
    print_status "Checking dependencies..."
    
    if ! command -v python3 &> /dev/null; then
        print_error "Python 3 is required but not installed."
        exit 1
    fi
    
    if ! command -v pip &> /dev/null; then
        print_error "pip is required but not installed."
        exit 1
    fi
    
    print_success "Dependencies check passed"
}

# Function to install MkDocs dependencies
install_deps() {
    print_status "Installing MkDocs dependencies..."
    
    if [ -f "requirements.txt" ]; then
        pip install -r requirements.txt
        print_success "Dependencies installed"
    else
        print_error "requirements.txt not found"
        exit 1
    fi
}

# Function to build documentation
build_docs() {
    print_status "Building documentation..."
    
    # Clean previous build
    if [ -d "site" ]; then
        rm -rf site
        print_status "Cleaned previous build"
    fi
    
    # Build documentation
    mkdocs build --clean
    
    if [ $? -eq 0 ]; then
        print_success "Documentation built successfully"
        print_status "Built site available in: $(pwd)/site"
    else
        print_error "Documentation build failed"
        exit 1
    fi
}

# Function to serve documentation locally
serve_docs() {
    print_status "Starting local development server..."
    print_status "Documentation will be available at: http://localhost:8000"
    print_warning "Press Ctrl+C to stop the server"
    
    mkdocs serve
}

# Function to deploy to GitHub Pages
deploy_docs() {
    print_status "Deploying to GitHub Pages..."
    
    # Check if git is initialized and has remote
    if ! git remote -v | grep -q "origin"; then
        print_error "No git remote 'origin' found. Please set up git remote first."
        exit 1
    fi
    
    # Deploy to GitHub Pages
    mkdocs gh-deploy --force
    
    if [ $? -eq 0 ]; then
        print_success "Documentation deployed to GitHub Pages"
    else
        print_error "Deployment failed"
        exit 1
    fi
}

# Function to validate links and content
validate_docs() {
    print_status "Validating documentation content..."
    
    # Build first to ensure no build errors
    mkdocs build --clean
    
    # Check for common issues
    print_status "Checking for common issues..."
    
    # Check for broken internal links (basic check)
    if grep -r "](../" docs/ | grep -v ".md:" > /dev/null; then
        print_warning "Found potential relative link issues. Please review links manually."
    fi
    
    # Check for TODO or FIXME comments
    if grep -r "TODO\|FIXME\|XXX" docs/ > /dev/null; then
        print_warning "Found TODO/FIXME comments in documentation:"
        grep -r "TODO\|FIXME\|XXX" docs/
    fi
    
    print_success "Documentation validation completed"
}

# Function to show usage
show_usage() {
    echo "AI Code Development Platform Documentation Build Script"
    echo ""
    echo "Usage: $0 [command]"
    echo ""
    echo "Commands:"
    echo "  install     Install MkDocs dependencies"
    echo "  build       Build documentation (default)"
    echo "  serve       Serve documentation locally for development"
    echo "  deploy      Deploy documentation to GitHub Pages"
    echo "  validate    Validate documentation content and links"
    echo "  clean       Clean build artifacts"
    echo "  help        Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 install    # Install dependencies"
    echo "  $0 build      # Build documentation"
    echo "  $0 serve      # Start development server"
    echo "  $0 deploy     # Deploy to GitHub Pages"
}

# Function to clean build artifacts
clean_build() {
    print_status "Cleaning build artifacts..."
    
    if [ -d "site" ]; then
        rm -rf site
        print_status "Removed site directory"
    fi
    
    if [ -d ".mkdocs_cache" ]; then
        rm -rf .mkdocs_cache
        print_status "Removed MkDocs cache"
    fi
    
    print_success "Clean completed"
}

# Main script logic
main() {
    case "${1:-build}" in
        "install")
            check_dependencies
            install_deps
            ;;
        "build")
            check_dependencies
            build_docs
            ;;
        "serve")
            check_dependencies
            serve_docs
            ;;
        "deploy")
            check_dependencies
            build_docs
            deploy_docs
            ;;
        "validate")
            check_dependencies
            validate_docs
            ;;
        "clean")
            clean_build
            ;;
        "help"|"-h"|"--help")
            show_usage
            ;;
        *)
            print_error "Unknown command: $1"
            echo ""
            show_usage
            exit 1
            ;;
    esac
}

# Run main function with all arguments
main "$@"