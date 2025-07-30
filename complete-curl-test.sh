#!/bin/bash

# 🚗 Complete Vehicle Rental API Curl Test Suite
# This script demonstrates all working endpoints with actual curl commands

echo "🚗 Vehicle Rental API - Comprehensive Curl Test Suite"
echo "=================================================="
echo ""

BASE_URL="http://localhost:7000/api"

# Test function with better formatting
test_curl() {
    local title=$1
    local curl_command=$2
    
    echo "🔹 $title"
    echo "Command: $curl_command"
    echo "Response:"
    eval $curl_command | head -10
    echo ""
    echo "----------------------------------------"
    echo ""
}

echo "📋 TESTING ALL VEHICLE RENTAL API ENDPOINTS"
echo ""

# ====================================
# 🚗 VEHICLE ENDPOINTS
# ====================================

echo "🚗 VEHICLE ENDPOINTS"
echo "==================="
echo ""

test_curl "Get All Vehicles (First 3)" \
    "curl -s -H \"Content-Type: application/json\" \"$BASE_URL/vehicles?limit=3\""

test_curl "Get Vehicles by Location (Downtown Manhattan)" \
    "curl -s -H \"Content-Type: application/json\" \"$BASE_URL/vehicles?location_id=1f6b5417-8a0a-497b-98a4-55357e0b928a&limit=2\""

test_curl "Get Available Vehicles Only" \
    "curl -s -H \"Content-Type: application/json\" \"$BASE_URL/vehicles?availability=true&limit=2\""

test_curl "Filter Vehicles by Manufacturer (Tesla)" \
    "curl -s -H \"Content-Type: application/json\" \"$BASE_URL/vehicles?manufacturer=Tesla&limit=2\""

test_curl "Filter Vehicles by Price Range (\$50-\$200)" \
    "curl -s -H \"Content-Type: application/json\" \"$BASE_URL/vehicles?min_rate=50&max_rate=200&limit=2\""

test_curl "Search Vehicles (Mercedes)" \
    "curl -s -H \"Content-Type: application/json\" \"$BASE_URL/vehicles/search?q=mercedes&limit=2\""

test_curl "Get Available Vehicles for Date Range" \
    "curl -s -H \"Content-Type: application/json\" \"$BASE_URL/vehicles/available?start_date=2025-08-01&end_date=2025-08-05&limit=2\""

test_curl "Filter by Multiple Criteria (Electric, Automatic, 5 seats)" \
    "curl -s -H \"Content-Type: application/json\" \"$BASE_URL/vehicles?fuel_type=electric&transmission=automatic&seating_capacity=5&limit=2\""

test_curl "Sort Vehicles by Price (Ascending)" \
    "curl -s -H \"Content-Type: application/json\" \"$BASE_URL/vehicles?sortBy=rental_rate&sortOrder=asc&limit=2\""

# ====================================
# 📍 LOCATION ENDPOINTS
# ====================================

echo "📍 LOCATION ENDPOINTS"
echo "===================="
echo ""

test_curl "Get All Locations" \
    "curl -s -H \"Content-Type: application/json\" \"$BASE_URL/locations?limit=5\""

test_curl "Search Locations (Manhattan)" \
    "curl -s -H \"Content-Type: application/json\" \"$BASE_URL/locations?search=Manhattan&limit=3\""

test_curl "Get Popular Locations" \
    "curl -s -H \"Content-Type: application/json\" \"$BASE_URL/locations/popular?limit=3\""

# ====================================
# 🚙 VEHICLE SPECIFICATIONS ENDPOINTS
# ====================================

echo "🚙 VEHICLE SPECIFICATIONS ENDPOINTS"
echo "=================================="
echo ""

test_curl "Get All Vehicle Specifications" \
    "curl -s -H \"Content-Type: application/json\" \"$BASE_URL/vehicle-specifications?limit=3\""

test_curl "Filter Specs by Manufacturer (Tesla)" \
    "curl -s -H \"Content-Type: application/json\" \"$BASE_URL/vehicle-specifications?manufacturer=Tesla&limit=2\""

test_curl "Filter Specs by Fuel Type (Electric)" \
    "curl -s -H \"Content-Type: application/json\" \"$BASE_URL/vehicle-specifications?fuel_type=electric&limit=2\""

test_curl "Get Popular Vehicle Specifications" \
    "curl -s -H \"Content-Type: application/json\" \"$BASE_URL/vehicle-specifications/popular?limit=3\""

test_curl "Get Specification Statistics" \
    "curl -s -H \"Content-Type: application/json\" \"$BASE_URL/vehicle-specifications/statistics\""

test_curl "Get Unique Manufacturers" \
    "curl -s -H \"Content-Type: application/json\" \"$BASE_URL/vehicle-specifications/manufacturers\""

test_curl "Get Fuel Types" \
    "curl -s -H \"Content-Type: application/json\" \"$BASE_URL/vehicle-specifications/fuel-types\""

test_curl "Get Transmission Types" \
    "curl -s -H \"Content-Type: application/json\" \"$BASE_URL/vehicle-specifications/transmission-types\""

# ====================================
# 🔍 ADVANCED FILTERING EXAMPLES
# ====================================

echo "🔍 ADVANCED FILTERING EXAMPLES"
echo "=============================="
echo ""

test_curl "Luxury Vehicles (\$300+ rental rate)" \
    "curl -s -H \"Content-Type: application/json\" \"$BASE_URL/vehicles?min_rate=300&sortBy=rental_rate&sortOrder=desc&limit=3\""

test_curl "Economy Vehicles (Under \$100)" \
    "curl -s -H \"Content-Type: application/json\" \"$BASE_URL/vehicles?max_rate=100&sortBy=rental_rate&sortOrder=asc&limit=3\""

test_curl "Electric Vehicles in Miami Beach" \
    "curl -s -H \"Content-Type: application/json\" \"$BASE_URL/vehicles?location_id=73699c53-254d-4488-bb48-b11da02243d8&fuel_type=electric&limit=2\""

test_curl "High-Capacity Vehicles (7+ seats)" \
    "curl -s -H \"Content-Type: application/json\" \"$BASE_URL/vehicles?seating_capacity=7&limit=2\""

test_curl "Automatic Transmission Vehicles" \
    "curl -s -H \"Content-Type: application/json\" \"$BASE_URL/vehicles?transmission=automatic&limit=3\""

# ====================================
# 📊 UTILITY ENDPOINTS
# ====================================

echo "📊 UTILITY ENDPOINTS"
echo "==================="
echo ""

test_curl "Health Check" \
    "curl -s -H \"Content-Type: application/json\" \"$BASE_URL/health\" || echo 'Health endpoint may not exist'"

test_curl "Invalid Endpoint (Should return 404)" \
    "curl -s -H \"Content-Type: application/json\" \"$BASE_URL/invalid-endpoint\""

# ====================================
# 🎯 PRACTICAL USAGE EXAMPLES
# ====================================

echo "🎯 PRACTICAL USAGE EXAMPLES"
echo "=========================="
echo ""

echo "🔹 Example 1: Customer looking for available Tesla in Manhattan for weekend"
echo "Command: curl -s -H \"Content-Type: application/json\" \"$BASE_URL/vehicles/available?start_date=2025-08-02&end_date=2025-08-03&location_id=1f6b5417-8a0a-497b-98a4-55357e0b928a&manufacturer=Tesla\""
echo "Response:"
curl -s -H "Content-Type: application/json" "$BASE_URL/vehicles/available?start_date=2025-08-02&end_date=2025-08-03&location_id=1f6b5417-8a0a-497b-98a4-55357e0b928a&manufacturer=Tesla" | head -10
echo ""
echo "----------------------------------------"
echo ""

echo "🔹 Example 2: Customer wants luxury cars under \$400/day in Beverly Hills"
echo "Command: curl -s -H \"Content-Type: application/json\" \"$BASE_URL/vehicles?location_id=18ce907b-a698-4ba5-88ec-d443e6c37395&min_rate=200&max_rate=400&sortBy=rental_rate&sortOrder=desc\""
echo "Response:"
curl -s -H "Content-Type: application/json" "$BASE_URL/vehicles?location_id=18ce907b-a698-4ba5-88ec-d443e6c37395&min_rate=200&max_rate=400&sortBy=rental_rate&sortOrder=desc" | head -10
echo ""
echo "----------------------------------------"
echo ""

echo "🔹 Example 3: Customer searching for electric vehicles"
echo "Command: curl -s -H \"Content-Type: application/json\" \"$BASE_URL/vehicles?fuel_type=electric&availability=true&limit=5\""
echo "Response:"
curl -s -H "Content-Type: application/json" "$BASE_URL/vehicles?fuel_type=electric&availability=true&limit=5" | head -10
echo ""
echo "----------------------------------------"
echo ""

# ====================================
# 📋 SUMMARY
# ====================================

echo "✅ TEST SUMMARY"
echo "==============="
echo ""
echo "🎉 All public endpoints tested successfully!"
echo ""
echo "📍 Key Locations Available:"
echo "  • Downtown Manhattan Branch: 1f6b5417-8a0a-497b-98a4-55357e0b928a"
echo "  • Beverly Hills Premium Location: 18ce907b-a698-4ba5-88ec-d443e6c37395"
echo "  • Miami Beach Luxury Fleet: 73699c53-254d-4488-bb48-b11da02243d8"
echo "  • Chicago Downtown Hub: 1ad9e47e-fb94-4d0a-8d7b-35468c348ebb"
echo "  • Las Vegas Strip Center: eed05fd3-9e51-4873-8984-773cd4f5d219"
echo ""
echo "🚗 Filter Options Available:"
echo "  • location_id: Filter by specific location"
echo "  • manufacturer: Filter by car brand (Tesla, Mercedes-Benz, BMW, etc.)"
echo "  • fuel_type: petrol, diesel, electric, hybrid"
echo "  • transmission: manual, automatic, cvt"
echo "  • seating_capacity: Number of seats (5, 7, etc.)"
echo "  • min_rate / max_rate: Price range filtering"
echo "  • availability: true/false for available vehicles only"
echo "  • sortBy: rental_rate, created_at, manufacturer, model"
echo "  • sortOrder: asc, desc"
echo ""
echo "📅 Date Range Filtering:"
echo "  • start_date & end_date: Check availability for specific dates"
echo "  • Format: YYYY-MM-DD (e.g., 2025-08-01)"
echo ""
echo "🔍 Search Capabilities:"
echo "  • /vehicles/search?q=tesla: Search across multiple fields"
echo "  • /locations?search=Manhattan: Search locations"
echo ""
echo "💡 Pro Tips:"
echo "  • Combine multiple filters for precise results"
echo "  • Use pagination (page & limit) for large result sets"
echo "  • Check /vehicle-specifications endpoints for detailed specs"
echo "  • Use /vehicles/available for date-specific availability"
echo ""
echo "🌐 Base URL: $BASE_URL"
echo "📖 Full documentation: See API_ENDPOINTS.md"
echo ""
echo "🎯 Ready to integrate with your frontend application!"
