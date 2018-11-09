import React, { useState, useEffect } from "react";

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

  useEffect(
    () => {
      var audio = new Audio(url);
      audio.volume = state.volume;
      setAudio(audio);
      function inspect(e) {
        console.log(e.type)
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

  function play(time) {
    if (state.canPlay) {
      audio.play();
    }
  }

  function pause(time) {
    if (state.canPlay) {
      audio.pause();
    }
  }

  function setVolume(volume) {
    audio.volume = volume;
  }

  return { state, seek, play, pause, setVolume };
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
            left: adjust(annotation) - 2,
            width: 4,
            height: 5,
            backgroundColor: "red"
          }}
        />
      ))}
      {spans.map((span, i) => (
        <div
          key={i}
          onClick={e => {
            onClick(
              ((e.screenX - e.currentTarget.parentElement.offsetLeft) * total) /
                300
            );
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

function App() {
  let { state, seek, play, pause, setVolume } = useAudio(
    "http://feeds.soundcloud.com/stream/436552305-idlethumbs-idle-thumbs-ruination-april-2018.mp3"
  );
  let playing = state.playing;
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
    <div>
      {playing ? (
        <button type="button" onClick={pause}>
          pause
        </button>
      ) : (
        <button type="button" onClick={play}>
          play
        </button>
      )}
      {state.duration ? (
        <MultiProgress
          spans={spans}
          annotations={[state.currentTime]}
          onClick={seek}
        />
      ) : null}
      <input
        type="range"
        value={state.volume * 20}
        onChange={e => setVolume(e.target.value / 20)}
        min={0}
        max={20}
      />
      <br />
      {JSON.stringify(state)}
    </div>
  );
}

export default App;
