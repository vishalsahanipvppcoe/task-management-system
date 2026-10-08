const http = require('http');
const app = require('../src/app');
const { pool } = require('../src/config/database');

const PORT = 5055; // Use dedicated testing port to prevent port collisions
let server;
const BASE_URL = `http://127.0.0.1:${PORT}/api`;

let passedCount = 0;
let failedCount = 0;

function assert(condition, testName, details = '') {
  if (condition) {
    console.log(`  ✓ PASS: ${testName}`);
    passedCount++;
  } else {
    console.error(`  ✗ FAIL: ${testName}${details ? ` -> ${details}` : ''}`);
    failedCount++;
  }
}

async function apiRequest(endpoint, { method = 'GET', body, token } = {}) {
  const headers = {};
  if (body) headers['Content-Type'] = 'application/json';
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${BASE_URL}${endpoint}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined
  });

  const data = await res.json().catch(() => ({}));
  return { status: res.status, data };
}

async function runTests() {
  console.log('\n==================================================');
  console.log('STARTING AUTOMATED API VERIFICATION SUITE');
  console.log('==================================================\n');

  server = http.createServer(app);
  await new Promise((resolve) => server.listen(PORT, '127.0.0.1', resolve));
  console.log(`Test server running at http://127.0.0.1:${PORT}\n`);

  try {
    // 1. Health check
    console.log('[Suite 1: Health Check]');
    const health = await apiRequest('/health');
    assert(health.status === 200, 'Health endpoint returns 200');
    assert(health.data.success === true, 'Health response success is true');
    assert(health.data.message === 'Task Management API is running', 'Health message matches');

    // 2. Authentication: User A & Admin login with seeded credentials
    console.log('\n[Suite 2: Authentication & Seeder Verification]');
    const adminLogin = await apiRequest('/auth/login', {
      method: 'POST',
      body: { email: 'admin@example.com', password: 'Admin@123' }
    });
    assert(adminLogin.status === 200, 'Admin login returns 200');
    assert(adminLogin.data.success === true, 'Admin login success is true');
    assert(adminLogin.data.data.user.role === 'admin', 'Admin user role is admin');
    assert(typeof adminLogin.data.data.token === 'string', 'Admin JWT token generated');
    const adminToken = adminLogin.data.data.token;

    const userALogin = await apiRequest('/auth/login', {
      method: 'POST',
      body: { email: 'user@example.com', password: 'User@123' }
    });
    assert(userALogin.status === 200, 'User A login returns 200');
    assert(userALogin.data.success === true, 'User A login success is true');
    assert(userALogin.data.data.user.role === 'user', 'User A role is user');
    const userAToken = userALogin.data.data.token;
    const userAId = userALogin.data.data.user.id;

    // 3. Auth Failure Cases
    console.log('\n[Suite 3: Authentication Edge Cases & Security]');
    const invalidLogin = await apiRequest('/auth/login', {
      method: 'POST',
      body: { email: 'user@example.com', password: 'WrongPassword' }
    });
    assert(invalidLogin.status === 401, 'Invalid password returns 401 Unauthorized');
    assert(invalidLogin.data.success === false, 'Invalid login success is false');

    const nonExistentLogin = await apiRequest('/auth/login', {
      method: 'POST',
      body: { email: 'nonexistent@example.com', password: 'Password123' }
    });
    assert(nonExistentLogin.status === 401, 'Non-existent email returns 401 Unauthorized');

    // Duplicate registration failure
    const duplicateReg = await apiRequest('/auth/register', {
      method: 'POST',
      body: { name: 'Test Duplicate', email: 'user@example.com', password: 'Password123' }
    });
    assert(duplicateReg.status === 409, 'Duplicate registration returns 409 Conflict');

    // Registration validation failure
    const invalidReg = await apiRequest('/auth/register', {
      method: 'POST',
      body: { name: '', email: 'invalid-email', password: '123' }
    });
    assert(invalidReg.status === 400, 'Invalid registration payload returns 400 Bad Request');
    assert(Array.isArray(invalidReg.data.errors), 'Validation errors array returned');

    // Dynamic registration of User B for multi-user isolation tests
    const userBEmail = `userb_${Date.now()}@example.com`;
    const userBReg = await apiRequest('/auth/register', {
      method: 'POST',
      body: { name: 'User B', email: userBEmail, password: 'Password123' }
    });
    assert(userBReg.status === 201, 'User B registration returns 201 Created');
    assert(userBReg.data.data.password === undefined, 'Password hash is NOT exposed in response');

    const userBLogin = await apiRequest('/auth/login', {
      method: 'POST',
      body: { email: userBEmail, password: 'Password123' }
    });
    assert(userBLogin.status === 200, 'User B login returns 200');
    const userBToken = userBLogin.data.data.token;

    // 4. Token validation middleware checks
    console.log('\n[Suite 4: Auth Middleware Enforcement]');
    const noTokenReq = await apiRequest('/tasks');
    assert(noTokenReq.status === 401, 'Request without JWT returns 401');

    const invalidTokenReq = await apiRequest('/tasks', { token: 'invalid.token.payload' });
    assert(invalidTokenReq.status === 401, 'Request with invalid JWT returns 401');

    // 5. Task Creation & Tamper Protection
    console.log('\n[Suite 5: Task Creation & Ownership Binding]');
    const taskACreation = await apiRequest('/tasks', {
      method: 'POST',
      token: userAToken,
      body: {
        title: 'Task Alpha by User A',
        description: 'First test task for User A'
      }
    });
    assert(taskACreation.status === 201, 'Task created successfully with 201');
    assert(taskACreation.data.data.user_id === userAId, 'Task user_id automatically bound to User A');
    assert(taskACreation.data.data.status === 'Pending', 'Default status is Pending');
    const taskAId = taskACreation.data.data.id;

    // Verify client cannot tamper with user_id
    const tamperTask = await apiRequest('/tasks', {
      method: 'POST',
      token: userAToken,
      body: {
        title: 'Tamper Attempt',
        description: 'Trying to inject arbitrary user_id',
        user_id: 9999
      }
    });
    assert(tamperTask.status === 400, 'Injecting arbitrary user_id rejected with 400 Bad Request');

    // Create a task as User B
    const taskBCreation = await apiRequest('/tasks', {
      method: 'POST',
      token: userBToken,
      body: {
        title: 'Task Beta by User B',
        description: 'Task belonging exclusively to User B'
      }
    });
    assert(taskBCreation.status === 201, 'User B task created successfully');
    const taskBId = taskBCreation.data.data.id;

    // 6. Task Listing (User vs Admin)
    console.log('\n[Suite 6: Task Retrieval & Role-Based Scope]');
    const userATasks = await apiRequest('/tasks', { token: userAToken });
    assert(userATasks.status === 200, 'User A task list returns 200');
    assert(
      userATasks.data.data.every((t) => t.user_id === userAId),
      'User A only receives their own tasks'
    );
    assert(
      userATasks.data.data.some((t) => t.id === taskAId),
      'User A task list contains Task Alpha'
    );
    assert(
      !userATasks.data.data.some((t) => t.id === taskBId),
      'User A task list DOES NOT contain User B task'
    );

    const adminTasks = await apiRequest('/tasks', { token: adminToken });
    assert(adminTasks.status === 200, 'Admin task list returns 200');
    assert(
      adminTasks.data.data.some((t) => t.id === taskAId) &&
      adminTasks.data.data.some((t) => t.id === taskBId),
      'Admin receives all tasks across all users'
    );

    // 7. Single Task Retrieval & Cross-User Protection
    console.log('\n[Suite 7: Single Task Access & Cross-User Security]');
    const userAViewOwn = await apiRequest(`/tasks/${taskAId}`, { token: userAToken });
    assert(userAViewOwn.status === 200, 'User A can view own task (200)');
    assert(userAViewOwn.data.data.id === taskAId, 'Returned task matches requested ID');

    // Cross-user access attempt: User A tries to view User B's task -> 403
    const userAViewUserBTask = await apiRequest(`/tasks/${taskBId}`, { token: userAToken });
    assert(userAViewUserBTask.status === 403, 'User A viewing User B task returns 403 Forbidden');
    assert(userAViewUserBTask.data.success === false, 'Cross-user view success is false');

    // Admin view any task
    const adminViewTaskA = await apiRequest(`/tasks/${taskAId}`, { token: adminToken });
    assert(adminViewTaskA.status === 200, 'Admin can view User A task (200)');

    const adminViewTaskB = await apiRequest(`/tasks/${taskBId}`, { token: adminToken });
    assert(adminViewTaskB.status === 200, 'Admin can view User B task (200)');

    // Missing task returns 404
    const nonExistentTask = await apiRequest('/tasks/999999', { token: userAToken });
    assert(nonExistentTask.status === 404, 'Non-existent task returns 404 Not Found');

    // 8. Task Update & Ownership Check
    console.log('\n[Suite 8: Task Modification & Ownership]');
    const userAUpdateOwn = await apiRequest(`/tasks/${taskAId}`, {
      method: 'PUT',
      token: userAToken,
      body: {
        title: 'Task Alpha by User A (Updated)',
        description: 'Updated description'
      }
    });
    assert(userAUpdateOwn.status === 200, 'User A can update own task (200)');
    assert(userAUpdateOwn.data.data.title === 'Task Alpha by User A (Updated)', 'Title updated in response');

    // Cross-user update attempt: User A tries to edit User B's task -> 403
    const userAUpdateUserBTask = await apiRequest(`/tasks/${taskBId}`, {
      method: 'PUT',
      token: userAToken,
      body: {
        title: 'Hacked Title',
        description: 'Attempting unauthorized overwrite'
      }
    });
    assert(userAUpdateUserBTask.status === 403, 'User A updating User B task returns 403 Forbidden');

    // Admin can update any task
    const adminUpdateUserBTask = await apiRequest(`/tasks/${taskBId}`, {
      method: 'PUT',
      token: adminToken,
      body: {
        title: 'Task Beta by User B (Admin edited)',
        description: 'Edited by administrator'
      }
    });
    assert(adminUpdateUserBTask.status === 200, 'Admin can edit any user task (200)');

    // 9. Status Update Endpoint (Role-Based Restriction)
    console.log('\n[Suite 9: Status Update Authorization (Admin Only)]');
    // Regular user attempts to update status -> 403 Forbidden
    const userAUpdateStatus = await apiRequest(`/tasks/${taskAId}/status`, {
      method: 'PATCH',
      token: userAToken,
      body: { status: 'Completed' }
    });
    assert(userAUpdateStatus.status === 403, 'Regular user updating status returns 403 Forbidden');

    // Admin updates status -> 200 OK
    const adminUpdateStatus = await apiRequest(`/tasks/${taskAId}/status`, {
      method: 'PATCH',
      token: adminToken,
      body: { status: 'Completed' }
    });
    assert(adminUpdateStatus.status === 200, 'Admin updating status returns 200 OK');
    assert(adminUpdateStatus.data.data.status === 'Completed', 'Task status successfully transitioned to Completed');

    // Invalid status transition -> 400 Bad Request
    const invalidStatus = await apiRequest(`/tasks/${taskAId}/status`, {
      method: 'PATCH',
      token: adminToken,
      body: { status: 'Archived' }
    });
    assert(invalidStatus.status === 400, 'Invalid status value returns 400 Bad Request');

    // Admin updating non-existent task status -> 404 Not Found
    const notFoundStatus = await apiRequest('/tasks/999999/status', {
      method: 'PATCH',
      token: adminToken,
      body: { status: 'In Progress' }
    });
    assert(notFoundStatus.status === 404, 'Status update for non-existent task returns 404 Not Found');

    console.log('\n==================================================');
    console.log(`TEST SUMMARY: ${passedCount} PASSED, ${failedCount} FAILED`);
    console.log('==================================================\n');

    if (failedCount > 0) {
      process.exitCode = 1;
    }
  } catch (err) {
    console.error('Unexpected error while running test suite:', err);
    process.exitCode = 1;
  } finally {
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
    await pool.end();
  }
}

runTests();
