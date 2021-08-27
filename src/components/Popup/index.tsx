import React from "react";


export const Popup = (props: { handleClose: () => void, content: any}) => {
  return (
    <div>
      <div className="popup-box">
        <div className="box">
          <span className="close-icon" onClick={props.handleClose}>x</span>
          {props.content}
        </div>
      </div>
    </div>
  );
};

