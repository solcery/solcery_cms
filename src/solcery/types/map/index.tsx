import { SType, solceryTypes } from "../index";
import { BinaryReader, BinaryWriter } from 'borsh';
import { ValueRender, TypedataRender } from './components'
import { Connection } from "@solana/web3.js";


export class SMap extends SType {
  id = 9;
  static typename = "Map";
  keyType: SType;
  valueType: SType;

  valueRender = ValueRender;
  static typedataRender = TypedataRender;

  getName = () => 'Map [ ' + this.keyType ? this.keyType.getName() : 'None' +  ' => ' + this.valueType ? this.valueType.getName() : 'None' + ' ]'

  constructor(src: { keyType: SType, valueType: SType }) {
    super()
    this.keyType = src.keyType;
    this.valueType = src.valueType;
  }

  readValue = (reader: BinaryReader) => { 
    var mapLength = reader.readU32();
    var result: any[] = []
    for (let i = 0; i < mapLength; i++) {
      let key = this.keyType.readValue(reader)
      let value = this.valueType.readValue(reader)
      result.push({ key, value })
    }
    return result
  }

  writeValue = (value: any[], writer: BinaryWriter) => { 
    writer.writeU32(value.length)
    value.forEach((entry: any) => {
      this.keyType.writeValue(entry.key, writer)
      this.valueType.writeValue(entry.value, writer)
    })
  }

  readConstructed = (reader: BinaryReader) => { // TODO
    var mapLength = reader.readU32();
    var result: any[] = []
    for (let i = 0; i < mapLength; i++) {
      let key = this.keyType.readConstructed(reader)
      let value = this.valueType.readConstructed(reader)
      result.push({ key, value })
    }
    return result
  }

  writeConstructed = (value: any[], writer: BinaryWriter) => { 
    writer.writeU32(value.length)
    value.forEach((entry: any) => {
      this.keyType.writeConstructed(entry.key, writer)
      this.valueType.writeConstructed(entry.value, writer)
    })
  }

  static readType = (reader: BinaryReader) => {
    return new SMap({ 
      keyType: reader.readSType(),
      valueType: reader.readSType() 
    })
  }

  writeType = (writer: BinaryWriter) => {
    writer.writeSType(this.keyType)
    writer.writeSType(this.valueType)
  }

  cloneValue = (value: { key: any, value: any }[]) => value.map((entry: any) => {
    return {
      key: this.keyType.cloneValue(entry.key),
      value: this.valueType.cloneValue(entry.value)
    }
  })

  construct = async (value: Map<any,any>, project: any) => {
    let result: any
    value.forEach(async (v, k) => {
      let constructedKey = await this.keyType.construct(k, project)
      let constructedValue = await this.valueType.construct(v, project)
      result[constructedKey] = constructedValue
    })
    return result
  }
}

solceryTypes.set(9, SMap)

