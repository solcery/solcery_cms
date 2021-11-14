import React from "react";
import "./../../App.less";

export const AppLayout = React.memo((props: any) => {
  return (
    <div className="App wormhole-bg">
      {props.children}
    </div>
  );
});
