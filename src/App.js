import React, { Suspense, useState, useEffect } from "react";
import { unstable_createResource as createResource } from "react-cache";
import {
  MdForward30 as SkipForward30Icon,
  MdReplay10 as SkipBackward10Icon,
  MdPlayArrow as PlayIcon,
  MdPause as PauseIcon,
  MdVolumeMute as MutedVolumeIcon,
  MdVolumeDown as VolumeDownIcon,
  MdVolumeUp as VolumeUpIcon
} from "react-icons/md";
import Ink from "react-ink";

const mungeToPodcast = item => {
  const enclosure = item.getElementsByTagName("enclosure")[0];
  if (!enclosure) return null;
  return {
    title: item.getElementsByTagName("title")[0].innerHTML,
    url: enclosure.attributes.url.nodeValue
  };
};
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
        casts: toArray(xmlDoc.getElementsByTagName("item"))
          .map(mungeToPodcast)
          .filter(x => x)
      };
    })
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
  let [requestPlaying, setRequestPlaying] = useState(true);
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
  const VolumeIcon =
    state.volume === 0
      ? MutedVolumeIcon
      : state.volume <= 0.5
        ? VolumeDownIcon
        : VolumeUpIcon;

  return (
    <div
      style={{ display: "flex", flexDirection: "column", alignItems: "center" }}
    >
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
      <div
        style={{ display: "flex", flexDirection: "row", alignItems: "center" }}
      >
        <div
          style={{ position: "relative" }}
          onClick={() => seek(state.currentTime - 10)}
        >
          <Ink />
          <SkipBackward10Icon
            size={40}
            style={{ opacity: url ? undefined : 0.5 }}
          />
        </div>
        <div
          style={{ position: "relative", paddingRight: 5 }}
          onClick={() => setRequestPlaying(!state.playing)}
        >
          <Ink />
          {state.playing ? (
            <PauseIcon size={40} />
          ) : (
            <PlayIcon size={40} style={{ opacity: url ? undefined : 0.5 }} />
          )}
        </div>
        <div
          style={{ position: "relative" }}
          onClick={() => seek(state.currentTime + 30)}
        >
          <Ink />
          <SkipForward30Icon
            size={40}
            style={{ opacity: url ? undefined : 0.5 }}
          />
        </div>
      </div>
      <div
        style={{ display: "flex", flexDirection: "row", alignItems: "center" }}
      >
        <VolumeIcon
          style={{ width: 40 }}
          size={30}
          onClick={() => setVolume(state.volume === 0 ? 0.3 : 0)}
        />
        <input
          type="range"
          value={state.volume * 20}
          onChange={e => setVolume(e.target.value / 20)}
          min={0}
          max={20}
        />
      </div>
    </div>
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
    <div
      style={{ display: "flex", flexDirection: "row", alignItems: "center" }}
    >
      <button
        key={cast.title}
        style={{
          display: "block",
          position: "relative",
          padding: 10,
          marginRight: 10
        }}
        tabIndex={-1}
        onClick={onPlay}
      >
        <PlayIcon />
        <Ink />
      </button>
      {cast.title}
    </div>
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

const ThisAmericanLife = {
  name: "This American Life",
  feedUrl: "http://feed.thisamericanlife.org/talpodcast"
};
const Serial = {
  name: "Serial",
  feedUrl: "http://feeds.serialpodcast.org/serialpodcast"
};
const Radiolab = {
  name: "Radiolab",
  feedUrl: "http://feeds.wnyc.org/radiolab"
};
const MorePerfect = {
  name: "More Perfect by Radiolab",
  feedUrl: "http://feeds.wnyc.org/moreperfect"
};
const IdleThumbs = {
  name: "Idle Thumbs",
  feedUrl: "https://www.idlethumbs.net/feeds/idle-thumbs"
};
const podcasts = [ThisAmericanLife, Serial, Radiolab, MorePerfect, IdleThumbs];

function PodcastPicker({ onPick }) {
  return podcasts.map(podcast => (
    <div
      key={podcast.feedUrl}
      style={{ position: "relative", padding: 10, cursor: "pointer" }}
      onClick={() => onPick(podcast)}
    >
      <Ink />
      {podcast.name}
    </div>
  ));
}

function useDocumentTitle(title) {
  useEffect(() => (document.title = title), [title]);
}

function App() {
  const [cast, setCast] = useState(null);
  const [podcast, setPodcast] = useState(null);
  useDocumentTitle(
    cast
      ? `Playing ${cast.name}`
      : podcast
        ? `Viewing ${podcast.name}`
        : "Podcast Player"
  );
  return (
    <ErrorBoundary>
      <div
        style={{
          backgroundColor: "#0099ff",
          position: "fixed",
          zIndex: 10,
          bottom: 0,
          right: 0,
          left: 0
        }}
      >
        <AudioPlayer url={cast ? cast.url : undefined} />
      </div>
      <Suspense fallback="loading...">
        {podcast ? (
          <>
            <button
              type="button"
              style={{ margin: 10 }}
              onClick={() => setPodcast(null)}
            >
              back
            </button>
            <Podcast url={podcast.feedUrl} onPlay={setCast} />
          </>
        ) : (
          <PodcastPicker onPick={setPodcast} />
        )}
      </Suspense>
      <div style={{ marginBottom: 80 }} />
    </ErrorBoundary>
  );
}

export default App;
