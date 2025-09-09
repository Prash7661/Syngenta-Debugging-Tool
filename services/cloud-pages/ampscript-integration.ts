/**
 * AMPScript Integration Service
 * Handles AMPScript generation and integration for dynamic content in SFMC cloud pages
 */

import { 
  PageConfiguration, 
  ComponentConfiguration 
} from '../../types/cloud-pages';

export interface AMPScriptConfig {
  dataExtensions: string[];
  subscriberData: boolean;
  personalization: boolean;
  formHandling: boolean;
  tracking: boolean;
}

export interface AMPScriptBlock {
  type: 'header' | 'inline' | 'footer';
  content: string;
  description: string;
}

export class AMPScriptIntegration {
  
  /**
   * Generate AMPScript for dynamic content based on configuration
   */
  generateAMPScript(config: PageConfiguration): AMPScriptBlock[] {
    const blocks: AMPScriptBlock[] = [];

    // Header AMPScript - Variable declarations and data retrieval
    blocks.push(this.generateHeaderAMPScript(config));

    // Component-specific AMPScript
    config.components.forEach(component => {
      if (component.ampscript) {
        blocks.push(this.generateComponentAMPScript(component));
      }
    });

    // Form handling AMPScript
    const hasForm = config.components.some(c => c.type === 'form');
    if (hasForm) {
      blocks.push(this.generateFormHandlingAMPScript(config));
    }

    // Data Extension integration
    if (config.advancedOptions.dataExtensionIntegration?.length) {
      blocks.push(this.generateDataExtensionAMPScript(config.advancedOptions.dataExtensionIntegration));
    }

    // Personalization AMPScript
    blocks.push(this.generatePersonalizationAMPScript(config));

    // Tracking AMPScript
    blocks.push(this.generateTrackingAMPScript(config));

    return blocks.filter(block => block.content.trim().length > 0);
  }

  /**
   * Generate header AMPScript with variable declarations
   */
  private generateHeaderAMPScript(config: PageConfiguration): AMPScriptBlock {
    let ampscript = `%%[
  /* Page: ${config.pageSettings.pageName} */
  /* Generated: %%=FormatDate(Now(), "yyyy-MM-dd HH:mm:ss")=%% */
  
  /* Initialize core variables */
  VAR @subscriberKey, @emailAddress, @firstName, @lastName
  VAR @pageTitle, @pageDescription, @currentDate
  VAR @errorMessage, @successMessage, @formSubmitted
  
  /* Get subscriber information */
  SET @subscriberKey = _subscriberkey
  SET @emailAddress = emailaddr
  SET @currentDate = Now()
  
  /* Set page metadata */
  SET @pageTitle = "${config.pageSettings.title || config.pageSettings.pageName}"
  SET @pageDescription = "${config.pageSettings.description || ''}"
  
  /* Initialize form variables */
  SET @formSubmitted = RequestParameter("submitted")
  SET @errorMessage = ""
  SET @successMessage = ""
`;

    // Add data extension variables if configured
    if (config.advancedOptions.dataExtensionIntegration?.length) {
      config.advancedOptions.dataExtensionIntegration.forEach(de => {
        ampscript += `  VAR @${de}Rows, @${de}RowCount, @${de}Data\n`;
      });
    }

    ampscript += `]%%`;

    return {
      type: 'header',
      content: ampscript,
      description: 'Header AMPScript with variable declarations and subscriber data'
    };
  }

  /**
   * Generate component-specific AMPScript
   */
  private generateComponentAMPScript(component: ComponentConfiguration): AMPScriptBlock {
    return {
      type: 'inline',
      content: component.ampscript || '',
      description: `AMPScript for ${component.type} component (${component.id})`
    };
  }

  /**
   * Generate form handling AMPScript
   */
  private generateFormHandlingAMPScript(config: PageConfiguration): AMPScriptBlock {
    const formComponents = config.components.filter(c => c.type === 'form');
    
    let ampscript = `%%[
  /* Form Handling Logic */
  IF @formSubmitted == "true" THEN
    
    /* Get form data */
`;

    // Generate form field processing for each form
    formComponents.forEach(form => {
      const fields = form.props.fields || [];
      fields.forEach((field: any) => {
        ampscript += `    VAR @${field.name}\n`;
        ampscript += `    SET @${field.name} = RequestParameter("${field.name}")\n`;
      });
    });

    ampscript += `
    /* Validate required fields */
    VAR @isValid
    SET @isValid = "true"
    
`;

    // Generate validation logic
    formComponents.forEach(form => {
      const fields = form.props.fields || [];
      fields.forEach((field: any) => {
        if (field.required) {
          ampscript += `    IF Empty(@${field.name}) THEN\n`;
          ampscript += `      SET @errorMessage = Concat(@errorMessage, "${field.label || field.name} is required. ")\n`;
          ampscript += `      SET @isValid = "false"\n`;
          ampscript += `    ENDIF\n`;
        }
        
        if (field.type === 'email') {
          ampscript += `    IF NOT Empty(@${field.name}) AND NOT ValidateEmail(@${field.name}) THEN\n`;
          ampscript += `      SET @errorMessage = Concat(@errorMessage, "Please enter a valid email address. ")\n`;
          ampscript += `      SET @isValid = "false"\n`;
          ampscript += `    ENDIF\n`;
        }
      });
    });

    ampscript += `
    /* Process form if valid */
    IF @isValid == "true" THEN
      
      /* Insert/Update data extension record */
      VAR @insertResult
      
      /* Example: Insert into Subscribers data extension */
      SET @insertResult = InsertData("Subscribers",
        "SubscriberKey", @subscriberKey,
        "EmailAddress", @emailAddress,
        "FirstName", @firstName,
        "LastName", @lastName,
        "SubmissionDate", @currentDate
      )
      
      IF @insertResult > 0 THEN
        SET @successMessage = "Thank you! Your information has been submitted successfully."
        
        /* Optional: Send confirmation email */
        /* SendEmailToSubscriber(@subscriberKey, "Confirmation_Email_Key") */
        
      ELSE
        SET @errorMessage = "There was an error processing your request. Please try again."
      ENDIF
      
    ENDIF
    
  ENDIF
]%%`;

    return {
      type: 'inline',
      content: ampscript,
      description: 'Form handling and validation AMPScript'
    };
  }

  /**
   * Generate data extension integration AMPScript
   */
  private generateDataExtensionAMPScript(dataExtensions: string[]): AMPScriptBlock {
    let ampscript = `%%[
  /* Data Extension Integration */
  
`;

    dataExtensions.forEach(de => {
      ampscript += `  /* Retrieve data from ${de} */
  SET @${de}Rows = LookupRows("${de}", "SubscriberKey", @subscriberKey)
  SET @${de}RowCount = RowCount(@${de}Rows)
  
  IF @${de}RowCount > 0 THEN
    SET @${de}Data = Row(@${de}Rows, 1)
    /* Extract specific fields as needed */
    /* VAR @${de}Field1, @${de}Field2 */
    /* SET @${de}Field1 = Field(@${de}Data, "FieldName1") */
    /* SET @${de}Field2 = Field(@${de}Data, "FieldName2") */
  ENDIF
  
`;
    });

    ampscript += `]%%`;

    return {
      type: 'inline',
      content: ampscript,
      description: 'Data extension lookup and data retrieval'
    };
  }

  /**
   * Generate personalization AMPScript
   */
  private generatePersonalizationAMPScript(config: PageConfiguration): AMPScriptBlock {
    let ampscript = `%%[
  /* Personalization Logic */
  
  /* Get subscriber attributes */
  SET @firstName = AttributeValue("FirstName")
  SET @lastName = AttributeValue("LastName")
  
  /* Set default values if empty */
  IF Empty(@firstName) THEN
    SET @firstName = "Valued Customer"
  ENDIF
  
  /* Create personalized greeting */
  VAR @greeting
  SET @greeting = Concat("Hello, ", @firstName)
  
  /* Time-based personalization */
  VAR @currentHour, @timeGreeting
  SET @currentHour = DatePart(@currentDate, "H")
  
  IF @currentHour < 12 THEN
    SET @timeGreeting = "Good morning"
  ELSEIF @currentHour < 17 THEN
    SET @timeGreeting = "Good afternoon"
  ELSE
    SET @timeGreeting = "Good evening"
  ENDIF
  
  /* Combine greetings */
  SET @greeting = Concat(@timeGreeting, ", ", @firstName, "!")
  
]%%`;

    return {
      type: 'inline',
      content: ampscript,
      description: 'Personalization and dynamic greeting logic'
    };
  }

  /**
   * Generate tracking AMPScript
   */
  private generateTrackingAMPScript(config: PageConfiguration): AMPScriptBlock {
    let ampscript = `%%[
  /* Tracking and Analytics */
  
  /* Track page view */
  VAR @trackingResult
  SET @trackingResult = InsertData("PageViews",
    "SubscriberKey", @subscriberKey,
    "PageName", "${config.pageSettings.pageName}",
    "ViewDate", @currentDate,
    "UserAgent", RequestParameter("HTTP_USER_AGENT"),
    "IPAddress", RequestParameter("REMOTE_ADDR")
  )
  
  /* Track UTM parameters if present */
  VAR @utmSource, @utmMedium, @utmCampaign
  SET @utmSource = RequestParameter("utm_source")
  SET @utmMedium = RequestParameter("utm_medium")
  SET @utmCampaign = RequestParameter("utm_campaign")
  
  IF NOT Empty(@utmSource) OR NOT Empty(@utmMedium) OR NOT Empty(@utmCampaign) THEN
    SET @trackingResult = InsertData("UTMTracking",
      "SubscriberKey", @subscriberKey,
      "PageName", "${config.pageSettings.pageName}",
      "UTMSource", @utmSource,
      "UTMMedium", @utmMedium,
      "UTMCampaign", @utmCampaign,
      "TrackingDate", @currentDate
    )
  ENDIF
  
]%%`;

    return {
      type: 'footer',
      content: ampscript,
      description: 'Page view and UTM parameter tracking'
    };
  }

  /**
   * Generate AMPScript for dynamic content blocks
   */
  generateDynamicContentAMPScript(contentType: string, config: any): string {
    switch (contentType) {
      case 'conditional-content':
        return this.generateConditionalContentAMPScript(config);
      case 'dynamic-list':
        return this.generateDynamicListAMPScript(config);
      case 'personalized-offers':
        return this.generatePersonalizedOffersAMPScript(config);
      default:
        return '';
    }
  }

  /**
   * Generate conditional content AMPScript
   */
  private generateConditionalContentAMPScript(config: any): string {
    return `%%[
  /* Conditional Content Display */
  VAR @showContent, @userSegment
  
  /* Determine user segment based on data */
  SET @userSegment = AttributeValue("Segment")
  
  IF @userSegment == "Premium" THEN
    SET @showContent = "premium"
  ELSEIF @userSegment == "Standard" THEN
    SET @showContent = "standard"
  ELSE
    SET @showContent = "basic"
  ENDIF
]%%

%%[ IF @showContent == "premium" THEN ]%%
  <!-- Premium content here -->
%%[ ELSEIF @showContent == "standard" THEN ]%%
  <!-- Standard content here -->
%%[ ELSE ]%%
  <!-- Basic content here -->
%%[ ENDIF ]%%`;
  }

  /**
   * Generate dynamic list AMPScript
   */
  private generateDynamicListAMPScript(config: any): string {
    return `%%[
  /* Dynamic List Generation */
  VAR @listRows, @listRowCount, @i, @currentRow
  
  /* Get list data from data extension */
  SET @listRows = LookupRows("${config.dataExtension || 'ListData'}", "Active", "true")
  SET @listRowCount = RowCount(@listRows)
]%%

%%[ IF @listRowCount > 0 THEN ]%%
<ul class="dynamic-list">
%%[ FOR @i = 1 TO @listRowCount DO ]%%
  %%[ SET @currentRow = Row(@listRows, @i) ]%%
  <li>
    <h3>%%=Field(@currentRow, "Title")=%%</h3>
    <p>%%=Field(@currentRow, "Description")=%%</p>
  </li>
%%[ NEXT @i ]%%
</ul>
%%[ ELSE ]%%
<p>No items available at this time.</p>
%%[ ENDIF ]%%`;
  }

  /**
   * Generate personalized offers AMPScript
   */
  private generatePersonalizedOffersAMPScript(config: any): string {
    return `%%[
  /* Personalized Offers */
  VAR @offerRows, @offerRowCount, @userPreferences, @recommendedOffer
  
  /* Get user preferences */
  SET @userPreferences = AttributeValue("Preferences")
  
  /* Get relevant offers based on preferences */
  SET @offerRows = LookupRows("Offers", "Category", @userPreferences, "Active", "true")
  SET @offerRowCount = RowCount(@offerRows)
  
  IF @offerRowCount > 0 THEN
    /* Get the first matching offer */
    SET @recommendedOffer = Row(@offerRows, 1)
  ENDIF
]%%

%%[ IF NOT Empty(@recommendedOffer) THEN ]%%
<div class="personalized-offer">
  <h3>Special Offer for You!</h3>
  <h4>%%=Field(@recommendedOffer, "Title")=%%</h4>
  <p>%%=Field(@recommendedOffer, "Description")=%%</p>
  <p class="offer-code">Use code: <strong>%%=Field(@recommendedOffer, "PromoCode")=%%</strong></p>
  <a href="%%=Field(@recommendedOffer, "OfferURL")=%%" class="btn btn-primary">Claim Offer</a>
</div>
%%[ ENDIF ]%%`;
  }

  /**
   * Generate AMPScript for form pre-population
   */
  generateFormPrePopulationAMPScript(formFields: string[]): string {
    let ampscript = `%%[
  /* Form Pre-population */
  
`;

    formFields.forEach(field => {
      ampscript += `  VAR @${field}Value\n`;
      ampscript += `  SET @${field}Value = AttributeValue("${field}")\n`;
    });

    ampscript += `]%%`;

    return ampscript;
  }

  /**
   * Generate AMPScript for email validation and formatting
   */
  generateEmailValidationAMPScript(): string {
    return `%%[
  /* Email Validation and Formatting */
  
  FUNCTION @ValidateAndFormatEmail(@email)
    VAR @cleanEmail, @isValid
    
    /* Clean and format email */
    SET @cleanEmail = Trim(Lowercase(@email))
    
    /* Validate email format */
    SET @isValid = ValidateEmail(@cleanEmail)
    
    IF @isValid THEN
      RETURN @cleanEmail
    ELSE
      RETURN ""
    ENDIF
  ENDFUNCTION
]%%`;
  }

  /**
   * Combine all AMPScript blocks into final output
   */
  combineAMPScriptBlocks(blocks: AMPScriptBlock[]): string {
    const headerBlocks = blocks.filter(b => b.type === 'header');
    const inlineBlocks = blocks.filter(b => b.type === 'inline');
    const footerBlocks = blocks.filter(b => b.type === 'footer');

    let combined = '';

    // Add header blocks
    if (headerBlocks.length > 0) {
      combined += '<!-- AMPScript Header -->\n';
      headerBlocks.forEach(block => {
        combined += `<!-- ${block.description} -->\n`;
        combined += block.content + '\n\n';
      });
    }

    // Add inline blocks
    if (inlineBlocks.length > 0) {
      combined += '<!-- AMPScript Inline Blocks -->\n';
      inlineBlocks.forEach(block => {
        combined += `<!-- ${block.description} -->\n`;
        combined += block.content + '\n\n';
      });
    }

    // Add footer blocks
    if (footerBlocks.length > 0) {
      combined += '<!-- AMPScript Footer -->\n';
      footerBlocks.forEach(block => {
        combined += `<!-- ${block.description} -->\n`;
        combined += block.content + '\n\n';
      });
    }

    return combined;
  }
}

export const ampscriptIntegration = new AMPScriptIntegration();