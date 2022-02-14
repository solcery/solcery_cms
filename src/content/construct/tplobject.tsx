import { ConstructedTemplate, ConstructedContent, ConstructedObject } from '../../solcery/content'
import { Connection } from "@solana/web3.js";
import { Template } from '../template'
import { Project } from '../project'

let Master: any = {}

Master.construct = function(connection: Connection) {
  var data = new Map<number, any>();
  let tpl = this.parent.parent
  let project = this.root.getAll(Project)[0]
  for (let fieldId of Object.keys(tpl.fields)) {
    var field = tpl.fields[fieldId]
    let value = this.fields[field.code]
    if (value) {
      data.set(field.id, field.fieldType.construct(value, project)) 
    }
  }
  return new ConstructedObject({ id: this.intId, data });
}

export { Master }
