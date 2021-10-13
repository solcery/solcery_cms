import React, { useState, useEffect } from "react";
import { useConnection, sendTransaction } from "../../contexts/connection";
import { useWallet } from "../../contexts/wallet";
import { useParams } from "react-router-dom";
import Unity, { UnityContext } from "react-unity-webgl";
import { GameState, GameSchema, Game } from "../../solcery/game"
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
import {clusterApiUrl, Connection, PublicKey, Account, TransactionInstruction, SystemProgram } from "@solana/web3.js";
import { ScrollMenu, VisibilityContext } from "react-horizontal-scrolling-menu";

import 'animate.css';

const { Header, Footer, Sider, Content } = Layout;

const {TOKEN_PROGRAM_ID} = require('@solana/spl-token');

const programId = new PublicKey("GN1p6pe6m7rdK3re2TayqJyQtJUme1EnCLyYrTAArYRR");

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
    <img src="https://cdn.discordapp.com/attachments/863663744194183198/896236065248141372/grey_wood_front.png" className="cardframe"/>
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
                filter: `brightness(${1.3 - bounding.y / bounding.height * 0.5})` // 0.6 = offset, brightness will be from 0.6 to 1.6
            });
            $(".gloss", this).css({
                transform: `translateX(${posX * ratio * 0.95}px) translateY(${posY * ratio}px)` // 0.75 = offset
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
          <h1>CHOOSE AN NFT</h1>
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
              if (!elem.isSelected && props.slot.data.collections.find((publicKey: PublicKey) => publicKey.toBase58() === elem.collection)) {
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

const getCollection = (metadata: any, collections: any) => {
  for (let collectionKey of Object.keys(collections)) {
    if (checkCollection(metadata, collections[collectionKey])) {
      return collectionKey
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

const loadNftsAsCollectionItems = async (mintPubkeys: PublicKey[], content: any) => {
  let collections = content.collections
  let connection = new Connection(clusterApiUrl('mainnet-beta'), 'confirmed');
  let multipleAccountInfos = await connection.getMultipleAccountsInfo(mintPubkeys);
  let result: any[] = []
  for (let i in multipleAccountInfos) {
    if (multipleAccountInfos[i]) {
      let data = decodeMetadata(multipleAccountInfos[i]!.data)
      if (data) {
        var imageResponse = await axios.get(data.data.uri)
        let collectionKey = getCollection(data, collections)
        if (collectionKey) {
          let cardTypeKey = collections[collectionKey].cardType
          result.push({
            publicKey: mintPubkeys[i],
            cardTypeKey: cardTypeKey,
            cardType: content.cardTypes[cardTypeKey],
            data: data,
            picture: imageResponse.data.image,
            collection: collectionKey
          })
        }
      }
    }
  }
  return result
}


export const NftSelector = (props: {
  onChange: (filled: any) => void,
}) => { 
  const { connected, wallet } = useWallet();
  const connection = useConnection();
  const { gameId } = useParams<GameViewParams>();
  const projectPublicKey = new PublicKey(gameId);
  const [ content, setContent ] = useState<any>(undefined)
  const [ slots, setSlots ] = useState<any>(undefined)
  const [ nfts, setNfts ] = useState<any>([]);

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
    if (!wallet || wallet.publicKey == undefined)
      return []
    let connection = new Connection(clusterApiUrl('mainnet-beta'), 'confirmed');

    let response = await connection.getParsedTokenAccountsByOwner(
      wallet.publicKey,
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
    (async () => {
      let project = await Project.get(connection, projectPublicKey)
      let constructedContent = await project.сonstructContent(connection)
      setContent(constructedContent)
      let slots = Object.values(constructedContent.slots)
      setSlots(slots.map((slot: any) => {
        let defaultCardTypeKey = slot.default.toBase58()
        let defaultCardType = constructedContent.cardTypes[defaultCardTypeKey]
        return {
          data: slot,
          defaultCard: constructedContent.cardTypes[slot.default]
        }
      }))
    })()
  }, [])

  useEffect(() => {
    if (wallet?.publicKey && content) {
      (async () => {
        setNfts(await loadNftsAsCollectionItems(await getNfts(), content))
      })()
    }
  }, [ content ])


  return ( 
    <div>
      { content && <h1 className="select_some_cards animate__animated animate__fadeIn">Choose some cards:</h1>}
      <Divider className="divider"/>
      {content && 
        <Row className="card_slots animate__animated animate__fadeIn">
          { slots && slots.map((elem: any) => <Col>
            <p className="slot_header">Slot</p>
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
  loaderUrl: "game/game_4.loader.js",
  dataUrl: "game/game_4.data",
  frameworkUrl: "game/game_4.framework.js",
  codeUrl: "game/game_4.wasm",
})

export const GameView = () => {

  const { connected, wallet, publicKey } = useWallet();
  const connection = useConnection();
  const { gameId } = useParams<GameViewParams>();
  const projectPublicKey = new PublicKey(gameId);

  const [ playerStateData, setPlayerStateData ] = useState<Buffer|undefined>(undefined);
  const [ game, setGame ] = useState<Game|undefined>(undefined);
  const [ gameState, setGameState ] = useState<GameState|undefined>(undefined);
  const [ gamePublicKey, setGamePublicKey ] = useState<PublicKey|undefined>(undefined);
  const [ items, setItems ] = useState<any>([]);

  const playerStatePublicKey = new PublicKey('9RCmNwyM49CPyWqXgwgrPjtHVewMBLBYyS5MqGZUupe2')



  useEffect(() => {
    (async () => {
      let stateInfo = await connection.getAccountInfo(playerStatePublicKey)
      if (stateInfo) {
        connection.onAccountChange(playerStatePublicKey, (accountInfo) => {
          setPlayerStateData(accountInfo.data)
        })
        setPlayerStateData(stateInfo.data)
      }
    })()
  }, [])

  useEffect(() => {
    if (playerStateData) {
      var reader = new BinaryReader(playerStateData)
      let playerPublicKey = reader.readPubkey()
      let isInGame = reader.readBoolean()
      if (false && isInGame) {
        let gameKey = reader.readPubkey()
        setGamePublicKey(gameKey)
      } else {
        if (gamePublicKey)
          setGamePublicKey(undefined)
      }
    }
  }, [ playerStateData ])

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
  
  useEffect(() => {
    if (!game) {
      if (gameState)
        setGameState(undefined)
      return
    }
    
    (async () => {
      let gameStateInfo = await connection.getAccountInfo(game.state)
      if (gameStateInfo?.data) {
        let project = await Project.get(connection, game.project)
        let constructedContent = await project.сonstructContent(connection)

        let state = new GameState()
        state.content = constructedContent
        let reader = new BinaryReader(gameStateInfo.data)
        state.read(reader)

        // applying items
        let allItems: any[] = []
        for (let player of game.players) {
          allItems = allItems.concat(player.items)
        }
        let collectionItems = await loadNftsAsCollectionItems(allItems.map((item: any) => item.publicKey ), state.content)
        let items = new Map();
        if (allItems.length != collectionItems.length)
          throw new Error("Wrong NFTs in game")
        for (let i in allItems) {
          items.set(allItems[i].tplId, collectionItems[i])
        }
        for (let slotId of Object.keys(state.content.slots)) {
          let slot = state.content.slots[slotId]
          let item = items.get(slot.id)
          if (item) {
            let cardType = state.content.cardTypes[item.cardTypeKey.toBase58()]
            cardType.picture = item.picture
            state.objects.forEach((card: any) => {
              if (card.tplId == slot.id) 
                card.tplId = cardType.id
            })
          }
          else {
            console.log('empty')
            state.objects.forEach((card: any) => {
              if (card.tplId == slot.id) 
                card.tplId = state.content.cardTypes[slot.default].id
            })
          } 
        }
        
        setGameState(state)
      }
    })()
  }, [ game ])

  useEffect(() => {
    if (!gameState)
      return
    unityGameContext.send("ReactToUnity", "UpdateGameState", JSON.stringify(gameState.extractGameState()));
  }, [ gameState ])

  const createPlayerState = async() => {
    if (!publicKey || wallet === undefined ) {
      return;
    }
    if (!wallet.publicKey)
      return
    var instructions = [];

    var stateAccount = new Account()
    instructions.push(SystemProgram.createAccount({
      programId: programId,
      space: 65, // TODO
      lamports: await connection.getMinimumBalanceForRentExemption(65, 'singleGossip'),
      fromPubkey: publicKey,
      newAccountPubkey: stateAccount.publicKey,
    })); 

    instructions.push(new TransactionInstruction({
      keys: [
        { pubkey: publicKey, isSigner: true, isWritable: false },
        { pubkey: stateAccount.publicKey, isSigner: false, isWritable: true }
      ],
      programId: programId,
      data: Buffer.from([5]),
    }));
    sendTransaction(connection, wallet, instructions, [ stateAccount ])
  }

  const createGame = async () => {
    if (!publicKey || wallet === undefined) {
      return;
    }
    var instructions = [];

    var gameAccount = new Account()
    instructions.push(SystemProgram.createAccount({
      programId: programId,
      space: 600, // TODO
      lamports: await connection.getMinimumBalanceForRentExemption(600, 'singleGossip'),
      fromPubkey: publicKey,
      newAccountPubkey: gameAccount.publicKey,
    }));

    let project = await Project.get(connection, projectPublicKey)
    let constructedContent = await project.сonstructContent(connection)
    let gm = new GameState(constructedContent)

    let writer = new BinaryWriter()
    let gameBuffer = gm.write(writer)
    let gameStateBuffer = writer.buf.slice(0, writer.length)
    var gameStateAccount = new Account()
    instructions.push(SystemProgram.createAccount({
      programId: programId,
      space: gameStateBuffer.length,
      lamports: await connection.getMinimumBalanceForRentExemption(gameStateBuffer.length, 'singleGossip'),
      fromPubkey: publicKey,
      newAccountPubkey: gameStateAccount.publicKey,
    }));

    // createGame
    instructions.push(new TransactionInstruction({
      keys: [
        { pubkey: publicKey, isSigner: true, isWritable: false },
        { pubkey: gameAccount.publicKey, isSigner: false, isWritable: true },
        { pubkey: projectPublicKey, isSigner: false, isWritable: false },
        { pubkey: gameStateAccount.publicKey, isSigner: false, isWritable: true },
      ],
      programId: programId,
      data: Buffer.from([0]),
    }));


    // join game
    let keys = [
      { pubkey: publicKey, isSigner: true, isWritable: false },
      { pubkey: gameAccount.publicKey, isSigner: false, isWritable: true },
      { pubkey: playerStatePublicKey, isSigner: false, isWritable: true },
    ];
    writer = new BinaryWriter()
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

    // set state
    instructions.push(new TransactionInstruction({
      keys: [
        { pubkey: publicKey, isSigner: true, isWritable: false },
        { pubkey: gameAccount.publicKey, isSigner: false, isWritable: true },
        { pubkey: gameStateAccount.publicKey, isSigner: false, isWritable: true },
      ],
      programId: programId,
      data: Buffer.concat([
        Buffer.from([2]),
        Buffer.from([0, 0, 0, 0]),
        gameStateBuffer,
      ])
    }));

    sendTransaction(connection, wallet, instructions, [ gameAccount, gameStateAccount ])
  }

  const leaveGame = () => {
    if (!publicKey || wallet === undefined) 
      return;
    if (!gamePublicKey)
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
      return
    // var data = { IsConnected: true };
    // unityPlayContext.send("ReactToUnity", "SetWalletConnected", JSON.stringify(data));
    console.log(JSON.stringify(gameState.extractContent()))
    console.log(JSON.stringify(gameState.extractDisplayData()))
    console.log(JSON.stringify(gameState.extractGameState()))
    unityGameContext.send("ReactToUnity", "UpdateGameContent", JSON.stringify(gameState.extractContent()));
    unityGameContext.send("ReactToUnity", "UpdateGameDisplay", JSON.stringify(gameState.extractDisplayData()));
    unityGameContext.send("ReactToUnity", "UpdateGameState", JSON.stringify(gameState.extractGameState()));
  });

  unityGameContext.on("CastCard", async (cardId: number) => {
    if (!gameState)
      return
    console.log('CAST CARD')
    gameState.useCard(cardId, 1)
    unityGameContext.send("ReactToUnity", "UpdateGameState", JSON.stringify(gameState.extractGameState()));
  });

  unityGameContext.on("LogAction", async (log: string) => {
    if (!gameState)
      return
    var logToApply = JSON.parse(log)
    for (let logEntry of logToApply.Steps) {
      if (logEntry.actionType == 0)
      {
        gameState.useCard(logEntry.data, logEntry.playerId)
        unityGameContext.send("ReactToUnity", "UpdateGameState", JSON.stringify(gameState.extractGameState()));
      }
    }
  });

  // unityGameContext.on("LogAction", async (log: string) => {
  //   if (!gameState || !game || !gamePublicKey)
  //     return;
  //   if (!publicKey || wallet === undefined) 
  //     return;
  //   var logToApply = JSON.parse(log)
  //   for (let logEntry of logToApply.Steps) {
  //     if (logEntry.actionType == 2) {
  //       leaveGame()
  //     }
  //     if (logEntry.actionType == 0)
  //     {
  //       let writer = new BinaryWriter()
  //       gameState.useCard(logEntry.data, logEntry.playerId)
  //       gameState.write(writer)

  //       let step = game.step
  //       let stepBuffer = Buffer.allocUnsafe(4)
  //       stepBuffer.writeUInt32LE(step)

  //       let setStateIx = new TransactionInstruction({
  //         keys: [
  //           { pubkey: publicKey, isSigner: true, isWritable: false },
  //           { pubkey: gamePublicKey, isSigner: false, isWritable: true },
  //           { pubkey: game.state, isSigner: false, isWritable: true },
  //         ],
  //         programId: programId,
  //         data: Buffer.concat([
  //           Buffer.from([2]),
  //           Buffer.from(stepBuffer),
  //           writer.buf.slice(0, writer.length),
  //         ])
  //       });
  //       sendTransaction(connection, wallet, [setStateIx], [])
  //     }
  //   }
  // });


return(
  connected ?

      <div>
        { gamePublicKey ? 
          
          <Unity tabIndex={3} style={{ width: '100%', height: '100%' }} unityContext={unityGameContext} />
          :
          <div>
            <Row align="top">
              <Col span={12}>
                <img className="game_logo animate__animated animate__fadeInLeft" 
                    src="https://cdn.discordapp.com/attachments/863663744194183198/895676013814624276/Summoner_Logo.png"/>
                <div className="game_info">
                  <h1 className="game_title animate__animated animate__fadeInUp">Summoner</h1>
                  <Divider className="divider"/>
                  <p className="game_description animate__animated animate__fadeInUp">It is a long established fact that a reader will be distracted by the readable content of a page when looking at its layout. The point of using Lorem Ipsum is that it has a more-or-less normal distribution of letters, as opposed to using 'Content here, content here', making it look like readable English. Many desktop publishing packages and web page editors now use Lorem Ipsum as their default model text, and a search for 'lorem ipsum' will uncover many web sites still in their infancy. Various versions have evolved over the years, sometimes by accident, sometimes on purpose (injected humour and the like).</p>
                </div>
              </Col>
              <Col span={12}>
                <NftSelector onChange={(result: any) => {
                  setItems(result)
                }}/>
                <div className="one" onClick={createGame}><span>START GAME</span></div>
              </Col>
            </Row>
          </div>
        }
      </div>
  :
    <ConnectButton/>    
  );
};


