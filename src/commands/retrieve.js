const {Command, flags} = require('@oclif/command')
const chalk = require('chalk')
const fs = require('fs-extra')
const {cli} = require('cli-ux')
const xml2js = require('xml2js')
const execa = require('execa')
const tools = require('../tools')

class RetrieveCommand extends Command {
  async run(){
    tools.configRetention()
    const {flags} = this.parse(RetrieveCommand)
    if(flags.dir)
      process.chdir(flags.dir)
    if(!fs.pathExistsSync('./sfdx-project.json'))
      this.error('Not a sfdx project.')
    if(flags.env == 'dev' || flags.env == 'd'){
      try{
        const output = await execa.shell(`sfdx force:source:push -u ${flags.alias} --json`)
        const res = JSON.parse(output.stdout)
        if(res.status == 0){
          if(res.result.pushedSource.length == 0)
            this.log(chalk.red('No source pull needed.'))
          else
            res.result.pushedSource.forEach(e => this.log(chalk.blue('Pulled: ') + chalk.red(e.fullName)))
        }else{
          this.error(res.name, {exit: res.status})
        }
      }catch(error){
        JSON.parse(error.stderr).result.forEach(e => this.log(chalk.red('Error: ') + chalk.magenta(e.error)))
        this.error(JSON.parse(error.stderr).message, {exit: error.code})
      }
    }else if(flags.env == 'test' || flags.env == 't'){
      //TODO: add capacity to automate package.xml creation
      cli.action.start('pulling and converting source from test environment')
      await execa.shell(`sfdx force:mdapi:retrieve -r ./mdapi_pkg/"$1" -u ${flags.alias} -k ./mdapi_pkg/"$1"/package.xml`)
      await execa.shell(`unzip -o -d mdapi_pkg/ mdapi_pkg/"$1"/unpackaged.zip`)
      await execa.shell(`rm -rf mdapi_pkg/"$1"/`)
      await execa.shell(`mv mdapi_pkg/unpackaged mdapi_pkg/"$1"`)
      await execa.shell(`sfdx force:mdapi:convert -r mdapi_pkg/"$1"`)
      cli.action.stop('done')
    }else{
      this.error('This is an incorrect request.')
    }
  }
}

RetrieveCommand.aliases = ['r']

RetrieveCommand.description = `retrieve code from some environment`

RetrieveCommand.examples = [
  '$ dsfdx retrieve -a some_name -d ../../folder/project'
]

RetrieveCommand.flags = {
  alias: flags.string({required: true, char: 'a'}),
  env: flags.string({required: true, char:'e'}),
  dir: flags.string({char: 'd'})
}

module.exports = RetrieveCommand