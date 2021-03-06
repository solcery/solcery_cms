import { SType, solceryTypes } from "../index";
import { BinaryReader, BinaryWriter } from 'borsh';
import { ValueRender, TypedataRender } from './components'
import { Connection } from "@solana/web3.js";


export class SArray extends SType {
  id = 7;
  static typename = "Array";
  subtype: SType;
  getName = (project: any) => `SArray<${this.subtype.getName(project)}>`;

  valueRender = ValueRender;
  static typedataRender = TypedataRender;

  constructor(src: { subtype: SType }) {
    super()
    this.subtype = src.subtype;
    this.nameRender = (<p>Array: {this.subtype.nameRender}</p>); 
  }

  readValue = (reader: BinaryReader) => { 
    var arrayLength = reader.readU32();
    var result = []
    for (let i = 0; i < arrayLength; i++) {
      result.push(this.subtype.readValue(reader))
    }
    return result
  }
  writeValue = (value: any[], writer: BinaryWriter) => { 
    writer.writeU32(value.length)
    value.forEach((val) => this.subtype.writeValue(val, writer))
  }

  readConstructed = (reader: BinaryReader) => {
    var arrayLength = reader.readU32();
    var result = []
    for (let i = 0; i < arrayLength; i++) {
      result.push(this.subtype.readConstructed(reader))
    }
    return result
  }
  writeConstructed = (value: any[], writer: BinaryWriter) => {
    writer.writeU32(value.length)
    value.forEach((val) => this.subtype.writeConstructed(val, writer))
  }

  static readType = (reader: BinaryReader) => {
    return new SArray({ subtype: reader.readSType() })
  }

  cloneValue = (value: any[]) => value.map((v) => this.subtype.cloneValue(v))
  
  writeType = (writer: BinaryWriter) => {
    writer.writeSType(this.subtype)
  }

  construct = (value: any[], project: any) => {
    let result: any[] = []
    for (let val of value) {
      result.push(this.subtype.construct(val, project) )
    }
    return result
  }
}

solceryTypes.set(7, SArray)

