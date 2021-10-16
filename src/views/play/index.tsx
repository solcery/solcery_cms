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
  loaderUrl: "game/game_8.loader.js",
  dataUrl: "game/game_8.data",
  frameworkUrl: "game/game_8.framework.js",
  codeUrl: "game/game_8.wasm",
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
      let gameState = new GameState(constructedContent)

      let slots = gameState.content.slots
      console.log(JSON.stringify(gameState.toBuffer()))

      for (let slotId of Object.keys(slots)) {
        let slot = slots[slotId]
        let defaultCardTypeId = slot.default
        let cardType = gameState.content.cardTypes[defaultCardTypeId]
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
    for (let cardTypeId of Object.keys(gameState.content.cardTypes)) {
      let cardType: any = gameState.content.cardTypes[cardTypeId]
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
    unityPlayContext.send("ReactToUnity", "UpdateGameContent", JSON.stringify(gameState.extractContent()));
    unityPlayContext.send("ReactToUnity", "UpdateGameDisplay", JSON.stringify(gameState.extractDisplayData()));
    unityPlayContext.send("ReactToUnity", "UpdateGameState", JSON.stringify(gameState.extractGameState()));
  });

  unityPlayContext.on("CastCard", async (cardId: number) => {
    gameState.useCard(cardId, 1)
    unityPlayContext.send("ReactToUnity", "UpdateGameState", JSON.stringify(gameState.extractGameState()));
    setStep(step + 1)
  });

  unityPlayContext.on("LogAction", async (log: string) => {
    var logToApply = JSON.parse(log)
    for (let logEntry of logToApply.Steps) {
      if (logEntry.actionType == 0)
      {
        gameState.useCard(logEntry.data, logEntry.playerId)
        unityPlayContext.send("ReactToUnity", "UpdateGameState", JSON.stringify(gameState.extractGameState()));
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
        <Input onChange={(e:any) => { onHeaderFilterChange(e.target.value) }}/>
        {Object.values(gameState.content.attributes).map((attr: any) => (
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
