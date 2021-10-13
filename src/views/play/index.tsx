import React, { useCallback, useState, useEffect } from "react";
import { useConnection, sendTransaction} from "../../contexts/connection";
import { useProject } from "../../contexts/project";
import { useWallet } from "../../contexts/wallet";
import { construct, projectPublicKey, projectStoragePublicKey } from "../../solcery/engine";
import { useParams, useHistory } from "react-router-dom";
import Unity, { UnityContext } from "react-unity-webgl";
import { Button, Layout, InputNumber, Collapse, Divider } from "antd";
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
  loaderUrl: "game/game_6.loader.js",
  dataUrl: "game/game_6.data",
  frameworkUrl: "game/game_6.framework.js",
  codeUrl: "game/game_6.wasm",
})

export const PlayView = () => {

  const { project } = useProject()
  const connection = useConnection();
  const { wallet, publicKey } = useWallet();
  const history = useHistory();
  const [ gameState, setGameState ] = useState<any>(undefined)
  const [ step, setStep ] = useState(0)
  
  useEffect(() => {
    if (gameState)
      return
    if (!project)
      return
    (async () => {
      var constructedContent = await project.сonstructContent(connection)
      setGameState(new GameState(constructedContent))
    })()
    return () => { unityPlayContext.quitUnityInstance() }
  })

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

  return (
    <Layout>
      <Sider width='300'>
        <Collapse>
          { gameState && gameState.objects && Array.from(gameState.objects.values()).map((elem: any) => 
            <Panel header={ "Card " + elem.id } key={elem.id}>
              { Object.keys(elem.attrs).map((attrName: string) => 
                <div key={"" + elem.id + "." + attrName}>
                  {attrName} : <InputNumber 
                    precision={0}
                    value={ elem.attrs[attrName] }
                    onChange={(value) => { onCardAttrChange(elem.id, attrName, value) }} 
                  />
                  <Divider />
                </div>
              )}
            </Panel>
          )}
        </Collapse>
      </Sider>
      <Content className="unityFrame">
         { gameState && project && <Unity tabIndex={3} style={{ width: '100%' }} unityContext={unityPlayContext} />}
      </Content>
    </Layout>
  );
};
