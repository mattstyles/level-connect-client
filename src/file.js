
import fs from 'fs'
import mkdirp from 'mkdirp'
import denodeify from 'denodeify'


export default {
    mkdirp: denodeify( mkdirp ),
    readFile: denodeify( fs.readFile ),
    writeFile: denodeify( fs.writeFile )
}
