import { HashRouter, Route, Switch, Link } from "react-router-dom";
import React from "react";
import { WalletProvider } from "./contexts/wallet";
import { ConnectionProvider } from "./contexts/connection";
import { AccountsProvider } from "./contexts/accounts";
import { AppLayout } from "./components/Layout";
import { SolceryMenu } from "./components/SolceryMenu";

import { HomeView, StorageView, AccountView, TemplateView, ObjectView } from "./views";
export function Routes() {
  return (
    <>
      <HashRouter basename={"/"}>
        <ConnectionProvider>
          <WalletProvider>
              <AccountsProvider>
                <AppLayout>
                  <Switch>
                    <Route exact path="/storage/:storageId" component={() => <StorageView/>} />
                    <Route exact path="/account" component={() => <AccountView/>} />
                    <Route path="/account/:accountKey" component={() => <AccountView/>} />
                    <Route path="/object/:objectId" component={() => <ObjectView/>} />
                    <Route exact path="/template" component={() => <TemplateView/>} />
                    <Route path="/template/:templateKey" component={() => <TemplateView/>} />
                    <Route exact path="/" component={() => <HomeView />} />
                  </Switch>
                </AppLayout>
              </AccountsProvider>
          </WalletProvider>
        </ConnectionProvider>
      </HashRouter>
    </>
  );
}
