import { CodeLanguage } from '../../types/models'
import { Logger } from '../../utils/errors/error-handler'

export interface SFMCContext {
  dataExtensions?: string[]
  functions?: string[]
  variables?: Record<string, string>
  bestPractices?: string[]
  commonPatterns?: string[]
}

export class SFMCContextProvider {
  private logger = new Logger('SFMCContextProvider')

  async getSFMCContext(language?: CodeLanguage): Promise<SFMCContext | undefined> {
    if (!language || !this.isSFMCLanguage(language)) {
      return undefined
    }

    try {
      switch (language) {
        case 'ampscript':
          return this.getAMPScriptContext()
        case 'ssjs':
          return this.getSSJSContext()
        case 'sql':
          return this.getSQLContext()
        default:
          return undefined
      }
    } catch (error) {
      this.logger.error('Failed to get SFMC context', { language, error })
      return undefined
    }
  }

  private getAMPScriptContext(): SFMCContext {
    return {
      functions: [
        // String Functions
        'Concat', 'Length', 'Substring', 'Replace', 'Trim', 'UpperCase', 'LowerCase',
        'ProperCase', 'IndexOf', 'RegExMatch', 'Base64Encode', 'Base64Decode',
        
        // Date Functions
        'Now', 'DateAdd', 'DateDiff', 'Format', 'FormatDate', 'SystemDateToLocalDate',
        
        // Math Functions
        'Add', 'Subtract', 'Multiply', 'Divide', 'Mod', 'Random',
        
        // Data Functions
        'Lookup', 'LookupRows', 'LookupOrderedRows', 'InsertData', 'UpdateData', 'DeleteData',
        'UpsertData', 'CreateSalesforceObject', 'UpdateSingleSalesforceObject',
        
        // Utility Functions
        'IIF', 'IsNull', 'Empty', 'Field', 'AttributeValue', 'RequestParameter',
        'CloudPagesURL', 'RedirectTo', 'HTTPGet', 'HTTPPost',
        
        // Personalization Functions
        'PersonalizationString', 'TreatAsContent', 'ContentBlockByName', 'ContentBlockById',
        
        // Encryption Functions
        'EncryptSymmetric', 'DecryptSymmetric', 'MD5', 'SHA1', 'SHA256'
      ],
      
      variables: {
        'emailaddr': 'Subscriber email address',
        'emailname': 'Subscriber email name',
        'firstname': 'Subscriber first name',
        'lastname': 'Subscriber last name',
        'subscriberid': 'Subscriber ID',
        'listid': 'List ID',
        'jobid': 'Job ID',
        'batchid': 'Batch ID',
        'memberid': 'Member ID'
      },
      
      bestPractices: [
        'Always use TreatAsContent() for dynamic content that might contain AMPScript',
        'Use proper error handling with IIF() and IsNull() functions',
        'Minimize database lookups by caching results in variables',
        'Use LookupRows() instead of multiple Lookup() calls for better performance',
        'Always validate input parameters before using them',
        'Use proper escaping for HTML output to prevent XSS',
        'Keep AMPScript blocks as small as possible for better email rendering',
        'Use comments to document complex logic'
      ],
      
      commonPatterns: [
        'Personalization: %%=ProperCase(Field("FirstName"))=%%',
        'Conditional content: %%[IF @variable == "value" THEN]%% content %%[ENDIF]%%',
        'Data lookup: %%[SET @result = Lookup("DataExtension", "Field", "Key", @keyValue)]%%',
        'Date formatting: %%=FormatDate(Now(), "MM/dd/yyyy")=%%',
        'URL building: %%=CloudPagesURL(123, "param", @value)=%%'
      ]
    }
  }

  private getSSJSContext(): SFMCContext {
    return {
      functions: [
        // Platform Core
        'Platform.Load', 'Platform.Function.ParseJSON', 'Platform.Function.Stringify',
        'Platform.Request.GetRequestHeader', 'Platform.Request.GetFormField',
        'Platform.Request.GetQueryStringParameter', 'Platform.Response.SetResponseHeader',
        'Platform.Response.Redirect', 'Platform.Response.SetStatusCode',
        
        // Data Extension Operations
        'DataExtension.Init', 'DataExtension.Retrieve', 'DataExtension.Add',
        'DataExtension.Update', 'DataExtension.Remove',
        
        // HTTP Operations
        'HTTP.Get', 'HTTP.Post', 'HTTP.Put', 'HTTP.Delete',
        
        // Utility Functions
        'Guid', 'Now', 'DateExtension.DateAdd', 'DateExtension.DateDiff',
        
        // WSProxy Operations
        'WSProxy', 'WSProxy.retrieve', 'WSProxy.create', 'WSProxy.update', 'WSProxy.delete',
        
        // Script Operations
        'Script.Util.HttpRequest', 'Script.Util.WSProxy'
      ],
      
      variables: {
        'Platform': 'Core SFMC Platform object',
        'Variable': 'Variable object for getting/setting values',
        'Request': 'HTTP request object',
        'Response': 'HTTP response object'
      },
      
      bestPractices: [
        'Always use try-catch blocks for error handling',
        'Use Platform.Load() to load required libraries',
        'Validate all input parameters before processing',
        'Use proper logging with Write() for debugging',
        'Handle API rate limits and timeouts gracefully',
        'Use WSProxy for Salesforce API operations',
        'Cache frequently accessed data to improve performance',
        'Use proper JSON parsing and validation'
      ],
      
      commonPatterns: [
        'Library loading: Platform.Load("Core", "1");',
        'Data retrieval: var de = DataExtension.Init("DataExtensionKey");',
        'HTTP request: var result = HTTP.Get("https://api.example.com");',
        'JSON parsing: var obj = Platform.Function.ParseJSON(jsonString);',
        'Error handling: try { /* code */ } catch(ex) { Write("Error: " + ex); }'
      ]
    }
  }

  private getSQLContext(): SFMCContext {
    return {
      functions: [
        // Date Functions
        'GETDATE', 'DATEADD', 'DATEDIFF', 'YEAR', 'MONTH', 'DAY',
        'CONVERT', 'CAST', 'FORMAT',
        
        // String Functions
        'LEN', 'LEFT', 'RIGHT', 'SUBSTRING', 'CHARINDEX', 'REPLACE',
        'UPPER', 'LOWER', 'LTRIM', 'RTRIM', 'CONCAT',
        
        // Aggregate Functions
        'COUNT', 'SUM', 'AVG', 'MIN', 'MAX', 'DISTINCT',
        
        // Conditional Functions
        'CASE', 'WHEN', 'THEN', 'ELSE', 'END', 'ISNULL', 'COALESCE',
        
        // Math Functions
        'ROUND', 'CEILING', 'FLOOR', 'ABS', 'POWER', 'SQRT',
        
        // Conversion Functions
        'TRY_CAST', 'TRY_CONVERT', 'PARSE', 'TRY_PARSE'
      ],
      
      bestPractices: [
        'Use proper indexing on Data Extension keys for better performance',
        'Limit result sets with TOP clause to avoid timeouts',
        'Use appropriate JOIN types (INNER, LEFT, RIGHT) based on data relationships',
        'Always include WHERE clauses to filter data effectively',
        'Use CASE statements for conditional logic instead of multiple queries',
        'Avoid SELECT * and specify only needed columns',
        'Use proper data types in comparisons and calculations',
        'Consider query execution time limits in SFMC (30 seconds for automation)'
      ],
      
      commonPatterns: [
        'Data selection: SELECT TOP 1000 EmailAddress, FirstName FROM Subscribers WHERE Status = \'Active\'',
        'Date filtering: WHERE CreatedDate >= DATEADD(DAY, -30, GETDATE())',
        'String manipulation: SELECT UPPER(LTRIM(RTRIM(FirstName))) AS CleanFirstName',
        'Conditional logic: CASE WHEN Age >= 18 THEN \'Adult\' ELSE \'Minor\' END AS AgeGroup',
        'Data joining: SELECT s.EmailAddress, p.ProductName FROM Subscribers s INNER JOIN Purchases p ON s.SubscriberKey = p.SubscriberKey'
      ],
      
      dataExtensions: [
        'Subscribers', 'Sends', 'Opens', 'Clicks', 'Bounces', 'Unsubscribes',
        'Complaints', 'SurveyResponses', 'PurchaseData', 'CustomerProfiles'
      ]
    }
  }

  private isSFMCLanguage(language: CodeLanguage): boolean {
    return language === 'ampscript' || language === 'ssjs' || language === 'sql'
  }
}