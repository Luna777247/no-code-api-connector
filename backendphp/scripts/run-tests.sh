#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}=== Backend PHP Test Suite ===${NC}\n"

# Check if composer is installed
if ! command -v composer &> /dev/null; then
    echo -e "${RED}Composer is not installed. Installing dependencies...${NC}"
    curl -sS https://getcomposer.org/installer | php -- --install-dir=/usr/local/bin --filename=composer
fi

# Install dependencies
echo -e "${YELLOW}Installing dependencies...${NC}"
composer install --no-interaction

# Run tests
echo -e "\n${YELLOW}Running tests...${NC}\n"

if composer test; then
    echo -e "\n${GREEN}✓ All tests passed!${NC}"
    exit 0
else
    echo -e "\n${RED}✗ Tests failed!${NC}"
    exit 1
fi
