const {Command, flags} = require('@oclif/command')
const chalk = require('chalk')
const fs = require('fs-extra')
const {cli} = require('cli-ux')
const xml2js = require('xml2js')
const execa = require('execa')
const tools = require('../tools')

class BuildCommand extends Command {
  async run(){
    tools.configRetention()
    const {flags} = this.parse(BuildCommand)
    const config = fs.readJSONSync(`${__dirname}/../../config/config.json`)
    if(flags.dir)
      process.chdir(flags.dir)
    if(!fs.pathExistsSync('./sfdx-project.json'))
      this.error('Not a sfdx project.')
    if(flags.env == 'dev' || flags.env == 'd'){
      if(flags.new){
        cli.action.start('refreshing environment')
        await execa.shell(`sfdx force:org:delete -p -u ${flags.alias} --json`)
        if(config.dev_hub)
          await execa.shell(`sfdx force:org:create -f ${__dirname}/../../config/project-scratch-def.json -a ${flags.alias} -v ${config.dev_hub} --json`)
        else
          this.error('Please provide a value for dev_hub in config.json.')
        cli.action.stop('done')
      }
      try{
        const output = await execa.shell(`sfdx force:source:push -u ${flags.alias} --json`)
        const res = JSON.parse(output.stdout)
        if(res.status == 0){
          if(res.result.pushedSource.length == 0)
            this.log(chalk.red('No source push needed.'))
          else
            res.result.pushedSource.forEach(e => this.log(chalk.green('Pushed: ') + e.fullName))
        }else{
          this.error(res.name, {exit: res.status})
        }
      }catch(error){
        JSON.parse(error.stderr).result.forEach(e => this.log(chalk.red('Error: ') + chalk.magenta(e.error)))
        this.error(JSON.parse(error.stderr).message, {exit: JSON.parse(error.stderr).code})
      }
    }else if(flags.env == 'test' || flags.env == 't'){
      cli.action.start('building source with mdapi')
      await execa.shell(`rm -rf mdapi_out`)
      await execa.shell(`mkdir mdapi_out`)
      await execa.shell(`sfdx force:source:convert -d mdapi_out/ -n MetadatePackage`)
      cli.action.stop('done')

      let data = await fs.readFile('./mdapi_out/package.xml', 'utf-8')
      xml2js.parseString(data, function(err, result) { data = result })

      cli.action.start('describing metadata')
      const mdapi_output = await execa.shell(`sfdx force:mdapi:describemetadata -u ${flags.alias} --json`)
      cli.action.stop('done')
      const mdapi_describe = JSON.parse(mdapi_output.stdout).result
      const folder_names = fs.readdirSync('./mdapi_out').filter(file => file != 'package.xml')

      const code_only = await cli.confirm(`Push only code components? [yes/no]`)

      if(code_only){
        for(const describe of mdapi_describe.metadataObjects){
          if(folder_names.includes(describe.directoryName) && !config.code_directories.includes(describe.directoryName)){
            fs.removeSync(`./mdapi_out/${describe.directoryName}`)
            data.Package.types.splice(data.Package.types.map(e => e.name[0]).indexOf(`${describe.xmlName}`), 1)
            if(describe.childXmlNames){
              describe.childXmlNames.forEach(child => {
                if(data.Package.types.map(e => e.name[0]).includes(child))
                  data.Package.types.splice(data.Package.types.map(e => e.name[0]).indexOf(`${child}`), 1)
              })
            }
          }
        }
      }else{
        for(const describe of mdapi_describe.metadataObjects){
          if(folder_names.includes(describe.directoryName)){
            const include = await cli.confirm(`Include ${chalk.red(describe.directoryName)}? [yes/no]`)
            if(!include){
              fs.removeSync(`./mdapi_out/${describe.directoryName}`)
              data.Package.types.splice(data.Package.types.map(e => e.name[0]).indexOf(`${describe.xmlName}`), 1)
              describe.childXmlNames.forEach(child => {
                if(data.Package.types.map(e => e.name[0]).includes(child))
                  data.Package.types.splice(data.Package.types.map(e => e.name[0]).indexOf(`${child}`), 1)
              })
            }
          }
        }
      }

      let builder = new xml2js.Builder()
      let xml = builder.buildObject(data)
      await fs.writeFile('./mdapi_out/package.xml', xml)

      await cli.anykey()

      try{
        const output = await execa.shell(`sfdx force:mdapi:deploy -c -d mdapi_out/ -u ${flags.alias} -w 10 --json`)
        const res = JSON.parse(output.stdout)
        if(res.status == 0){
          // this.log(res.result.details.componentSuccesses)
          res.result.details.componentSuccesses.forEach(e => this.log(chalk.green('Checked: ') + e.fullName))
        }else{
          this.error(res.name, {exit: res.status})
        }
      }catch(error){
        JSON.parse(error.stderr).result.details.componentFailures.forEach(e => this.log(chalk.red(`Error for ${e.fullName}: `) + chalk.magenta(e.problem)))
        this.error(JSON.parse(error.stderr).message, {exit: JSON.parse(error.stderr).status})
      }

      try{
        const output = await execa.shell(`sfdx force:mdapi:deploy -d mdapi_out/ -u ${flags.alias} -w 10 --json`)
        const res = JSON.parse(output.stdout)
        if(res.status == 0){
          // this.log(res.result.details.componentSuccesses)
          res.result.details.componentSuccesses.forEach(e => this.log(chalk.green('Pushed: ') + e.fullName))
        }else{
          this.error(res.name, {exit: res.status})
        }
      }catch(error){
        JSON.parse(error.stderr).result.details.componentFailures.forEach(e => this.log(chalk.red(`Error for ${e.fullName}: `) + chalk.magenta(e.problem)))
        this.error(JSON.parse(error.stderr).message, {exit: JSON.parse(error.stderr).status})
      }
    }else{
      this.error('This is an incorrect request.')
    }
  }
}

BuildCommand.aliases = ['b']

BuildCommand.description = `build code to some environment`

BuildCommand.examples = [
  '$ dsfdx build -a some_name -e dev -d ../../folder/project -n'
]

BuildCommand.flags = {
  alias: flags.string({required: true, char: 'a'}),
  env: flags.string({required: true, char: 'e'}),
  dir: flags.string({char: 'd'}),
  new: flags.boolean({char: 'n'})
}

module.exports = BuildCommand