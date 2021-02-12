import {path} from "d3-path";
import circle from "./symbol/circle.js";
import cross from "./symbol/cross.js";
import diamond from "./symbol/diamond.js";
import star from "./symbol/star.js";
import square from "./symbol/square.js";
import triangle from "./symbol/triangle.js";
import wye from "./symbol/wye.js";
import constant from "./constant.js";

export var symbols = [
  circle,
  cross,
  diamond,
  square,
  star,
  triangle,
  wye
];

export default function(type, size) {
  var context = null;
  type = typeof type === "function" ? type : constant(type || circle);
  size = typeof size === "function" ? size : constant(size === undefined ? 64 : +size);

  function symbol() {
    var buffer;
    if (!context) context = buffer = path();
    type.apply(this, arguments).draw(context, +size.apply(this, arguments));
    if (buffer) return context = null, buffer + "" || null;
  }

  symbol.type = function(_) {
    return arguments.length ? (type = typeof _ === "function" ? _ : constant(_), symbol) : type;
  };

  symbol.size = function(_) {
    return arguments.length ? (size = typeof _ === "function" ? _ : constant(+_), symbol) : size;
  };

  symbol.context = function(_) {
    return arguments.length ? (context = _ == null ? null : _, symbol) : context;
  };

  return symbol;
}
