import { deserializeUnchecked, BinaryWriter, serialize } from 'borsh';
import { PublicKey, Connection } from "@solana/web3.js";
import { schema, TemplateData, TemplateFieldData} from './schema';
import { Storage } from '../storage';
import { TplObject } from '../tplobject';
import { addCustomBrick, exportBrick } from '../../solcery/types'

let Master: any = {}

Master.fromBinary = function(data: any) {
  let src = deserializeUnchecked(schema, TemplateData, data)
  this.name = src.name;
  this.code = src.code;
  this.fields = {}
  src.fields.forEach((fieldData: any) => {
    this.fields[fieldData.id] = fieldData
  })
  this.maxFieldIndex = src.maxFieldIndex;
  this.customDataJSON = src.customData
  this.customData = src.customData != '' ? JSON.parse(src.customData) : {}
  let storagePubkey = src.storages[0] //TODO: multiple storages
  this.storage = this.create(Storage, {
    id: src.storages[0].toBase58(),
    pubkey: src.storages[0],
    storedClass: TplObject,
  })
}

Master.toBinary = function() {
  let templateData = new TemplateData(this)
  templateData.storages = [ this.storage.pubkey ] 
  templateData.fields = Object.values(this.fields).map((field: any) => new TemplateFieldData(field))
  return serialize(schema, templateData)
  
  // this.fields.map((field: any) => new TemplateFieldData(field));
}

Master.exportBricks = function() {
  if (this.customData && this.customData.exportBrick) {
    let fieldId: number = this.customData.exportBrick
    let field = this.fields[fieldId].code
    for (let obj of this.getObjects()) {
      let brick = obj.fields[field]
      if (brick) {
        addCustomBrick(exportBrick(obj.fields.name, obj.intId, brick))
      }
    }
  }
}

Master.onLoad = async function(connection: Connection) {
  await this.storage.load(connection)
  await this.storage.loadAll(connection)
  this.exportBricks()
}

Master.onCreate = function() {
  this.parent.parent.templates[this.pubkey] = this
}

export { Master }