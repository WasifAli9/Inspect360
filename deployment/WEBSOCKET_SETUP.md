# WebSocket Configuration Guide for Reverse Proxy

This guide explains how to configure WebSocket support for Inspect360 when using a reverse proxy.

## Overview

Inspect360 uses WebSocket connections on the `/ws` endpoint for real-time notifications. When using a reverse proxy (nginx, IIS/ARR, Apache, etc.), you must configure it to properly handle WebSocket upgrade requests.

## Nginx Configuration

### Complete Configuration

See `deployment/nginx.conf` for a complete production-ready configuration.

### Key Requirements

1. **WebSocket Upgrade Headers**: Must forward `Upgrade` and `Connection` headers
2. **Long Timeouts**: WebSocket connections are long-lived
3. **No Buffering**: Disable buffering for WebSocket connections
4. **HTTP/1.1**: Use HTTP/1.1 protocol (not HTTP/1.0)

### Minimal Configuration

```nginx
# Map for WebSocket connection upgrade (must be in http block, outside server block)
map $http_upgrade $connection_upgrade {
    default upgrade;
    '' close;
}

server {
    listen 443 ssl http2;
    server_name portal.inspect360.ai;

    # WebSocket endpoint - CRITICAL
    location /ws {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        
        # WebSocket upgrade headers
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        
        # Standard proxy headers
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # WebSocket specific settings
        proxy_read_timeout 86400s;  # 24 hours
        proxy_send_timeout 86400s;  # 24 hours
        proxy_buffering off;
        proxy_cache off;
    }

    # All other routes
    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Support WebSocket upgrade on all routes (fallback)
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection $connection_upgrade;
    }
}
```

### Installation Steps

1. Copy the configuration to your nginx sites:
   ```bash
   sudo cp deployment/nginx.conf /etc/nginx/sites-available/inspect360
   ```

2. Update the configuration:
   - Replace `portal.inspect360.ai` with your domain
   - Update SSL certificate paths
   - Update backend port if different from 5000

3. Create symlink:
   ```bash
   sudo ln -s /etc/nginx/sites-available/inspect360 /etc/nginx/sites-enabled/
   ```

4. Test configuration:
   ```bash
   sudo nginx -t
   ```

5. Reload nginx:
   ```bash
   sudo systemctl reload nginx
   ```

## IIS / Application Request Routing (ARR)

### Using IIS as Reverse Proxy

If you're using IIS with ARR (Application Request Routing) as a reverse proxy:

1. **Enable WebSocket Protocol in ARR**:
   - Open IIS Manager
   - Select your server → Application Request Routing Cache
   - Click "Server Proxy Settings"
   - Enable "WebSocket Protocol"

2. **Configure URL Rewrite**:
   The `web.config` file already includes WebSocket rewrite rules. Ensure:
   - URL Rewrite module is installed
   - ARR is enabled
   - The WebSocket rule comes before other rules

3. **Verify Configuration**:
   ```xml
   <!-- In web.config, ensure this rule exists: -->
   <rule name="WebSocket" stopProcessing="true">
     <match url="^ws(.*)" />
     <action type="Rewrite" url="http://localhost:5000/{R:0}" />
   </rule>
   ```

### Using IIS with iisnode

If using `iisnode` (not ARR), the `web.config` file already includes WebSocket support. Ensure:
- iisnode is installed and configured
- The WebSocket rewrite rule is present
- Node.js application is running on the specified port

## Apache Configuration

### Using mod_proxy_wstunnel

```apache
# Enable required modules
LoadModule proxy_module modules/mod_proxy.so
LoadModule proxy_http_module modules/mod_http.so
LoadModule proxy_wstunnel_module modules/mod_proxy_wstunnel.so

<VirtualHost *:443>
    ServerName portal.inspect360.ai
    
    # WebSocket endpoint
    ProxyPass /ws ws://localhost:5000/ws
    ProxyPassReverse /ws ws://localhost:5000/ws
    
    # All other routes
    ProxyPass / http://localhost:5000/
    ProxyPassReverse / http://localhost:5000/
    
    # Standard proxy headers
    ProxyPreserveHost On
    RequestHeader set X-Forwarded-Proto "https"
    RequestHeader set X-Forwarded-Port "443"
</VirtualHost>
```

## Cloudflare / CDN Configuration

If using Cloudflare or another CDN:

1. **Enable WebSocket in Cloudflare**:
   - Go to Cloudflare Dashboard → Network
   - Enable "WebSockets"

2. **SSL/TLS Mode**:
   - Use "Full" or "Full (strict)" mode
   - Do not use "Flexible" mode for WebSocket connections

3. **Page Rules** (if needed):
   - Create a rule for `portal.inspect360.ai/ws`
   - Set "Cache Level" to "Bypass"
   - Set "WebSockets" to "On"

## Testing WebSocket Connection

### Browser Console

Open browser developer tools and check for WebSocket connection:

```javascript
// Should see successful connection
WebSocket connection to 'wss://portal.inspect360.ai/ws' established
```

### Server Logs

Check your Node.js server logs for:
```
[WebSocket] Server initialized on /ws
[WebSocket] User <userId> connected. Total connections: 1
```

### Using wscat (Command Line)

```bash
# Install wscat
npm install -g wscat

# Test WebSocket connection (with authentication cookies)
wscat -c wss://portal.inspect360.ai/ws --header "Cookie: your-session-cookie"
```

## Troubleshooting

### Connection Fails Immediately

**Symptoms**: WebSocket connection fails with 400/403/502 errors

**Solutions**:
1. Verify reverse proxy is forwarding `Upgrade` and `Connection` headers
2. Check that backend server is running on the correct port
3. Verify SSL certificate is valid (for wss://)
4. Check firewall rules allow WebSocket connections

### Connection Drops After a Few Seconds

**Symptoms**: WebSocket connects but disconnects quickly

**Solutions**:
1. Increase proxy timeouts (see nginx configuration above)
2. Disable proxy buffering for `/ws` endpoint
3. Check for load balancer idle timeouts
4. Verify keepalive/ping mechanism is working

### Authentication Errors

**Symptoms**: WebSocket connection closes with code 1008

**Solutions**:
1. Verify session cookies are being forwarded
2. Check that `X-Forwarded-*` headers are set correctly
3. Ensure session middleware is processing requests correctly
4. Verify CORS settings if applicable

### 502 Bad Gateway

**Symptoms**: WebSocket connection returns 502 error

**Solutions**:
1. Verify backend server is running
2. Check backend server logs for errors
3. Verify proxy_pass URL is correct
4. Check backend server can accept WebSocket connections

## Verification Checklist

- [ ] Reverse proxy forwards `Upgrade: websocket` header
- [ ] Reverse proxy forwards `Connection: upgrade` header
- [ ] Reverse proxy uses HTTP/1.1 (not HTTP/1.0)
- [ ] WebSocket timeouts are set to at least 24 hours
- [ ] Proxy buffering is disabled for `/ws` endpoint
- [ ] SSL certificate is valid (for wss://)
- [ ] Backend server is accessible on configured port
- [ ] Session cookies are being forwarded
- [ ] Server logs show WebSocket connections

## Additional Resources

- [Nginx WebSocket Proxying](http://nginx.org/en/docs/http/websocket.html)
- [IIS ARR WebSocket Support](https://docs.microsoft.com/en-us/iis/extensions/configuring-application-request-routing-arr/websocket-protocol-support)
- [Apache mod_proxy_wstunnel](https://httpd.apache.org/docs/2.4/mod/mod_proxy_wstunnel.html)

