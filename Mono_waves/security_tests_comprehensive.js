/**
 * Comprehensive Security Test Suite
 * 
 * Tests actual API endpoints for security vulnerabilities:
 * - SQL Injection
 * - XSS (Cross-Site Scripting)
 * - CSRF (Cross-Site Request Forgery)
 * - IDOR (Insecure Direct Object Reference)
 * - File Upload Security
 * - Rate Limiting
 * - Input Validation
 * - Error Handling
 */

const BASE_URL = process.env.BASE_URL || 'http://localhost:3001';

// Color codes for output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function pass(test) {
  log(`✅ PASS: ${test}`, 'green');
}

function fail(test, reason) {
  log(`❌ FAIL: ${test}`, 'red');
  if (reason) log(`   Reason: ${reason}`, 'yellow');
}

function info(message) {
  log(`ℹ️  ${message}`, 'cyan');
}

// Test Results Tracker
const results = {
  passed: 0,
  failed: 0,
  total: 0,
};

function recordResult(passed, test, reason) {
  results.total++;
  if (passed) {
    results.passed++;
    pass(test);
  } else {
    results.failed++;
    fail(test, reason);
  }
}

// ============================================================================
// 1. SQL INJECTION TESTS
// ============================================================================

async function testSQLInjection() {
  log('\n📋 Testing SQL Injection Protection...', 'blue');
  
  // Test 1: SQL injection in orders search
  try {
    const maliciousSearch = "'; DROP TABLE orders; --";
    const response = await fetch(`${BASE_URL}/api/orders?search=${encodeURIComponent(maliciousSearch)}`, {
      headers: {
        'Authorization': 'Bearer fake-token',
      },
    });
    
    const isRejected = response.status === 400 || response.status === 401;
    recordResult(
      isRejected,
      'SQL injection in orders search endpoint',
      isRejected ? null : `Expected 400/401, got ${response.status}`
    );
  } catch (error) {
    recordResult(false, 'SQL injection in orders search endpoint', error.message);
  }
  
  // Test 2: SQL injection in support ticket
  try {
    const response = await fetch(`${BASE_URL}/api/support`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Origin': BASE_URL,
      },
      body: JSON.stringify({
        email: 'test@example.com',
        category: 'general',
        subject: "Test'; DROP TABLE support_tickets; --",
        message: 'Test message',
      }),
    });
    
    const isRejected = response.status === 400;
    recordResult(
      isRejected,
      'SQL injection in support ticket subject',
      isRejected ? null : `Expected 400, got ${response.status}`
    );
  } catch (error) {
    recordResult(false, 'SQL injection in support ticket subject', error.message);
  }
}

// ============================================================================
// 2. XSS (CROSS-SITE SCRIPTING) TESTS
// ============================================================================

async function testXSS() {
  log('\n📋 Testing XSS Protection...', 'blue');
  
  // Test 1: XSS in support ticket subject
  try {
    const response = await fetch(`${BASE_URL}/api/support`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Origin': BASE_URL,
      },
      body: JSON.stringify({
        email: 'test@example.com',
        category: 'general',
        subject: '<script>alert("XSS")</script>',
        message: 'Test message',
      }),
    });
    
    const isRejected = response.status === 400;
    recordResult(
      isRejected,
      'XSS in support ticket subject',
      isRejected ? null : `Expected 400, got ${response.status}`
    );
  } catch (error) {
    recordResult(false, 'XSS in support ticket subject', error.message);
  }
  
  // Test 2: XSS in support ticket message
  try {
    const response = await fetch(`${BASE_URL}/api/support`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Origin': BASE_URL,
      },
      body: JSON.stringify({
        email: 'test@example.com',
        category: 'general',
        subject: 'Test',
        message: '<img src=x onerror=alert("XSS")>',
      }),
    });
    
    const isRejected = response.status === 400;
    recordResult(
      isRejected,
      'XSS in support ticket message',
      isRejected ? null : `Expected 400, got ${response.status}`
    );
  } catch (error) {
    recordResult(false, 'XSS in support ticket message', error.message);
  }
  
  // Test 3: JavaScript protocol XSS
  try {
    const response = await fetch(`${BASE_URL}/api/support`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Origin': BASE_URL,
      },
      body: JSON.stringify({
        email: 'test@example.com',
        category: 'general',
        subject: 'Test',
        message: 'Click here: javascript:alert("XSS")',
      }),
    });
    
    const isRejected = response.status === 400;
    recordResult(
      isRejected,
      'JavaScript protocol XSS',
      isRejected ? null : `Expected 400, got ${response.status}`
    );
  } catch (error) {
    recordResult(false, 'JavaScript protocol XSS', error.message);
  }
}

// ============================================================================
// 3. CSRF (CROSS-SITE REQUEST FORGERY) TESTS
// ============================================================================

async function testCSRF() {
  log('\n📋 Testing CSRF Protection...', 'blue');
  
  // Test 1: POST without Origin header
  try {
    const response = await fetch(`${BASE_URL}/api/support`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Intentionally omit Origin/Referer
      },
      body: JSON.stringify({
        email: 'test@example.com',
        category: 'general',
        subject: 'Test',
        message: 'Test message',
      }),
    });
    
    const isRejected = response.status === 403;
    recordResult(
      isRejected,
      'CSRF protection on support endpoint (no origin)',
      isRejected ? null : `Expected 403, got ${response.status}`
    );
  } catch (error) {
    recordResult(false, 'CSRF protection on support endpoint (no origin)', error.message);
  }
  
  // Test 2: POST with wrong Origin
  try {
    const response = await fetch(`${BASE_URL}/api/support`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Origin': 'https://evil.com',
      },
      body: JSON.stringify({
        email: 'test@example.com',
        category: 'general',
        subject: 'Test',
        message: 'Test message',
      }),
    });
    
    const isRejected = response.status === 403;
    recordResult(
      isRejected,
      'CSRF protection on support endpoint (wrong origin)',
      isRejected ? null : `Expected 403, got ${response.status}`
    );
  } catch (error) {
    recordResult(false, 'CSRF protection on support endpoint (wrong origin)', error.message);
  }
  
  // Test 3: File upload without Origin
  try {
    const formData = new FormData();
    const blob = new Blob(['test'], { type: 'image/png' });
    formData.append('file', blob, 'test.png');
    
    const response = await fetch(`${BASE_URL}/api/upload`, {
      method: 'POST',
      // Intentionally omit Origin/Referer
      body: formData,
    });
    
    const isRejected = response.status === 403 || response.status === 401;
    recordResult(
      isRejected,
      'CSRF protection on upload endpoint',
      isRejected ? null : `Expected 403/401, got ${response.status}`
    );
  } catch (error) {
    recordResult(false, 'CSRF protection on upload endpoint', error.message);
  }
}

// ============================================================================
// 4. IDOR (INSECURE DIRECT OBJECT REFERENCE) TESTS
// ============================================================================

async function testIDOR() {
  log('\n📋 Testing IDOR Protection...', 'blue');
  
  // Test 1: Invalid UUID format
  try {
    const response = await fetch(`${BASE_URL}/api/orders/invalid-id`, {
      headers: {
        'Authorization': 'Bearer fake-token',
      },
    });
    
    const isRejected = response.status === 400 || response.status === 401;
    recordResult(
      isRejected,
      'IDOR protection - invalid UUID format',
      isRejected ? null : `Expected 400/401, got ${response.status}`
    );
  } catch (error) {
    recordResult(false, 'IDOR protection - invalid UUID format', error.message);
  }
  
  // Test 2: Sequential ID guessing
  try {
    const response = await fetch(`${BASE_URL}/api/orders/123`, {
      headers: {
        'Authorization': 'Bearer fake-token',
      },
    });
    
    const isRejected = response.status === 400 || response.status === 401;
    recordResult(
      isRejected,
      'IDOR protection - sequential ID',
      isRejected ? null : `Expected 400/401, got ${response.status}`
    );
  } catch (error) {
    recordResult(false, 'IDOR protection - sequential ID', error.message);
  }
  
  // Test 3: Access without authentication
  try {
    const validUUID = '00000000-0000-0000-0000-000000000000';
    const response = await fetch(`${BASE_URL}/api/orders/${validUUID}`);
    
    const isRejected = response.status === 401;
    recordResult(
      isRejected,
      'IDOR protection - no authentication',
      isRejected ? null : `Expected 401, got ${response.status}`
    );
  } catch (error) {
    recordResult(false, 'IDOR protection - no authentication', error.message);
  }
}

// ============================================================================
// 5. FILE UPLOAD SECURITY TESTS
// ============================================================================

async function testFileUploadSecurity() {
  log('\n📋 Testing File Upload Security...', 'blue');
  
  // Test 1: Invalid file type (text file)
  try {
    const formData = new FormData();
    const blob = new Blob(['test content'], { type: 'text/plain' });
    formData.append('file', blob, 'test.txt');
    
    const response = await fetch(`${BASE_URL}/api/upload`, {
      method: 'POST',
      headers: {
        'Origin': BASE_URL,
      },
      body: formData,
    });
    
    const isRejected = response.status === 400 || response.status === 401;
    recordResult(
      isRejected,
      'File upload - reject text file',
      isRejected ? null : `Expected 400/401, got ${response.status}`
    );
  } catch (error) {
    recordResult(false, 'File upload - reject text file', error.message);
  }
  
  // Test 2: Dangerous file extension (.exe)
  try {
    const formData = new FormData();
    const blob = new Blob(['MZ'], { type: 'application/octet-stream' });
    formData.append('file', blob, 'malware.exe');
    
    const response = await fetch(`${BASE_URL}/api/upload`, {
      method: 'POST',
      headers: {
        'Origin': BASE_URL,
      },
      body: formData,
    });
    
    const isRejected = response.status === 400 || response.status === 401;
    recordResult(
      isRejected,
      'File upload - reject .exe file',
      isRejected ? null : `Expected 400/401, got ${response.status}`
    );
  } catch (error) {
    recordResult(false, 'File upload - reject .exe file', error.message);
  }
  
  // Test 3: PHP file upload
  try {
    const formData = new FormData();
    const blob = new Blob(['<?php echo "test"; ?>'], { type: 'application/x-php' });
    formData.append('file', blob, 'shell.php');
    
    const response = await fetch(`${BASE_URL}/api/upload`, {
      method: 'POST',
      headers: {
        'Origin': BASE_URL,
      },
      body: formData,
    });
    
    const isRejected = response.status === 400 || response.status === 401;
    recordResult(
      isRejected,
      'File upload - reject PHP file',
      isRejected ? null : `Expected 400/401, got ${response.status}`
    );
  } catch (error) {
    recordResult(false, 'File upload - reject PHP file', error.message);
  }
  
  // Test 4: Double extension bypass attempt
  try {
    const formData = new FormData();
    const blob = new Blob(['test'], { type: 'image/png' });
    formData.append('file', blob, 'image.php.png');
    
    const response = await fetch(`${BASE_URL}/api/upload`, {
      method: 'POST',
      headers: {
        'Origin': BASE_URL,
      },
      body: formData,
    });
    
    const isRejected = response.status === 400 || response.status === 401;
    recordResult(
      isRejected,
      'File upload - reject double extension',
      isRejected ? null : `Expected 400/401, got ${response.status}`
    );
  } catch (error) {
    recordResult(false, 'File upload - reject double extension', error.message);
  }
}

// ============================================================================
// 6. RATE LIMITING TESTS
// ============================================================================

async function testRateLimiting() {
  log('\n📋 Testing Rate Limiting...', 'blue');
  
  try {
    const requests = [];
    const endpoint = `${BASE_URL}/api/cart`;
    
    // Make 15 rapid requests
    for (let i = 0; i < 15; i++) {
      requests.push(
        fetch(endpoint, {
          headers: {
            'Origin': BASE_URL,
          },
        })
      );
    }
    
    const responses = await Promise.all(requests);
    const rateLimited = responses.some(r => r.status === 429);
    
    recordResult(
      rateLimited,
      'Rate limiting - blocks excessive requests',
      rateLimited ? null : 'No 429 status received after 15 requests'
    );
  } catch (error) {
    recordResult(false, 'Rate limiting - blocks excessive requests', error.message);
  }
}

// ============================================================================
// 7. INPUT VALIDATION TESTS
// ============================================================================

async function testInputValidation() {
  log('\n📋 Testing Input Validation...', 'blue');
  
  // Test 1: Invalid email format
  try {
    const response = await fetch(`${BASE_URL}/api/support`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Origin': BASE_URL,
      },
      body: JSON.stringify({
        email: 'not-an-email',
        category: 'general',
        subject: 'Test',
        message: 'Test message',
      }),
    });
    
    const isRejected = response.status === 400;
    recordResult(
      isRejected,
      'Input validation - invalid email format',
      isRejected ? null : `Expected 400, got ${response.status}`
    );
  } catch (error) {
    recordResult(false, 'Input validation - invalid email format', error.message);
  }
  
  // Test 2: Missing required fields
  try {
    const response = await fetch(`${BASE_URL}/api/support`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Origin': BASE_URL,
      },
      body: JSON.stringify({
        email: 'test@example.com',
        // Missing category, subject, message
      }),
    });
    
    const isRejected = response.status === 400;
    recordResult(
      isRejected,
      'Input validation - missing required fields',
      isRejected ? null : `Expected 400, got ${response.status}`
    );
  } catch (error) {
    recordResult(false, 'Input validation - missing required fields', error.message);
  }
  
  // Test 3: Malformed JSON
  try {
    const response = await fetch(`${BASE_URL}/api/support`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Origin': BASE_URL,
      },
      body: '{ invalid json }',
    });
    
    const isRejected = response.status === 400;
    recordResult(
      isRejected,
      'Input validation - malformed JSON',
      isRejected ? null : `Expected 400, got ${response.status}`
    );
  } catch (error) {
    recordResult(false, 'Input validation - malformed JSON', error.message);
  }
  
  // Test 4: Extremely long input
  try {
    const longString = 'A'.repeat(100000);
    const response = await fetch(`${BASE_URL}/api/support`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Origin': BASE_URL,
      },
      body: JSON.stringify({
        email: 'test@example.com',
        category: 'general',
        subject: 'Test',
        message: longString,
      }),
    });
    
    const isHandled = response.status === 400 || response.status === 413;
    recordResult(
      isHandled,
      'Input validation - extremely long input',
      isHandled ? null : `Expected 400/413, got ${response.status}`
    );
  } catch (error) {
    recordResult(false, 'Input validation - extremely long input', error.message);
  }
}

// ============================================================================
// 8. ERROR HANDLING TESTS
// ============================================================================

async function testErrorHandling() {
  log('\n📋 Testing Error Handling...', 'blue');
  
  // Test 1: Non-existent endpoint
  try {
    const response = await fetch(`${BASE_URL}/api/nonexistent`);
    
    const isHandled = response.status === 404;
    recordResult(
      isHandled,
      'Error handling - 404 for non-existent endpoint',
      isHandled ? null : `Expected 404, got ${response.status}`
    );
  } catch (error) {
    recordResult(false, 'Error handling - 404 for non-existent endpoint', error.message);
  }
  
  // Test 2: Method not allowed
  try {
    const response = await fetch(`${BASE_URL}/api/cart`, {
      method: 'DELETE', // Cart endpoint doesn't support DELETE on root
    });
    
    const isHandled = response.status === 405 || response.status === 404;
    recordResult(
      isHandled,
      'Error handling - method not allowed',
      isHandled ? null : `Expected 405/404, got ${response.status}`
    );
  } catch (error) {
    recordResult(false, 'Error handling - method not allowed', error.message);
  }
}

// ============================================================================
// 9. AUTHENTICATION TESTS
// ============================================================================

async function testAuthentication() {
  log('\n📋 Testing Authentication...', 'blue');
  
  // Test 1: Admin endpoint without auth
  try {
    const response = await fetch(`${BASE_URL}/api/admin/dashboard`);
    
    const isRejected = response.status === 401;
    recordResult(
      isRejected,
      'Authentication - admin endpoint requires auth',
      isRejected ? null : `Expected 401, got ${response.status}`
    );
  } catch (error) {
    recordResult(false, 'Authentication - admin endpoint requires auth', error.message);
  }
  
  // Test 2: Invalid auth token
  try {
    const response = await fetch(`${BASE_URL}/api/admin/dashboard`, {
      headers: {
        'Authorization': 'Bearer invalid-token',
      },
    });
    
    const isRejected = response.status === 401;
    recordResult(
      isRejected,
      'Authentication - reject invalid token',
      isRejected ? null : `Expected 401, got ${response.status}`
    );
  } catch (error) {
    recordResult(false, 'Authentication - reject invalid token', error.message);
  }
}

// ============================================================================
// MAIN TEST RUNNER
// ============================================================================

async function runAllTests() {
  log('\n' + '='.repeat(70), 'cyan');
  log('🔒 COMPREHENSIVE SECURITY TEST SUITE', 'cyan');
  log('='.repeat(70) + '\n', 'cyan');
  
  info(`Testing against: ${BASE_URL}`);
  info(`Started at: ${new Date().toISOString()}\n`);
  
  try {
    await testSQLInjection();
    await testXSS();
    await testCSRF();
    await testIDOR();
    await testFileUploadSecurity();
    await testRateLimiting();
    await testInputValidation();
    await testErrorHandling();
    await testAuthentication();
  } catch (error) {
    log(`\n❌ Test suite error: ${error.message}`, 'red');
  }
  
  // Print summary
  log('\n' + '='.repeat(70), 'cyan');
  log('📊 TEST SUMMARY', 'cyan');
  log('='.repeat(70), 'cyan');
  log(`Total Tests: ${results.total}`, 'blue');
  log(`Passed: ${results.passed}`, 'green');
  log(`Failed: ${results.failed}`, results.failed > 0 ? 'red' : 'green');
  log(`Success Rate: ${((results.passed / results.total) * 100).toFixed(1)}%`, 
       results.failed === 0 ? 'green' : 'yellow');
  log('='.repeat(70) + '\n', 'cyan');
  
  // Overall result
  if (results.failed === 0) {
    log('✅ ALL SECURITY TESTS PASSED!', 'green');
    log('🎉 Application security posture is strong.\n', 'green');
  } else {
    log('⚠️  SOME SECURITY TESTS FAILED', 'yellow');
    log(`🔧 ${results.failed} issue(s) need attention.\n`, 'yellow');
  }
  
  info(`Completed at: ${new Date().toISOString()}`);
  
  // Exit with appropriate code
  process.exit(results.failed > 0 ? 1 : 0);
}

// Run tests
runAllTests().catch(error => {
  log(`\n💥 Fatal error: ${error.message}`, 'red');
  process.exit(1);
});
