const fs = require('fs');
const admin = require('firebase-admin');
const { language } = require('googleapis/build/src/apis/language');

/**
 * Initialize firebase app. This function must be called first.
 */
// [START initialize_app]
function initFirebaseApp(environment){
  serviceAccount = "credentials/"+environment+"-hadi-firebase.json";
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
      });
}
// [END initialize_app]

/**
 * Get a valid access token.
 */
// [START retrieve_access_token]
function getAccessToken() {
  return admin.credential.applicationDefault().getAccessToken()
      .then(accessToken => {
        return accessToken.access_token;
      })
      .catch(err => {
        console.error('Unable to get access token');
        console.error(err);
      });
}
// [END retrieve_access_token]

/**
 * Retrieve the current Firebase Remote Config template from the server. Once
 * retrieved the template is stored locally in a file named `config.json`.
 */
// [START retrieve_template]
function getTemplate() {
  const config = admin.remoteConfig();
  config.getTemplate()
      .then(template => {
        console.log('ETag from server: ' + template.etag);
        const templateStr = JSON.stringify(template);
        fs.writeFileSync('config.json', templateStr);
      })
      .catch(err => {
        console.error('Unable to get template');
        console.error(err);
      });
}
// [END retrieve_template]

/**
 * Publish the local template stored in `config.json` to the server.
 */
// [START publish_template]
function publishTemplate() {
  const config = admin.remoteConfig();
  const template = config.createTemplateFromJSON(
      fs.readFileSync('config.json', 'utf-8'));
  config.publishTemplate(template)
      .then(updatedTemplate => {
        console.log('Template has been published');
        console.log('ETag from server: ' + updatedTemplate.etag);
      })
      .catch(err => {
        console.error('Unable to publish template.');
        console.error(err);
      });
}
// [END publish_template]

// [START update_template]
async function getAndUpdateTemplate() {
  const config = admin.remoteConfig();
  try {
    // Get current active template.
    var template = await config.getTemplate();
    // Set language parameters.
    template = addLanguageToTemplate(template, "en")
    template = addLanguageToTemplate(template, "tr")
    template = addLanguageToTemplate(template, "fr")
    // Validate template after updating it.
    await config.validateTemplate(template);
    // Publish updated template.
    const updatedTemplate = await config.publishTemplate(template);
    console.log('Latest etag: ' + updatedTemplate.etag);
  } catch (err) {
    console.error('Unable to get and update template.');
    console.error(err);
  }
}
// [END update_template]

async function publishEditedTemplate(template){
  const config = admin.remoteConfig();
  try{
    // Validate template after updating it.
    console.log(template);
    await config.validateTemplate(template);
    // Publish updated template.
    const updatedTemplate = await config.publishTemplate(template);
    console.log('Latest etag: ' + updatedTemplate.etag);
  } catch (err) {
    console.error('Unable to get and update template.');
    console.error(err);
  }
}

async function getTemplateWithoutSaving() {
  const config = admin.remoteConfig();
  try {
    // Get current active template.
    var template = await config.getTemplate();
    return template
  } catch (err) {
    console.error('Unable to get and update template.');
    console.error(err);
  }
}


function addLanguageToTemplate(template, languageCode){
  var languageJson = JSON.parse(fs.readFileSync('localizable/localizable_' + languageCode + '.json', 'utf8'))
  template.parameters['Localizable_'+languageCode] = {
    defaultValue: {
      value: JSON.stringify(languageJson)
    }
  };
  return template
}

/*
const action = process.argv[2];
const environment = process.argv[3];
if (action === undefined && environment === undefined){
  console.log("RemoteConfigUtils imported")
}else if (action && (action === 'get' || action ==='publish' || action === 'update') &&
    environment && (environment === 'test' || environment === 'staging' || environment === 'prod')){
      initFirebaseApp(environment)
      if (action && action === 'get') {
        getTemplate();
      } else if (action && action === 'publish') {
        publishTemplate();
      } else if (action && action === 'update') {
        getAndUpdateTemplate();
      }
} else {
  console.log(
    `
    Invalid command. Please use one of the following:
    node index.js get [test|staging|prod]
    node index.js publish [test|staging|prod]
    node index.js update [test|staging|prod]
    `
  );
}
*/

module.exports ={
  getTemplateWithoutSaving, getAndUpdateTemplate, publishEditedTemplate, initFirebaseApp
}


