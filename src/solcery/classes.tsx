import { PublicKey, Connection} from "@solana/web3.js";
import { getAccountData, getMultipleAccountsData, getAccountObject, getAllAccountObjects} from "./engine"
import { BinaryReader, BinaryWriter } from "borsh";
import { SType } from "./types";
import { updateCustomBricks, exportBrick, BrickSignature } from './types/brick'


class SolceryAccount {
  publicKey: PublicKey = new PublicKey('2WQzLh8J8Acmbzzi4qVmNv2ZX3hWycjHGMu7LRjQ8hbz');
  static async get(connection: Connection, publicKey: PublicKey) {
    var ret = await getAccountObject(connection, publicKey, this, SolcerySchema)
    ret.publicKey = publicKey
    return ret;
  }
  static async getAll(connection: Connection, publicKeys: PublicKey[]) {
    return await getAllAccountObjects(connection, publicKeys, this, SolcerySchema)
  }
}

export class Project extends SolceryAccount {
  name: string = 'No name';
  owner: PublicKey; //TODO: dumb
  templateStorage: PublicKey;
  constructor( src : { name: string, owner: PublicKey, templateStorage: PublicKey } ) {
    super()
    this.name = src.name
    this.owner = src.owner
    this.templateStorage = src.templateStorage
  }

  async updateBricks(connection: Connection) {  
    var result: BrickSignature[] = []
    const projectStorage = await Storage.get(connection, this.templateStorage)
    var templates = await TemplateData.getAll(connection, projectStorage.accounts)
    for (var tpl of templates) {
      if (tpl.customData !== '') {
        var customParams = JSON.parse(tpl.customData)
        if (customParams.exportBrick) {
          var brickField: number = customParams.exportBrick
          var objects = await tpl.getAllObjects(connection)
          for (let obj of objects) {
            let brick = obj.fields.get(brickField)
            if (brick) {
              result.push(exportBrick(obj, brick))
            }
          }
        } 
      }
    }  
    updateCustomBricks(result)
  }

  async сonstructContent(connection: Connection) {
    let result: Map<number, any> = new Map()
    await this.updateBricks(connection)
    await this.updateBricks(connection)
    const projectStorage = await Storage.get(connection, this.templateStorage)
    var templates = await TemplateData.getAll(connection, projectStorage.accounts)
    for (var tpl of templates) {
      result.set(tpl.code, await tpl.construct(connection))
    }
    let content = Object.fromEntries(await result)
    return content
  }

}

export class Storage extends SolceryAccount {
  publicKey: PublicKey = new PublicKey('2WQzLh8J8Acmbzzi4qVmNv2ZX3hWycjHGMu7LRjQ8hbz');
  template: PublicKey = new PublicKey('2WQzLh8J8Acmbzzi4qVmNv2ZX3hWycjHGMu7LRjQ8hbz');
  accounts: PublicKey[] = [];
  constructor (src: { template: PublicKey, accounts: PublicKey[] } | undefined = undefined) {
    super()
    if (src) {
      this.template = src.template;
      this.accounts = src.accounts;
    }
  }
}

export class TemplateData extends SolceryAccount {
  publicKey: PublicKey = new PublicKey('2WQzLh8J8Acmbzzi4qVmNv2ZX3hWycjHGMu7LRjQ8hbz');
  id: number = 0;
  name: string = "Template name";
  code: string = "templateCode"
  fields: TemplateField[] = [];
  storages: PublicKey[] = [];
  maxFieldIndex: number = 0;
  customData: string = '';
  constructor(src: { id: number, name : string, code: string, maxFieldIndex: number, storages: PublicKey[], fields: TemplateField[], customData: string } ) {
    super()
    this.id = src.id;
    this.storages = src.storages;
    this.code = src.code;
    this.maxFieldIndex = src.maxFieldIndex;
    this.name = src.name;
    this.fields = src.fields;
    this.customData = src.customData  
  }

  getCustomData() {
    if (this.customData === '') {
      return {}
    }
    return JSON.parse(this.customData)

  }

  getField(fieldId: number) {
    for (let field of this.fields) {
      if (field.id == fieldId)
        return field;
    }
    return null
  }

  async getObject(connection: Connection, publicKey: PublicKey) {
    var objectData = await getAccountData(connection, publicKey)
    if (!objectData)
      throw new Error("Template.getObject failed")
    return TplObject.build(publicKey, objectData, this)
  }

  async getObjects(connection: Connection, publicKeys: PublicKey[]) {
    var result: TplObject[] = []
    var accountInfos = await connection.getMultipleAccountsInfo(publicKeys)
    for (let i in accountInfos) {
      if (accountInfos[i]) {
        result.push(await TplObject.build(publicKeys[i], accountInfos[i]!.data, this))
      }
    }
    return result
  }

  async getAllObjects(connection: Connection) {
    var result: TplObject[] = []
    var storages = await Storage.getAll(connection, this.storages)
    for (let storage of storages) {
      var storageObjects = await this.getObjects(connection, storage.accounts)
      result = result.concat(storageObjects)
    }
    return result
  }

  async construct(connection: Connection) {
    var constructedObjects: Map<string, any> = new Map()
    let objects = await this.getAllObjects(connection)
    for (let object of objects) {
      constructedObjects.set(object.publicKey.toBase58(), object.construct(this))
    }
    return Object.fromEntries(constructedObjects)
  }

  async exportBricks(connection: Connection, result: any[]) {
    let customData = this.getCustomData()
    let fieldId = customData.exportBrick
    if (!fieldId) //TODO: validate field type
      return
    let objects = await this.getAllObjects(connection)
    for (let object of objects) {
      let brick = object.fields.get(fieldId)
      if (brick) {
        result.push(brick.export())
      }
    }
  }
}

export class TplObject {
  id: number;
  publicKey: PublicKey = new PublicKey('2WQzLh8J8Acmbzzi4qVmNv2ZX3hWycjHGMu7LRjQ8hbz');
  template: PublicKey;
  fields: Map<number, any>;
  constructor(src: { template : PublicKey, fields: Map<number, any>, publicKey: PublicKey, id: number} ) {
    this.id = src.id;
    this.template = src.template;
    this.fields = src.fields;
    this.publicKey = src.publicKey;
  }

  getName() {
    var prefix = "[" + this.id + "] "
    var name = this.fields.get(1)
    if (name && name != "") 
      return prefix + name;
    return prefix + this.publicKey.toBase58();
  }

  construct(tpl: TemplateData) {
    var constructed: Map<string, any> = new Map();
    for (let [fieldId, value] of this.fields) {
      var field = tpl.getField(fieldId)
      if (field) {
        constructed.set(field.code, value)
      }
    }
    var result = Object.fromEntries(constructed)
    result.id = this.id
    result.publicKey = this.publicKey.toBase58()
    return result
  }

  static async getTemplate(connection: Connection, publicKey: PublicKey) {
    var objectData = await getAccountData(connection, publicKey)
    if (!objectData)
      return undefined
    var reader = new BinaryReader(objectData.slice(37)) //TODO
    var templatePublicKey = reader.readPubkey()
    return await TemplateData.get(connection, templatePublicKey)
  }

  static async build(publicKey: PublicKey, src: Buffer, template: TemplateData) {
    src = src.slice(33)
    var reader = new BinaryReader(src)
    var id = reader.readU32()
    var templatePublicKey = reader.readPubkey()
    var fieldsAmount = reader.readU32()
    var fieldOffsets = [];
    for (let i = 0; i < fieldsAmount; i++) {
      fieldOffsets.push({
        fieldId: reader.readU32(),
        start: reader.readU32(),
        end: reader.readU32(),
      })
    }
    var rawData = reader.readFixedArray(reader.readU32())
    var fields = new Map()
    for (let fieldOffset of fieldOffsets) {
      var field = template.getField(fieldOffset.fieldId)
      if (!field)
        continue
      var rawFieldData = Buffer.from(rawData.subarray(fieldOffset.start, fieldOffset.end))
      var tmpReader = new BinaryReader(rawFieldData)
      var stype = field.fieldType
      fields.set(field.id, stype.readValue(tmpReader))
    }
    var tplObject = new TplObject({
      id: id,
      publicKey: publicKey,
      template: templatePublicKey,
      fields: fields,
    });
    return tplObject
  }


  async serialize(connection: Connection) {
    var offsetWriter = new BinaryWriter()
    var dataWriter = new BinaryWriter()
    var template = await TemplateData.get(connection, this.template)
    offsetWriter.writeU32(this.fields.size)
    for (let [fieldId, value] of this.fields) {
      offsetWriter.writeU32(fieldId)
      offsetWriter.writeU32(dataWriter.length)
      var field = template.getField(fieldId)
      field.fieldType.writeValue(value, dataWriter)
      offsetWriter.writeU32(dataWriter.length)
    }
    offsetWriter.writeU32(dataWriter.length)
    return Buffer.concat([
      offsetWriter.buf.slice(0, offsetWriter.length),
      dataWriter.buf.slice(0, dataWriter.length)
    ])
  }
}

export class TemplateField { //TODO: Template field params
  id = 0;
  fieldType = new SType();
  name = "Field name";
  code = "fieldName";
  constructor(src: { id: number, code: string, fieldType: SType, name: string } | undefined = undefined) {
    if (src) {
      this.id = src.id;
      this.code = src.code;
      this.fieldType = src.fieldType;
      this.name = src.name;
     
    }
  }
}

export const SolcerySchema = new Map()
SolcerySchema.set(TemplateData, { kind: 'struct', fields: [
    ['id', 'u32'],
    ['name', 'string'],
    ['code', 'string'],
    ['storages', [ 'pubkey' ]],
    ['maxFieldIndex', 'u32'],
    ['fields', [ TemplateField ]],
    ['customData', 'string'],
]});
SolcerySchema.set(TemplateField, { kind: 'struct', fields: [
    ['id', 'u32'],
    ['fieldType', 'sType'],
    ['name', 'string'],
    ['code', 'string'],
    ['construct_client', 'boolean'],
    ['construct_server', 'boolean'],
]});
SolcerySchema.set(Storage, { kind: 'struct', fields: [
    ['template', 'pubkey'],
    ['accounts', [ 'pubkey' ]],
]});
SolcerySchema.set(Project, { kind: 'struct', fields: [
    ['name', 'string'],
    ['owner', 'pubkey'],
    ['templateStorage', 'pubkey'],
]});
