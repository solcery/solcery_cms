import { ValueRender } from "./components"
import { SType } from "../index";
import { BinaryReader, BinaryWriter } from 'borsh';
import { solceryTypes } from "../solceryTypes"

declare module "borsh" {
  interface BinaryReader {
    readI32(): number;
  }

  interface BinaryWriter {
    writeI32(value: number): void;
  }
}

(BinaryReader.prototype).readI32 = function readI32() {
  const reader = this;
  const value = this.buf.readInt32LE(this.offset);
  this.offset += 4;
  return value;
};

(BinaryWriter.prototype).writeI32 = function writeI32(value: number) {
  const writer = this;
  this.maybeResize();
  this.buf.writeInt32LE(value, this.length);
  this.length += 4;
};



export class SInt extends SType {
  id = 2;
  static typename = "Integer";
  typename = "Integer";
  valueRender = ValueRender;

  readValue = (reader: BinaryReader) => { 
    return reader.readI32() 
  };

  writeValue = (value: number, writer: BinaryWriter) => { 
    console.log('writeValue')
    console.log(value)
    writer.writeI32(value) 
  };

  static readType = (reader: any) => {
  	return new SInt()
  }
}

solceryTypes.set(2, SInt)
