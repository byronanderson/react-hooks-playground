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

// shape: {from: Array<number>, to: array<number>, tick: 0}
//
//
function zip(array1, array2) {
  const out = [];
  for (let i = 0; i < array1.length || i < array2.length; i++) {
    out[i] = [array1[i], array2[i]];
  }
  return out;
}
function currentLocation(state, equation = easeInOutQuad) {
  return zip(state.from || [], state.to || []).map(([from, to]) =>
    interpolate(equation, from || 0, to || 0, state.tick, state.duration)
  );
}

const easeInOutQuad = function(t, b, c, d) {
  t /= d / 2;
  if (t < 1) return (c / 2) * t * t + b;
  t--;
  return (-c / 2) * (t * (t - 2) - 1) + b;
};

function linearInterpolate(t, b, c, d) {
  const percentDone = t / d;
  return percentDone * c + b;
}

function interpolate(equation, source, destination, tick, duration) {
  if (!duration) return 0;
  return equation(tick, source, destination - source, duration);
}

const reducer = (state = { from: [], to: [] }, action) => {
  switch (action.type) {
    case "SET_TARGET":
      return {
        duration: action.duration,
        from: currentLocation(state),
        to: action.data,
        tick: 0
      };
    case "ADVANCE":
      if (state.tick < state.duration) {
        return { ...state, tick: state.tick + 1 };
      } else {
        return state;
      }
    default:
      return state;
  }
};

function AnimatedChart({ data }) {
  const [state, dispatch] = useReducer(reducer, 0);
  useEffect(
    () => {
      dispatch({ type: "SET_TARGET", data, duration: 60 });
    },
    [data]
  );
  useEffect(
    () => {
      const id = setInterval(() => {
        dispatch({ type: "ADVANCE" });
      }, 1000 / 60);
      return () => clearInterval(id);
    },
    [data]
  );

  return (
    <div style={{ height: 100, display: "flex", flexDirection: "row" }}>
      {currentLocation(state).map((val, i) => (
        <div
          key={i}
          style={{
            backgroundColor: ["red", "blue", "yellow"][i],
            width: 40,
            height: val * 15
          }}
        />
      ))}
    </div>
  );
}

function ChartApp() {
  const [data, setData] = useState([1, 5, 3]);
  function change() {
    if (data[0] === 1) {
      setData([5, 6, 2]);
    } else {
      setData([1, 5, 3]);
    }
  }
  return (
    <div>
      <button onClick={change}>change</button>
      <AnimatedChart data={data} />
    </div>
  );
}

function App() {
  const [name, setName] = useFormState("Byron");
  const [surname, setSurname] = useFormState("Anderson");
  return (
    <Suspense fallback="oh no">
      <ChartApp />
    </Suspense>
  );
}

export default App;
