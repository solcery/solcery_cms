import { applyBrick, exportBrick, updateCustomBricks } from "./types/brick";
import { BinaryReader, BinaryWriter } from "borsh";
import { PublicKey } from "@solana/web3.js";
//PsMkzGg4CPF92MZ6dDV64dTYHs8m7fqbqSkYJpTNAwb
export const programId = new PublicKey("GN1p6pe6m7rdK3re2TayqJyQtJUme1EnCLyYrTAArYRR");

type GameObject = {
	id: number,
	tplId: any, 
	attrs: any,
}

export class PlayerItem {
  tplId: number;
  publicKey: PublicKey;

  constructor(src: { tplId: number, publicKey: PublicKey }) {
    this.tplId = src.tplId
    this.publicKey = src.publicKey
  }
}

export class Player {
  publicKey: PublicKey;
  online: boolean;
  items: PlayerItem[];

  constructor(src: { publicKey: PublicKey, online: boolean, items: PlayerItem[] }) {
    this.publicKey = src.publicKey
    this.online = src.online
    this.items = src.items
  }
}

export class Game {
  project: PublicKey;
  state: PublicKey;
  step: number;
  players: Player[];
  finished: boolean;
  winners: PublicKey[];

  constructor(src: { project: PublicKey, state: PublicKey, step: number, players: Player[], finished: boolean, winners: PublicKey[] }) {
    this.project = src.project
    this.state = src.state
    this.step = src.step
    this.players = src.players
    this.finished = src.finished
    this.winners = src.winners
  }
}

export const GameSchema = new Map()
GameSchema.set(Game, { kind: 'struct', fields: [
    ['project', 'pubkey'],
    ['state', 'pubkey'],
    ['step', 'u32'],
    ['players', [ Player ]],
    ['finished', 'boolean'],
    ['winners', [ 'pubkey' ]],
]});
GameSchema.set(Player, { kind: 'struct', fields: [
    ['publicKey', 'pubkey'],
    ['online', 'boolean'],
    ['items', [ PlayerItem ]]
]});
GameSchema.set(PlayerItem, { kind: 'struct', fields: [
    ['tplId', 'u32'],
    ['publicKey', 'pubkey'],
]});

type GameSateDiff = {
  gameAttrs: Map<string, number>,
  objectAttrs: Map<number, Map<string, number>>,
}

export class GameState {
	objects: Map<number, GameObject> = new Map();
  attrs: any = {};
	content: any = undefined;

  copy = () => {
    let newState = new GameState()
    newState.content = this.content
    newState.attrs = { ...this.attrs }
    this.objects.forEach((obj: GameObject) => {
      newState.objects.set(obj.id, { id: obj.id, tplId: obj.tplId, attrs: {...obj.attrs }})
    })
    return newState
  }

  init = () => {
    let content = this.content
    if (!content)
      return
    var gameAttributes = content.get('gameAttributes')
    for (let attr of gameAttributes) {
      this.attrs[attr.code] = attr.initialValue ? attr.initialValue : 0;
    }
    var attributes = content.get('attributes')
	  var cardId = 1
	  for (let cardPack of content.get('cards')) { 
	    for (let i = 0; i < cardPack.amount; i++) {
	      var cardType = content.get('cardTypes', cardPack.cardType)
        var attrs: any = {}
        for (let contentAttr of attributes) {
          attrs[contentAttr.code] = 0
        }
        attrs.place = cardPack.place ? cardPack.place : 0;

	      this.objects.set(cardId, {
	      	id: cardId,
	        tplId: cardType.id,
	        attrs: attrs
	      })
        if (cardPack.initializer) {
          let ctx = new Context({ game: this, object: this.objects.get(cardId),  extra: { vars: { cardNumber: i } } })
          applyBrick(cardPack.initializer, ctx)
        }
        if (cardType.action_on_create) {
          let ctx = new Context({ game: this, object: this.objects.get(cardId), extra: {} })
          applyBrick(cardType.action_on_create, ctx)
        }
	      cardId++;
	    }
	  }
    let slots = this.content.get('slots')
    if (slots) {
      for (let slot of slots) {
        var attrs: any = {}
        for (let contentAttr of attributes) {
          attrs[contentAttr.code] = 0
        }
        attrs.place = slot.place ? slot.place : 0;
        this.objects.set(cardId, {
          id: cardId,
          tplId: slot.id,
          attrs: attrs
        })
        if (slot.initializer) {
          let ctx = new Context({ game: this, object: this.objects.get(cardId), extra: {} })
          applyBrick(slot.initializer, ctx)
        }
        cardId++;
      }
    }
  }

  constructor(content: any = undefined) {
    if (content) {
      this.content = content
      this.init()
    }
  }

  write = (writer: BinaryWriter) => {
    writer.writeU32(Object.keys(this.attrs).length)
    for (let attrValue of Object.values(this.attrs)) {
      writer.writeI16(parseInt(attrValue as string))
    }
    writer.writeU32(this.objects.size)
    for (let [_, object ] of this.objects) {
      writer.writeU16(object.tplId)
      writer.writeU32(Object.keys(object.attrs).length)
      for (let value of Object.values(object.attrs)) {
        writer.writeI16(parseInt(value as string))
      }
    }
  }

  toBuffer = () => {
    let writer = new BinaryWriter()
    this.write(writer)
    return writer.buf.slice(0, writer.length)
  }

  read = (reader: BinaryReader) => {
    if (!this.content)
      throw new Error("Error loading gameState from buffer!")
    let gameAttributes = this.content.get('gameAttributes')
    let gameAttrAmount = reader.readU32()
    if (gameAttrAmount != gameAttributes.length)
      throw new Error("Error loading gameState from buffer!");
    for (let attr of gameAttributes) {
      this.attrs[attr.code] = reader.readI16()
    }
    this.objects = new Map()
    let attrs = this.content.get('attributes').map((elem: any) => { return elem.code })
    let objectsNumber = reader.readU32()
    for (let id = 1; id <= objectsNumber; id++) {
      let attrMap = new Map()
      let tplId = reader.readU16()
      let attrAmount = reader.readU32()
      attrs.forEach((attr: string) => {
        attrMap.set(attr, reader.readI16())
      })
      this.objects.set(id, {
        id: id,
        tplId: tplId,
        attrs: Object.fromEntries(attrMap)
      })
    }
    let bricksToAdd: any[] = []
    for (let action of this.content.get('actions')) {
      if (action.brick && action.id && action.name)
        bricksToAdd.push(exportBrick(action.name, action.id, action.brick))
    }
    for (let value of this.content.get('values')) {
      if (value.brick && value.id && value.name)
        bricksToAdd.push(exportBrick(value.name, value.id, value.brick))
    }
    for (let condition of this.content.get('conditions')) {
      if (condition.brick && condition.id && condition.name)
        bricksToAdd.push(exportBrick(condition.name, condition.id, condition.brick))
    }
    updateCustomBricks([])
    updateCustomBricks(bricksToAdd)
  }

  createContext = (extra: any) => {

  }

  exportState = (ctx: any) => {
    let objects:any [] = [];
    ctx.game.objects.forEach((obj: any) => {
      objects.push({
        id: obj.id,
        tplId: obj.tplId,
        attrs: Object.entries(obj.attrs).map(([key, value]) => {
          return { key, value }
        })
      })
    })
    let gameState = {
      id: ctx.log.length,
      state_type: 0,
      value: {
        attrs: Object.entries(ctx.game.attrs).map(([key, value]) => {
          return { key, value }
        }),
        objects: objects,
        deleted_objects: [],
      }
    };
    ctx.log.push(gameState)
  }

  exportDiff = (ctx: any) => {
    let logEntry: any = {
      attrs: Object.entries(ctx.diff.attrs).map(([key, value]) => {
        return { key, value }
      }),
      objects: Object.values(ctx.diff.objects).map((objDiff: any) => {
        return {
          id: objDiff.id,
          tplId: objDiff.tplId,
          attrs: Object.entries(objDiff.attrs).map(([key, value]) => {
            return { key, value }
          }),
        }
      }),
      deleted_objects: Object.keys(ctx.diff.deleted_objects)
    }
    let gameState = {
      id: ctx.log.length,
      state_type: 0,
      value: logEntry,
    };
    ctx.log.push(gameState)
    ctx.diff = {
      attrs: {},
      objects: {},
      deleted_objects: {}
    }
  }

	useCard = (cardId: number) => {
		let object = this.objects.get(cardId)
		if (!object)
			throw new Error("Attempt to cast unexistent card!")
		let ctx = new Context({
			game: this,
			object: object,
			extra: { vars: {} },
		})
    // this.exportDiff(ctx)
		let cardType = this.content.get('cardTypes', object.tplId)
		applyBrick(cardType.action, ctx)
    this.exportDiff(ctx)
    return ctx.log
	}

  dropCard = (cardId: number, dndId: number, targetPlace: number) => {
    let object = this.objects.get(cardId)
    if (!object)
      throw new Error("Attempt to drag and drop unexistent card!")
    let ctx = new Context({
      game: this,
      object: object,
      extra: { vars: { 'target_place': targetPlace } },
    })
    // this.exportState(ctx)
    let dragndrop = this.content.get('drag_n_drops', dndId)
    applyBrick(dragndrop.action_on_drop, ctx)
    this.exportDiff(ctx)
    return ctx.log
  }

  playerCommand = (command: any) => {
    if (command.command_data_type == 0) {
      return this.useCard(command.object_id)
    }
    if (command.command_data_type == 2) {
      return this.dropCard(command.object_id, command.drag_drop_id, command.target_place_id)
    }
  }

  toObject() {
    let globalAttrs: any[] = []
    for (let [name, value] of Object.entries(this.attrs).values()) {
      globalAttrs.push({
        key: name,
        value: value
      })
    }
    let objects: any[] = []
    for (let obj of this.objects.values()) {
      let object: any = {
        id: obj.id,
        tplId: obj.tplId,
      }
      let attrs: any[] = []
      for (let [name, value] of Object.entries(obj.attrs).values()) {
        attrs.push({
          key: name,
          value: value
        })
      }
      object.attrs = attrs
      objects.push(object)
    }
    return {
      attrs: globalAttrs,
      objects: objects,
    }
  }

  toJSON() {
    return this.toObject()
  }

  createEntity(tplId: any) {
    let objectId = this.objects.size + 1;
    var attributes = this.content.get('attributes');
    var attrs: any = {};
    for (let contentAttr of attributes) {
      attrs[contentAttr.code] = 0
    }
    let obj = {
      id: objectId,
      tplId: tplId,
      attrs: attrs
    }
    this.objects.set(objectId, obj)
    return obj
  }

  setAttr = (ctx: any, attrName: string, value: number) => {
    ctx.object.attrs[attrName] = value;
    if (ctx.diff) {
      let objectId = ctx.object.id
      if (!ctx.diff.objects[objectId]) {
        ctx.diff.objects[objectId] = {
          id: objectId,
          tplId: ctx.object.tplId,
          attrs: {}
        }
      }
      ctx.diff.objects[objectId].attrs[attrName] = value
    }
  }
}

class Context {
	vars: any;
	game: GameState;
	object: any;
  diff: any;
  log: any[];
  args: any[] = [];
	constructor(src: { game: GameState, object: any, extra?: any}) {
		this.object = src.object;
		this.game = src.game;
		this.vars = src.extra?.vars || {};
    this.diff = {
      attrs: Object.assign({}, this.game.attrs),
      objects: {},
      deleted_objects: {}
    }
    for (let [objId, obj] of this.game.objects.entries()) {
      this.diff.objects[objId] = {
        id: obj.id,
        tplId: obj.tplId,
        attrs: Object.assign({}, obj.attrs)
      }
    }
    this.log = []
	}
}

type FightLog = {
  Steps: LogEntry[],
}

type LogEntry = {
  playerId: number,
  actionType: number,
  data: number,
}

