const {Command, flags} = require('@oclif/command')
const fs = require('fs-extra')
const execa = require('execa')
const chalk = require('chalk')
const {cli} = require('cli-ux')
const tools = require('../tools')

class AuthCommand extends Command {
  async run(){
    tools.configRetention()
    const {flags} = this.parse(AuthCommand)
    const config = fs.readJSONSync(`${__dirname}/../../config/config.json`)
    let project_scratch_def = fs.readJSONSync(`${__dirname}/../../config/project-scratch-def.json`)
    project_scratch_def.orgName = flags.alias
    fs.writeJsonSync(`${__dirname}/../../config/project-scratch-def.json`, project_scratch_def, {spaces: 2})
    if(flags.env == 'prod' || flags.env == 'p'){
      if(flags.devhub)
        await execa.shell(`sfdx force:auth:web:login -a ${flags.alias} --setdefaultdevhubusername`)
      else
        await execa.shell(`sfdx force:auth:web:login -a ${flags.alias}`)
    }else if(flags.env == 'test' || flags.env == 't'){
      await execa.shell(`sfdx force:auth:web:login -r https://test.salesforce.com -a ${flags.alias}`)
    }else if(flags.env == 'dev' || flags.env == 'd'){
      const orgs = await execa.shell('sfdx force:org:list --json')
      const org_json = JSON.parse(orgs.stdout)
      const avail_org = org_json.result.scratchOrgs.map(e => e.alias).filter(a => a == flags.alias)
      if(avail_org.length > 0)
        await execa.shell(`sfdx force:org:delete -p -u ${flags.alias} --json`)
      if(config.dev_hub)
        await execa.shell(`sfdx force:org:create -f ${__dirname}/../../config/project-scratch-def.json -a ${flags.alias} -v ${config.dev_hub} --json`)
      else
        this.error('Please provide a value for dev_hub in config.json.')
      await execa.shell(`sfdx force:user:password:generate -u ${flags.alias} --json`)
      const info = await execa.shell(`sfdx force:user:display -u ${flags.alias} --json`)
      const info_json = JSON.parse(info.stdout)
      this.log(`Scratch org created ${chalk.green('successfully.')}`)
      this.log(`Login to scratch org ${flags.alias} at https://test.salesforce.com/`)
      this.log(`username: ${info_json.result.username}`)
      this.log(`password: ${info_json.result.password}`)
      this.log(`access_token: ${chalk.red(info_json.result.accessToken)}`)
      this.log(`instance_url: ${chalk.red(info_json.result.instanceUrl)}`)
      const open = await cli.confirm(`Do you want to view ${flags.alias} in browser? [yes/no]`)
      if(open)
        await execa.shell(`sfdx force:org:open -u ${flags.alias}`)
    }else{
      this.error('This is an incorrect request.')
    }
  }
}

AuthCommand.aliases = ['a']

AuthCommand.description = `authorize a new environment`

AuthCommand.examples = [
  '$ dsfdx auth -a some_name -e prod -devhub',
  '$ dsfdx a -a sandbox_name -e test',
  '$ dsfdx a -a test_scratch -e dev'
]

AuthCommand.flags = {
  alias: flags.string({required: true, char: 'a'}),
  env: flags.string({required: true, char: 'e'}),
  devhub: flags.boolean()
}

// AuthCommand.usage = 'mycommand --myflag'

module.exports = AuthCommand