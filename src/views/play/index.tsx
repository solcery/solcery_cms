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


// const unityContext = new UnityContext({
//   loaderUrl: "play/play_4.loader.js",
//   dataUrl: "play/play_4.data",
//   frameworkUrl: "play/play_4.framework.js",
//   codeUrl: "play/play_4.wasm",
// })


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
  loaderUrl: "game/monkeys_1.loader.js",
  dataUrl: "game/monkeys_1.data",
  frameworkUrl: "game/monkeys_1.framework.js",
  codeUrl: "game/monkeys_1.wasm",
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
    unityPlayContext.send("ReactToUnity", "UpdateBoard", JSON.stringify(gameState.toBoardData()));
    setStep(step + 1)
  }


  unityPlayContext.on("OnUnityLoaded", async () => {
    var data = { IsConnected: true };
    unityPlayContext.send("ReactToUnity", "SetWalletConnected", JSON.stringify(data));

    unityPlayContext.send("ReactToUnity", "UpdateGameContent", JSON.stringify(gameState.extractContent()));
    unityPlayContext.send("ReactToUnity", "UpdateBoard", JSON.stringify(gameState.toBoardData()));
  });


  unityPlayContext.on("LogAction", async (log: string) => {
    var logToApply = JSON.parse(log)
    for (let logEntry of logToApply.Steps) {
      if (logEntry.actionType == 0)
      {
        gameState.useCard(logEntry.data, logEntry.playerId)
        unityPlayContext.send("ReactToUnity", "UpdateBoard", JSON.stringify(gameState.toBoardData()));
        setStep(step + 1)
      }
    }
  });

  return (
    <Layout>
      <Sider width='300'>
        <Collapse>
          { gameState && gameState.objects && Array.from(gameState.objects.values()).map((elem: any) => 
            <Panel header={ "Card " + elem.id} key={elem.id}>
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
      <Content>
         { gameState && project && <Unity tabIndex={3} style={{ width: '100%', height: '100%' }} unityContext={unityPlayContext} />}
      </Content>
    </Layout>
  );
};
