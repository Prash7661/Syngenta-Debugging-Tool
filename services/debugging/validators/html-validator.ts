import { LanguageValidator, DebugError, OptimizationSuggestion, ErrorSeverity } from '../../../types/debugging'

export class HTMLValidator implements LanguageValidator {
  private readonly HTML_TAGS = [
    'html', 'head', 'body', 'title', 'meta', 'link', 'script', 'style',
    'div', 'span', 'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'a', 'img', 'ul', 'ol', 'li', 'table', 'tr', 'td', 'th',
    'form', 'input', 'button', 'select', 'option', 'textarea'
  ]

  private readonly SELF_CLOSING_TAGS = [
    'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input',
    'link', 'meta', 'param', 'source', 'track', 'wbr'
  ]

  private readonly REQUIRED_ATTRIBUTES = {
    'img': ['src', 'alt'],
    'a': ['href'],
    'input': ['type'],
    'form': ['action'],
    'meta': ['content']
  }

  async validateSyntax(code: string): Promise<DebugError[]> {
    const errors: DebugError[] = []
    const lines = code.split('\n')

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      const lineNumber = i + 1

      // Check for unclosed tags
      errors.push(...this.validateTagClosure(line, lineNumber))
      
      // Check for malformed attributes
      errors.push(...this.validateAttributes(line, lineNumber))
      
      // Check for proper nesting
      errors.push(...this.validateNesting(line, lineNumber))
      
      // Check for DOCTYPE and basic structure
      errors.push(...this.validateDocumentStructure(line, lineNumber))
    }

    // Check for overall document structure
    errors.push(...this.validateOverallStructure(code))

    return errors
  }

  async validateSemantics(code: string): Promise<DebugError[]> {
    const errors: DebugError[] = []
    const lines = code.split('\n')

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      const lineNumber = i + 1

      // Check for accessibility issues
      errors.push(...this.validateAccessibility(line, lineNumber))
      
      // Check for SEO best practices
      errors.push(...this.validateSEO(line, lineNumber))
      
      // Check for required attributes
      errors.push(...this.validateRequiredAttributes(line, lineNumber))
      
      // Check for deprecated elements
      errors.push(...this.validateDeprecatedElements(line, lineNumber))
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
      issues.push(...this.analyzeLoadingPerformance(line, lineNumber))
      
      // Check for image optimization
      issues.push(...this.analyzeImageOptimization(line, lineNumber))
      
      // Check for script placement
      issues.push(...this.analyzeScriptPlacement(line, lineNumber))
      
      // Check for CSS optimization
      issues.push(...this.analyzeCSSOptimization(line, lineNumber))
    }

    return issues
  }

  async getOptimizationSuggestions(code: string): Promise<OptimizationSuggestion[]> {
    const suggestions: OptimizationSuggestion[] = []
    const lines = code.split('\n')

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      const lineNumber = i + 1

      // Suggest performance improvements
      suggestions.push(...this.suggestPerformanceImprovements(line, lineNumber))
      
      // Suggest accessibility improvements
      suggestions.push(...this.suggestAccessibilityImprovements(line, lineNumber))
      
      // Suggest SEO improvements
      suggestions.push(...this.suggestSEOImprovements(line, lineNumber))
      
      // Suggest modern HTML practices
      suggestions.push(...this.suggestModernPractices(line, lineNumber))
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

  private validateTagClosure(line: string, lineNumber: number): DebugError[] {
    const errors: DebugError[] = []
    
    // Find opening tags
    const openingTags = line.match(/<(\w+)(?:\s[^>]*)?>/g)
    const closingTags = line.match(/<\/(\w+)>/g)
    
    if (openingTags) {
      openingTags.forEach(tag => {
        const tagName = tag.match(/<(\w+)/)?.[1]?.toLowerCase()
        if (tagName && !this.SELF_CLOSING_TAGS.includes(tagName)) {
          const closingTag = `</${tagName}>`
          if (!line.includes(closingTag) && !tag.endsWith('/>')) {
            errors.push({
              id: `unclosed_tag_${lineNumber}_${tagName}`,
              line: lineNumber,
              column: line.indexOf(tag) + 1,
              severity: 'error' as ErrorSeverity,
              message: `Unclosed tag: ${tagName}`,
              rule: 'html-unclosed-tag',
              category: 'syntax',
              fixSuggestion: `Add closing tag: ${closingTag}`
            })
          }
        }
      })
    }

    // Check for self-closing tags with closing tags
    if (closingTags) {
      closingTags.forEach(tag => {
        const tagName = tag.match(/<\/(\w+)>/)?.[1]?.toLowerCase()
        if (tagName && this.SELF_CLOSING_TAGS.includes(tagName)) {
          errors.push({
            id: `self_closing_with_end_tag_${lineNumber}_${tagName}`,
            line: lineNumber,
            column: line.indexOf(tag) + 1,
            severity: 'warning' as ErrorSeverity,
            message: `Self-closing tag ${tagName} should not have closing tag`,
            rule: 'html-self-closing-tag',
            category: 'syntax',
            fixSuggestion: `Remove closing tag for self-closing element`
          })
        }
      })
    }

    return errors
  }

  private validateAttributes(line: string, lineNumber: number): DebugError[] {
    const errors: DebugError[] = []
    
    // Check for malformed attributes
    const malformedAttrs = line.match(/\w+=[^"'\s>]+(?=\s|>)/g)
    if (malformedAttrs) {
      malformedAttrs.forEach(attr => {
        errors.push({
          id: `malformed_attribute_${lineNumber}`,
          line: lineNumber,
          column: line.indexOf(attr) + 1,
          severity: 'warning' as ErrorSeverity,
          message: 'Attribute values should be quoted',
          rule: 'html-quoted-attributes',
          category: 'syntax',
          fixSuggestion: 'Wrap attribute value in quotes'
        })
      })
    }

    // Check for duplicate attributes
    const attributes = line.match(/(\w+)=/g)
    if (attributes) {
      const attrNames = attributes.map(attr => attr.replace('=', ''))
      const duplicates = attrNames.filter((name, index) => attrNames.indexOf(name) !== index)
      
      duplicates.forEach(duplicate => {
        errors.push({
          id: `duplicate_attribute_${lineNumber}_${duplicate}`,
          line: lineNumber,
          column: line.indexOf(duplicate + '=') + 1,
          severity: 'error' as ErrorSeverity,
          message: `Duplicate attribute: ${duplicate}`,
          rule: 'html-duplicate-attribute',
          category: 'syntax',
          fixSuggestion: `Remove duplicate ${duplicate} attribute`
        })
      })
    }

    return errors
  }

  private validateNesting(line: string, lineNumber: number): DebugError[] {
    const errors: DebugError[] = []
    
    // Check for invalid nesting (basic cases)
    if (line.includes('<p>') && line.includes('<div>')) {
      errors.push({
        id: `invalid_nesting_${lineNumber}`,
        line: lineNumber,
        column: 1,
        severity: 'error' as ErrorSeverity,
        message: 'Block elements like div cannot be nested inside p elements',
        rule: 'html-invalid-nesting',
        category: 'syntax',
        fixSuggestion: 'Use appropriate block-level container or inline elements'
      })
    }

    return errors
  }

  private validateDocumentStructure(line: string, lineNumber: number): DebugError[] {
    const errors: DebugError[] = []
    
    // Check for DOCTYPE
    if (lineNumber === 1 && !line.toLowerCase().includes('<!doctype')) {
      errors.push({
        id: `missing_doctype_${lineNumber}`,
        line: lineNumber,
        column: 1,
        severity: 'warning' as ErrorSeverity,
        message: 'Document should start with DOCTYPE declaration',
        rule: 'html-doctype',
        category: 'syntax',
        fixSuggestion: 'Add <!DOCTYPE html> at the beginning of the document'
      })
    }

    return errors
  }

  private validateOverallStructure(code: string): DebugError[] {
    const errors: DebugError[] = []
    const lowerCode = code.toLowerCase()
    
    // Check for required elements
    if (!lowerCode.includes('<html')) {
      errors.push({
        id: 'missing_html_tag',
        line: 1,
        column: 1,
        severity: 'error' as ErrorSeverity,
        message: 'Document missing html element',
        rule: 'html-required-structure',
        category: 'syntax',
        fixSuggestion: 'Add <html> root element'
      })
    }

    if (!lowerCode.includes('<head')) {
      errors.push({
        id: 'missing_head_tag',
        line: 1,
        column: 1,
        severity: 'error' as ErrorSeverity,
        message: 'Document missing head element',
        rule: 'html-required-structure',
        category: 'syntax',
        fixSuggestion: 'Add <head> element'
      })
    }

    if (!lowerCode.includes('<body')) {
      errors.push({
        id: 'missing_body_tag',
        line: 1,
        column: 1,
        severity: 'error' as ErrorSeverity,
        message: 'Document missing body element',
        rule: 'html-required-structure',
        category: 'syntax',
        fixSuggestion: 'Add <body> element'
      })
    }

    return errors
  }

  private validateAccessibility(line: string, lineNumber: number): DebugError[] {
    const errors: DebugError[] = []
    
    // Check for missing alt attributes on images
    if (line.includes('<img') && !line.includes('alt=')) {
      errors.push({
        id: `missing_alt_${lineNumber}`,
        line: lineNumber,
        column: line.indexOf('<img') + 1,
        severity: 'error' as ErrorSeverity,
        message: 'Image missing alt attribute for accessibility',
        rule: 'html-accessibility-alt',
        category: 'accessibility',
        fixSuggestion: 'Add alt attribute with descriptive text'
      })
    }

    // Check for form labels
    if (line.includes('<input') && !line.includes('aria-label') && !line.includes('id=')) {
      errors.push({
        id: `missing_label_${lineNumber}`,
        line: lineNumber,
        column: line.indexOf('<input') + 1,
        severity: 'warning' as ErrorSeverity,
        message: 'Form input should have associated label or aria-label',
        rule: 'html-accessibility-label',
        category: 'accessibility',
        fixSuggestion: 'Add label element or aria-label attribute'
      })
    }

    return errors
  }

  private validateSEO(line: string, lineNumber: number): DebugError[] {
    const errors: DebugError[] = []
    
    // Check for missing title
    if (line.includes('<head') && !line.includes('<title')) {
      errors.push({
        id: `missing_title_${lineNumber}`,
        line: lineNumber,
        column: 1,
        severity: 'warning' as ErrorSeverity,
        message: 'Page should have title element for SEO',
        rule: 'html-seo-title',
        category: 'semantic',
        fixSuggestion: 'Add <title> element in head section'
      })
    }

    // Check for meta description
    if (line.includes('<head') && !line.includes('name="description"')) {
      errors.push({
        id: `missing_meta_description_${lineNumber}`,
        line: lineNumber,
        column: 1,
        severity: 'info' as ErrorSeverity,
        message: 'Consider adding meta description for SEO',
        rule: 'html-seo-meta-description',
        category: 'semantic',
        fixSuggestion: 'Add <meta name="description" content="..."> in head'
      })
    }

    return errors
  }

  private validateRequiredAttributes(line: string, lineNumber: number): DebugError[] {
    const errors: DebugError[] = []
    
    Object.entries(this.REQUIRED_ATTRIBUTES).forEach(([tag, requiredAttrs]) => {
      if (line.includes(`<${tag}`)) {
        requiredAttrs.forEach(attr => {
          if (!line.includes(`${attr}=`)) {
            errors.push({
              id: `missing_required_attr_${lineNumber}_${tag}_${attr}`,
              line: lineNumber,
              column: line.indexOf(`<${tag}`) + 1,
              severity: 'error' as ErrorSeverity,
              message: `${tag} element missing required ${attr} attribute`,
              rule: 'html-required-attributes',
              category: 'semantic',
              fixSuggestion: `Add ${attr} attribute to ${tag} element`
            })
          }
        })
      }
    })

    return errors
  }

  private validateDeprecatedElements(line: string, lineNumber: number): DebugError[] {
    const errors: DebugError[] = []
    const deprecatedTags = ['center', 'font', 'marquee', 'blink', 'big', 'tt']
    
    deprecatedTags.forEach(tag => {
      if (line.includes(`<${tag}`)) {
        errors.push({
          id: `deprecated_element_${lineNumber}_${tag}`,
          line: lineNumber,
          column: line.indexOf(`<${tag}`) + 1,
          severity: 'warning' as ErrorSeverity,
          message: `${tag} element is deprecated`,
          rule: 'html-deprecated-elements',
          category: 'semantic',
          fixSuggestion: `Replace ${tag} with CSS styling or modern HTML elements`
        })
      }
    })

    return errors
  }

  private analyzeLoadingPerformance(line: string, lineNumber: number): DebugError[] {
    const issues: DebugError[] = []
    
    // Check for blocking scripts in head
    if (line.includes('<script') && line.includes('<head')) {
      issues.push({
        id: `blocking_script_${lineNumber}`,
        line: lineNumber,
        column: line.indexOf('<script') + 1,
        severity: 'warning' as ErrorSeverity,
        message: 'Scripts in head can block page rendering',
        rule: 'html-script-placement',
        category: 'performance',
        fixSuggestion: 'Move scripts to end of body or add async/defer attributes'
      })
    }

    return issues
  }

  private analyzeImageOptimization(line: string, lineNumber: number): DebugError[] {
    const issues: DebugError[] = []
    
    // Check for missing loading attribute
    if (line.includes('<img') && !line.includes('loading=')) {
      issues.push({
        id: `missing_lazy_loading_${lineNumber}`,
        line: lineNumber,
        column: line.indexOf('<img') + 1,
        severity: 'info' as ErrorSeverity,
        message: 'Consider adding loading="lazy" for images below the fold',
        rule: 'html-lazy-loading',
        category: 'performance',
        fixSuggestion: 'Add loading="lazy" attribute for better performance'
      })
    }

    return issues
  }

  private analyzeScriptPlacement(line: string, lineNumber: number): DebugError[] {
    const issues: DebugError[] = []
    
    // Check for inline scripts
    if (line.includes('<script>') && line.includes('</script>')) {
      issues.push({
        id: `inline_script_${lineNumber}`,
        line: lineNumber,
        column: line.indexOf('<script>') + 1,
        severity: 'warning' as ErrorSeverity,
        message: 'Inline scripts can impact performance and security',
        rule: 'html-inline-scripts',
        category: 'performance',
        fixSuggestion: 'Move scripts to external files'
      })
    }

    return issues
  }

  private analyzeCSSOptimization(line: string, lineNumber: number): DebugError[] {
    const issues: DebugError[] = []
    
    // Check for inline styles
    if (line.includes('style=')) {
      issues.push({
        id: `inline_styles_${lineNumber}`,
        line: lineNumber,
        column: line.indexOf('style=') + 1,
        severity: 'warning' as ErrorSeverity,
        message: 'Inline styles can impact maintainability',
        rule: 'html-inline-styles',
        category: 'performance',
        fixSuggestion: 'Move styles to external CSS file or style block'
      })
    }

    return issues
  }

  private suggestPerformanceImprovements(line: string, lineNumber: number): OptimizationSuggestion[] {
    const suggestions: OptimizationSuggestion[] = []
    
    // Suggest preloading for critical resources
    if (line.includes('<link') && line.includes('stylesheet')) {
      suggestions.push({
        id: `preload_css_${lineNumber}`,
        type: 'performance',
        title: 'Consider preloading critical CSS',
        description: 'Preloading critical CSS can improve page load performance',
        impact: 'medium',
        effort: 'low',
        beforeCode: line.trim(),
        afterCode: '<link rel="preload" href="critical.css" as="style" onload="this.onload=null;this.rel=\'stylesheet\'">',
        estimatedImprovement: '10-20% faster initial render'
      })
    }

    return suggestions
  }

  private suggestAccessibilityImprovements(line: string, lineNumber: number): OptimizationSuggestion[] {
    const suggestions: OptimizationSuggestion[] = []
    
    // Suggest semantic HTML
    if (line.includes('<div') && (line.includes('header') || line.includes('nav') || line.includes('main'))) {
      suggestions.push({
        id: `semantic_html_${lineNumber}`,
        type: 'accessibility',
        title: 'Use semantic HTML elements',
        description: 'Semantic elements improve accessibility and SEO',
        impact: 'high',
        effort: 'low',
        beforeCode: line.trim(),
        afterCode: line.replace('<div', '<header').replace('</div>', '</header>'),
        estimatedImprovement: 'Better accessibility and SEO'
      })
    }

    return suggestions
  }

  private suggestSEOImprovements(line: string, lineNumber: number): OptimizationSuggestion[] {
    const suggestions: OptimizationSuggestion[] = []
    
    // Suggest structured data
    if (line.includes('<head')) {
      suggestions.push({
        id: `structured_data_${lineNumber}`,
        type: 'maintainability',
        title: 'Add structured data for better SEO',
        description: 'Structured data helps search engines understand your content',
        impact: 'medium',
        effort: 'medium',
        beforeCode: line.trim(),
        afterCode: '<script type="application/ld+json">{"@context": "https://schema.org", ...}</script>',
        estimatedImprovement: 'Better search engine visibility'
      })
    }

    return suggestions
  }

  private suggestModernPractices(line: string, lineNumber: number): OptimizationSuggestion[] {
    const suggestions: OptimizationSuggestion[] = []
    
    // Suggest modern image formats
    if (line.includes('<img') && line.includes('.jpg')) {
      suggestions.push({
        id: `modern_image_format_${lineNumber}`,
        type: 'performance',
        title: 'Consider modern image formats',
        description: 'WebP and AVIF formats provide better compression',
        impact: 'medium',
        effort: 'medium',
        beforeCode: line.trim(),
        afterCode: '<picture><source srcset="image.webp" type="image/webp"><img src="image.jpg" alt="..."></picture>',
        estimatedImprovement: '20-50% smaller image sizes'
      })
    }

    return suggestions
  }

  private applyFix(line: string, error: DebugError): string {
    switch (error.rule) {
      case 'html-unclosed-tag':
        const tagMatch = line.match(/<(\w+)/)
        if (tagMatch) {
          const tagName = tagMatch[1]
          return line + `</${tagName}>`
        }
        break
      case 'html-quoted-attributes':
        return line.replace(/(\w+)=([^"'\s>]+)/g, '$1="$2"')
      case 'html-accessibility-alt':
        return line.replace(/<img([^>]*?)>/g, '<img$1 alt="Description needed">')
      case 'html-doctype':
        return '<!DOCTYPE html>\n' + line
      default:
        return line
    }
    return line
  }
}