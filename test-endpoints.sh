#!/bin/bash

# API Endpoint Tester for OK Car Rental System
BASE_URL="https://okayabc.onrender.com"

echo "🧪 Testing OK Car Rental API Endpoints..."
echo "Base URL: $BASE_URL"
echo "========================================"

# Test Health Check
echo "1. Testing Health Check..."
curl -s "$BASE_URL/health" | python -m json.tool 2>/dev/null || echo "❌ Health check failed"
echo ""

# Test API Documentation
echo "2. Testing API Documentation..."
curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/api-docs" && echo "✅ API docs accessible" || echo "❌ API docs failed"
echo ""

# Test Vehicles Endpoint
echo "3. Testing Vehicles Endpoint..."
curl -s -H "Accept: application/json" "$BASE_URL/api/vehicles" | python -m json.tool 2>/dev/null || echo "❌ Vehicles endpoint failed"
echo ""

# Test Locations Endpoint  
echo "4. Testing Locations Endpoint..."
curl -s -H "Accept: application/json" "$BASE_URL/api/locations" | python -m json.tool 2>/dev/null || echo "❌ Locations endpoint failed"
echo ""

# Test Vehicle Specifications Endpoint
echo "5. Testing Vehicle Specifications..."
curl -s -H "Accept: application/json" "$BASE_URL/api/vehicle-specifications" | python -m json.tool 2>/dev/null || echo "❌ Vehicle specs endpoint failed"
echo ""

# Test Support Tickets (should require auth)
echo "6. Testing Support Tickets (no auth - should get 401)..."
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/api/support-tickets")
if [ "$HTTP_CODE" = "401" ]; then
    echo "✅ Support tickets properly protected (401 Unauthorized)"
else
    echo "❌ Unexpected response code: $HTTP_CODE"
fi
echo ""

# Test Auth Registration
echo "7. Testing User Registration..."
curl -s -X POST "$BASE_URL/api/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "firstname": "Test",
    "lastname": "User", 
    "email": "test@example.com",
    "password": "password123",
    "contact_phone": "+254700000999"
  }' | python -m json.tool 2>/dev/null || echo "❌ Registration failed"
echo ""

echo "🏁 Endpoint testing completed!"
echo "If you see data in the responses above, your API is working correctly."
echo "If you see errors, you may need to seed your database first."
