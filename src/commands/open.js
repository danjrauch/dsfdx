const {Command, flags} = require('@oclif/command')
const fs = require('fs-extra')
const execa = require('execa')
const chalk = require('chalk')
const {cli} = require('cli-ux')
const tools = require('../tools')

class OpenCommand extends Command {
  async run(){
    tools.configRetention()
    const {flags} = this.parse(OpenCommand)
    const orgs = await execa.shell('sfdx force:org:list --json')
    const org_json = JSON.parse(orgs.stdout)
    const scratch_org = org_json.result.scratchOrgs.map(e => e.alias).filter(a => a == flags.alias)
    const client_org = org_json.result.nonScratchOrgs.map(e => e.alias).filter(a => a == flags.alias)
    if(scratch_org.length > 0 || client_org.length > 0)
      await execa.shell(`sfdx force:org:open -u ${flags.alias}`)
    else
      this.error(`Please create ${chalk.red(flags.alias)} before trying to open it.`)
  }
}

OpenCommand.aliases = ['o']

OpenCommand.description = `open an environment in browser`

OpenCommand.examples = [
  '$ dsfdx open -a some_name'
]

OpenCommand.flags = {
  alias: flags.string({required: true, char: 'a'})
}

module.exports = OpenCommand