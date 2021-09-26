import { SType, solceryTypes } from "../index";
import { BinaryReader, BinaryWriter } from 'borsh';
import { ValueRender } from './components'

export class SUrl extends SType {
  id = 4;
  typeName = "Image";
  valueRender = ValueRender;
  readValue = (reader: BinaryReader) => { return reader.readString() }
  writeValue = (value: string, writer: BinaryWriter) => { writer.writeString(value) }
  static readType = (reader: any) => {
  	return new SUrl()
  }
}

solceryTypes.set(4, SUrl)