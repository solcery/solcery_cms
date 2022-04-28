import React, { useCallback, useState, useEffect } from "react";
import { useConnection, sendTransaction} from "../../contexts/connection";
import { useProject } from "../../contexts/project";
import { useWallet } from "../../contexts/wallet";
import { construct, projectPublicKey, projectStoragePublicKey } from "../../solcery/engine";
import { useParams, useHistory } from "react-router-dom";
import Unity, { UnityContext } from "react-unity-webgl";
import { Button, Layout, InputNumber, Collapse, Divider, Space, Input } from "antd";
import { applyBrick } from "../../solcery/types/brick";
import { GameState } from "../../solcery/game"
import { Project } from "../../solcery/classes"
import { ConstructedContent } from "../../solcery/content"

import testGameContent from "./game_content_test.json"
import testGameState from "./game_state_test.json"

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
  loaderUrl: "new_game/WebGl.loader.js",
  dataUrl: "new_game/WebGl.data",
  frameworkUrl: "new_game/WebGl.framework.js",
  codeUrl: "new_game/WebGl.wasm",
  streamingAssetsUrl: "StreamingAssets",
})

export const PlayView = () => {

  const { project, userPrefs } = useProject()
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
      var constructedContent = await project.construct(connection)
      let gameState = new GameState(constructedContent, userPrefs.layoutPresets)
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

  const sendGameState = (gameState: any) => {
    let client_package = {
      states: [
        {
          id: 0,
          state_type: 0,
          value: gameState.toObject(),
        }
      ]
    }
    unityPlayContext.send("ReactToUnity", "UpdateGameState", JSON.stringify(client_package));
  }

  const onCardAttrChange = (cardId: number, attrName: string, value: number) => {
    gameState.objects.get(cardId).attrs[attrName] = value;
    sendGameState(gameState)
    setStep(step + 1)
  }

  unityPlayContext.on("OnUnityLoaded", async () => {
    let content = gameState.content.toJson()
    unityPlayContext.send("ReactToUnity", "UpdateGameContent", content);
    sendGameState(gameState)
  });

  unityPlayContext.on("SendCommand", async (jsonData: string) => {
    let command = JSON.parse(jsonData)
    let clientPackage = {
      states: gameState.playerCommand(command)
    }
    console.log(clientPackage)
    unityPlayContext.send("ReactToUnity", "UpdateGameState", JSON.stringify(clientPackage));
    setStep(step + 1)
  });

  unityPlayContext.on("LogAction", async (log: string) => {
    var logToApply = JSON.parse(log)
    for (let logEntry of logToApply.Steps) {
      if (logEntry.actionType == 0)
      {
        gameState.useCard(logEntry.data, logEntry.playerId)
        sendGameState(gameState)
        setStep(step + 1)
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
        <Collapse>
          <Panel header='Filter' key='filter'>
            <Input onChange={(e:any) => { }}/>
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
          </Panel>
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
        <div style={{ width: '100%' }}>
          <Unity tabIndex={3} style={{ width: '100%' }} unityContext={unityPlayContext} />
        </div>
      </Content>
    </Layout>
  );
};
