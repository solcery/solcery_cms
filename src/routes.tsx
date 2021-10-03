import { HashRouter, Route, Switch, Link } from "react-router-dom";
import React from "react";
import { WalletProvider } from "./contexts/wallet";
import { ConnectionProvider } from "./contexts/connection";
import { AccountsProvider } from "./contexts/accounts";
import { ProjectProvider } from "./contexts/project";
import { AppLayout } from "./components/Layout";
import { SolceryMenu } from "./components/SolceryMenu";

import { HomeView, TemplateView, AccountView, TemplateSchemaView, ObjectView, PlayView, GameView } from "./views";
export function Routes() {
  return (
    <>
      <HashRouter basename={"/"}>
        <ConnectionProvider>
          <WalletProvider>
            <Switch>
              <Route exact path="/game/:gameId" component={() => <GameView />} />
              <Route exact path="/account" component={() => <AccountView/>} />
              <Route path="/account/:accountKey" component={() => <AccountView/>} />
              <Route path ="/" component={() => 
                <ProjectProvider> 
                  <AccountsProvider>
                    <AppLayout>
                      <Switch>
                        <Route exact path="/play" component={() => <PlayView/>} />
                        <Route exact path="/template/:templateKey" component={() => <TemplateView/>} />
                        <Route path="/object/:objectId" component={() => <ObjectView/>} />
                        <Route path="/template/schema/:templateKey" component={() => <TemplateSchemaView/>} />
                        <Route exact path="/" component={() => <HomeView />} />
                      </Switch>
                    </AppLayout>
                  </AccountsProvider>
                </ProjectProvider>}
              />
            </Switch>
          </WalletProvider>
        </ConnectionProvider>
      </HashRouter>
    </>
  );
}
