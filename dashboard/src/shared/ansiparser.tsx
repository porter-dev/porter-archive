/* eslint-disable no-plusplus, no-continue */
const foregroundColors = {
  "30": "black",
  "31": "red",
  "32": "green",
  "33": "yellow",
  "34": "blue",
  "35": "magenta",
  "36": "cyan",
  "37": "white",
  "90": "grey"
} as Record<string, string>;

const backgroundColors = {
  "40": "black",
  "41": "red",
  "42": "green",
  "43": "yellow",
  "44": "blue",
  "45": "magenta",
  "46": "cyan",
  "47": "white"
} as Record<string, string>;

const styles = {
  "1": "bold",
  "3": "italic",
  "4": "underline"
} as Record<string, string>;

const eraseChar = (matchingText: any, result: any) => {
  if (matchingText.length) {
    return [matchingText.substr(0, matchingText.length - 1), result];
  } else if (result.length) {
    const index = result.length - 1;
    const { text } = result[index];
    const newResult =
      text.length === 1
        ? result.slice(0, result.length - 1)
        : result.map((item: any, i: number) =>
            index === i
              ? { ...item, text: text.substr(0, text.length - 1) }
              : item
          );

    return [matchingText, newResult];
  }

  return [matchingText, result];
};

const ansiparse = (str: string) => {
  let matchingControl = null;
  let matchingData = null;
  let matchingText = "";
  let ansiState = [] as any[];
  let result = [] as any[];
  let state = {} as any;

  for (let i = 0; i < str.length; i++) {
    if (matchingControl !== null) {
      if (matchingControl === "\x1b" && str[i] === "[") {
        if (matchingText) {
          state.text = matchingText;
          result.push(state);
          state = {};
          matchingText = "";
        }

        matchingControl = null;
        matchingData = "";
      } else {
        matchingText += matchingControl + str[i];
        matchingControl = null;
      }

      continue;
    } else if (matchingData !== null) {
      if (str[i] === ";") {
        ansiState.push(matchingData);
        matchingData = "";
      } else if (str[i] === "m") {
        ansiState.push(matchingData);
        matchingData = null;
        matchingText = "";

        for (let a = 0; a < ansiState.length; a++) {
          const ansiCode = ansiState[a];

          if (foregroundColors[ansiCode]) {
            state.foreground = foregroundColors[ansiCode];
          } else if (backgroundColors[ansiCode]) {
            state.background = backgroundColors[ansiCode];
          } else if (ansiCode === 39) {
            delete state.foreground;
          } else if (ansiCode === 49) {
            delete state.background;
          } else if (styles[ansiCode]) {
            state[styles[ansiCode]] = true;
          } else if (ansiCode === 22) {
            state.bold = false;
          } else if (ansiCode === 23) {
            state.italic = false;
          } else if (ansiCode === 24) {
            state.underline = false;
          }
        }

        ansiState = [];
      } else {
        matchingData += str[i];
      }

      continue;
    }

    if (str[i] === "\x1b") {
      matchingControl = str[i];
    } else if (str[i] === "\u0008") {
      [matchingText, result] = eraseChar(matchingText, result);
    } else {
      matchingText += str[i];
    }
  }

  if (matchingText) {
    state.text = matchingText + (matchingControl || "");
    result.push(state);
  }

  return result;
};

export default ansiparse;
