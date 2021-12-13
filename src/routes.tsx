import { HashRouter, Route, Switch, Link } from "react-router-dom";
import React from "react";
import { WalletProvider } from "./contexts/wallet";
import { ConnectionProvider } from "./contexts/connection";
import { AccountsProvider } from "./contexts/accounts";
import { ProjectProvider } from "./contexts/project";
import { PlayerProvider } from "./contexts/player";
import { AppLayout } from "./components/Layout";
import { SolceryMenu } from "./components/SolceryMenu";

import { HomeView, TemplateView, AccountView, TemplateSchemaView, ObjectView, PlayView, GameView, StoreView, SolitaryView } from "./views";
export function Routes() {
  return (
    <>
      <HashRouter basename={"/"}>
        <ConnectionProvider>
          <WalletProvider>
            <AccountsProvider>
              <AppLayout>
              <Switch>
                {/* <Route exact path="/account" component={() => <AccountView/>} /> */}
                <Route exact path="/" component={() => <PlayerProvider><SolitaryView/></PlayerProvider>} />
                {/* <Route exact path="/store" component={() => <StoreView/>} /> */}
                {/* <Route exact path="/game/:gameId" component={() => <PlayerProvider><GameView /></PlayerProvider>} /> */}
                {/* <Route path="/account/:accountKey" component={() => <AccountView/>} /> */}
                {/* <Route path ="/" component={() => 
                  <ProjectProvider> 
                    <Switch>
                      <Route exact path="/play" component={() => <PlayView/>} />
                      <Route exact path="/template/:templateKey" component={() => <TemplateView/>} />
                      <Route path="/object/:objectId" component={() => <ObjectView/>} />
                      <Route path="/template/schema/:templateKey" component={() => <TemplateSchemaView/>} />
                      <Route exact path="/" component={() => <HomeView />} />
                    </Switch>
                  </ProjectProvider>} 
                /> */}
              </Switch>
              </AppLayout>
            </AccountsProvider>
          </WalletProvider>
        </ConnectionProvider>
      </HashRouter>
    </>
  );
}
