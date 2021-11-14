import { SType, solceryTypes } from "../index";
import { BinaryReader, BinaryWriter } from 'borsh';
import { ValueRender } from './components'

export class SUrl extends SType {
  id = 4;
  static typename = 'Image';
  typename = 'Image';
  
  valueRender = ValueRender;
  readValue = (reader: BinaryReader) => { return reader.readString() }
  writeValue = (value: string, writer: BinaryWriter) => { writer.writeString(value) }
  
  readConstructed = this.readValue;
  writeConstructed = this.writeValue;

  static readType = (reader: any) => {
  	return new SUrl()
  }
}

solceryTypes.set(4, SUrl)