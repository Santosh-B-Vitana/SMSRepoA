const http = require('http');

function apiCall(method, path, token, body, cb) {
  const opts = {
    hostname: 'localhost', port: 5092, path, method,
    headers: { Authorization: token ? 'Bearer ' + token : undefined, 'Content-Type': 'application/json' }
  };
  if (!token) delete opts.headers.Authorization;
  const req = http.request(opts, res => {
    let d = '';
    res.on('data', c => d += c);
    res.on('end', () => {
      try { cb(res.statusCode, JSON.parse(d)); }
      catch (e) { cb(res.statusCode, { raw: d.substring(0, 200) }); }
    });
  });
  if (body) req.write(JSON.stringify(body));
  req.end();
}

const loginBody = { username: 'parent@demo.edu', password: 'ParentDemo2026!' };
apiCall('POST', '/api/auth/login', null, loginBody, (code, resp) => {
  if (code !== 200) { console.error('Login failed:', code, resp); process.exit(1); }
  const token = resp.data.token;
  const sid = 'c0a80101-0000-4000-8000-000000000001';

  const paths = [
    `/api/fees/records?studentId=${sid}&page=1&pageSize=5`,
    `/api/grades/my-child-grades?studentId=${sid}`,
    `/api/attendance/records?studentId=${sid}&page=1&pageSize=5`,
    `/api/examinations/results?studentId=${sid}&page=1&pageSize=5`,
    `/api/transport/student-assignments?studentId=${sid}`,
    `/api/hostel/student-allotments?studentId=${sid}`,
    `/api/notifications/my-notifications`,
    `/api/leave-management/student-leave/my-children`,
    `/api/students/my-children`,
  ];

  let done = 0;
  const results = {};
  paths.forEach(p => {
    apiCall('GET', p, token, null, (code, body) => {
      let count = '?';
      if (Array.isArray(body.data)) count = body.data.length;
      else if (body.data && Array.isArray(body.data.records)) count = body.data.records.length;
      else if (body.data && Array.isArray(body.data.items)) count = body.data.items.length;
      else if (body.data && typeof body.data === 'object') count = Object.keys(body.data).length + ' keys';
      results[p] = { code, count };
      if (++done === paths.length) {
        paths.forEach(p => console.log(results[p].code, p.padEnd(65), 'count:', results[p].count));
        process.exit(0);
      }
    });
  });
});
