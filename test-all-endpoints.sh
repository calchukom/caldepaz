#!/bin/bash

# Test script to verify all endpoints are working after deployment
BASE_URL="https://okaycaleb.onrender.com"

echo "🧪 Testing API endpoints at $BASE_URL"
echo "==========================================="

# Test health check first
echo "1. Testing health check..."
curl -s -o /dev/null -w "Health Check: %{http_code}\n" "$BASE_URL/health"

# Test main API endpoints
echo "2. Testing main API endpoints..."

# Auth endpoints
curl -s -o /dev/null -w "Auth Routes: %{http_code}\n" "$BASE_URL/api/auth/"

# Users endpoint
curl -s -o /dev/null -w "Users Routes: %{http_code}\n" "$BASE_URL/api/users/"

# Locations endpoint
curl -s -o /dev/null -w "Locations Routes: %{http_code}\n" "$BASE_URL/api/locations/"

# Vehicles endpoint
curl -s -o /dev/null -w "Vehicles Routes: %{http_code}\n" "$BASE_URL/api/vehicles/"

# Bookings endpoint
curl -s -o /dev/null -w "Bookings Routes: %{http_code}\n" "$BASE_URL/api/bookings/"

# Payments endpoint
curl -s -o /dev/null -w "Payments Routes: %{http_code}\n" "$BASE_URL/api/payments/"

# Maintenance endpoint
curl -s -o /dev/null -w "Maintenance Routes: %{http_code}\n" "$BASE_URL/api/maintenance/"

# Support tickets endpoint
curl -s -o /dev/null -w "Support Tickets Routes: %{http_code}\n" "$BASE_URL/api/support-tickets/"

# Chat endpoint
curl -s -o /dev/null -w "Chat Routes: %{http_code}\n" "$BASE_URL/api/chat/"

# Agents endpoint
curl -s -o /dev/null -w "Agents Routes: %{http_code}\n" "$BASE_URL/api/agents/"

# Vehicle specifications endpoint
curl -s -o /dev/null -w "Vehicle Specs Routes: %{http_code}\n" "$BASE_URL/api/vehicle-specifications/"

# Vehicle images endpoint
curl -s -o /dev/null -w "Vehicle Images Routes: %{http_code}\n" "$BASE_URL/api/vehicle-images/"

echo "==========================================="
echo "✅ Test complete! All endpoints should return 200, 401, or 404 (not 502/503)"
echo "🚫 If you see 502/503 errors, the middleware is still causing issues"
