import React, { useCallback, useState, useEffect } from "react";
import { useConnection, sendTransaction} from "../../contexts/connection";
import { useProject } from "../../contexts/project";
import { useWallet } from "../../contexts/wallet";
import { construct, projectPublicKey, projectStoragePublicKey } from "../../solcery/engine";
import { useParams, useHistory } from "react-router-dom";
import Unity, { UnityContext } from "react-unity-webgl";
import { Button, Layout, InputNumber, Collapse, Divider, Space, Input } from "antd";
import { applyBrick, brickToOldBrick, oldBrickToBrick } from "../../solcery/types/brick";
import { GameState } from "../../solcery/game"
import { Project } from "../../solcery/classes"
import { ConstructedContent } from "../../solcery/content"

import { PublicKey } from "@solana/web3.js";


import { BinaryWriter, BinaryReader } from "borsh";

import "./style.css"

const { Header, Footer, Sider, Content } = Layout;
const { Panel } = Collapse

export const GameObjectView = (props: { 
  objectId: number,
  defaultValue: number,
  onChange: (value: number) => void,
}) => {
  return(
    <div key={props.objectId}>
      Card: { props.objectId } 
      <InputNumber 
        key={props.objectId} 
        precision={0} 
        value={props.defaultValue}
        onChange={props.onChange} 
      />
    </div>)
}

const unityPlayContext = new UnityContext({
  loaderUrl: "game/game_38.loader.js",
  dataUrl: "game/game_38.data",
  frameworkUrl: "game/game_38.framework.js",
  codeUrl: "game/game_38.wasm",
})

export const PlayView = () => {

  const { project } = useProject()
  const connection = useConnection();
  const { wallet, publicKey } = useWallet();
  const history = useHistory();
  const [ gameState, setGameState ] = useState<any>(undefined)
  const [ step, setStep ] = useState(0)
  const [ cardTypeNamesById, setCardTypeNamesById ] = useState<any>(undefined)
  const [ filter, setFilter ] = useState<any>({ attrs: {} })


  const onHeaderFilterChange = (value: string) => {
    filter.header = value
    setStep(step + 1)
  }

  const onAttrFilterChange = (attr: string, value: number) => {
    filter.attrs[attr] = value
    setStep(step + 1)
  }

  useEffect(() => {
    if (gameState)
      return
    if (!project)
      return
    (async () => {
      var constructedContent = await project.сonstructContent(connection)
      let buf = constructedContent.toBuffer()
      console.log(JSON.stringify(buf))
      
      let cc = ConstructedContent.read(new BinaryReader(buf))
      // let contentInfo = await connection.getAccountInfo(new PublicKey("7cRU5jAtqRjaSFUb3Dj3e8Mhnnhe2G3J7XbDqSjhrPPc"))
      // if (!contentInfo)
      //   return
      // let constructedContent = ConstructedContent.read(new BinaryReader(contentInfo.data))
      let gameState = new GameState(cc)
      // console.log(JSON.stringify(buf))
      console.log(JSON.stringify(gameState.toBuffer()))

      let slots = gameState.content.getAll('slots')
      for (let slot of slots.values()) {
        let defaultCardTypeId = slot.default
        let cardType = gameState.content.get('cardTypes', defaultCardTypeId)
        for (let object of gameState.objects.values()) {
          if (object.tplId === slot.id) {
            object.tplId = cardType.id
          }
        }
      }
      setGameState(gameState)
    })()
    return () => { unityPlayContext.quitUnityInstance() }
  })

  useEffect(() => {
    if (!gameState)
      return
    let result = new Map()
    for (let cardType of gameState.content.get('cardTypes')) {
      result.set(cardType.id, cardType.name)
    }
    setCardTypeNamesById(Object.fromEntries(result))
  }, [ gameState])

  const onCardAttrChange = (cardId: number, attrName: string, value: number) => {
    gameState.objects.get(cardId).attrs[attrName] = value;
    unityPlayContext.send("ReactToUnity", "UpdateGameState", JSON.stringify(gameState.extractGameState()));
    setStep(step + 1)
  }

  unityPlayContext.on("OnUnityLoaded", async () => {
    // console.log(JSON.stringify(gameState.extractContent()));
    unityPlayContext.send("ReactToUnity", "UpdateGameContent", JSON.stringify(gameState.extractContent()));
    // console.log(JSON.stringify(gameState.extractDisplayData()));
    unityPlayContext.send("ReactToUnity", "UpdateGameDisplay", JSON.stringify(gameState.extractDisplayData()));
    // console.log(JSON.stringify(gameState.extractGameState()));
    unityPlayContext.send("ReactToUnity", "UpdateGameState", JSON.stringify(gameState.extractGameState()));
  });

  unityPlayContext.on("CastCard", async (cardId: number) => {
    gameState.useCard(cardId, 1);
    // console.log(JSON.stringify(gameState.extractGameState()));
    unityPlayContext.send("ReactToUnity", "UpdateGameState", JSON.stringify(gameState.extractGameState()));
    setStep(step + 1);
  });

  unityPlayContext.on("LogAction", async (log: string) => {
    var logToApply = JSON.parse(log)
    for (let logEntry of logToApply.Steps) {
      if (logEntry.actionType == 0)
      {
        gameState.useCard(logEntry.data, logEntry.playerId);
        // console.log(JSON.stringify(gameState.extractGameState()));
        unityPlayContext.send("ReactToUnity", "UpdateGameState", JSON.stringify(gameState.extractGameState()));
        setStep(step + 1);
      }
    }
  });

  if (!gameState || !gameState.objects || !project)
    return (<div></div>)

  let data = Array.from(gameState.objects.values()).map((elem: any) => {
    return {
      header: (cardTypeNamesById && cardTypeNamesById[elem.tplId]) + " [" + elem.id + "]",
      object: elem,
    }
  }).filter((elem: any) => {
    for (let attr of Object.keys(filter.attrs)) {
      if (elem.object.attrs[attr] != filter.attrs[attr])
        return false
    }
    return filter.header === undefined || elem.header.includes(filter.header)
  })
  return (
    <Layout>
      <Sider width='300'>
        <Input onChange={(e:any) => { onHeaderFilterChange(e.target.value) }}/>
        {gameState.content.get('attributes').map((attr: any) => (
          <div>
            { attr.name  } 
            <InputNumber 
              precision={0}
              value={ filter.attrs[attr.code] }
              onChange={(value) => { onAttrFilterChange(attr.code, value) }} 
            />
          </div>)
        )}
        
        <Collapse>
          {data.map((elem: any) => 
            <Panel header={elem.header} key={elem.object.id}>
              <Space direction="vertical">
                {Object.keys(elem.object.attrs).map((attrName: string) => 
                  <div key={"" + elem.object.id + "." + attrName}>
                    {attrName} : <InputNumber 
                      precision={0}
                      value={ elem.object.attrs[attrName] }
                      onChange={(value) => { onCardAttrChange(elem.object.id, attrName, value) }} 
                    />
                   
                  </div>
                )}
              </Space>
            </Panel>
          )}
        </Collapse>
      </Sider>
      <Content className="unityFrame">
         <Unity tabIndex={3} style={{ width: '100%' }} unityContext={unityPlayContext} />
      </Content>
    </Layout>
  );
};
