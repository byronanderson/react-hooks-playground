import React, { Suspense, Component, useState } from "react";
import logo from "./logo.svg";
import "./App.css";
import { unstable_createResource as createResource } from "react-cache";

import * as thing from "react-cache";

console.log(Suspense);

// const cache = createCache();
const ImageResource = createResource(
  src =>
    new Promise(resolve => {
      const img = new Image();
      img.onload = () => resolve(src);
      img.src = src;
    })
);
const Img = ({ src, ...rest }) => (
  <img src={ImageResource.read(src)} {...rest} />
);

function useFormState(initial) {
  const [state, setState] = useState(initial);
  return [
    state,
    function(e) {
      setState(e.target.value);
    }
  ];
}

function App() {
  const [name, setName] = useFormState("Byron");
  const [surname, setSurname] = useFormState("Anderson");
  return (
    <Suspense fallback="oh no">
      <div className="App">
        <header className="App-header">
          <Img src={logo} className="App-logo" alt="logo" />
          <p>
            Edit <code>src/App.js</code> and save to reload.
          </p>
          <a
            className="App-link"
            href="https://reactjs.org"
            target="_blank"
            rel="noopener noreferrer"
          >
            Learn React
          </a>
        </header>
        <div>
          <input value={name} onChange={setName} />
          <input value={surname} onChange={setSurname} />
        </div>
      </div>
    </Suspense>
  );
}

export default App;
