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
        if (cardType.initializer) {
          let ctx = new Context({ game: this, object: this.objects.get(cardId), extra: {} })
          applyBrick(cardType.initializer, ctx)
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

	useCard = (cardId: number, playerId: number) => {
    console.log('useCard')
		let object = this.objects.get(cardId)
    console.log(object)
		if (!object)
			throw new Error("Attempt to cast unexistent card!")
		let ctx = new Context({
			game: this,
			object: object,
			extra: { vars: new Map([[ 'playerId', playerId ]]) },
		})
    ctx.diff = {
      gameAttrs: new Map(),
      objectAttrs: new Map()
    }
		let cardType = this.content.get('cardTypes', object.tplId)
    console.log(cardType)
		applyBrick(cardType.action, ctx)
    return ctx.diff
	}

	extractGameState = () => {
		return {
      Cards: this.objectsToCards()
    }
	}

  extractContent = () => {
    return {
      CardTypes: constructCardTypes(this.content),
    }
  }

  extractDisplayData = () => {
    return {
      PlaceDisplayDatas: constructPlaces(this.content)
    }
  }

	objectsToCards = () => {
		var result: Card[] = []
		for (let [ gameObjectId, gameObject ] of this.objects) { 
      let cardAttrs: CardAttr[] = []
      for (let attr of Object.keys(gameObject.attrs)) {
        cardAttrs.push({ Name: attr, Value: gameObject.attrs[attr] })
      }
			result.push({
				CardId: gameObjectId,
				CardType: gameObject.tplId,
				CardPlace: gameObject.attrs.place,
        Attrs: cardAttrs,
			})
		}
		return result
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

  toJson() {
    return JSON.stringify(this.toObject())
  }

}

class Context {
	vars: Map<string, number> = new Map();
	game: GameState;
	object: any;
  diff: any;
  args: any[] = [];
	constructor(src: { game: GameState, object: any, extra?: any}) {
		this.object = src.object;
		this.game = src.game;
		this.vars = src.extra?.vars;
	}
}

const constructPlaces = (content: any) => {
  var result = []
  var placesContent = content.get('places')
  if (!placesContent)
    return
  for (let place of placesContent) { 
    result.push({
      PlaceName: place.name,
      PlaceId: place.placeId,
      PlacePlayer: place.playerMode,
      IsInteractable: place.interactableForActiveLocalPlayer,
      IsVisible: place.visible,
      HorizontalAnchors: {
        Min: (place.x1 ? place.x1 : 0) / 10000,
        Max: (place.x2 ? place.x2 : 0) / 10000,
      },
      VerticalAnchors: {
        Min: (place.y1 ? place.y1 : 0) / 10000,
        Max: (place.y2 ? place.y2 : 0) / 10000,
      },
      ZOrder: place.zOrder,
      CardFaceOption: place.face ? place.face : 0,
      CardLayoutOption: place.layout ? place.layout : 0,
    })
  }
  return result
}


const constructBoardData = (content: any) => {
  var result = {
    LastUpdate: Date.now(),
    Players: constructPlayers(),
    Cards: [],
    Message: {
      Nonce: 1,
      Message: "No message",
      Duration: 5,
    },
    Random: {
      x: 1,
      y: 2,
      z: 3,
      w: 4,
    },
    EndTurnCardId: 5,
  }
  return result
}


type FightLog = {
  Steps: LogEntry[],
}

type LogEntry = {
  playerId: number,
  actionType: number,
  data: number,
}

type Card = { // TODO: from content
  CardId: number,
  CardType: number,
  CardPlace: number,
  Attrs: CardAttr[],
}

type CardAttr = {
  Name: string,
  Value: number,
}

type OldPlayer = {
  Address: string,
  IsActive: boolean,
  HP: number,
  Coins: number,
  IsMe: boolean,
  Attrs: number[]
}

type CardType = { //TODO: from content
  Id: number,
  Metadata: {
    Picture: number,
    PictureUrl: string,
    Coins: number,
    Name: string,
    Description: string,
  },
  BrickTree: any, // TODO: brick
}

type BoardData = {
  LastUpdate: number,
  Players: OldPlayer[],
  Cards: Card[],
  Message: {
    Nonce: number,
    Message: string,
    Duration: number
  }
  Random: {
    x: number,
    y: number,
    z: number,
    w: number,
  }
  EndTurnCardId: number
}


const constructCardTypes = (content: any) => {
  var result: CardType[] = []
  var cardTypesContent = content.get('cardTypes')
  if (!cardTypesContent)
    return result
  for (let cardType of cardTypesContent) { 
    result.push({
      Id: cardType.id,
      BrickTree: {},
      Metadata: {
        Picture: cardType.pictureNumber,
        PictureUrl: cardType.picture,
        Coins: cardType.coins,
        Name: cardType.name,
        Description: cardType.description,
      }
    })
  }
  return result
} 

const constructPlayers = () => {
 return [
  {
    Address: "None",
    IsActive: true,
    HP: 25,
    Coins: 0,
    IsMe: true,
    Attrs: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  },
  {
    Address: "None",
    IsActive: false,
    HP: 25,
    Coins: 0,
    IsMe: false,
    Attrs: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  }
 ]
}

