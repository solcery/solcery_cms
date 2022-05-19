import { ConstructedTemplate, ConstructedContent, ConstructedObject } from '../../solcery/content'
import { Connection } from "@solana/web3.js";
import { Template } from '../template'
import { Project } from '../project'
import { SString } from '../../solcery/types';

let Master: any = {}

Master.construct = function() {
  var data = new Map<number, any>();
  let tpl = this.parent.parent
  let project = this.root.getAll(Project)[0]
  let stringReplacerList = tpl.customData.applyReplace ?? []
  for (let fieldId of Object.keys(tpl.fields)) {
    var field = tpl.fields[fieldId]
    let value = this.fields[field.code]
    if (value) {
      let constructedValue = field.fieldType.construct(value, project)
      if (stringReplacerList.indexOf(field.code) >= 0) {
        let rules = project.getTemplate('FvnkwcnsMMW5JsUmaTC2LK6qz6J4Ftw8iMQxsAg5G5D8').getObjects() //TODO
        for (let rule of rules) {
          let src = rule.fields.source
          let result = rule.fields.result
          constructedValue = constructedValue.replaceAll(src, result)
        }
      }
      data.set(field.id, constructedValue) 
    }
  }
  return new ConstructedObject({ id: this.intId, data });
}

export { Master }
