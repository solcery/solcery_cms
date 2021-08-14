import { HashRouter, Route, Switch, Link } from "react-router-dom";
import React from "react";
import { WalletProvider } from "./contexts/wallet";
import { ConnectionProvider } from "./contexts/connection";
import { AccountsProvider } from "./contexts/accounts";
import { AppLayout } from "./components/Layout";

import { HomeView } from "./views";
import { StorageView } from "./views";

export function Routes() {
  return (
    <>
      <HashRouter basename={"/"}>
        <ConnectionProvider>
          <WalletProvider>
              <AccountsProvider>
                <AppLayout>
{/*                <ul>
                  <li>
                    <Link to="/">Home</Link>
                  </li>
                  <li>
                    <Link to="/about">About</Link>
                  </li>
                  <li>
                    <Link to="/storage">Storage</Link>
                  </li>
                </ul>*/}
                  <Switch>
                    <Route exact path="/storage/:templateId" component={() => <StorageView/>} />
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
