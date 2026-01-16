#!/bin/bash
# Script to verify that Docker containers are running with correct UID/GID

echo "Verifying Docker container UID/GID configuration..."
echo ""

# Check if .env exists
if [ ! -f .env ]; then
    echo "⚠️  .env file not found. Using default values from docker compose configuration"
    EXPECTED_PUID=1000
    EXPECTED_PGID=1000
else
    # Load PUID and PGID from .env (safely parse only specific variables)
    EXPECTED_PUID=$(grep -E "^PUID=" .env 2>/dev/null | cut -d'=' -f2 | tr -d '[:space:]')
    EXPECTED_PGID=$(grep -E "^PGID=" .env 2>/dev/null | cut -d'=' -f2 | tr -d '[:space:]')
    
    # Use defaults if variables not found
    EXPECTED_PUID=${EXPECTED_PUID:-1000}
    EXPECTED_PGID=${EXPECTED_PGID:-1000}
fi

echo "Expected PUID: $EXPECTED_PUID"
echo "Expected PGID: $EXPECTED_PGID"
echo ""

# Check if containers are running
if ! docker compose ps | grep -q "Up"; then
    echo "❌ No containers are running. Please start them with: docker compose up -d"
    exit 1
fi

# Function to check UID/GID in a container
check_container() {
    local container_name=$1
    local service_name=$2
    
    if docker ps --format '{{.Names}}' | grep -q "^${container_name}$"; then
        echo "Checking $service_name ($container_name)..."
        
        # Get the actual UID/GID of the process in the container
        local actual_uid=$(docker exec $container_name sh -c 'id -u' 2>/dev/null || echo "N/A")
        local actual_gid=$(docker exec $container_name sh -c 'id -g' 2>/dev/null || echo "N/A")
        
        echo "  Actual UID: $actual_uid"
        echo "  Actual GID: $actual_gid"
        
        if [ "$actual_uid" == "$EXPECTED_PUID" ] && [ "$actual_gid" == "$EXPECTED_PGID" ]; then
            echo "  ✅ UID/GID match!"
        else
            echo "  ⚠️  UID/GID do not match expected values"
        fi
        echo ""
    else
        echo "⚠️  Container $container_name is not running"
        echo ""
    fi
}

# Check each container
check_container "webinar-caddy" "Caddy"
check_container "webinar-backend" "Backend"
check_container "webinar-libreoffice" "LibreOffice"

echo "Verification complete!"
