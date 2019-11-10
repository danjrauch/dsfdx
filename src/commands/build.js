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
    if(flags.scratch){
      if(flags.new){
        cli.action.start('refreshing environment')
        let project_scratch_def = fs.readJSONSync(`${__dirname}/../../config/project-scratch-def.json`)
        project_scratch_def.orgName = flags.alias
        fs.writeJsonSync(`${__dirname}/../../config/project-scratch-def.json`, project_scratch_def, {spaces: 2})
        const orgs = await execa.shell('sfdx force:org:list --json')
        const org_json = JSON.parse(orgs.stdout)
        const scratch_org = org_json.result.scratchOrgs.map(e => e.alias).filter(a => a == flags.alias)
        if(scratch_org.length > 0)
          await execa.shell(`sfdx force:org:delete -p -u ${flags.alias} --json`)
        if(config.dev_hub)
          await execa.shell(`sfdx force:org:create -f ${__dirname}/../../config/project-scratch-def.json -a ${flags.alias} -v ${config.dev_hub} --json`)
        else
          this.error('Please provide a value for dev_hub in config.json.')
        cli.action.stop('done')
        const want_packages = await cli.confirm('Do you want to install packages from another environment? [yes/no]')
        if(want_packages){
          const org_name = await cli.prompt('What is the org name?')
          try{
            const output = await execa.shell(`sfdx force:package:installed:list -u ${org_name} --json`)
            const res = JSON.parse(output.stdout)
            if(res.status == 0){
              for(const e of res.result){
                const install = await cli.confirm(`Do you want to install ${chalk.red(e.SubscriberPackageName)}? [yes/no]`)
                if(install){
                  cli.action.start(`installing ${e.SubscriberPackageName} to ${flags.alias}`)
                  const install_output = await execa.shell(`sfdx force:package:install -p ${e.SubscriberPackageVersionId} -u ${flags.alias} --json`)
                  const install_json = JSON.parse(install_output.stdout)
                  //TODO Finish this
                  while(true){
                    await cli.wait(1000)
                    const check_install_output = await execa.shell(`sfdx force:package:install:report -i ${install_json.result.Id} -u ${flags.alias} --json`)
                    const check_install_json = JSON.parse(check_install_output.stdout)
                    this.log(check_install_json)
                  }
                  cli.action.stop('done')
                }
              }
            }else{
              this.error(res.name, {exit: res.status})
            }
          }catch(error){
            this.error(JSON.parse(error.stderr).message, {exit: error.code})
          }
        }
      }
      try{
        const output = await execa.shell(`sfdx force:source:push -u ${flags.alias} ${flags.force ? '-f' : ''} --json`)
        const res = JSON.parse(output.stdout)
        if(res.status == 0){
          if(res.result.pushedSource.length == 0)
            this.log('=== ' + chalk.cyan('No source push needed'))
          else
            res.result.pushedSource.forEach(e => this.log(chalk.green('Pushed: ') + e.fullName))
        }else{
          this.error(res.name, {exit: res.status})
        }
      }catch(error){
        JSON.parse(error.stderr).result.forEach(e => this.log(chalk.red('Error: ') + chalk.magenta(e.error)))
        this.error(JSON.parse(error.stderr).message, {exit: JSON.parse(error.stderr).code})
      }
    }else if(flags.test){
      cli.action.start('Building and describing metadata')
      // cli.action.start('building source with mdapi')
      await execa.shell(`rm -rf mdapi_out`)
      await execa.shell(`mkdir mdapi_out`)
      await execa.shell(`sfdx force:source:convert -d mdapi_out/ -n MetadatePackage`)
      // cli.action.stop('done')

      let data = await fs.readFile('./mdapi_out/package.xml', 'utf-8')
      xml2js.parseString(data, function(err, result) { data = result })

      // cli.action.start('describing metadata')
      const mdapi_output = await execa.shell(`sfdx force:mdapi:describemetadata -u ${flags.alias} --json`)
      cli.action.stop('done')
      const mdapi_describe = JSON.parse(mdapi_output.stdout).result
      const folder_names = fs.readdirSync('./mdapi_out').filter(file => file != 'package.xml')

      if(flags.code){
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
      }else if(flags.parse){
        for(const describe of mdapi_describe.metadataObjects){
          if(folder_names.includes(describe.directoryName)){
            const include = await cli.confirm(`Include ${chalk.red(describe.directoryName)}? [yes/no]`)
            if(!include){
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
        }
      }else{
        let com_idx = 0
        this.log(`<folder_name> <file_name> => input a component`)
        this.log(`f                         => finishes input`)
        let components = {}
        while(true){
          let raw_com = ''
          if(flags.last){
            const last_coms = fs.readFileSync(`${__dirname}/../../data/last_com.txt`, 'utf8').split('\n');
            if(com_idx < last_coms.length)
              raw_com = last_coms[com_idx];
            else
              break
          }else{
            raw_com = await cli.prompt(`${com_idx}`)
            if(raw_com == 'f')
              break
          }
          const com = raw_com.split(' ')
          if(!folder_names.includes(com[0]))
            this.error(`${com[0]} wasn\'t found`)
          const file_names = fs.readdirSync(`./mdapi_out/${com[0]}`)
          const describe = mdapi_describe.metadataObjects.filter(e => e.directoryName == com[0])[0]
          const exp_name = 'suffix' in describe ? com[1]+'.'+describe.suffix : com[1]
          if(!file_names.includes(exp_name))
            this.error(`${exp_name} wasn\'t found in ${com[0]}`)
          if(com[0] in components)
            components[com[0]].push({base_name: com[1], exp_name: exp_name})
          else
            components[com[0]] = [{base_name: com[1], exp_name: exp_name}]
          if(describe.metaFile)
            components[com[0]][components[com[0]].length-1].meta_name = `${exp_name}-meta.xml`
          com_idx += 1
        }
        for(const describe of mdapi_describe.metadataObjects){
          if(folder_names.includes(describe.directoryName)){
            if(!Object.keys(components).includes(describe.directoryName)){
              fs.removeSync(`./mdapi_out/${describe.directoryName}`)
              data.Package.types.splice(data.Package.types.map(e => e.name[0]).indexOf(`${describe.xmlName}`), 1)
              if(describe.childXmlNames){
                describe.childXmlNames.forEach(child => {
                  if(data.Package.types.map(e => e.name[0]).includes(child))
                    data.Package.types.splice(data.Package.types.map(e => e.name[0]).indexOf(`${child}`), 1)
                })
              }
            }else{
              let possible_coms = []
              const idx = data.Package.types.map(e => e.name[0]).indexOf(`${describe.xmlName}`)
              data.Package.types[idx].members.forEach(base_name => {
                let possible_com = {}
                possible_com.base_name = base_name
                possible_com.exp_name = 'suffix' in describe ? base_name+'.'+describe.suffix : base_name
                if(describe.metaFile)
                  possible_com.meta_name = `${possible_com.exp_name}-meta.xml`
                possible_coms.push(possible_com)
              })
              const del_coms = possible_coms.filter(e => !components[describe.directoryName].map(e => e.base_name)
                                                                                            .includes(e.base_name))
              for(const com of del_coms){
                fs.removeSync(`./mdapi_out/${describe.directoryName}/${com.exp_name}`)
                if(describe.metaFile)
                  fs.removeSync(`./mdapi_out/${describe.directoryName}/${com.meta_name}`)
                const idx = data.Package.types.map(e => e.name[0]).indexOf(`${describe.xmlName}`)
                const file_idx = data.Package.types[idx].members.indexOf(com.base_name)
                data.Package.types[idx].members.splice(file_idx, 1)
              }
            }
          }
        }
      }

      let builder = new xml2js.Builder()
      let xml = builder.buildObject(data)
      await fs.writeFile('./mdapi_out/package.xml', xml)

      await cli.anykey()

      let last_coms_string = ''
      for(const type of data.Package.types){
        for(const member of type.members){
          last_coms_string += `${type.name[0]} ${member}\n`
        }
      }
      fs.ensureFileSync(`${__dirname}/../../data/last_com.txt`)
      fs.writeFileSync(`${__dirname}/../../data/last_com.txt`, last_coms_string)

      try{
        const output = await execa.shell(`sfdx force:mdapi:deploy -c -d mdapi_out/ -u ${flags.alias} -w 10 --json`)
        const res = JSON.parse(output.stdout)
        if(res.status == 0){
          if(Array.isArray(res.result.details.componentSuccesses))
            res.result.details.componentSuccesses.forEach(e => this.log(chalk.green('Checked: ') + e.fullName))
          else
            this.log(chalk.green('Checked: ') + res.result.details.componentSuccesses.fullName)
        }else{
          this.error(res.name, {exit: res.status})
        }
      }catch(error){
        const errors = JSON.parse(error.stderr).result.details.componentFailures
        if(Array.isArray(errors))
          errors.forEach(e => this.log(chalk.red(`Error for ${e.fileName}: `) + chalk.magenta(e.problem) + `${e.lineNumber ? ' on line ' + e.lineNumber : ''}`))
        else
          this.log(chalk.red(`Error for ${errors.fullName}: `) + chalk.magenta(errors.problem) + `${errors.lineNumber ? ' on line ' + errors.lineNumber : ''}`)
        this.error(JSON.parse(error.stderr).message, {exit: JSON.parse(error.stderr).status})
      }

      try{
        const output = await execa.shell(`sfdx force:mdapi:deploy -d mdapi_out/ -u ${flags.alias} -w 10 --json`)
        const res = JSON.parse(output.stdout)
        if(res.status == 0){
          if(Array.isArray(res.result.details.componentSuccesses))
            res.result.details.componentSuccesses.forEach(e => this.log(chalk.green('Pushed: ') + e.fullName))
          else
            this.log(chalk.green('Pushed: ') + res.result.details.componentSuccesses.fullName)
        }else{
          this.error(res.name, {exit: res.status})
        }
      }catch(error){
        const errors = JSON.parse(error.stderr).result.details.componentFailures
        if(Array.isArray(errors))
          errors.forEach(e => this.log(chalk.red(`Error for ${e.fullName}: `) + chalk.magenta(e.problem) + `${errors.lineNumber ? ' on line ' + errors.lineNumber : ''}`))
        else
          this.log(chalk.red(`Error for ${errors.fullName}: `) + chalk.magenta(errors.problem) + `${errors.lineNumber ? ' on line ' + errors.lineNumber : ''}`)
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
  '$ dsfdx build -a some_name -s -d ../../folder/project -n',
  '$ dsfdx b -a some_name -t -d .'
]

BuildCommand.flags = {
  alias: flags.string({required: true, char: 'a'}),
  scratch: flags.boolean({char: 's'}),
  test: flags.boolean({char: 't'}),
  // prod: flags.boolean({char: 'p'}),
  force: flags.boolean({char: 'f'}),
  code: flags.boolean({char: 'c'}),
  parse: flags.boolean({char: 'p'}),
  last: flags.boolean({char: 'l'}),
  dir: flags.string({char: 'd'}),
  new: flags.boolean({char: 'n', dependsOn: ['scratch']})
}

module.exports = BuildCommand