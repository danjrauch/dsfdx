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
    const config = fs.readJSONSync(`${__dirname}/../../config/config.json`)
    if(flags.dir)
      process.chdir(flags.dir)
    if(!fs.pathExistsSync('./sfdx-project.json'))
      this.error('Not a sfdx project.')
    if(flags.scratch){
      try{
        const output = await execa.shell(`sfdx force:source:pull -u ${flags.alias} --json`)
        const res = JSON.parse(output.stdout)
        if(res.status == 0){
          if(res.result.pulledSource.length == 0)
            this.log(chalk.red('No source pull needed.'))
          else
            res.result.pulledSource.forEach(e => this.log(chalk.blue('Pulled: ') + chalk.red(e.fullName)))
        }else{
          this.error(res.name, {exit: res.status})
        }
      }catch(error){
        JSON.parse(error.stderr).result.forEach(e => this.log(chalk.red('Error: ') + chalk.magenta(e.error)))
        this.error(JSON.parse(error.stderr).message, {exit: error.code})
      }
    }else if(flags.test || flags.prod){
      fs.ensureFileSync(`./mdapi_pkg/package.xml`)

      const current_package = await cli.confirm(`Use current package.xml contents? [yes/no]`)

      if(!current_package){
        let data = { 'Package':
                    { '$': { xmlns: 'http://soap.sforce.com/2006/04/metadata' },
                      'types': [],
                      'version': [ config.api_version ],
                      'fullName': [ 'MetadatePackage' ] } }

        cli.action.start('describing metadata')
        const mdapi_output = await execa.shell(`sfdx force:mdapi:describemetadata -u ${flags.alias} --json`)
        cli.action.stop('done')
        const mdapi_describe = JSON.parse(mdapi_output.stdout).result
        // const folder_names = fs.readdirSync('./mdapi_pkg').filter(file => file != 'package.xml')

        const code_only = await cli.confirm(`Pull only code components? [yes/no]`)

        if(code_only){
          for(const describe of mdapi_describe.metadataObjects){
            if(config.code_directories.includes(describe.directoryName)){
              data.Package.types.push({'name': [ describe.xmlName ], 'members': '*'})
              if(describe.childXmlNames){
                describe.childXmlNames.forEach(child => {
                  data.Package.types.push({'name': [ child ], 'members': '*'})
                })
              }
            }
          }
        }else{
          for(const describe of mdapi_describe.metadataObjects){
            const include = await cli.confirm(`Include ${chalk.red(describe.directoryName)}? [yes/no]`)
            if(include){
              data.Package.types.push({'name': [ describe.xmlName ], 'members': '*'})
              if(describe.childXmlNames){
                describe.childXmlNames.forEach(child => {
                  data.Package.types.push({'name': [ child ], 'members': '*'})
                })
              }
            }
          }
        }

        let builder = new xml2js.Builder()
        let xml = builder.buildObject(data)
        await fs.writeFile('./mdapi_pkg/package.xml', xml)
      }

      await cli.anykey()

      cli.action.start('pulling and converting source from test environment')
      await execa.shell(`sfdx force:mdapi:retrieve -r ./mdapi_pkg/ -u ${flags.alias} -k ./mdapi_pkg/package.xml`)
      await execa.shell(`unzip -o -d mdapi_pkg/ mdapi_pkg/unpackaged.zip`)
      await execa.shell(`rm -f mdapi_pkg/unpackaged.zip`)
      await execa.shell(`mv mdapi_pkg/unpackaged/* mdapi_pkg`)
      await execa.shell(`sfdx force:mdapi:convert -r mdapi_pkg/`)
      await execa.shell(`rm -R -- ./mdapi_pkg/*/`)
      cli.action.stop('done')
    }else{
      this.error('This is an incorrect request.')
    }
  }
}

RetrieveCommand.aliases = ['r']

RetrieveCommand.description = `retrieve code from some environment`

RetrieveCommand.examples = [
  '$ dsfdx retrieve -a some_name -d ../../folder/project -t'
]

RetrieveCommand.flags = {
  alias: flags.string({required: true, char: 'a'}),
  scratch: flags.boolean({char: 's'}),
  test: flags.boolean({char: 't'}),
  prod: flags.boolean({char: 'p'}),
  dir: flags.string({char: 'd'})
}

module.exports = RetrieveCommand