import React, { useState, useEffect } from "react";
import { useConnection, sendTransaction } from "../../contexts/connection";
import { useWallet } from "../../contexts/wallet";
import { usePlayer } from "../../contexts/player";
import { useParams } from "react-router-dom";
import Unity, { UnityContext } from "react-unity-webgl";
import { GameState, GameSchema, Game, programId } from "../../solcery/game"
import { ConstructedContent, ConstructedObject } from "../../solcery/content"
import { Project } from "../../solcery/classes"
import { Button, Modal, Layout, Row, Col, Divider } from 'antd';
import { ConnectButton } from "../../components/ConnectButton"
import { BinaryReader, BinaryWriter, deserializeUnchecked } from "borsh";
import $ from 'jquery';

import "./style.css"
import "./play_btn.css"
import "./style.scss"

import axios from 'axios'
import {decodeMetadata, getMetadataAccount} from "../../metaplex/metadata";
import {clusterApiUrl, Connection, PublicKey, Account, TransactionInstruction, SystemProgram, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { ScrollMenu, VisibilityContext } from "react-horizontal-scrolling-menu";

import 'animate.css';

const { Header, Footer, Sider, Content } = Layout;

const {TOKEN_PROGRAM_ID} = require('@solana/spl-token');

type GameViewParams = {
  gameId: string;
};

export const CardRender = (props: {
  card: any,
  picture?: string,
  onClick: () => void,
}) => {
  return (
  <div className="cardrender" onClick={props.onClick}>
    <div className="cardname">{ props.card.name }</div>
    <div className="carddescription">{ props.card.description }</div>
    <img src={props.picture ? props.picture : props.card.picture} className="cardimage"/>
    <img src="https://i.ibb.co/mG7BnfV/frame.png" className="cardframe"/>
  </div>)
}

export const CardRotator = (props: {
  card: any,
  picture?: string,
  onClick: () => void,
}) => {
    
  useEffect(() => {
    const maxTilt = 30; // Max card tilt (deg).

    $(".b-game-card")
        .mousemove(function(evt: any) {
            let bounding = mouseOverBoundingElem(evt);
            let posX = bounding.width / 2 - bounding.x;
            let posY = bounding.height / 2 - bounding.y;
            let hypotenuseCursor = Math.sqrt(Math.pow(posX, 2) + Math.pow(posY, 2));
            let hypotenuseMax = Math.sqrt(Math.pow(bounding.width / 2, 2) + Math.pow(bounding.height / 2, 2));
            let ratio = hypotenuseCursor / hypotenuseMax;

            $(".cover", this).css({
                transform: `rotate3d(${posY / hypotenuseCursor}, ${-posX / hypotenuseCursor}, 0, ${ratio * maxTilt}deg)`,
                filter: `brightness(${1.5 - bounding.y / bounding.height * 1})` // 0.6 = offset, brightness will be from 0.6 to 1.6
            });
            $(".gloss", this).css({
                transform: `translateX(${posX * ratio * 0.97}px) translateY(${posY * ratio}px)` // 0.75 = offset
            });
        })
        .mouseleave(function() {
            let css = {
                transform: "",
                filter: ""
            };
            $(".cover, .gloss", this).css(css);
        });

    function mouseOverBoundingElem(evt: any) {
        let target = evt.target
        while (target.className != 'b-game-card') {
          target = target.parentElement
        }
        // if (target.className != 'b-game-card')
        //   target = target.parentElement.parentElement.parentElement
        let bounding = target.getBoundingClientRect();
        let x = evt.originalEvent.pageX - Math.round(bounding.left);
        let y = evt.originalEvent.pageY - Math.round(bounding.top);

        return {
            x: Math.max(0, x),
            y: Math.max(0, y),
            width: Math.round(bounding.width),
            height: Math.round(bounding.height)
        };
    }

  }, []);

  return (
    <div className="b-game-card" onClick={props.onClick}>
      <div className="cover">
        <CardRender 
          onClick={props.onClick}
          picture={props.picture}
          card={props.card}
        />
        <div className="gloss"></div>
      </div>
    </div>)
}


export const SlotSelector = (props: {
  slot: any,
  onChange: () => void,
  nfts: any,
}) => {
  const [isModalVisible, setIsModalVisible] = useState(false);
  const showModal = () => { setIsModalVisible(true) };
  const handleOk = () => { setIsModalVisible(false) };
  const handleCancel = () => { setIsModalVisible(false) };
  const selectNft = (index: number | undefined = undefined) => {
    if (props.slot.selected) {
      props.slot.selected.isSelected = false
      props.slot.selected = undefined
    }
    if (index !== undefined) {
      props.slot.selected = props.nfts[index]
      props.slot.selected.isSelected = true
    }
    props.onChange()
    handleOk()
  }

  return ( 
    <div>
      {!isModalVisible && <div className="cardholder animate__animated animate__bounceIn">
        <CardRender 
          onClick={showModal}
          card={props.slot.selected ? props.slot.selected.cardType : props.slot.defaultCard}
          picture={props.slot.selected && props.slot.selected.picture}
        />
      </div>}
      {isModalVisible && <div className="modal" onClick={handleCancel}>
        <Row>
          <h1 className="animate__animated animate__fadeIn">CHOOSE AN NFT</h1>
        </Row>
        <Row>
        </Row>
        <Row style={{ margin: "auto"}}>
          <div className="l-container">
            {props.slot.selected && <CardRotator 
              onClick={() => { selectNft() }}
              card={props.slot.defaultCard}
            />}
            {props.nfts.map((elem: any, index: any) => {
              if (!elem.isSelected && props.slot.data.collections.find((collectionId: number) => collectionId === elem.collection)) {
                return (<CardRotator 
                  key={index}
                  onClick={() => { selectNft(index) }}
                  card={elem.cardType}
                  picture={elem.picture}
                />)
              }
            })}
          </div>
        </Row>
      </div>}
    </div>)
}

const getVerifiedCreator = (metadata: any) => {
  if (metadata.data === undefined || metadata.data.creators === undefined)
    return undefined
  for (let creator of metadata.data.creators) {
    if (creator.verified === 1)
      return creator.address
  }
}

const getCollectionId = (metadata: any, collections: any) => {
  for (let collection of collections) {
    if (checkCollection(metadata, collection)) {
      return collection.id
    }
  }
}

const checkCollection = (metadata: any, collection: any) => {
  if (collection.updateAuthority && metadata.updateAuthority !== collection.updateAuthority)
    return false
  if (collection.symbol && metadata.data.symbol !== collection.symbol)
    return false
  if (collection.creator && getVerifiedCreator(metadata) !== collection.creator)
    return false
  return true
}

const getCollectionCardType = (mintPubkey: PublicKey, collection: any) => {
  let buf = mintPubkey.toBuffer();
  let last = buf.readUInt32LE(buf.length - 4);
  let cardTypes = collection.cardTypes
  let index = last - Math.floor(last / cardTypes.length) * cardTypes.length
  return cardTypes[index]
}

const loadNftsAsCollectionItems = async (mintPubkeys: PublicKey[], content: any) => {
  let collections = content.get('collections')
  let connection = new Connection(clusterApiUrl('mainnet-beta'), 'confirmed');
  let multipleAccountInfos = await connection.getMultipleAccountsInfo(mintPubkeys);
  let result: any[] = []
  for (let i in multipleAccountInfos) {
    if (multipleAccountInfos[i]) {
      let data = decodeMetadata(multipleAccountInfos[i]!.data)
      if (data) {
        var metadataResponse = await axios.get(data.data.uri).catch(e => {})
        if (metadataResponse && metadataResponse.data) {
          let imageUrl = metadataResponse.data.image;
          if (imageUrl) {
            var imageResponse = await axios({
              method: 'HEAD',
              url: imageUrl,
            }).then((result: any ) => { return result }, () => { return undefined }).catch(e => {})
            let imageType = imageResponse && imageResponse.headers['content-type']
            if (imageType === 'image/png' || imageType === 'image/jpg') { // only static images are supported
              let collectionId = getCollectionId(data, collections)
              if (collectionId) {
                let collection = content.get('collections', collectionId)
                let cardTypeId = getCollectionCardType(mintPubkeys[i], collection)
                result.push({
                  publicKey: mintPubkeys[i],
                  cardTypeId: cardTypeId,
                  cardType: content.get('cardTypes', cardTypeId),
                  data: data,
                  picture: metadataResponse.data.image,
                  collection: collectionId
                })
              } 
            }
          }
        }
      }
    }
  }
  return result
}


export const NftSelector = (props: {
  onChange: (filled: any) => void,
  content: any,
  onLoad: () => void,
}) => { 
  const { connected, wallet, publicKey} = useWallet();
  const connection = useConnection();
  const [ content, setContent ] = useState<any>(undefined)
  const [ slots, setSlots ] = useState<any>(undefined)
  const [ nfts, setNfts ] = useState<any>(undefined);
  const [ loadingProgress, setLoadingProgress ] = useState(0)

  const onChange = () => {
    props.onChange(slots.filter((elem: any) => elem.selected).map((elem: any) => {
      return {
        tplId: elem.data.id,
        mintAddress: elem.selected.publicKey,
        collection: elem.selected.collection,
      }
    }))
  }

  const getNfts = async() => {
    if (!publicKey)
      return []
    let connection = new Connection(clusterApiUrl('mainnet-beta'), 'confirmed');

    let response = await connection.getParsedTokenAccountsByOwner(
      publicKey,
      {
        programId: TOKEN_PROGRAM_ID,
      },
    );
    let arr = response.value.splice(0, 100)

    let mints = await Promise.all(arr
      .filter(accInfo => accInfo.account.data.parsed.info.tokenAmount.uiAmount !== 0)
      .map(accInfo => getMetadataAccount(accInfo.account.data.parsed.info.mint))
    );
    return mints.map(m => new PublicKey(m));
  }

  useEffect(() => {
    setSlots(props.content.get('slots').map((slot: any) => {
      return {
        data: slot,
        defaultCard: props.content.get('cardTypes', slot.default)
      }
    }))
    if (publicKey && !nfts) {
      (async () => {
        let nfts = await loadNftsAsCollectionItems(await getNfts(), props.content)
        setNfts(nfts)
        props.onLoad()
      })()
    }
  }, [] )

  return ( 
    <div>
     {/* { content && !nfts && 
        <div className="unity_loading">
          <div className="progress">
            <div className="progress-value" style={{width: "50%" }}></div>
          </div>
          <p>Loading</p>
        </div>
      }*/}
      { !nfts && <h1 className="select_some_cards animate__animated animate__fadeIn">Loading ...</h1> }
      { nfts && <h1 className="select_some_cards animate__animated animate__fadeIn">Choose some cards:</h1>}
      <Divider className="divider"/>
      { nfts &&
        <Row className="card_slots animate__animated animate__fadeIn">
          { slots && slots.map((elem: any) => <Col>
            <p key={"slot_header_" + elem.data.id} className="slot_header">{elem.data.name}</p>
            <SlotSelector
              key={elem.data.id}
              slot={elem}
              nfts={nfts}
              onChange={onChange}
            />
          </Col>)}
        </Row>}
      <Divider className="divider"/>

    </div>)

}

const unityGameContext = new UnityContext({
  loaderUrl: "game/game_33.loader.js",
  dataUrl: "game/game_33.data",
  frameworkUrl: "game/game_33.framework.js",
  codeUrl: "game/game_33.wasm",
})

export const GameView = (props: {
  gameId?: string
}) => {
  const [ constructedContent, setConstructedContent ] = useState<any>(undefined);
  const { connected, wallet, publicKey, connect } = useWallet();
  const connection = useConnection();
  const { gameId } = useParams<GameViewParams>();
  const contentPublicKey = new PublicKey(props.gameId ? props.gameId : gameId);
  const { player, playerStatePublicKey, gamePublicKey } = usePlayer();

  const [ playerStateData, setPlayerStateData ] = useState<Buffer|undefined>(undefined);
  const [ game, setGame ] = useState<Game|undefined>(undefined);
  const [ gameState, setGameState ] = useState<GameState|undefined>(undefined);
  const [ items, setItems ] = useState<any>([]);
  const [ unityLoaded, setUnityLoaded ] = useState(false)
  const [ unityLoadProgression, setUnityLoadProgression ] = useState(0)
  const [ unityContentLoaded, setUnityContentLoaded ] = useState(false)
  const [ castPending, setCastPending ] = useState(false)
  const [ nftsLoaded, setNftsLoaded ] = useState(false)
  useEffect(() => {
    (async () => {
      let contentInfo = await connection.getAccountInfo(contentPublicKey)
      if (contentInfo) {
        let content = ConstructedContent.fromBuffer(contentInfo.data)
        setConstructedContent(content)
      }
    })()
  }, [])   

  useEffect(() => {
    if (!gamePublicKey) {
      if (game)
        setGame(undefined)
      return
    }

    (async () => {
      let gameInfo = await connection.getAccountInfo(gamePublicKey)
      if (gameInfo?.data) {
        connection.onAccountChange(gamePublicKey, (accountInfo) => {
          setGame(deserializeUnchecked(
            GameSchema,
            Game,
            accountInfo.data,
          ))
        })
        setGame(deserializeUnchecked(
          GameSchema,
          Game,
          gameInfo.data,
        ))
      }
    })()    
  }, [ gamePublicKey ])
  
  function delay(ms: number) {
    return new Promise( resolve => setTimeout(resolve, ms) );
  }

  const loadGameStateFromAccount = async (accountInfo: any) => {
    if (!game) 
      return; // TODO
    let data = accountInfo?.data

    let state = new GameState()
    state.content = constructedContent
    let reader = new BinaryReader(data)
    state.read(reader)

    // applying items
    let allItems: any[] = []
    for (let player of game.players) {
      allItems = allItems.concat(player.items)
    }
    let collectionItems = await loadNftsAsCollectionItems(allItems.map((item: any) => item.publicKey ), state.content) // TODO: speedup
    let items = new Map();
    if (allItems.length != collectionItems.length)
      throw new Error("Wrong NFTs in game")
    for (let i in allItems) {
      items.set(allItems[i].tplId, collectionItems[i])
    }
    for (let slot of state.content.get('slots')) {
      let item = items.get(slot.id)
      if (item) {
        let slotCardType = Object.assign({}, item.cardType)
        slotCardType.picture = item.picture;
        slotCardType.id = slot.id
        state.content.templates.get('cardTypes').objects.objects.set(slot.id, slotCardType)
        // state.objects.forEach((card: any) => {
        //   if (card.tplId == slot.id)  {
        //     card.tplId = cardType.id
        //   }
        // })
      }
      else {
        state.objects.forEach((card: any) => {
          if (card.tplId == slot.id) {
            card.tplId = state.content.get('cardTypes', slot.default).id
          }
        })
      } 
    }
    setGameState(state)
    if (state.attrs.finished == 1) {
      await delay(2000)
      leaveGame()
    }
  }

  useEffect(() => {
    if (!constructedContent)
      return;
    if (!game) {
      if (gameState)
        setGameState(undefined)
      return
    }
    
    (async () => {
      loadGameStateFromAccount(await connection.getAccountInfo(game.state))
      connection.onAccountChange(game.state, loadGameStateFromAccount)
    })()
  }, [ game, constructedContent ])



  const createGame = async () => {
    if (!publicKey || wallet === undefined) {
      return;
    }
    connection.requestAirdrop(publicKey, LAMPORTS_PER_SOL * 1)
    let projectSettings = constructedContent.get('projectSettings')[0]
    let baseGameStateAccountKey = projectSettings.gameStateAccount
    let baseGameStateAccountPublicKey = new PublicKey(baseGameStateAccountKey)

    let gameStateInfo = await connection.getAccountInfo(baseGameStateAccountPublicKey)
    if (!gameStateInfo)
      throw new Error('NO compiled game state')
    var instructions = [];
    
    let gameStateBuffer = gameStateInfo.data
    var gameAccount = new Account()
    instructions.push(SystemProgram.createAccount({
      programId: programId,
      space: 600, // TODO
      lamports: await connection.getMinimumBalanceForRentExemption(600, 'singleGossip'),
      fromPubkey: publicKey,
      newAccountPubkey: gameAccount.publicKey,
    }));
    var gameStateAccount = new Account()
    var gameStateSize = gameStateBuffer.length
    instructions.push(SystemProgram.createAccount({
      programId: programId,
      space: gameStateSize,
      lamports: await connection.getMinimumBalanceForRentExemption(gameStateSize, 'singleGossip'),
      fromPubkey: publicKey,
      newAccountPubkey: gameStateAccount.publicKey,
    }));

    // createGame
    instructions.push(new TransactionInstruction({
      keys: [
        { pubkey: publicKey, isSigner: true, isWritable: false },
        { pubkey: gameAccount.publicKey, isSigner: false, isWritable: true },
        { pubkey: contentPublicKey, isSigner: false, isWritable: false },
        { pubkey: gameStateAccount.publicKey, isSigner: false, isWritable: true },
        { pubkey: baseGameStateAccountPublicKey, isSigner: false, isWritable: false },

      ],
      programId: programId,
      data: Buffer.from([0]),
    }));

    if (!playerStatePublicKey)
      throw new Error("No player state")
    // join game
    let keys = [
      { pubkey: publicKey, isSigner: true, isWritable: false },
      { pubkey: gameAccount.publicKey, isSigner: false, isWritable: true },
      { pubkey: playerStatePublicKey, isSigner: false, isWritable: true },
    ];
    let writer = new BinaryWriter()
    writer.writeU8(1)
    writer.writeU32(items.length)
    for (let item of items) {
      writer.writeU32(item.tplId)
      keys.push({
        pubkey: item.mintAddress,
        isSigner: false,
        isWritable: false,
      })
    }
    instructions.push(new TransactionInstruction({
      keys: keys,
      programId: programId,
      data: writer.buf.slice(0, writer.length)
    }));

    sendTransaction(connection, wallet, instructions, [ gameAccount, gameStateAccount ])
  }

  const leaveGame = () => {
    if (!publicKey || wallet === undefined) 
      return;
    if (!gamePublicKey)
      return;
    if (!playerStatePublicKey)
      return;
    let setStateIx = new TransactionInstruction({
      keys: [
        { pubkey: publicKey, isSigner: true, isWritable: false },
        { pubkey: gamePublicKey, isSigner: false, isWritable: true },
        { pubkey: playerStatePublicKey, isSigner: false, isWritable: true },
      ],
      programId: programId,
      data: Buffer.from([4, 0]),
    });

    sendTransaction(connection, wallet, [setStateIx], [])
  }

  unityGameContext.on("OnUnityLoaded", async () => {
    if (!gameState)
      return;
    unityGameContext.send("ReactToUnity", "UpdateGameContent", JSON.stringify(gameState.extractContent()));
    unityGameContext.send("ReactToUnity", "UpdateGameDisplay", JSON.stringify(gameState.extractDisplayData())); 
    sendGameState()
  });

  const sendGameState = () => {
    if (!gameState)
      return
    setCastPending(false)
    unityGameContext.send("ReactToUnity", "UpdateGameState", JSON.stringify(gameState.extractGameState()));
  }

  useEffect(() => {
    if (!gameState)
      return
    if (!unityContentLoaded) {
      unityGameContext.send("ReactToUnity", "UpdateGameContent", JSON.stringify(gameState.extractContent()));
      unityGameContext.send("ReactToUnity", "UpdateGameDisplay", JSON.stringify(gameState.extractDisplayData())); 
      setUnityContentLoaded(true)     
    }
    sendGameState();
  }, [ gameState ])

  useEffect(function () {
    unityGameContext.on("progress", function (progression) {
      setUnityLoadProgression(Math.floor(progression * 100))
    });
  }, []);

  useEffect(function () {
    unityGameContext.on("loaded", function () {
      setUnityLoaded(true)
    });
  }, []);

  const diffToBuf = (content: any, diff: any) => {
    let writer = new BinaryWriter()

    let attrIndexes = new Map()
    content.get('attributes').forEach((attr: any, index: number) => {
      attrIndexes.set(attr.code, index)
    })
    let gameAttrIndexes = new Map()
    content.get('gameAttributes').forEach((attr: any, index: number) => {
      gameAttrIndexes.set(attr.code, index)
    })

    // let gameAttrsDiff = diff.gameAttrs
    // writer.writeU32(gameAttrsDiff.size)
    // for (let attrName of gameAttrsDiff.keys()) {
    //   let gameAttrIndex = gameAttrIndexes.get(attrName)
    //   if (gameAttrIndex === undefined) 
    //       throw new Error("Error serializing game state diff")
    //   writer.writeU8(gameAttrIndex)
    //   writer.writeI16(gameAttrsDiff.get(attrName))
    // }

    // writer.writeU32(diff.objectAttrs.size)
    // let objectAttrs = diff.objectAttrs
    // for (let objectId of objectAttrs.keys()) {
    //   writer.writeU16(objectId)
    //   let objectDiff = objectAttrs.get(objectId)
    //   writer.writeU32(objectDiff.size)
    //   for (let attrName of objectDiff.keys()) {
    //     let attrIndex = attrIndexes.get(attrName)
    //     if (attrIndex === undefined) 
    //       throw new Error("Error serializing game state diff")
    //     writer.writeU8(attrIndex)
    //     writer.writeI16(objectDiff.get(attrName))
    //   }
    // }

    let gameAttrsDiff = diff.gameAttrs
    for (let attrName of gameAttrsDiff.keys()) {
      let gameAttrIndex = gameAttrIndexes.get(attrName)
      if (gameAttrIndex === undefined) 
          throw new Error("Error serializing game state diff")
      writer.writeU16(4 + gameAttrIndex * 2);
      writer.writeI16(gameAttrsDiff.get(attrName))
    }

    let gameAttrsSize = 4 + gameAttrIndexes.size * 2 //attrsize + i16 attrs
    let objectSize = 2 + 4 + attrIndexes.size * 2 //tplId + attrsize + i16 atrs

    let objectAttrs = diff.objectAttrs
    for (let objectId of objectAttrs.keys()) {
      let objectDiff = objectAttrs.get(objectId)
      for (let attrName of objectDiff.keys()) {
        let attrIndex = attrIndexes.get(attrName)
        if (attrIndex === undefined) 
          throw new Error("Error serializing game state diff")
        writer.writeU16(gameAttrsSize + 4 + objectSize * (objectId - 1) + 2 + 4 + attrIndex * 2);
        writer.writeI16(objectDiff.get(attrName))
      }
    }
    return writer.buf.slice(0, writer.length)
  }

  unityGameContext.on("CastCard", async (cardId: number) => {
    if (!gameState || !game || !gamePublicKey)
      return;
    if (!publicKey || wallet === undefined) 
      return;
    if (castPending) {
      return;
    }
    let tmpState = gameState.copy()
    let diff = tmpState.useCard(cardId, 1)

    let buf = diffToBuf(tmpState.content, diff)
    let updateStateIx = new TransactionInstruction({
      keys: [
        { pubkey: publicKey, isSigner: true, isWritable: false },
        { pubkey: gamePublicKey, isSigner: false, isWritable: false },
        { pubkey: game.state, isSigner: false, isWritable: true },
      ],
      programId: programId,
      data: Buffer.concat([
        Buffer.from([7]),
        buf,
      ])
    });
    await sendTransaction(connection, wallet, [updateStateIx], [], true, () => {
      setCastPending(true)
    }, () => {
      sendGameState() 
    }).then(() => {}, () => { sendGameState() })
  });

  if (!constructedContent)
    return (<div></div>)
  let projectSettings = constructedContent.get('projectSettings')[0]
  return(
    (connected && projectSettings) ?
      <div style={{ width: '100%', height: '100%', verticalAlign: "middle", overflow:"hidden"}}>
        { gamePublicKey ? 
            <div style={{ width: '100%', height: '100%', top: '70vh' }}>
              {!unityLoaded && <div className="unity_loading">
                <div className="progress">
                  <div className="progress-value" style={{width: "" + unityLoadProgression + "%" }}></div>
                </div>
                <p>Loading</p>
              </div>}
              <a onClick={leaveGame} className="close"/>
              {true && <Unity tabIndex={3} style={{ width: '100%', height: '100%', visibility: unityLoaded ? 'visible' : 'hidden'  }} unityContext={unityGameContext} />}
            </div>
          :
            <div>
              <Row align="top">
                <Col span={12}>
                  <img className="game_logo animate__animated animate__fadeInLeft" 
                      src={projectSettings.picture}/>
                  <div className="game_info">
                    <h1 className="game_title animate__animated animate__fadeInUp">{projectSettings.name}</h1>
                    <Divider className="divider"/>
                    <p className="game_description animate__animated animate__fadeInUp">{projectSettings.description}</p>
                  </div>
                </Col>
                <Col span={12}>
                  <NftSelector 
                    content={constructedContent} 
                    onChange={(result: any) => { setItems(result) }}
                    onLoad={() => { setNftsLoaded(true) }
                  }/>
                  {nftsLoaded && <div className="one" onClick={createGame}><span>START GAME</span></div>}
                </Col>
              </Row>
            </div>
        }
      </div>
  :
    <div></div>
  )
}


