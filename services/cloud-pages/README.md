# Cloud Pages Generator

A comprehensive configuration-based cloud page generation system for SFMC (Salesforce Marketing Cloud) with multi-framework support and reusable UI components.

## Overview

The Cloud Pages Generator provides a complete solution for creating responsive SFMC cloud pages through configuration-driven development. It supports multiple CSS frameworks (Bootstrap, Tailwind, Vanilla CSS) and includes a rich library of pre-built UI components optimized for SFMC environments.

## Features

### ✅ Configuration System
- **JSON/YAML Parser**: Parse and validate page configurations from JSON or YAML formats
- **Schema Validation**: Comprehensive validation using Zod schemas with detailed error reporting
- **Type Safety**: Full TypeScript support with strict type checking
- **Default Configurations**: Pre-built default configurations for quick setup

### ✅ Template Engine
- **Multi-Framework Support**: Bootstrap, Tailwind CSS, and Vanilla CSS frameworks
- **Responsive Templates**: Mobile-first responsive design templates
- **Component Rendering**: Dynamic component rendering with prop interpolation
- **Template Library**: Pre-built templates for common page types (landing, form, preference, etc.)

### ✅ UI Component Library
- **Reusable Components**: 6+ pre-built components optimized for SFMC
- **Framework Agnostic**: Components work with all supported CSS frameworks
- **Prop Validation**: Runtime validation of component properties
- **AMPScript Support**: Components with built-in AMPScript integration capabilities

## Architecture

```
services/cloud-pages/
├── cloud-pages.service.ts      # Main service orchestrating all functionality
├── configuration-parser.ts     # JSON/YAML parsing and validation
├── template-engine.ts          # Template system and page generation
├── ui-component-library.ts     # Reusable UI components
├── index.ts                    # Public API exports
├── __tests__/                  # Comprehensive test suite
└── README.md                   # This documentation
```

## Components Library

### Navigation Components
- **Navbar**: Responsive navigation bar with brand and menu items

### Layout Components
- **Hero Section**: Large hero section with background, title, and CTA
- **Footer**: Site footer with links and copyright

### Form Components
- **Contact Form**: Responsive contact form with validation
- **Newsletter Signup**: Email subscription form

### Content Components
- **Feature Cards**: Grid of feature cards with icons and descriptions

## Usage Examples

### Basic Configuration

```typescript
import { cloudPagesService } from './services/cloud-pages';

// Generate from JSON configuration
const jsonConfig = {
  pageSettings: {
    pageName: 'Landing Page',
    publishedURL: 'https://example.com/landing',
    pageType: 'landing',
    title: 'Welcome to Our Service'
  },
  codeResources: {
    css: { framework: 'bootstrap' },
    javascript: {}
  },
  advancedOptions: {
    responsive: true,
    mobileFirst: true,
    accessibility: true,
    seoOptimized: true,
    ampscriptEnabled: false
  },
  layout: {
    structure: 'single-column',
    header: true,
    footer: true
  },
  components: [
    {
      id: 'hero-1',
      type: 'hero-section',
      position: 1,
      props: {
        title: 'Welcome to Our Service',
        subtitle: 'Experience the power of automation',
        ctaText: 'Get Started',
        ctaUrl: '/signup'
      }
    }
  ]
};

const result = await cloudPagesService.generateFromConfig(jsonConfig);
```

### Template-Based Generation

```typescript
// Generate from pre-built template
const result = await cloudPagesService.generateFromTemplate('bootstrap-landing', {
  pageSettings: {
    pageName: 'Custom Landing Page',
    title: 'My Custom Title'
  }
});
```

### YAML Configuration

```yaml
pageSettings:
  pageName: YAML Landing Page
  publishedURL: https://example.com/yaml-page
  pageType: landing
  title: YAML Generated Page
codeResources:
  css:
    framework: tailwind
  javascript: {}
advancedOptions:
  responsive: true
  mobileFirst: true
layout:
  structure: single-column
components:
  - id: hero-1
    type: hero-section
    position: 1
    props:
      title: YAML Hero Title
      ctaText: Learn More
```

## API Endpoints

### Generate Cloud Page
```
POST /api/cloud-pages/generate
```

**Request Body:**
```json
{
  "type": "config|json|yaml|template",
  "config": { /* configuration object */ },
  "templateId": "template-id", // for template type
  "customizations": { /* template customizations */ }
}
```

### Validate Configuration
```
POST /api/cloud-pages/validate
```

**Request Body:**
```json
{
  "config": { /* configuration object to validate */ }
}
```

### Get Templates and Components
```
GET /api/cloud-pages/generate
```

Returns available templates, components, and default configuration.

## Generated Output

The service generates a complete `GeneratedOutput` object containing:

- **Pages**: Array of generated pages with HTML, CSS, JavaScript, and AMPScript
- **Code Resources**: Separate CSS, JavaScript, and AMPScript files for SFMC
- **Integration Notes**: Step-by-step integration instructions
- **Testing Guidelines**: Comprehensive testing recommendations
- **Deployment Instructions**: Detailed deployment steps for SFMC

## Framework Support

### Bootstrap
- Complete Bootstrap 5.3 integration
- Responsive grid system
- Pre-styled components
- Form validation

### Tailwind CSS
- Tailwind CSS 3.x support
- Utility-first approach
- Custom component styling
- Responsive design utilities

### Vanilla CSS
- Custom CSS framework
- Lightweight implementation
- Cross-browser compatibility
- Flexible styling options

## Validation and Error Handling

- **Schema Validation**: Comprehensive Zod-based validation
- **Type Checking**: Full TypeScript type safety
- **Error Recovery**: Graceful error handling with detailed messages
- **Warnings System**: Performance and best practice warnings

## Performance Features

- **Optimization Scoring**: Automatic performance score calculation
- **File Size Analysis**: Detailed breakdown of generated file sizes
- **Load Time Estimation**: Estimated page load time calculations
- **Best Practices**: Built-in performance optimization recommendations

## AMPScript Integration

- **Component Support**: Components with AMPScript capabilities
- **Data Extension Integration**: Automatic data extension AMPScript generation
- **Conditional Rendering**: AMPScript-based conditional content
- **Variable Management**: Proper AMPScript variable handling

## Testing

Comprehensive test suite covering:
- Configuration parsing and validation
- Template engine functionality
- UI component library
- Service integration
- Error handling scenarios

Run tests with:
```bash
npm test services/cloud-pages
```

## Requirements Fulfilled

This implementation satisfies all requirements from **Requirement 3**:

- ✅ **3.1**: JSON/YAML configuration parsing and validation
- ✅ **3.2**: Pre-built responsive templates with framework support
- ✅ **3.3**: Reusable UI component library optimized for SFMC

## Future Enhancements

- Visual page builder interface
- Advanced AMPScript debugging
- Performance monitoring integration
- A/B testing capabilities
- Multi-language support
- Advanced SEO optimization tools