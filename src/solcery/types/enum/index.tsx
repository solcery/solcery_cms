import { SType, solceryTypes } from "../index";
import { BinaryReader, BinaryWriter } from 'borsh';
import { ValueRender, TypedataRender } from './components'


export class SEnum extends SType {
  id = 8;
  static typename = 'Enum';
  
  values: string[];
  valueRender = ValueRender;
  static typedataRender = TypedataRender;

  getName = (project: any) => `SEnum<${this.values.join('|')}>`;
  
  constructor(src: { values: string[] }) {
    super()
    this.values = src.values;
  }

  readValue = (reader: BinaryReader) => { 
    return reader.readU8()
  }
  writeValue = (value: number, writer: BinaryWriter) => { 
    writer.writeU8(value)
  }
  readConstructed = this.readValue;
  writeConstructed = this.writeValue;

  static readType = (reader: BinaryReader) => {
    var valuesAmount = reader.readU32()
    var values: string[] = []
    for (let i = 0; i < valuesAmount; i++) {
      values.push(reader.readString())
    }
    return new SEnum({ values })
  }

  writeType = (writer: BinaryWriter) => {
    writer.writeU32(this.values.length)
    for (let value of this.values) {
      writer.writeString(value)
    }
  }
}

solceryTypes.set(8, SEnum)

