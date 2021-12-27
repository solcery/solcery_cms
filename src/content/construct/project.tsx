import { ConstructedTemplate, ConstructedSchema, ConstructedObject, ConstructedObjects, ConstructedContent } from '../../solcery/content'
import { PublicKey, Connection } from "@solana/web3.js";
import { Template } from '../template'
import { exportBrick, updateCustomBricks, BrickSignature } from '../../solcery/types/brick'

let Master: any = {}

Master.updateBricks = function() {
  var result: BrickSignature[] = []
  for (var tpl of this.getTemplates()) {
    if (tpl.customData !== '') {
      var customParams = JSON.parse(tpl.customData)
      if (customParams.exportBrick) {
        var objects = tpl.getObjects()
        let brickField = tpl.fields[customParams.exportBrick].code
        for (let obj of objects) {
          let brick = obj.fields[brickField]
          if (brick) {
            result.push(exportBrick(obj.fields[brickField], obj.intId, brick))
          }
        }
      } 
    }
  }
  updateCustomBricks(result)
}


Master.construct = async function(connection: Connection) {
  this.updateBricks()
  let templates = this.templateStorage.getAll(Template)
  let constructMetadata: any = {
    ids: {}
  }
  let constructedTemplates = new Map<string, ConstructedTemplate>();
  let customBricks = new Map<number, ConstructedObject>();
  let customBricksSchema: ConstructedSchema | undefined = undefined;
  for (var template of templates) {
    let tpl = await template.construct(connection)
    if (template.customData === '') {
      constructedTemplates.set(template.code, tpl)
    }
    else {
      let customData = JSON.parse(template.customData)
      if (customData.exportBrick) {
        customBricksSchema = tpl.schema;
        customBricks = new Map([...customBricks, ...tpl.objects.raw])
      }
    }
  }
  if (customBricksSchema) {
    let customBricksTemplate = new ConstructedTemplate({ 
      code: 'customBricks',
      schema: customBricksSchema,
      objects: new ConstructedObjects({ objects: customBricks, schema: customBricksSchema }),
    })
    constructedTemplates.set(customBricksTemplate.code, customBricksTemplate)
  }
  return new ConstructedContent({ templates: constructedTemplates })
}

export { Master }
