import React, { useCallback, useState, useEffect } from "react";
import { useConnection, sendTransaction} from "../../contexts/connection";
import { useProject } from "../../contexts/project";
import { useWallet } from "../../contexts/wallet";
import { construct, projectPublicKey, projectStoragePublicKey } from "../../solcery/engine";
import { useParams, useHistory } from "react-router-dom";
import Unity, { UnityContext } from "react-unity-webgl";
import { Button, Layout, InputNumber } from "antd";
import { oldBrickToBrick, brickToOldBrick, applyBrick } from "../../solcery/types/brick";
import { Game } from "../../solcery/game"

// const unityContext = new UnityContext({
//   loaderUrl: "play/play_4.loader.js",
//   dataUrl: "play/play_4.data",
//   frameworkUrl: "play/play_4.framework.js",
//   codeUrl: "play/play_4.wasm",
// })

const unityContext = new UnityContext({
  loaderUrl: "game/ui_layout_1.loader.js",
  dataUrl: "game/ui_layout_1.data",
  frameworkUrl: "game/ui_layout_1.framework.js",
  codeUrl: "game/ui_layout_1.wasm",
})

const { Header, Footer, Sider, Content } = Layout;


// public class PlaceDisplayData
//     {
//         public string PlaceName;
//         public int PlaceId = 3;

//         public PlacePlayer Player;
//         // id +- (playerId - 1) * number
//         // common = 0, player = 1, enemy = 2

//         public bool AreCardsInteractableIfMeIsActive; // bool BehaveAsSummonerShop => cards are interactable if Me is active player
        
//         public bool IsVisible;

//         public PlaceDisplayAnchors HorizontalAnchors; // 0 - 1
//         public PlaceDisplayAnchors VerticalAnchors;


//         public PlaceDisplayAnchors(float min, float max)
//         {
//             Min = min;
//             Max = max;
//         }

//         public CardFaceOption CardFaceOption;


//         public enum CardFaceOption
//         {
//             Up,
//             Down
//         }


//         public enum CardLayoutOption
//         {
//             Stacked,
//             LayedOut,
//             Map, //card name : amount
//             Title //name of the top card
//         }

//         public CardLayoutOption CardLayoutOption;
//     }

//   }

export const GameObjectView = (props: { 
  object: any,
  onChange: (objectId: number, value: number) => void,
}) => {
  return(
    <div key={props.object.id}>
      Card: { props.object.id } <InputNumber 
      key={props.object.id} 
      precision={0} 
      defaultValue={ props.object.place } 
      onChange={ (newValue) => { props.onChange(props.object.id, newValue) } } />
    </div>)
}


export const PlayView = () => {

  const { project } = useProject()
  const connection = useConnection();
  const { wallet, publicKey } = useWallet();
  const history = useHistory();
  const [ game, setGame ] = useState<any>(undefined)
  const [ step, setStep ] = useState(0)
  

  const onCardPlaceChange = (cardId: number, place: number) => {
    game.objects.get(cardId).attrs.place = place;
    unityContext.send("ReactToUnity", "UpdateBoard", JSON.stringify(game.toBoardData()));
    console.log('onCardPlaceChange')
    setStep(step + 1)
  }

  unityContext.on("OnUnityLoaded", async () => {

    var data = { IsConnected: true };
    unityContext.send("ReactToUnity", "SetWalletConnected", JSON.stringify(data));

    var constructedContent = await construct(connection)
    var gm = new Game(constructedContent)
    setGame(gm)
    unityContext.send("ReactToUnity", "UpdateBoard", JSON.stringify(gm.toBoardData()));
  });


  unityContext.on("LogAction", async (log: string) => {
    var logToApply = JSON.parse(log)
    for (let logEntry of logToApply.Steps) {
      if (logEntry.actionType == 0)
      {
        game.useCard(logEntry.data, logEntry.playerId)
        unityContext.send("ReactToUnity", "UpdateBoard", JSON.stringify(game.toBoardData()));
        setStep(step + 1)
      }
    }
  });
  console.log('test')
  return (
    <Layout>
      <Sider>
        { game && game.objects && Array.from(game.objects.values()).map((elem: any) => 
          // { console.log(elem.attrs)}
          <div key={elem.id}>
            <GameObjectView object={elem} onChange={onCardPlaceChange}/>
          </div>
          // <div key={elem.id}>
          //   Card: { elem.id } <InputNumber key={elem.id} precision={0} defaultValue={ elem.attrs.place } onChange={(value) => { onCardPlaceChange(elem.id, value) }} />
          // </div>
        )}
      </Sider>
      <Content>
         {project && <Unity tabIndex={3} style={{ width: '100%', height: '100%' }} unityContext={unityContext} />}
      </Content>
    </Layout>
  );
};
