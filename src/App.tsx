import React from "react";
import "./App.less";
import { Routes } from "./routes";
import { load } from "./loader"

function App() {
  load()
  return <Routes />;
}

export default App;
