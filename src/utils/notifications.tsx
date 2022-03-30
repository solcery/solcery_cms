import React from "react";
import { notification } from "antd";
// import Link from '../components/Link';

export function notify({
  message = "",
  description = undefined as any,
  txid = "",
  url = "",
  type = "info",
  placement = "bottomLeft",
  color = "white",
}) {
  if (url) {
    // <Link
    //   to={url}
    //   style={{ color: '#0000ff' }}
    // >
    //   {description}
    // </Link>

    description = <a href={url}>{description}</a>;
  }
  (notification as any)[type]({
    message: <span style={{ color: "black" }}>{message}</span>,
    description: (
      <span style={{ color: "black", opacity: 0.5 }}>{description}</span>
    ),
    placement,
    style: {
      backgroundColor: color,
    },
  });
}
