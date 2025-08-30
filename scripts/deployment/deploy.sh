#!/bin/bash

# AI Code Platform Deployment Script
# This script automates the deployment process for all environments

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
ENVIRONMENTS=("staging" "production")

# Default values
ENVIRONMENT=""
ACTION=""
SKIP_TESTS=false
SKIP_SECURITY=false
DRY_RUN=false
FORCE=false

# Logging
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $*"
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $*"
}

error() {
    echo -e "${RED}[ERROR]${NC} $*" >&2
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $*"
}

# Usage information
usage() {
    cat << EOF
AI Code Platform Deployment Script

Usage: $0 [OPTIONS] ENVIRONMENT ACTION

ENVIRONMENTS:
    staging     Deploy to staging environment
    production  Deploy to production environment

ACTIONS:
    plan        Generate and show deployment plan
    deploy      Execute deployment
    destroy     Destroy infrastructure (use with caution)
    status      Show current deployment status
    rollback    Rollback to previous version

OPTIONS:
    -h, --help          Show this help message
    -t, --skip-tests    Skip test execution
    -s, --skip-security Skip security scans
    -d, --dry-run       Show what would be done without executing
    -f, --force         Force deployment without confirmations
    --debug             Enable debug output

EXAMPLES:
    $0 staging plan
    $0 staging deploy
    $0 production plan --dry-run
    $0 production deploy --skip-tests
    $0 staging rollback

EOF
}

# Parse command line arguments
parse_args() {
    while [[ $# -gt 0 ]]; do
        case $1 in
            -h|--help)
                usage
                exit 0
                ;;
            -t|--skip-tests)
                SKIP_TESTS=true
                shift
                ;;
            -s|--skip-security)
                SKIP_SECURITY=true
                shift
                ;;
            -d|--dry-run)
                DRY_RUN=true
                shift
                ;;
            -f|--force)
                FORCE=true
                shift
                ;;
            --debug)
                set -x
                shift
                ;;
            staging|production)
                ENVIRONMENT=$1
                shift
                ;;
            plan|deploy|destroy|status|rollback)
                ACTION=$1
                shift
                ;;
            *)
                error "Unknown option: $1"
                usage
                exit 1
                ;;
        esac
    done

    if [[ -z "$ENVIRONMENT" || -z "$ACTION" ]]; then
        error "Environment and action are required"
        usage
        exit 1
    fi

    if [[ ! " ${ENVIRONMENTS[@]} " =~ " ${ENVIRONMENT} " ]]; then
        error "Invalid environment: $ENVIRONMENT"
        usage
        exit 1
    fi
}

# Check prerequisites
check_prerequisites() {
    log "Checking prerequisites..."
    
    local missing_tools=()
    
    # Check required tools
    for tool in terraform kubectl helm docker aws npm; do
        if ! command -v "$tool" &> /dev/null; then
            missing_tools+=("$tool")
        fi
    done
    
    if [[ ${#missing_tools[@]} -gt 0 ]]; then
        error "Missing required tools: ${missing_tools[*]}"
        exit 1
    fi
    
    # Check AWS credentials
    if ! aws sts get-caller-identity &> /dev/null; then
        error "AWS credentials not configured or invalid"
        exit 1
    fi
    
    # Check environment variables
    if [[ "$ENVIRONMENT" == "production" ]]; then
        local required_vars=("AWS_ACCESS_KEY_ID" "AWS_SECRET_ACCESS_KEY")
        for var in "${required_vars[@]}"; do
            if [[ -z "${!var:-}" ]]; then
                error "Required environment variable not set: $var"
                exit 1
            fi
        done
    fi
    
    success "Prerequisites check passed"
}

# Validate terraform configuration
validate_terraform() {
    log "Validating Terraform configuration..."
    
    local terraform_dir="$PROJECT_ROOT/infrastructure/terraform/$ENVIRONMENT"
    
    if [[ ! -d "$terraform_dir" ]]; then
        error "Terraform directory not found: $terraform_dir"
        exit 1
    fi
    
    cd "$terraform_dir"
    
    # Validate syntax
    terraform validate
    if [[ $? -ne 0 ]]; then
        error "Terraform validation failed"
        exit 1
    fi
    
    # Format check
    if ! terraform fmt -check; then
        warning "Terraform files need formatting. Run 'terraform fmt' to fix."
    fi
    
    success "Terraform validation passed"
}

# Run security scans
run_security_scans() {
    if [[ "$SKIP_SECURITY" == true ]]; then
        warning "Skipping security scans"
        return
    fi
    
    log "Running security scans..."
    
    cd "$PROJECT_ROOT"
    
    # npm audit
    if ! npm audit --audit-level=high; then
        error "Security vulnerabilities found in dependencies"
        if [[ "$FORCE" != true ]]; then
            exit 1
        fi
        warning "Continuing due to --force flag"
    fi
    
    # Terraform security scan with Checkov
    if command -v checkov &> /dev/null; then
        checkov -d infrastructure/terraform/ --framework terraform --quiet
    else
        warning "Checkov not installed, skipping infrastructure security scan"
    fi
    
    success "Security scans completed"
}

# Run tests
run_tests() {
    if [[ "$SKIP_TESTS" == true ]]; then
        warning "Skipping tests"
        return
    fi
    
    log "Running tests..."
    
    cd "$PROJECT_ROOT"
    
    # Install dependencies
    npm ci
    
    # Type checking
    npm run typecheck
    
    # Linting
    npm run lint
    
    # Unit tests
    npm run test:coverage
    
    # Integration tests
    npm run test:integration
    
    success "All tests passed"
}

# Terraform operations
terraform_plan() {
    log "Generating Terraform plan for $ENVIRONMENT..."
    
    local terraform_dir="$PROJECT_ROOT/infrastructure/terraform/$ENVIRONMENT"
    cd "$terraform_dir"
    
    terraform init -backend-config="key=$ENVIRONMENT/terraform.tfstate"
    terraform plan -detailed-exitcode -out="$ENVIRONMENT.tfplan"
    
    local exit_code=$?
    case $exit_code in
        0)
            log "No changes detected"
            ;;
        1)
            error "Terraform plan failed"
            exit 1
            ;;
        2)
            log "Changes detected and plan saved"
            ;;
    esac
}

terraform_apply() {
    log "Applying Terraform changes for $ENVIRONMENT..."
    
    local terraform_dir="$PROJECT_ROOT/infrastructure/terraform/$ENVIRONMENT"
    cd "$terraform_dir"
    
    if [[ ! -f "$ENVIRONMENT.tfplan" ]]; then
        error "No plan file found. Run 'plan' first."
        exit 1
    fi
    
    if [[ "$DRY_RUN" == true ]]; then
        log "DRY RUN: Would apply Terraform plan"
        return
    fi
    
    if [[ "$FORCE" != true && "$ENVIRONMENT" == "production" ]]; then
        echo -n "Are you sure you want to apply changes to production? (yes/no): "
        read -r confirm
        if [[ "$confirm" != "yes" ]]; then
            log "Deployment cancelled"
            exit 0
        fi
    fi
    
    terraform apply "$ENVIRONMENT.tfplan"
    success "Terraform changes applied successfully"
}

# Kubernetes deployment
deploy_kubernetes() {
    log "Deploying to Kubernetes..."
    
    local k8s_dir="$PROJECT_ROOT/infrastructure/k8s/$ENVIRONMENT"
    
    if [[ ! -d "$k8s_dir" ]]; then
        error "Kubernetes manifests directory not found: $k8s_dir"
        exit 1
    fi
    
    # Update kubeconfig
    if [[ "$ENVIRONMENT" == "production" ]]; then
        aws eks update-kubeconfig --name aicode-production --region us-east-1
    else
        aws eks update-kubeconfig --name aicode-staging --region us-west-2
    fi
    
    # Apply manifests
    kubectl apply -f "$k8s_dir/"
    
    # Wait for rollout
    kubectl rollout status deployment/aicode-api -n "aicode-$ENVIRONMENT" --timeout=300s
    
    success "Kubernetes deployment completed"
}

# Health check
health_check() {
    log "Performing health check..."
    
    local max_attempts=30
    local attempt=1
    
    while [[ $attempt -le $max_attempts ]]; do
        if [[ "$ENVIRONMENT" == "production" ]]; then
            url="https://aicode-platform.com/health"
        else
            url="https://staging.aicode-platform.dev/health"
        fi
        
        if curl -f "$url" &> /dev/null; then
            success "Health check passed"
            return
        fi
        
        log "Health check attempt $attempt/$max_attempts failed, retrying in 10 seconds..."
        sleep 10
        ((attempt++))
    done
    
    error "Health check failed after $max_attempts attempts"
    exit 1
}

# Rollback function
rollback() {
    log "Rolling back $ENVIRONMENT deployment..."
    
    # Update kubeconfig
    if [[ "$ENVIRONMENT" == "production" ]]; then
        aws eks update-kubeconfig --name aicode-production --region us-east-1
    else
        aws eks update-kubeconfig --name aicode-staging --region us-west-2
    fi
    
    # Rollback Kubernetes deployment
    kubectl rollout undo deployment/aicode-api -n "aicode-$ENVIRONMENT"
    kubectl rollout status deployment/aicode-api -n "aicode-$ENVIRONMENT" --timeout=300s
    
    success "Rollback completed"
}

# Get deployment status
get_status() {
    log "Getting deployment status for $ENVIRONMENT..."
    
    # Update kubeconfig
    if [[ "$ENVIRONMENT" == "production" ]]; then
        aws eks update-kubeconfig --name aicode-production --region us-east-1
    else
        aws eks update-kubeconfig --name aicode-staging --region us-west-2
    fi
    
    echo "=== Kubernetes Status ==="
    kubectl get pods,services,deployments -n "aicode-$ENVIRONMENT"
    
    echo "=== Deployment History ==="
    kubectl rollout history deployment/aicode-api -n "aicode-$ENVIRONMENT"
    
    echo "=== Recent Events ==="
    kubectl get events -n "aicode-$ENVIRONMENT" --sort-by='.lastTimestamp' | tail -10
}

# Cleanup function
cleanup() {
    log "Cleaning up temporary files..."
    find "$PROJECT_ROOT/infrastructure/terraform" -name "*.tfplan" -delete
}

# Signal handlers
trap cleanup EXIT
trap 'error "Script interrupted"; exit 1' INT TERM

# Main execution
main() {
    parse_args "$@"
    
    log "Starting deployment script"
    log "Environment: $ENVIRONMENT"
    log "Action: $ACTION"
    log "Skip Tests: $SKIP_TESTS"
    log "Skip Security: $SKIP_SECURITY"
    log "Dry Run: $DRY_RUN"
    log "Force: $FORCE"
    
    check_prerequisites
    
    case $ACTION in
        plan)
            validate_terraform
            run_security_scans
            terraform_plan
            ;;
        deploy)
            validate_terraform
            run_security_scans
            run_tests
            terraform_plan
            terraform_apply
            deploy_kubernetes
            health_check
            ;;
        destroy)
            if [[ "$ENVIRONMENT" == "production" && "$FORCE" != true ]]; then
                error "Cannot destroy production without --force flag"
                exit 1
            fi
            
            echo -n "Are you sure you want to destroy $ENVIRONMENT infrastructure? (yes/no): "
            read -r confirm
            if [[ "$confirm" != "yes" ]]; then
                log "Destruction cancelled"
                exit 0
            fi
            
            local terraform_dir="$PROJECT_ROOT/infrastructure/terraform/$ENVIRONMENT"
            cd "$terraform_dir"
            terraform destroy -auto-approve
            ;;
        status)
            get_status
            ;;
        rollback)
            rollback
            ;;
        *)
            error "Unknown action: $ACTION"
            exit 1
            ;;
    esac
    
    success "Deployment script completed successfully"
}

# Run main function with all arguments
main "$@"