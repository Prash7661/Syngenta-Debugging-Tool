// SFMC SOAP API client wrapper with error handling and rate limiting

import { HttpClient } from '../../utils/http/client'
import { RetryManager } from '../../utils/errors/retry'
import { ErrorFactory } from '../../utils/errors/error-factory'
import { ErrorType } from '../../types/errors'

export interface SoapRequest {
  action: string
  objectType: string
  properties?: Record<string, any>
  filter?: SoapFilter
  options?: SoapOptions
}

export interface SoapFilter {
  property: string
  simpleOperator: 'equals' | 'notEquals' | 'greaterThan' | 'lessThan' | 'like'
  value: string | number | boolean
}

export interface SoapOptions {
  requestType?: 'Synchronous' | 'Asynchronous'
  queuePriority?: 'Low' | 'Medium' | 'High'
  saveOptions?: {
    saveAction: 'UpdateAdd' | 'UpdateOnly' | 'AddOnly'
  }
}

export interface SoapResponse<T = any> {
  overallStatus: string
  requestId: string
  results: T[]
  errors?: SoapError[]
}

export interface SoapError {
  errorCode: string
  statusCode: string
  statusMessage: string
  ordinalID?: number
}

export class SFMCSoapClient {
  private httpClient: HttpClient
  private soapEndpoint: string
  private accessToken: string

  constructor(soapEndpoint: string, accessToken: string) {
    this.soapEndpoint = soapEndpoint
    this.accessToken = accessToken
    
    this.httpClient = new HttpClient({
      timeout: 120000, // SOAP can be slower
      retries: 2,
      headers: {
        'Content-Type': 'text/xml; charset=utf-8',
        'SOAPAction': ''
      }
    })
  }

  /**
   * Update access token
   */
  updateToken(accessToken: string): void {
    this.accessToken = accessToken
  }

  /**
   * Retrieve objects from SFMC via SOAP
   */
  async retrieve<T = any>(request: SoapRequest): Promise<SoapResponse<T>> {
    const soapEnvelope = this.buildRetrieveEnvelope(request)
    
    return RetryManager.execute(async () => {
      const response = await this.httpClient.post<string>(
        this.soapEndpoint,
        soapEnvelope,
        {
          headers: {
            'Content-Type': 'text/xml; charset=utf-8',
            'SOAPAction': 'Retrieve'
          }
        }
      )

      return this.parseSoapResponse<T>(response.data)
    })
  }

  /**
   * Create objects in SFMC via SOAP
   */
  async create<T = any>(request: SoapRequest): Promise<SoapResponse<T>> {
    const soapEnvelope = this.buildCreateEnvelope(request)
    
    return RetryManager.execute(async () => {
      const response = await this.httpClient.post<string>(
        this.soapEndpoint,
        soapEnvelope,
        {
          headers: {
            'Content-Type': 'text/xml; charset=utf-8',
            'SOAPAction': 'Create'
          }
        }
      )

      return this.parseSoapResponse<T>(response.data)
    })
  }

  /**
   * Update objects in SFMC via SOAP
   */
  async update<T = any>(request: SoapRequest): Promise<SoapResponse<T>> {
    const soapEnvelope = this.buildUpdateEnvelope(request)
    
    return RetryManager.execute(async () => {
      const response = await this.httpClient.post<string>(
        this.soapEndpoint,
        soapEnvelope,
        {
          headers: {
            'Content-Type': 'text/xml; charset=utf-8',
            'SOAPAction': 'Update'
          }
        }
      )

      return this.parseSoapResponse<T>(response.data)
    })
  }

  /**
   * Delete objects in SFMC via SOAP
   */
  async delete<T = any>(request: SoapRequest): Promise<SoapResponse<T>> {
    const soapEnvelope = this.buildDeleteEnvelope(request)
    
    return RetryManager.execute(async () => {
      const response = await this.httpClient.post<string>(
        this.soapEndpoint,
        soapEnvelope,
        {
          headers: {
            'Content-Type': 'text/xml; charset=utf-8',
            'SOAPAction': 'Delete'
          }
        }
      )

      return this.parseSoapResponse<T>(response.data)
    })
  }

  /**
   * Perform query via SOAP
   */
  async query<T = any>(request: SoapRequest): Promise<SoapResponse<T>> {
    const soapEnvelope = this.buildQueryEnvelope(request)
    
    return RetryManager.execute(async () => {
      const response = await this.httpClient.post<string>(
        this.soapEndpoint,
        soapEnvelope,
        {
          headers: {
            'Content-Type': 'text/xml; charset=utf-8',
            'SOAPAction': 'Query'
          }
        }
      )

      return this.parseSoapResponse<T>(response.data)
    })
  }

  // ===== SOAP ENVELOPE BUILDERS =====

  private buildRetrieveEnvelope(request: SoapRequest): string {
    const properties = this.buildPropertiesXml(request.properties)
    const filter = request.filter ? this.buildFilterXml(request.filter) : ''

    return `<?xml version="1.0" encoding="UTF-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/" xmlns:tns="http://exacttarget.com/wsdl/partnerAPI" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <soap:Header>
    <tns:fuelOAuth xmlns:tns="http://exacttarget.com/wsdl/partnerAPI">
      <tns:token>${this.accessToken}</tns:token>
    </tns:fuelOAuth>
  </soap:Header>
  <soap:Body>
    <RetrieveRequestMsg xmlns="http://exacttarget.com/wsdl/partnerAPI">
      <RetrieveRequest>
        <ObjectType>${request.objectType}</ObjectType>
        ${properties}
        ${filter}
      </RetrieveRequest>
    </RetrieveRequestMsg>
  </soap:Body>
</soap:Envelope>`
  }

  private buildCreateEnvelope(request: SoapRequest): string {
    const objects = this.buildObjectsXml(request.objectType, request.properties)
    const options = request.options ? this.buildOptionsXml(request.options) : ''

    return `<?xml version="1.0" encoding="UTF-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/" xmlns:tns="http://exacttarget.com/wsdl/partnerAPI" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <soap:Header>
    <tns:fuelOAuth xmlns:tns="http://exacttarget.com/wsdl/partnerAPI">
      <tns:token>${this.accessToken}</tns:token>
    </tns:fuelOAuth>
  </soap:Header>
  <soap:Body>
    <CreateRequest xmlns="http://exacttarget.com/wsdl/partnerAPI">
      ${options}
      ${objects}
    </CreateRequest>
  </soap:Body>
</soap:Envelope>`
  }

  private buildUpdateEnvelope(request: SoapRequest): string {
    const objects = this.buildObjectsXml(request.objectType, request.properties)
    const options = request.options ? this.buildOptionsXml(request.options) : ''

    return `<?xml version="1.0" encoding="UTF-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/" xmlns:tns="http://exacttarget.com/wsdl/partnerAPI" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <soap:Header>
    <tns:fuelOAuth xmlns:tns="http://exacttarget.com/wsdl/partnerAPI">
      <tns:token>${this.accessToken}</tns:token>
    </tns:fuelOAuth>
  </soap:Header>
  <soap:Body>
    <UpdateRequest xmlns="http://exacttarget.com/wsdl/partnerAPI">
      ${options}
      ${objects}
    </UpdateRequest>
  </soap:Body>
</soap:Envelope>`
  }

  private buildDeleteEnvelope(request: SoapRequest): string {
    const objects = this.buildObjectsXml(request.objectType, request.properties)
    const options = request.options ? this.buildOptionsXml(request.options) : ''

    return `<?xml version="1.0" encoding="UTF-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/" xmlns:tns="http://exacttarget.com/wsdl/partnerAPI" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <soap:Header>
    <tns:fuelOAuth xmlns:tns="http://exacttarget.com/wsdl/partnerAPI">
      <tns:token>${this.accessToken}</tns:token>
    </tns:fuelOAuth>
  </soap:Header>
  <soap:Body>
    <DeleteRequest xmlns="http://exacttarget.com/wsdl/partnerAPI">
      ${options}
      ${objects}
    </DeleteRequest>
  </soap:Body>
</soap:Envelope>`
  }

  private buildQueryEnvelope(request: SoapRequest): string {
    const properties = this.buildPropertiesXml(request.properties)
    const filter = request.filter ? this.buildFilterXml(request.filter) : ''

    return `<?xml version="1.0" encoding="UTF-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/" xmlns:tns="http://exacttarget.com/wsdl/partnerAPI" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <soap:Header>
    <tns:fuelOAuth xmlns:tns="http://exacttarget.com/wsdl/partnerAPI">
      <tns:token>${this.accessToken}</tns:token>
    </tns:fuelOAuth>
  </soap:Header>
  <soap:Body>
    <QueryRequest xmlns="http://exacttarget.com/wsdl/partnerAPI">
      <ObjectType>${request.objectType}</ObjectType>
      ${properties}
      ${filter}
    </QueryRequest>
  </soap:Body>
</soap:Envelope>`
  }

  // ===== XML BUILDERS =====

  private buildPropertiesXml(properties?: Record<string, any>): string {
    if (!properties) return ''
    
    return Object.keys(properties)
      .map(key => `<Properties>${this.escapeXml(key)}</Properties>`)
      .join('\n')
  }

  private buildObjectsXml(objectType: string, properties?: Record<string, any>): string {
    if (!properties) return ''

    const propertiesXml = Object.entries(properties)
      .map(([key, value]) => `<${key}>${this.escapeXml(String(value))}</${key}>`)
      .join('\n')

    return `<Objects xsi:type="${objectType}">
      ${propertiesXml}
    </Objects>`
  }

  private buildFilterXml(filter: SoapFilter): string {
    return `<Filter xsi:type="SimpleFilterPart">
      <Property>${this.escapeXml(filter.property)}</Property>
      <SimpleOperator>${filter.simpleOperator}</SimpleOperator>
      <Value>${this.escapeXml(String(filter.value))}</Value>
    </Filter>`
  }

  private buildOptionsXml(options: SoapOptions): string {
    let optionsXml = ''

    if (options.requestType) {
      optionsXml += `<RequestType>${options.requestType}</RequestType>\n`
    }

    if (options.queuePriority) {
      optionsXml += `<QueuePriority>${options.queuePriority}</QueuePriority>\n`
    }

    if (options.saveOptions) {
      optionsXml += `<SaveOptions>
        <SaveAction>${options.saveOptions.saveAction}</SaveAction>
      </SaveOptions>\n`
    }

    return optionsXml ? `<Options>${optionsXml}</Options>` : ''
  }

  // ===== RESPONSE PARSING =====

  private parseSoapResponse<T>(xmlResponse: string): SoapResponse<T> {
    try {
      // This is a simplified XML parser - in production, use a proper XML parser
      const overallStatus = this.extractXmlValue(xmlResponse, 'OverallStatus') || 'Unknown'
      const requestId = this.extractXmlValue(xmlResponse, 'RequestID') || ''
      
      // Extract results (simplified)
      const results: T[] = []
      
      // Extract errors if any
      const errors: SoapError[] = []
      const errorMatches = xmlResponse.match(/<StatusCode>([^<]+)<\/StatusCode>/g)
      if (errorMatches) {
        errorMatches.forEach(match => {
          const statusCode = this.extractXmlValue(match, 'StatusCode')
          if (statusCode && statusCode !== 'OK') {
            errors.push({
              errorCode: statusCode,
              statusCode,
              statusMessage: this.extractXmlValue(xmlResponse, 'StatusMessage') || 'Unknown error'
            })
          }
        })
      }

      return {
        overallStatus,
        requestId,
        results,
        errors: errors.length > 0 ? errors : undefined
      }
    } catch (error) {
      throw ErrorFactory.createSFMCError(
        'Failed to parse SOAP response',
        'SOAP_PARSE_ERROR',
        error instanceof Error ? error.message : 'Unknown parsing error'
      )
    }
  }

  private extractXmlValue(xml: string, tagName: string): string | null {
    const regex = new RegExp(`<${tagName}>([^<]+)<\/${tagName}>`)
    const match = xml.match(regex)
    return match ? match[1] : null
  }

  private escapeXml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;')
  }
}