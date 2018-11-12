import React, { Suspense, useState, useEffect } from "react";
import { unstable_createResource as createResource } from "react-cache";

const mungeToPodcast = item => ({
  title: item.getElementsByTagName("title")[0].innerHTML,
  url: item.getElementsByTagName("media:content")[0].attributes.url.nodeValue
});
const PodcastResource = createResource(url =>
  fetch(`https://cors.io/?${url}`)
    .then(resp => resp.text())
    .then(text => {
      let parser = new DOMParser();
      let xmlDoc = parser.parseFromString(text, "text/xml");
      function toArray(nodelist) {
        return Array.prototype.slice.call(nodelist);
      }
      return {
        casts: toArray(xmlDoc.getElementsByTagName("item")).map(mungeToPodcast)
      };
    })
    .catch(console.error.bind(console))
);

function mungeBuffered(buffered) {
  let retVal = [];
  for (let i = 0; i < buffered.length; i++) {
    retVal.push([buffered.start(i), buffered.end(i)]);
  }
  return retVal;
}

function useAudio({ url, requestPlaying }) {
  const [audio, setAudio] = useState(null);
  const [state, setState] = useState({ volume: 1, canPlay: false });

  useEffect(
    () => {
      var audio = new Audio(url);
      audio.volume = state.volume;
      setAudio(audio);
      function inspect(e) {
        setState(state => ({
          ...state,
          playing: !audio.paused,
          duration: audio.duration,
          bufferedSegments: mungeBuffered(audio.buffered),
          currentTime: audio.currentTime
        }));
      }
      function canPlay() {
        setState(state => ({ ...state, canPlay: true }));
      }
      function volumeChange() {
        setState(state => ({ ...state, volume: audio.volume }));
      }

      audio.addEventListener("pause", inspect, false);
      audio.addEventListener("play", inspect, false);
      audio.addEventListener("playing", inspect, false);
      audio.addEventListener("progress", inspect, false);
      audio.addEventListener("seeked", inspect, false);
      audio.addEventListener("seeking", inspect, false);
      audio.addEventListener("volumechange", volumeChange, false);
      audio.addEventListener("canplay", canPlay, false);
      audio.addEventListener("canplaythrough", inspect, false);

      return () => {
        audio.removeEventListener("pause", inspect, false);
        audio.removeEventListener("play", inspect, false);
        audio.removeEventListener("playing", inspect, false);
        audio.removeEventListener("progress", inspect, false);
        audio.removeEventListener("seeked", inspect, false);
        audio.removeEventListener("seeking", inspect, false);
        audio.removeEventListener("volumechange", volumeChange, false);
        audio.removeEventListener("canplay", canPlay, false);
        audio.removeEventListener("canplaythrough", inspect, false);
        audio.pause();
        setAudio(null);
        setState(state => ({
          ...state,
          playing: false,
          bufferedSegments: undefined,
          duration: undefined,
          canPlay: undefined
        }));
      };
    },
    [url]
  );

  useEffect(
    () => {
      if (state.playing && audio) {
        function inspect() {
          setState(state => ({
            ...state,
            currentTime: audio.currentTime
          }));
        }
        const interval = setInterval(inspect, 500);
        return () => clearInterval(interval);
      }
    },
    [state.playing, audio]
  );

  function seek(time) {
    if (state.canPlay) {
      audio.currentTime = time;
    }
  }

  useEffect(
    () => {
      if (state.canPlay && requestPlaying) {
        audio.play();
      } else if (state.canPlay) {
        audio.pause();
      }
    },
    [audio, state.canPlay, requestPlaying]
  );

  function setVolume(volume) {
    audio.volume = volume;
  }

  return { state, seek, setVolume };
}

function MultiProgress({ spans, annotations, onClick }) {
  const total = spans
    .map(span => span.length)
    .reduce((acc, size) => acc + size, 0);
  function adjust(position) {
    return (position * 300) / total;
  }
  return (
    <div style={{ position: "relative", paddingTop: 5 }}>
      {annotations.map((annotation, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            left: adjust(annotation) - 1,
            width: 2,
            height: 15,
            backgroundColor: "red"
          }}
        />
      ))}
      {spans.map((span, i) => (
        <div
          key={i}
          onClick={e => {
            const location =
              ((e.pageX - e.currentTarget.parentElement.offsetLeft) * total) /
              300;
            onClick(location);
          }}
          style={{
            display: "inline-block",
            borderBottom: `10px solid ${span.color}`,
            width: adjust(span.length)
          }}
        />
      ))}
    </div>
  );
}

function AudioPlayer({ url }) {
  let [requestPlaying, setRequestPlaying] = useState(false);
  let { state, seek, setVolume } = useAudio({ url, requestPlaying });
  let spans = [];
  if (state.bufferedSegments) {
    for (let i = 0; i < state.bufferedSegments.length; i++) {
      let segment = state.bufferedSegments[i];
      let startOfUnbufferedSegment = state.bufferedSegments[i + 1]
        ? state.bufferedSegments[i + 1][0]
        : state.duration;
      spans.push({
        color: "black",
        length: segment[1] - segment[0]
      });
      spans.push({
        color: "gray",
        length: startOfUnbufferedSegment - segment[1]
      });
    }
  }
  return (
    <>
      {state.playing ? (
        <button type="button" onClick={() => setRequestPlaying(false)}>
          pause
        </button>
      ) : (
        <button type="button" onClick={() => setRequestPlaying(true)}>
          play
        </button>
      )}
      {state.duration ? (
        <MultiProgress
          spans={spans}
          annotations={[state.currentTime]}
          onClick={seek}
        />
      ) : (
        <MultiProgress
          spans={[{ color: "gray", length: 1 }]}
          annotations={[0]}
          onClick={seek}
        />
      )}
      <input
        type="range"
        value={state.volume * 20}
        onChange={e => setVolume(e.target.value / 20)}
        min={0}
        max={20}
      />
    </>
  );
}

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI.
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    // You can also log the error to an error reporting service
    console.log(error, info);
  }

  render() {
    if (this.state.hasError) {
      // You can render any custom fallback UI
      return <h1>Something went wrong.</h1>;
    }

    return this.props.children;
  }
}

function Cast({ cast, onPlay }) {
  return (
    <>
      <div key={cast.title} onClick={onPlay}>
        {cast.title}
      </div>
    </>
  );
}

function Podcast({ url, onPlay }) {
  const podcast = PodcastResource.read(url);
  return (
    <>
      {podcast.casts.map(cast => (
        <Cast key={cast.title} cast={cast} onPlay={() => onPlay(cast)} />
      ))}
    </>
  );
}

const IdleThumbs = "https://www.idlethumbs.net/feeds/idle-thumbs";
const ThisAmericanLife = "http://feed.thisamericanlife.org/talpodcast";

function App() {
  const [cast, setCast] = useState(null);
  return (
    <ErrorBoundary>
      {cast ? <AudioPlayer key={cast} url={cast.url} /> : null}
      <Suspense fallback="loading...">
        <Podcast url={ThisAmericanLife} onPlay={setCast} />
      </Suspense>
    </ErrorBoundary>
  );
}

export default App;
