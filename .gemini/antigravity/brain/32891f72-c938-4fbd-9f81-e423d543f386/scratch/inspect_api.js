async function run() {
  const loginRes = await fetch('http://localhost:5000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'customer@delivery.com', password: 'password123' })
  }).then(r => r.json());

  console.log('Login Result:', loginRes);

  if (!loginRes.success) {
    console.error('Login failed');
    return;
  }

  const token = loginRes.token;

  const productsRes = await fetch('http://localhost:5000/api/customer/businesses/6a550032d170d54710f58bae/products?category=All', {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  }).then(r => r.json());

  console.log('Products API Result:', JSON.stringify(productsRes, null, 2));
}

run();
