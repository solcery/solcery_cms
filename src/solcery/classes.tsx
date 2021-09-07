import { PublicKey, Connection} from "@solana/web3.js";
import { getAccountData, getMultipleAccountsData, getAccountObject, getAllAccountObjects} from "./engine"
import { BinaryReader, BinaryWriter } from "borsh";
import { solceryTypes, SType } from "./types";




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
  publicKey: PublicKey = new PublicKey('2WQzLh8J8Acmbzzi4qVmNv2ZX3hWycjHGMu7LRjQ8hbz');
  owner: PublicKey = new PublicKey('2WQzLh8J8Acmbzzi4qVmNv2ZX3hWycjHGMu7LRjQ8hbz'); //TODO: dumb
  templateStorage: PublicKey = new PublicKey('2WQzLh8J8Acmbzzi4qVmNv2ZX3hWycjHGMu7LRjQ8hbz');
  constructor( src : { name: string, owner: PublicKey, templateStorage: PublicKey } | undefined = undefined) {
    super()
    if (src) {
      this.name = src.name
      this.owner = src.owner
      this.templateStorage = src.templateStorage
    }
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
  fields: TemplateField[] = [];
  storages: PublicKey[] = [];
  maxFieldIndex: number = 0;
  customParams: any = {};
  constructor(src: { id: number, name : string, maxFieldIndex: number, storages: PublicKey[], fields: TemplateField[], customData: Uint8Array  } | undefined = undefined) {
    super()
    if (src) {
      this.id = src.id;
      this.storages = src.storages;
      this.maxFieldIndex = src.maxFieldIndex;
      this.name = src.name;
      this.fields = src.fields;
      if (src.customData.length > 0)
        this.customParams = JSON.parse(Buffer.from(src.customData).toString());
    }
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
      return undefined
    return TplObject.build(publicKey, objectData, this)
  }

  async getObjects(connection: Connection, publicKeys: PublicKey[]) {
    var result = []
    var accountInfos = await connection.getMultipleAccountsInfo(publicKeys)
    for (let i in accountInfos) {
      if (accountInfos[i]) {
        result.push((await TplObject.build(publicKeys[i], accountInfos[i]!.data, this))[0])
      }
    }
    return result
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
    return [ tplObject, template ]
  }


  async serialize(connection: Connection) {
    console.log(this)
    var dataWriter = new BinaryWriter()
    var offsetWriter = new BinaryWriter()
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
  enabled = false;
  fieldType = new SType();
  name = "Field name";
  constructor(src: { id: number, enabled: boolean, fieldType: SType, name: string } | undefined = undefined) {
    if (src) {
      this.id = src.id;
      this.enabled = src.enabled;
      this.fieldType = src.fieldType;
      this.name = src.name;
     
    }
  }
}

export const SolcerySchema = new Map()
SolcerySchema.set(TemplateData, { kind: 'struct', fields: [
    ['id', 'u32'],
    ['name', 'string'],
    ['storages', [ 'pubkey' ]],
    ['maxFieldIndex', 'u32'],
    ['fields', [ TemplateField ]],
    ['customData', ['u8']],
]});
SolcerySchema.set(TemplateField, { kind: 'struct', fields: [
    ['id', 'u32'],
    ['fieldType', 'sType'],
    ['name', 'string'],
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