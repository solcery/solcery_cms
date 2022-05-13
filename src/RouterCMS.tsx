import { HashRouter, Route, Switch, Link } from "react-router-dom";
import React from "react";
import { WalletProvider } from "./contexts/wallet";
import { ConnectionProvider } from "./contexts/connection";
import { ProjectProvider } from "./contexts/project";
import { PlayerProvider } from "./contexts/player";
import { AppLayout } from "./components/Layout";

import { HomeView, TemplateView, AccountView, TemplateSchemaView, ObjectView, PlayView } from "./views";
export function RouterCMS() {
  return (
    <>
      <HashRouter basename={"/"}>
        <ConnectionProvider>
          <WalletProvider>
            <AppLayout>
              <ProjectProvider> 
                <Switch>
                  <Route exact path="/play" component={() => <PlayView/>} />
                  <Route exact path="/template/:templateKey" component={() => <TemplateView/>} />
                  <Route exact path="/template/:templateKey/schema" component={() => <TemplateSchemaView/>} />
                  <Route exact path="/template/:templateKey/:objectId" component={() => <ObjectView/>} />
                  <Route exact path="/" component={() => <HomeView />} />
                  <Route path="/account/:accountKey" component={() => <AccountView/>} />
                  <Route exact path="/account" component={() => <AccountView/>} />
                </Switch>
              </ProjectProvider>
            </AppLayout>
          </WalletProvider>
        </ConnectionProvider>
      </HashRouter>
    </>
  );
}
