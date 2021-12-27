import { ConstructedTemplate, ConstructedSchema, ConstructedObject, ConstructedObjects, ConstructedContent } from '../../solcery/content'
import { PublicKey, Connection } from "@solana/web3.js";
import { Template } from '../template'

let Master: any = {}

Master.construct = async function(connection: Connection) {
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
