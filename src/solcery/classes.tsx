import { PublicKey, Connection} from "@solana/web3.js";
import { getAccountData, getAccountObject } from "./engine"
import { BinaryReader, BinaryWriter } from "borsh";
import { solceryTypes, SType } from "./types";




class SolceryAccount {
  publicKey: PublicKey = new PublicKey('2WQzLh8J8Acmbzzi4qVmNv2ZX3hWycjHGMu7LRjQ8hbz');
  static async get(connection: Connection, publicKey: PublicKey) {
    var ret = await getAccountObject(connection, publicKey, this, SolcerySchema)
    ret.publicKey = publicKey
    return ret;
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
  name: string = "Template name";
  fields: TemplateField[] = [];
  storages: PublicKey[] = [];
  maxFieldIndex: number = 0;
  customData: number[] = [];
  constructor(src: { name : string, maxFieldIndex: number, storages: PublicKey[], fields: TemplateField[], customData: number[] } | undefined = undefined) {
    super()
    if (src) {
      this.storages = src.storages;
      this.maxFieldIndex = src.maxFieldIndex;
      this.name = src.name;
      this.fields = src.fields;
      this.customData = src.customData;
    }
  }

  getField(fieldId: number) {
    for (let field of this.fields) {
      if (field.id == fieldId)
        return field;
    }
    throw new Error('Template.getField error')
  }
}

export class TplObject {
  publicKey: PublicKey = new PublicKey('2WQzLh8J8Acmbzzi4qVmNv2ZX3hWycjHGMu7LRjQ8hbz');
  template: PublicKey;
  fields: Map<number, any>;
  constructor(src: { template : PublicKey, fields: Map<number, any> } ) {
    this.template = src.template;
    this.fields = src.fields
  }

  static async get(connection: Connection, publicKey: PublicKey) {
    var objectData = await getAccountData(connection, publicKey)
    if (!objectData)
      return [ undefined, undefined ]
    objectData = objectData.slice(33)
    var fields = new Map()
    var reader = new BinaryReader(objectData)
    var templatePublicKey = reader.readPubkey()
    var template = await TemplateData.get(connection, templatePublicKey);
    var fieldId = reader.readU32();
    while (fieldId > 0) {
      var field = template.getField(fieldId)
      var stype = field.fieldType
      fields.set(field.id, stype.readValue(reader))
      var fieldId = reader.readU32();
    }
    var tplObject = new TplObject({
      template: templatePublicKey,
      fields: fields,
    });
    console.log(tplObject)
    return [ tplObject, template ]
  }

  async borshSerialize(connection: Connection) {
    var writer = new BinaryWriter()
    var template = await TemplateData.get(connection, this.template)
    for (let [fieldId, value] of this.fields) {
      var field = template.getField(fieldId)
      writer.writeU32(field.id)
      field.fieldType.writeValue(value, writer)
    }
    return writer.buf.slice(0, writer.length)
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
    ['name', 'string'],
    ['storages', [ 'pubkey' ]],
    ['maxFieldIndex', 'u32'],
    ['fields', [ TemplateField ]],
    ['customData', ['u8']],
]});
SolcerySchema.set(TemplateField, { kind: 'struct', fields: [
    ['id', 'u32'],
    ['enabled', 'boolean'],
    ['fieldType', 'sType'],
    ['name', 'string'],
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