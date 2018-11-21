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
import { Router, Link, Redirect } from "@reach/router";
import stopwords from "./stopwords";
import { useSpring, animated } from "react-spring";

const ThisAmericanLife = {
  slug: "tal",
  name: "This American Life",
  feedUrl: "http://feed.thisamericanlife.org/talpodcast"
};
const Serial = {
  slug: "serial",
  name: "Serial",
  feedUrl: "http://feeds.serialpodcast.org/serialpodcast"
};
const Radiolab = {
  slug: "radiolab",
  name: "Radiolab",
  feedUrl: "http://feeds.wnyc.org/radiolab"
};
const MorePerfect = {
  slug: "moreperfect",
  name: "More Perfect by Radiolab",
  feedUrl: "http://feeds.wnyc.org/moreperfect"
};
const IdleThumbs = {
  slug: "idlethumbs",
  name: "Idle Thumbs",
  feedUrl: "https://www.idlethumbs.net/feeds/idle-thumbs"
};
const defaultPodcasts = [
  ThisAmericanLife,
  Serial,
  Radiolab,
  MorePerfect,
  IdleThumbs
];

const mungeToCast = item => {
  const enclosure = item.getElementsByTagName("enclosure")[0];
  if (!enclosure) return null;
  return {
    title: item.getElementsByTagName("title")[0].innerHTML,
    url: enclosure.attributes.url.nodeValue
  };
};

function generateSlug(name) {
  return name
    .toLowerCase()
    .split(" ")
    .filter(el => !stopwords.includes(el))
    .join("");
}

const mungeToPodcast = (feedUrl, text) => {
  let parser = new DOMParser();
  let xmlDoc = parser.parseFromString(text, "text/xml");
  function toArray(nodelist) {
    return Array.prototype.slice.call(nodelist);
  }
  const name = xmlDoc.querySelector("channel title").innerHTML;
  return {
    name,
    slug: generateSlug(name),
    feedUrl,
    casts: toArray(xmlDoc.getElementsByTagName("item"))
      .map(mungeToCast)
      .filter(x => x)
  };
};

const fetchPodcast = url =>
  fetch(`https://cors.io/?${url}`)
    .then(resp => resp.text())
    .then(text => mungeToPodcast(url, text));

const PodcastResource = createResource(fetchPodcast);

function mungeBuffered(buffered) {
  let retVal = [];
  for (let i = 0; i < buffered.length; i++) {
    retVal.push([buffered.start(i), buffered.end(i)]);
  }
  return retVal;
}

function useAudio(url) {
  const [audio, setAudio] = useState(null);
  const [state, setState] = useState({ volume: 1, canPlay: false });
  const [requestPlaying, setRequestPlaying] = useState(true);

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

  return {
    url,
    state: { ...state, requestPlaying },
    setRequestPlaying,
    seek,
    setVolume
  };
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

function AudioPlayerControls({
  url,
  state,
  onPlay,
  onPause,
  onSeek,
  onSetVolume
}) {
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

  const disabled = !url;
  const smallScale = 0.8;
  const [animatedProps, setAnimatedProps] = useSpring({
    // Array containing [rotateX, rotateY, and scale] values.
    // We store under a single key (xys) instead of separate keys ...
    // ... so that we can use animatedProps.xys.interpolate() to ...
    // ... easily generate the css transform value below.
    scale: smallScale,
    // Setup physics
    config: { mass: 10, tension: 600, friction: 40, precision: 0.00001 }
  });

  return (
    <div
      style={{ display: "flex", flexDirection: "column", alignItems: "center" }}
    >
      {state.duration ? (
        <MultiProgress
          spans={spans}
          annotations={[state.currentTime]}
          onClick={onSeek}
        />
      ) : (
        <MultiProgress
          spans={[{ color: "gray", length: 1 }]}
          annotations={[0]}
          onClick={onSeek}
        />
      )}
      <div
        style={{ display: "flex", flexDirection: "row", alignItems: "center" }}
      >
        <button
          type="button"
          aria-label="seek backward 10 seconds"
          style={{ position: "relative" }}
          disabled={disabled}
          onClick={() => onSeek(state.currentTime - 10)}
        >
          <Ink />
          <SkipBackward10Icon
            size={40}
            style={{ opacity: disabled ? 0.5 : undefined }}
          />
        </button>
        <animated.div
          style={{
            transform: animatedProps.scale.interpolate(x => `scale(${x})`)
          }}
          onMouseOver={e => setAnimatedProps({ scale: 1 })}
          onMouseOut={e => setAnimatedProps({ scale: smallScale })}
        >
          <button
            type="button"
            aria-label="play"
            aria-pressed={!!state.playing}
            style={{ position: "relative", paddingRight: 5 }}
            disabled={disabled}
            onClick={state.playing ? onPause : onPlay}
          >
            <Ink />
            {state.playing ? (
              <PauseIcon size={40} />
            ) : (
              <PlayIcon
                size={40}
                style={{ opacity: disabled ? 0.5 : undefined }}
              />
            )}
          </button>
        </animated.div>
        <button
          style={{ position: "relative" }}
          aria-label="skip forward 30 seconds"
          disabled={disabled}
          onClick={() => onSeek(state.currentTime + 30)}
        >
          <Ink />
          <SkipForward30Icon
            size={40}
            style={{ opacity: disabled ? 0.5 : undefined }}
          />
        </button>
      </div>
      <div
        style={{ display: "flex", flexDirection: "row", alignItems: "center" }}
      >
        <button
          type="button"
          aria-label="Mute"
          aria-pressed={!!(state.volume === 0)}
          onClick={() => onSetVolume(state.volume === 0 ? 0.3 : 0)}
        >
          <VolumeIcon style={{ width: 40 }} size={30} />
        </button>
        <input
          type="range"
          aria-label="volume"
          value={state.volume * 20}
          onChange={e => onSetVolume(e.target.value / 20)}
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

function Cast({ cast, playing, onPlay, onPause }) {
  return (
    <div
      style={{
        padding: 5,
        display: "flex",
        flexDirection: "row",
        alignItems: "center"
      }}
    >
      <button
        key={cast.title}
        type="button"
        aria-label="play"
        aria-pressed={playing}
        style={{
          display: "block",
          position: "relative",
          padding: 10,
          marginRight: 10
        }}
        onClick={playing ? onPause : onPlay}
      >
        {playing ? <PauseIcon /> : <PlayIcon />}
      </button>
      {cast.title}
    </div>
  );
}

function PodcastPath({ podcasts, slug, ...rest }) {
  const podcast = podcasts.filter(podcast => podcast.slug === slug)[0];
  if (!podcast) {
    return <Redirect to="/" />;
  }
  return <Podcast podcast={podcast} {...rest} />;
}

function Podcast({ podcast, playingUrl, onPlay, onPause }) {
  const resource = PodcastResource.read(podcast.feedUrl);
  return (
    <>
      <Link to="/">Back</Link>
      {resource.casts.map(cast => (
        <Cast
          key={cast.title}
          playing={cast.url === playingUrl}
          cast={cast}
          onPlay={() => onPlay(cast)}
          onPause={onPause}
        />
      ))}
    </>
  );
}

function PodcastPicker({ podcasts, onAddPodcast }) {
  const [rssDraftValue, setRssDraftValue] = useState("");
  function submit(e) {
    e.preventDefault();
    fetchPodcast(rssDraftValue).then(({ name, slug, feedUrl }) =>
      onAddPodcast({ name, slug, feedUrl })
    );
    setRssDraftValue("");
  }
  return (
    <>
      <form onSubmit={submit}>
        <input
          placeholder="Put RSS URL here"
          value={rssDraftValue}
          onChange={e => setRssDraftValue(e.target.value)}
        />
        <button type="submit">Add</button>
      </form>
      {podcasts.map(podcast => (
        <Link
          key={podcast.feedUrl}
          style={{ position: "relative" }}
          to={`/${podcast.slug}`}
        >
          <div style={{ padding: 10 }}>
            <Ink />
            {podcast.name}
          </div>
          <div hidden>
            <Podcast podcast={podcast} />
          </div>
        </Link>
      ))}
    </>
  );
}

function useDocumentTitle(title) {
  useEffect(
    () => {
      document.title = title;
    },
    [title]
  );
}

function useLocalState(defaultValue, key) {
  const data = localStorage.getItem(key);
  const hydrated = data ? JSON.parse(data) : undefined;
  const [state, setState] = useState(hydrated || defaultValue);
  return [
    state,
    function(data) {
      localStorage.setItem(key, JSON.stringify(data));
      setState(data);
    }
  ];
}

function App() {
  const [cast, setCast] = useState(null);
  const [podcasts, setPodcasts] = useLocalState(defaultPodcasts, "podcasts");
  useDocumentTitle(cast ? `Playing ${cast.title}` : "Podcast Player");

  let { url, state, seek, setVolume, setRequestPlaying } = useAudio(
    cast ? cast.url : undefined
  );

  return (
    <ErrorBoundary>
      <Suspense fallback="loading...">
        <Router>
          <PodcastPicker
            path="/"
            podcasts={podcasts}
            onAddPodcast={podcast => setPodcasts([...podcasts, podcast])}
          />
          <PodcastPath
            path=":slug"
            podcasts={podcasts}
            playingUrl={cast && state.requestPlaying ? cast.url : undefined}
            onPlay={cast => {
              setCast(cast);
              setRequestPlaying(true);
            }}
            onPause={() => setRequestPlaying(false)}
          />
        </Router>
      </Suspense>
      <div style={{ marginBottom: 80 }} />
      <div
        style={{
          backgroundColor: "#d65e7e",
          position: "fixed",
          zIndex: 10,
          bottom: 0,
          right: 0,
          left: 0
        }}
      >
        <AudioPlayerControls
          url={url}
          state={state}
          onPlay={() => setRequestPlaying(true)}
          onPause={() => setRequestPlaying(false)}
          onSetVolume={setVolume}
          onSeek={seek}
        />
      </div>
    </ErrorBoundary>
  );
}

export default App;
