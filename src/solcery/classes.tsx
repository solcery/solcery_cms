import { PublicKey, Connection} from "@solana/web3.js";
import { getAccountData, getAccountObject } from "./engine"
import { BinaryReader, BinaryWriter } from "borsh";




class SolceryAccount {
  static async get(connection: Connection, publicKey: PublicKey) {
    return await getAccountObject(connection, publicKey, this, SolcerySchema)
  }
}

export class Project extends SolceryAccount {
  name: string = 'No name';
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

  // static async get(connection: Connection, publicKey: PublicKey) {
  //   return await getAccountObject(connection, publicKey, TemplateData, SolcerySchema)
  // }

  getField(fieldId: number) {
    for (let field of this.fields) {
      if (field.id == fieldId)
        return field;
    }
    throw new Error('Template.getField error')
  }

  async getObject(connection: Connection, publicKey: PublicKey) {
    var objectData = await getAccountData(connection, publicKey)
    if (!objectData)
      return {}
    objectData = objectData.slice(33)
    var fields = new Map()
    var reader = new BinaryReader(objectData)
    var templatePublicKey = reader.readPubkey()
    var fieldId = reader.readU32();
    while (fieldId > 0) {
      var field = this.getField(fieldId)
      if (field === undefined)
        throw new Error("Error deserializing tpl Object")
      if (field.fieldType == 1) {
        fields.set(field.id, reader.readU32());
      }
      if (field.fieldType == 2) {
        fields.set(field.id, reader.readString());
      }
      var fieldId = reader.readU32();
    }
    return {
      template: templatePublicKey,
      fields: fields,
    };
  }
}

export class TplObject {
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
      if (field === undefined)
        throw new Error("Error deserializing tpl Object")
      if (field.fieldType == 1) {
        fields.set(field.id, reader.readU32());
      }
      if (field.fieldType == 2) {
        fields.set(field.id, reader.readString());
      }
      var fieldId = reader.readU32();
    }
    var tplObject = new TplObject({
      template: templatePublicKey,
      fields: fields,
    });
    return [ tplObject, template ]
  }

  async borshSerialize(connection: Connection) {
    var writer = new BinaryWriter()
    var template = await TemplateData.get(connection, this.template)
    for (let [fieldId, value] of this.fields) {
      var field = template.getField(fieldId)
      writer.writeU32(field.id)
      if (field === undefined)
        throw new Error("Error serializing tpl Object")
      if (field.fieldType == 1) {
        writer.writeU32(value)
      }
      if (field.fieldType == 2) {
        writer.writeString(value)
      }
    }
    return writer.buf.slice(0, writer.length)
  }
}

export class Template extends TemplateData {
  publicKey: PublicKey | null = null;
}

export class TemplateField {
  id = 0;
  enabled = false;
  fieldType = 0;
  name = "Field name";
  data: number[] = [];
  constructor(src: { id: number, enabled: boolean, fieldType: number, name: string, data: number[] } | undefined = undefined) {
    if (src) {
      this.data = src.data;
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
    ['fieldType', 'u8'],
    ['name', 'string'],
    ['fieldData', ['u8']],
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
