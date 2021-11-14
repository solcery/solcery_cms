import { SType, solceryTypes } from "../index";
import { BinaryReader, BinaryWriter } from 'borsh';
import { ValueRender, TypedataRender } from './components'
import { Connection } from "@solana/web3.js";


export class SArray extends SType {
  id = 7;
  static typename = "Array";
  typename = "Array";
  subtype: SType;

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

  writeType = (writer: BinaryWriter) => {
    writer.writeSType(this.subtype)
  }

  construct = async (value: any[], connection: Connection) => {
    let result: any[] = []
    for (let val of value) {
      result.push(await this.subtype.construct(val, connection) )
    }
    return result
  }
}

solceryTypes.set(7, SArray)

