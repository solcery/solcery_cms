import { HashRouter, Route, Switch, Link } from "react-router-dom";
import React from "react";
import { WalletProvider } from "./contexts/wallet";
import { ConnectionProvider } from "./contexts/connection";
import { AppLayout } from "./components/Layout";
import { AccountView } from "./views";

export function RouterUtils() {
  return (
    <>
      <HashRouter basename={"/"}>
        <ConnectionProvider>
          <WalletProvider>
            <AppLayout>
              <Switch>
                <Route path="/account/:accountKey" component={() => <AccountView/>} />
                <Route exact path="/account" component={() => <AccountView/>} />
              </Switch>
            </AppLayout>
          </WalletProvider>
        </ConnectionProvider>
      </HashRouter>
    </>
  );
}
