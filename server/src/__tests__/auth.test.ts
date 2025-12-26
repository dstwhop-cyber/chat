import request from 'supertest';
import { app } from '../app';
import { PrismaClient } from '@prisma/client';
import { createServer, Server } from 'http';

describe('Authentication API', () => {
  let server: Server;
  const prisma = new PrismaClient();
  
  // Test user data
  const testUser = {
    email: 'test@example.com',
    password: 'Test123!',
    name: 'Test User'
  };

  beforeAll(async () => {
    server = createServer(app);
    await prisma.$connect();
    // Clear test data
    await prisma.refreshToken.deleteMany({});
    await prisma.user.deleteMany({});
  });

  afterAll(async () => {
    await prisma.$disconnect();
    server.close();
  });

  describe('POST /api/auth/register', () => {
    it('should register a new user', async () => {
      const res = await request(server)
        .post('/api/auth/register')
        .send(testUser);

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('accessToken');
      expect(res.body.user).toHaveProperty('id');
      expect(res.body.user.email).toBe(testUser.email);
    });

    it('should not register with existing email', async () => {
      const res = await request(server)
        .post('/api/auth/register')
        .send(testUser);

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('already exists');
    });
  });

  describe('POST /api/auth/login', () => {
    it('should login with valid credentials', async () => {
      const res = await request(server)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password
        });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('accessToken');
      expect(res.body.user).toHaveProperty('id');
      expect(res.headers['set-cookie']).toBeDefined();
    });

    it('should not login with invalid password', async () => {
      const res = await request(server)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: 'wrongpassword'
        });

      expect(res.status).toBe(401);
      expect(res.body.message).toContain('Invalid credentials');
    });
  });

  describe('POST /api/auth/refresh-token', () => {
    let refreshToken: string;
    
    beforeAll(async () => {
      // Login to get a refresh token
      const res = await request(server)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password
        });
      
      refreshToken = res.headers['set-cookie'][0].split(';')[0].split('=')[1];
    });

    it('should refresh access token with valid refresh token', async () => {
      const res = await request(server)
        .post('/api/auth/refresh-token')
        .set('Cookie', [`refreshToken=${refreshToken}`]);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('accessToken');
    });
  });

  describe('POST /api/auth/logout', () => {
    it('should logout user and clear refresh token', async () => {
      // First login
      const loginRes = await request(server)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password
        });
      
      const cookies = loginRes.headers['set-cookie'];
      
      // Then logout
      const res = await request(server)
        .post('/api/auth/logout')
        .set('Cookie', cookies);
      
      expect(res.status).toBe(204);
      
      // Verify refresh token is invalidated
      const tokenCheck = await request(server)
        .post('/api/auth/refresh-token')
        .set('Cookie', cookies);
      
      expect(tokenCheck.status).toBe(401);
    });
  });

  describe('GET /api/auth/me', () => {
    let accessToken: string;
    
    beforeAll(async () => {
      // Login to get a token
      const res = await request(server)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password
        });
      
      accessToken = res.body.accessToken;
    });

    it('should get current user with valid token', async () => {
      const res = await request(server)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${accessToken}`);
      
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('id');
      expect(res.body.email).toBe(testUser.email);
    });

    it('should return 401 without valid token', async () => {
      const res = await request(server)
        .get('/api/auth/me');
      
      expect(res.status).toBe(401);
    });
  });

  describe('POST /api/auth/guest', () => {
    it('should create a guest user', async () => {
      const res = await request(server)
        .post('/api/auth/guest');
      
      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('accessToken');
      expect(res.body.user).toHaveProperty('id');
      expect(res.body.user.isGuest).toBe(true);
    });
  });
});
