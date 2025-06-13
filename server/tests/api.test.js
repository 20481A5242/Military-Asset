const request = require('supertest');
const app = require('../src/index');

describe('API Health Check', () => {
  test('GET /health should return 200', async () => {
    const response = await request(app)
      .get('/health')
      .expect(200);
    
    expect(response.body.status).toBe('OK');
    expect(response.body.environment).toBeDefined();
  });
});

describe('Authentication API', () => {
  test('POST /api/auth/login should require email and password', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({})
      .expect(400);
    
    expect(response.body.success).toBe(false);
    expect(response.body.error).toBeDefined();
  });

  test('POST /api/auth/login with invalid credentials should return 401', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'invalid@test.com',
        password: 'wrongpassword'
      })
      .expect(401);
    
    expect(response.body.success).toBe(false);
  });
});

describe('Protected Routes', () => {
  test('GET /api/assets without token should return 401', async () => {
    const response = await request(app)
      .get('/api/assets')
      .expect(401);
    
    expect(response.body.success).toBe(false);
  });

  test('GET /api/purchases without token should return 401', async () => {
    const response = await request(app)
      .get('/api/purchases')
      .expect(401);
    
    expect(response.body.success).toBe(false);
  });

  test('GET /api/transfers without token should return 401', async () => {
    const response = await request(app)
      .get('/api/transfers')
      .expect(401);
    
    expect(response.body.success).toBe(false);
  });
});
