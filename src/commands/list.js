const {Command, flags} = require('@oclif/command')
// const Table = require('cli-table')
const execa = require('execa')
const fs = require('fs-extra')
const chalk = require('chalk')
const tools = require('../tools')

class ListCommand extends Command {
  async run() {
    tools.configRetention()
    const {flags} = this.parse(ListCommand)
    if((!flags.org && !flags.package) || flags.org){
      try{
        const output = await execa.shell('sfdx force:org:list --json')
        const res = JSON.parse(output.stdout)
        if(res.status == 0){
          // let table = new Table({
          //   head: ['Client Orgs', 'Scratch Orgs']
          // })
          // if(res.result.nonScratchOrgs.length >= res.result.scratchOrgs.length){
          //   res.result.nonScratchOrgs.map((e, i) => {return [e.alias, res.result.scratchOrgs[i] != undefined ? res.result.scratchOrgs[i].alias : '']})
          //                            .forEach(e => table.push(e))
          // }else{
          //   res.result.scratchOrgs.map((e, i) => {return [res.result.nonScratchOrgs[i] != undefined ? res.result.nonScratchOrgs[i].alias : '', e.alias]})
          //                         .forEach(e => table.push(e))
          // }
          res.result.nonScratchOrgs.forEach(e => this.log(`${chalk.blue(e.alias)}`))
          res.result.scratchOrgs.forEach(e => this.log(`${chalk.red(e.alias)}`))
          // this.log(table.toString())
        }else{
          this.error(res.name, {exit: res.status})
        }
      }catch(error){
        this.error(JSON.parse(error.stderr).message, {exit: error.code})
      }
    }else if(flags.package){
      try{
        if(flags.dir)
          process.chdir(flags.dir)
        if(!fs.pathExistsSync('./sfdx-project.json'))
          this.error('Not a sfdx project.')
        const output = await execa.shell(`sfdx force:package:installed:list -u ${flags.alias} --json`)
        const res = JSON.parse(output.stdout)
        if(res.status == 0){
          res.result.forEach(e => this.log(`${chalk.blue(e.SubscriberPackageName)} ${chalk.red(e.SubscriberPackageVersionId)}`))
        }else{
          this.error(res.name, {exit: res.status})
        }
      }catch(error){
        this.error(JSON.parse(error.stderr).message, {exit: error.code})
      }
    }
  }
}

ListCommand.aliases = ['l']

ListCommand.description = `list elements of a category`

ListCommand.examples = [
  '$ dsfdx list',
  '$ dsfdx l -t org',
  '$ dfsdx l -t package -a some_name -d ../../folder/project'
]

ListCommand.flags = {
  org: flags.boolean({char: 'o'}),
  package: flags.boolean({char: 'p', dependsOn: ['alias', 'dir']}),
  alias: flags.string({char: 'a'}),
  dir: flags.string({char: 'd'})
}

module.exports = ListCommand