#!/usr/bin/env pwsh
# ============================================================================
# COMPREHENSIVE STRIPE PAYMENT ENDPOINT TESTING SCRIPT
# Vehicle Rental Backend API - PowerShell Version
# ============================================================================

param(
    [string]$BaseUrl = "http://localhost:7000",
    [string]$TestEmail = "test$(Get-Date -Format 'MMddHHmmss')@example.com",
    [string]$TestPassword = "password123",
    [string]$AdminEmail = "admin@vehiclerental.com",
    [string]$AdminPassword = "admin123"
)

Write-Host "🚀 COMPREHENSIVE STRIPE PAYMENT ENDPOINT TESTS" -ForegroundColor Cyan
Write-Host "=" * 80 -ForegroundColor Cyan
Write-Host "Base URL: $BaseUrl" -ForegroundColor Yellow
Write-Host "Test Email: $TestEmail" -ForegroundColor Yellow
Write-Host "Starting tests at: $(Get-Date)" -ForegroundColor Yellow
Write-Host ""

# Global variables
$Global:UserToken = ""
$Global:AdminToken = ""
$Global:TestResults = @()
$Global:PassedTests = 0
$Global:FailedTests = 0

# Helper function to make HTTP requests
function Invoke-ApiRequest {
    param(
        [string]$Method,
        [string]$Endpoint,
        [object]$Body = $null,
        [hashtable]$Headers = @{},
        [string]$Description,
        [bool]$ExpectError = $false
    )
    
    $url = "$BaseUrl$Endpoint"
    $defaultHeaders = @{
        "Content-Type" = "application/json"
    }
    
    # Merge headers
    foreach ($key in $Headers.Keys) {
        $defaultHeaders[$key] = $Headers[$key]
    }
    
    Write-Host "📡 Testing: $Description" -ForegroundColor White
    Write-Host "   $Method $Endpoint" -ForegroundColor Gray
    
    try {
        $requestParams = @{
            Uri = $url
            Method = $Method
            Headers = $defaultHeaders
            ErrorAction = 'Stop'
        }
        
        if ($Body) {
            $requestParams.Body = ($Body | ConvertTo-Json -Depth 10)
        }
        
        $response = Invoke-RestMethod @requestParams
        
        if ($ExpectError) {
            Write-Host "   ❌ UNEXPECTED SUCCESS (Expected Error)" -ForegroundColor Red
            $Global:FailedTests++
            $Global:TestResults += @{
                Test = $Description
                Status = "FAILED"
                Reason = "Expected error but got success"
                Response = $response
            }
        } else {
            Write-Host "   ✅ SUCCESS" -ForegroundColor Green
            $Global:PassedTests++
            $Global:TestResults += @{
                Test = $Description
                Status = "PASSED"
                Response = $response
            }
        }
        
        return $response
    }
    catch {
        $statusCode = $_.Exception.Response.StatusCode.value__
        $errorBody = ""
        
        try {
            $errorStream = $_.Exception.Response.GetResponseStream()
            $reader = New-Object System.IO.StreamReader($errorStream)
            $errorBody = $reader.ReadToEnd()
        }
        catch { }
        
        if ($ExpectError) {
            Write-Host "   ✅ EXPECTED ERROR (Status: $statusCode)" -ForegroundColor Green
            $Global:PassedTests++
            $Global:TestResults += @{
                Test = $Description
                Status = "PASSED"
                Reason = "Expected error received"
                StatusCode = $statusCode
                Error = $errorBody
            }
        } else {
            Write-Host "   ❌ FAILED (Status: $statusCode)" -ForegroundColor Red
            Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Red
            $Global:FailedTests++
            $Global:TestResults += @{
                Test = $Description
                Status = "FAILED"
                StatusCode = $statusCode
                Error = $errorBody
                Exception = $_.Exception.Message
            }
        }
        
        return $null
    }
}

# Test 1: Health Check
Write-Host "🏥 BASIC CONNECTIVITY TESTS" -ForegroundColor Magenta
Write-Host "-" * 50

$healthCheck = Invoke-ApiRequest -Method "GET" -Endpoint "/health" -Description "Health Check"

# Test 2: Payment Config
$paymentConfig = Invoke-ApiRequest -Method "GET" -Endpoint "/api/payments/config" -Description "Get Payment Configuration"

# Test 3: Register Test User
Write-Host ""
Write-Host "👤 USER AUTHENTICATION TESTS" -ForegroundColor Magenta
Write-Host "-" * 50

$registerBody = @{
    email = $TestEmail
    password = $TestPassword
    first_name = "Test"
    last_name = "User"
    phone = "+1234567890"
    address = "123 Test Street"
}

$registration = Invoke-ApiRequest -Method "POST" -Endpoint "/api/auth/register" -Body $registerBody -Description "Register Test User"

# Test 4: Login Test User
$loginBody = @{
    email = $TestEmail
    password = $TestPassword
}

$loginResponse = Invoke-ApiRequest -Method "POST" -Endpoint "/api/auth/login" -Body $loginBody -Description "Login Test User"

if ($loginResponse -and $loginResponse.access_token) {
    $Global:UserToken = $loginResponse.access_token
    Write-Host "   🔑 User token obtained successfully" -ForegroundColor Green
} else {
    Write-Host "   ⚠️ Failed to obtain user token - some tests will be skipped" -ForegroundColor Yellow
}

# Test 5: Login Admin User
$adminLoginBody = @{
    email = $AdminEmail
    password = $AdminPassword
}

$adminLoginResponse = Invoke-ApiRequest -Method "POST" -Endpoint "/api/auth/login" -Body $adminLoginBody -Description "Login Admin User"

if ($adminLoginResponse -and $adminLoginResponse.access_token) {
    $Global:AdminToken = $adminLoginResponse.access_token
    Write-Host "   🔑 Admin token obtained successfully" -ForegroundColor Green
} else {
    Write-Host "   ⚠️ Failed to obtain admin token - admin tests will be skipped" -ForegroundColor Yellow
}

# Test 6: Original Stripe Payment Intent
Write-Host ""
Write-Host "💳 ORIGINAL STRIPE ENDPOINTS" -ForegroundColor Magenta
Write-Host "-" * 50

if ($Global:UserToken) {
    $headers = @{ "Authorization" = "Bearer $Global:UserToken" }
    
    $paymentIntentBody = @{
        booking_id = "550e8400-e29b-41d4-a716-446655440001"
        amount = 100.00
        currency = "usd"
        customer_email = $TestEmail
        metadata = @{
            vehicle_id = "test-vehicle-123"
            rental_days = "3"
        }
    }
    
    Invoke-ApiRequest -Method "POST" -Endpoint "/api/payments/stripe/create-intent" -Body $paymentIntentBody -Headers $headers -Description "Create Stripe Payment Intent"
    
    # Test 7: Process Stripe Payment
    $processPaymentBody = @{
        payment_intent_id = "pi_test_example"
        booking_id = "550e8400-e29b-41d4-a716-446655440001"
        payment_method_id = "pm_card_visa"
    }
    
    Invoke-ApiRequest -Method "POST" -Endpoint "/api/payments/stripe/process" -Body $processPaymentBody -Headers $headers -Description "Process Stripe Payment"
}

# Test 8: Enhanced Stripe Checkout Session
Write-Host ""
Write-Host "🚀 ENHANCED STRIPE ENDPOINTS" -ForegroundColor Magenta
Write-Host "-" * 50

if ($Global:UserToken) {
    $headers = @{ "Authorization" = "Bearer $Global:UserToken" }
    
    $checkoutSessionBody = @{
        booking_id = "550e8400-e29b-41d4-a716-446655440002"
        amount = 150.00
        currency = "usd"
        customer_email = $TestEmail
        success_url = "http://localhost:3000/booking/success"
        cancel_url = "http://localhost:3000/booking/cancel"
        metadata = @{
            vehicle_id = "premium-vehicle-456"
            rental_days = "5"
        }
    }
    
    Invoke-ApiRequest -Method "POST" -Endpoint "/api/payments/stripe/checkout-session" -Body $checkoutSessionBody -Headers $headers -Description "Create Stripe Checkout Session"
    
    # Test 9: Create Stripe Customer
    $customerBody = @{
        email = $TestEmail
        name = "Test User"
        phone = "+1234567890"
        metadata = @{
            user_type = "premium"
            registration_date = "2025-08-03"
        }
    }
    
    Invoke-ApiRequest -Method "POST" -Endpoint "/api/payments/stripe/customer" -Body $customerBody -Headers $headers -Description "Create Stripe Customer"
    
    # Test 10: Create Stripe Subscription
    $subscriptionBody = @{
        customer_id = "cus_test_customer_id"
        price_id = "price_test_monthly_rental"
        metadata = @{
            subscription_type = "monthly_rental"
            vehicle_category = "premium"
        }
    }
    
    Invoke-ApiRequest -Method "POST" -Endpoint "/api/payments/stripe/subscription" -Body $subscriptionBody -Headers $headers -Description "Create Stripe Subscription"
}

# Final Results
Write-Host ""
Write-Host "📊 TEST RESULTS SUMMARY" -ForegroundColor Cyan
Write-Host "=" * 80 -ForegroundColor Cyan
Write-Host "Total Tests: $($Global:PassedTests + $Global:FailedTests)" -ForegroundColor White
Write-Host "Passed: $Global:PassedTests" -ForegroundColor Green
Write-Host "Failed: $Global:FailedTests" -ForegroundColor Red

if (($Global:PassedTests + $Global:FailedTests) -gt 0) {
    Write-Host "Success Rate: $([math]::Round(($Global:PassedTests / ($Global:PassedTests + $Global:FailedTests)) * 100, 2))%" -ForegroundColor Yellow
}

# Save detailed results
$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$resultsFile = "stripe_test_results_$timestamp.json"
$Global:TestResults | ConvertTo-Json -Depth 10 | Out-File -FilePath $resultsFile -Encoding UTF8

Write-Host "💾 Detailed results saved to: $resultsFile" -ForegroundColor Cyan
Write-Host "✅ Test execution completed at: $(Get-Date)" -ForegroundColor Green
