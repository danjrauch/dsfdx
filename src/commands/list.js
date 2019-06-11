const {Command, flags} = require('@oclif/command')
const Table = require('cli-table')
const execa = require('execa')
const tools = require('../tools')

class ListCommand extends Command {
  async run() {
    tools.configRetention()
    try{
      const output = await execa.shell('sfdx force:org:list --json')
      const res = JSON.parse(output.stdout)
      if(res.status == 0){
        let table = new Table({
          head: ['Client Orgs', 'Scratch Orgs']
        })
        if(res.result.nonScratchOrgs.length >= res.result.scratchOrgs.length){
          res.result.nonScratchOrgs.map((e, i) => {return [e.alias, res.result.scratchOrgs[i] != undefined ? res.result.scratchOrgs[i].alias : '']})
                                   .forEach(e => table.push(e))
        }else{
          res.result.scratchOrgs.map((e, i) => {return [res.result.nonScratchOrgs[i] != undefined ? res.result.nonScratchOrgs[i].alias : '', e.alias]})
                                .forEach(e => table.push(e))
        }
        // res.result.nonScratchOrgs.forEach(e => this.log(chalk.blue(e.alias)))
        // res.result.scratchOrgs.forEach(e => this.log(chalk.magenta(e.alias)))
        this.log(table.toString())
      }else{
        this.error(res.name, {exit: res.status})
      }
    }catch(error){
      this.error(JSON.parse(output.stderr).message, {exit: output.code})
    }
  }
}

ListCommand.aliases = ['l']

ListCommand.description = `list all environments`

ListCommand.examples = [
  '$ dsfdx list'
]

module.exports = ListCommand