const fs = require('fs-extra')

module.exports = {
  configRetention: function (){
    if(!fs.pathExistsSync(`${__dirname}/../config/config.json`)){
      fs.ensureFileSync(`${__dirname}/../config/config.json`)
      fs.writeJsonSync(`${__dirname}/../config/config.json`, 
      {
        "test_env": "https://test.salesforce.com",
        "prod_env": "https://login.salesforce.com",
        "dev_hub": "",
        "code_directories": ["classes", "triggers", "components", "pages", "testSuites", "aura", "lwc"]
      }, {spaces: 2})
    }
  
    if(!fs.pathExistsSync(`${__dirname}/../config/project-scratch-def.json`)){
      fs.ensureFileSync(`${__dirname}/../config/project-scratch-def.json`)
      fs.writeJsonSync(`${__dirname}/../config/project-scratch-def.json`, 
      {
        "orgName": "",
        "edition": "Enterprise",
        "features": [
          "API",
          "RecordTypes"
        ],
        "orgPreferences": {
          "enabled": [],
          "disabled": []
        }
      }, {spaces: 2})
    }
  }
}