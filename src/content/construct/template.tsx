import { ConstructedTemplate, ConstructedSchema, ConstructedObjects, ConstructedObject, ConstructedFieldData } from '../../solcery/content'
import { Connection } from "@solana/web3.js";
import { Template } from '../template'
import { TplObject } from '../tplobject'
import { SInt, SLink, SArray } from '../../solcery/types'

let Master: any = {}

Master.construct = function() {
  let code = this.code
  let fields = new Map<number, ConstructedFieldData>();
  for (let fieldKey of Object.keys(this.fields)) {
    let fieldData = this.fields[fieldKey]
    fields.set(fieldData.id, new ConstructedFieldData({
      id: fieldData.id,
      type: fieldData.fieldType,
      code: fieldData.code,
    }));
  }
  let schema = new ConstructedSchema({ fields })

  let constructedObjects = new Map<number, ConstructedObject>();
  let rawObjects = this.getObjects()
  for (let object of rawObjects) {
    if (object.fields.enabled) {
      constructedObjects.set(object.id, object.construct())
    }
  }

  for (let field of fields.values()) {
    if (field.type instanceof SLink) {
      field.type = new SInt() // Compiling links into IDs
    }
    if (field.type instanceof SArray && (field.type as SArray).subtype instanceof SLink) {
      field.type = new SArray({ subtype: new SInt() }) // Compiling link arrays into IDs
    }
  }

  for (let field of fields.values()) {
    if (field.type instanceof SLink) {
      field.type = new SInt() // Compiling links into IDs
    }
  }

  let objects = new ConstructedObjects({ objects: constructedObjects, schema })
  return new ConstructedTemplate({ code, schema, objects })
}

export { Master }
