import React from "react";
import ReactDOM from "react-dom";
import "./index.css";
import App from "./App";
import * as serviceWorker from "./serviceWorker";

const root = ReactDOM.createRoot(document.getElementById("root"));

console.log(root);
root.render(<App />);
setTimeout(() => root.render(<App foo="bar" />), 1000);
setTimeout(() => root.render(<App foo="baz" />), 2000);
setTimeout(() => root.render(<App foo="quux" />), 3000);
setTimeout(() => root.render(<App foo="bar" />), 4000);
setTimeout(() => root.render(<App foo="foo" />), 5000);
setTimeout(() => root.render(<div />), 6000);
setTimeout(() => root.render(<App />), 7000);
// root.prerender(<App />).commit();

// If you want your app to work offline and load faster, you can change
// unregister() to register() below. Note this comes with some pitfalls.
// Learn more about service workers: http://bit.ly/CRA-PWA
serviceWorker.unregister();
