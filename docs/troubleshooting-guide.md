# SFMC Development Suite - Troubleshooting Guide

## Table of Contents
1. [Installation Issues](#installation-issues)
2. [Authentication Problems](#authentication-problems)
3. [Code Generation Issues](#code-generation-issues)
4. [Debugging Tool Problems](#debugging-tool-problems)
5. [Cloud Pages Generator Issues](#cloud-pages-generator-issues)
6. [SFMC Integration Problems](#sfmc-integration-problems)
7. [Performance Issues](#performance-issues)
8. [Error Messages](#error-messages)
9. [Browser Compatibility](#browser-compatibility)
10. [Getting Additional Help](#getting-additional-help)

## Installation Issues

### Node.js Version Compatibility

**Problem**: Application fails to start with Node.js version errors
```
Error: The engine "node" is incompatible with this module
```

**Solution**:
1. Check your Node.js version:
   ```bash
   node --version
   ```
2. Install Node.js 18.0 or higher:
   ```bash
   # Using nvm (recommended)
   nvm install 18
   nvm use 18
   
   # Or download from nodejs.org
   ```
3. Clear npm cache and reinstall:
   ```bash
   npm cache clean --force
   rm -rf node_modules package-lock.json
   npm install
   ```

### Port Already in Use

**Problem**: Cannot start server, port 3000 is already in use
```
Error: listen EADDRINUSE: address already in use :::3000
```

**Solution**:
1. Find and kill the process using port 3000:
   ```bash
   # macOS/Linux
   lsof -ti:3000 | xargs kill -9
   
   # Windows
   netstat -ano | findstr :3000
   taskkill /PID <PID> /F
   ```
2. Or change the port in your `.env` file:
   ```env
   PORT=3001
   ```

### Redis Connection Failed

**Problem**: Application cannot connect to Redis
```
Error: Redis connection failed: connect ECONNREFUSED 127.0.0.1:6379
```

**Solution**:
1. **Install and start Redis**:
   ```bash
   # macOS
   brew install redis
   brew services start redis
   
   # Windows (using Chocolatey)
   choco install redis-64
   redis-server
   
   # Linux
   sudo apt-get install redis-server
   sudo systemctl start redis-server
   ```

2. **Verify Redis is running**:
   ```bash
   redis-cli ping
   # Should return "PONG"
   ```

3. **Check Redis configuration in .env**:
   ```env
   REDIS_URL=redis://localhost:6379
   ```

### Environment Variables Not Loading

**Problem**: Application starts but features don't work due to missing environment variables

**Solution**:
1. **Verify .env file exists**:
   ```bash
   ls -la .env*
   ```

2. **Copy from example if missing**:
   ```bash
   cp .env.example .env.development
   ```

3. **Check file format** (no spaces around =):
   ```env
   # Correct
   SFMC_CLIENT_ID=your_client_id
   
   # Incorrect
   SFMC_CLIENT_ID = your_client_id
   ```

4. **Restart the application** after changes

## Authentication Problems

### SFMC OAuth Flow Fails

**Problem**: OAuth redirect fails or returns error
```
Error: invalid_client - Client authentication failed
```

**Solution**:
1. **Verify SFMC App Configuration**:
   - Client ID and Client Secret are correct
   - Redirect URI matches exactly: `http://localhost:3000/api/sfmc/callback`
   - App has required permissions enabled

2. **Check environment variables**:
   ```env
   SFMC_CLIENT_ID=your_actual_client_id
   SFMC_CLIENT_SECRET=your_actual_client_secret
   SFMC_SUBDOMAIN=your_sfmc_subdomain
   ```

3. **Clear browser cache and cookies**
4. **Try incognito/private browsing mode**

### Token Refresh Issues

**Problem**: Authentication expires frequently
```
Error: Access token expired and refresh failed
```

**Solution**:
1. **Check token storage**:
   - Verify Redis is running and accessible
   - Check Redis logs for errors

2. **Re-authenticate manually**:
   - Go to SFMC Integration section
   - Click "Disconnect" then "Connect to SFMC"
   - Complete OAuth flow again

3. **Verify SFMC app permissions**:
   - Ensure app has "Offline Access" permission
   - Check token expiration settings in SFMC

### JWT Secret Issues

**Problem**: Session management fails
```
Error: JsonWebTokenError: invalid signature
```

**Solution**:
1. **Generate a new JWT secret**:
   ```bash
   # Generate 32-character random string
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```

2. **Update .env file**:
   ```env
   JWT_SECRET=your_new_32_character_secret
   ```

3. **Restart the application**

## Code Generation Issues

### AI Service Connection Failed

**Problem**: Code generation requests fail
```
Error: Failed to connect to AI service
```

**Solution**:
1. **Check OpenAI API key**:
   ```env
   OPENAI_API_KEY=sk-your-actual-api-key
   ```

2. **Verify API key validity**:
   - Log into OpenAI dashboard
   - Check API key status and usage limits
   - Generate new key if necessary

3. **Check network connectivity**:
   - Ensure firewall allows outbound HTTPS connections
   - Test connection: `curl -I https://api.openai.com`

### Slow Code Generation

**Problem**: Code generation takes longer than expected (>10 seconds)

**Solution**:
1. **Check AI service status**:
   - Visit OpenAI status page
   - Monitor for service disruptions

2. **Optimize prompts**:
   - Be more specific in requests
   - Reduce complexity of generation tasks
   - Break large requests into smaller parts

3. **Check system resources**:
   - Monitor CPU and memory usage
   - Close unnecessary applications

### Generated Code Quality Issues

**Problem**: Generated code contains errors or doesn't meet requirements

**Solution**:
1. **Improve prompt specificity**:
   ```
   # Instead of: "Create a SQL query"
   # Use: "Create a SQL query to select active subscribers from Subscribers_DE where LastLogin is within 30 days"
   ```

2. **Provide context**:
   - Include Data Extension names and field types
   - Specify SFMC version and limitations
   - Mention performance requirements

3. **Use the debugging tool**:
   - Always run generated code through the debugger
   - Address any warnings or suggestions

## Debugging Tool Problems

### Analysis Takes Too Long

**Problem**: Code analysis doesn't complete or takes excessive time

**Solution**:
1. **Check code size**:
   - Maximum recommended file size: 10KB
   - Break large files into smaller chunks

2. **Simplify complex code**:
   - Remove unnecessary complexity
   - Focus on specific sections for analysis

3. **Restart the analysis service**:
   ```bash
   # If running locally
   npm run restart:analysis
   ```

### Incorrect Error Detection

**Problem**: Debugger reports false positives or misses actual errors

**Solution**:
1. **Update language validators**:
   - Ensure you're using the latest version
   - Check for validator updates

2. **Report false positives**:
   - Use the "Report Issue" button in the debugger
   - Provide code sample and expected behavior

3. **Manual verification**:
   - Cross-check with SFMC documentation
   - Test code in SFMC environment

### Performance Metrics Inaccurate

**Problem**: Performance estimates don't match actual execution times

**Solution**:
1. **Understand limitations**:
   - Metrics are estimates based on code analysis
   - Actual performance depends on data volume and SFMC load

2. **Use for relative comparison**:
   - Compare different code approaches
   - Focus on optimization suggestions rather than absolute times

3. **Test in SFMC environment**:
   - Always validate performance in actual SFMC instance
   - Use SFMC's built-in performance monitoring

## Cloud Pages Generator Issues

### Configuration Validation Errors

**Problem**: JSON/YAML configuration fails validation
```
Error: Invalid configuration - missing required field 'components'
```

**Solution**:
1. **Check JSON syntax**:
   - Use a JSON validator (jsonlint.com)
   - Ensure proper bracket and quote matching
   - Remove trailing commas

2. **Verify required fields**:
   ```json
   {
     "page": {
       "title": "Required field",
       "layout": "Required field"
     },
     "components": []  // Required array
   }
   ```

3. **Use YAML if JSON is problematic**:
   - YAML is more forgiving with syntax
   - Easier to read and edit

### Generated Pages Not Responsive

**Problem**: Generated pages don't display correctly on mobile devices

**Solution**:
1. **Check responsive setting**:
   ```json
   {
     "page": {
       "responsive": true  // Ensure this is set
     }
   }
   ```

2. **Verify viewport meta tag**:
   - Generated pages should include:
   ```html
   <meta name="viewport" content="width=device-width, initial-scale=1">
   ```

3. **Test across devices**:
   - Use browser developer tools
   - Test on actual mobile devices
   - Check different screen sizes

### AMPScript Integration Issues

**Problem**: Generated AMPScript doesn't work in SFMC

**Solution**:
1. **Check AMPScript syntax**:
   - Ensure proper delimiter usage: `%%[ ]%%`
   - Verify function names and parameters

2. **Test Data Extension references**:
   - Confirm DE names exist in SFMC
   - Verify field names match exactly
   - Check DE permissions

3. **Validate in SFMC**:
   - Test generated code in SFMC preview
   - Check for SFMC-specific limitations

## SFMC Integration Problems

### API Rate Limiting

**Problem**: SFMC API calls fail due to rate limits
```
Error: Rate limit exceeded - too many requests
```

**Solution**:
1. **Implement request throttling**:
   - Reduce frequency of API calls
   - Use batch operations where possible

2. **Check rate limit settings**:
   - Review SFMC app configuration
   - Monitor API usage in SFMC

3. **Optimize API usage**:
   - Cache frequently accessed data
   - Use webhooks instead of polling
   - Implement exponential backoff

### Data Extension Access Issues

**Problem**: Cannot access or query Data Extensions
```
Error: Access denied to Data Extension 'Subscribers_DE'
```

**Solution**:
1. **Check SFMC permissions**:
   - Verify app has Data Extension read/write permissions
   - Ensure user account has access to specific DEs

2. **Verify DE names**:
   - Check exact spelling and case sensitivity
   - Confirm DE exists in the correct folder

3. **Test with simple query**:
   ```sql
   SELECT TOP 1 * FROM YourDataExtension
   ```

### SOAP API Connection Issues

**Problem**: SOAP API calls fail or timeout

**Solution**:
1. **Check SOAP endpoint**:
   - Verify correct SFMC subdomain
   - Ensure SOAP API is enabled in SFMC app

2. **Authentication issues**:
   - Confirm OAuth token has SOAP permissions
   - Check token expiration

3. **Network connectivity**:
   - Test SOAP endpoint accessibility
   - Check firewall settings

## Performance Issues

### Slow Application Loading

**Problem**: Application takes long time to load or respond

**Solution**:
1. **Check system resources**:
   ```bash
   # Monitor CPU and memory usage
   top  # macOS/Linux
   taskmgr  # Windows
   ```

2. **Optimize Redis performance**:
   - Check Redis memory usage
   - Clear unnecessary cached data
   - Restart Redis if needed

3. **Database optimization**:
   - Check for slow queries
   - Optimize database indexes
   - Clear old session data

### Memory Leaks

**Problem**: Application memory usage increases over time

**Solution**:
1. **Monitor memory usage**:
   ```bash
   # Check Node.js memory usage
   node --inspect app.js
   # Open Chrome DevTools for memory profiling
   ```

2. **Restart application periodically**:
   - Implement automatic restart schedule
   - Monitor for memory usage patterns

3. **Update dependencies**:
   - Check for memory leak fixes in updates
   - Update Node.js to latest stable version

### High CPU Usage

**Problem**: Application consumes excessive CPU resources

**Solution**:
1. **Profile CPU usage**:
   - Use Node.js profiling tools
   - Identify CPU-intensive operations

2. **Optimize code analysis**:
   - Reduce frequency of real-time analysis
   - Implement debouncing for user input

3. **Scale horizontally**:
   - Use multiple application instances
   - Implement load balancing

## Error Messages

### Common Error Codes

#### ERR_SFMC_AUTH_001
**Message**: "SFMC authentication failed"
**Cause**: Invalid credentials or expired tokens
**Solution**: Re-authenticate with SFMC, verify credentials

#### ERR_AI_SERVICE_002
**Message**: "AI service unavailable"
**Cause**: OpenAI API issues or invalid API key
**Solution**: Check API key, verify OpenAI service status

#### ERR_REDIS_003
**Message**: "Redis connection lost"
**Cause**: Redis server not running or network issues
**Solution**: Restart Redis, check network connectivity

#### ERR_VALIDATION_004
**Message**: "Configuration validation failed"
**Cause**: Invalid JSON/YAML configuration
**Solution**: Validate configuration syntax, check required fields

#### ERR_DEPLOYMENT_005
**Message**: "Cloud page deployment failed"
**Cause**: SFMC API issues or insufficient permissions
**Solution**: Check SFMC connection, verify deployment permissions

### Debug Mode

Enable debug mode for detailed error information:

1. **Set environment variable**:
   ```env
   DEBUG=true
   LOG_LEVEL=debug
   ```

2. **Check application logs**:
   ```bash
   # View logs in real-time
   tail -f logs/application.log
   ```

3. **Browser console**:
   - Open browser developer tools
   - Check console for JavaScript errors
   - Monitor network requests

## Browser Compatibility

### Supported Browsers
- **Chrome**: Version 90+
- **Firefox**: Version 88+
- **Safari**: Version 14+
- **Edge**: Version 90+

### Common Browser Issues

#### JavaScript Disabled
**Problem**: Application doesn't load or function properly
**Solution**: Enable JavaScript in browser settings

#### Cookies Disabled
**Problem**: Authentication and session management fails
**Solution**: Enable cookies for the application domain

#### Local Storage Issues
**Problem**: User preferences and session data not persisting
**Solution**: 
1. Clear browser local storage
2. Check browser privacy settings
3. Ensure local storage is enabled

#### CORS Issues
**Problem**: API calls fail with CORS errors
**Solution**:
1. Check application CORS configuration
2. Ensure proper domain whitelisting
3. Use HTTPS in production

## Getting Additional Help

### Self-Service Resources

1. **Application Logs**:
   ```bash
   # View recent logs
   tail -100 logs/application.log
   
   # Search for specific errors
   grep "ERROR" logs/application.log
   ```

2. **Health Check Endpoint**:
   - Visit: `http://localhost:3000/api/health`
   - Check system status and dependencies

3. **Configuration Validation**:
   - Use built-in configuration validator
   - Check environment variable loading

### Community Support

1. **GitHub Issues**:
   - Search existing issues for similar problems
   - Create new issue with detailed information
   - Include error logs and configuration details

2. **Developer Community**:
   - Join our Discord/Slack community
   - Ask questions in appropriate channels
   - Share solutions with other developers

3. **Documentation**:
   - Check latest documentation updates
   - Review API documentation
   - Read best practices guide

### Professional Support

1. **Support Tickets**:
   - Email: support@your-org.com
   - Include detailed problem description
   - Attach relevant logs and screenshots

2. **Priority Support**:
   - Available for enterprise customers
   - Direct access to development team
   - Faster response times

### Information to Include When Seeking Help

1. **System Information**:
   - Operating system and version
   - Node.js version
   - Application version
   - Browser type and version

2. **Error Details**:
   - Complete error messages
   - Steps to reproduce the issue
   - Expected vs actual behavior
   - Screenshots or screen recordings

3. **Configuration**:
   - Environment variables (sanitized)
   - Configuration files
   - Network setup details

4. **Logs**:
   - Application logs
   - Browser console logs
   - System logs (if relevant)

### Emergency Procedures

#### Critical System Failure
1. **Immediate Actions**:
   - Stop the application
   - Check system resources
   - Review recent changes

2. **Recovery Steps**:
   - Restart with last known good configuration
   - Restore from backup if necessary
   - Contact support team

3. **Prevention**:
   - Implement monitoring and alerting
   - Regular backups
   - Staged deployment process

#### Data Loss Prevention
1. **Regular Backups**:
   - Database backups
   - Configuration backups
   - User data exports

2. **Monitoring**:
   - Set up health checks
   - Monitor disk space
   - Track error rates

3. **Recovery Planning**:
   - Document recovery procedures
   - Test backup restoration
   - Maintain emergency contacts