import { SType, solceryTypes } from "../index";
import { BinaryReader, BinaryWriter } from 'borsh';
import { ValueRender, TypedataRender } from './components'


export class SArray extends SType {
  id = 7;
  name = "Array";
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

  static readType = (reader: BinaryReader) => {
    return new SArray({ subtype: reader.readSType() })
  }

  writeType = (writer: BinaryWriter) => {
    writer.writeSType(this.subtype)
  }
}

solceryTypes.set(7, SArray)

