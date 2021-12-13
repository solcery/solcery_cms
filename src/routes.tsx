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
                <Route path="/" component={() => <PlayerProvider><SolitaryView/></PlayerProvider>} />
              </Switch>
              </AppLayout>
            </AccountsProvider>
          </WalletProvider>
        </ConnectionProvider>
      </HashRouter>
    </>
  );
}
