import { ValueRender } from "./components"
import { SType } from "../index";
import { BinaryReader, BinaryWriter } from 'borsh';
import { solceryTypes } from "../solceryTypes"

declare module "borsh" {
  interface BinaryReader {
    readI32(): number;
    readI16(): number;
  }

  interface BinaryWriter {
    writeI32(value: number): void;
    writeI16(value: number): void;
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

(BinaryReader.prototype).readI16 = function readI16() {
  const reader = this;
  const value = this.buf.readInt16LE(this.offset);
  this.offset += 2;
  return value;
};

(BinaryWriter.prototype).writeI16 = function writeI16(value: number) {
  const writer = this;
  this.maybeResize();
  this.buf.writeInt16LE(value, this.length);
  this.length += 2;
};


export class SInt extends SType {
  id = 2;
  static typename = "Integer";
  valueRender = ValueRender;
  getName = (project: any) => 'SInt';
  sorter = (a: number | undefined, b: number | undefined) => { if (!a) a = 0; if (!b) b = 0; return a - b  }

  readValue = (reader: BinaryReader) => { 
    return reader.readI32() 
  };

  writeValue = (value: number, writer: BinaryWriter) => { 
    writer.writeI32(value) 
  };
  readConstructed = this.readValue;
  writeConstructed = this.writeValue;

  static readType = (reader: any) => {
  	return new SInt()
  }
}

solceryTypes.set(2, SInt)
