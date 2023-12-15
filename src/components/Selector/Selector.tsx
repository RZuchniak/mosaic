import React from "react";
import "./Selector.css";

type SelectorProps = {
  colour: string;
  setColour: (colour: string) => void;
};

const colours = [
  { value: "0xFF0000", colour: "red" },
  { value: "0x00FF00", colour: "green" },
  { value: "0x0000FF", colour: "blue" },
  { value: "0x000000", colour: "black" },
];

function Selector({ colour, setColour }: SelectorProps) {
  return (
    <div id="box">
      {colours.map((c) => (
        <div
          id="selector"
          style={{
            background: c.colour,
            borderColor: colour === c.value ? "black" : "white",
          }}
          onClick={() => setColour(c.value)}
        ></div>
      ))}
    </div>
  );
}

export default Selector;
