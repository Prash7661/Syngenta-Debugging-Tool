import { LanguageValidator, DebugError, OptimizationSuggestion, ErrorSeverity } from '../../../types/debugging'

export class CSSValidator implements LanguageValidator {
  private readonly CSS_PROPERTIES = [
    'color', 'background', 'background-color', 'font-size', 'font-family', 'font-weight',
    'margin', 'padding', 'border', 'width', 'height', 'display', 'position',
    'top', 'left', 'right', 'bottom', 'z-index', 'opacity', 'visibility',
    'text-align', 'text-decoration', 'line-height', 'letter-spacing',
    'box-shadow', 'border-radius', 'transform', 'transition', 'animation'
  ]

  private readonly VENDOR_PREFIXES = ['-webkit-', '-moz-', '-ms-', '-o-']

  async validateSyntax(code: string): Promise<DebugError[]> {
    const errors: DebugError[] = []
    const lines = code.split('\n')

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      const lineNumber = i + 1

      // Check for missing semicolons
      errors.push(...this.validateSemicolons(line, lineNumber))
      
      // Check for missing closing braces
      errors.push(...this.validateBraces(line, lineNumber))
      
      // Check for invalid property names
      errors.push(...this.validatePropertyNames(line, lineNumber))
      
      // Check for invalid property values
      errors.push(...this.validatePropertyValues(line, lineNumber))
      
      // Check for selector syntax
      errors.push(...this.validateSelectors(line, lineNumber))
    }

    // Check for overall structure
    errors.push(...this.validateOverallStructure(code))

    return errors
  }

  async validateSemantics(code: string): Promise<DebugError[]> {
    const errors: DebugError[] = []
    const lines = code.split('\n')

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      const lineNumber = i + 1

      // Check for responsive design issues
      errors.push(...this.validateResponsiveDesign(line, lineNumber))
      
      // Check for accessibility issues
      errors.push(...this.validateAccessibility(line, lineNumber))
      
      // Check for browser compatibility
      errors.push(...this.validateBrowserCompatibility(line, lineNumber))
      
      // Check for CSS best practices
      errors.push(...this.validateBestPractices(line, lineNumber))
    }

    return errors
  }

  async analyzePerformance(code: string): Promise<DebugError[]> {
    const issues: DebugError[] = []
    const lines = code.split('\n')

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      const lineNumber = i + 1

      // Check for performance issues
      issues.push(...this.analyzePerformanceIssues(line, lineNumber))
      
      // Check for selector performance
      issues.push(...this.analyzeSelectorPerformance(line, lineNumber))
      
      // Check for animation performance
      issues.push(...this.analyzeAnimationPerformance(line, lineNumber))
      
      // Check for layout thrashing
      issues.push(...this.analyzeLayoutThrashing(line, lineNumber))
    }

    return issues
  }

  async getOptimizationSuggestions(code: string): Promise<OptimizationSuggestion[]> {
    const suggestions: OptimizationSuggestion[] = []
    const lines = code.split('\n')

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      const lineNumber = i + 1

      // Suggest performance optimizations
      suggestions.push(...this.suggestPerformanceOptimizations(line, lineNumber))
      
      // Suggest modern CSS features
      suggestions.push(...this.suggestModernCSS(line, lineNumber))
      
      // Suggest maintainability improvements
      suggestions.push(...this.suggestMaintainabilityImprovements(line, lineNumber))
      
      // Suggest accessibility improvements
      suggestions.push(...this.suggestAccessibilityImprovements(line, lineNumber))
    }

    return suggestions
  }

  async generateFixedCode(code: string, errors: DebugError[]): Promise<string> {
    let fixedCode = code
    const lines = fixedCode.split('\n')

    const sortedErrors = errors.sort((a, b) => b.line - a.line)

    for (const error of sortedErrors) {
      if (error.fixSuggestion && error.line <= lines.length) {
        const lineIndex = error.line - 1
        lines[lineIndex] = this.applyFix(lines[lineIndex], error)
      }
    }

    return lines.join('\n')
  }

  private validateSemicolons(line: string, lineNumber: number): DebugError[] {
    const errors: DebugError[] = []
    const trimmedLine = line.trim()
    
    // Check for missing semicolons in property declarations
    if (trimmedLine.includes(':') && 
        !trimmedLine.endsWith(';') && 
        !trimmedLine.endsWith('{') && 
        !trimmedLine.endsWith('}') &&
        !trimmedLine.startsWith('/*') &&
        !trimmedLine.startsWith('//') &&
        !trimmedLine.includes('@') &&
        trimmedLine !== '') {
      
      errors.push({
        id: `missing_semicolon_${lineNumber}`,
        line: lineNumber,
        column: trimmedLine.length,
        severity: 'error' as ErrorSeverity,
        message: 'Missing semicolon after CSS property declaration',
        rule: 'css-missing-semicolon',
        category: 'syntax',
        fixSuggestion: 'Add semicolon at end of property declaration'
      })
    }

    return errors
  }

  private validateBraces(line: string, lineNumber: number): DebugError[] {
    const errors: DebugError[] = []
    
    // Check for unmatched braces (basic check)
    const openBraces = (line.match(/\{/g) || []).length
    const closeBraces = (line.match(/\}/g) || []).length
    
    if (openBraces !== closeBraces && (openBraces > 0 || closeBraces > 0)) {
      errors.push({
        id: `unmatched_braces_${lineNumber}`,
        line: lineNumber,
        column: 1,
        severity: 'error' as ErrorSeverity,
        message: 'Unmatched braces in CSS rule',
        rule: 'css-unmatched-braces',
        category: 'syntax',
        fixSuggestion: openBraces > closeBraces ? 'Add missing closing brace' : 'Remove extra closing brace'
      })
    }

    return errors
  }

  private validatePropertyNames(line: string, lineNumber: number): DebugError[] {
    const errors: DebugError[] = []
    
    // Check for invalid property names
    const propertyMatch = line.match(/^\s*([a-zA-Z-]+)\s*:/)
    if (propertyMatch) {
      const property = propertyMatch[1]
      const isVendorPrefixed = this.VENDOR_PREFIXES.some(prefix => property.startsWith(prefix))
      
      if (!this.CSS_PROPERTIES.includes(property) && !isVendorPrefixed && !property.startsWith('--')) {
        errors.push({
          id: `invalid_property_${lineNumber}`,
          line: lineNumber,
          column: line.indexOf(property) + 1,
          severity: 'warning' as ErrorSeverity,
          message: `Unknown CSS property: ${property}`,
          rule: 'css-unknown-property',
          category: 'semantic',
          fixSuggestion: 'Check property name spelling or verify browser support'
        })
      }
    }

    return errors
  }

  private validatePropertyValues(line: string, lineNumber: number): DebugError[] {
    const errors: DebugError[] = []
    
    // Check for invalid color values
    if (line.includes('color:') || line.includes('background-color:')) {
      const colorMatch = line.match(/:\s*([^;]+)/)
      if (colorMatch) {
        const value = colorMatch[1].trim()
        if (value.includes('#') && !/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(value)) {
          errors.push({
            id: `invalid_color_${lineNumber}`,
            line: lineNumber,
            column: line.indexOf(value) + 1,
            severity: 'error' as ErrorSeverity,
            message: 'Invalid hex color format',
            rule: 'css-invalid-color',
            category: 'syntax',
            fixSuggestion: 'Use valid hex color format (#RGB or #RRGGBB)'
          })
        }
      }
    }

    // Check for invalid units
    const unitMatch = line.match(/:\s*(\d+)([a-zA-Z%]+)/)
    if (unitMatch) {
      const unit = unitMatch[2]
      const validUnits = ['px', 'em', 'rem', '%', 'vh', 'vw', 'pt', 'pc', 'in', 'cm', 'mm']
      if (!validUnits.includes(unit)) {
        errors.push({
          id: `invalid_unit_${lineNumber}`,
          line: lineNumber,
          column: line.indexOf(unit) + 1,
          severity: 'warning' as ErrorSeverity,
          message: `Unknown CSS unit: ${unit}`,
          rule: 'css-unknown-unit',
          category: 'semantic',
          fixSuggestion: 'Use valid CSS unit (px, em, rem, %, etc.)'
        })
      }
    }

    return errors
  }

  private validateSelectors(line: string, lineNumber: number): DebugError[] {
    const errors: DebugError[] = []
    
    // Check for overly specific selectors
    const selectorMatch = line.match(/^([^{]+)\s*\{/)
    if (selectorMatch) {
      const selector = selectorMatch[1].trim()
      const specificity = (selector.match(/\./g) || []).length + (selector.match(/#/g) || []).length * 100
      
      if (specificity > 300) {
        errors.push({
          id: `high_specificity_${lineNumber}`,
          line: lineNumber,
          column: 1,
          severity: 'warning' as ErrorSeverity,
          message: 'Selector has very high specificity, may be hard to override',
          rule: 'css-high-specificity',
          category: 'semantic',
          fixSuggestion: 'Reduce selector specificity for better maintainability'
        })
      }
    }

    return errors
  }

  private validateOverallStructure(code: string): DebugError[] {
    const errors: DebugError[] = []
    
    // Check for balanced braces
    const openBraces = (code.match(/\{/g) || []).length
    const closeBraces = (code.match(/\}/g) || []).length
    
    if (openBraces !== closeBraces) {
      errors.push({
        id: 'unbalanced_braces',
        line: 1,
        column: 1,
        severity: 'error' as ErrorSeverity,
        message: `Unbalanced braces: ${openBraces} opening, ${closeBraces} closing`,
        rule: 'css-balanced-braces',
        category: 'syntax',
        fixSuggestion: openBraces > closeBraces ? 'Add missing closing braces' : 'Remove extra closing braces'
      })
    }

    return errors
  }

  private validateResponsiveDesign(line: string, lineNumber: number): DebugError[] {
    const errors: DebugError[] = []
    
    // Check for fixed widths without responsive alternatives
    if (line.includes('width:') && line.includes('px') && !line.includes('max-width')) {
      errors.push({
        id: `fixed_width_${lineNumber}`,
        line: lineNumber,
        column: line.indexOf('width:') + 1,
        severity: 'warning' as ErrorSeverity,
        message: 'Fixed pixel widths may not be responsive',
        rule: 'css-responsive-width',
        category: 'semantic',
        fixSuggestion: 'Consider using relative units (%, em, rem) or max-width'
      })
    }

    return errors
  }

  private validateAccessibility(line: string, lineNumber: number): DebugError[] {
    const errors: DebugError[] = []
    
    // Check for insufficient color contrast
    if (line.includes('color:') && line.includes('#fff') && line.includes('background')) {
      errors.push({
        id: `color_contrast_${lineNumber}`,
        line: lineNumber,
        column: 1,
        severity: 'warning' as ErrorSeverity,
        message: 'Ensure sufficient color contrast for accessibility',
        rule: 'css-color-contrast',
        category: 'accessibility',
        fixSuggestion: 'Verify color contrast meets WCAG guidelines (4.5:1 for normal text)'
      })
    }

    // Check for focus indicators
    if (line.includes(':focus') && line.includes('outline: none')) {
      errors.push({
        id: `focus_outline_${lineNumber}`,
        line: lineNumber,
        column: line.indexOf('outline: none') + 1,
        severity: 'error' as ErrorSeverity,
        message: 'Removing focus outline harms accessibility',
        rule: 'css-focus-outline',
        category: 'accessibility',
        fixSuggestion: 'Provide alternative focus indicator instead of removing outline'
      })
    }

    return errors
  }

  private validateBrowserCompatibility(line: string, lineNumber: number): DebugError[] {
    const errors: DebugError[] = []
    
    // Check for modern CSS features that may need prefixes
    const modernFeatures = ['grid', 'flexbox', 'transform', 'transition', 'animation']
    
    modernFeatures.forEach(feature => {
      if (line.includes(feature) && !this.VENDOR_PREFIXES.some(prefix => line.includes(prefix))) {
        errors.push({
          id: `browser_compatibility_${lineNumber}`,
          line: lineNumber,
          column: line.indexOf(feature) + 1,
          severity: 'info' as ErrorSeverity,
          message: `${feature} may need vendor prefixes for older browsers`,
          rule: 'css-vendor-prefixes',
          category: 'compatibility',
          fixSuggestion: 'Consider adding vendor prefixes for better browser support'
        })
      }
    })

    return errors
  }

  private validateBestPractices(line: string, lineNumber: number): DebugError[] {
    const errors: DebugError[] = []
    
    // Check for !important usage
    if (line.includes('!important')) {
      errors.push({
        id: `important_usage_${lineNumber}`,
        line: lineNumber,
        column: line.indexOf('!important') + 1,
        severity: 'warning' as ErrorSeverity,
        message: '!important should be used sparingly',
        rule: 'css-important-usage',
        category: 'semantic',
        fixSuggestion: 'Try to avoid !important by improving selector specificity'
      })
    }

    return errors
  }

  private analyzePerformanceIssues(line: string, lineNumber: number): DebugError[] {
    const issues: DebugError[] = []
    
    // Check for expensive properties
    const expensiveProperties = ['box-shadow', 'border-radius', 'filter', 'backdrop-filter']
    
    expensiveProperties.forEach(property => {
      if (line.includes(property + ':')) {
        issues.push({
          id: `expensive_property_${lineNumber}`,
          line: lineNumber,
          column: line.indexOf(property) + 1,
          severity: 'info' as ErrorSeverity,
          message: `${property} can be expensive to render`,
          rule: 'css-expensive-property',
          category: 'performance',
          fixSuggestion: 'Use sparingly and consider performance impact'
        })
      }
    })

    return issues
  }

  private analyzeSelectorPerformance(line: string, lineNumber: number): DebugError[] {
    const issues: DebugError[] = []
    
    // Check for universal selector
    if (line.includes('* {') || line.includes('*,')) {
      issues.push({
        id: `universal_selector_${lineNumber}`,
        line: lineNumber,
        column: line.indexOf('*') + 1,
        severity: 'warning' as ErrorSeverity,
        message: 'Universal selector (*) can impact performance',
        rule: 'css-universal-selector',
        category: 'performance',
        fixSuggestion: 'Use more specific selectors when possible'
      })
    }

    return issues
  }

  private analyzeAnimationPerformance(line: string, lineNumber: number): DebugError[] {
    const issues: DebugError[] = []
    
    // Check for animating layout properties
    if (line.includes('animation:') || line.includes('transition:')) {
      const layoutProperties = ['width', 'height', 'padding', 'margin', 'top', 'left']
      
      layoutProperties.forEach(property => {
        if (line.includes(property)) {
          issues.push({
            id: `animate_layout_${lineNumber}`,
            line: lineNumber,
            column: 1,
            severity: 'warning' as ErrorSeverity,
            message: `Animating ${property} can cause layout thrashing`,
            rule: 'css-animate-layout',
            category: 'performance',
            fixSuggestion: 'Animate transform and opacity instead for better performance'
          })
        }
      })
    }

    return issues
  }

  private analyzeLayoutThrashing(line: string, lineNumber: number): DebugError[] {
    const issues: DebugError[] = []
    
    // Check for properties that trigger layout
    const layoutTriggers = ['width', 'height', 'padding', 'margin', 'border', 'font-size']
    
    if (line.includes(':hover') || line.includes(':focus')) {
      layoutTriggers.forEach(property => {
        if (line.includes(property + ':')) {
          issues.push({
            id: `layout_thrashing_${lineNumber}`,
            line: lineNumber,
            column: 1,
            severity: 'warning' as ErrorSeverity,
            message: `Changing ${property} on hover/focus can cause layout thrashing`,
            rule: 'css-layout-thrashing',
            category: 'performance',
            fixSuggestion: 'Use transform or other composite properties instead'
          })
        }
      })
    }

    return issues
  }

  private suggestPerformanceOptimizations(line: string, lineNumber: number): OptimizationSuggestion[] {
    const suggestions: OptimizationSuggestion[] = []
    
    // Suggest will-change for animations
    if (line.includes('animation:') && !line.includes('will-change')) {
      suggestions.push({
        id: `will_change_${lineNumber}`,
        type: 'performance',
        title: 'Add will-change property for animations',
        description: 'will-change helps browser optimize animations',
        impact: 'medium',
        effort: 'low',
        beforeCode: line.trim(),
        afterCode: line.trim() + '\n  will-change: transform;',
        estimatedImprovement: 'Smoother animations'
      })
    }

    return suggestions
  }

  private suggestModernCSS(line: string, lineNumber: number): OptimizationSuggestion[] {
    const suggestions: OptimizationSuggestion[] = []
    
    // Suggest CSS Grid over floats
    if (line.includes('float:')) {
      suggestions.push({
        id: `css_grid_${lineNumber}`,
        type: 'maintainability',
        title: 'Consider CSS Grid or Flexbox instead of floats',
        description: 'Modern layout methods are more powerful and maintainable',
        impact: 'high',
        effort: 'medium',
        beforeCode: line.trim(),
        afterCode: 'display: grid; /* or display: flex; */',
        estimatedImprovement: 'Better layout control and maintainability'
      })
    }

    return suggestions
  }

  private suggestMaintainabilityImprovements(line: string, lineNumber: number): OptimizationSuggestion[] {
    const suggestions: OptimizationSuggestion[] = []
    
    // Suggest CSS custom properties
    if (line.includes('#') && line.match(/#[0-9A-Fa-f]{6}/)) {
      suggestions.push({
        id: `css_variables_${lineNumber}`,
        type: 'maintainability',
        title: 'Consider using CSS custom properties for colors',
        description: 'CSS variables make color schemes easier to maintain',
        impact: 'medium',
        effort: 'low',
        beforeCode: line.trim(),
        afterCode: 'color: var(--primary-color);',
        estimatedImprovement: 'Easier theme management'
      })
    }

    return suggestions
  }

  private suggestAccessibilityImprovements(line: string, lineNumber: number): OptimizationSuggestion[] {
    const suggestions: OptimizationSuggestion[] = []
    
    // Suggest focus-visible for better focus management
    if (line.includes(':focus') && !line.includes(':focus-visible')) {
      suggestions.push({
        id: `focus_visible_${lineNumber}`,
        type: 'accessibility',
        title: 'Use :focus-visible for better focus management',
        description: ':focus-visible only shows focus for keyboard navigation',
        impact: 'medium',
        effort: 'low',
        beforeCode: line.trim(),
        afterCode: line.replace(':focus', ':focus-visible'),
        estimatedImprovement: 'Better user experience for keyboard and mouse users'
      })
    }

    return suggestions
  }

  private applyFix(line: string, error: DebugError): string {
    switch (error.rule) {
      case 'css-missing-semicolon':
        return line.trim() + ';'
      case 'css-invalid-color':
        return line.replace(/#[^;]+/, '#000000 /* Fix color format */')
      case 'css-focus-outline':
        return line.replace('outline: none', 'outline: 2px solid blue /* Provide focus indicator */')
      default:
        return line
    }
  }
}