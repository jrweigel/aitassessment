# Admin Password Configuration Guide

## Overview
The admin panel is now secured with password authentication to protect sensitive employee data (manager names, detailed team information).

## Local Development Setup

1. **Password is pre-configured** in `api/local.settings.json`:
   ```
   ADMIN_PASSWORD=admin2026!
   ```

2. **Start the application**:
   ```bash
   cd api
   npm install
   func start
   ```

3. **Access admin panel**:
   - Navigate to `/admin/`
   - Enter password: `admin2026!`
   - Session lasts 30 minutes with auto-logout

## Azure Production Setup

### Step 1: Configure Admin Password in Azure
1. Go to Azure Portal → Static Web Apps → Your App
2. Navigate to **Configuration** → **Application settings**  
3. Add new application setting:
   - **Name**: `ADMIN_PASSWORD`
   - **Value**: `your-secure-password-here`
4. Click **Save**

### Step 2: Deploy the Application
Deploy normally using your existing CI/CD pipeline. The authentication will be active once the environment variable is set.

### Step 3: Test Authentication
1. Visit `/admin/` URL
2. Enter the password you configured in Step 1
3. Verify you can access admin features with valid session

## Security Features Implemented

### ✅ Password Protection
- Admin panel requires password authentication
- Password stored securely in Azure environment variables
- No hardcoded passwords in source code

### ✅ Session Management  
- 30-minute session timeout
- Automatic logout when inactive
- Visual session timer in admin interface
- Secure session token validation

### ✅ API Security
- Admin API endpoints require valid session tokens
- Session tokens validated on server-side
- Admin data requests return 401 without authentication

### ✅ UI Security
- Login overlay blocks access to admin content
- Session status bar shows authentication state
- Manual logout functionality
- Automatic session expiry warnings

### ✅ Enhanced Security Headers
- Added security headers in `staticwebapp.config.json`:
  - `X-Content-Type-Options: nosniff`
  - `X-Frame-Options: DENY` 
  - `X-XSS-Protection: 1; mode=block`

## Password Security Best Practices

### For Development
- Use the provided default: `admin2026!`
- Do not commit password changes to source control

### For Production
- Use a strong, unique password (12+ characters)
- Include uppercase, lowercase, numbers, and symbols
- Do not share the password in emails or documents
- Change password if potentially compromised
- Consider using Azure Key Vault for enterprise environments

## API Endpoints

### Public (No Authentication)
- `GET /api/get-assessments` - Returns anonymized data
- `GET /api/health-check` - System health status

### Protected (Requires Authentication)
- `POST /api/verify-password` - Password verification
- `GET /api/get-assessments?admin=true` - Returns full admin data with PII
- `DELETE /api/delete-assessment` - Delete assessment records

## Troubleshooting

### "Admin authentication not configured"
- Ensure `ADMIN_PASSWORD` environment variable is set in Azure
- Check Application Settings in Azure Portal
- Verify deployment completed successfully

### "Session expired" 
- Normal behavior after 30 minutes of inactivity
- Click logout and log back in with password
- Check system clock is correct

### "Invalid password"
- Verify password matches Azure configuration exactly
- Check for typos, spaces, or case sensitivity
- Confirm `ADMIN_PASSWORD` contains correct value

### API returning 401 errors
- Clear browser cache and cookies
- Log out and log back in
- Check browser console for session token issues

## Compliance Notes

This implementation provides basic password protection suitable for internal tools. For applications handling sensitive data in regulated environments, consider:

- Multi-factor authentication (Azure AD integration)
- Role-based access controls 
- Audit logging
- Password rotation policies
- Regular security assessments