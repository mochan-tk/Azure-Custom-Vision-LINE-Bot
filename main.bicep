// playground:https://bicepdemo.z22.web.core.windows.net/
param location string = resourceGroup().location
param random string
param projectId string
param publishedName string
param predictionKey string
param predictionEndpoint string
param secret string
param access string

var functionAppName = 'fn-${toLower(random)}'
var appServicePlanName = 'FunctionPlan'
var appInsightsName = 'AppInsights'
var storageAccountName = 'fnstor${toLower(substring(replace(random, '-', ''), 0, 18))}'
var containerName = 'files'

resource storageAccount 'Microsoft.Storage/storageAccounts@2021-06-01' = {
  name: storageAccountName
  location: location
  sku: {
    name: 'Standard_LRS'
  }
  kind: 'StorageV2'
  properties: {
    supportsHttpsTrafficOnly: true
    encryption: {
      services: {
        file: {
          keyType: 'Account'
          enabled: true
        }
        blob: {
          keyType: 'Account'
          enabled: true
        }
      }
      keySource: 'Microsoft.Storage'
    }
    accessTier: 'Hot'
  }
}

resource container 'Microsoft.Storage/storageAccounts/blobServices/containers@2021-06-01' = {
  name: '${storageAccount.name}/default/${containerName}'
  properties: {
    publicAccess:'Container'
  }
}

resource appInsights 'Microsoft.Insights/components@2020-02-02' = {
  name: appInsightsName
  location: location
  kind: 'web'
  properties: {
    Application_Type: 'web'
    publicNetworkAccessForIngestion: 'Enabled'
    publicNetworkAccessForQuery: 'Enabled'
  }
}

resource plan 'Microsoft.Web/serverfarms@2021-02-01' = {
  name: appServicePlanName
  location: location
  kind: 'linux'
  properties: {
    reserved: true
  }
  sku: {
    name: 'Y1'
  }
}

resource functionApp 'Microsoft.Web/sites@2021-02-01' = {
  name: functionAppName
  location: location
  kind: 'functionapp'
  properties: {
    serverFarmId: plan.id
    siteConfig: {
      appSettings: [
        {
          name: 'AzureWebJobsStorage'
          value: concat('DefaultEndpointsProtocol=https;AccountName=', storageAccount.name, ';AccountKey=', listKeys(storageAccount.id, '2019-06-01').keys[0].value)
        }
        {
          name: 'WEBSITE_CONTENTAZUREFILECONNECTIONSTRING'
          value: 'DefaultEndpointsProtocol=https;AccountName=${storageAccount.name};EndpointSuffix=${environment().suffixes.storage};AccountKey=${listKeys(storageAccount.id, storageAccount.apiVersion).keys[0].value}'
        }
        {
          name: 'APPINSIGHTS_INSTRUMENTATIONKEY'
          value: appInsights.properties.InstrumentationKey
        }
        {
          name: 'APPLICATIONINSIGHTS_CONNECTION_STRING'
          value: 'InstrumentationKey=${appInsights.properties.InstrumentationKey}'
        }
        {
          name: 'FUNCTIONS_WORKER_RUNTIME'
          value: 'node'
        }
        {
          name: 'WEBSITE_NODE_DEFAULT_VERSION'
          value: '~12'
        }
        {
          name: 'FUNCTIONS_EXTENSION_VERSION'
          value: '~3'
        }
        {
          name: 'PROJECT_ID'
          value: projectId
        }
        {
          name: 'PUBLISHED_NAME'
          value: publishedName
        }
        {
          name: 'PREDICTION_KEY'
          value: predictionKey
        }
        {
          name: 'PREDICTION_ENDPOINT'
          value: predictionEndpoint
        }
        {
          name: 'CHANNEL_SECRET'
          value: secret
        }
        {
          name: 'CHANNEL_ACCESS_TOKEN'
          value: access
        }
        {
          name: 'STORAGE_CONNECTION_STRING'
          value: 'DefaultEndpointsProtocol=https;AccountName=${storageAccount.name};EndpointSuffix=${environment().suffixes.storage};AccountKey=${listKeys(storageAccount.id, storageAccount.apiVersion).keys[0].value}'
        }
      ]
    }
    httpsOnly: true
  }
}

output functionAppName string = functionAppName
