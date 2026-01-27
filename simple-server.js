const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = 8080;

const mimeTypes = {
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'application/javascript',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.gif': 'image/gif',
    '.ico': 'image/x-icon'
};

const server = http.createServer((req, res) => {
    const parsedUrl = url.parse(req.url);
    let pathname = path.join(__dirname, parsedUrl.pathname);
    
    // Default to index.html for root path
    if (parsedUrl.pathname === '/') {
        pathname = path.join(__dirname, 'index.html');
    }
    // Handle directory requests by looking for index.html
    else if (parsedUrl.pathname.endsWith('/')) {
        pathname = path.join(__dirname, parsedUrl.pathname, 'index.html');
    }
    
    const ext = path.extname(pathname);
    const mimeType = mimeTypes[ext] || 'text/plain';
    
    fs.readFile(pathname, (err, data) => {
        if (err) {
            // If it's a directory without index.html, try to read the directory as a file
            if (err.code === 'ENOENT' && !ext) {
                // Try appending index.html if no extension
                const indexPath = path.join(pathname, 'index.html');
                fs.readFile(indexPath, (indexErr, indexData) => {
                    if (indexErr) {
                        res.writeHead(404);
                        res.end('File not found');
                        return;
                    }
                    res.writeHead(200, { 'Content-Type': 'text/html' });
                    res.end(indexData);
                });
                return;
            }
            res.writeHead(404);
            res.end('File not found');
            return;
        }
        
        res.writeHead(200, { 'Content-Type': mimeType });
        res.end(data);
    });
});

server.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}/`);
    console.log('Available pages:');
    console.log(`  Home: http://localhost:${PORT}/`);
    console.log(`  Dashboard: http://localhost:${PORT}/dashboard.html`);
    console.log(`  Test Admin: http://localhost:${PORT}/test-admin.html`);
    console.log(`  Data Helper: http://localhost:${PORT}/data-helper.html`);
    console.log(`  Admin Panel: http://localhost:${PORT}/admin/`);
    console.log('\nPress Ctrl+C to stop the server');
});