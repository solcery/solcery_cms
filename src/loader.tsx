import { PublicKey } from "@solana/web3.js";
import { BinaryReader, BinaryWriter } from 'borsh';

declare module "borsh" {
  interface BinaryReader {
    readPubkey(): PublicKey;
    readBoolean(): boolean;
  }

  interface BinaryWriter {
    writePubkey(value: PublicKey): void;
    writeBoolean(value: boolean): void;
  }
}

(BinaryReader.prototype).readPubkey = function readPubkey() {
  const reader = this;
  const array = reader.readFixedArray(32);
  return new PublicKey(array);
};

(BinaryWriter.prototype).writePubkey = function writePubkey(value: PublicKey) {
  const writer = this;
  writer.writeFixedArray(value.toBuffer());
};

(BinaryReader.prototype).readBoolean = function readBoolean() {
  const reader = this;
  const u8 = reader.readU8();
  return u8 > 0;
};

(BinaryWriter.prototype).writeBoolean = function writeBoolean(value: boolean) {
  const writer = this;
  writer.writeU8(value ? 1 : 0);
};
