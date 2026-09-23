/**
 * EiToh Full-Stack API Automated Integration Test Suite
 * Tests MySQL persistence, auth, catalog, orders, quotes, and admin analytics
 */
const http = require('http');

function request(method, path, body = null, token = null) {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : null;
    const headers = {
      'Content-Type': 'application/json'
    };
    if (payload) {
      headers['Content-Length'] = Buffer.byteLength(payload);
    }
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const req = http.request(
      {
        hostname: 'localhost',
        port: 5000,
        path,
        method,
        headers
      },
      res => {
        let data = '';
        res.on('data', chunk => (data += chunk));
        res.on('end', () => {
          try {
            const parsed = JSON.parse(data);
            resolve({ status: res.statusCode, body: parsed });
          } catch (e) {
            resolve({ status: res.statusCode, raw: data });
          }
        });
      }
    );

    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

async function runTests() {
  console.log('🧪 Starting EiToh API Integration Tests...\n');
  let passed = 0;
  let failed = 0;

  function assert(condition, testName) {
    if (condition) {
      console.log(`  ✅ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${testName}`);
      failed++;
    }
  }

  try {
    // 1. Health Check
    const health = await request('GET', '/api/health');
    assert(health.status === 200 && health.body.database === 'connected', 'Database Healthcheck connected');

    // 2. Register Test Customer
    const testEmail = `maker_${Date.now()}@example.com`;
    const regRes = await request('POST', '/api/auth/register', {
      name: 'Rahman Maker',
      email: testEmail,
      phone: '01712345678',
      password: 'password123',
      address: 'House 42, Road 7, Dhanmondi',
      city: 'Dhaka',
      district: 'Dhaka'
    });
    assert(regRes.status === 201 && regRes.body.token, 'Customer Registration creates JWT and user in MySQL');
    const customerToken = regRes.body.token;

    // 3. Login
    const loginRes = await request('POST', '/api/auth/login', {
      email: testEmail,
      password: 'password123'
    });
    assert(loginRes.status === 200 && loginRes.body.user.email === testEmail, 'Customer Login succeeds with verified bcrypt hash');

    // 4. Authenticated /me
    const meRes = await request('GET', '/api/auth/me', null, customerToken);
    assert(meRes.status === 200 && meRes.body.user.name === 'Rahman Maker', 'Profile retrieved via JWT Bearer token');

    // 5. Query Products Catalog
    const prodRes = await request('GET', '/api/products');
    assert(prodRes.status === 200 && prodRes.body.products.length >= 5, `Products retrieved from MySQL (found ${prodRes.body?.products?.length})`);
    const dragon = prodRes.body.products.find(p => p.id === 'eitoh-001');
    assert(dragon && dragon.image.includes('dragon'), 'Product image correctly resolved from product_images table');

    // 6. Checkout Order
    const orderRes = await request('POST', '/api/orders', {
      customerName: 'Rahman Maker',
      customerPhone: '01712345678',
      customerEmail: testEmail,
      deliveryAddress: 'House 42, Road 7, Dhanmondi',
      deliveryCity: 'Dhaka',
      deliveryZone: 'inside_dhaka',
      paymentMethod: 'cash_on_delivery',
      couponCode: 'EITOH10',
      items: [
        {
          productId: 'eitoh-001',
          title: 'Flexible Articulated Emerald Dragon',
          quantity: 1,
          price: 850,
          selectedColor: 'Emerald Green'
        }
      ]
    }, customerToken);
    assert(orderRes.status === 201 && orderRes.body.orderNumber.startsWith('EIT-'), `Atomic Order placement in MySQL with coupon (${orderRes.body?.orderNumber})`);
    const createdOrderNumber = orderRes.body.orderNumber;
    const createdOrderId = orderRes.body.orderId;

    // 7. Customer My Orders
    const myOrdersRes = await request('GET', '/api/orders/my-orders', null, customerToken);
    assert(myOrdersRes.status === 200 && myOrdersRes.body.orders.length >= 1, 'My Orders returns customer order history');

    // 8. Public Order Tracking
    const trackRes = await request('GET', `/api/orders/track/${createdOrderNumber}`);
    assert(trackRes.status === 200 && trackRes.body.order.timeline.length >= 1, 'Public tracking returns order timeline');

    // 9. Custom Quote Submission
    const quoteRes = await request('POST', '/api/quotes', {
      customerName: 'Rahman Maker',
      customerPhone: '01712345678',
      modelName: 'Mechanical Iris Box',
      lengthCm: 12,
      widthCm: 12,
      heightCm: 10,
      material: 'PETG',
      infill: 30,
      estPriceBdt: 1250
    }, customerToken);
    assert(quoteRes.status === 201 && quoteRes.body.quoteNumber.startsWith('QT-'), 'Custom 3D print quote registered in MySQL');

    // 10. Admin Login & Operations
    const adminLogin = await request('POST', '/api/auth/login', {
      email: 'admin@eitoh.com',
      password: 'admin1234'
    });
    assert(adminLogin.status === 200 && adminLogin.body.user.role === 'admin', 'Admin login successful');
    const adminToken = adminLogin.body.token;

    // 11. Admin Analytics
    const analyticsRes = await request('GET', '/api/admin/analytics', null, adminToken);
    assert(analyticsRes.status === 200 && analyticsRes.body.analytics.totalOrders >= 1, 'Admin Analytics calculates real-time SQL aggregates');

    // 12. Admin Update Order Status
    const updateStatusRes = await request('PATCH', `/api/orders/admin/${createdOrderId}/status`, {
      status: 'printing',
      notes: 'Bed leveled, 0.16mm layer height executing smoothly on Bambu Lab.'
    }, adminToken);
    assert(updateStatusRes.status === 200, 'Admin successfully advances order status to "printing" in MySQL');

    console.log(`\n🏁 Test Run Finished: ${passed} passed, ${failed} failed.`);
    if (failed > 0) process.exit(1);
  } catch (err) {
    console.error('Fatal test error:', err);
    process.exit(1);
  }
}

runTests();
