/**
 * Responsive Design Generator
 * Generates mobile-first responsive designs for SFMC cloud pages
 */

import { 
  PageConfiguration, 
  Framework, 
  ComponentConfiguration,
  ResponsiveBreakpoints 
} from '../../types/cloud-pages';

export interface ResponsiveConfig {
  breakpoints: {
    mobile: number;
    tablet: number;
    desktop: number;
  };
  mobileFirst: boolean;
  framework: Framework;
}

export interface ResponsiveStyles {
  base: string;
  mobile: string;
  tablet: string;
  desktop: string;
}

export class ResponsiveGenerator {
  private defaultBreakpoints = {
    mobile: 480,
    tablet: 768,
    desktop: 1024
  };

  /**
   * Generate mobile-first responsive CSS
   */
  generateResponsiveCSS(config: PageConfiguration): string {
    const responsiveConfig: ResponsiveConfig = {
      breakpoints: this.defaultBreakpoints,
      mobileFirst: config.advancedOptions.mobileFirst,
      framework: config.codeResources.css.framework
    };

    let css = '';

    // Base mobile styles (mobile-first approach)
    css += this.generateMobileBaseStyles(config, responsiveConfig);

    // Tablet styles
    css += this.generateTabletStyles(config, responsiveConfig);

    // Desktop styles
    css += this.generateDesktopStyles(config, responsiveConfig);

    // Component-specific responsive styles
    css += this.generateComponentResponsiveStyles(config.components, responsiveConfig);

    return css;
  }

  /**
   * Generate framework-specific responsive utilities
   */
  generateFrameworkResponsiveUtils(framework: Framework): string {
    switch (framework) {
      case 'bootstrap':
        return this.generateBootstrapResponsiveUtils();
      case 'tailwind':
        return this.generateTailwindResponsiveUtils();
      case 'vanilla':
        return this.generateVanillaResponsiveUtils();
      default:
        return '';
    }
  }

  /**
   * Generate mobile base styles (mobile-first)
   */
  private generateMobileBaseStyles(config: PageConfiguration, responsiveConfig: ResponsiveConfig): string {
    const { framework } = responsiveConfig;
    
    let css = `
/* Mobile Base Styles (Mobile-First) */
`;

    switch (framework) {
      case 'bootstrap':
        css += `
.container-fluid { padding: 0 15px; }
.row { margin: 0 -10px; }
.col, [class*="col-"] { padding: 0 10px; margin-bottom: 20px; }
.btn { width: 100%; padding: 12px; font-size: 16px; }
.form-control { font-size: 16px; padding: 12px; }
.navbar-toggler { display: block; }
.navbar-collapse { display: none; }
.card { margin-bottom: 20px; }
.hero-section { padding: 40px 0; text-align: center; }
.hero-title { font-size: 2rem; line-height: 1.2; }
.hero-subtitle { font-size: 1.1rem; margin-bottom: 30px; }
`;
        break;

      case 'tailwind':
        css += `
.container { padding: 0 1rem; }
.grid { grid-template-columns: 1fr; gap: 1rem; }
.btn { width: 100%; padding: 0.75rem; font-size: 1rem; }
.form-input { font-size: 1rem; padding: 0.75rem; }
.nav-menu { display: none; }
.nav-toggle { display: block; }
.card { margin-bottom: 1.25rem; }
.hero { padding: 2.5rem 0; text-align: center; }
.hero-title { font-size: 2rem; line-height: 1.2; }
.hero-subtitle { font-size: 1.125rem; margin-bottom: 2rem; }
`;
        break;

      case 'vanilla':
        css += `
.container { padding: 0 20px; max-width: 100%; }
.grid { display: grid; grid-template-columns: 1fr; gap: 20px; }
.btn { width: 100%; padding: 15px; font-size: 16px; }
.form-control { font-size: 16px; padding: 15px; }
.nav-menu { display: none; }
.nav-toggle { display: block; cursor: pointer; }
.card { margin-bottom: 20px; }
.hero { padding: 60px 0; text-align: center; }
.hero-title { font-size: 2rem; line-height: 1.2; margin-bottom: 20px; }
.hero-subtitle { font-size: 1.1rem; margin-bottom: 30px; }
.features-grid { display: grid; grid-template-columns: 1fr; gap: 30px; }
.feature-card { text-align: center; padding: 30px 20px; }
`;
        break;
    }

    return css;
  }

  /**
   * Generate tablet styles
   */
  private generateTabletStyles(config: PageConfiguration, responsiveConfig: ResponsiveConfig): string {
    const { framework, breakpoints } = responsiveConfig;
    
    let css = `
/* Tablet Styles */
@media (min-width: ${breakpoints.tablet}px) {
`;

    switch (framework) {
      case 'bootstrap':
        css += `
  .container { max-width: 750px; }
  .row { margin: 0 -15px; }
  .col, [class*="col-"] { padding: 0 15px; }
  .btn { width: auto; min-width: 150px; }
  .navbar-toggler { display: none; }
  .navbar-collapse { display: flex !important; }
  .hero-section { padding: 60px 0; }
  .hero-title { font-size: 2.5rem; }
  .features-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 30px; }
`;
        break;

      case 'tailwind':
        css += `
  .container { max-width: 48rem; }
  .grid-cols-2 { grid-template-columns: repeat(2, 1fr); }
  .btn { width: auto; min-width: 9rem; }
  .nav-menu { display: flex; }
  .nav-toggle { display: none; }
  .hero { padding: 3.75rem 0; }
  .hero-title { font-size: 2.5rem; }
  .features-grid { grid-template-columns: repeat(2, 1fr); gap: 2rem; }
`;
        break;

      case 'vanilla':
        css += `
  .container { max-width: 768px; }
  .grid-2 { grid-template-columns: repeat(2, 1fr); }
  .btn { width: auto; min-width: 150px; }
  .nav-menu { display: flex; }
  .nav-toggle { display: none; }
  .hero { padding: 80px 0; }
  .hero-title { font-size: 2.5rem; }
  .features-grid { grid-template-columns: repeat(2, 1fr); gap: 40px; }
`;
        break;
    }

    css += `
}
`;

    return css;
  }

  /**
   * Generate desktop styles
   */
  private generateDesktopStyles(config: PageConfiguration, responsiveConfig: ResponsiveConfig): string {
    const { framework, breakpoints } = responsiveConfig;
    
    let css = `
/* Desktop Styles */
@media (min-width: ${breakpoints.desktop}px) {
`;

    switch (framework) {
      case 'bootstrap':
        css += `
  .container { max-width: 1200px; }
  .hero-section { padding: 100px 0; }
  .hero-title { font-size: 3.5rem; }
  .hero-subtitle { font-size: 1.25rem; }
  .features-grid { grid-template-columns: repeat(3, 1fr); gap: 40px; }
  .newsletter-form { display: flex; align-items: end; gap: 15px; }
  .newsletter-form .form-group { flex: 1; margin-bottom: 0; }
  .newsletter-form .btn { flex-shrink: 0; }
`;
        break;

      case 'tailwind':
        css += `
  .container { max-width: 64rem; }
  .grid-cols-3 { grid-template-columns: repeat(3, 1fr); }
  .hero { padding: 6.25rem 0; }
  .hero-title { font-size: 3.5rem; }
  .hero-subtitle { font-size: 1.25rem; }
  .features-grid { grid-template-columns: repeat(3, 1fr); gap: 2.5rem; }
  .newsletter-form { display: flex; align-items: end; gap: 1rem; }
  .newsletter-form .form-group { flex: 1; margin-bottom: 0; }
  .newsletter-form .btn { flex-shrink: 0; }
`;
        break;

      case 'vanilla':
        css += `
  .container { max-width: 1200px; }
  .grid-3 { grid-template-columns: repeat(3, 1fr); }
  .hero { padding: 120px 0; }
  .hero-title { font-size: 3.5rem; }
  .hero-subtitle { font-size: 1.25rem; }
  .features-grid { grid-template-columns: repeat(3, 1fr); gap: 50px; }
  .newsletter-form { display: flex; align-items: end; gap: 20px; }
  .newsletter-form .form-group { flex: 1; margin-bottom: 0; }
  .newsletter-form .btn { flex-shrink: 0; }
`;
        break;
    }

    css += `
}
`;

    return css;
  }

  /**
   * Generate component-specific responsive styles
   */
  private generateComponentResponsiveStyles(components: ComponentConfiguration[], responsiveConfig: ResponsiveConfig): string {
    let css = '';

    components.forEach(component => {
      if (component.styling?.responsive) {
        css += this.generateComponentBreakpointStyles(component, responsiveConfig);
      }
    });

    return css;
  }

  /**
   * Generate responsive styles for a specific component
   */
  private generateComponentBreakpointStyles(component: ComponentConfiguration, responsiveConfig: ResponsiveConfig): string {
    const { responsive } = component.styling!;
    const { breakpoints } = responsiveConfig;
    let css = '';

    if (responsive?.mobile) {
      css += `
/* Mobile styles for ${component.id} */
@media (max-width: ${breakpoints.tablet - 1}px) {
  #${component.id} {
    ${responsive.mobile}
  }
}
`;
    }

    if (responsive?.tablet) {
      css += `
/* Tablet styles for ${component.id} */
@media (min-width: ${breakpoints.tablet}px) and (max-width: ${breakpoints.desktop - 1}px) {
  #${component.id} {
    ${responsive.tablet}
  }
}
`;
    }

    if (responsive?.desktop) {
      css += `
/* Desktop styles for ${component.id} */
@media (min-width: ${breakpoints.desktop}px) {
  #${component.id} {
    ${responsive.desktop}
  }
}
`;
    }

    return css;
  }

  /**
   * Generate Bootstrap responsive utilities
   */
  private generateBootstrapResponsiveUtils(): string {
    return `
/* Bootstrap Responsive Utilities */
.d-block { display: block !important; }
.d-none { display: none !important; }
.d-flex { display: flex !important; }

@media (max-width: 767.98px) {
  .d-sm-none { display: none !important; }
  .d-sm-block { display: block !important; }
  .text-sm-center { text-align: center !important; }
}

@media (min-width: 768px) {
  .d-md-block { display: block !important; }
  .d-md-none { display: none !important; }
  .d-md-flex { display: flex !important; }
}

@media (min-width: 1024px) {
  .d-lg-block { display: block !important; }
  .d-lg-none { display: none !important; }
  .d-lg-flex { display: flex !important; }
}
`;
  }

  /**
   * Generate Tailwind responsive utilities
   */
  private generateTailwindResponsiveUtils(): string {
    return `
/* Tailwind Responsive Utilities */
.block { display: block; }
.hidden { display: none; }
.flex { display: flex; }
.grid { display: grid; }

@media (min-width: 768px) {
  .md\\:block { display: block; }
  .md\\:hidden { display: none; }
  .md\\:flex { display: flex; }
  .md\\:grid { display: grid; }
  .md\\:text-left { text-align: left; }
}

@media (min-width: 1024px) {
  .lg\\:block { display: block; }
  .lg\\:hidden { display: none; }
  .lg\\:flex { display: flex; }
  .lg\\:grid { display: grid; }
  .lg\\:text-left { text-align: left; }
}
`;
  }

  /**
   * Generate Vanilla CSS responsive utilities
   */
  private generateVanillaResponsiveUtils(): string {
    return `
/* Vanilla CSS Responsive Utilities */
.show { display: block !important; }
.hide { display: none !important; }
.flex { display: flex !important; }
.grid { display: grid !important; }

@media (max-width: 767px) {
  .mobile-hide { display: none !important; }
  .mobile-show { display: block !important; }
  .mobile-center { text-align: center !important; }
}

@media (min-width: 768px) {
  .tablet-show { display: block !important; }
  .tablet-hide { display: none !important; }
  .tablet-flex { display: flex !important; }
}

@media (min-width: 1024px) {
  .desktop-show { display: block !important; }
  .desktop-hide { display: none !important; }
  .desktop-flex { display: flex !important; }
}
`;
  }

  /**
   * Generate responsive navigation JavaScript
   */
  generateResponsiveNavJS(): string {
    return `
/* Responsive Navigation JavaScript */
document.addEventListener('DOMContentLoaded', function() {
  const navToggle = document.querySelector('.nav-toggle');
  const navMenu = document.querySelector('.nav-menu');
  
  if (navToggle && navMenu) {
    navToggle.addEventListener('click', function() {
      navMenu.classList.toggle('active');
      this.classList.toggle('active');
    });
    
    // Close menu when clicking outside
    document.addEventListener('click', function(e) {
      if (!navToggle.contains(e.target) && !navMenu.contains(e.target)) {
        navMenu.classList.remove('active');
        navToggle.classList.remove('active');
      }
    });
    
    // Close menu on window resize if desktop
    window.addEventListener('resize', function() {
      if (window.innerWidth >= 768) {
        navMenu.classList.remove('active');
        navToggle.classList.remove('active');
      }
    });
  }
});
`;
  }

  /**
   * Generate responsive image handling
   */
  generateResponsiveImageCSS(): string {
    return `
/* Responsive Images */
img {
  max-width: 100%;
  height: auto;
}

.responsive-img {
  width: 100%;
  height: auto;
  object-fit: cover;
}

/* Picture element support */
picture {
  display: block;
}

picture img {
  width: 100%;
  height: auto;
}

/* Responsive video */
.video-responsive {
  position: relative;
  padding-bottom: 56.25%; /* 16:9 aspect ratio */
  height: 0;
  overflow: hidden;
}

.video-responsive iframe,
.video-responsive object,
.video-responsive embed {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
}
`;
  }
}

export const responsiveGenerator = new ResponsiveGenerator();