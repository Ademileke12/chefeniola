const BASE_URL = process.env.BASE_URL || "http://localhost:3000";

// Test SQL Injection
async function testSQLInjection() {
  try {
    const response = await fetch(`${BASE_URL}/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: "1' OR '1' = '1" }),
    });
    const data = await response.json();
    console.log("SQL Injection Test:", data);
  } catch (error) {
    console.error("SQL Injection Test Error:", error);
  }
}

// Test XSS
async function testXSS() {
  try {
    const response = await fetch(`${BASE_URL}/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: "<script>alert('XSS')</script>" }),
    });
    const data = await response.json();
    console.log("XSS Test:", data);
  } catch (error) {
    console.error("XSS Test Error:", error);
  }
}

// Test CSRF
async function testCSRF() {
  try {
    const response = await fetch(`${BASE_URL}/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    const data = await response.json();
    console.log("CSRF Test:", data);
  } catch (error) {
    console.error("CSRF Test Error:", error);
  }
}

// Test File Uploads
async function testFileUploads() {
  try {
    const file = new File(['test content'], 'test.txt', { type: 'text/plain' });
    const formData = new FormData();
    formData.append('file', file);
    const response = await fetch(`${BASE_URL}/upload`, {
      method: 'POST',
      body: formData,
    });
    const data = await response.json();
    console.log("File Upload Test:", data);
  } catch (error) {
    console.error("File Upload Test Error:", error);
  }
}

// Test Large Payloads
async function testLargePayloads() {
  try {
    const largePayload = Array(100000).fill("a").join("");
    const response = await fetch(`${BASE_URL}/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ payload: largePayload }),
    });
    const data = await response.json();
    console.log("Large Payload Test:", data);
  } catch (error) {
    console.error("Large Payload Test Error:", error);
  }
}

// Test Malformed Data
async function testMalformedData() {
  try {
    const malformedJson = "{ invalid: json }";
    const response = await fetch(`${BASE_URL}/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: malformedJson,
    });
    const data = await response.json();
    console.log("Malformed Data Test:", data);
  } catch (error) {
    console.error("Malformed Data Test Error:", error);
  }
}

// Test Error Handling
async function testErrorHandling() {
  try {
    const response = await fetch(`${BASE_URL}/non-existent-route`, {
      method: 'GET',
    });
    const data = await response.json();
    console.log("Error Handling Test:", data);
  } catch (error) {
    console.error("Error Handling Test Error:", error);
  }
}

// Test Rate Limiting
async function testRateLimiting() {
  try {
    for (let i = 0; i < 10; i++) {
      const response = await fetch(`${BASE_URL}/`, {
        method: 'GET',
      });
      const data = await response.json();
      console.log("Rate Limiting Test:", data);
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  } catch (error) {
    console.error("Rate Limiting Test Error:", error);
  }
}

async function main() {
  await testSQLInjection();
  await testXSS();
  await testCSRF();
  await testFileUploads();
  await testLargePayloads();
  await testMalformedData();
  await testErrorHandling();
  await testRateLimiting();
}

main();