/** DOM primitives for the artwork contact sheet only; native builds use react-native-svg. */
import { createElement } from "react";
function primitive(tag: string) {
  return function Primitive(props: Record<string, unknown>) {
    const clean = { ...props };
    delete clean.accessible;
    return createElement(tag, clean);
  };
}
export default primitive("svg");
export const Circle = primitive("circle"),
  Defs = primitive("defs"),
  Ellipse = primitive("ellipse"),
  G = primitive("g"),
  LinearGradient = primitive("linearGradient"),
  Path = primitive("path"),
  Polygon = primitive("polygon"),
  Rect = primitive("rect"),
  Stop = primitive("stop");
