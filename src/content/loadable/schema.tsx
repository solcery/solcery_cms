import { SType } from '../../solcery/types'
import { PublicKey } from "@solana/web3.js";

export class ProjectData {
  name: string = 'No name';
  owner: PublicKey; 
  tplStoragePubkey: PublicKey;
  constructor( src : { name: string, owner: PublicKey, tplStoragePubkey: PublicKey } ) {
    this.name = src.name
    this.owner = src.owner
    this.tplStoragePubkey = src.tplStoragePubkey
  }
}

export class TemplateData {
  id: number;
  name: string;
  code: string;
  fields: TemplateFieldData[];
  storages: PublicKey[];
  maxFieldIndex: number;
  customData: string;
  constructor(src: { id: number, name : string, code: string, maxFieldIndex: number, storages: PublicKey[], fields: TemplateFieldData[], customData: string } ) {
    this.id = src.id;
    this.storages = src.storages;
    this.code = src.code;
    this.maxFieldIndex = src.maxFieldIndex;
    this.name = src.name;
    this.fields = src.fields;
    this.customData = src.customData  
  }
}

export class TemplateFieldData { //TODO: Template field params
  id: number;
  fieldType: SType;
  name: string;
  code: string;
  constructor(src: { id: number, code: string, fieldType: SType, name: string }) {
    this.id = src.id;
    this.code = src.code;
    this.fieldType = src.fieldType;
    this.name = src.name;
  }
}

export class StorageData {
  templatePubkey: PublicKey;
  accounts: PublicKey[];
  constructor (src: { templatePubkey: PublicKey, accounts: PublicKey[] }) {
    this.templatePubkey = src.templatePubkey;
    this.accounts = src.accounts;
  }
}


export const schema = new Map()

schema.set(ProjectData, { kind: 'struct', fields: [
    ['name', 'string'],
    ['owner', 'pubkey'],
    ['tplStoragePubkey', 'pubkey'],
]});
schema.set(StorageData, { kind: 'struct', fields: [
    ['templatePubkey', 'pubkey'],
    ['accounts', [ 'pubkey' ]],
]});
schema.set(TemplateData, { kind: 'struct', fields: [
    ['id', 'u32'],
    ['name', 'string'],
    ['code', 'string'],
    ['storages', [ 'pubkey' ]],
    ['maxFieldIndex', 'u32'],
    ['fields', [ TemplateFieldData ]],
    ['customData', 'string'],
]});
schema.set(TemplateFieldData, { kind: 'struct', fields: [
    ['id', 'u32'],
    ['fieldType', 'sType'],
    ['name', 'string'],
    ['code', 'string'],
    ['construct_client', 'boolean'],
    ['construct_server', 'boolean'],
]});
