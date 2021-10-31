//https://github.com/line/line-bot-sdk-nodejs/tree/next/examples/echo-bot
//https://himanago.hatenablog.com/entry/2020/04/23/205202
'use strict';

const line = require('@line/bot-sdk');
const createHandler = require("azure-function-express").createHandler;
const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { BlobServiceClient } = require("@azure/storage-blob");
const { getStreamData } = require('./helpers/stream.js'); 

const PredictionApi = require("@azure/cognitiveservices-customvision-prediction");
const msRest = require("@azure/ms-rest-js");

const projectId = process.env.PROJECT_ID
const publishedName = process.env.PUBLISHED_NAME
const predictionKey = process.env.PREDICTION_KEY
const predictionEndpoint = process.env.PREDICTION_ENDPOINT

const predictor_credentials = new msRest.ApiKeyCredentials({ inHeader: { "Prediction-key": predictionKey } });
const predictor = new PredictionApi.PredictionAPIClient(predictor_credentials, predictionEndpoint);

const blobServiceClient = BlobServiceClient.fromConnectionString(process.env.STORAGE_CONNECTION_STRING);
const containerClient = blobServiceClient.getContainerClient('files');

// create LINE SDK config from env variables
const config = {
  channelAccessToken: process.env.CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.CHANNEL_SECRET,
};

// create LINE SDK client
const client = new line.Client(config);

// create Express app
// about Express itself: https://expressjs.com/
const app = express();

// register a webhook handler with middleware
// about the middleware, please refer to doc
app.post('/api/linehttptriggeredfunction', line.middleware(config), (req, res) => {
  Promise
    .all(req.body.events.map(handleEvent))
    .then((result) => res.json(result))
    .catch((err) => {
      console.error(err);
      res.status(500).end();
    });
});

// event handler
async function handleEvent(event) {
  if (event.type !== 'message') {
    // ignore non-text-message event
    return Promise.resolve(null);
  } else if (event.message.type === 'image') {
    //https://developers.line.biz/ja/reference/messaging-api/#image-message
    
    //1.送られてきたネコの画像をいったんAzureのStrageサービスに保存
    const blobName = uuidv4() + '.jpg'
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);
    const stream = await client.getMessageContent(event.message.id);
    const data = await getStreamData(stream);
    blockBlobClient.uploadData(data);

    const imageUrl = {
      url: `https://${blobServiceClient.accountName}.blob.core.windows.net/files/${blobName}`
    };

    //2.保存した画像を、作成した機械学習モデルのPredictionにかけて、ネコの種類を予測させる
    const results = await predictor.classifyImageUrl(projectId, publishedName, imageUrl);

    let result = ""
    let preTagName = ""
    let preProbability = 0
    results.predictions.forEach(predictedResult => {
        console.log(`\t ${predictedResult.tagName}: ${(predictedResult.probability * 100.0).toFixed(2)}%`);
        if (preProbability < predictedResult.probability) {
            result = predictedResult.tagName;
        }
        preTagName = predictedResult.tagName;
        preProbability = predictedResult.probability;
    });

    //3.ネコの種類の予測結果をユーザ(LINEアプリ)に返す
    return client.replyMessage(event.replyToken, {
      type: 'text',
      text: `ふむふむこのネコの種類は...💡 ズバリ【${result}】という種類のネコだにゃん😸`
    });

  }

  // create a echoing text message
  const echo = { type: 'text', text: event.message.text };

  // use reply API
  return client.replyMessage(event.replyToken, echo);
}

module.exports = createHandler(app);
