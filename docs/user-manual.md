# SFMC Development Suite - User Manual

## Table of Contents
1. [Getting Started](#getting-started)
2. [AI Code Generator](#ai-code-generator)
3. [Advanced Debugging Tool](#advanced-debugging-tool)
4. [Cloud Pages Generator](#cloud-pages-generator)
5. [SFMC Integration](#sfmc-integration)
6. [Session Management](#session-management)
7. [Best Practices](#best-practices)

## Getting Started

### Dashboard Overview
After logging in, you'll see the main dashboard with four primary tools:

- **AI Code Generator**: Generate code in multiple languages (SQL, AMPScript, SSJS, CSS, HTML)
- **Debugging Tool**: Analyze and debug your SFMC code
- **Cloud Pages Generator**: Create responsive SFMC cloud pages
- **SFMC Integration**: Connect and interact with your SFMC instance

### Navigation
- Use the sidebar to switch between tools
- The top bar shows your connection status and user preferences
- Each tool has its own workspace with dedicated features

## AI Code Generator

### Overview
The AI Code Generator helps you create syntactically correct code for SFMC development across multiple languages.

### Supported Languages
- **SQL**: Data Extension queries and operations
- **AMPScript**: Email and cloud page personalization
- **SSJS**: Server-Side JavaScript for advanced logic
- **CSS**: Styling for emails and cloud pages
- **HTML**: Markup for emails and cloud pages

### Basic Usage

#### Step 1: Select Language
1. Navigate to the AI Code Generator
2. Select your target language from the dropdown
3. The interface will adapt to show language-specific features

#### Step 2: Provide Context
1. **Prompt Input**: Describe what you want to generate
   ```
   Example: "Create a SQL query to find all subscribers who opened emails in the last 30 days"
   ```

2. **Context Information**: Provide additional details
   - Data Extension names
   - Field names
   - Business requirements
   - Performance considerations

#### Step 3: Generate Code
1. Click **Generate Code**
2. Review the generated code with syntax highlighting
3. Use **Copy to Clipboard** to use the code elsewhere

### Advanced Features

#### Template Library
Access pre-built templates for common SFMC scenarios:

1. **Email Templates**
   - Welcome email series
   - Abandoned cart recovery
   - Newsletter templates

2. **Data Extension Queries**
   - Segmentation queries
   - Data cleanup scripts
   - Performance optimization queries

3. **AMPScript Functions**
   - Personalization functions
   - Date/time manipulation
   - String processing

#### Code Explanation
- Click **Explain Code** to get detailed explanations
- Hover over code sections for inline documentation
- View performance implications and best practices

#### Image-to-Code Generation
1. Upload an image of a design or wireframe
2. Select target output (HTML/CSS)
3. Generate responsive code based on the visual

### Example Workflows

#### Creating a Data Extension Query
```sql
-- Generated from prompt: "Find active subscribers from last 6 months"
SELECT 
    s.SubscriberKey,
    s.EmailAddress,
    s.FirstName,
    s.LastName,
    MAX(j.EventDate) as LastActivity
FROM _Subscribers s
INNER JOIN _Job j ON s.SubscriberKey = j.SubscriberKey
WHERE j.EventDate >= DATEADD(month, -6, GETDATE())
    AND j.EventType IN ('Open', 'Click')
GROUP BY s.SubscriberKey, s.EmailAddress, s.FirstName, s.LastName
ORDER BY LastActivity DESC
```

#### Creating AMPScript Personalization
```ampscript
%%[
/* Generated from prompt: "Personalize greeting based on time of day" */
VAR @currentHour, @greeting, @firstName
SET @currentHour = Format(Now(), "HH")
SET @firstName = AttributeValue("FirstName")

IF @currentHour < 12 THEN
    SET @greeting = "Good morning"
ELSEIF @currentHour < 17 THEN
    SET @greeting = "Good afternoon"
ELSE
    SET @greeting = "Good evening"
ENDIF
]%%

<h1>%%=v(@greeting)=%% %%=v(@firstName)=%%!</h1>
```

## Advanced Debugging Tool

### Overview
The debugging tool provides comprehensive analysis for all supported languages with real-time error detection and performance optimization suggestions.

### Language-Specific Debugging

#### SQL Debugging
1. **Paste or type your SQL query**
2. **Analysis includes**:
   - Syntax validation
   - Query optimization suggestions
   - Execution plan analysis
   - Performance metrics estimation

**Example Analysis Output**:
```
✅ Syntax: Valid
⚠️  Performance: Consider adding index on EventDate
💡 Optimization: Use EXISTS instead of IN for better performance
📊 Estimated execution time: 2.3 seconds
```

#### AMPScript Debugging
1. **Input your AMPScript code**
2. **Analysis covers**:
   - Function syntax validation
   - Variable scope checking
   - Performance optimization
   - SFMC-specific best practices

#### SSJS Debugging
1. **Paste your Server-Side JavaScript**
2. **Features include**:
   - JavaScript syntax validation
   - SFMC API usage validation
   - Memory usage analysis
   - Error handling recommendations

### Real-Time Analysis

#### Live Error Detection
- Errors are highlighted as you type
- Red underlines indicate syntax errors
- Yellow underlines show warnings
- Green suggestions appear for optimizations

#### Performance Metrics
The tool displays:
- **Execution Time**: Estimated runtime
- **Memory Usage**: Resource consumption
- **Complexity Score**: Code maintainability rating
- **Best Practices Score**: Adherence to SFMC guidelines

### Code Optimization

#### Automatic Suggestions
1. **Performance Improvements**
   ```sql
   -- Before (flagged as slow)
   SELECT * FROM LargeDataExtension WHERE YEAR(DateField) = 2024
   
   -- Suggested optimization
   SELECT * FROM LargeDataExtension 
   WHERE DateField >= '2024-01-01' AND DateField < '2025-01-01'
   ```

2. **Best Practices Enforcement**
   ```ampscript
   -- Before (security risk flagged)
   %%=RequestParameter("userInput")=%%
   
   -- Suggested secure version
   %%=HTMLEncode(RequestParameter("userInput"))=%%
   ```

#### Code Comparison
- View before/after optimization side-by-side
- Understand the impact of suggested changes
- Apply optimizations selectively

## Cloud Pages Generator

### Overview
Generate responsive SFMC cloud pages using configuration-based templates without manual coding.

### Configuration-Based Generation

#### JSON Configuration
Create pages using structured configuration:

```json
{
  "page": {
    "title": "Product Catalog",
    "description": "Browse our latest products",
    "layout": "grid",
    "responsive": true
  },
  "components": [
    {
      "type": "header",
      "content": {
        "title": "Welcome to Our Store",
        "subtitle": "Discover amazing products"
      }
    },
    {
      "type": "product-grid",
      "dataSource": "ProductCatalog_DE",
      "columns": 3,
      "responsive": true
    }
  ],
  "styling": {
    "theme": "modern",
    "primaryColor": "#007bff",
    "font": "Arial, sans-serif"
  }
}
```

#### YAML Configuration
Alternative YAML format for easier editing:

```yaml
page:
  title: "Product Catalog"
  description: "Browse our latest products"
  layout: grid
  responsive: true

components:
  - type: header
    content:
      title: "Welcome to Our Store"
      subtitle: "Discover amazing products"
  
  - type: product-grid
    dataSource: "ProductCatalog_DE"
    columns: 3
    responsive: true

styling:
  theme: modern
  primaryColor: "#007bff"
  font: "Arial, sans-serif"
```

### Available Components

#### Layout Components
- **Header**: Page headers with titles and navigation
- **Footer**: Page footers with links and contact info
- **Container**: Wrapper components for content organization
- **Grid**: Responsive grid layouts
- **Sidebar**: Side navigation and content areas

#### Content Components
- **Text Block**: Rich text content with formatting
- **Image**: Responsive images with optimization
- **Button**: Call-to-action buttons with tracking
- **Form**: Data collection forms with validation
- **Table**: Data tables with sorting and filtering

#### SFMC-Specific Components
- **Data Extension Table**: Display DE data in tables
- **Personalization Block**: Dynamic content based on subscriber data
- **Preference Center**: Subscription management interface
- **Unsubscribe Form**: Compliant unsubscribe functionality

### Responsive Design

#### Mobile-First Approach
All generated pages use mobile-first responsive design:
- Breakpoints: 576px (mobile), 768px (tablet), 992px (desktop)
- Flexible grid system
- Optimized images and fonts
- Touch-friendly interface elements

#### Framework Support
Choose your preferred CSS framework:
- **Bootstrap 5**: Full Bootstrap component library
- **Tailwind CSS**: Utility-first CSS framework
- **Vanilla CSS**: Custom CSS without dependencies

### AMPScript Integration

#### Dynamic Content
Generated pages include AMPScript for personalization:

```html
<!-- Generated header with personalization -->
<header class="hero-section">
  <div class="container">
    <h1>
      %%[
      VAR @firstName
      SET @firstName = AttributeValue("FirstName")
      IF NOT EMPTY(@firstName) THEN
      ]%%
        Welcome back, %%=v(@firstName)=%%!
      %%[ ELSE ]%%
        Welcome to our store!
      %%[ ENDIF ]%%
    </h1>
  </div>
</header>
```

#### Data Extension Integration
```html
<!-- Generated product listing -->
%%[
VAR @products, @productCount, @i
SET @products = LookupRows("ProductCatalog_DE", "Status", "Active")
SET @productCount = RowCount(@products)
SET @i = 1
]%%

<div class="product-grid">
  %%[ FOR @i = 1 TO @productCount DO ]%%
    %%[ VAR @product SET @product = Row(@products, @i) ]%%
    <div class="product-card">
      <img src="%%=Field(@product, 'ImageURL')=%%" alt="%%=Field(@product, 'ProductName')=%%">
      <h3>%%=Field(@product, 'ProductName')=%%</h3>
      <p class="price">$%%=Field(@product, 'Price')=%%</p>
    </div>
  %%[ NEXT @i ]%%
</div>
```

## SFMC Integration

### Authentication Setup

#### OAuth 2.0 Flow
1. **Navigate to SFMC Integration**
2. **Click "Connect to SFMC"**
3. **Complete OAuth flow**:
   - Redirected to SFMC login
   - Grant permissions to the application
   - Automatically redirected back with tokens

#### Connection Status
Monitor your SFMC connection:
- **Connected**: Green indicator, all features available
- **Expired**: Yellow indicator, token refresh needed
- **Disconnected**: Red indicator, re-authentication required

### Data Extension Management

#### Browse Data Extensions
1. **View all Data Extensions** in your SFMC account
2. **Search and filter** by name, folder, or type
3. **Preview data** without leaving the application

#### Query Data Extensions
```sql
-- Example: Query subscriber data
SELECT TOP 100
    SubscriberKey,
    EmailAddress,
    FirstName,
    LastName,
    DateJoined
FROM Subscribers_DE
WHERE Status = 'Active'
ORDER BY DateJoined DESC
```

#### Data Export
- Export query results to CSV
- Download data for offline analysis
- Schedule automated exports

### Cloud Page Deployment

#### Direct Deployment
1. **Generate cloud page** using the generator
2. **Review generated code** in the preview
3. **Click "Deploy to SFMC"**
4. **Select target folder** in SFMC
5. **Confirm deployment**

#### Deployment Options
- **Create New**: Deploy as a new cloud page
- **Update Existing**: Replace existing page content
- **Create Version**: Save as a new version of existing page

### API Testing

#### REST API Explorer
Test SFMC REST API endpoints directly:
1. **Select endpoint** from the dropdown
2. **Configure parameters** and headers
3. **Send request** and view response
4. **Save requests** for future use

#### SOAP API Testing
Test SFMC SOAP API operations:
1. **Choose SOAP operation** (Create, Update, Delete, etc.)
2. **Configure object type** and properties
3. **Execute operation** and review results

## Session Management

### Conversation History
- All AI interactions are saved automatically
- Access previous conversations from the sidebar
- Search conversation history by keywords
- Export conversations for documentation

### User Preferences
Customize your experience:
- **Theme**: Light, dark, or auto
- **Language**: Code generation language preferences
- **Editor**: Font size, tab size, word wrap
- **Notifications**: Error alerts, completion notifications

### Credential Management
- SFMC credentials are encrypted and stored securely
- Session tokens are automatically refreshed
- Manual credential update available in settings

## Best Practices

### Code Generation
1. **Be Specific**: Provide detailed prompts for better results
2. **Include Context**: Mention Data Extension names and field types
3. **Review Generated Code**: Always review before using in production
4. **Test Thoroughly**: Use the debugging tool to validate generated code

### Debugging
1. **Regular Analysis**: Run debugging on all code before deployment
2. **Address Warnings**: Don't ignore yellow warning indicators
3. **Performance First**: Prioritize performance optimization suggestions
4. **Security Conscious**: Always implement security recommendations

### Cloud Pages
1. **Mobile-First**: Always design for mobile users first
2. **Performance**: Optimize images and minimize code
3. **Accessibility**: Ensure pages are accessible to all users
4. **Testing**: Test pages across different devices and browsers

### SFMC Integration
1. **Rate Limiting**: Be mindful of SFMC API rate limits
2. **Error Handling**: Implement proper error handling for API calls
3. **Data Privacy**: Follow data privacy best practices
4. **Monitoring**: Monitor API usage and performance regularly

## Keyboard Shortcuts

### Global Shortcuts
- `Ctrl/Cmd + N`: New code generation session
- `Ctrl/Cmd + S`: Save current work
- `Ctrl/Cmd + D`: Open debugging tool
- `Ctrl/Cmd + P`: Open cloud pages generator
- `Ctrl/Cmd + I`: Open SFMC integration

### Editor Shortcuts
- `Ctrl/Cmd + /`: Toggle comments
- `Ctrl/Cmd + F`: Find in code
- `Ctrl/Cmd + H`: Find and replace
- `Tab`: Indent selection
- `Shift + Tab`: Unindent selection

### Debugging Shortcuts
- `F5`: Run analysis
- `F8`: Next error
- `Shift + F8`: Previous error
- `Ctrl/Cmd + .`: Show quick fixes

## Support and Resources

### Getting Help
- **In-App Help**: Click the help icon in any section
- **Documentation**: Access full documentation from the help menu
- **Community**: Join our developer community for tips and support
- **Support Tickets**: Submit support requests for technical issues

### Learning Resources
- **Video Tutorials**: Step-by-step video guides
- **Code Examples**: Library of common SFMC code patterns
- **Best Practices Guide**: Comprehensive development guidelines
- **API Reference**: Complete SFMC API documentation