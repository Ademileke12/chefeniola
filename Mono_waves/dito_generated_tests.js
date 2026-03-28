const BASE_URL = process.env.BASE_URL || "http://localhost:3000";

async function testAdminDashboardMetrics() {
  try {
    const response = await fetch(`${BASE_URL}/api/admin/dashboard`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    if (!response.ok) throw new Error(`Status ${response.status}: ${await response.text()}`);
    const data = await response.json();
    console.log("PASS: Successfully fetched admin dashboard metrics");
  } catch (error) {
    console.log(`FAIL: Failed to fetch admin dashboard metrics - ${error.message}`);
  }
}

async function testFileUpload() {
  try {
    const blob = new Blob(['test content'], { type: 'image/png' });
    const formData = new FormData();
    formData.append('file', blob, 'test.png');
    const response = await fetch(`${BASE_URL}/api/upload`, {
      method: 'POST',
      body: formData,
    });
    if (!response.ok) throw new Error(`Status ${response.status}: ${await response.text()}`);
    const data = await response.json();
    console.log("PASS: Successfully uploaded file");
  } catch (error) {
    console.log(`FAIL: Failed to upload file - ${error.message}`);
  }
}

async function testCSRFProtection() {
  try {
    const response = await fetch(`${BASE_URL}/api/support`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ customerName: 'Test', customerEmail: 'test@example.com', subject: 'CSRF Test', message: 'Testing' }),
    });
    // If it's 200/201, it means CSRF is NOT active/working in this environment
    if (response.status === 403) {
      console.log("PASS: CSRF protection is working");
    } else {
      console.log(`FAIL: CSRF protection is not working (Status: ${response.status})`);
    }
  } catch (error) {
    console.log(`FAIL: Failed to test CSRF protection - ${error.message}`);
  }
}

async function testRateLimiting() {
  try {
    let lastStatus = 0;
    for (let i = 0; i < 5; i++) { // Reduced count for quicker test
      const res = await fetch(`${BASE_URL}/api/support`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customerName: 'Rate Test', customerEmail: 'test@example.com', subject: 'Rate Test', message: 'Testing' }),
      });
      lastStatus = res.status;
      if (lastStatus === 429) break;
    }

    if (lastStatus === 429) {
      console.log("PASS: Rate limiting is working");
    } else {
      console.log(`FAIL: Rate limiting is not working (Last Status: ${lastStatus})`);
    }
  } catch (error) {
    console.log(`FAIL: Failed to test rate limiting - ${error.message}`);
  }
}

// Run tests
testAdminDashboardMetrics();
testFileUpload();
testCSRFProtection();
testRateLimiting();

//