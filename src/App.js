import React, { Suspense, Component, useState, useEffect } from "react";
import logo from "./logo.svg";
import "./App.css";
import { unstable_createResource as createResource } from "react-cache";

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

function useDebounce(fn, attrs, timeout) {
  useEffect(() => {
    const timeoutId = setTimeout(fn, timeout);
    return () => clearTimeout(timeoutId);
  }, attrs);
}

function AnimeApp() {
  const [data, setData] = useState(null);
  const [name, setName] = useFormState("Pikachu");

  function fetchAnime() {
    fetch(`https://kitsu.io/api/edge/anime?filter[text]=${name}`)
      .then(resp => resp.json())
      .then(body => setData(body.data.map(anime => anime.attributes.slug)));
  }
  useDebounce(fetchAnime, [name], 2000);
  return (
    <div>
      <input value={name} onChange={setName} />
      <br />
      {JSON.stringify(data)}
    </div>
  );
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
          <AnimeApp />
        </div>
      </div>
    </Suspense>
  );
}

export default App;
