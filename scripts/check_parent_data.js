const http = require('http');

function apiCall(method, path, token, body, cb) {
  const opts = {
    hostname: 'localhost', port: 5092, path, method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: 'Bearer ' + token } : {})
    }
  };
  const req = http.request(opts, res => {
    let d = '';
    res.on('data', c => d += c);
    res.on('end', () => {
      try { cb(res.statusCode, JSON.parse(d)); }
      catch (e) { cb(res.statusCode, { raw: d.substring(0, 400) }); }
    });
  });
  if (body) req.write(JSON.stringify(body));
  req.end();
}

// Get admin token
apiCall('POST', '/api/auth/login', null, { username: 'admin@vitanaschools.edu', password: 'admin-dev-change-me' }, (code, resp) => {
  const adminToken = resp.data.token;
  const sid1 = 'c0a80101-0000-4000-8000-000000000001'; // Riya Gupta
  const sid2 = '67e1d74f-5eab-42a8-918b-bf30c64111c3'; // Rohan Gupta

  let done = 0;
  [sid1, sid2].forEach(sid => {
    apiCall('GET', `/api/students/${sid}/profile-summary`, adminToken, null, (code2, body2) => {
      const d = body2.data || {};
      console.log(`\nStudent ${sid}:`);
      console.log('  transport:', JSON.stringify(d.transport));
      console.log('  hostel:', JSON.stringify(d.hostel));
      console.log('  fee:', JSON.stringify(d.fee));
      console.log('  attendance:', JSON.stringify(d.attendance));
      if (++done === 2) process.exit(0);
    });
  });
});
