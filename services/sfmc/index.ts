// SFMC services exports

export { SFMCIntegrationService } from './sfmc-integration.service'
export { SFMCSoapClient } from './sfmc-soap-client'

export type {
  SFMCAuthConfig,
  EncryptedCredentials,
  TokenInfo,
  RateLimitState,
  SFMCApiEndpoints
} from './sfmc-integration.service'

export type {
  SoapRequest,
  SoapFilter,
  SoapOptions,
  SoapResponse,
  SoapError
} from './sfmc-soap-client'