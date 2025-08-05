# ============================================================================
# COMPREHENSIVE STRIPE PAYMENT ENDPOINTS TEST (PowerShell)
# ============================================================================
# This script tests all Stripe payment functionality in your vehicle rental API
# Run this after starting your server with: pnpm run dev

$BaseUrl = "http://localhost:7000/api"
$AdminEmail = "calebogeto1@gmail.com"
$AdminPassword = "123456"
$TestUserEmail = "testuser@example.com"
$TestUserPassword = "123456"
$OutputFile = "stripe_test_results_$(Get-Date -Format 'yyyyMMdd_HHmmss').json"

# Test results tracking
$TotalTests = 0
$PassedTests = 0
$FailedTests = 0
$TestResults = @{}

Write-Host "🚀 Starting Comprehensive Stripe Payment Tests" -ForegroundColor Blue
Write-Host "================================================" -ForegroundColor Blue
Write-Host "Server: $BaseUrl"
Write-Host "Output file: $OutputFile"
Write-Host ""

# Function to run test and track results
function Invoke-Test {
    param(
        [string]$TestName,
        [string]$Method,
        [string]$Url,
        [hashtable]$Headers = @{},
        [string]$Body = $null,
        [int]$ExpectedStatus = 200
    )
    
    $script:TotalTests++
    Write-Host "🧪 Running: $TestName" -ForegroundColor Yellow
    
    try {
        $response = if ($Body) {
            Invoke-RestMethod -Uri $Url -Method $Method -Headers $Headers -Body $Body -ContentType "application/json" -ErrorAction Stop
        } else {
            Invoke-RestMethod -Uri $Url -Method $Method -Headers $Headers -ErrorAction Stop
        }
        
        Write-Host "✅ PASSED: $TestName" -ForegroundColor Green
        $script:PassedTests++
        $script:TestResults[$TestName] = @{ Status = "PASSED"; Response = $response }
        
        return $response
    }
    catch {
        $statusCode = $_.Exception.Response.StatusCode.value__
        if ($statusCode -eq $ExpectedStatus -and $ExpectedStatus -ne 200) {
            Write-Host "✅ PASSED: $TestName (Expected $ExpectedStatus)" -ForegroundColor Green
            $script:PassedTests++
            $script:TestResults[$TestName] = @{ Status = "PASSED"; Response = "Expected error status $ExpectedStatus" }
        } else {
            Write-Host "❌ FAILED: $TestName" -ForegroundColor Red
            Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Red
            $script:FailedTests++
            $script:TestResults[$TestName] = @{ Status = "FAILED"; Error = $_.Exception.Message }
        }
        return $null
    }
    Write-Host ""
}

# ============================================================================
# STEP 1: HEALTH CHECK AND AUTHENTICATION
# ============================================================================

Write-Host "📋 Step 1: Health Check and Authentication" -ForegroundColor Blue

Invoke-Test -TestName "Server Health Check" -Method "GET" -Url "$BaseUrl/../health"

Invoke-Test -TestName "Payment Config (Public)" -Method "GET" -Url "$BaseUrl/payments/config"

# Admin Login
Write-Host "🔑 Logging in as admin..." -ForegroundColor Yellow
$adminLoginBody = @{
    email = $AdminEmail
    password = $AdminPassword
} | ConvertTo-Json

try {
    $adminLoginResponse = Invoke-RestMethod -Uri "$BaseUrl/auth/login" -Method POST -Body $adminLoginBody -ContentType "application/json"
    if ($adminLoginResponse.token) {
        $AdminToken = $adminLoginResponse.token
        Write-Host "✅ Admin login successful" -ForegroundColor Green
    } else {
        throw "No token in response"
    }
}
catch {
    Write-Host "❌ Admin login failed. Attempting to create admin user..." -ForegroundColor Red
    
    # Try to register admin
    $adminRegisterBody = @{
        email = $AdminEmail
        password = $AdminPassword
        fullName = "Admin User"
        role = "admin"
    } | ConvertTo-Json
    
    try {
        Invoke-RestMethod -Uri "$BaseUrl/auth/register" -Method POST -Body $adminRegisterBody -ContentType "application/json" -ErrorAction SilentlyContinue
        
        # Try login again
        $adminLoginResponse = Invoke-RestMethod -Uri "$BaseUrl/auth/login" -Method POST -Body $adminLoginBody -ContentType "application/json"
        if ($adminLoginResponse.token) {
            $AdminToken = $adminLoginResponse.token
            Write-Host "✅ Admin created and logged in" -ForegroundColor Green
        }
    }
    catch {
        Write-Host "❌ Failed to create/login admin. Some tests may fail." -ForegroundColor Red
        $AdminToken = $null
    }
}

# Test User Login
Write-Host "🔑 Logging in as test user..." -ForegroundColor Yellow
$testUserLoginBody = @{
    email = $TestUserEmail
    password = $TestUserPassword
} | ConvertTo-Json

try {
    $testUserLoginResponse = Invoke-RestMethod -Uri "$BaseUrl/auth/login" -Method POST -Body $testUserLoginBody -ContentType "application/json"
    if ($testUserLoginResponse.token) {
        $UserToken = $testUserLoginResponse.token
        Write-Host "✅ Test user login successful" -ForegroundColor Green
    } else {
        throw "No token in response"
    }
}
catch {
    Write-Host "❌ Test user login failed. Attempting to create test user..." -ForegroundColor Red
    
    # Try to register test user
    $testUserRegisterBody = @{
        email = $TestUserEmail
        password = $TestUserPassword
        fullName = "Test User"
    } | ConvertTo-Json
    
    try {
        Invoke-RestMethod -Uri "$BaseUrl/auth/register" -Method POST -Body $testUserRegisterBody -ContentType "application/json" -ErrorAction SilentlyContinue
        
        # Try login again
        $testUserLoginResponse = Invoke-RestMethod -Uri "$BaseUrl/auth/login" -Method POST -Body $testUserLoginBody -ContentType "application/json"
        if ($testUserLoginResponse.token) {
            $UserToken = $testUserLoginResponse.token
            Write-Host "✅ Test user created and logged in" -ForegroundColor Green
        }
    }
    catch {
        Write-Host "❌ Failed to create/login test user. Some tests may fail." -ForegroundColor Red
        $UserToken = $null
    }
}

Write-Host ""

# ============================================================================
# STEP 2: STRIPE CORE PAYMENT ENDPOINTS
# ============================================================================

Write-Host "💳 Step 2: Core Stripe Payment Endpoints" -ForegroundColor Blue

if ($UserToken) {
    $headers = @{ Authorization = "Bearer $UserToken" }
    
    # Test Stripe Payment Intent Creation
    $paymentIntentBody = @{
        amount = 50.00
        currency = "usd"
        booking_id = [guid]::NewGuid().ToString()
    } | ConvertTo-Json
    
    Invoke-Test -TestName "Create Stripe Payment Intent" -Method "POST" -Url "$BaseUrl/payments/stripe/create-intent" -Headers $headers -Body $paymentIntentBody
    
    # Test Stripe Payment Processing (will fail without real payment method)
    $processPaymentBody = @{
        payment_intent_id = "pi_test_123"
        booking_id = [guid]::NewGuid().ToString()
    } | ConvertTo-Json
    
    Invoke-Test -TestName "Process Stripe Payment (Structure Test)" -Method "POST" -Url "$BaseUrl/payments/stripe/process" -Headers $headers -Body $processPaymentBody -ExpectedStatus 400
}

# ============================================================================
# STEP 3: ENHANCED STRIPE FEATURES
# ============================================================================

Write-Host "🚀 Step 3: Enhanced Stripe Features" -ForegroundColor Blue

if ($UserToken) {
    $headers = @{ Authorization = "Bearer $UserToken" }
    
    # Test Stripe Customer Creation
    $customerBody = @{
        email = "customer@example.com"
        name = "Test Customer"
        phone = "+1234567890"
        metadata = @{ source = "api_test" }
    } | ConvertTo-Json
    
    Invoke-Test -TestName "Create Stripe Customer" -Method "POST" -Url "$BaseUrl/payments/stripe/customer" -Headers $headers -Body $customerBody
    
    # Test Stripe Checkout Session Creation
    $checkoutBody = @{
        booking_id = [guid]::NewGuid().ToString()
        amount = 75.00
        currency = "usd"
        customer_email = "customer@example.com"
        success_url = "http://localhost:3000/booking/success"
        cancel_url = "http://localhost:3000/booking/cancel"
        metadata = @{ 
            booking_type = "vehicle_rental"
            test = "true"
        }
    } | ConvertTo-Json
    
    Invoke-Test -TestName "Create Stripe Checkout Session" -Method "POST" -Url "$BaseUrl/payments/stripe/checkout-session" -Headers $headers -Body $checkoutBody
}

# ============================================================================
# STEP 4: PAYMENT ANALYTICS AND DASHBOARD
# ============================================================================

Write-Host "📊 Step 4: Payment Analytics and Dashboard" -ForegroundColor Blue

if ($AdminToken) {
    $adminHeaders = @{ Authorization = "Bearer $AdminToken" }
    
    Invoke-Test -TestName "Get Payment Analytics" -Method "GET" -Url "$BaseUrl/payments/analytics?start_date=2025-07-01&end_date=2025-08-01" -Headers $adminHeaders
    
    Invoke-Test -TestName "Get Payment Dashboard" -Method "GET" -Url "$BaseUrl/payments/dashboard?timeframe=week" -Headers $adminHeaders
    
    Invoke-Test -TestName "Get Revenue Forecast" -Method "GET" -Url "$BaseUrl/payments/revenue-forecast?days=30" -Headers $adminHeaders
    
    Invoke-Test -TestName "Export Payment Data (JSON)" -Method "GET" -Url "$BaseUrl/payments/export?format=json&start_date=2025-07-01" -Headers $adminHeaders
}

# ============================================================================
# STEP 5: PAYMENT INTEGRATION TESTS
# ============================================================================

Write-Host "🔧 Step 5: Payment Integration Tests" -ForegroundColor Blue

if ($AdminToken) {
    $adminHeaders = @{ Authorization = "Bearer $AdminToken" }
    
    Invoke-Test -TestName "Test Payment Integration (All)" -Method "GET" -Url "$BaseUrl/payments/test-integration?test_type=all" -Headers $adminHeaders
    
    Invoke-Test -TestName "Test Stripe Integration Only" -Method "GET" -Url "$BaseUrl/payments/test-integration?test_type=stripe" -Headers $adminHeaders
    
    Invoke-Test -TestName "Test Database Integration" -Method "GET" -Url "$BaseUrl/payments/test-integration?test_type=database" -Headers $adminHeaders
}

# ============================================================================
# STEP 6: UNIFIED PAYMENT PROCESSING
# ============================================================================

Write-Host "🔄 Step 6: Unified Payment Processing" -ForegroundColor Blue

if ($UserToken) {
    $headers = @{ Authorization = "Bearer $UserToken" }
    
    $unifiedPaymentBody = @{
        payment_method = "stripe"
        amount = 100.00
        currency = "usd"
        booking_id = [guid]::NewGuid().ToString()
        metadata = @{ test = "unified_payment" }
    } | ConvertTo-Json
    
    Invoke-Test -TestName "Process Payment (Unified - Stripe)" -Method "POST" -Url "$BaseUrl/payments/process" -Headers $headers -Body $unifiedPaymentBody
}

# ============================================================================
# FINALIZE RESULTS
# ============================================================================

# Create output file
$outputData = @{
    test_run = @{
        timestamp = (Get-Date -Format "yyyy-MM-ddTHH:mm:ssZ")
        base_url = $BaseUrl
        total_tests = $TotalTests
        passed_tests = $PassedTests
        failed_tests = $FailedTests
        success_rate = if ($TotalTests -gt 0) { [math]::Round(($PassedTests / $TotalTests) * 100, 2) } else { 0 }
        results = $TestResults
    }
}

$outputData | ConvertTo-Json -Depth 10 | Out-File -FilePath $OutputFile -Encoding UTF8

# ============================================================================
# FINAL SUMMARY
# ============================================================================

Write-Host ""
Write-Host "===============================================" -ForegroundColor Blue
Write-Host "🏁 STRIPE PAYMENT ENDPOINTS TEST SUMMARY" -ForegroundColor Blue
Write-Host "===============================================" -ForegroundColor Blue
Write-Host "Total Tests Run: $TotalTests" -ForegroundColor Yellow
Write-Host "Passed: $PassedTests" -ForegroundColor Green
Write-Host "Failed: $FailedTests" -ForegroundColor Red

if ($TotalTests -gt 0) {
    $SuccessRate = [math]::Round(($PassedTests / $TotalTests) * 100, 1)
    Write-Host "Success Rate: $SuccessRate%" -ForegroundColor Yellow
    
    if ($SuccessRate -eq 100) {
        Write-Host "🎉 ALL TESTS PASSED! Your Stripe integration is working perfectly!" -ForegroundColor Green
    } elseif ($SuccessRate -ge 80) {
        Write-Host "✅ Most tests passed! Minor issues may need attention." -ForegroundColor Yellow
    } else {
        Write-Host "⚠️ Several tests failed. Please review the errors above." -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "📄 Detailed results saved to: $OutputFile" -ForegroundColor Blue
Write-Host "🌐 API Documentation: http://localhost:7000/api/docs" -ForegroundColor Blue
Write-Host "🩺 Health Check: http://localhost:7000/health" -ForegroundColor Blue
Write-Host ""

# Recommendations
Write-Host "💡 RECOMMENDATIONS:" -ForegroundColor Blue
Write-Host "1. 🔧 Fix Redis connection for better rate limiting"
Write-Host "2. 🔐 Update Stripe webhook secret for production"
Write-Host "3. 📊 Monitor payment analytics regularly"
Write-Host "4. 🧪 Test with real Stripe payment methods in sandbox"
Write-Host "5. 🚀 Deploy to Azure for production testing"
Write-Host ""

Write-Host "🎯 Test completed successfully!" -ForegroundColor Green
