'use strict';

const PredictionApi = require("@azure/cognitiveservices-customvision-prediction");
const msRest = require("@azure/ms-rest-js");

const predictionKey = "558e504bf6f448e8839004273b7adffa";
//const predictionEndpoint = "https://customvision20211031-prediction.cognitiveservices.azure.com/customvision/v3.0/Prediction/85bbeb50-c1a9-476c-a143-42cd2d1de091/classify/iterations/Iteration1/image";
const predictionEndpoint = "https://customvision20211031-prediction.cognitiveservices.azure.com/customvision/v3.0/Prediction/85bbeb50-c1a9-476c-a143-42cd2d1de091/classify/iterations/Iteration1/url"


const predictor_credentials = new msRest.ApiKeyCredentials({ inHeader: { "Prediction-key": predictionKey } });
const predictor = new PredictionApi.PredictionAPIClient(predictor_credentials, predictionEndpoint);

const imageUrl = {
    url: "https://fnstor47zdbu590znu0pajew.blob.core.windows.net/files/7dd97143-474c-4698-b440-7a9d42f180b2.jpg"
};

// predictor.classifyImageUrl("85bbeb50-c1a9-476c-a143-42cd2d1de091", "Iteration1", imageUrl).then((result) => {
//     console.log("The result is:");
//     console.log(result);
// }).catch((err) => {
//     console.log('An error occurred:');
//     console.dir(err, {depth: null, colors: true});
// });  

async function main() {
    const results = await predictor.classifyImageUrl("85bbeb50-c1a9-476c-a143-42cd2d1de091", "Iteration1", imageUrl); 
    // Show results
    console.log("Results:");

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

    console.log(result) 
}

main()