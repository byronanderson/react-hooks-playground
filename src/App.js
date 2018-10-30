import React, {
  Suspense,
  Component,
  useState,
  useEffect,
  useReducer
} from "react";
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

function useMedia(query) {
  const media = window.matchMedia(query);
  const [matches, setMatches] = useState(media.matches);
  useEffect(
    () => {
      const updateMatches = event => setMatches(event.matches);
      media.addListener(updateMatches);
      return () => media.removeListener(updateMatches);
    },
    [query]
  );
  return matches;
}

function App() {
  const large = useMedia("(min-width: 400px)");
  return <Suspense fallback="oh no">{large ? "large" : "small"}</Suspense>;
}

export default App;
