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

function useAudio({ url, playing }) {
  const [audio, setAudio] = useState(null);
  useEffect(
    () => {
      var audio = new Audio(url);
      let listener = () => setAudio(audio);
      audio.addEventListener("canplaythrough", listener, false);
      return () => {
        audio.removeEventListener("canplaythrough", listener, false);
        setAudio(null);
      };
    },
    [url]
  );

  useEffect(
    () => {
      if (audio && playing) {
        audio.play();
      } else if (audio) {
        audio.pause();
      }
    },
    [audio, playing]
  );
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
  const [playing, setPlaying] = useState(false);
  useAudio({
    url: "https://upload.wikimedia.org/wikipedia/commons/c/c8/Example.ogg",
    playing
  });
  return (
    <div>
      {playing ? (
        <button type="button" onClick={() => setPlaying(false)}>
          pause
        </button>
      ) : (
        <button type="button" onClick={() => setPlaying(true)}>
          play
        </button>
      )}
    </div>
  );
}

export default App;
